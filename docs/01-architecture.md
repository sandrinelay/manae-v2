# 01 - Architecture Technique

> Documentation technique détaillée de l'architecture Manae

---

## 1. Stack Technique

### 1.1 Dépendances Runtime

```json
{
  "next": "^16.0.7",
  "react": "^19.2.1",
  "react-dom": "^19.2.1",
  "@supabase/supabase-js": "^2.86.2",
  "@supabase/ssr": "^0.8.0",
  "openai": "^6.10.0",
  "lucide-react": "^0.556.0"
}
```

### 1.2 Dépendances Dev

```json
{
  "typescript": "^5",
  "tailwindcss": "^4",
  "@tailwindcss/postcss": "^4",
  "eslint": "^9",
  "eslint-config-next": "16.0.1",
  "dotenv": "^17.2.3"
}
```

---

## 2. Structure du Projet

```
manae-v2/
│
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Layout racine (fonts, providers)
│   ├── page.tsx                   # Page d'accueil (redirect)
│   │
│   ├── (main)/                    # Groupe routes authentifiées
│   │   ├── layout.tsx             # Layout avec BottomNav
│   │   ├── capture/
│   │   │   └── page.tsx           # Page capture
│   │   ├── clarte/
│   │   │   ├── page.tsx           # Dashboard principal
│   │   │   └── courses/
│   │   │       └── page.tsx       # Vue courses dédiée
│   │   ├── profil/
│   │   │   └── page.tsx           # Page profil
│   │   └── projects/
│   │       └── [id]/
│   │           └── page.tsx       # Détail projet
│   │
│   ├── api/                       # API Routes
│   │   ├── analyze-v2/
│   │   │   └── route.ts           # Analyse IA des pensées
│   │   ├── develop-idea/
│   │   │   └── route.ts           # Développement idée → projet
│   │   ├── items/
│   │   │   └── update/
│   │   │       └── route.ts       # Update générique items
│   │   └── auth/
│   │       ├── google/
│   │       │   └── route.ts       # OAuth token exchange
│   │       └── callback/
│   │           └── route.ts       # Supabase callback
│   │
│   ├── onboarding/                # Flow onboarding
│   │   ├── page.tsx               # Étape 1
│   │   ├── step2/page.tsx         # Étape 2
│   │   ├── step3/page.tsx         # Étape 3
│   │   └── step4/                 # Étape 4 (Google Calendar)
│   │       ├── page.tsx
│   │       └── callback/page.tsx
│   │
│   ├── login/page.tsx             # Page connexion
│   ├── signup/page.tsx            # Page inscription
│   ├── forgot-password/page.tsx   # Mot de passe oublié
│   ├── set-password/page.tsx      # Définir mot de passe
│   ├── item/[id]/page.tsx         # Détail item
│   └── offline/page.tsx           # Page hors ligne (PWA)
│
├── components/                    # Composants React
│   ├── ui/                        # Composants UI réutilisables
│   │   ├── Button.tsx
│   │   ├── ActionButton.tsx
│   │   ├── IconButton.tsx
│   │   ├── Input.tsx
│   │   ├── SearchBar.tsx
│   │   ├── FilterTabs.tsx
│   │   ├── ContextFilterTabs.tsx
│   │   ├── DeleteConfirmModal.tsx
│   │   ├── ConflictModal.tsx
│   │   ├── ConstraintForm.tsx
│   │   ├── ConstraintCard.tsx
│   │   ├── EnergyCard.tsx
│   │   ├── PullToRefresh.tsx
│   │   └── icons/
│   │       └── index.tsx          # Export Lucide icons
│   │
│   ├── clarte/                    # Composants dashboard Clarté
│   │   ├── blocks/                # Blocs preview (4-5 items)
│   │   │   ├── TasksBlock.tsx
│   │   │   ├── NotesBlock.tsx
│   │   │   ├── IdeasBlock.tsx
│   │   │   └── ShoppingBlock.tsx
│   │   │
│   │   ├── views/                 # Vues complètes avec tabs
│   │   │   ├── TasksFullView.tsx
│   │   │   ├── NotesFullView.tsx
│   │   │   ├── IdeasFullView.tsx
│   │   │   └── ShoppingFullView.tsx
│   │   │
│   │   ├── cards/                 # Cartes d'affichage
│   │   │   ├── TaskCard.tsx
│   │   │   ├── NoteRow.tsx
│   │   │   ├── IdeaCard.tsx
│   │   │   ├── ShoppingItemRow.tsx
│   │   │   └── ShoppingItemChip.tsx
│   │   │
│   │   ├── modals/                # Modales détail/action
│   │   │   ├── TaskDetailModal.tsx
│   │   │   ├── TaskActiveModal.tsx
│   │   │   ├── PlanTaskModal.tsx
│   │   │   ├── NoteDetailModal.tsx
│   │   │   ├── NoteArchivedModal.tsx
│   │   │   ├── IdeaDetailModal.tsx
│   │   │   ├── IdeaDevelopModal.tsx
│   │   │   ├── ShoppingItemModal.tsx
│   │   │   ├── PlanShoppingModal.tsx
│   │   │   └── CategorySelectorModal.tsx
│   │   │
│   │   ├── ClarteHeader.tsx
│   │   ├── EmptyState.tsx
│   │   ├── EmptySearchResult.tsx
│   │   ├── FilterChips.tsx
│   │   └── TabBar.tsx
│   │
│   ├── capture/                   # Composants capture
│   │   ├── CaptureInput.tsx
│   │   ├── CapturedAnimation.tsx
│   │   ├── GoogleCalendarCTA.tsx
│   │   ├── MoodSelector.tsx
│   │   ├── OrganizeButton.tsx
│   │   ├── PendingCounter.tsx
│   │   └── VoiceRecorder.tsx
│   │
│   ├── layout/                    # Layout
│   │   ├── Header.tsx
│   │   ├── AppHeader.tsx
│   │   ├── BottomNav.tsx
│   │   ├── MainLayout.tsx
│   │   └── PageTransition.tsx
│   │
│   ├── profil/                    # Composants profil
│   │   ├── ProfileHeader.tsx
│   │   ├── PersonalInfoSection.tsx
│   │   ├── ConnectionsSection.tsx
│   │   ├── PreferencesSection.tsx
│   │   ├── MoreSection.tsx
│   │   ├── EditNameModal.tsx
│   │   └── LogoutButton.tsx
│   │
│   ├── shared/                    # Composants partagés
│   │   ├── ConstraintsModal.tsx
│   │   └── EnergyMomentsModal.tsx
│   │
│   ├── auth/
│   │   └── AuthLayout.tsx
│   │
│   ├── onboarding/
│   │   └── header.tsx
│   │
│   ├── pwa/
│   │   └── ServiceWorkerRegistration.tsx
│   │
│   └── providers/
│       └── AppProviders.tsx
│
├── features/                      # Modules fonctionnels
│   ├── capture/
│   │   └── components/
│   │       ├── CaptureFlow.tsx
│   │       ├── CaptureModal.tsx
│   │       ├── MultiCaptureModal.tsx
│   │       └── MoodSelector.tsx
│   │
│   ├── ideas/
│   │   ├── components/
│   │   │   └── IdeaDevelopPanel.tsx
│   │   └── hooks/
│   │       └── useIdeaDevelop.ts
│   │
│   └── schedule/
│       ├── components/
│       │   ├── ContextSelector.tsx
│       │   ├── DurationSelector.tsx
│       │   ├── TimeSlotCard.tsx
│       │   └── SuccessModal.tsx
│       ├── hooks/
│       │   └── useScheduling.ts
│       ├── services/
│       │   ├── calendar.service.ts
│       │   ├── slots.service.ts
│       │   ├── ai-duration.service.ts
│       │   ├── ai-scheduling.service.ts
│       │   └── scoring.service.ts
│       └── utils/
│           ├── temporal-detection.ts
│           └── text-analysis.ts
│
├── services/                      # Logique métier
│   ├── items.service.ts           # CRUD items (wrapper)
│   ├── shopping.service.ts        # Opérations courses
│   ├── supabaseService.ts         # Opérations Supabase génériques
│   │
│   ├── supabase/                  # Services Supabase spécifiques
│   │   ├── items.service.ts       # CRUD items détaillé
│   │   └── shopping-lists.service.ts
│   │
│   ├── ai/
│   │   └── analysis.service.ts    # Service analyse IA
│   │
│   ├── capture/
│   │   └── capture.service.ts     # Service capture
│   │
│   └── quota/
│       └── quota.service.ts       # Gestion quotas IA
│
├── hooks/                         # Hooks React
│   ├── useAuth.ts                 # État authentification
│   ├── useItems.ts                # Gestion items
│   ├── useClarteData.ts           # Data dashboard Clarté
│   ├── useItemCapture.ts          # Flow capture
│   ├── useShoppingList.ts         # Opérations courses
│   ├── useAIQuota.ts              # Quota IA
│   ├── useItemAnimation.ts        # Animations
│   └── useGoogleCalendarStatus.ts # Statut Google Calendar
│
├── contexts/                      # React Context
│   ├── AuthContext.tsx            # Authentification
│   ├── ClarteDataContext.tsx      # Data Clarté
│   ├── ProfileDataContext.tsx     # Profil utilisateur
│   └── AIQuotaContext.tsx         # Quota IA
│
├── types/                         # Types TypeScript
│   ├── index.ts                   # Re-exports
│   ├── items.ts                   # Types items
│   └── shopping-lists.ts          # Types shopping
│
├── constants/                     # Constantes
│   └── labels.ts                  # Labels UI (français)
│
├── config/                        # Configuration
│   ├── contexts.ts                # Config contextes (icônes, couleurs)
│   ├── filters.tsx                # Config filtres
│   └── shopping-categories.ts     # Catégories courses
│
├── lib/                           # Librairies/Utils
│   ├── supabase/
│   │   ├── client.ts              # Client browser
│   │   └── server.ts              # Client server
│   ├── googleCalendar.ts          # Google Calendar utils
│   ├── google-calendar/
│   │   └── event-formatter.ts
│   ├── date-utils.ts              # Utils dates
│   ├── task-utils.ts              # Utils tâches
│   └── utils/
│       └── uuid.ts                # Génération UUID
│
├── prompts/                       # Prompts IA
│   ├── index.ts                   # Exports
│   ├── types.ts                   # Types prompts
│   ├── system.ts                  # Prompts système
│   ├── analyze.ts                 # Prompt analyse
│   └── develop-idea.ts            # Prompt développement idée
│
├── styles/
│   └── globals.css                # CSS global + design tokens
│
├── supabase/
│   └── migrations/                # Migrations SQL
│
├── public/                        # Assets statiques
│   ├── icons/                     # Icônes PWA
│   ├── manifest.json              # PWA manifest
│   └── sw.js                      # Service Worker
│
├── proxy.ts                       # Middleware auth
├── middleware.ts                  # Next.js middleware
├── next.config.ts                 # Config Next.js
├── tsconfig.json                  # Config TypeScript
├── package.json
└── CLAUDE.md                      # Instructions développement
```

