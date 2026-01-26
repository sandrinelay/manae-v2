# Manae v2 - Documentation Projet

> **Point d'étape : 22 janvier 2026**
> Document de référence pour Claude et les développeurs
> **Statut : Développement terminé - Prêt pour beta**

---

## 1. Vision Produit

### 1.1 Qu'est-ce que Manae ?

**Manae** est une application de productivité en français destinée aux **parents débordés**. Elle aide à :
- Capturer les pensées en vrac (tâches, notes, idées, courses)
- Organiser automatiquement via l'IA
- Planifier intelligemment sur Google Calendar
- Réduire la charge mentale

### 1.2 Proposition de valeur

> "Organise ta vie de parent sereinement"

- **Capture rapide** : Texte libre, l'IA classifie automatiquement
- **Organisation intelligente** : Classification par type, contexte, urgence
- **Planification assistée** : Suggestions de créneaux optimaux
- **Interface apaisante** : Design mint/teal, UX mobile-first

---

## 2. Stack Technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework | Next.js (App Router) | 16.0.7 |
| UI | React | 19 |
| Langage | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Base de données | Supabase PostgreSQL | - |
| Authentification | Supabase Auth | - |
| IA | OpenAI GPT-4 | API |
| Calendrier | Google Calendar API | v3 |
| Icônes | Lucide React | - |

---

## 3. Architecture Applicative

### 3.1 Structure des dossiers

```
manae-v2/
├── app/                    # Routes Next.js (App Router)
│   ├── api/                # API routes
│   │   ├── analyze-v2/     # Classification IA
│   │   ├── develop-idea/   # Développement idées → projets
│   │   ├── auth/google/    # OAuth Google
│   │   └── items/update/   # Mise à jour items
│   ├── capture/            # Page de capture
│   ├── clarte/             # Dashboard principal
│   │   └── courses/        # Liste de courses
│   ├── login/              # Connexion
│   ├── set-password/       # Création mot de passe (invitation)
│   ├── forgot-password/    # Réinitialisation MDP
│   ├── onboarding/         # 4 étapes d'onboarding
│   ├── profil/             # Page profil
│   ├── projects/[id]/      # Détail projet
│   ├── error.tsx           # Page erreur globale
│   └── not-found.tsx       # Page 404
├── components/
│   ├── auth/               # Composants authentification
│   ├── capture/            # Composants capture
│   ├── clarte/             # Block/FullView/Modal pattern
│   │   ├── blocks/         # Aperçus (max 4 items)
│   │   ├── views/          # Vues complètes avec onglets
│   │   ├── modals/         # Modales de détail/action
│   │   ├── cards/          # Cartes d'items
│   │   └── tabs/           # Navigation par onglets
│   ├── layout/             # Header, BottomNav
│   ├── profil/             # Sections du profil
│   ├── ui/                 # Composants réutilisables
│   └── onboarding/         # Composants onboarding
├── features/               # Modules fonctionnels
│   ├── capture/            # Logique de capture
│   ├── ideas/              # Développement d'idées
│   └── schedule/           # Planification calendrier
├── services/               # Services métier
│   ├── ai/                 # Services IA
│   ├── capture/            # Service capture
│   ├── quota/              # Gestion quotas IA
│   └── supabase/           # Services BDD
├── hooks/                  # Hooks React personnalisés
├── types/                  # Types TypeScript
├── config/                 # Configuration (contextes, filtres)
├── constants/              # Labels UI en français
├── lib/                    # Utilitaires (Supabase, dates)
├── prompts/                # Prompts IA (OpenAI)
├── scripts/                # Scripts utilitaires
│   ├── invite-beta-users.ts # Invitation beta
│   └── generate-icons.ts    # Génération icônes PWA
├── public/
│   ├── icons/              # Icônes PWA
│   └── manifest.json       # Manifest PWA
└── middleware.ts           # Protection des routes
```

### 3.2 Pattern Block/FullView/Modal (Clarté)

Architecture UI pour le dashboard :

1. **Block** : Aperçu compact (max 4 items) + bouton "Voir tout"
2. **FullView** : Vue complète avec onglets (Actif/Terminé/Archivé)
3. **Modal** : Détail item avec actions (éditer, archiver, planifier, supprimer)

```
TasksBlock → TasksFullView → TaskActiveModal
NotesBlock → NotesFullView → NoteDetailModal
IdeasBlock → IdeasFullView → IdeaDetailModal / IdeaDevelopModal
ShoppingBlock → ShoppingFullView → ShoppingItemModal
```

---

## 4. Modèle de Données

