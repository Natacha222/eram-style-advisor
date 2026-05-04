/**
 * Script de génération du catalogue de produits fictifs Eram Style Advisor.
 *
 * Utilise Faker.js avec une **seed fixe** pour garantir la reproductibilité :
 * tout ré-exécution produit le même `data/catalog.json` (idempotent, friendly
 * avec git diff). Cf. ADR-002 pour le choix d'un fichier statique.
 *
 * @command  npm run catalog:generate
 * @output   data/catalog.json — validé contre `productSchema` avant écriture.
 *
 * RGESN-0001 : pas de back-office produit (gadget hors-scope démo).
 * RGESN-0017 : préfiltrage du catalogue côté serveur AVANT envoi à l'IA —
 *              le JSON n'est JAMAIS envoyé en entier au client.
 */

import { faker } from '@faker-js/faker/locale/fr';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  catalogSchema,
  STYLES,
  OCCASIONS,
  type Product,
  type Marque,
  type Categorie,
  type Genre,
} from '../types/product';

faker.seed(42);

// ============================================================================
// Tables de cohérence métier
// ============================================================================

/** Domaines fictifs par marque (pour `url_produit`). */
const DOMAINES: Record<Marque, string> = {
  Eram: 'www.eram.fr',
  Gemo: 'www.gemo.fr',
  TBS: 'www.tbs.fr',
  Bocage: 'www.bocage.fr',
};

/** Fourchettes de prix réalistes par marque × catégorie (en €). */
const PRIX_RANGES: Record<Marque, Record<Categorie, [number, number]>> = {
  Eram:   { haut: [25, 80],  bas: [40, 110], robe: [55, 140], chaussures: [50, 150], accessoire: [15, 60] },
  Gemo:   { haut: [10, 35],  bas: [15, 45],  robe: [20, 60],  chaussures: [20, 55],  accessoire: [5, 25]  },
  TBS:    { haut: [35, 90],  bas: [45, 110], robe: [60, 140], chaussures: [60, 180], accessoire: [20, 70] },
  Bocage: { haut: [40, 100], bas: [50, 130], robe: [70, 160], chaussures: [80, 220], accessoire: [25, 90] },
};

/** Tailles disponibles par genre × catégorie. */
const TAILLES: Record<Genre, Record<Categorie, string[]>> = {
  femme: {
    haut: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    bas: ['34', '36', '38', '40', '42', '44', '46'],
    robe: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    chaussures: ['35', '36', '37', '38', '39', '40', '41'],
    accessoire: ['unique'],
  },
  homme: {
    haut: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    bas: ['36', '38', '40', '42', '44', '46', '48'],
    robe: ['unique'],
    chaussures: ['39', '40', '41', '42', '43', '44', '45', '46'],
    accessoire: ['unique'],
  },
  enfant: {
    haut: ['2', '4', '6', '8', '10', '12', '14', '16'],
    bas: ['2', '4', '6', '8', '10', '12', '14', '16'],
    robe: ['2', '4', '6', '8', '10', '12', '14', '16'],
    chaussures: ['20', '22', '24', '26', '28', '30', '32', '34'],
    accessoire: ['unique'],
  },
  unisexe: {
    haut: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    bas: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    robe: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    chaussures: ['38', '39', '40', '41', '42', '43', '44'],
    accessoire: ['unique'],
  },
};

/** Substantifs cohérents par catégorie. */
const NOMS_CATEGORIE: Record<Categorie, string[]> = {
  haut: ['T-shirt', 'Chemise', 'Blouse', 'Pull', 'Cardigan', 'Sweat', 'Veste', 'Top', 'Tunique', 'Polo'],
  bas: ['Jean', 'Pantalon', 'Short', 'Jupe', 'Bermuda', 'Chino'],
  robe: ['Robe', 'Robe longue', 'Robe pull', 'Robe chemise', 'Combinaison', 'Robe portefeuille'],
  chaussures: ['Baskets', 'Sandales', 'Bottines', 'Ballerines', 'Mocassins', 'Escarpins', 'Derbies', 'Boots'],
  accessoire: ['Sac', 'Ceinture', 'Foulard', 'Chapeau', 'Écharpe', 'Bonnet', 'Sac à main', 'Pochette', 'Casquette'],
};

const ADJECTIFS = [
  'élégant', 'moderne', 'intemporel', 'décontracté', 'chic',
  'tendance', 'classique', 'sobre', 'raffiné', 'fluide',
];

const COULEURS = [
  'blanc', 'noir', 'gris', 'beige', 'marine', 'kaki', 'bordeaux',
  'camel', 'rouge', 'bleu ciel', 'rose poudré', 'vert sauge',
  'moutarde', 'bleu jean', 'écru',
];

