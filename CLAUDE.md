# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🎯 Objectif principal

Produire du code **propre, clair, maintenable et scalable**, en respectant les bonnes pratiques de développement modernes.

> **Contrainte ultime** : Le code doit pouvoir être repris par n'importe quel développeur intermédiaire et être compris en moins de 30 secondes.

---

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint code linting
```

---

## Architecture Overview

Manae is a French-language productivity app for task capture, mood tracking, and intelligent scheduling with Google Calendar integration.

**Tech Stack**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Supabase (PostgreSQL + Auth)

### Core Data Model

The app uses a unified `items` table with type/state taxonomy:

**Types** (immutable after creation):
- `task` - Action item
- `note` - Information to remember
- `idea` - Abstract concept (can become project)
- `list_item` - Shopping list item

**States** (mutable lifecycle):
- `captured` → `active` → `completed` / `archived`
- `idea` special: `active` → `project` (spawns child tasks)
- `task` special: `active` → `planned` (scheduled on calendar)

**Contexts**: `personal`, `family`, `work`, `health`, `other`

### Project Structure

```
app/
├── capture/            # Main capture interface
├── clarte/             # Dashboard with filtered views
├── projects/[id]/      # Project detail pages
├── onboarding/         # 4-step onboarding flow
└── api/
    ├── analyze-v2/     # AI analysis of captured thoughts
    ├── develop-idea/   # AI-powered idea → project conversion
    └── auth/google/    # OAuth token exchange

components/clarte/      # Clarté page components (Block/FullView/Modal pattern)
├── blocks/             # Preview blocks (max 4 items, expandable)
├── views/              # Full views with tabs
├── modals/             # Detail/action modals
└── cards/              # Item display cards

features/               # Feature-based modules
├── ideas/              # Idea development wizard
│   ├── hooks/useIdeaDevelop.ts
│   └── components/IdeaDevelopPanel.tsx
└── schedule/           # Task scheduling
    └── hooks/useScheduling.ts

config/                 # App configuration
├── contexts.ts         # Context icons/labels/colors
└── filters.tsx         # Filter types and UI config

hooks/                  # Hooks React réutilisables
├── useAuth.ts          # Auth state management
└── useClarteData.ts    # Clarté page data fetching

services/               # Logique métier et appels API
└── items.service.ts    # CRUD operations

lib/supabase/
├── client.ts           # Browser client
└── server.ts           # SSR client

types/                  # Interfaces et types TypeScript
└── index.ts            # Re-exports all types

constants/              # Constantes et configurations
└── item.constants.ts   # States, types, labels
```

---

## 📐 Standards de code obligatoires

### Principes fondamentaux

- **SOLID** : Respect strict des 5 principes
- **DRY** : Ne te répète jamais
- **Separation of Concerns** : Chaque module a une seule responsabilité
- **KISS** : Garde le code simple

### Anti-patterns interdits

- ❌ God object
- ❌ Spaghetti code
- ❌ Duplication de code
- ❌ Magie cachée (comportements implicites non documentés)
- ❌ Couplage fort entre modules

### Qualité du code

| Aspect | Règle |
|--------|-------|
| **Architecture** | Structurée et cohérente |
| **Commentaires** | Minimaux mais utiles (pas de commentaires évidents) |
| **Nommage** | Explicite, cohérent, lisible |
| **Fonctions** | Courtes, responsabilité unique |
| **Variables** | Noms descriptifs, scope minimal |

### Règles de séparation

1. **Composants** → Uniquement du rendu et de la gestion d'état local UI
2. **Services** → Toute interaction avec API, SDK, bases de données
3. **Hooks** → Logique réutilisable avec état
4. **Utils** → Fonctions pures sans effet de bord

---

## 🔌 Intégration API / Services externes

Quand le code interagit avec Supabase, OpenAI, Google Calendar, etc. :

```typescript
// ✅ CORRECT : Service dédié
// services/auth.service.ts
export const authService = {
  signIn: async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  }
};

