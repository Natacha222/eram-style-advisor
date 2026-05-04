/**
 * Cache mémoire des recommandations IA (RGESN-0021).
 *
 * Pour la démo : Map en mémoire (réinitialisée au redémarrage du serveur).
 * Pour la prod : remplacer par la table Supabase `recommendation_cache` (cf. spec
 * + schéma BDD). L'API est faite pour qu'on puisse swapper l'implémentation
 * sans toucher au code appelant.
 */

import { createHash } from 'node:crypto';
import type { Brief } from '@/types/brief';
import type { Saison } from '@/types/product';
import type { RecommendationHydratee } from '@/types/recommendation';

/** Durée de vie d'une entrée de cache : 7 jours (RGESN-0021). */
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Entry = { data: RecommendationHydratee; expiresAt: number };

const store = new Map<string, Entry>();

/**
 * Génère une clé de cache déterministe à partir du brief + saison.
 *
 * On normalise les listes (`styles.sort()`) pour que ['chic', 'casual'] et
 * ['casual', 'chic'] produisent la même clé. Aucune PII n'entre dans la clé.
 */
export function generateCacheKey(brief: Brief, saison: Saison): string {
  const normalized = JSON.stringify({
    occasion: brief.occasion,
    mois: brief.mois,
    saison,
    genre: brief.genre,
    budget_eur: brief.budget_eur,
    styles: [...brief.styles].sort(),
    taille_haut: brief.taille_haut,
    taille_bas: brief.taille_bas,
  });
  return createHash('sha256').update(normalized).digest('hex');
}

/** Récupère une entrée non expirée, ou `undefined`. */
export function cacheGet(key: string): RecommendationHydratee | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.data;
}

/** Met en cache pour `TTL_MS` millisecondes. */
export function cacheSet(key: string, data: RecommendationHydratee): void {
  store.set(key, { data, expiresAt: Date.now() + TTL_MS });
}
