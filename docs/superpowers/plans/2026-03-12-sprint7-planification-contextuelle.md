# Sprint 7 — Planification contextuelle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Proposer des créneaux de planification adaptés au contexte de la tâche (work → heures pro, autres → heures perso) et bloquer toute planification pendant des périodes d'exception (vacances, congés).

**Architecture:** Deux nouvelles tables Supabase (`user_work_schedule`, `schedule_exceptions`). Service dédié `work-schedule.service.ts`. `findAvailableSlots()` dans `slots.service.ts` reçoit un nouveau paramètre `taskContext` et applique deux filtres : exceptions (bloquent tout) et heures de travail (filtre contextuel). UI dans les paramètres utilisateur.

**Tech Stack:** Next.js 16, Supabase PostgreSQL + RLS, TypeScript, Tailwind CSS 4

---

## Fichiers

| Action | Fichier | Rôle |
|--------|---------|------|
| Créer | `supabase/migrations/008_work_schedule.sql` | Tables + RLS |
| Créer | `types/schedule.ts` | Types WorkSchedule, ScheduleException |
| Créer | `services/schedule/work-schedule.service.ts` | CRUD heures de travail + exceptions |
| Modifier | `features/schedule/services/slots.service.ts` | Paramètre taskContext + filtrage |
| Modifier | `features/schedule/hooks/useScheduling.ts` | Passer taskContext à findAvailableSlots |
| Créer | `components/settings/WorkScheduleForm.tsx` | UI heures de travail |
| Créer | `components/settings/ExceptionsList.tsx` | UI périodes d'exception |
| Créer | `app/settings/page.tsx` | Page paramètres (ou modifier si existante) |

---

## Chunk 1: Base de données + Types + Service

### Task 1: Migration Supabase

**Files:**
- Create: `supabase/migrations/008_work_schedule.sql`

- [ ] **Step 1: Créer `supabase/migrations/008_work_schedule.sql`**

```sql
-- ============================================
-- Table user_work_schedule : heures de travail récurrentes
-- ============================================

create table if not exists user_work_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  work_days int[] not null default '{1,2,3,4,5}',  -- ISO: 1=lundi, 7=dimanche
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_work_schedule enable row level security;

create policy "users see own work schedule"
  on user_work_schedule for select
  using (auth.uid() = user_id);

create policy "users insert own work schedule"
  on user_work_schedule for insert
  with check (auth.uid() = user_id);

create policy "users update own work schedule"
  on user_work_schedule for update
  using (auth.uid() = user_id);

create policy "users delete own work schedule"
  on user_work_schedule for delete
  using (auth.uid() = user_id);

-- ============================================
-- Table schedule_exceptions : périodes ponctuelles de blocage
-- ============================================

create table if not exists schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  label text,                        -- ex: "Vacances été" (optionnel)
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now(),
  constraint valid_date_range check (end_date >= start_date)
);

alter table schedule_exceptions enable row level security;

create policy "users see own schedule exceptions"
  on schedule_exceptions for select
  using (auth.uid() = user_id);

create policy "users insert own schedule exceptions"
  on schedule_exceptions for insert
  with check (auth.uid() = user_id);

create policy "users update own schedule exceptions"
  on schedule_exceptions for update
  using (auth.uid() = user_id);

create policy "users delete own schedule exceptions"
  on schedule_exceptions for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Appliquer la migration**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npx supabase db push
```

Expected: Les deux tables créées avec leurs policies RLS.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/008_work_schedule.sql
git commit -m "feat(schedule): add user_work_schedule and schedule_exceptions tables"
```

---

### Task 2: Types + Service

**Files:**
- Create: `types/schedule.ts`
- Create: `services/schedule/work-schedule.service.ts`

- [ ] **Step 1: Créer `types/schedule.ts`**

```typescript
export interface WorkSchedule {
  id: string
  user_id: string
  work_days: number[]    // [1,2,3,4,5] = Lun–Ven (ISO: 1=lundi)
  start_time: string     // "09:00"
  end_time: string       // "18:00"
  created_at: string
  updated_at: string
}

export interface ScheduleException {
  id: string
  user_id: string
  label: string | null
  start_date: string     // "2026-07-15" (ISO date)
  end_date: string       // "2026-08-05"
  created_at: string
}

