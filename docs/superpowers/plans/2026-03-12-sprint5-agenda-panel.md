# Sprint 5 — Agenda Panel Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher les 7 prochains jours (GCal + tâches planifiées Manae) dans un panel slide-down accessible depuis le header.

**Architecture:** Un hook `useAgenda` centralise le fetch et l'état ouvert/fermé. Le panel `AgendaPanel` est monté dans le layout global (invisible par défaut) et se déclenche via une icône calendrier dans le header. Lecture seule.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase client, Google Calendar API (via `calendar.service.ts` existant)

---

## Fichiers

| Action | Fichier | Rôle |
|--------|---------|------|
| Créer | `hooks/useAgenda.ts` | Fetch GCal + tâches planifiées, état isOpen |
| Créer | `components/agenda/AgendaEvent.tsx` | Ligne d'événement (heure + titre + icône source) |
| Créer | `components/agenda/AgendaPanel.tsx` | Panel complet (7 jours, slide-down) |
| Modifier | `components/layout/Header.tsx` | Ajout icône calendrier + handler open |
| Modifier | `app/layout.tsx` | Montage AgendaPanel global |

---

## Chunk 1: Hook useAgenda

### Task 1: Créer useAgenda.ts

**Files:**
- Create: `hooks/useAgenda.ts`

**Contexte:** `getCalendarEvents(startDate, endDate)` existe dans `features/schedule/services/calendar.service.ts`. Les tâches planifiées = items avec `state: 'planned'` et `scheduled_at` non null.

- [ ] **Step 1: Créer le fichier `hooks/useAgenda.ts`**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCalendarEvents } from '@/features/schedule/services/calendar.service'
import type { GoogleCalendarEvent } from '@/features/schedule/types/scheduling.types'
import type { Item } from '@/types/items'

// ============================================
// TYPES
// ============================================

export interface AgendaEvent {
  id: string
  title: string
  startTime: string   // Format "HH:MM"
  endTime: string     // Format "HH:MM"
  source: 'gcal' | 'manae'
  contextColor?: string  // Pour les tâches Manae
}

export interface AgendaDay {
  date: Date
  label: string       // "Aujourd'hui", "Demain", "Lundi 16 mars"
  events: AgendaEvent[]
}

interface UseAgendaReturn {
  isOpen: boolean
  days: AgendaDay[]
  isLoadingGcal: boolean
  gcalError: string | null
  isGcalConnected: boolean
  open: () => void
  close: () => void
}

// ============================================
// HELPERS
// ============================================