---

## 3. Configuration

### 3.1 TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Points clés** :
- Path alias `@/*` → racine du projet
- Strict mode activé
- Target ES2017

### 3.2 Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...

# Google Calendar
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

### 3.3 Scripts NPM

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}
```

---

## 4. Patterns Architecturaux

### 4.1 Service → Hook → Component

```
┌─────────────────────────────────────────────────────────────┐
│                        COMPONENT                             │
│  - Rendu UI                                                 │
│  - Gestion état local UI                                    │
│  - Appels aux hooks                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                          HOOK                                │
│  - État (isLoading, error, data)                            │
│  - Callbacks mémoïsés                                       │
│  - Effects                                                  │
│  - Appels aux services                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                        SERVICE                               │
│  - Appels API/Supabase                                      │
│  - Transformation données                                   │
│  - Gestion erreurs                                          │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Block → FullView → Modal (Clarté)

```
┌─────────────┐    "Voir tout"    ┌─────────────────┐
│    Block    │ ───────────────►  │    FullView     │
│  (4-5 items)│                   │  (tabs + scroll)│
└──────┬──────┘                   └────────┬────────┘
       │                                   │
       │ clic item                         │ clic item
       ▼                                   ▼
┌─────────────────────────────────────────────────────┐
│                      MODAL                           │
│  - Détail item                                      │
│  - Actions (archiver, planifier, développer...)    │
└─────────────────────────────────────────────────────┘
```

