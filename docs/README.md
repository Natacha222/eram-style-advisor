# Documentation — Eram Style Advisor

Cette documentation suit le framework [Diátaxis](https://diataxis.fr/), qui distingue 4 types de contenu selon le besoin du lecteur.

| Quadrant | Pour... | Dossier |
|---|---|---|
| **Tutoriels** | apprendre en faisant (pas-à-pas) | [`tutorials/`](tutorials/) |
| **Guides pratiques** | résoudre un problème précis | [`how-to/`](how-to/) |
| **Référence** | consulter une info exacte | [`reference/`](reference/) |
| **Explication** | comprendre les choix (ADRs, stratégies) | [`explanation/`](explanation/) |

## ADRs disponibles

- [ADR-001 — Stack EU pour conformité RGPD](explanation/adr-001-stack-eu-rgpd.md)
- [ADR-002 — Catalogue produits en JSON statique](explanation/adr-002-catalogue-json-statique.md)

## À venir

D'autres documents seront ajoutés au fil du projet :

- **Référence** : registre des traitements RGPD (art. 30), déclaration d'accessibilité RGAA, schéma BDD Supabase, variables d'environnement, bilan RGESN.
- **Tutoriels** : installation locale, premier déploiement Vercel.
- **Guides** : répondre à une demande RGPD, auditer un composant avec axe, ajouter un event Plausible.
- **Explication** : threat model, stratégie d'éco-conception, modèle de données métier.
