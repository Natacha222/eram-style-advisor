# ADR-002 — Catalogue produits en JSON statique

**Statut :** Accepté · 2026-05-04
**Contexte :** Eram Style Advisor, ~100 produits fictifs multi-marques, démo en 2 jours

## Contexte

L'application a besoin d'un catalogue de ~100 produits pour générer des recommandations de tenues. Trois options principales :

1. Base de données Supabase + back-office d'administration.
2. Fichier JSON statique versionné dans le repo.
3. CMS headless (Contentful, Strapi, Sanity).

## Décision

**Option 2 : fichier `data/catalog.json` généré via Faker.js avec seed fixe**, lu côté serveur uniquement, jamais envoyé en entier au client (toujours préfiltré sur genre/saison/tailles avant l'appel à Claude).

## Conséquences

✅ **Simplicité** : pas de back-office à coder, pas d'admin, pas de RLS — tient dans le délai de 2 jours.
✅ **Reproductibilité** : seed Faker fixe ⇒ même catalogue pour tous les contributeurs, diff git lisible.
✅ **RGESN-0001 / 0017** :
- Pas de fonctionnalité gadget (CRUD produit hors-scope démo).
- Préfiltrage côté serveur avant Claude minimise les tokens et la bande passante.
✅ **Sécurité** : pas de surface d'attaque (lecture seule, pas d'injection possible, pas d'authentification admin à protéger).
✅ **Données fictives** : aucun risque RGPD ni juridique vis-à-vis du groupe Eram (catalogue clairement marqué démo dans le README).

⚠️ **Évolution** : tout changement de catalogue = ré-exécution du script + commit. Acceptable pour la démo, à remplacer par Supabase + back-office si le projet passe en prod.
⚠️ **Pas de recherche full-text** : non nécessaire ici (Claude fait le matching sémantique sur le sous-ensemble préfiltré).

## Alternatives écartées

- **Supabase + back-office** : ~1 jour de dev supplémentaire (formulaires CRUD, RLS, auth admin). Hors-scope MVP.
- **CMS headless** : surcoût budgétaire, dépendance externe, complexité de déploiement disproportionnée pour une démo.

## Notes d'implémentation

- Le script [`scripts/generate-catalog.ts`](../../scripts/generate-catalog.ts) produit `data/catalog.json` à partir de tables de cohérence métier (prix par marque, tailles par genre × catégorie, etc.).
- Le schéma Zod `productSchema` (dans [`types/product.ts`](../../types/product.ts)) valide chaque produit avant l'écriture du fichier — fail-fast en cas d'incohérence.
- Commande de régénération : `npm run catalog:generate`.
- Le fichier `data/catalog.json` est **commité au repo** (source de vérité reproductible).