### 4.3 Structure Hook Standard

```typescript
export function useFeature(options?: UseFeatureOptions) {
  // 1. États
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<Data | null>(null)

  // 2. Callbacks mémoïsés
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchService()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 3. Effects
  useEffect(() => {
    if (options?.autoLoad) loadData()
  }, [options?.autoLoad, loadData])

  // 4. Helpers
  const clearError = useCallback(() => setError(null), [])

  // 5. Return objet nommé
  return { isLoading, error, data, loadData, clearError }
}
```

---

## 5. Flux de Données

### 5.1 Capture → Analyse → Sauvegarde

```
User Input (texte/voix + mood)
         │
         ▼
┌─────────────────────┐
│   CaptureFlow.tsx   │
│   └── useItemCapture│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ POST /api/analyze-v2│
│ └── OpenAI gpt-4o   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  AIAnalysisResult   │
│  items[]: type,     │
│  context, state...  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  CaptureModal.tsx   │
│  Confirmation user  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Supabase INSERT     │
│ table: items        │
└─────────────────────┘
```

### 5.2 Planification Tâche

```
User clique "Caler"
         │
         ▼
┌─────────────────────┐
│  PlanTaskModal.tsx  │
│  └── useScheduling  │
└──────────┬──────────┘
           │
           ├──► Détection contraintes temporelles
           │    (temporal-detection.ts)
           │
           ├──► Fetch Google Calendar events
           │    (calendar.service.ts)
           │
           ├──► Fetch user constraints
           │    (table: constraints)
           │
           ▼
┌─────────────────────┐
│  findAvailableSlots │
│  (slots.service.ts) │
└──────────┬──────────┘
           │
           ├──► Scoring créneaux
           │    (scoring.service.ts)
           │
           ▼
┌─────────────────────┐
│  Top 3 créneaux     │
│  diversifiés        │
└──────────┬──────────┘
           │
           │ User sélectionne
           ▼
┌─────────────────────┐
│ createCalendarEvent │
│ + UPDATE items      │
│ (scheduled_at)      │
└─────────────────────┘
```

