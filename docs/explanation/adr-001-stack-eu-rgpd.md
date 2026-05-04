# ADR-001 — Stack EU pour conformité RGPD

**Statut :** Accepté · 2026-05-04
**Décideuse :** Natacha (cheffe de projet)
**Contexte :** Projet pédagogique d'alternance, Groupe Eram

## Contexte

L'application traite des données personnelles (email pour l'authentification, tenues sauvegardées liées à un utilisateur). Selon le **RGPD art. 44 et suivants**, le transfert hors UE nécessite des garanties (clauses contractuelles types, adequacy decision) — coûteuses et risquées pour un projet pédagogique en 2 jours.

L'objectif est donc de construire une stack qui n'expose **aucune donnée personnelle hors UE** par construction.

## Décision

Toutes les briques traitant des données personnelles sont hébergées dans l'UE :

| Brique | Choix | Région UE |
|---|---|---|
| Hébergement front + API | Vercel | `cdg1` (Paris) ou `fra1` (Francfort) |
| Base de données + Auth | Supabase | `eu-west` (Irlande) |
| Analytics | Plausible | `plausible.io` (UE, sans cookie) |
| Modèle IA | Anthropic Claude API | _voir conséquences_ |

## Conséquences

✅ **Aucun transfert international** des données utilisateur (auth, tenues sauvegardées).
✅ **Pas de bandeau de consentement** : Plausible est exempté CNIL (mesure d'audience anonyme), Supabase Auth utilise un cookie de session strictement nécessaire (pas de tracking).
✅ Stack démontrable comme exemple de **privacy by design** pour le pitch interne.

⚠️ **Anthropic n'a pas de région UE garantie**. Pour limiter l'exposition :
- **Aucune PII** n'est jamais envoyée dans les prompts. Seuls les critères de sélection (taille, budget, occasion, style) sont transmis.
- L'email utilisateur, l'identifiant Supabase, et toute autre donnée nominative restent côté serveur Vercel/Supabase.
- Cf. ADR-003 (à venir) pour la justification du choix d'Anthropic vs alternatives EU.

⚠️ Choix de fournisseurs limité pour rester EU-only — assumé pour ce projet.

## Alternatives écartées

- **AWS / Azure** : régions UE possibles, mais surface d'admin trop large pour un projet 2 jours.
- **Google Analytics** : transferts hors UE confirmés (CJUE Schrems II), bandeau de consentement obligatoire, données comportementales détaillées non nécessaires → préférence Plausible.
- **Self-hosted** : VPS Hetzner/OVH + administration (auth, sauvegardes, monitoring) — incompatible avec délai de 2 jours.

## Références

- [RGPD — règlement (UE) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=fr)
- [Supabase — Data regions](https://supabase.com/docs/guides/platform/regions)
- [Vercel — Edge Network regions](https://vercel.com/docs/edge-network/regions)
- [CNIL — Plausible & cookies](https://www.cnil.fr/fr/cookies-traceurs-que-dit-la-loi)