### 4.1 Table `items` (principale)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `user_id` | UUID | FK vers auth.users |
| `type` | enum | task, note, idea, list_item |
| `state` | enum | captured, active, project, planned, completed, archived |
| `content` | text | Contenu de l'item |
| `context` | enum | personal, family, work, health, other |
| `ai_analysis` | jsonb | Résultat classification IA |
| `metadata` | jsonb | Données flexibles |
| `parent_id` | UUID | Pour hiérarchie (projet → tâches) |
| `list_id` | UUID | Pour items de liste de courses |
| `scheduled_at` | timestamp | Date planifiée |
| `google_event_id` | text | ID événement Google Calendar |
| `mood` | enum | energetic, neutral, overwhelmed, tired |
| `shopping_category` | enum | bakery, dairy, meat, produce, etc. |
| `created_at` | timestamp | Date création |
| `updated_at` | timestamp | Date modification |

### 4.2 Taxonomie Type/State

**Types** (immutables après création) :
- `task` : Action à réaliser
- `note` : Information à retenir
- `idea` : Concept abstrait (peut devenir projet)
- `list_item` : Article de liste de courses

**States** (cycle de vie) :
- `captured` → `active` → `completed` / `archived`
- Spécial `idea` : `active` → `project` (génère des sous-tâches)
- Spécial `task` : `active` → `planned` (planifié sur calendrier)

**Contextes** :
- `personal` : Personnel
- `family` : Famille
- `work` : Travail
- `health` : Santé
- `other` : Autre

### 4.3 Table `shopping_lists`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `user_id` | UUID | FK vers auth.users |
| `name` | text | Nom de la liste |
| `scheduled_at` | timestamp | Date courses prévue |
| `google_event_id` | text | ID événement Calendar |
| `status` | enum | active, completed, archived |
| `created_at` | timestamp | Date création |
| `updated_at` | timestamp | Date modification |

### 4.4 Table `profiles`

| Colonne | Type | Description |
|---------|------|-------------|
| `user_id` | UUID | PK, FK vers auth.users |
| `first_name` | text | Prénom |
| `last_name` | text | Nom |
| `email` | text | Email |
| `energy_moments` | text[] | Créneaux d'énergie préférés |
| `onboarding_completed` | boolean | Onboarding terminé |
| `created_at` | timestamp | Date création |
| `updated_at` | timestamp | Date modification |

### 4.5 Table `waitlist`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `first_name` | text | Prénom |
| `last_name` | text | Nom |
| `email` | text | Email |
| `created_at` | timestamp | Date inscription |
| `invited_at` | timestamp | Date invitation (null = pas invité) |

---

## 5. Fonctionnalités Implémentées

### 5.1 Authentification

| Fonctionnalité | État | Fichier |
|----------------|------|---------|
| Login email/password | ✅ | `app/login/page.tsx` |
| Création mot de passe (invitation) | ✅ | `app/set-password/page.tsx` |
| Mot de passe oublié | ✅ | `app/forgot-password/page.tsx` |
| Protection des routes | ✅ | `middleware.ts` |
| Script invitation beta | ✅ | `scripts/invite-beta-users.ts` |
| Google OAuth | ✅ | `app/api/auth/google/route.ts` |

**Flow d'invitation beta :**
1. Admin lance `npx tsx scripts/invite-beta-users.ts --email=xxx`
2. Utilisateur reçoit email avec lien
3. Clic → `/set-password` avec token dans hash
4. Création mot de passe → redirection `/onboarding`

### 5.2 Onboarding (4 étapes)

| Étape | Description | Fichier |
|-------|-------------|---------|
| 1 | Prénom | `app/onboarding/page.tsx` |
| 2 | Moments d'énergie | `app/onboarding/step2/page.tsx` |
| 3 | Contraintes horaires | `app/onboarding/step3/page.tsx` |
| 4 | Connexion Google Calendar | `app/onboarding/step4/page.tsx` |

### 5.3 Capture

| Fonctionnalité | État | Description |
|----------------|------|-------------|
| Input texte libre | ✅ | Capture pensées en vrac |
| Sélecteur mood | ✅ | 4 états émotionnels |
| Analyse IA | ✅ | Classification automatique |
| Fallback règles | ✅ | Si OpenAI indisponible |
| Compteur pending | ✅ | Items en attente de tri |

**API Analyse** : `POST /api/analyze-v2`
- Input : `{ content: string, mood?: string }`
- Output : `{ type, state, context, temporal_constraints, shopping_items? }`

### 5.4 Dashboard Clarté

| Section | Block | FullView | Modal |
|---------|-------|----------|-------|
| Tâches | ✅ TasksBlock | ✅ TasksFullView | ✅ TaskActiveModal, PlanTaskModal |
| Notes | ✅ NotesBlock | ✅ NotesFullView | ✅ NoteDetailModal |
| Idées | ✅ IdeasBlock | ✅ IdeasFullView | ✅ IdeaDetailModal, IdeaDevelopModal |
| Courses | ✅ ShoppingBlock | ✅ ShoppingFullView | ✅ ShoppingItemModal |