export type WorkScheduleInput = Pick<WorkSchedule, 'work_days' | 'start_time' | 'end_time'>
export type ScheduleExceptionInput = Pick<ScheduleException, 'label' | 'start_date' | 'end_date'>
```

- [ ] **Step 2: Créer `services/schedule/work-schedule.service.ts`**

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkSchedule, ScheduleException, WorkScheduleInput, ScheduleExceptionInput } from '@/types/schedule'

// ============================================
// WORK SCHEDULE
// ============================================

/**
 * Retourne les heures de travail de l'utilisateur, ou null si non configurées.
 */
export async function getWorkSchedule(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkSchedule | null> {
  const { data, error } = await supabase
    .from('user_work_schedule')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[work-schedule] getWorkSchedule failed:', error.message)
    return null
  }

  return data
}

/**
 * Crée ou met à jour les heures de travail de l'utilisateur.
 */
export async function saveWorkSchedule(
  supabase: SupabaseClient,
  userId: string,
  input: WorkScheduleInput
): Promise<WorkSchedule | null> {
  const { data, error } = await supabase
    .from('user_work_schedule')
    .upsert(
      { user_id: userId, ...input, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    console.warn('[work-schedule] saveWorkSchedule failed:', error.message)
    return null
  }

  return data
}

/**
 * Supprime les heures de travail de l'utilisateur (désactivation).
 */
export async function deleteWorkSchedule(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('user_work_schedule')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.warn('[work-schedule] deleteWorkSchedule failed:', error.message)
  }
}

// ============================================
// SCHEDULE EXCEPTIONS
// ============================================

/**
 * Retourne les exceptions futures (end_date >= aujourd'hui), triées par date.
 */
export async function getScheduleExceptions(
  supabase: SupabaseClient,
  userId: string
): Promise<ScheduleException[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('schedule_exceptions')
    .select('*')
    .eq('user_id', userId)
    .gte('end_date', today)
    .order('start_date', { ascending: true })

  if (error) {
    console.warn('[work-schedule] getScheduleExceptions failed:', error.message)
    return []
  }

  return data || []
}

/**
 * Crée une nouvelle exception.
 */
export async function saveException(
  supabase: SupabaseClient,
  userId: string,
  input: ScheduleExceptionInput
): Promise<ScheduleException | null> {
  const { data, error } = await supabase
    .from('schedule_exceptions')
    .insert({ user_id: userId, ...input })
    .select()
    .single()

  if (error) {
    console.warn('[work-schedule] saveException failed:', error.message)
    return null
  }

  return data
}

/**
 * Supprime une exception par ID.
 */
export async function deleteException(
  supabase: SupabaseClient,
  userId: string,
  exceptionId: string
): Promise<void> {
  const { error } = await supabase
    .from('schedule_exceptions')
    .delete()
    .eq('id', exceptionId)
    .eq('user_id', userId)

  if (error) {
    console.warn('[work-schedule] deleteException failed:', error.message)
  }
}
```

- [ ] **Step 3: Créer le dossier si nécessaire**

```bash
mkdir -p /Users/sandrinelay/Projets/manae-v2/services/schedule
```

- [ ] **Step 4: Vérifier la compilation**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add types/schedule.ts services/schedule/work-schedule.service.ts
git commit -m "feat(schedule): add WorkSchedule types and work-schedule.service.ts"
```

---

## Chunk 2: Logique findAvailableSlots

### Task 3: Mettre à jour slots.service.ts

**Files:**
- Modify: `features/schedule/services/slots.service.ts`

**Contexte:** Ce fichier fait 1091 lignes. On ajoute deux filtres dans `findAvailableSlots` : filtrage des exceptions (bloque tout) et filtrage contextuel (work vs non-work).

- [ ] **Step 1: Lire la signature actuelle de `findAvailableSlots`**

```bash
grep -n "findAvailableSlots\|FindSlotsParams" /Users/sandrinelay/Projets/manae-v2/features/schedule/services/slots.service.ts | head -20
```

- [ ] **Step 2: Étendre le type `FindSlotsParams`**

Trouver la définition de `FindSlotsParams` dans le fichier et ajouter :

```typescript
// Dans FindSlotsParams, ajouter :
taskContext?: ItemContext          // Contexte de la tâche à planifier
workSchedule?: WorkSchedule | null // Heures de travail de l'utilisateur
scheduleExceptions?: ScheduleException[]  // Périodes d'exception
```

Ajouter les imports en haut du fichier :
```typescript
import type { ItemContext } from '@/types/items'
import type { WorkSchedule, ScheduleException } from '@/types/schedule'
```

- [ ] **Step 3: Ajouter la fonction de filtrage par exceptions**

Ajouter avant `findAvailableSlots` :

```typescript
/**
 * Retourne true si une date tombe dans une période d'exception.
 * Dans ce cas, aucun créneau ne doit être proposé ce jour-là.
 */