function getDayLabel(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (isSameDay(date, today)) return 'Aujourd\'hui'
  if (isSameDay(date, tomorrow)) return 'Demain'

  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toTimeString(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function gcalEventToAgenda(event: GoogleCalendarEvent): AgendaEvent {
  const start = event.start.dateTime || event.start.date || ''
  const end = event.end?.dateTime || event.end?.date || ''
  return {
    id: event.id,
    title: event.summary || '(Sans titre)',
    startTime: start ? toTimeString(start) : '00:00',
    endTime: end ? toTimeString(end) : '',
    source: 'gcal',
  }
}

function manaeItemToAgenda(item: Item): AgendaEvent {
  return {
    id: item.id,
    title: item.content,
    startTime: item.scheduled_at ? toTimeString(item.scheduled_at) : '00:00',
    endTime: '',
    source: 'manae',
    contextColor: item.context || 'personal',
  }
}

function buildEmptyDays(): AgendaDay[] {
  const days: AgendaDay[] = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    days.push({ date, label: getDayLabel(date), events: [] })
  }
  return days
}

function mergeToDays(
  gcalEvents: GoogleCalendarEvent[],
  manaeItems: Item[]
): AgendaDay[] {
  const days = buildEmptyDays()

  // Ajouter les événements GCal
  for (const event of gcalEvents) {
    const startStr = event.start.dateTime || event.start.date
    if (!startStr) continue
    const eventDate = new Date(startStr)
    const day = days.find(d => isSameDay(d.date, eventDate))
    if (day) {
      day.events.push(gcalEventToAgenda(event))
    }
  }

  // Ajouter les tâches Manae planifiées
  for (const item of manaeItems) {
    if (!item.scheduled_at) continue
    const itemDate = new Date(item.scheduled_at)
    const day = days.find(d => isSameDay(d.date, itemDate))
    if (day) {
      day.events.push(manaeItemToAgenda(item))
    }
  }

  // Trier chaque jour par heure
  for (const day of days) {
    day.events.sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  return days
}

// ============================================
// HOOK
// ============================================

export function useAgenda(): UseAgendaReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [days, setDays] = useState<AgendaDay[]>(buildEmptyDays())
  const [isLoadingGcal, setIsLoadingGcal] = useState(false)
  const [gcalError, setGcalError] = useState<string | null>(null)
  const [isGcalConnected, setIsGcalConnected] = useState(true)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fenêtre : aujourd'hui → J+6
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = new Date(today)
    endDate.setDate(today.getDate() + 7)

    // 1. Tâches Manae planifiées (immédiat)
    const { data: manaeItems } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'task')
      .eq('state', 'planned')
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', today.toISOString())
      .lt('scheduled_at', endDate.toISOString())

    setDays(mergeToDays([], manaeItems || []))

    // 2. Événements GCal (async)
    setIsLoadingGcal(true)
    setGcalError(null)
    try {
      const gcalEvents = await getCalendarEvents(today, endDate)
      setIsGcalConnected(true)
      setDays(mergeToDays(gcalEvents, manaeItems || []))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      if (message.includes('token') || message.includes('auth') || message.includes('401')) {
        setIsGcalConnected(false)
      } else {
        setGcalError('Impossible de charger Google Calendar')
      }
    } finally {
      setIsLoadingGcal(false)
    }
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
    loadData()
  }, [loadData])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  return { isOpen, days, isLoadingGcal, gcalError, isGcalConnected, open, close }
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | head -30
```

Expected: Pas d'erreur TypeScript sur ce fichier.

- [ ] **Step 3: Commit**

```bash
git add hooks/useAgenda.ts
git commit -m "feat(agenda): add useAgenda hook with GCal + Manae planned tasks"
```

---

## Chunk 2: Composants AgendaEvent + AgendaPanel

### Task 2: Créer AgendaEvent.tsx

**Files:**
- Create: `components/agenda/AgendaEvent.tsx`

- [ ] **Step 1: Créer `components/agenda/AgendaEvent.tsx`**

```typescript
import { Calendar, Zap } from 'lucide-react'
import { CONTEXT_CONFIG } from '@/config/contexts'
import type { AgendaEvent as AgendaEventType } from '@/hooks/useAgenda'
import type { ItemContext } from '@/types/items'

interface AgendaEventProps {
  event: AgendaEventType
}

