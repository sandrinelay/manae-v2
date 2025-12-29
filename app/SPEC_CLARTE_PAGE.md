# SPEC : Page "Clarté" (Second Cerveau)

## 📋 Contexte

### Application
**Manae** — App de productivité pour parents mentalement surchargés. Capture de pensées, triage IA, planification intelligente.

### Feature à implémenter
Page principale **"Clarté"** — affichage de toutes les pensées capturées, organisées par type (Tâches, Notes, Idées, Courses) avec recherche et filtres rapides.

### Pourquoi "Clarté" ?
- Représente la promesse de Manae : transformer le chaos mental en clarté
- Évocateur et apaisant
- Court (7 lettres) — parfait pour la navigation mobile

### Route et navigation
- **Route** : `/clarte`
- **Navigation** : `[Capturer] [Clarté] [Profil]`
- **Fichier à modifier** : `components/layout/BottomNav.tsx` (remplacer `/ma-liste` par `/clarte`)

### Principes UX validés
- **Zéro décision** : Organisation automatique, pas de choix à faire
- **Vision globale** : Voir sa charge mentale d'un coup d'œil
- **Accès rapide** : Recherche toujours visible, filtres masquant les blocs non pertinents

---

## ⚠️ Modification requise : BottomNav

**Fichier** : `components/layout/BottomNav.tsx`

**Changement** :
```typescript
// AVANT
{ href: '/ma-liste', label: 'Ma Liste', icon: <ListIcon /> },

// APRÈS
{ href: '/clarte', label: 'Clarté', icon: <ListIcon /> },
```

---

## ✅ Décisions validées

| Aspect | Décision |
|--------|----------|
| Filtres | Masquent les autres blocs (pas scroll) |
| Ordre blocs | Fixe : Tâches → Notes → Idées → Courses |
| Tâches aperçu | 4 items max |
| Notes aperçu | 5 items max |
| Idées aperçu | 4 items max (grille 2x2) |
| Courses aperçu | 6 items max |
| Contextes | 5 : personal, family, work, health, other |
| Notes "Voir tout" | Chronologique + filtres par contexte |
| "Planifier courses" | Crée événement calendrier avec liste en description |
| Courses complétées | Disparaissent (pas de section "déjà acheté") |
| Archives | Accessibles via onglet dans "Voir tout" de chaque bloc |

---

## 🎨 Icônes existantes à réutiliser

### Icônes de contexte (`components/ui/icons/CategoryIcons.tsx`)

| Context | Icône existante | Import |
|---------|-----------------|--------|
| `personal` | `HomeIcon` | `@/components/ui/icons/CategoryIcons` |
| `family` | `UsersIcon` | `@/components/ui/icons/CategoryIcons` |
| `work` | `BriefcaseIcon` | `@/components/ui/icons/CategoryIcons` |
| `health` | `ActivityIcon` | `@/components/ui/icons/CategoryIcons` |
| `other` | `PinIcon` | `@/components/ui/icons/CategoryIcons` |

### Icônes de type (`features/capture/components/CaptureModal.tsx`)

Réutiliser les icônes définies dans CaptureModal :
- `TaskIcon` → Tâches
- `NoteIcon` → Notes  
- `IdeaIcon` → Idées
- `ShoppingIcon` → Courses

**⚠️ IMPORTANT** : Extraire ces icônes dans un fichier dédié `components/ui/icons/ItemTypeIcons.tsx` pour réutilisation.

### Mapping contextes → labels français

```typescript
export const CONTEXT_CONFIG = {
  personal: { icon: HomeIcon, label: 'Personnel', color: 'var(--color-slate-500)' },
  family: { icon: UsersIcon, label: 'Famille', color: 'var(--color-teal-500)' },
  work: { icon: BriefcaseIcon, label: 'Travail', color: 'var(--color-blue-500)' },
  health: { icon: ActivityIcon, label: 'Santé', color: 'var(--color-red-500)' },
  other: { icon: PinIcon, label: 'Autre', color: 'var(--color-gray-500)' }
} as const
```

---

## 🗂️ Structure des fichiers à créer

```
app/
├── clarte/
│   ├── page.tsx                    # Page principale "Clarté"
│   ├── taches/
│   │   └── page.tsx                # Voir tout Tâches
│   ├── notes/
│   │   └── page.tsx                # Voir tout Notes
│   ├── idees/
│   │   └── page.tsx                # Voir tout Idées
│   └── courses/
│       └── page.tsx                # Voir tout Courses

components/
├── ui/
│   └── icons/
│       └── ItemTypeIcons.tsx       # NOUVEAU - Icônes types extraites
│
├── clarte/
│   ├── ClarteHeader.tsx            # Recherche + Filtres
│   ├── SearchInput.tsx             # Input recherche
│   ├── FilterChips.tsx             # Chips de filtre avec badges
│   ├── SearchResults.tsx           # Affichage résultats recherche
│   │
│   ├── blocks/
│   │   ├── TasksBlock.tsx          # Bloc tâches (aperçu 4 items)
│   │   ├── NotesBlock.tsx          # Bloc notes (aperçu 5 items)
│   │   ├── IdeasBlock.tsx          # Bloc idées (aperçu 4 items)
│   │   └── ShoppingBlock.tsx       # Bloc courses (aperçu 6 items)
│   │
│   ├── cards/
│   │   ├── TaskCard.tsx            # Carte tâche individuelle
│   │   ├── NoteRow.tsx             # Ligne note individuelle
│   │   ├── IdeaCard.tsx            # Carte idée individuelle
│   │   └── ShoppingItemChip.tsx    # Chip article courses
│   │
│   └── modals/
│       └── NoteDetailModal.tsx     # Modal détail note

hooks/
├── useClarteData.ts                # Hook principal données Clarté
├── useSearch.ts                    # Hook recherche avec debounce
└── useShoppingList.ts              # Hook liste courses active

services/
└── clarte/
    ├── clarte.service.ts           # Service récupération données
    └── search.service.ts           # Service recherche
```

---

## 📦 Ordre d'implémentation

