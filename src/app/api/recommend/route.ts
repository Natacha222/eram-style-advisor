/**
 * POST /api/recommend
 *
 * Pipeline complet :
 * 1. **Rate limit** par IP (10/min/IP par défaut, cybersécurité).
 * 2. **Validation Zod** du brief (re-validation côté serveur, jamais confiance client).
 * 3. **Cache** clé = hash(brief + saison). Hit → retour immédiat (RGESN-0021).
 * 4. **Préfiltrage** catalogue côté serveur (RGESN-0017, jamais envoyé entier).
 * 5. **Appel Claude** avec tool use forcé + prompt caching ephemeral du catalogue.
 * 6. **Validation Zod** de la sortie IA (jamais confiance LLM, surtout sur budget).
 * 7. **Hydratation** des IDs → produits complets.
 * 8. **Re-validation** de la forme hydratée (defense in depth).
 * 9. **Cache** + retour JSON.
 */

import { NextRequest, NextResponse } from 'next/server';
import { briefSchema, moisVersSaison } from '@/types/brief';
import { recommendationHydrateeSchema } from '@/types/recommendation';
import {
  loadCatalog,
  prefilterCatalog,
  hydrateProducts,
  compactForPrompt,
} from '@/lib/catalog';
import { recommendOutfits } from '@/lib/anthropic';
import { generateCacheKey, cacheGet, cacheSet } from '@/lib/cache';
import { checkRateLimit } from '@/lib/rate-limit';

// On reste sur le runtime Node (besoin de fs pour lire data/catalog.json,
// process.env pour la clé API, et crypto pour le hash de cache).
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // ============== 1. Rate limit ==============
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans quelques secondes.' },
      {
        status: 429,
        headers: { 'Retry-After': Math.ceil(rl.retryAfterMs / 1000).toString() },
      },
    );
  }

  // ============== 2. Body + validation Zod ==============
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide.' }, { status: 400 });
  }
  const parsed = briefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Brief invalide.',
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const brief = parsed.data;
  const saison = moisVersSaison(brief.mois);

  // ============== 3. Cache hit ? ==============
  const cacheKey = generateCacheKey(brief, saison);
  const cached = cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });
  }

  // ============== 4. Préfiltrage catalogue (RGESN-0017) ==============
  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (err) {
    console.error('[/api/recommend] catalog load error:', err);
    return NextResponse.json(
      { error: 'Erreur interne (catalogue).' },
      { status: 500 },
    );
  }
  const prefiltered = prefilterCatalog(catalog, brief, saison);

  if (prefiltered.length < 5) {
    return NextResponse.json(
      {
        error:
          'Pas assez de produits dans le catalogue pour vos critères. Essayez un budget plus large, retirez un style, ou changez de saison.',
        prefilter_count: prefiltered.length,
      },
      { status: 422 },
    );
  }

  // ============== 5. Appel Claude ==============
  let recommendation;
  try {
    recommendation = await recommendOutfits(
      compactForPrompt(prefiltered),
      brief,
      saison,
    );
  } catch (err) {
    console.error('[/api/recommend] Claude error:', err);
    return NextResponse.json(
      { error: 'L’IA n’a pas pu générer de recommandation. Réessayez.' },
      { status: 502 },
    );
  }

  // ============== 7. Hydratation IDs ==============
  const tenueB = hydrateProducts(
    catalog,
    recommendation.tenue_budget.produits_ids,
  );
  const tenueP = hydrateProducts(
    catalog,
    recommendation.tenue_premium.produits_ids,
  );

  if (tenueB.found.length < 2 || tenueP.found.length < 2) {
    console.warn('[/api/recommend] missing IDs from Claude:', {
      budget_missing: tenueB.missing,
      premium_missing: tenueP.missing,
    });
    return NextResponse.json(
      { error: 'L’IA a référencé des produits introuvables. Réessayez.' },
      { status: 502 },
    );
  }

  // ============== 8. Re-validation hydratée (defense in depth) ==============
  const hydrated = {
    tenue_budget: {
      produits: tenueB.found,
      total_eur: recommendation.tenue_budget.total_eur,
      justification: recommendation.tenue_budget.justification,
    },
    tenue_premium: {
      produits: tenueP.found,
      total_eur: recommendation.tenue_premium.total_eur,
      justification: recommendation.tenue_premium.justification,
    },
  };
  const hydratedParsed = recommendationHydrateeSchema.safeParse(hydrated);
  if (!hydratedParsed.success) {
    console.error('[/api/recommend] hydrated invalid:', hydratedParsed.error);
    return NextResponse.json(
      { error: 'Erreur interne (forme de réponse).' },
      { status: 500 },
    );
  }

  // ============== 9. Cache + retour ==============
  cacheSet(cacheKey, hydratedParsed.data);
  return NextResponse.json(hydratedParsed.data, {
    headers: { 'X-Cache': 'MISS' },
  });
}