**Filtres** :
- Par contexte (personnel, famille, travail, santé)
- Par état (actif, terminé, archivé)
- Recherche textuelle

### 5.5 Développement d'idées

**Flow** :
1. Utilisateur clique "Développer" sur une idée
2. Wizard multi-étapes : âge de l'idée → blocages
3. Appel IA (`POST /api/develop-idea`)
4. Création sous-tâches automatique
5. Transformation idée → projet

### 5.6 Planification

| Fonctionnalité | État | Description |
|----------------|------|-------------|
| Connexion Google Calendar | ✅ | OAuth + stockage tokens |
| Fetch événements | ✅ | Récupération calendrier |
| Suggestion créneaux | ✅ | IA + scoring |
| Détection conflits | ✅ | Alerte si overlap |
| Création événement | ✅ | POST vers Google Calendar |

### 5.7 Profil

| Section | Fonctionnalité |
|---------|----------------|
| ProfileHeader | Affichage nom, email |
| PersonalInfoSection | Édition nom |
| PreferencesSection | Préférences utilisateur |
| ConnectionsSection | Statut Google Calendar |
| MoreSection | Liens légaux (CGU, Confidentialité, Mentions) |
| LogoutButton | Déconnexion |

---

## 6. Configuration Requise

### 6.1 Variables d'environnement (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=https://app.manae.app

# OpenAI
OPENAI_API_KEY=sk-...

# Google OAuth (optionnel, pour Calendar)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

### 6.2 Configuration Supabase

**Authentication → URL Configuration :**
- Site URL : `https://app.manae.app`
- Redirect URLs :
  - `https://app.manae.app/set-password`
  - `http://localhost:3000/set-password` (dev)

---

## 7. Scripts Utilitaires

### 7.1 Invitation Beta

```bash
# A. Inviter un email spécifique
npx tsx scripts/invite-beta-users.ts --email=user@example.com

# B. Inviter N personnes de la waitlist
npx tsx scripts/invite-beta-users.ts --limit=10

# C. Mode test (sans envoyer)
npx tsx scripts/invite-beta-users.ts --dry-run

# D. Exemple invitation spécifique
npx tsx scripts/invite-beta-users.ts --email=sandrine@example.com
```

### 7.2 Génération Icônes PWA

```bash
# Nécessite sharp
npm install sharp --save-dev
npx tsx scripts/generate-icons.ts
```

---

## 8. État d'Avancement

### 8.1 Terminé ✅ (Version Beta V1.2 - 22 janvier 2026)

**Core Features**
- [x] Système d'authentification complet
- [x] Flow d'invitation beta
- [x] Onboarding 4 étapes
- [x] Page Capture avec analyse IA
- [x] Dashboard Clarté (Block/FullView/Modal)
- [x] CRUD items complet
- [x] Développement idées → projets
- [x] Intégration Google Calendar complète
- [x] Page Profil complète
- [x] Pages erreur (404, 500)
- [x] Protection routes (middleware)

**Planification Intelligente**
- [x] Planification cognitive-aware (mood × complexité)
- [x] Détection contraintes temporelles ("ce soir", "avant vendredi")
- [x] Filtrage horaires services (médical, administratif, commercial)
- [x] Scoring créneaux optimaux
- [x] Messages d'explication personnalisés

**PWA & UX**
- [x] Manifest PWA créé
- [x] Génération icônes PWA
- [x] Métadonnées PWA dans layout.tsx
- [x] Favicon configuré
- [x] Design system finalisé

**Déploiement**
- [x] Déploiement Vercel prod
- [x] Configuration domaine `my.manae.app`
- [x] Site vitrine en ligne `manae.app`
- [x] Variables d'environnement production

