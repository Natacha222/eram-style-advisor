# Eram Style Advisor

Application web qui recommande des tenues (vêtements + chaussures) du Groupe Eram — marques **Eram, Gemo, TBS, Bocage** — en fonction de l'occasion, de la saison, du genre, du budget, du style et des tailles. La recommandation est composée par l'IA (Claude) parmi un catalogue préfiltré côté serveur.

> ⚠️ **Projet pédagogique d'alternance** — les données produits sont fictives, générées via Faker.js. Aucun lien commercial avec le Groupe Eram.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript strict** + **Tailwind v4**
- **Anthropic Claude** (`claude-sonnet-4-6`) pour la génération de tenues
- **Supabase** (région UE) — Auth + tenues sauvegardées (à venir J1 après-midi)
- **Plausible Analytics** (UE, sans cookie) — à venir J2
- **Zod** pour la validation (côté serveur ET côté client)
- **Vercel** pour l'hébergement (région `cdg1` / `fra1`)

## Démarrage local

```bash
npm install
cp .env.example .env.local       # remplir ANTHROPIC_API_KEY
npm run catalog:generate          # génère data/catalog.json (100 produits)
npm run dev                       # http://localhost:3000
```

Prérequis : Node ≥ 20 (testé sous Node 24).

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement Next.js |
| `npm run build` | build de production |
| `npm run start` | démarre le build de prod |
| `npm run lint` | ESLint |
| `npm run catalog:generate` | régénère `data/catalog.json` (idempotent, seed fixe) |

## Documentation

La documentation suit le framework [Diátaxis](https://diataxis.fr/). Index complet : [`docs/README.md`](docs/README.md).

- **Tutoriels** ([`docs/tutorials/`](docs/tutorials/)) — guides pas-à-pas
- **Guides** ([`docs/how-to/`](docs/how-to/)) — résoudre un problème précis
- **Référence** ([`docs/reference/`](docs/reference/)) — schéma BDD, registre RGPD, grille RGAA, variables d'environnement
- **Explication** ([`docs/explanation/`](docs/explanation/)) — ADRs (Architecture Decision Records), stratégies de conformité

ADRs déjà rédigés :

- [ADR-001 — Stack EU pour conformité RGPD](docs/explanation/adr-001-stack-eu-rgpd.md)
- [ADR-002 — Catalogue produits en JSON statique](docs/explanation/adr-002-catalogue-json-statique.md)

## Conformité — exigences non-négociables

Trois axes intégrés dès le départ :

- **RGPD** — minimisation des données (email + tenues seulement), hébergement EU exclusif, endpoints export/suppression conformes art. 17/20.
- **RGAA 4.1.2** — accessibilité numérique (sémantique HTML5, contrastes AA, navigation clavier, focus visible, alternatives textuelles).
- **RGESN** — éco-conception (préfiltrage du catalogue avant l'appel IA, cache des recommandations, polices système, ≤ 2 animations par page, pas de carrousel).

Voir [ADR-001](docs/explanation/adr-001-stack-eu-rgpd.md) pour le raisonnement détaillé.