export function AgendaEvent({ event }: AgendaEventProps) {
  const isManae = event.source === 'manae'

  // Icône source
  const SourceIcon = isManae ? Zap : Calendar
  const sourceColor = isManae ? 'text-teal-500' : 'text-blue-500'

  // Couleur contexte pour les tâches Manae
  const contextConfig = isManae && event.contextColor
    ? CONTEXT_CONFIG[event.contextColor as ItemContext]
    : null

  return (
    <div className="flex items-start gap-3 py-2">
      {/* Heure */}
      <span className="text-xs text-text-muted w-10 shrink-0 pt-0.5 tabular-nums">
        {event.startTime}
      </span>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-dark truncate">{event.title}</p>
        {event.endTime && (
          <p className="text-xs text-text-muted">→ {event.endTime}</p>
        )}
      </div>

      {/* Icône source */}
      <div className="flex items-center gap-1 shrink-0">
        {contextConfig && (
          <contextConfig.icon className={`w-3 h-3 ${contextConfig.colorClass}`} />
        )}
        <SourceIcon className={`w-3.5 h-3.5 ${sourceColor}`} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Créer le dossier si nécessaire**

```bash
mkdir -p /Users/sandrinelay/Projets/manae-v2/components/agenda
```

- [ ] **Step 3: Commit**

```bash
git add components/agenda/AgendaEvent.tsx
git commit -m "feat(agenda): add AgendaEvent component"
```

---

### Task 3: Créer AgendaPanel.tsx

**Files:**
- Create: `components/agenda/AgendaPanel.tsx`

**Contexte:** Le panel slide-down depuis le haut, ~70% écran, scroll vertical. Backdrop semi-transparent. Fermeture au tap backdrop ou swipe vers le haut.

- [ ] **Step 1: Créer `components/agenda/AgendaPanel.tsx`**

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { X, AlertCircle, CalendarOff } from 'lucide-react'
import { AgendaEvent } from './AgendaEvent'
import type { AgendaDay } from '@/hooks/useAgenda'

interface AgendaPanelProps {
  isOpen: boolean
  days: AgendaDay[]
  isLoadingGcal: boolean
  gcalError: string | null
  isGcalConnected: boolean
  onClose: () => void
}

export function AgendaPanel({
  isOpen,
  days,
  isLoadingGcal,
  gcalError,
  isGcalConnected,
  onClose,
}: AgendaPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Fermeture swipe vers le haut
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    let startY = 0
    const handleTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY }
    const handleTouchEnd = (e: TouchEvent) => {
      const deltaY = e.changedTouches[0].clientY - startY
      if (deltaY < -60) onClose() // swipe vers le haut
    }

    panel.addEventListener('touchstart', handleTouchStart)
    panel.addEventListener('touchend', handleTouchEnd)
    return () => {
      panel.removeEventListener('touchstart', handleTouchStart)
      panel.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onClose])

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Agenda — 7 jours"
        className={`
          fixed inset-x-0 top-0 z-50
          h-[70vh] bg-white rounded-b-3xl shadow-2xl
          flex flex-col
          animate-slide-down
        `}
        style={{ maxHeight: '70vh' }}
      >
        {/* Header panel */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 shrink-0">
          <h2 className="typo-section-title text-text-dark">Agenda — 7 jours</h2>
          <button
            onClick={onClose}
            aria-label="Fermer l'agenda"
            className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Bandeaux d'état GCal */}
        {!isGcalConnected && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 shrink-0">
            <p className="text-xs text-blue-600 flex items-center gap-1.5">
              <CalendarOff className="w-3.5 h-3.5 shrink-0" />
              Connectez Google Calendar pour voir vos événements
            </p>
          </div>
        )}
        {gcalError && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 shrink-0">
            <p className="text-xs text-amber-600 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {gcalError}
            </p>
          </div>
        )}

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {days.map((day, index) => (
            <div key={index} className="mb-4">
              {/* Label du jour */}
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1 pt-2 capitalize">
                {day.label}
              </h3>

              <div className="border-l-2 border-gray-100 pl-3">
                {/* Skeleton GCal si chargement */}
                {isLoadingGcal && day.events.filter(e => e.source === 'gcal').length === 0 && (
                  <div className="flex gap-3 py-2 animate-pulse">
                    <div className="w-10 h-3 bg-gray-200 rounded" />
                    <div className="flex-1 h-3 bg-gray-200 rounded" />
                  </div>
                )}

                {/* Événements du jour */}
                {day.events.length > 0 ? (
                  day.events.map(event => (
                    <AgendaEvent key={event.id} event={event} />
                  ))
                ) : (
                  !isLoadingGcal && (
                    <p className="text-xs text-text-muted py-2 italic">Rien de prévu</p>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: Ajouter l'animation slide-down dans `styles/globals.css`**

Chercher dans `styles/globals.css` les animations existantes (ex: `animate-slide-in-right`) et ajouter :

```css
@keyframes slide-down {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}
.animate-slide-down {
  animation: slide-down 250ms ease-out forwards;
}
```

- [ ] **Step 3: Vérifier la compilation**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | head -50
```

- [ ] **Step 4: Commit**

```bash
git add components/agenda/AgendaPanel.tsx styles/globals.css
git commit -m "feat(agenda): add AgendaPanel component with slide-down animation"
```

---

## Chunk 3: Intégration Header + Layout

### Task 4: Modifier Header.tsx

**Files:**
- Modify: `components/layout/Header.tsx`

**Contexte:** Le header utilise déjà `useSyncExternalStore` pour surveiller l'état GCal. On ajoute une icône `CalendarDays` (Lucide) qui appelle `onAgendaOpen` via une prop.

- [ ] **Step 1: Modifier `components/layout/Header.tsx`**

Ajouter la prop `onAgendaOpen` et l'icône calendrier. Lire le fichier actuel d'abord, puis ajouter :

```typescript
// Dans les props du composant Header, ajouter :
interface HeaderProps {
  onAgendaOpen?: () => void
}

// Dans le JSX, après le logo et avant le CalendarBadge existant, ajouter :
{onAgendaOpen && (
  <button
    onClick={onAgendaOpen}
    aria-label="Ouvrir l'agenda"
    className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
  >
    <CalendarDays className="w-5 h-5 text-text-muted" />
  </button>
)}
```

Import à ajouter en haut du fichier :
```typescript
import { CalendarDays } from 'lucide-react'
```

- [ ] **Step 2: Vérifier que le Header compile sans erreur**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run lint 2>&1 | grep -i "header"
```

- [ ] **Step 3: Commit**

```bash
git add components/layout/Header.tsx
git commit -m "feat(agenda): add agenda trigger icon to Header"
```

---

### Task 5: Modifier app/layout.tsx

**Files:**
- Modify: `app/layout.tsx`

**Contexte:** Le layout monte `VoiceButtonGlobal` globalement. On fait pareil pour `AgendaPanel`. Le hook `useAgenda` vit dans un wrapper client qu'on crée.

- [ ] **Step 1: Créer `components/agenda/AgendaWrapper.tsx`** (wrapper client pour le layout serveur)

```typescript
'use client'

import { useAgenda } from '@/hooks/useAgenda'
import { AgendaPanel } from './AgendaPanel'
import { Header } from '@/components/layout/Header'

export function AgendaWrapper() {
  const { isOpen, days, isLoadingGcal, gcalError, isGcalConnected, open, close } = useAgenda()

  return (
    <>
      <Header onAgendaOpen={open} />
      <AgendaPanel
        isOpen={isOpen}
        days={days}
        isLoadingGcal={isLoadingGcal}
        gcalError={gcalError}
        isGcalConnected={isGcalConnected}
        onClose={close}
      />
    </>
  )
}
```

- [ ] **Step 2: Modifier `app/layout.tsx`**

Remplacer le `<Header />` existant par `<AgendaWrapper />` dans le layout. Vérifier d'abord comment Header est monté actuellement.

Si le Header est dans un composant `AppProviders` ou directement dans le layout, remplacer son import/usage par `AgendaWrapper`.

Import à ajouter :
```typescript
import { AgendaWrapper } from '@/components/agenda/AgendaWrapper'
```

- [ ] **Step 3: Build complet**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1
```

Expected: Build successful, pas d'erreur TypeScript.

- [ ] **Step 4: Test manuel**

```bash
npm run dev
```

1. Ouvrir http://localhost:3000
2. Cliquer sur l'icône calendrier dans le header
3. Vérifier que le panel s'ouvre avec animation slide-down
4. Vérifier les 7 sections de jours
5. Vérifier "Rien de prévu" sur les jours vides
6. Tap sur le backdrop → panel se ferme
7. Swipe vers le haut sur le panel → panel se ferme

- [ ] **Step 5: Commit final**

```bash
git add components/agenda/AgendaWrapper.tsx app/layout.tsx
git commit -m "feat(agenda): integrate AgendaPanel in global layout"
```