**Quotas IA**
- [x] Affichage compteur (ex: "Quota IA 40/50")
- [x] Message "forfait supérieur" si quota bas
- [ ] Lien upgrade fonctionnel (page inexistante pour l'instant)

### 8.2 Partiellement implémenté ⚠️

- [ ] Quotas IA complets (affichage ✅, message ✅, mais lien upgrade vers page inexistante)

### 8.3 Non inclus dans Beta V1.2 (prévu V2) 📋

- [ ] Capture vocale (Web Speech API)
- [ ] Notifications toast améliorées
- [ ] Service worker offline-first
- [ ] Tests E2E (Playwright)
- [ ] Analytics (Amplitude/Mixpanel)
- [ ] Sentry monitoring
- [ ] Intégration Stripe paiements

---

## 9. Design System

### 9.1 Couleurs

| Token | Valeur | Usage |
|-------|--------|-------|
| Primary | `#4A7488` (Bleu-gris) | Boutons, accents |
| Secondary | `#BEE5D3` (Vert menthe) | Accents secondaires |
| Background | `#F2F5F7` (Gris clair) | Fond principal |
| Text Dark | `#334155` (Slate) | Texte principal |
| Text Muted | `#64748B` | Texte secondaire |

### 9.2 Typographie

- **Titres** : Quicksand (bold)
- **Corps** : Nunito

### 9.3 Couleurs par état

| État | Couleur fond |
|------|--------------|
| Idée active | `bg-yellow-100` |
| Projet | `bg-purple-100` |
| Archivé | `bg-gray-100` |

---

## 10. Conventions de Code

### 10.1 Nommage

- **Composants** : PascalCase (`TaskCard.tsx`)
- **Fonctions/hooks** : camelCase (`useClarteData`)
- **Colonnes BDD** : snake_case (`created_at`)
- **Constantes** : UPPER_SNAKE_CASE (`ITEM_STATES`)

### 10.2 Structure fichiers

```typescript
// 1. Imports
import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

// 2. Types
interface Props {
  item: Item
  onClose: () => void
}

// 3. Composant
export function MyComponent({ item, onClose }: Props) {
  // 3.1 États
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 3.2 Callbacks
  const handleAction = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // ...
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 3.3 Render
  return (...)
}
```

### 10.3 Règles

- **Langue UI** : Français
- **Icônes** : Lucide React uniquement
- **Pas de `any`** : Typage strict TypeScript
- **Gestion erreurs** : try/catch/finally systématique
- **États loading** : isLoading, error, data

---

## 11. Commandes Développement

```bash
# Démarrer le serveur
npm run dev

# Build production
npm run build

# Linting
npm run lint

# Tuer processus Node (si port bloqué)
killall node
```

---

## 12. URLs Importantes

| URL | Description | Statut |
|-----|-------------|--------|
| `http://localhost:3000` | Dev local | ✅ Actif |
| `https://my.manae.app` | Application production | ✅ En ligne |
| `https://manae.app` | Site vitrine + waitlist | ✅ En ligne |
| `https://manae.app/legal/cgu` | CGU | ✅ En ligne |
| `https://manae.app/legal/confidentialite` | Politique confidentialité | ✅ En ligne |
| `https://manae.app/legal/mentions-legales` | Mentions légales | ✅ En ligne |

---

## 13. Réseaux Sociaux

| Plateforme | Statut | Followers | Posts | Outils |
|------------|--------|-----------|-------|--------|
| **Instagram** | ✅ Créé | 0 | 3 | Canva Pro |
| **TikTok** | ✅ Créé | 0 | 0 | Canva Pro |
| **Facebook** | ✅ Page créée | 0 | 0 | Canva Pro |

**Stratégie contenu** : Voir [roadmap-beta_V1.2.md](roadmap-beta_V1.2.md)

---

## 14. Contact & Support

- **Repo** : `/Users/sandrinelay/Projets/manae-v2`
- **Supabase Project** : `manae-v2`
- **Domaine prod** : `my.manae.app`
- **Site vitrine** : `manae.app`

---

## 15. Documentation Complète

Pour plus de détails, consultez :
- [SPECIFICATIONS.md](../SPECIFICATIONS.md) - Vue d'ensemble technique et fonctionnelle
- [docs/01-architecture.md](01-architecture.md) - Architecture complète
- [docs/02-database.md](02-database.md) - Schéma base de données
- [docs/03-api.md](03-api.md) - API et prompts IA
- [docs/04-components.md](04-components.md) - Composants UI
- [docs/05-design-system.md](05-design-system.md) - Design system complet
- [docs/06-authentication.md](06-authentication.md) - Authentification
- [docs/07-features.md](07-features.md) - Fonctionnalités détaillées
- [docs/08-roadmap.md](08-roadmap.md) - Roadmap 6 mois
- [docs/DEPLOYMENT.md](DEPLOYMENT.md) - Guide déploiement
- [docs/SECURITY.md](SECURITY.md) - Sécurité et RGPD
- [docs/GUIDE_BETA_USERS.md](GUIDE_BETA_USERS.md) - Guide invitation beta
- [docs/GUIDE_UTILISATEUR.md](GUIDE_UTILISATEUR.md) - Guide utilisateur final
- [docs/roadmap-beta_V1.2.md](roadmap-beta_V1.2.md) - Roadmap beta

---

*Document créé le 7 janvier 2025*
*Dernière mise à jour : 22 janvier 2026*
*Version : Beta V1.2 - Prêt pour lancement*
