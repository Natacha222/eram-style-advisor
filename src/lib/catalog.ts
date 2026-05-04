/**
 * Lecture du catalogue produit + helpers de filtrage côté serveur.
 *
 * RGESN-0017 : le catalogue n'est JAMAIS envoyé en entier au client. On le filtre
 * en amont de tout appel IA pour réduire les tokens consommés et la bande passante.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  catalogSchema,
  type Catalog,
  type Product,
  type Saison,
} from '@/types/product';
import type { Brief } from '@/types/brief';

let cachedCatalog: Catalog | null = null;

/**
 * Charge le catalogue depuis `data/catalog.json` et le valide contre le schéma Zod.
 *
 * Mémorisé en module-level : la première requête lit + valide, les suivantes
 * réutilisent le tableau en mémoire (le fichier est statique, pas besoin de relire).
 */
export async function loadCatalog(): Promise<Catalog> {
  if (cachedCatalog) return cachedCatalog;
  const filePath = path.join(process.cwd(), 'data', 'catalog.json');
  const raw = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  const result = catalogSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Catalogue invalide à ${filePath} : ${result.error.message}`,
    );
  }
  cachedCatalog = result.data;
  return cachedCatalog;
}

/**
 * Préfiltre le catalogue selon le brief utilisateur (RGESN-0017).
 *
 * Critères :
 * - **Genre** : produit du genre demandé OU `unisexe`.
 * - **Saison** : produit doit inclure la saison dérivée du mois.
 * - **Occasion** : produit doit inclure l'occasion choisie.
 * - **Tailles** :
 *   - haut/robe → `taille_haut` doit être dans `tailles_disponibles` (ou `unique`).
 *   - bas → `taille_bas` doit être dans `tailles_disponibles` (ou `unique`).
 *   - chaussures/accessoire → toutes tailles acceptées (pas de filtre côté formulaire).
 * - **Budget souple** : prix ≤ budget × 1.5 (laisse de la marge à l'IA pour composer
 *   une tenue dont la SOMME respecte la contrainte stricte budget / budget × 1.15).
 * - **Styles** : si l'utilisateur a précisé des styles, on garde l'intersection
 *   (au moins un style commun) ; sinon on garde tout.
 *
 * @returns Sous-ensemble du catalogue (potentiellement vide si critères trop stricts).
 */
export function prefilterCatalog(
  catalog: Catalog,
  brief: Brief,
  saison: Saison,
): Product[] {
  const taillesHautAcc = new Set([brief.taille_haut, 'unique']);
  const taillesBasAcc = new Set([brief.taille_bas, 'unique']);
  const budgetMax = brief.budget_eur * 1.5;
  // Note : on NE filtre PAS sur le style ici. La préférence stylistique est
  // transmise à Claude dans le prompt ; il peut choisir un produit hors-style
  // si la cohérence stylistique globale de la tenue l'exige (ex. accessoire
  // contrastant). Pré-filtrer durement réduisait trop le catalogue candidat.

  return catalog.filter((p) => {
    if (p.genre !== brief.genre && p.genre !== 'unisexe') return false;
    if (!p.saisons.includes(saison)) return false;
    if (!p.occasions.includes(brief.occasion)) return false;

    if (p.categorie === 'haut' || p.categorie === 'robe') {
      if (!p.tailles_disponibles.some((t) => taillesHautAcc.has(t))) return false;
    } else if (p.categorie === 'bas') {
      if (!p.tailles_disponibles.some((t) => taillesBasAcc.has(t))) return false;
    }
    // chaussures/accessoire : pas de filtre taille (pas demandé dans le formulaire).

    if (p.prix_eur > budgetMax) return false;

    return true;
  });
}

/**
 * Hydrate une liste d'IDs de produits en objets Product complets.
 *
 * Utilisé après l'appel IA pour reconstruire les tenues à afficher.
 * Si Claude renvoie un ID inconnu (cas pathologique : hallucination), on signale
 * via `missing` plutôt que de planter — l'API decide quoi faire.
 *
 * @returns `{ found: Product[], missing: string[] }`
 */
export function hydrateProducts(
  catalog: Catalog,
  ids: readonly string[],
): { found: Product[]; missing: string[] } {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const found: Product[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (p) found.push(p);
    else missing.push(id);
  }
  return { found, missing };
}

/**
 * Vue compacte d'un produit pour l'envoi au prompt Claude.
 *
 * On retire les champs lourds non utilisés par l'IA pour la composition (description
 * marketing, image_url, url_produit). On garde l'essentiel : id, nom, marque,
 * catégorie, prix, genre, styles, couleurs, tailles. RGESN-0017 (token reduction).
 */
export type ProductForPrompt = Pick<
  Product,
  | 'id'
  | 'marque'
  | 'categorie'
  | 'nom'
  | 'prix_eur'
  | 'genre'
  | 'styles'
  | 'couleurs'
  | 'tailles_disponibles'
>;

export function compactForPrompt(products: Product[]): ProductForPrompt[] {
  return products.map((p) => ({
    id: p.id,
    marque: p.marque,
    categorie: p.categorie,
    nom: p.nom,
    prix_eur: p.prix_eur,
    genre: p.genre,
    styles: p.styles,
    couleurs: p.couleurs,
    tailles_disponibles: p.tailles_disponibles,
  }));
}