// ✅ CORRECT : Composant qui utilise le service
// components/LoginForm.tsx
const handleSubmit = async () => {
  const result = await authService.signIn(email, password);
};
```

```typescript
// ❌ INTERDIT : Logique métier dans le composant
// components/LoginForm.tsx
const handleSubmit = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({...});
  // Traitement complexe ici...
};
```

---

## 🎨 Cohérence visuelle et réutilisation

### Variables CSS — Jamais de valeurs en dur

```typescript
// ✅ CORRECT : Utiliser les variables CSS du design system
className="bg-[var(--color-active-teal)] text-[var(--color-text-primary)]"

// ❌ INTERDIT : Valeurs hardcodées
className="bg-[#14B8A6] text-[#334155]"
```

**Règle absolue** : Toute couleur, spacing, border-radius, shadow doit provenir des variables CSS définies dans `styles/globals.css`.

### Icônes — Bibliothèque unique (Lucide React)

```typescript
// ✅ CORRECT : Import depuis Lucide
import { Check, X, ChevronRight } from 'lucide-react';

// ❌ INTERDIT : Mélanger plusieurs bibliothèques ou SVG custom
import { FaCheck } from 'react-icons/fa';  // Non !
<svg>...</svg>  // Non ! (sauf cas très spécifique validé)
```

### Composants existants — Réutilisation obligatoire

```typescript
// ✅ CORRECT : Réutiliser les composants UI existants
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

// ❌ INTERDIT : Recréer un bouton ou modal from scratch
<button className="...">  // Non ! Utiliser <Button />
```

**Checklist avant création** :
1. Ce composant existe-t-il déjà dans `/components/ui/` ?
2. Peut-il être adapté via props plutôt que dupliqué ?
3. Si nouveau → le rendre générique et réutilisable

---

## ⚠️ Gestion des erreurs — Pattern uniforme

### Structure try/catch obligatoire

```typescript
// ✅ CORRECT : Pattern standard du projet
const loadData = useCallback(async () => {
  setIsLoading(true)
  setError(null)
  
  try {
    const data = await fetchSomething()
    setData(data)
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to load data')
    setError(error)
    onError?.(error)
  } finally {
    setIsLoading(false)
  }
}, [])

// ❌ INTERDIT : Pas de gestion d'erreur
const loadData = async () => {
  const data = await fetchSomething()  // Peut exploser silencieusement
  setData(data)
}
```

### États de chargement obligatoires

Tout appel async doit gérer 3 états :

```typescript
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<Error | null>(null)
const [data, setData] = useState<Data | null>(null)
```

---

## 🔒 TypeScript — Typage strict

### Pas de `any`

```typescript
// ✅ CORRECT : Types explicites
interface UserData {
  id: string
  name: string
}
const processUser = (user: UserData): string => user.name

// ❌ INTERDIT
const processUser = (user: any): any => user.name
```

### Imports de types explicites

```typescript
// ✅ CORRECT
import type { Item, ItemType, ItemState } from '@/types/items'
import { createItem } from '@/services/items.service'

// ❌ À ÉVITER
import { Item, createItem } from '@/services/items.service'
```

### Types partagés dans `/types/`

Tous les types réutilisables doivent être exportés depuis `types/index.ts`.

---

## 🏷️ Constantes — Pas de magic strings

### Centraliser dans `/constants/` ou `/config/`

```typescript
// ✅ CORRECT : Constantes centralisées
// constants/item.constants.ts
export const ITEM_STATES = {
  CAPTURED: 'captured',
  ACTIVE: 'active',
  PLANNED: 'planned',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
} as const

// ❌ INTERDIT : Strings éparpillées
if (item.state === 'captured') { ... }  // Magic string
```

### Labels UI en français centralisés

```typescript
// ✅ CORRECT
export const STATE_LABELS: Record<ItemState, string> = {
  captured: 'À traiter',
  active: 'Actif',
  planned: 'Planifié',
  completed: 'Terminé',
  archived: 'Archivé'
}

// Utilisation
<span>{STATE_LABELS[item.state]}</span>