function isInException(date: Date, exceptions: ScheduleException[]): boolean {
  const dateStr = date.toISOString().split('T')[0]
  return exceptions.some(ex => dateStr >= ex.start_date && dateStr <= ex.end_date)
}
```

- [ ] **Step 4: Ajouter la fonction de filtrage contextuel**

```typescript
/**
 * Retourne true si un créneau (date + heure) est compatible avec
 * le contexte de la tâche et les heures de travail.
 *
 * Règles :
 * - Pas de work schedule configuré → toujours true (comportement actuel)
 * - Tâche 'work' → doit être dans les work_days + plage horaire
 * - Tâche non-'work' → doit être HORS plage de travail
 */
function isSlotCompatibleWithContext(
  slotDate: Date,
  slotStartTime: string,   // Format "HH:MM"
  taskContext: ItemContext | undefined,
  workSchedule: WorkSchedule | null | undefined
): boolean {
  if (!workSchedule || !taskContext) return true

  // Jour de la semaine (ISO: 1=lundi, 7=dimanche)
  const dayOfWeek = slotDate.getDay() === 0 ? 7 : slotDate.getDay()
  const isWorkDay = workSchedule.work_days.includes(dayOfWeek)

  // Heure du créneau (en minutes depuis minuit)
  const [slotH, slotM] = slotStartTime.split(':').map(Number)
  const slotMinutes = slotH * 60 + slotM

  // Plage de travail (en minutes)
  const [startH, startM] = workSchedule.start_time.split(':').map(Number)
  const [endH, endM] = workSchedule.end_time.split(':').map(Number)
  const workStartMinutes = startH * 60 + startM
  const workEndMinutes = endH * 60 + endM

  const isInWorkHours = isWorkDay && slotMinutes >= workStartMinutes && slotMinutes < workEndMinutes

  if (taskContext === 'work') {
    return isInWorkHours
  } else {
    return !isInWorkHours
  }
}
```

- [ ] **Step 5: Appliquer les filtres dans `findAvailableSlots`**

Dans la fonction `findAvailableSlots`, trouver où les slots sont générés/filtrés et ajouter les deux filtres.

Chercher le point où les slots sont construits (probablement dans la boucle sur les jours) et ajouter :

```typescript
// Filtre 1 : Exclure les jours en période d'exception
if (params.scheduleExceptions && isInException(slotDate, params.scheduleExceptions)) {
  continue  // Sauter ce jour entier
}

// Filtre 2 : Filtrage contextuel
if (!isSlotCompatibleWithContext(slotDate, slot.startTime, params.taskContext, params.workSchedule)) {
  continue  // Slot incompatible avec le contexte
}
```

**Important :** Lire attentivement la boucle existante pour identifier le bon endroit d'insertion. Les filtres doivent s'appliquer APRÈS les filtres de contraintes existants mais AVANT le scoring.

- [ ] **Step 6: Mettre à jour useScheduling.ts pour passer le contexte**

Lire `features/schedule/hooks/useScheduling.ts` et trouver l'appel à `findAvailableSlots`. Ajouter les nouveaux paramètres :

```typescript
// Dans loadSlots(), récupérer les données avant l'appel :
import { getWorkSchedule, getScheduleExceptions } from '@/services/schedule/work-schedule.service'

// Dans loadSlots() :
const [workSchedule, scheduleExceptions] = await Promise.all([
  getWorkSchedule(supabase, userId),
  getScheduleExceptions(supabase, userId),
])

// Dans l'appel à findAvailableSlots() :
const result = await findAvailableSlots({
  // ... params existants ...
  taskContext: item?.context,      // Contexte de l'item en cours de planification
  workSchedule,
  scheduleExceptions,
})
```

- [ ] **Step 7: Vérifier la compilation**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1
```

Expected: Build successful, pas d'erreurs TypeScript.

