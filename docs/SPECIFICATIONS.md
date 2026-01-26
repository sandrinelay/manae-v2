# Manae - Spécifications Fonctionnelles et Techniques

> **Document de référence** - Version 1.0
> **Date** : Janvier 2026
> **Domaine** : my.manae.app

---

## Table des matières

1. [Vision et Objectif](#1-vision-et-objectif)
2. [Public Cible](#2-public-cible)
3. [Fonctionnalités Principales](#3-fonctionnalités-principales)
4. [Stack Technique](#4-stack-technique)
5. [Modèle de Données](#5-modèle-de-données)
6. [Intégrations Externes](#6-intégrations-externes)
7. [Système de Quotas IA](#7-système-de-quotas-ia)
8. [Offres Commerciales](#8-offres-commerciales)
9. [Documentation Technique Détaillée](#9-documentation-technique-détaillée)

---

## 1. Vision et Objectif

### 1.1 Proposition de valeur

**Manae** est une application de productivité intelligente conçue pour les **parents débordés** qui jonglent entre vie personnelle, familiale et professionnelle.

L'application permet de :
- **Capturer** rapidement ses pensées (texte ou voix)
- **Organiser** automatiquement grâce à l'IA (tâches, notes, idées, courses)
- **Planifier** intelligemment sur Google Calendar
- **Suivre** son humeur et son niveau d'énergie

### 1.2 Problème résolu

Les parents modernes sont submergés par la charge mentale : rendez-vous médicaux, activités des enfants, courses, tâches administratives... Ils ont besoin d'un outil qui :

1. **Capture sans friction** - Parler ou écrire en langage naturel
2. **Classe automatiquement** - L'IA comprend et organise
3. **Planifie intelligemment** - Suggère les meilleurs créneaux
4. **Respecte leur rythme** - Adapté à leur niveau d'énergie

### 1.3 Objectif à 6 mois

Application prête pour le marché avec :
- Fonctionnalités core stabilisées
- Système de paiement actif (Stripe)
- Base utilisateurs early adopters

---

## 2. Public Cible

### 2.1 Persona principal

**Marie, 38 ans, mère de 2 enfants**

- Cadre à temps partiel (80%)
- Conjoint avec horaires décalés
- Enfants de 6 et 9 ans
- Jongle entre école, activités, travail, maison
- Utilise son téléphone pour tout noter "en vrac"
- Oublie régulièrement des rendez-vous

**Besoins** :
- Vider sa tête rapidement
- Ne plus oublier
- Mieux s'organiser sans effort supplémentaire

### 2.2 Cas d'usage typiques

1. **En voiture (mains libres)** : "Rappelle-moi d'acheter du lait et d'appeler le dentiste"
2. **Au réveil** : "Léa a besoin de nouvelles chaussures, penser au cadeau pour l'anniv de Théo"
3. **En réunion** : Note rapide "Envoyer le rapport avant vendredi"
4. **Le soir** : Revoir sa journée, planifier demain

---

## 3. Fonctionnalités Principales

### 3.1 Capture (Page `/capture`)

| Fonction | Description |
|----------|-------------|
| **Saisie texte** | Champ de texte libre, multi-lignes |
| **Saisie vocale** | Transcription via API navigateur |
| **Mood tracking** | 4 états : Énergique, Calme, Débordé(e), Fatigué(e) |
| **Analyse IA** | Classification automatique des pensées |

**Flux** :
```
Pensée brute → [Analyser] → IA classe → Confirmation → Sauvegarde DB
```

### 3.2 Clarté - Dashboard (Page `/clarte`)

Vue unifiée de tous les items organisés en blocs :

| Bloc | Contenu | Actions |
|------|---------|---------|
| **Tâches** | Items type `task` (actives, planifiées) | Caler, Archiver, Terminer |
| **Notes** | Items type `note` | Voir, Archiver |
| **Idées** | Items type `idea` + `project` | Développer, Archiver |
| **Courses** | Items type `list_item` | Cocher, Planifier courses |

**Pattern UI** : Block → FullView (tabs) → Modal (détail/action)

### 3.3 Planification Intelligente

Quand l'utilisateur clique "Caler" sur une tâche :

1. **Détection contraintes temporelles** : "avant vendredi", "lundi matin"
2. **Récupération Google Calendar** : Événements existants
3. **Application indisponibilités** : Travail, école, sport...
4. **Scoring des créneaux** : Diversification matin/après-midi/soir
5. **Proposition top 3** : L'utilisateur choisit

### 3.4 Développement d'Idées

Transforme une idée floue en projet structuré :

**Étape 1** : Âge de l'idée
- "Elle est toute fraîche" → Ton enthousiaste
- "Elle traîne depuis longtemps" → Questions sur les blocages

**Étape 2** (si idée ancienne) : Blocages
- Manque de temps
- Budget limité
- Peur de mal faire
- Manque d'énergie

**Étape 3** : Résultat IA
- Titre reformulé
- 3-5 étapes concrètes
- Estimation temps/budget
- Phrase de motivation

### 3.5 Liste de Courses

- **Catégorisation automatique** : 11 catégories (Boulangerie, Crémerie, Boucherie...)
- **Affichage par catégorie** : Facilite les courses en magasin
- **Planification** : Créer un événement "Courses" sur le calendrier

---

## 4. Stack Technique

### 4.1 Frontend

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Next.js** | 16 (App Router) | Framework React |
| **React** | 19 | UI Library |
| **TypeScript** | 5 | Typage statique |
| **Tailwind CSS** | 4 | Styling |
| **Lucide React** | 0.556 | Icônes |

### 4.2 Backend

| Service | Usage |
|---------|-------|
| **Supabase** | BDD PostgreSQL + Auth + RLS |
| **OpenAI** | Analyse IA (gpt-4o-mini) |
| **Google Calendar API** | Intégration calendrier |

### 4.3 Infrastructure

| Élément | Service |
|---------|---------|
| **Hébergement** | Vercel |
| **Base de données** | Supabase (PostgreSQL) |
| **Authentification** | Supabase Auth |
| **Paiements** | Stripe (préparé, non actif) |

### 4.4 Structure du Projet

```
manae-v2/
├── app/                    # Pages Next.js (App Router)
│   ├── (main)/            # Routes authentifiées
│   │   ├── capture/       # Capture de pensées
│   │   ├── clarte/        # Dashboard
│   │   ├── profil/        # Profil utilisateur
│   │   └── projects/[id]/ # Détail projet
│   ├── api/               # API Routes
│   ├── onboarding/        # Onboarding 4 étapes
│   └── login/, signup/    # Auth
├── components/            # Composants React
│   ├── ui/               # Composants réutilisables
│   ├── clarte/           # Composants Clarté
│   └── ...
├── features/             # Modules fonctionnels
│   ├── capture/          # Feature capture
│   ├── ideas/            # Feature développement idées
│   └── schedule/         # Feature planification
├── services/             # Logique métier
├── hooks/                # Hooks React personnalisés
├── types/                # Types TypeScript
├── constants/            # Labels et constantes
├── config/               # Configuration
├── lib/                  # Utilitaires (Supabase, dates)
├── prompts/              # Prompts IA OpenAI
└── styles/               # CSS global
```

---

## 5. Modèle de Données

### 5.1 Table `items` (centrale)

La table `items` est le cœur du modèle. Elle stocke tous les éléments capturés.

**Types** (immutables après création) :
- `task` : Action à faire
- `note` : Information à retenir
- `idea` : Projet/idée à développer
- `list_item` : Article de courses

**États** (cycle de vie) :
- `captured` : Vient d'être capturé
- `active` : Traité et actif
- `planned` : Planifié sur calendrier (tâches)
- `project` : Idée développée en projet
- `completed` : Terminé
- `archived` : Archivé

**Contextes** :
- `personal` : Personnel
- `family` : Famille
- `work` : Travail
- `health` : Santé
- `other` : Autre

### 5.2 Relations

```
users (1) ──────< items (N)
users (1) ──────< constraints (N)
users (1) ──────< shopping_lists (N)
shopping_lists (1) ──────< items (N) [via list_id]
items (1) ──────< items (N) [via parent_id, pour projets]
```

### 5.3 Autres Tables

- **`users`** : Profil utilisateur (prénom, nom, email, onboarding)
- **`constraints`** : Indisponibilités (travail, école, sport...)
- **`shopping_lists`** : Listes de courses
- **`subscription_plans`** : Plans d'abonnement
- **`user_subscriptions`** : Abonnements utilisateurs
- **`ai_usage`** : Tracking consommation IA
- **`waitlist`** : Liste d'attente

---

## 6. Intégrations Externes

### 6.1 Google Calendar

**Objectif** : Synchroniser les tâches planifiées avec le calendrier de l'utilisateur.

**Flux OAuth** :
1. Utilisateur clique "Connecter Google Calendar"
2. Redirection Google OAuth
3. Callback avec code d'autorisation
4. Échange code → tokens (access + refresh)
5. Stockage tokens côté client (localStorage)

**Fonctions** :
- `getCalendarEvents()` : Lire les événements
- `createCalendarEvent()` : Créer un événement

### 6.2 OpenAI

**Modèle** : `gpt-4o-mini`

**Usages** :
| Opération | Coût (crédits) | Description |
|-----------|----------------|-------------|
| `analyze` | 1 | Analyse d'une pensée capturée |
| `develop_idea` | 2 | Développement d'idée en projet |
| `suggest_time` | 1 | Suggestion de créneau (futur) |

**Prompts** :
- Analyse : Classification type/contexte/contraintes temporelles
- Développement : Transformation idée → projet structuré

---

## 7. Système de Quotas IA

### 7.1 Fonctionnement

Chaque utilisateur a un quota hebdomadaire de crédits IA selon son plan.

**Tracking** :
- Table `ai_usage` : Log de chaque opération
- Table `user_subscriptions` : Compteur `ai_used_this_week`
- Reset automatique chaque semaine (`week_reset_date`)

### 7.2 Coûts par opération

| Opération | Crédits |
|-----------|---------|
| Analyse pensée | 1 |
| Développement idée | 2 |
| Suggestion créneau | 1 |

### 7.3 Comportement limite atteinte

Quand `ai_used_this_week >= ai_quota_weekly` :
- Affichage message "Quota atteint"
- Analyse IA désactivée
- Fallback sur règles basiques (optionnel)
- Proposition upgrade plan

---

## 8. Offres Commerciales

### 8.1 Plans actuels (en DB)

| Plan | Prix/mois | Quota IA |
|------|-----------|----------|
| **Essentiel** | Gratuit | 50/semaine |
| **Plus** | 9,99€ | Illimité |
| **Famille** | 19,99€ | Illimité |

### 8.2 Plans envisagés (à confirmer)

| Plan | Prix/mois | Quota IA | Cible |
|------|-----------|----------|-------|
| **Essentiel** | 3,99€ | 20/semaine | Découverte |
| **Plus** | 7,99€ | Illimité | Standard |
| **Premium** | 15,99€ | Illimité | Power users |

### 8.3 Stripe

**Statut** : Tables préparées, intégration non active.

Colonnes prêtes :
- `subscription_plans.stripe_price_id`
- `user_subscriptions.stripe_customer_id`
- `user_subscriptions.stripe_subscription_id`

---

## 9. Documentation Technique Détaillée

Pour les développeurs, consulter les documents suivants :

| Document | Contenu |
|----------|---------|
| [01-architecture.md](docs/01-architecture.md) | Structure projet, configurations |
| [02-database.md](docs/02-database.md) | Schéma BDD, tables, RLS policies |
| [03-api.md](docs/03-api.md) | Endpoints, prompts IA complets |
| [04-components.md](docs/04-components.md) | Composants UI, patterns |
| [05-design-system.md](docs/05-design-system.md) | Couleurs, typo, CSS |
| [06-authentication.md](docs/06-authentication.md) | Flux auth, middleware |
| [07-features.md](docs/07-features.md) | Modules fonctionnels |
| [08-roadmap.md](docs/08-roadmap.md) | Fonctionnalités futures |

---

## Annexes

### A. Glossaire

| Terme | Définition |
|-------|------------|
| **Item** | Élément capturé (tâche, note, idée, article) |
| **Clarté** | Dashboard principal montrant tous les items |
| **Constraint** | Indisponibilité récurrente (travail, école...) |
| **Mood** | Humeur de l'utilisateur au moment de la capture |
| **Temporal constraint** | Contrainte de temps détectée ("avant vendredi") |

### B. Contacts

- **Développement** : [À compléter]
- **Design** : [À compléter]
- **Product** : [À compléter]

---

*Document généré le 22 janvier 2026*
