/**
 * Schéma Zod du brief utilisateur (formulaire d'accueil).
 *
 * Validé côté client ET côté serveur (DRY : un seul schéma source).
 * Côté serveur, on dérive ensuite la saison via `moisVersSaison()` pour préfiltrer
 * le catalogue avant l'appel à Claude (RGESN-0017).
 */

import { z } from 'zod';
import { OCCASIONS, STYLES } from './product';

/**
 * Genre cible utilisateur dans le formulaire.
 * Note : on n'expose pas « unisexe » dans le formulaire — l'utilisateur choisit
 * un genre concret ; les produits unisexe seront automatiquement inclus côté
 * serveur lors du préfiltrage.
 */
export const BRIEF_GENRES = ['femme', 'homme', 'enfant'] as const;
export type BriefGenre = (typeof BRIEF_GENRES)[number];

/** Schéma de validation du brief utilisateur. */
export const briefSchema = z.object({
  occasion: z.enum(OCCASIONS, { message: 'Choisissez une occasion.' }),
  /** Mois ISO (1–12). On dérive la saison côté serveur. */
  mois: z.coerce
    .number({ message: 'Choisissez un mois.' })
    .int({ message: 'Choisissez un mois.' })
    // Cas pratique : "" → 0 → bloqué ici avec un message intelligible.
    .min(1, { message: 'Choisissez un mois.' })
    .max(12, { message: 'Mois invalide.' }),
  genre: z.enum(BRIEF_GENRES, { message: 'Choisissez à qui s’adresse la tenue.' }),
  budget_eur: z.coerce
    .number({ message: 'Indiquez un budget en euros.' })
    .int({ message: 'Le budget doit être un entier.' })
    .min(20, { message: 'Le budget minimum est 20 €.' })
    .max(1000, { message: 'Le budget maximum est 1000 €.' }),
  styles: z
    .array(z.enum(STYLES))
    .min(1, { message: 'Choisissez au moins un style.' })
    .max(3, { message: 'Choisissez au plus trois styles.' }),
  taille_haut: z.string().min(1, { message: 'Choisissez une taille pour le haut.' }).max(10),
  taille_bas: z.string().min(1, { message: 'Choisissez une taille pour le bas.' }).max(10),
});

export type Brief = z.infer<typeof briefSchema>;

/** Tailles disponibles pour le haut, par genre. */
export const BRIEF_TAILLES_HAUT: Record<BriefGenre, readonly string[]> = {
  femme: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  homme: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  enfant: ['2 ans', '4 ans', '6 ans', '8 ans', '10 ans', '12 ans', '14 ans', '16 ans'],
};

/** Tailles disponibles pour le bas, par genre. */
export const BRIEF_TAILLES_BAS: Record<BriefGenre, readonly string[]> = {
  femme: ['34', '36', '38', '40', '42', '44', '46'],
  homme: ['36', '38', '40', '42', '44', '46', '48'],
  enfant: ['2 ans', '4 ans', '6 ans', '8 ans', '10 ans', '12 ans', '14 ans', '16 ans'],
};

/**
 * Dérive la saison à partir du numéro de mois (1–12).
 *
 * Convention française :
 * - printemps : mars (3) – mai (5)
 * - été : juin (6) – août (8)
 * - automne : septembre (9) – novembre (11)
 * - hiver : décembre (12), janvier (1), février (2)
 *
 * Utilisé côté serveur lors du préfiltrage du catalogue (RGESN-0017).
 *
 * @param mois Numéro du mois (1–12).
 * @returns La saison correspondante.
 */
export function moisVersSaison(
  mois: number,
): 'printemps' | 'été' | 'automne' | 'hiver' {
  if (mois >= 3 && mois <= 5) return 'printemps';
  if (mois >= 6 && mois <= 8) return 'été';
  if (mois >= 9 && mois <= 11) return 'automne';
  return 'hiver';
}