- [ ] **Step 8: Commit**

```bash
git add features/schedule/services/slots.service.ts features/schedule/hooks/useScheduling.ts
git commit -m "feat(schedule): add contextual slot filtering with work hours and exceptions"
```

---

## Chunk 3: UI Paramètres

### Task 4: WorkScheduleForm

**Files:**
- Create: `components/settings/WorkScheduleForm.tsx`

- [ ] **Step 1: Créer le dossier si nécessaire**

```bash
mkdir -p /Users/sandrinelay/Projets/manae-v2/components/settings
```

- [ ] **Step 2: Créer `components/settings/WorkScheduleForm.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { WorkSchedule, WorkScheduleInput } from '@/types/schedule'

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 7, label: 'Dim' },
]

interface WorkScheduleFormProps {
  initial?: WorkSchedule | null
  onSave: (input: WorkScheduleInput) => Promise<void>
  onDelete: () => Promise<void>
  isLoading?: boolean
}

export function WorkScheduleForm({ initial, onSave, onDelete, isLoading }: WorkScheduleFormProps) {
  const [workDays, setWorkDays] = useState<number[]>(initial?.work_days || [1, 2, 3, 4, 5])
  const [startTime, setStartTime] = useState(initial?.start_time || '09:00')
  const [endTime, setEndTime] = useState(initial?.end_time || '18:00')

  const toggleDay = (day: number) => {
    setWorkDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  const handleSave = async () => {
    if (workDays.length === 0) return
    await onSave({ work_days: workDays, start_time: startTime, end_time: endTime })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Vos tâches pro seront proposées sur ces créneaux, vos autres tâches en dehors.
      </p>

      {/* Sélection des jours */}
      <div>
        <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
          Jours de travail
        </label>
        <div className="flex gap-2 mt-2">
          {DAYS.map(day => (
            <button
              key={day.value}
              onClick={() => toggleDay(day.value)}
              className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                workDays.includes(day.value)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-muted'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plage horaire */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
            Début
          </label>
          <input
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
            Fin
          </label>
          <input
            type="time"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isLoading || workDays.length === 0}
          className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {isLoading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {initial && (
          <button
            onClick={onDelete}
            disabled={isLoading}
            className="px-4 py-2.5 text-red-500 border border-red-200 rounded-xl text-sm"
          >
            Désactiver
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/settings/WorkScheduleForm.tsx
git commit -m "feat(settings): add WorkScheduleForm component"
```

---

### Task 5: ExceptionsList

**Files:**
- Create: `components/settings/ExceptionsList.tsx`

- [ ] **Step 1: Créer `components/settings/ExceptionsList.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ScheduleException, ScheduleExceptionInput } from '@/types/schedule'

interface ExceptionsListProps {
  exceptions: ScheduleException[]
  onAdd: (input: ScheduleExceptionInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isLoading?: boolean
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function ExceptionsList({ exceptions, onAdd, onDelete, isLoading }: ExceptionsListProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleAdd = async () => {
    if (!startDate || !endDate) return
    await onAdd({ label: label || null, start_date: startDate, end_date: endDate })
    setLabel('')
    setStartDate('')
    setEndDate('')
    setIsAdding(false)
  }

  return (
    <div className="space-y-3">
      {/* Liste des exceptions */}
      {exceptions.length === 0 && !isAdding && (
        <p className="text-sm text-text-muted italic">Aucune période d'exception configurée.</p>
      )}

      {exceptions.map(ex => (
        <div key={ex.id} className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <p className="text-sm text-text-dark">{ex.label || 'Sans titre'}</p>
            <p className="text-xs text-text-muted">
              {formatDate(ex.start_date)} → {formatDate(ex.end_date)}
            </p>
          </div>
          <button
            onClick={() => onDelete(ex.id)}
            aria-label="Supprimer cette exception"
            className="p-1.5 text-red-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Formulaire d'ajout */}
      {isAdding ? (
        <div className="space-y-3 pt-2">
          <input
            type="text"
            placeholder="Label (ex: Vacances été)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted">Début</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-muted">Fin</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!startDate || !endDate || isLoading}
              className="flex-1 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Ajouter
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-text-muted border border-gray-200 rounded-xl text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 text-sm text-primary"
        >
          <Plus className="w-4 h-4" />
          Ajouter une période
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/settings/ExceptionsList.tsx
git commit -m "feat(settings): add ExceptionsList component"
```