// ❌ INTERDIT
<span>{item.state === 'captured' ? 'À traiter' : 'Actif'}</span>
```

---

## 🪝 Hooks personnalisés — Pattern standard

```typescript
// hooks/useFeature.ts
export function useFeature(options?: UseFeatureOptions) {
  // 1. États
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<Data | null>(null)

  // 2. Callbacks mémoïsés
  const loadData = useCallback(async () => {
    // ... avec try/catch/finally
  }, [dependencies])

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

## ♿ Accessibilité — Règles minimales

```typescript
// ✅ CORRECT : Boutons accessibles
<button
  onClick={handleClick}
  aria-label="Fermer la modale"
  disabled={isLoading}
>
  <X className="w-5 h-5" />
</button>

// ✅ CORRECT : Inputs avec labels
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-describedby="email-error" />
{error && <span id="email-error" role="alert">{error}</span>}

// ❌ INTERDIT : Boutons sans contexte
<button onClick={handleClick}><X /></button>
```

---

## Key Patterns

### Block/FullView/Modal Architecture (components/clarte/)

- `Block`: Preview with max items + "Voir tout" → triggers FullView
- `FullView`: Tabbed interface with all items + filtering
- `Modal`: Detail view with actions (archive, delete, develop)

Each item type follows this pattern:
- `TasksBlock` → `TasksFullView` → `TaskActiveModal`
- `NotesBlock` → `NotesFullView` → `NoteDetailModal`
- `IdeasBlock` → `IdeasFullView` → `IdeaDetailModal` / `IdeaDevelopModal`

### Modal Structure (inline pattern)

```tsx
<>
  <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
  <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-lg mx-auto">
    {/* Header + Content + Actions */}
  </div>
</>
```

### Authentication Flow

1. `middleware.ts` refreshes Supabase session on every request
2. `useAuth()` hook manages session state with anonymous fallback
3. Separate Supabase clients for browser/server
4. Dev mode: `AuthInitializer` auto-logs in with `dev@manae.app`

### AI Integration

- `/api/analyze-v2`: Classifies captured thoughts → type, context, temporal constraints
- `/api/develop-idea`: Transforms idea into project with steps (uses OpenAI)
- `features/ideas/hooks/useIdeaDevelop.ts`: Multi-step wizard state management

---

## Conventions

- **UI Language**: French (all user-facing text)
- **Database columns**: `snake_case`
- **Variables/functions**: `camelCase`
- **Components**: `'use client'` directive for interactive components
- **Supabase operations**: Always verify auth with `getUser()`, throw errors for UI handling

### Design System

| Token | Value |
|-------|-------|
| Primary | Bleu-gris `#4A7488` |
| Secondary | Vert menthe `#BEE5D3` |
| Background | Gris clair `#F2F5F7` |
| Fonts | Nunito (body), Quicksand (headings) |

**State-based card colors**:
- Idea (active): `bg-yellow-100`
- Project: `bg-purple-100`
- Archived: `bg-gray-100`

---

## ✅ Checklist avant livraison

### Architecture
- [ ] Aucune duplication de code
- [ ] Responsabilités bien séparées (composant / service / hook)
- [ ] Pas de dépendances inutiles
- [ ] Code simple et direct (KISS)

### Qualité
- [ ] Nommage explicite partout
- [ ] Typage TypeScript strict (pas de `any`)
- [ ] Gestion d'erreurs complète (try/catch/finally)
- [ ] États de chargement gérés (isLoading, error, data)

### Cohérence visuelle
- [ ] **Aucune valeur hardcodée** (couleurs, spacing, etc.)
- [ ] **Icônes uniquement depuis Lucide React**
- [ ] **Composants UI existants réutilisés**
- [ ] **Labels UI centralisés** (pas de strings dans le JSX)

### Conventions Manae
- [ ] Textes UI en français
- [ ] Colonnes DB en `snake_case`
- [ ] Variables en `camelCase`
- [ ] `'use client'` sur composants interactifs
- [ ] Types partagés dans `/types/`
- [ ] Constantes dans `/constants/` ou `/config/`