const MATIERES = [
  'coton', 'lin', 'laine', 'soie', 'denim',
  'velours', 'cachemire', 'viscose', 'maille',
];

/**
 * Mots-clés Lorem Flickr (anglais) par substantif de produit.
 * Permet d'obtenir des images qui correspondent vraiment au type de pièce
 * décrit, contrairement à picsum.photos qui renvoyait des paysages aléatoires.
 */
const KEYWORDS_FLICKR: Record<string, string> = {
  // haut
  'T-shirt': 'tshirt', 'Chemise': 'shirt', 'Blouse': 'blouse',
  'Pull': 'sweater', 'Cardigan': 'cardigan', 'Sweat': 'sweatshirt',
  'Veste': 'jacket', 'Top': 'top', 'Tunique': 'tunic', 'Polo': 'polo',
  // bas
  'Jean': 'jeans', 'Pantalon': 'trousers', 'Short': 'shorts',
  'Jupe': 'skirt', 'Bermuda': 'shorts', 'Chino': 'chinos',
  // robe
  'Robe': 'dress', 'Robe longue': 'dress', 'Robe pull': 'dress',
  'Robe chemise': 'dress', 'Combinaison': 'jumpsuit',
  'Robe portefeuille': 'dress',
  // chaussures
  'Baskets': 'sneakers', 'Sandales': 'sandals', 'Bottines': 'boots',
  'Ballerines': 'flats', 'Mocassins': 'loafers', 'Escarpins': 'heels',
  'Derbies': 'derby', 'Boots': 'boots',
  // accessoire
  'Sac': 'handbag', 'Sac à main': 'handbag', 'Ceinture': 'belt',
  'Foulard': 'scarf', 'Chapeau': 'hat', 'Écharpe': 'scarf',
  'Bonnet': 'beanie', 'Pochette': 'clutch', 'Casquette': 'cap',
};

/** Catégorie en anglais — fallback si `nomBase` n'est pas dans KEYWORDS_FLICKR. */
const CATEGORIE_EN: Record<Categorie, string> = {
  haut: 'top',
  bas: 'pants',
  robe: 'dress',
  chaussures: 'shoes',
  accessoire: 'accessory',
};

/** Combinaisons saisons cohérentes (jamais hiver+été simultanés). */
const SAISONS_COMBOS: ReadonlyArray<('printemps' | 'été' | 'automne' | 'hiver')[]> = [
  ['printemps'], ['été'], ['automne'], ['hiver'],
  ['printemps', 'été'], ['automne', 'hiver'],
  ['printemps', 'automne'], ['printemps', 'été', 'automne'],
];

// ============================================================================
// Pools pondérés (distribution réaliste)
// ============================================================================

const POOL_MARQUE: { weight: number; value: Marque }[] = [
  { weight: 30, value: 'Eram' },
  { weight: 25, value: 'Gemo' },
  { weight: 25, value: 'TBS' },
  { weight: 20, value: 'Bocage' },
];

const POOL_CATEGORIE: { weight: number; value: Categorie }[] = [
  { weight: 25, value: 'haut' },
  { weight: 20, value: 'bas' },
  { weight: 15, value: 'robe' },
  { weight: 25, value: 'chaussures' },
  { weight: 15, value: 'accessoire' },
];

const POOL_GENRE_DEFAULT: { weight: number; value: Genre }[] = [
  { weight: 45, value: 'femme' },
  { weight: 30, value: 'homme' },
  { weight: 15, value: 'enfant' },
  { weight: 10, value: 'unisexe' },
];

const POOL_GENRE_ROBE: { weight: number; value: Genre }[] = [
  { weight: 70, value: 'femme' },
  { weight: 25, value: 'enfant' },
  { weight: 5, value: 'unisexe' },
];

const POOL_GENRE_ACCESSOIRE: { weight: number; value: Genre }[] = [
  { weight: 40, value: 'unisexe' },
  { weight: 30, value: 'femme' },
  { weight: 20, value: 'homme' },
  { weight: 10, value: 'enfant' },
];

// ============================================================================
// Helpers
// ============================================================================

/** Tire au sort un élément. */
function pick<T>(arr: readonly T[]): T {
  return faker.helpers.arrayElement(arr);
}

/** Tire au sort un sous-ensemble (entre `min` et `max` éléments inclus). */
function pickSome<T>(arr: readonly T[], min: number, max: number): T[] {
  const count = faker.number.int({ min, max: Math.min(max, arr.length) });
  return faker.helpers.arrayElements(arr, count);
}