1. `components/ui/icons/ItemTypeIcons.tsx` — Extraire icônes de CaptureModal
2. `components/clarte/cards/TaskCard.tsx` — Carte tâche réutilisable
3. `components/clarte/cards/NoteRow.tsx` — Ligne note réutilisable
4. `components/clarte/cards/IdeaCard.tsx` — Carte idée réutilisable
5. `components/clarte/cards/ShoppingItemChip.tsx` — Chip course réutilisable
6. `hooks/useClarteData.ts` — Hook données
7. `components/clarte/blocks/TasksBlock.tsx` — Bloc tâches
8. `components/clarte/blocks/NotesBlock.tsx` — Bloc notes
9. `components/clarte/blocks/IdeasBlock.tsx` — Bloc idées
10. `components/clarte/blocks/ShoppingBlock.tsx` — Bloc courses
11. `components/clarte/SearchInput.tsx` — Input recherche
12. `components/clarte/FilterChips.tsx` — Filtres
13. `components/clarte/ClarteHeader.tsx` — Header complet
14. `app/clarte/page.tsx` — Page principale
15. Pages "Voir tout" (taches, notes, idees, courses)
16. `components/layout/BottomNav.tsx` — Mettre à jour route `/ma-liste` → `/clarte`

---

## 1️⃣ Icônes types (`components/ui/icons/ItemTypeIcons.tsx`)

```typescript
import React from 'react'

interface IconProps {
  className?: string
}

export const TaskIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)

export const NoteIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

export const IdeaIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

export const ShoppingIcon: React.FC<IconProps> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

// Icônes d'état
export const CalendarIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

export const ClockIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export const CheckIcon: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)
```

---

## 2️⃣ Configuration contextes (`config/contexts.ts`)

```typescript
import {
  HomeIcon,
  UsersIcon,
  BriefcaseIcon,
  ActivityIcon,
  PinIcon
} from '@/components/ui/icons/CategoryIcons'
import type { ItemContext } from '@/types/items'

export const CONTEXT_CONFIG: Record<ItemContext | 'other', {
  icon: React.FC<{ className?: string }>
  label: string
  colorClass: string
}> = {
  personal: {
    icon: HomeIcon,
    label: 'Personnel',
    colorClass: 'text-slate-500'
  },
  family: {
    icon: UsersIcon,
    label: 'Famille',
    colorClass: 'text-teal-500'
  },
  work: {
    icon: BriefcaseIcon,
    label: 'Travail',
    colorClass: 'text-blue-500'
  },
  health: {
    icon: ActivityIcon,
    label: 'Santé',
    colorClass: 'text-red-500'
  },
  other: {
    icon: PinIcon,
    label: 'Autre',
    colorClass: 'text-gray-500'
  }
}
```

---

## 3️⃣ TaskCard (`components/clarte/cards/TaskCard.tsx`)

### Props

```typescript
interface TaskCardProps {
  item: Item
  onMarkDone: (id: string) => void
  onPlan: (id: string) => void
  onPostpone: (id: string) => void
  onClarify?: (id: string) => void
}
```

### Structure visuelle

```
┌─────────────────────────────────┐
│ {content}                       │  ← Titre (max 2 lignes, line-clamp-2)
│ {status_icon} {status_text}     │  ← Indicateur état
│ {context_icon} {context_label}  │  ← Badge contexte
├─────────────────────────────────┤
│ [○ Fait]  [Action secondaire]   │  ← Boutons d'action
└─────────────────────────────────┘
```

### Règles d'affichage par état

| Condition | Icône | Texte | Action 1 | Action 2 |
|-----------|-------|-------|----------|----------|
| `scheduled_at` existe | `CalendarIcon` | Date formatée | "Fait" | "Reporter" |
| `state = 'active'` sans date | `ClockIcon` | "À planifier" | "Fait" | "Planifier" |
| `state = 'captured'` | ⚡ emoji | "À clarifier" | "Clarifier" | "Supprimer" |

### Formatage date (utilitaire à créer dans `lib/date-utils.ts`)

```typescript
import { format, isToday, isTomorrow, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

export function formatScheduledDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  
  if (isToday(date)) return `Auj. ${format(date, 'HH:mm')}`
  if (isTomorrow(date)) return `Demain ${format(date, 'HH:mm')}`
  if (differenceInDays(date, now) < 7) {
    return format(date, 'EEE HH:mm', { locale: fr })
  }
  return format(date, 'dd/MM HH:mm')
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays < 7) return `il y a ${diffDays}j`
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem`
  return `il y a ${Math.floor(diffDays / 30)} mois`
}
```

### Code composant

```typescript
'use client'

import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { CalendarIcon, ClockIcon } from '@/components/ui/icons/ItemTypeIcons'
import { formatScheduledDate } from '@/lib/date-utils'

interface TaskCardProps {
  item: Item
  onMarkDone: (id: string) => void
  onPlan: (id: string) => void
  onPostpone: (id: string) => void
  onClarify?: (id: string) => void
}

export function TaskCard({ item, onMarkDone, onPlan, onPostpone, onClarify }: TaskCardProps) {
  const context = item.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon
  
  const isPlanned = !!item.scheduled_at
  const isCaptured = item.state === 'captured'
  
  // Déterminer l'affichage selon l'état
  const statusDisplay = isPlanned
    ? { icon: <CalendarIcon className="w-4 h-4" />, text: formatScheduledDate(item.scheduled_at!) }
    : isCaptured
    ? { icon: <span>⚡</span>, text: 'À clarifier' }
    : { icon: <ClockIcon className="w-4 h-4" />, text: 'À planifier' }

  return (
    <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
      {/* Contenu */}
      <h3 className="font-medium text-text-dark line-clamp-2 mb-2">
        {item.content}
      </h3>
      
      {/* Statut */}
      <div className="flex items-center gap-1.5 text-sm text-text-muted mb-2">
        {statusDisplay.icon}
        <span>{statusDisplay.text}</span>
      </div>
      
      {/* Contexte */}
      <div className={`flex items-center gap-1.5 text-sm ${contextConfig.colorClass}`}>
        <ContextIcon className="w-4 h-4" />
        <span>{contextConfig.label}</span>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
        <button
          onClick={() => onMarkDone(item.id)}
          className="flex-1 py-2 px-3 text-sm font-medium rounded-lg border border-border hover:bg-mint transition-colors"
        >
          ○ Fait
        </button>
        
        {isPlanned ? (
          <button
            onClick={() => onPostpone(item.id)}
            className="flex-1 py-2 px-3 text-sm font-medium rounded-lg border border-border hover:bg-mint transition-colors"
          >
            ◷ Reporter
          </button>
        ) : isCaptured ? (
          <button
            onClick={() => onClarify?.(item.id)}
            className="flex-1 py-2 px-3 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
          >
            Clarifier
          </button>
        ) : (
          <button
            onClick={() => onPlan(item.id)}
            className="flex-1 py-2 px-3 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors"
          >
            📅 Planifier
          </button>
        )}
      </div>
    </div>
  )
}
```

---

## 4️⃣ NoteRow (`components/clarte/cards/NoteRow.tsx`)

### Props

```typescript
interface NoteRowProps {
  item: Item
  onTap: (id: string) => void
}
```

### Structure visuelle

```
📝 {content}                         ← Texte (1 ligne, max 50 chars, ellipsis)
   {context_icon} {context_label} • {relative_time}