---

## 6. PWA

### 6.1 Manifest (`public/manifest.json`)

```json
{
  "name": "Manae",
  "short_name": "Manae",
  "description": "Productivité intelligente pour parents débordés",
  "start_url": "/capture",
  "display": "standalone",
  "background_color": "#F2F5F7",
  "theme_color": "#4A7488"
}
```

### 6.2 Service Worker

- Fichier : `public/sw.js`
- Enregistrement : `components/pwa/ServiceWorkerRegistration.tsx`
- Stratégie : Cache-first pour assets statiques

---

## 7. Conventions de Code

### 7.1 Nommage

| Élément | Convention | Exemple |
|---------|------------|---------|
| Composants | PascalCase | `TaskCard.tsx` |
| Hooks | camelCase avec `use` | `useItemCapture.ts` |
| Services | camelCase avec `.service` | `items.service.ts` |
| Types | PascalCase | `Item`, `ItemState` |
| Constantes | SCREAMING_SNAKE | `ITEM_STATES` |
| Colonnes DB | snake_case | `created_at` |

### 7.2 Imports

```typescript
// 1. Librairies externes
import { useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

// 2. Types (avec import type)
import type { Item, ItemState } from '@/types'

// 3. Composants internes
import { Button } from '@/components/ui/Button'

// 4. Services/hooks
import { itemsService } from '@/services/items.service'

// 5. Utils/config
import { CONTEXT_CONFIG } from '@/config/contexts'
```

### 7.3 Directive `'use client'`

Obligatoire pour tout composant utilisant :
- `useState`, `useEffect`, hooks React
- Event handlers (`onClick`, etc.)
- Context (`useContext`)
- Browser APIs

---

*Document technique - Architecture Manae v2*
