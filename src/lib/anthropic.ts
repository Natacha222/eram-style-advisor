/**
 * Client Anthropic Claude pour la recommandation de tenues.
 *
 * Décisions :
 * - **Modèle** : `claude-sonnet-4-6` (cf. CLAUDE.md projet).
 * - **Tool use forcé** (`tool_choice: { type: 'tool', ... }`) pour structurer
 *   la sortie : pas de regex JSON, schéma validé par Zod côté serveur.
 * - **Prompt caching ephemeral** (RGESN-0021) sur le catalogue préfiltré : si
 *   l'utilisatrice ré-essaie dans les ~5 min, le catalogue n'est pas re-tokenisé.
 * - **Validation Zod systématique** de la sortie : on ne fait JAMAIS confiance
 *   à un LLM, surtout sur des contraintes métier (budget).
 */

import Anthropic from '@anthropic-ai/sdk';
import { recommendationSchema, type Recommendation } from '@/types/recommendation';
import type { Brief } from '@/types/brief';
import type { Saison } from '@/types/product';
import type { ProductForPrompt } from './catalog';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 2048;

let client: Anthropic | null = null;

/** Lazy-init : on lit la variable d'environnement au 1er appel uniquement. */
function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY manquante dans l’environnement. Cf. .env.example.',
    );
  }
  client = new Anthropic({ apiKey });
  return client;
}

/**
 * Schéma du tool exposé à Claude.
 *
 * Anthropic renverra exactement cette forme (modulo bugs) ; on revalide quand même
 * avec Zod après réception, jamais aveuglément.
 */
const PROPOSE_OUTFITS_TOOL = {
  name: 'propose_outfits',
  description:
    'Compose deux tenues complètes à partir du catalogue préfiltré : ' +
    'une dans le budget strict, une "premium" tolérant un dépassement de 15 % maximum.',
  input_schema: {
    type: 'object' as const,
    properties: {
      tenue_budget: {
        type: 'object',
        description: 'Tenue dont le total des prix est ≤ budget utilisateur.',
        properties: {
          produits_ids: {
            type: 'array',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 4,
            description:
              'IDs UUID des produits du catalogue préfiltré. ' +
              'Composition : haut+bas+chaussures (3) ou robe+chaussures (2) [+1 accessoire optionnel].',
          },
          total_eur: {
            type: 'number',
            description: 'Somme exacte des prix des produits choisis.',
          },
          justification: {
            type: 'string',
            description: 'Justification courte (1-2 phrases) du choix, en français.',
          },
        },
        required: ['produits_ids', 'total_eur', 'justification'],
      },
      tenue_premium: {
        type: 'object',
        description:
          'Tenue dont le total est ≤ budget × 1.15. Doit viser un total > tenue budget.',
        properties: {
          produits_ids: {
            type: 'array',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 4,
          },
          total_eur: { type: 'number' },
          justification: { type: 'string' },
        },
        required: ['produits_ids', 'total_eur', 'justification'],
      },
    },
    required: ['tenue_budget', 'tenue_premium'],
  },
};

/**
 * Demande à Claude de composer 2 tenues à partir du catalogue préfiltré.
 *
 * @throws Erreur si la réponse n'est pas conforme à `recommendationSchema`.
 */
export async function recommendOutfits(
  prefiltered: ProductForPrompt[],
  brief: Brief,
  saison: Saison,
): Promise<Recommendation> {
  const anthropic = getClient();

  const systemBlocks = [
    {
      type: 'text' as const,
      text: `Tu es un conseiller mode pour le Groupe Eram. Tu composes 2 tenues complètes à partir d'un catalogue préfiltré.

Règles strictes :
- TENUE 1 (budget) : la SOMME des prix ≤ ${brief.budget_eur} €.
- TENUE 2 (premium) : la SOMME des prix ≤ ${(brief.budget_eur * 1.15).toFixed(2)} € (15 % de marge max). Vise un total au-dessus de la tenue budget.
- Composition : soit haut + bas + chaussures, soit robe + chaussures. Tu peux ajouter 1 accessoire si pertinent.
- Cohérence stylistique : couleurs harmonieuses, registre cohérent avec les styles demandés.
- Utilise UNIQUEMENT les IDs présents dans le catalogue préfiltré (ne pas inventer d'ID).
- Calcule \`total_eur\` exactement (somme arithmétique des prix des produits utilisés).
- Justification : 1-2 phrases factuelles en français (ex. "Look chic en lin moutarde, le marron des Boots reprend l'accent du sac.").

Brief utilisateur :
- Occasion : ${brief.occasion}
- Saison : ${saison} (mois ${brief.mois})
- Genre cible : ${brief.genre}
- Budget : ${brief.budget_eur} €
- Styles préférés : ${brief.styles.join(', ')}
- Taille haut : ${brief.taille_haut}
- Taille bas : ${brief.taille_bas}

Tu DOIS appeler le tool \`propose_outfits\` une seule fois avec les 2 tenues.`,
    },
    {
      // RGESN-0021 : cache ephemeral sur le catalogue (~5 min TTL Anthropic).
      // Si l'utilisatrice fait plusieurs essais avec le même catalogue préfiltré
      // dans cette fenêtre, les tokens du catalogue ne sont pas re-facturés.
      type: 'text' as const,
      text: `Catalogue préfiltré (${prefiltered.length} produits) :\n${JSON.stringify(prefiltered, null, 2)}`,
      cache_control: { type: 'ephemeral' as const },
    },
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemBlocks,
    tools: [PROPOSE_OUTFITS_TOOL],
    tool_choice: { type: 'tool', name: 'propose_outfits' },
    messages: [
      {
        role: 'user',
        content:
          'Compose les 2 tenues maintenant en respectant strictement les règles.',
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Claude n’a pas retourné de bloc tool_use.');
  }

  const parsed = recommendationSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(
      `Sortie Claude non conforme au schéma : ${parsed.error.message}`,
    );
  }

  return parsed.data;
}