```

### Code composant

```typescript
'use client'

import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { NoteIcon } from '@/components/ui/icons/ItemTypeIcons'
import { formatRelativeTime } from '@/lib/date-utils'

interface NoteRowProps {
  item: Item
  onTap: (id: string) => void
}

export function NoteRow({ item, onTap }: NoteRowProps) {
  const context = item.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  return (
    <button
      onClick={() => onTap(item.id)}
      className="w-full text-left py-3 border-b border-border last:border-b-0 hover:bg-mint/30 transition-colors"
    >
      <div className="flex items-start gap-2">
        <NoteIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-text-dark truncate">{item.content}</p>
          <div className={`flex items-center gap-1.5 text-xs mt-1 ${contextConfig.colorClass}`}>
            <ContextIcon className="w-3.5 h-3.5" />
            <span>{contextConfig.label}</span>
            <span className="text-text-muted">•</span>
            <span className="text-text-muted">{formatRelativeTime(item.updated_at)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
```

---

## 5️⃣ IdeaCard (`components/clarte/cards/IdeaCard.tsx`)

### Props

```typescript
interface IdeaCardProps {
  item: Item
  onTap: (id: string) => void
}
```

### Structure visuelle

```
┌─────────────────────────────────┐
│                                 │
│  {content}                      │  ← Titre (max 2 lignes)
│                                 │
│  {status_badge}                 │  ← Badge état
│  {progress si project}          │  ← Progression étapes
│  {context_icon} {context_label} │  ← Badge contexte
└─────────────────────────────────┘
```

### Règles d'affichage par état

| State | Badge | Couleur fond | Action au tap |
|-------|-------|--------------|---------------|
| `captured` | "⚡ À clarifier" | `bg-amber-50` | Modal clarification |
| `active` | "💡 À développer" | `bg-teal-50` | Page Develop Idea |
| `project` | "✨ Projet" | `bg-purple-50` | Page détail projet |

### Code composant

```typescript
'use client'

import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'

interface IdeaCardProps {
  item: Item
  onTap: (id: string) => void
}

const STATE_CONFIG = {
  captured: {
    badge: '⚡ À clarifier',
    bgClass: 'bg-amber-50 border-amber-200'
  },
  active: {
    badge: '💡 À développer',
    bgClass: 'bg-teal-50 border-teal-200'
  },
  project: {
    badge: '✨ Projet',
    bgClass: 'bg-purple-50 border-purple-200'
  }
} as const

export function IdeaCard({ item, onTap }: IdeaCardProps) {
  const context = item.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon
  
  const state = item.state as 'captured' | 'active' | 'project'
  const stateConfig = STATE_CONFIG[state] || STATE_CONFIG.active
  
  // Progression pour les projets
  const progress = getProjectProgress(item)

  return (
    <button
      onClick={() => onTap(item.id)}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md ${stateConfig.bgClass}`}
    >
      {/* Contenu */}
      <h3 className="font-medium text-text-dark line-clamp-2 mb-3">
        {item.content}
      </h3>
      
      {/* Badge état */}
      <div className="text-sm font-medium mb-1">
        {stateConfig.badge}
      </div>
      
      {/* Progression si projet */}
      {progress && (
        <div className="text-xs text-text-muted mb-2">
          {progress}
        </div>
      )}
      
      {/* Contexte */}
      <div className={`flex items-center gap-1.5 text-xs ${contextConfig.colorClass}`}>
        <ContextIcon className="w-3.5 h-3.5" />
        <span>{contextConfig.label}</span>
      </div>
    </button>
  )
}

function getProjectProgress(item: Item): string | null {
  if (item.state !== 'project') return null
  
  const steps = item.metadata?.project_steps as string[] | undefined
  if (!steps?.length) return null
  
  const completed = steps.filter(s => s.startsWith('✓')).length
  return `📋 ${completed}/${steps.length} étapes`
}
```

---

## 6️⃣ ShoppingItemChip (`components/clarte/cards/ShoppingItemChip.tsx`)

### Props

```typescript
interface ShoppingItemChipProps {
  item: Item
  onToggle: (id: string) => void
}
```

### Code composant

```typescript
'use client'

import { Item } from '@/types/items'

interface ShoppingItemChipProps {
  item: Item
  onToggle: (id: string) => void
}

export function ShoppingItemChip({ item, onToggle }: ShoppingItemChipProps) {
  const isCompleted = item.state === 'completed'

  return (
    <button
      onClick={() => onToggle(item.id)}
      className={`
        flex items-center gap-2 py-2 px-3 rounded-lg border transition-all
        ${isCompleted 
          ? 'bg-gray-100 border-gray-200 line-through text-text-muted' 
          : 'bg-white border-border hover:border-primary'
        }
      `}
    >
      <span className={`w-4 h-4 rounded border flex items-center justify-center
        ${isCompleted ? 'bg-primary border-primary text-white' : 'border-gray-300'}
      `}>
        {isCompleted && '✓'}
      </span>
      <span className="truncate text-sm">{item.content}</span>
    </button>
  )
}
```

---

## 7️⃣ Hook useClarteData (`hooks/useClarteData.ts`)

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Item, ItemType, ItemState } from '@/types/items'

interface ClarteData {
  tasks: Item[]
  notes: Item[]
  ideas: Item[]
  shoppingItems: Item[]
  counts: {
    tasks: number
    notes: number
    ideas: number
    shopping: number
  }
}

interface UseClarteDataReturn {
  data: ClarteData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useClarteData(): UseClarteDataReturn {
  const [data, setData] = useState<ClarteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Non authentifié')

      // Fetch tasks (4 items pour aperçu)
      const { data: tasks, count: tasksCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'task')
        .in('state', ['active', 'planned', 'captured'])
        .is('parent_id', null)
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .limit(4)

      // Fetch notes (5 items pour aperçu)
      const { data: notes, count: notesCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'note')
        .in('state', ['active', 'captured'])
        .order('updated_at', { ascending: false })
        .limit(5)

      // Fetch ideas (4 items pour aperçu)
      const { data: ideas, count: ideasCount } = await supabase
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('type', 'idea')
        .in('state', ['active', 'captured', 'project'])
        .order('updated_at', { ascending: false })
        .limit(4)

      // Fetch shopping list active
      const { data: activeList } = await supabase
        .from('shopping_lists')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      let shoppingItems: Item[] = []
      let shoppingCount = 0

      if (activeList) {
        const { data: items, count } = await supabase
          .from('items')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .eq('type', 'list_item')
          .eq('list_id', activeList.id)
          .eq('state', 'active')
          .order('created_at', { ascending: true })
          .limit(6)

        shoppingItems = items || []
        shoppingCount = count || 0
      }

      setData({
        tasks: sortTasks(tasks || []),
        notes: notes || [],
        ideas: sortIdeas(ideas || []),
        shoppingItems,
        counts: {
          tasks: tasksCount || 0,
          notes: notesCount || 0,
          ideas: ideasCount || 0,
          shopping: shoppingCount
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erreur inconnue'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, refetch: fetchData }
}

// Tri intelligent des tâches
function sortTasks(tasks: Item[]): Item[] {
  return tasks.sort((a, b) => {
    // Planifiées dans les 24h en premier
    const aUrgent = a.scheduled_at && isWithin24Hours(a.scheduled_at)
    const bUrgent = b.scheduled_at && isWithin24Hours(b.scheduled_at)
    if (aUrgent && !bUrgent) return -1
    if (!aUrgent && bUrgent) return 1
    
    // Par date planifiée
    if (a.scheduled_at && b.scheduled_at) {
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    }
    
    // Planifiées avant non-planifiées
    if (a.scheduled_at && !b.scheduled_at) return -1
    if (!a.scheduled_at && b.scheduled_at) return 1
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

// Tri intelligent des idées
function sortIdeas(ideas: Item[]): Item[] {
  const stateOrder = { project: 1, active: 2, captured: 3 }
  return ideas.sort((a, b) => {
    const orderA = stateOrder[a.state as keyof typeof stateOrder] || 4
    const orderB = stateOrder[b.state as keyof typeof stateOrder] || 4
    if (orderA !== orderB) return orderA - orderB
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
}

function isWithin24Hours(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  return diffMs > 0 && diffMs < 24 * 60 * 60 * 1000
}
```

---

## 8️⃣ TasksBlock (`components/clarte/blocks/TasksBlock.tsx`)

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { Item } from '@/types/items'
import { TaskCard } from '../cards/TaskCard'
import { ChevronRight } from 'lucide-react'

interface TasksBlockProps {
  tasks: Item[]
  totalCount: number
  onMarkDone: (id: string) => void
  onPlan: (id: string) => void
  onPostpone: (id: string) => void
}

export function TasksBlock({ tasks, totalCount, onMarkDone, onPlan, onPostpone }: TasksBlockProps) {
  const router = useRouter()

  if (tasks.length === 0) {
    return (
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-dark">Tâches</h2>
        </div>
        <p className="text-text-muted text-center py-8">
          Aucune tâche pour le moment
        </p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <button
        onClick={() => router.push('/clarte/taches')}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <h2 className="text-lg font-semibold text-text-dark">Tâches</h2>
        <span className="flex items-center gap-1 text-sm text-primary group-hover:underline">
          Voir tout ({totalCount})
          <ChevronRight className="w-4 h-4" />
        </span>
      </button>

      {/* Grille de cartes 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            item={task}
            onMarkDone={onMarkDone}
            onPlan={onPlan}
            onPostpone={onPostpone}
          />
        ))}
      </div>
    </section>
  )
}
```

---

## 9️⃣ NotesBlock (`components/clarte/blocks/NotesBlock.tsx`)

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { Item } from '@/types/items'
import { NoteRow } from '../cards/NoteRow'
import { ChevronRight } from 'lucide-react'

interface NotesBlockProps {
  notes: Item[]
  totalCount: number
  onTapNote: (id: string) => void
}

export function NotesBlock({ notes, totalCount, onTapNote }: NotesBlockProps) {
  const router = useRouter()

  if (notes.length === 0) {
    return (
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-dark">Notes</h2>
        </div>
        <p className="text-text-muted text-center py-8">
          Aucune note pour le moment
        </p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <button
        onClick={() => router.push('/clarte/notes')}
        className="w-full flex items-center justify-between mb-2 group"
      >
        <h2 className="text-lg font-semibold text-text-dark">Notes</h2>
        <span className="flex items-center gap-1 text-sm text-primary group-hover:underline">
          Voir tout ({totalCount})
          <ChevronRight className="w-4 h-4" />
        </span>
      </button>

      {/* Liste de notes */}
      <div>
        {notes.map(note => (
          <NoteRow
            key={note.id}
            item={note}
            onTap={onTapNote}
          />
        ))}
      </div>
    </section>
  )
}
```

---

## 🔟 IdeasBlock (`components/clarte/blocks/IdeasBlock.tsx`)

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { Item } from '@/types/items'
import { IdeaCard } from '../cards/IdeaCard'
import { ChevronRight } from 'lucide-react'

interface IdeasBlockProps {
  ideas: Item[]
  totalCount: number
  onTapIdea: (id: string) => void
}

export function IdeasBlock({ ideas, totalCount, onTapIdea }: IdeasBlockProps) {
  const router = useRouter()

  if (ideas.length === 0) {
    return (
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-dark">Idées</h2>
        </div>
        <p className="text-text-muted text-center py-8">
          Aucune idée pour le moment
        </p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <button
        onClick={() => router.push('/clarte/idees')}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <h2 className="text-lg font-semibold text-text-dark">Idées</h2>
        <span className="flex items-center gap-1 text-sm text-primary group-hover:underline">
          Voir tout ({totalCount})
          <ChevronRight className="w-4 h-4" />
        </span>
      </button>

      {/* Grille de cartes 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {ideas.map(idea => (
          <IdeaCard
            key={idea.id}
            item={idea}
            onTap={onTapIdea}
          />
        ))}
      </div>
    </section>
  )
}
```

---

## 1️⃣1️⃣ ShoppingBlock (`components/clarte/blocks/ShoppingBlock.tsx`)

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { Item } from '@/types/items'
import { ShoppingItemChip } from '../cards/ShoppingItemChip'
import { ChevronRight, Calendar } from 'lucide-react'

interface ShoppingBlockProps {
  items: Item[]
  totalCount: number
  onToggleItem: (id: string) => void
  onPlanShopping: () => void
}

export function ShoppingBlock({ items, totalCount, onToggleItem, onPlanShopping }: ShoppingBlockProps) {
  const router = useRouter()
  const remainingCount = totalCount - items.length

  if (items.length === 0 && totalCount === 0) {
    return (
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-dark">Courses</h2>
        </div>
        <p className="text-text-muted text-center py-8">
          Aucun article pour le moment
        </p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <button
        onClick={() => router.push('/clarte/courses')}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <h2 className="text-lg font-semibold text-text-dark">Courses</h2>
        <span className="flex items-center gap-1 text-sm text-primary group-hover:underline">
          Voir tout ({totalCount})
          <ChevronRight className="w-4 h-4" />
        </span>
      </button>

      {/* Grille d'articles 3 colonnes */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {items.map(item => (
          <ShoppingItemChip
            key={item.id}
            item={item}
            onToggle={onToggleItem}
          />
        ))}
      </div>

      {/* Indication items restants */}
      {remainingCount > 0 && (
        <p className="text-sm text-text-muted mb-3">
          + {remainingCount} autres articles
        </p>
      )}

      {/* Bouton planifier */}
      <button
        onClick={onPlanShopping}
        className="w-full py-3 px-4 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
      >
        <Calendar className="w-5 h-5" />
        Planifier les courses
      </button>
    </section>
  )
}
```

---

## 1️⃣2️⃣ FilterChips (`components/clarte/FilterChips.tsx`)

```typescript
'use client'

import { TaskIcon, NoteIcon, IdeaIcon, ShoppingIcon } from '@/components/ui/icons/ItemTypeIcons'

type FilterType = 'all' | 'tasks' | 'notes' | 'ideas' | 'shopping'

interface FilterChipsProps {
  activeFilter: FilterType
  counts: {
    tasks: number
    notes: number
    ideas: number
    shopping: number
  }
  onFilterChange: (filter: FilterType) => void
}

const FILTERS: Array<{
  id: FilterType
  label: string
  icon?: React.ReactNode
  countKey?: keyof FilterChipsProps['counts']
}> = [
  { id: 'all', label: 'Tout' },
  { id: 'tasks', label: 'Tâches', icon: <TaskIcon className="w-4 h-4" />, countKey: 'tasks' },
  { id: 'notes', label: 'Notes', icon: <NoteIcon className="w-4 h-4" />, countKey: 'notes' },
  { id: 'ideas', label: 'Idées', icon: <IdeaIcon className="w-4 h-4" />, countKey: 'ideas' },
  { id: 'shopping', label: '🛒', countKey: 'shopping' }
]

export function FilterChips({ activeFilter, counts, onFilterChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {FILTERS.map(filter => {
        const isActive = activeFilter === filter.id
        const count = filter.countKey ? counts[filter.countKey] : null

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${isActive 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-text-dark hover:bg-gray-200'
              }
            `}
          >
            {filter.icon}
            <span>{filter.label}</span>
            {count !== null && count > 0 && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-white/20' : 'bg-primary/10 text-primary'}
              `}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

---

## 1️⃣3️⃣ SearchInput (`components/clarte/SearchInput.tsx`)

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface SearchInputProps {
  onSearch: (query: string) => void
  onClear: () => void
}

export function SearchInput({ onSearch, onClear }: SearchInputProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search
  useEffect(() => {
    if (query.length < 2) {
      if (query.length === 0) onClear()
      return
    }

    const timer = setTimeout(() => {
      onSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, onSearch, onClear])

  const handleClear = () => {
    setQuery('')
    onClear()
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une pensée..."
        className="w-full pl-10 pr-10 py-3 bg-gray-100 rounded-xl text-text-dark placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      )}
    </div>
  )
}
```

---

## 1️⃣4️⃣ ClarteHeader (`components/clarte/ClarteHeader.tsx`)

```typescript
'use client'

import { SearchInput } from './SearchInput'
import { FilterChips } from './FilterChips'

type FilterType = 'all' | 'tasks' | 'notes' | 'ideas' | 'shopping'

interface ClarteHeaderProps {
  activeFilter: FilterType
  counts: {
    tasks: number
    notes: number
    ideas: number
    shopping: number
  }
  onFilterChange: (filter: FilterType) => void
  onSearch: (query: string) => void
  onClearSearch: () => void
}

export function ClarteHeader({
  activeFilter,
  counts,
  onFilterChange,
  onSearch,
  onClearSearch
}: ClarteHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-background pt-4 pb-2 px-4 -mx-4">
      <SearchInput onSearch={onSearch} onClear={onClearSearch} />
      <div className="mt-3">
        <FilterChips
          activeFilter={activeFilter}
          counts={counts}
          onFilterChange={onFilterChange}
        />
      </div>
    </header>
  )
}
```

---

## 1️⃣5️⃣ Page principale (`app/clarte/page.tsx`)

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ClarteHeader } from '@/components/clarte/ClarteHeader'
import { TasksBlock } from '@/components/clarte/blocks/TasksBlock'
import { NotesBlock } from '@/components/clarte/blocks/NotesBlock'
import { IdeasBlock } from '@/components/clarte/blocks/IdeasBlock'
import { ShoppingBlock } from '@/components/clarte/blocks/ShoppingBlock'
import { NoteDetailModal } from '@/components/clarte/modals/NoteDetailModal'
import { useClarteData } from '@/hooks/useClarteData'
import type { Item } from '@/types/items'

type FilterType = 'all' | 'tasks' | 'notes' | 'ideas' | 'shopping'

export default function ClartePage() {
  const router = useRouter()
  const { data, isLoading, refetch } = useClarteData()
  
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<Item | null>(null)

  // Handlers
  const handleMarkDone = useCallback(async (id: string) => {
    // TODO: Appeler API pour marquer comme fait
    console.log('Mark done:', id)
    await refetch()
  }, [refetch])

  const handlePlan = useCallback((id: string) => {
    // TODO: Ouvrir modal Plan Task
    console.log('Plan:', id)
  }, [])

  const handlePostpone = useCallback((id: string) => {
    // TODO: Ouvrir modal Report
    console.log('Postpone:', id)
  }, [])

  const handleTapNote = useCallback((id: string) => {
    const note = data?.notes.find(n => n.id === id)
    if (note) setSelectedNote(note)
  }, [data?.notes])

  const handleTapIdea = useCallback((id: string) => {
    const idea = data?.ideas.find(i => i.id === id)
    if (!idea) return
    
    if (idea.state === 'project') {
      router.push(`/projects/${id}`)
    } else {
      // TODO: Ouvrir panel Develop Idea ou modal clarification
      console.log('Tap idea:', id, idea.state)
    }
  }, [data?.ideas, router])

  const handleToggleShoppingItem = useCallback(async (id: string) => {
    // TODO: Toggle état item courses
    console.log('Toggle shopping item:', id)
    await refetch()
  }, [refetch])

  const handlePlanShopping = useCallback(() => {
    // TODO: Ouvrir flow Plan Task avec données courses
    console.log('Plan shopping')
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchQuery(null)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-text-muted">Chargement...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-red-500">Erreur de chargement</div>
      </div>
    )
  }

  // Déterminer quels blocs afficher selon le filtre
  const showTasks = activeFilter === 'all' || activeFilter === 'tasks'
  const showNotes = activeFilter === 'all' || activeFilter === 'notes'
  const showIdeas = activeFilter === 'all' || activeFilter === 'ideas'
  const showShopping = activeFilter === 'all' || activeFilter === 'shopping'

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header sticky avec recherche et filtres */}
        <ClarteHeader
          activeFilter={activeFilter}
          counts={data.counts}
          onFilterChange={setActiveFilter}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
        />

        {/* TODO: Afficher SearchResults si searchQuery existe */}

        {/* Blocs */}
        <div className="space-y-4 mt-4">
          {showTasks && (
            <TasksBlock
              tasks={data.tasks}
              totalCount={data.counts.tasks}
              onMarkDone={handleMarkDone}
              onPlan={handlePlan}
              onPostpone={handlePostpone}
            />
          )}

          {showNotes && (
            <NotesBlock
              notes={data.notes}
              totalCount={data.counts.notes}
              onTapNote={handleTapNote}
            />
          )}

          {showIdeas && (
            <IdeasBlock
              ideas={data.ideas}
              totalCount={data.counts.ideas}
              onTapIdea={handleTapIdea}
            />
          )}

          {showShopping && (
            <ShoppingBlock
              items={data.shoppingItems}
              totalCount={data.counts.shopping}
              onToggleItem={handleToggleShoppingItem}
              onPlanShopping={handlePlanShopping}
            />
          )}
        </div>
      </div>

      {/* Modal détail note */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onEdit={() => {/* TODO */}}
          onArchive={() => {/* TODO */}}
          onDelete={() => {/* TODO */}}
        />
      )}
    </div>
  )
}
```

---

## 1️⃣6️⃣ NoteDetailModal (`components/clarte/modals/NoteDetailModal.tsx`)

```typescript
'use client'

import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { NoteIcon } from '@/components/ui/icons/ItemTypeIcons'
import { formatRelativeTime } from '@/lib/date-utils'
import { X, Edit2, Archive, Trash2 } from 'lucide-react'

interface NoteDetailModalProps {
  note: Item
  onClose: () => void
  onEdit: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

export function NoteDetailModal({ note, onClose, onEdit, onArchive, onDelete }: NoteDetailModalProps) {
  const context = note.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-lg mx-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <NoteIcon className="w-5 h-5" />
            <span className="font-medium">Note</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4">
          <p className="text-text-dark text-lg">{note.content}</p>
          
          <div className={`flex items-center gap-1.5 text-sm mt-4 ${contextConfig.colorClass}`}>
            <ContextIcon className="w-4 h-4" />
            <span>{contextConfig.label}</span>
            <span className="text-text-muted">•</span>
            <span className="text-text-muted">Créée {formatRelativeTime(note.created_at)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-border">
          <button
            onClick={() => onEdit(note.id)}
            className="flex-1 py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl border border-border hover:bg-gray-50 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            <span>Modifier</span>
          </button>
          <button
            onClick={() => onArchive(note.id)}
            className="flex-1 py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl border border-border hover:bg-gray-50 transition-colors"
          >
            <Archive className="w-4 h-4" />
            <span>Archiver</span>
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="py-2.5 px-4 flex items-center justify-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )
}
```

---

## 📄 Pages "Voir tout"

### Structure commune

Chaque page "Voir tout" suit le même pattern :
- Header avec bouton retour et titre
- Onglets pour filtrer (Actives / Complétées / Archivées)
- Liste complète des items

---

### 1️⃣7️⃣ Tâches (`app/clarte/taches/page.tsx`)

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TaskCard } from '@/components/clarte/cards/TaskCard'
import { ChevronLeft } from 'lucide-react'
import type { Item } from '@/types/items'

type TabType = 'active' | 'completed' | 'archived'

export default function TachesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [tasks, setTasks] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    let query = supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'task')
      .is('parent_id', null)
      .order('scheduled_at', { ascending: true, nullsFirst: false })

    if (activeTab === 'active') {
      query = query.in('state', ['active', 'planned', 'captured'])
    } else if (activeTab === 'completed') {
      query = query.eq('state', 'completed')
    } else {
      query = query.eq('state', 'archived')
    }

    const { data } = await query
    setTasks(data || [])
    setIsLoading(false)
  }, [activeTab])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleMarkDone = async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .update({ state: 'completed', updated_at: new Date().toISOString() })
      .eq('id', id)
    fetchTasks()
  }

  const handlePlan = (id: string) => {
    // TODO: Ouvrir modal Plan Task
    console.log('Plan:', id)
  }

  const handlePostpone = (id: string) => {
    // TODO: Ouvrir modal Report
    console.log('Postpone:', id)
  }

  // Grouper les tâches par état
  const plannedTasks = tasks.filter(t => t.scheduled_at && t.state === 'planned')
  const activeTasks = tasks.filter(t => !t.scheduled_at && t.state === 'active')
  const capturedTasks = tasks.filter(t => t.state === 'captured')

  const TABS = [
    { id: 'active' as TabType, label: 'Actives' },
    { id: 'completed' as TabType, label: 'Complétées' },
    { id: 'archived' as TabType, label: 'Archivées' }
  ]

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/clarte')}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-text-dark">Tâches</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text-dark hover:bg-gray-200'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* Contenu */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="text-center py-12 text-text-muted">Chargement...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              Aucune tâche {activeTab === 'active' ? 'active' : activeTab === 'completed' ? 'complétée' : 'archivée'}
            </div>
          ) : activeTab === 'active' ? (
            <div className="space-y-6">
              {/* Planifiées */}
              {plannedTasks.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    📅 Planifiées ({plannedTasks.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {plannedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        item={task}
                        onMarkDone={handleMarkDone}
                        onPlan={handlePlan}
                        onPostpone={handlePostpone}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* À planifier */}
              {activeTasks.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    ⏳ À planifier ({activeTasks.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        item={task}
                        onMarkDone={handleMarkDone}
                        onPlan={handlePlan}
                        onPostpone={handlePostpone}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* À clarifier */}
              {capturedTasks.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    ⚡ À clarifier ({capturedTasks.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {capturedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        item={task}
                        onMarkDone={handleMarkDone}
                        onPlan={handlePlan}
                        onPostpone={handlePostpone}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  item={task}
                  onMarkDone={handleMarkDone}
                  onPlan={handlePlan}
                  onPostpone={handlePostpone}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### 1️⃣8️⃣ Notes (`app/clarte/notes/page.tsx`)

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NoteRow } from '@/components/clarte/cards/NoteRow'
import { NoteDetailModal } from '@/components/clarte/modals/NoteDetailModal'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { ChevronLeft, Search } from 'lucide-react'
import type { Item, ItemContext } from '@/types/items'

type TabType = 'active' | 'archived'

export default function NotesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [contextFilter, setContextFilter] = useState<ItemContext | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [notes, setNotes] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState<Item | null>(null)

  const fetchNotes = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    let query = supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'note')
      .order('updated_at', { ascending: false })

    if (activeTab === 'active') {
      query = query.in('state', ['active', 'captured'])
    } else {
      query = query.eq('state', 'archived')
    }

    if (contextFilter !== 'all') {
      query = query.eq('context', contextFilter)
    }

    const { data } = await query
    setNotes(data || [])
    setIsLoading(false)
  }, [activeTab, contextFilter])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleTapNote = (id: string) => {
    const note = notes.find(n => n.id === id)
    if (note) setSelectedNote(note)
  }

  const handleArchive = async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .update({ state: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
    setSelectedNote(null)
    fetchNotes()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette note ?')) return
    const supabase = createClient()
    await supabase.from('items').delete().eq('id', id)
    setSelectedNote(null)
    fetchNotes()
  }

  // Filtrer par recherche
  const filteredNotes = searchQuery
    ? notes.filter(n => n.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : notes

  const TABS = [
    { id: 'active' as TabType, label: 'Actives' },
    { id: 'archived' as TabType, label: 'Archivées' }
  ]

  const CONTEXT_FILTERS: Array<{ id: ItemContext | 'all', icon?: React.FC<{className?: string}>, label: string }> = [
    { id: 'all', label: 'Tous' },
    { id: 'personal', icon: CONTEXT_CONFIG.personal.icon, label: '' },
    { id: 'family', icon: CONTEXT_CONFIG.family.icon, label: '' },
    { id: 'work', icon: CONTEXT_CONFIG.work.icon, label: '' },
    { id: 'health', icon: CONTEXT_CONFIG.health.icon, label: '' },
    { id: 'other', icon: CONTEXT_CONFIG.other.icon, label: '' }
  ]

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/clarte')}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-text-dark">Notes</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text-dark hover:bg-gray-200'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filtres contexte */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {CONTEXT_FILTERS.map(filter => {
              const Icon = filter.icon
              return (
                <button
                  key={filter.id}
                  onClick={() => setContextFilter(filter.id)}
                  className={`
                    flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap
                    ${contextFilter === filter.id
                      ? 'bg-primary/10 text-primary border border-primary'
                      : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                    }
                  `}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {filter.label}
                </button>
              )
            })}
          </div>

          {/* Recherche */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans les notes..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </header>

        {/* Contenu */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="text-center py-12 text-text-muted">Chargement...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              {searchQuery ? 'Aucun résultat' : 'Aucune note'}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border divide-y divide-border">
              {filteredNotes.map(note => (
                <NoteRow key={note.id} item={note} onTap={handleTapNote} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onEdit={() => {/* TODO */}}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
```

---

### 1️⃣9️⃣ Idées (`app/clarte/idees/page.tsx`)

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IdeaCard } from '@/components/clarte/cards/IdeaCard'
import { ChevronLeft } from 'lucide-react'
import type { Item } from '@/types/items'

type TabType = 'all' | 'projects' | 'archived'

export default function IdeesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [ideas, setIdeas] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchIdeas = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    let query = supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'idea')
      .order('updated_at', { ascending: false })

    if (activeTab === 'all') {
      query = query.in('state', ['active', 'captured', 'project'])
    } else if (activeTab === 'projects') {
      query = query.eq('state', 'project')
    } else {
      query = query.eq('state', 'archived')
    }

    const { data } = await query
    setIdeas(data || [])
    setIsLoading(false)
  }, [activeTab])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  const handleTapIdea = (id: string) => {
    const idea = ideas.find(i => i.id === id)
    if (!idea) return
    
    if (idea.state === 'project') {
      router.push(`/projects/${id}`)
    } else {
      // TODO: Ouvrir panel Develop Idea
      console.log('Develop idea:', id)
    }
  }

  // Grouper par état
  const projectIdeas = ideas.filter(i => i.state === 'project')
  const activeIdeas = ideas.filter(i => i.state === 'active')
  const capturedIdeas = ideas.filter(i => i.state === 'captured')

  const TABS = [
    { id: 'all' as TabType, label: 'Toutes' },
    { id: 'projects' as TabType, label: 'Projets' },
    { id: 'archived' as TabType, label: 'Archivées' }
  ]

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/clarte')}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-text-dark">Idées</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text-dark hover:bg-gray-200'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* Contenu */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="text-center py-12 text-text-muted">Chargement...</div>
          ) : ideas.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              Aucune idée {activeTab === 'projects' ? 'en projet' : activeTab === 'archived' ? 'archivée' : ''}
            </div>
          ) : activeTab === 'all' ? (
            <div className="space-y-6">
              {/* Projets */}
              {projectIdeas.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    ✨ Projets en cours ({projectIdeas.length})
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {projectIdeas.map(idea => (
                      <IdeaCard key={idea.id} item={idea} onTap={handleTapIdea} />
                    ))}
                  </div>
                </section>
              )}

              {/* À développer */}
              {activeIdeas.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    💡 À développer ({activeIdeas.length})
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {activeIdeas.map(idea => (
                      <IdeaCard key={idea.id} item={idea} onTap={handleTapIdea} />
                    ))}
                  </div>
                </section>
              )}

              {/* À clarifier */}
              {capturedIdeas.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    ⚡ À clarifier ({capturedIdeas.length})
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {capturedIdeas.map(idea => (
                      <IdeaCard key={idea.id} item={idea} onTap={handleTapIdea} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ideas.map(idea => (
                <IdeaCard key={idea.id} item={idea} onTap={handleTapIdea} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### 2️⃣0️⃣ Courses (`app/clarte/courses/page.tsx`)

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Plus, Trash2, Calendar, Edit2 } from 'lucide-react'
import type { Item } from '@/types/items'
import type { ShoppingList } from '@/types/shopping-lists'

export default function CoursesPage() {
  const router = useRouter()
  const [list, setList] = useState<ShoppingList | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newItemText, setNewItemText] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    // Récupérer la liste active
    const { data: activeList } = await supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (activeList) {
      setList(activeList)

      // Récupérer les items actifs
      const { data: listItems } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'list_item')
        .eq('list_id', activeList.id)
        .eq('state', 'active')
        .order('created_at', { ascending: true })

      setItems(listItems || [])
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemText.trim() || !list || isAdding) return

    setIsAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from('items').insert({
      user_id: user.id,
      type: 'list_item',
      state: 'active',
      content: newItemText.trim(),
      list_id: list.id
    })

    setNewItemText('')
    setIsAdding(false)
    fetchData()
  }

  const handleToggleItem = async (id: string) => {
    const supabase = createClient()
    // Marquer comme completed = disparaît de la liste
    await supabase
      .from('items')
      .update({ state: 'completed', updated_at: new Date().toISOString() })
      .eq('id', id)
    fetchData()
  }

  const handleDeleteItem = async (id: string) => {
    const supabase = createClient()
    await supabase.from('items').delete().eq('id', id)
    fetchData()
  }

  const handlePlanShopping = () => {
    // TODO: Ouvrir flow Plan Task avec description de la liste
    console.log('Plan shopping with items:', items.map(i => i.content).join(', '))
  }

  const handleRenameList = async () => {
    if (!list) return
    const newName = prompt('Nouveau nom de la liste:', list.name)
    if (!newName || newName === list.name) return

    const supabase = createClient()
    await supabase
      .from('shopping_lists')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', list.id)
    fetchData()
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/clarte')}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-text-dark">Courses</h1>
          </div>

          {/* Nom de la liste */}
          {list && (
            <button
              onClick={handleRenameList}
              className="flex items-center gap-2 mt-3 text-text-muted hover:text-text-dark transition-colors"
            >
              <span className="text-sm">{list.name}</span>
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </header>

        {/* Contenu */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="text-center py-12 text-text-muted">Chargement...</div>
          ) : (
            <div className="space-y-4">
              {/* Input ajout */}
              <form onSubmit={handleAddItem} className="flex gap-2">
                <div className="flex-1 relative">
                  <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Ajouter un article..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newItemText.trim() || isAdding}
                  className="px-4 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
                >
                  Ajouter
                </button>
              </form>

              {/* Liste des items */}
              {items.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  Aucun article dans la liste
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-border divide-y divide-border">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleItem(item.id)}
                        className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
                      >
                        {/* Checkbox vide */}
                      </button>
                      <span className="flex-1 text-text-dark">{item.content}</span>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Bouton planifier */}
              {items.length > 0 && (
                <button
                  onClick={handlePlanShopping}
                  className="w-full py-3 px-4 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                  Planifier les courses
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 🎨 Animations CSS à ajouter (`styles/globals.css`)

```css
/* Animations */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scale-in {
  from { 
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}

/* Hide scrollbar for filter chips */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

---

## ✅ Checklist d'implémentation

- [ ] Créer `components/ui/icons/ItemTypeIcons.tsx`
- [ ] Créer `config/contexts.ts`
- [ ] Créer `lib/date-utils.ts`
- [ ] Créer `components/clarte/cards/TaskCard.tsx`
- [ ] Créer `components/clarte/cards/NoteRow.tsx`
- [ ] Créer `components/clarte/cards/IdeaCard.tsx`
- [ ] Créer `components/clarte/cards/ShoppingItemChip.tsx`
- [ ] Créer `hooks/useClarteData.ts`
- [ ] Créer `components/clarte/blocks/TasksBlock.tsx`
- [ ] Créer `components/clarte/blocks/NotesBlock.tsx`
- [ ] Créer `components/clarte/blocks/IdeasBlock.tsx`
- [ ] Créer `components/clarte/blocks/ShoppingBlock.tsx`
- [ ] Créer `components/clarte/SearchInput.tsx`
- [ ] Créer `components/clarte/FilterChips.tsx`
- [ ] Créer `components/clarte/ClarteHeader.tsx`
- [ ] Créer `components/clarte/modals/NoteDetailModal.tsx`
- [ ] Créer `app/clarte/page.tsx`
- [ ] Créer `app/clarte/taches/page.tsx`
- [ ] Créer `app/clarte/notes/page.tsx`
- [ ] Créer `app/clarte/idees/page.tsx`
- [ ] Créer `app/clarte/courses/page.tsx`
- [ ] Mettre à jour `components/layout/BottomNav.tsx` (route `/ma-liste` → `/clarte`, label "Ma Liste" → "Clarté")
- [ ] Ajouter animations dans `globals.css`
- [ ] Tester responsive mobile
- [ ] Connecter les actions aux API existantes