/** Prix arrondi à .99 (réalisme commercial). */
function priceRound99(min: number, max: number): number {
  const raw = faker.number.float({ min, max });
  return Math.floor(raw) + 0.99;
}

function pickGenre(categorie: Categorie): Genre {
  if (categorie === 'robe') return faker.helpers.weightedArrayElement(POOL_GENRE_ROBE);
  if (categorie === 'accessoire') return faker.helpers.weightedArrayElement(POOL_GENRE_ACCESSOIRE);
  return faker.helpers.weightedArrayElement(POOL_GENRE_DEFAULT);
}

// ============================================================================
// Génération d'un produit
// ============================================================================

function generateProduct(): Product {
  const marque = faker.helpers.weightedArrayElement(POOL_MARQUE);
  const categorie = faker.helpers.weightedArrayElement(POOL_CATEGORIE);
  const genre = pickGenre(categorie);

  const nomBase = pick(NOMS_CATEGORIE[categorie]);
  const adjectif = pick(ADJECTIFS);
  const matiere = pick(MATIERES);

  const couleursProduit = pickSome(COULEURS, 1, 3);
  const couleurPrincipale = couleursProduit[0];

  const taillesPossibles = TAILLES[genre][categorie];
  const tailles = pickSome(
    taillesPossibles,
    Math.min(2, taillesPossibles.length),
    taillesPossibles.length,
  );

  // 2-3 styles + 3-5 occasions par produit : assure que les filtres ne
  // raboten pas trop le catalogue, même avec des critères utilisateur précis.
  const stylesProduit = pickSome(STYLES, 2, 3);
  const occasionsProduit = pickSome(OCCASIONS, 3, 5);
  const saisonsProduit = pick(SAISONS_COMBOS);

  const [prixMin, prixMax] = PRIX_RANGES[marque][categorie];
  const prix = priceRound99(prixMin, prixMax);

  const id = faker.string.uuid();

  const nom = `${nomBase} ${adjectif} ${couleurPrincipale}`;
  const description = `${nomBase} en ${matiere} ${couleurPrincipale}, coupe ${adjectif}. Idéal pour vos sorties ${pick(occasionsProduit)}.`;

  return {
    id,
    marque,
    categorie,
    nom: nom.length > 80 ? nom.slice(0, 80) : nom,
    description: description.length > 200 ? description.slice(0, 200) : description,
    prix_eur: prix,
    genre,
    styles: stylesProduit,
    saisons: saisonsProduit,
    occasions: occasionsProduit,
    tailles_disponibles: tailles,
    couleurs: couleursProduit,
    // Lorem Flickr : vraie photo correspondant au type de pièce. `lock` est
    // dérivé de l'UUID (déterministe) plutôt que de Faker, ce qui évite de
    // consommer la séquence aléatoire — le contenu du catalogue reste identique
    // à un run sans image_url.
    image_url: `https://loremflickr.com/600/800/${KEYWORDS_FLICKR[nomBase] ?? CATEGORIE_EN[categorie]}?lock=${parseInt(id.slice(0, 8), 16) % 999999}`,
    url_produit: `https://${DOMAINES[marque]}/produits/${id}`,
  };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  // 150 produits : marge confortable pour que le préfiltrage par genre × saison
  // × occasion × tailles × budget laisse toujours assez de candidats à Claude.
  const TOTAL = 150;
  const catalog: Product[] = [];
  for (let i = 0; i < TOTAL; i++) {
    catalog.push(generateProduct());
  }

  // Validation Zod : fail-fast si un produit ne respecte pas le contrat.
  const result = catalogSchema.safeParse(catalog);
  if (!result.success) {
    console.error('❌ Validation Zod échouée :');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }

  const dataDir = path.join(process.cwd(), 'data');
  await mkdir(dataDir, { recursive: true });
  const outputPath = path.join(dataDir, 'catalog.json');
  await writeFile(outputPath, JSON.stringify(catalog, null, 2), 'utf-8');

  // Stats de distribution (visuel rapide, pas exporté).
  const parMarque = catalog.reduce<Record<string, number>>((acc, p) => {
    acc[p.marque] = (acc[p.marque] ?? 0) + 1;
    return acc;
  }, {});
  const parCategorie = catalog.reduce<Record<string, number>>((acc, p) => {
    acc[p.categorie] = (acc[p.categorie] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`✓ ${catalog.length} produits générés et validés`);
  console.log(`  → ${outputPath}`);
  console.log('  Répartition par marque :', parMarque);
  console.log('  Répartition par catégorie :', parCategorie);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
