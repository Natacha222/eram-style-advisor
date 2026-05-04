/**
 * Schéma Zod du produit Eram Style Advisor.
 *
 * Source de vérité unique pour la validation des produits du catalogue :
 * - les énumérations métier sont exportées comme tableaux `as const`
 *   (itérables côté script de génération) ;
 * - les types TypeScript sont dérivés via `z.infer` (DRY : un seul endroit
 *   à mettre à jour quand le schéma évolue).
 *
 * @see /data/catalog.json — données générées via `npm run catalog:generate`.
 * @see /scripts/generate-catalog.ts — script de génération avec seed fixe.
 */

import { z } from 'zod';

// ============================================================================
// Énumérations métier
// ============================================================================

/** Marques du groupe Eram couvertes par le démonstrateur. */
export const MARQUES = ['Eram', 'Gemo', 'TBS', 'Bocage'] as const;

/** Familles de produits (haut/bas/robe/chaussures/accessoire). */
export const CATEGORIES = ['haut', 'bas', 'robe', 'chaussures', 'accessoire'] as const;

/** Cibles vestimentaires. */
export const GENRES = ['femme', 'homme', 'enfant', 'unisexe'] as const;

/** Styles vestimentaires retenus pour les recommandations IA. */
export const STYLES = ['chic', 'casual', 'bohême', 'sportif', 'streetwear', 'classique'] as const;

/** Saisons portables (utilisées pour préfiltrer le catalogue avant Claude). */
export const SAISONS = ['printemps', 'été', 'automne', 'hiver'] as const;

/** Occasions ciblées par le formulaire utilisateur. */
export const OCCASIONS = [
  'mariage',
  'baptême',
  'anniversaire',
  'travail',
  'quotidien',
  'cérémonie',
  'fête',
] as const;

// ============================================================================
// Schémas Zod
// ============================================================================

/**
 * Schéma d'un produit unitaire du catalogue.
 *
 * Contraintes :
 * - `nom` : 1–80 caractères ;
 * - `description` : 1–200 caractères (cf. spec produit) ;
 * - `prix_eur` : strictement positif, ≤ 2000 € (garde-fou anti-erreur) ;
 * - `tailles_disponibles` / `couleurs` / `styles` / `saisons` / `occasions` :
 *   tableaux non-vides (un produit doit toujours être qualifiable).
 */
export const productSchema = z.object({
  id: z.string().uuid(),
  marque: z.enum(MARQUES),
  categorie: z.enum(CATEGORIES),
  nom: z.string().min(1).max(80),
  description: z.string().min(1).max(200),
  prix_eur: z.number().positive().max(2000),
  genre: z.enum(GENRES),
  styles: z.array(z.enum(STYLES)).min(1),
  saisons: z.array(z.enum(SAISONS)).min(1),
  occasions: z.array(z.enum(OCCASIONS)).min(1),
  tailles_disponibles: z.array(z.string().min(1)).min(1),
  couleurs: z.array(z.string().min(1)).min(1),
  image_url: z.string().url(),
  url_produit: z.string().url(),
});

/** Catalogue complet : tableau de produits, au minimum 1. */
export const catalogSchema = z.array(productSchema).min(1);

// ============================================================================
// Types TypeScript dérivés
// ============================================================================

export type Product = z.infer<typeof productSchema>;
export type Catalog = z.infer<typeof catalogSchema>;

export type Marque = (typeof MARQUES)[number];
export type Categorie = (typeof CATEGORIES)[number];
export type Genre = (typeof GENRES)[number];
export type Style = (typeof STYLES)[number];
export type Saison = (typeof SAISONS)[number];
export type Occasion = (typeof OCCASIONS)[number];
