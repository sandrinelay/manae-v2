# Manae - Productivité Intelligente

> Application de productivité pour parents débordés avec IA et intégration Google Calendar

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)](https://tailwindcss.com/)

---

## 🚀 Stack Technique

| Layer | Technologie |
|-------|-------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **IA** | OpenAI GPT-4o-mini |
| **Intégrations** | Google Calendar API |
| **Hosting** | Vercel |

---

## 📦 Installation

```bash
# Cloner le repo
git clone https://github.com/your-org/manae-v2.git
cd manae-v2

# Installer les dépendances
npm install
```

---

## ⚙️ Configuration

Créer un fichier `.env.local` à la racine du projet :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# OpenAI
OPENAI_API_KEY=sk-xxx...

# Google Calendar
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

> **Note** : Ne jamais committer le fichier `.env.local` (déjà dans `.gitignore`)

---

## 🛠️ Commandes

```bash
# Développement
npm run dev          # Démarre le serveur dev (http://localhost:3000)

# Production
npm run build        # Build de production
npm run start        # Démarre le serveur prod

# Code Quality
npm run lint         # Linting ESLint
```

---

## 📂 Structure du Projet

```
manae-v2/
├── app/                    # Pages Next.js (App Router)
│   ├── (main)/            # Routes authentifiées
│   │   ├── capture/       # Capture de pensées
│   │   ├── clarte/        # Dashboard
│   │   └── profil/        # Profil utilisateur
│   ├── api/               # API Routes
│   ├── onboarding/        # Onboarding 4 étapes
│   └── login/, signup/    # Authentification
├── components/            # Composants React
├── features/              # Modules fonctionnels
├── services/              # Logique métier
├── hooks/                 # Hooks React personnalisés
├── types/                 # Types TypeScript
├── constants/             # Constantes
├── config/                # Configuration
├── lib/                   # Utilitaires
├── prompts/               # Prompts IA OpenAI
├── styles/                # CSS global
└── docs/                  # Documentation
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [**SPECIFICATIONS.md**](SPECIFICATIONS.md) | 📋 Vue d'ensemble complète du projet |
| [**CLAUDE.md**](CLAUDE.md) | 🤖 Conventions de développement |
| [**docs/**](docs/) | 📖 Documentation technique détaillée |

### Documentation Technique

- [01-architecture.md](docs/01-architecture.md) - Architecture & stack
- [02-database.md](docs/02-database.md) - Schéma Supabase complet
- [03-api.md](docs/03-api.md) - Endpoints API & prompts IA
- [04-components.md](docs/04-components.md) - Composants UI
- [05-design-system.md](docs/05-design-system.md) - Design system CSS
- [06-authentication.md](docs/06-authentication.md) - Authentification
- [07-features.md](docs/07-features.md) - Features fonctionnelles
- [08-roadmap.md](docs/08-roadmap.md) - Roadmap & fonctionnalités futures

### Guides Pratiques

- [GUIDE_BETA_USERS.md](docs/GUIDE_BETA_USERS.md) - Inviter des beta testeurs
- [GUIDE_UTILISATEUR.md](docs/GUIDE_UTILISATEUR.md) - Guide utilisateur final
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Guide de déploiement
- [SECURITY.md](docs/SECURITY.md) - Sécurité & RGPD

---

## 🌐 Environnements

| Environnement | URL | Status |
|---------------|-----|--------|
| **Développement** | http://localhost:3000 | Local |
| **Production** | https://my.manae.app | Vercel |

---

## 🎯 Fonctionnalités Principales

### ✅ Capture Intelligente
- Saisie texte ou voix
- Analyse IA automatique (type, contexte, contraintes temporelles)
- Mood tracking (énergique, calme, débordé, fatigué)

### ✅ Dashboard Clarté
- Vue unifiée : Tâches, Notes, Idées, Courses
- Filtres par contexte (Perso, Famille, Travail, Santé)
- Pattern Block → FullView → Modal

### ✅ Planification Intelligente
- Détection contraintes temporelles
- Intégration Google Calendar
- Suggestions créneaux optimaux (mood-aware)

### ✅ Développement d'Idées
- Transformation idée floue → projet structuré
- Génération étapes actionnables
- Estimation temps/budget

### ✅ Shopping Lists
- Catégorisation automatique (11 catégories)
- Affichage par rayon
- Planification courses sur calendrier

---

## 🤝 Convention de Code

Voir [CLAUDE.md](CLAUDE.md) pour :
- Standards de code (SOLID, DRY, KISS)
- Gestion des erreurs
- Typage TypeScript strict
- Design system (pas de valeurs hardcodées)
- Patterns architecturaux

**Règles essentielles** :
- ✅ Icônes uniquement depuis **Lucide React**
- ✅ Variables CSS du design system (pas de `#colors` hardcodés)
- ✅ Composants UI réutilisables (`/components/ui`)
- ✅ UI en français
- ✅ `'use client'` sur composants interactifs

---

## 🔐 Sécurité

- ✅ Row Level Security (RLS) activé sur toutes les tables
- ✅ Vérification auth dans chaque API route
- ✅ Tokens refresh automatique
- ✅ HTTPS obligatoire
- ✅ Secrets en variables d'environnement

Voir [SECURITY.md](docs/SECURITY.md) pour plus de détails.

---

## 🧪 Tests

```bash
# Linting
npm run lint

# Tests E2E (à venir)
npm run test:e2e
```

Voir [TESTING.md](docs/TESTING.md) pour la stratégie de test complète.

---

## 📝 Changelog

Voir [CHANGELOG.md](docs/CHANGELOG.md) pour l'historique des versions.

---

## 📄 License

Propriétaire - Tous droits réservés

---

## 👥 Équipe

- **Fondatrice & Product** : Sandrine Lay
- **Développement** : [À compléter]
- **Design** : [À compléter]

---

## 📞 Contact

- **Email** : [À compléter]
- **Website** : https://my.manae.app

---

*Dernière mise à jour : Janvier 2026*
