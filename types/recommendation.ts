/**
 * Schéma Zod de la sortie IA — 2 tenues recommandées par Claude.
 *
 * Utilisé pour :
 * - **Valider le tool output de Claude côté serveur** (ne jamais faire confiance
 *   à un LLM, même via tool use, surtout pour des contraintes métier comme le budget).
 * - Typer la réponse JSON envoyée au client.
 * - Définir le `input_schema` du tool Anthropic (forme JSON Schema dérivable du Zod).
 */

import { z } from 'zod';
import { productSchema } from './product';

/**
 * Une tenue : ensemble cohérent de produits référencés par leur ID.
 *
 * Compositions valides :
 * - haut + bas + chaussures (3) [+ accessoire optionnel = 4]
 * - robe + chaussures (2) [+ accessoire optionnel = 3]
 *
 * → min 2, max 4 produits.
 */
export const tenueSchema = z.object({
  produits_ids: z.array(z.string().uuid()).min(2).max(4),
  total_eur: z.number().positive().max(2300),
  justification: z.string().min(10).max(500),
});

/** Sortie complète : 2 tenues (budget + premium ≤ +15 %). */
export const recommendationSchema = z.object({
  tenue_budget: tenueSchema,
  tenue_premium: tenueSchema,
});

export type Tenue = z.infer<typeof tenueSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;

/**
 * Tenue hydratée : produits IDs résolus en objets Product complets.
 *
 * Forme renvoyée au client (BriefForm → OutfitDisplay).
 */
export const tenueHydrateeSchema = z.object({
  produits: z.array(productSchema).min(2).max(4),
  total_eur: z.number().positive(),
  justification: z.string(),
});

export const recommendationHydrateeSchema = z.object({
  tenue_budget: tenueHydrateeSchema,
  tenue_premium: tenueHydrateeSchema,
});

export type TenueHydratee = z.infer<typeof tenueHydrateeSchema>;
export type RecommendationHydratee = z.infer<typeof recommendationHydrateeSchema>;