---

### Task 6: Page Paramètres

**Files:**
- Create (ou Modify): `app/settings/page.tsx`

**Contexte:** Il n'existe pas encore de page `/settings`. On la crée. Les contraintes récurrentes existantes sont dans `app/onboarding/step2/page.tsx` — vérifier si elles sont déjà accessible ailleurs.

- [ ] **Step 1: Vérifier s'il existe déjà un lien vers les paramètres**

```bash
grep -rn "settings\|paramètres\|Paramètres" /Users/sandrinelay/Projets/manae-v2/app /Users/sandrinelay/Projets/manae-v2/components/layout --include="*.tsx" 2>/dev/null
```

- [ ] **Step 2: Créer `app/settings/page.tsx`**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkScheduleForm } from '@/components/settings/WorkScheduleForm'
import { ExceptionsList } from '@/components/settings/ExceptionsList'
import {
  getWorkSchedule,
  saveWorkSchedule,
  deleteWorkSchedule,
  getScheduleExceptions,
  saveException,
  deleteException,
} from '@/services/schedule/work-schedule.service'
import type { WorkSchedule, ScheduleException } from '@/types/schedule'

export default function SettingsPage() {
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(null)
  const [exceptions, setExceptions] = useState<ScheduleException[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [schedule, exs] = await Promise.all([
      getWorkSchedule(supabase, user.id),
      getScheduleExceptions(supabase, user.id),
    ])

    setWorkSchedule(schedule)
    setExceptions(exs)
    setIsLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSaveSchedule = async (input: Parameters<typeof saveWorkSchedule>[2]) => {
    setIsSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const saved = await saveWorkSchedule(supabase, user.id, input)
    setWorkSchedule(saved)
    setIsSaving(false)
  }

  const handleDeleteSchedule = async () => {
    setIsSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await deleteWorkSchedule(supabase, user.id)
    setWorkSchedule(null)
    setIsSaving(false)
  }

  const handleAddException = async (input: Parameters<typeof saveException>[2]) => {
    setIsSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const saved = await saveException(supabase, user.id, input)
    if (saved) setExceptions(prev => [...prev, saved].sort((a, b) => a.start_date.localeCompare(b.start_date)))
    setIsSaving(false)
  }

  const handleDeleteException = async (id: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await deleteException(supabase, user.id, id)
    setExceptions(prev => prev.filter(e => e.id !== id))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        <h1 className="typo-page-title">Paramètres</h1>

        {/* Section : Heures de travail */}
        <section>
          <h2 className="typo-section-title mb-4">Heures de travail</h2>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <WorkScheduleForm
              initial={workSchedule}
              onSave={handleSaveSchedule}
              onDelete={handleDeleteSchedule}
              isLoading={isSaving}
            />
          </div>
        </section>

        {/* Section : Périodes d'exception */}
        <section>
          <h2 className="typo-section-title mb-1">Périodes d'exception</h2>
          <p className="text-sm text-text-muted mb-4">
            Aucune tâche ne sera proposée pendant ces périodes (vacances, congés…).
          </p>
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <ExceptionsList
              exceptions={exceptions}
              onAdd={handleAddException}
              onDelete={handleDeleteException}
              isLoading={isSaving}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Ajouter un lien vers /settings dans le header ou menu**

Chercher où le bouton profil/settings est dans le header et ajouter un lien :

```typescript
import Link from 'next/link'
// ...
<Link href="/settings">Paramètres</Link>
```

- [ ] **Step 4: Build final complet**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run build 2>&1
```

Expected: Build successful.

- [ ] **Step 5: Test manuel**

1. Aller sur `/settings`
2. Configurer des heures de travail (ex: Lun–Ven 9h–18h)
3. Enregistrer → vérifier en DB Supabase
4. Ajouter une exception "Test vacances" du lendemain à J+7
5. Aller planifier une tâche pro → vérifier que les créneaux tombent dans 9h–18h
6. Aller planifier une tâche perso → vérifier que les créneaux tombent hors 9h–18h
7. Supprimer l'exception → vérifier la suppression en base

- [ ] **Step 6: Commit final**

```bash
git add app/settings/page.tsx components/layout/
git commit -m "feat(settings): add settings page with work schedule and exception management"
```
