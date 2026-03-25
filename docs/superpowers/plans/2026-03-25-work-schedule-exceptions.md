# Work Schedule & Exceptions — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre aux utilisateurs de configurer des plages horaires récurrentes (via les contraintes existantes) et des exceptions ponctuelles (congés, journées modifiées), et bloquer automatiquement les créneaux de planification en conséquence.

**Architecture:** On étend le modèle de contraintes existant via l'UX (pas de nouvelle table pour les plages récurrentes). On crée une table `schedule_exceptions` pour les exceptions ponctuelles (nature date-based vs recurring weekdays). La section `PreferencesSection` dans le profil est scindée : une `OrganisationSection` gère contraintes + exceptions, `PreferencesSection` garde uniquement l'énergie.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL + RLS), TypeScript strict, Tailwind CSS 4, Lucide React icons.

---

## Fichiers créés / modifiés

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `supabase/migrations/009_schedule_exceptions.sql` | Créer | Table schedule_exceptions + RLS |
| `types/index.ts` | Modifier | Ajouter type `ScheduleException` |
| `services/schedule-exceptions.service.ts` | Créer | CRUD exceptions Supabase |
| `components/ui/ExceptionCard.tsx` | Créer | Affichage d'une exception (label, dates, type) |
| `components/shared/ExceptionForm.tsx` | Créer | Formulaire création/édition exception |
| `components/shared/ExceptionsModal.tsx` | Créer | Liste + ajout + suppression exceptions |
| `components/profil/OrganisationSection.tsx` | Créer | Section profil : plages horaires + exceptions + quick setup |
| `components/profil/PreferencesSection.tsx` | Modifier | Retirer contraintes (ne garde que l'énergie) |
| `contexts/ProfileDataContext.tsx` | Modifier | Ajouter exceptions dans le contexte |
| `app/(main)/profil/page.tsx` | Modifier | Intégrer OrganisationSection + ExceptionsModal |
| `features/schedule/services/slots.service.ts` | Modifier | Bloquer créneaux selon exceptions |
| `features/schedule/hooks/useScheduling.ts` | Modifier | Fetch exceptions + passage à findAvailableSlots |

---

## Chunk 1 : Base de données, types et service

### Task 1 : Migration Supabase — table schedule_exceptions

**Files:**
- Create: `supabase/migrations/009_schedule_exceptions.sql`

- [ ] **Step 1 : Créer la migration**

```sql
-- supabase/migrations/009_schedule_exceptions.sql

CREATE TABLE schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('blocked', 'modified')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  modified_start_time TEXT,
  modified_end_time TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own exceptions"
  ON schedule_exceptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2 : Appliquer la migration en local**

```bash
npx supabase db push
```

Expected: `Applied 1 migration` sans erreur.

- [ ] **Step 3 : Commit**

```bash
git add supabase/migrations/009_schedule_exceptions.sql
git commit -m "feat(db): add schedule_exceptions table with RLS"
```

---

### Task 2 : Type TypeScript ScheduleException

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1 : Ajouter le type après l'interface `Constraint`**

Dans `types/index.ts`, après le bloc `CATEGORY_CONFIG`, ajouter :

```typescript
export type ScheduleExceptionType = 'blocked' | 'modified'

export interface ScheduleException {
  id: string
  user_id?: string
  label: string
  type: ScheduleExceptionType
  start_date: string  // "YYYY-MM-DD"
  end_date: string    // "YYYY-MM-DD"
  modified_start_time?: string | null  // "HH:mm" — uniquement si type === 'modified'
  modified_end_time?: string | null    // "HH:mm"
  created_at?: string
}
```

- [ ] **Step 2 : Vérifier que le build passe**

```bash
npm run build 2>&1 | head -30
```

Expected: pas d'erreur TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add types/index.ts
git commit -m "feat(types): add ScheduleException interface"
```

---

### Task 3 : Service schedule-exceptions.service.ts

**Files:**
- Create: `services/schedule-exceptions.service.ts`

- [ ] **Step 1 : Créer le service**

```typescript
// services/schedule-exceptions.service.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScheduleException } from '@/types'

export const scheduleExceptionsService = {
  async getExceptions(
    supabase: SupabaseClient,
    userId: string
  ): Promise<ScheduleException[]> {
    const { data, error } = await supabase
      .from('schedule_exceptions')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true })

    if (error) throw new Error(`Erreur chargement exceptions: ${error.message}`)
    return data ?? []
  },

  async createException(
    supabase: SupabaseClient,
    userId: string,
    exception: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>
  ): Promise<ScheduleException> {
    const { data, error } = await supabase
      .from('schedule_exceptions')
      .insert({ ...exception, user_id: userId })
      .select()
      .single()

    if (error) throw new Error(`Erreur création exception: ${error.message}`)
    return data
  },

  async deleteException(
    supabase: SupabaseClient,
    id: string
  ): Promise<void> {
    const { error } = await supabase
      .from('schedule_exceptions')
      .delete()
      .eq('id', id)

    if (error) throw new Error(`Erreur suppression exception: ${error.message}`)
  }
}
```

- [ ] **Step 2 : Vérifier types**

```bash
npm run build 2>&1 | head -30
```

Expected: pas d'erreur TypeScript.

- [ ] **Step 3 : Commit**

```bash
git add services/schedule-exceptions.service.ts
git commit -m "feat(service): add schedule-exceptions CRUD service"
```

---

## Chunk 2 : Composants UI

### Task 4 : ExceptionCard

**Files:**
- Create: `components/ui/ExceptionCard.tsx`

- [ ] **Step 1 : Créer le composant**

```tsx
// components/ui/ExceptionCard.tsx
'use client'

import { CalendarOffIcon, ClockIcon, TrashIcon } from '@/components/ui/icons'
import type { ScheduleException } from '@/types'

interface ExceptionCardProps {
  exception: ScheduleException
  onDelete: (id: string) => void
}

const TYPE_CONFIG = {
  blocked: {
    label: 'Bloqué',
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50',
    icon: CalendarOffIcon
  },
  modified: {
    label: 'Horaires réduits',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    icon: ClockIcon
  }
} as const

function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ExceptionCard({ exception, onDelete }: ExceptionCardProps) {
  const config = TYPE_CONFIG[exception.type]
  const Icon = config.icon
  const isSameDay = exception.start_date === exception.end_date

  const dateLabel = isSameDay
    ? formatDateFr(exception.start_date)
    : `${formatDateFr(exception.start_date)} → ${formatDateFr(exception.end_date)}`

  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[var(--color-border)]">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bgClass}`}>
        <Icon className={`w-4 h-4 ${config.colorClass}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-dark)] truncate">
          {exception.label}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{dateLabel}</p>
        {exception.type === 'modified' && exception.modified_start_time && (
          <p className="text-xs text-amber-600 mt-0.5">
            {exception.modified_start_time} – {exception.modified_end_time}
          </p>
        )}
      </div>

      <button
        onClick={() => onDelete(exception.id)}
        aria-label={`Supprimer l'exception ${exception.label}`}
        className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2 : Vérifier que les icônes CalendarOffIcon et ClockIcon existent**

```bash
grep -n "CalendarOffIcon\|ClockIcon" components/ui/icons/index.ts
```

Si absent, ajouter les exports manquants depuis Lucide dans `components/ui/icons/index.ts`.

- [ ] **Step 3 : Build check**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 4 : Commit**

```bash
git add components/ui/ExceptionCard.tsx
git commit -m "feat(ui): add ExceptionCard component"
```

---

### Task 5 : ExceptionForm

**Files:**
- Create: `components/shared/ExceptionForm.tsx`

- [ ] **Step 1 : Créer le formulaire**

```tsx
// components/shared/ExceptionForm.tsx
'use client'

import { useState } from 'react'
import { ActionButton } from '@/components/ui/ActionButton'
import type { ScheduleException, ScheduleExceptionType } from '@/types'

interface ExceptionFormProps {
  onSave: (data: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>) => void
  onCancel: () => void
}

export function ExceptionForm({ onSave, onCancel }: ExceptionFormProps) {
  const today = new Date().toISOString().split('T')[0]

  const [label, setLabel] = useState('')
  const [type, setType] = useState<ScheduleExceptionType>('blocked')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [modifiedStartTime, setModifiedStartTime] = useState('09:00')
  const [modifiedEndTime, setModifiedEndTime] = useState('13:00')

  const isValid =
    label.trim().length > 0 &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    endDate >= startDate &&
    (type === 'blocked' || (modifiedStartTime < modifiedEndTime))

  const handleSave = () => {
    if (!isValid) return

    onSave({
      label: label.trim(),
      type,
      start_date: startDate,
      end_date: endDate,
      modified_start_time: type === 'modified' ? modifiedStartTime : null,
      modified_end_time: type === 'modified' ? modifiedEndTime : null
    })
  }

  return (
    <div className="space-y-4">
      {/* Label */}
      <div>
        <label htmlFor="exception-label" className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
          Nom
        </label>
        <input
          id="exception-label"
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="ex : Vacances d'été, Congé maladie..."
          className="input-field w-full"
        />
      </div>

      {/* Type */}
      <div>
        <p className="text-sm font-medium text-[var(--color-text-dark)] mb-2">Type</p>
        <div className="flex gap-2">
          {([
            { value: 'blocked', label: 'Bloqué (rien planifier)' },
            { value: 'modified', label: 'Horaires réduits' }
          ] as const).map(option => (
            <button
              key={option.value}
              onClick={() => setType(option.value)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                type === option.value
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="exception-start" className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
            Du
          </label>
          <input
            id="exception-start"
            type="date"
            value={startDate}
            onChange={e => {
              setStartDate(e.target.value)
              if (e.target.value > endDate) setEndDate(e.target.value)
            }}
            className="input-field w-full"
          />
        </div>
        <div>
          <label htmlFor="exception-end" className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
            Au
          </label>
          <input
            id="exception-end"
            type="date"
            value={endDate}
            min={startDate}
            onChange={e => setEndDate(e.target.value)}
            className="input-field w-full"
          />
        </div>
      </div>

      {/* Horaires modifiés (uniquement si type === 'modified') */}
      {type === 'modified' && (
        <div>
          <p className="text-sm font-medium text-[var(--color-text-dark)] mb-2">Horaires réduits</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exception-modified-start" className="block text-xs text-[var(--color-text-muted)] mb-1">
                De
              </label>
              <input
                id="exception-modified-start"
                type="time"
                value={modifiedStartTime}
                onChange={e => setModifiedStartTime(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label htmlFor="exception-modified-end" className="block text-xs text-[var(--color-text-muted)] mb-1">
                À
              </label>
              <input
                id="exception-modified-end"
                type="time"
                value={modifiedEndTime}
                onChange={e => setModifiedEndTime(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <ActionButton
          label="Annuler"
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
        />
        <ActionButton
          label="Ajouter"
          variant="plan"
          onClick={handleSave}
          disabled={!isValid}
          className="flex-1"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2 : Build check**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 3 : Commit**

```bash
git add components/shared/ExceptionForm.tsx
git commit -m "feat(ui): add ExceptionForm component"
```

---

### Task 6 : ExceptionsModal

**Files:**
- Create: `components/shared/ExceptionsModal.tsx`

- [ ] **Step 1 : Créer la modale**

Suit le même pattern que `ConstraintsModal` (inline overlay + panel centré).

```tsx
// components/shared/ExceptionsModal.tsx
'use client'

import { useState } from 'react'
import { XIcon, PlusIcon } from '@/components/ui/icons'
import { ExceptionCard } from '@/components/ui/ExceptionCard'
import { ExceptionForm } from '@/components/shared/ExceptionForm'
import { ActionButton } from '@/components/ui/ActionButton'
import type { ScheduleException } from '@/types'

interface ExceptionsModalProps {
  exceptions: ScheduleException[]
  onClose: () => void
  onAdd: (data: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function ExceptionsModal({ exceptions, onClose, onAdd, onDelete }: ExceptionsModalProps) {
  const [showForm, setShowForm] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleAdd = async (data: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>) => {
    setIsSaving(true)
    try {
      await onAdd(data)
      setShowForm(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-lg mx-auto max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-semibold text-[var(--color-text-dark)]">Exceptions ponctuelles</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <XIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4 space-y-3">
          {showForm ? (
            <ExceptionForm
              onSave={handleAdd}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <>
              {exceptions.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
                  Aucune exception configurée
                </p>
              ) : (
                <div className="space-y-2">
                  {exceptions.map(ex => (
                    <ExceptionCard
                      key={ex.id}
                      exception={ex}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )}

              <ActionButton
                label="Ajouter une exception"
                icon={<PlusIcon className="w-4 h-4" />}
                variant="secondary"
                onClick={() => setShowForm(true)}
                disabled={isSaving}
                fullWidth
              />
            </>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2 : Build check**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 3 : Commit**

```bash
git add components/shared/ExceptionsModal.tsx
git commit -m "feat(ui): add ExceptionsModal component"
```

---

## Chunk 3 : Intégration Profil

### Task 7 : OrganisationSection (nouveau composant profil)

**Files:**
- Create: `components/profil/OrganisationSection.tsx`

Ce composant remplace la partie "Indisponibilités" de `PreferencesSection`. Il expose deux entrées : plages horaires récurrentes + exceptions ponctuelles, plus un bouton "quick setup" heures pro.

- [ ] **Step 1 : Créer le composant**

```tsx
// components/profil/OrganisationSection.tsx
'use client'

import { ChevronRightIcon, CalendarOffIcon, BriefcaseIcon, SparklesIcon } from '@/components/ui/icons'
import type { Constraint, ScheduleException } from '@/types'

interface OrganisationSectionProps {
  constraints: Constraint[]
  exceptions: ScheduleException[]
  onShowConstraintsModal: () => void
  onShowExceptionsModal: () => void
  onQuickSetupWorkHours: () => void
}

export function OrganisationSection({
  constraints,
  exceptions,
  onShowConstraintsModal,
  onShowExceptionsModal,
  onQuickSetupWorkHours
}: OrganisationSectionProps) {
  const constraintsSummary = constraints.length > 0
    ? `${constraints.length} plage${constraints.length > 1 ? 's' : ''} configurée${constraints.length > 1 ? 's' : ''}`
    : 'Non configuré'

  const exceptionsSummary = exceptions.length > 0
    ? `${exceptions.length} exception${exceptions.length > 1 ? 's' : ''}`
    : 'Aucune exception'

  const hasWorkConstraint = constraints.some(c => c.context === 'work')

  return (
    <section className="bg-white rounded-2xl overflow-hidden">
      <h2 className="px-4 pt-4 pb-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
        Mon organisation
      </h2>

      {/* Plages horaires récurrentes */}
      <button
        onClick={onShowConstraintsModal}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <CalendarOffIcon className="w-5 h-5 text-[var(--color-primary)]" />
          <div className="text-left">
            <p className="text-sm text-[var(--color-text-muted)]">Plages horaires</p>
            <p className="text-sm text-[var(--color-text-dark)]">{constraintsSummary}</p>
          </div>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
      </button>

      {/* Quick setup heures pro — affiché uniquement si pas encore configuré */}
      {!hasWorkConstraint && (
        <button
          onClick={onQuickSetupWorkHours}
          className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-gray-50 hover:bg-amber-50 transition-colors group"
        >
          <BriefcaseIcon className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-sm text-amber-600 font-medium group-hover:text-amber-700">
            Configurer mes heures pro
          </span>
          <SparklesIcon className="w-3.5 h-3.5 text-amber-400 ml-auto" />
        </button>
      )}

      {/* Exceptions ponctuelles */}
      <button
        onClick={onShowExceptionsModal}
        className="w-full flex items-center justify-between px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <BriefcaseIcon className="w-5 h-5 text-amber-500" />
          <div className="text-left">
            <p className="text-sm text-[var(--color-text-muted)]">Exceptions ponctuelles</p>
            <p className="text-sm text-[var(--color-text-dark)]">{exceptionsSummary}</p>
          </div>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
      </button>
    </section>
  )
}
```

- [ ] **Step 2 : Vérifier que SparklesIcon existe dans les icons**

```bash
grep -n "SparklesIcon" components/ui/icons/index.ts
```

Si absent, utiliser `ZapIcon` à la place (déjà importé dans le projet).

- [ ] **Step 3 : Build check**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 4 : Commit**

```bash
git add components/profil/OrganisationSection.tsx
git commit -m "feat(ui): add OrganisationSection with constraints + exceptions + quick setup"
```

---

### Task 8 : Modifier PreferencesSection — retirer les contraintes

**Files:**
- Modify: `components/profil/PreferencesSection.tsx`

- [ ] **Step 1 : Retirer tout ce qui concerne les contraintes**

Supprimer :
- Les props `constraints`, `onSaveConstraints`, `onShowConstraintsModal`
- L'entrée "Indisponibilités" dans le JSX
- L'import de `ConstraintsModal` et `CalendarOffIcon`
- Le state `showConstraintsModal`

Interface résultante :

```typescript
interface PreferencesSectionProps {
  energyMoments: string[]
  onSaveEnergyMoments: (moments: string[]) => Promise<void>
  externalModalControl?: boolean
  onShowEnergyModal?: () => void
}
```

La section ne contient plus que le bouton "Créneaux d'énergie".

- [ ] **Step 2 : Build check**

```bash
npm run build 2>&1 | head -30
```

Corriger les erreurs TypeScript si des callers passent encore les anciennes props.

- [ ] **Step 3 : Commit**

```bash
git add components/profil/PreferencesSection.tsx
git commit -m "refactor(ui): remove constraints from PreferencesSection (moved to OrganisationSection)"
```

---

### Task 9 : ProfileDataContext — ajouter les exceptions

**Files:**
- Modify: `contexts/ProfileDataContext.tsx`

- [ ] **Step 1 : Ajouter les exceptions dans le contexte**

Modifications :
1. Importer `scheduleExceptionsService` et `ScheduleException`
2. Ajouter `exceptions: ScheduleException[]` dans `ProfileDataContextType`
3. Ajouter `addException` et `deleteException` dans `ProfileDataContextType`
4. Ajouter state `exceptions` et le fetch dans `fetchData`

```typescript
// Ajout dans les imports
import { scheduleExceptionsService } from '@/services/schedule-exceptions.service'
import { createClient } from '@/lib/supabase/client'
import type { ScheduleException } from '@/types'

// Ajout dans ProfileDataContextType
exceptions: ScheduleException[]
addException: (data: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>) => Promise<void>
deleteException: (id: string) => Promise<void>

// Ajout dans le state du provider
const [exceptions, setExceptions] = useState<ScheduleException[]>([])

// Dans fetchData, ajouter au Promise.all :
const [userProfile, userConstraints, userExceptions] = await Promise.all([
  getOrCreateUserProfile(),
  getConstraints(),
  scheduleExceptionsService.getExceptions(supabase, user.id)
])
setExceptions(userExceptions)

// Nouveaux callbacks
const addException = useCallback(async (data: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>) => {
  const supabase = createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) throw new Error('Non authentifié')
  const newException = await scheduleExceptionsService.createException(supabase, currentUser.id, data)
  setExceptions(prev => [...prev, newException].sort((a, b) => a.start_date.localeCompare(b.start_date)))
}, [])

const deleteException = useCallback(async (id: string) => {
  const supabase = createClient()
  await scheduleExceptionsService.deleteException(supabase, id)
  setExceptions(prev => prev.filter(e => e.id !== id))
}, [])
```

- [ ] **Step 2 : Build check**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 3 : Commit**

```bash
git add contexts/ProfileDataContext.tsx
git commit -m "feat(context): add exceptions to ProfileDataContext"
```

---

### Task 10 : Mettre à jour profil/page.tsx

**Files:**
- Modify: `app/(main)/profil/page.tsx`

- [ ] **Step 1 : Intégrer OrganisationSection + ExceptionsModal**

Changements :
1. Importer `OrganisationSection` et `ExceptionsModal`
2. Récupérer `exceptions`, `addException`, `deleteException` depuis `useProfileData()`
3. Ajouter state `showExceptionsModal`
4. Remplacer `PreferencesSection` : retirer les props constraints/onShowConstraintsModal
5. Ajouter `OrganisationSection` après `PreferencesSection`
6. Ajouter handler `handleQuickSetupWorkHours` qui ouvre `ConstraintsModal` avec un formulaire pré-rempli
7. Ajouter `ExceptionsModal` dans le bloc des modales

```tsx
// Nouveaux imports
import { OrganisationSection } from '@/components/profil/OrganisationSection'
import { ExceptionsModal } from '@/components/shared/ExceptionsModal'

// Depuis useProfileData()
const { ..., exceptions, addException, deleteException } = useProfileData()

// Nouveau state
const [showExceptionsModal, setShowExceptionsModal] = useState(false)

// Handler quick setup : ouvre ConstraintsModal avec formulaire pré-ouvert
// (passer une prop optionnelle showFormOnOpen à ConstraintsModal)
const handleQuickSetupWorkHours = useCallback(() => {
  setShowConstraintsModal(true)
}, [])

// Dans le JSX, après PreferencesSection (sans les props constraints) :
<PreferencesSection
  energyMoments={profile?.energyMoments || []}
  onSaveEnergyMoments={updateEnergyMoments}
  externalModalControl={true}
  onShowEnergyModal={() => setShowEnergyModal(true)}
/>

<OrganisationSection
  constraints={constraints}
  exceptions={exceptions}
  onShowConstraintsModal={() => setShowConstraintsModal(true)}
  onShowExceptionsModal={() => setShowExceptionsModal(true)}
  onQuickSetupWorkHours={handleQuickSetupWorkHours}
/>

// Dans le bloc modales :
{showExceptionsModal && (
  <ExceptionsModal
    exceptions={exceptions}
    onClose={() => setShowExceptionsModal(false)}
    onAdd={addException}
    onDelete={deleteException}
  />
)}
```

- [ ] **Step 2 : Quick setup — pré-remplir ConstraintForm**

Pour que le bouton "Configurer mes heures pro" ouvre directement le formulaire pré-rempli, ajouter une prop `initialFormData` à `ConstraintsModal` :

Dans `ConstraintsModal.tsx`, ajouter :
```typescript
interface ConstraintsModalProps {
  constraints: Constraint[]
  onClose: () => void
  onSave: (constraints: Constraint[]) => Promise<void>
  initialFormData?: Partial<Omit<Constraint, 'id'>>  // Nouveau
}
```

Et dans le composant :
```typescript
const [showForm, setShowForm] = useState(!!initialFormData)
const [editingConstraint, setEditingConstraint] = useState<Constraint | undefined>(
  initialFormData ? ({ ...initialFormData } as Constraint) : undefined
)
```

Passer le `initialFormData` depuis profil/page.tsx :
```tsx
const [constraintsInitialForm, setConstraintsInitialForm] = useState<Partial<Omit<Constraint, 'id'>> | undefined>()

const handleQuickSetupWorkHours = useCallback(() => {
  setConstraintsInitialForm({
    name: 'Heures de travail',
    category: 'work',
    context: 'work',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    start_time: '09:00',
    end_time: '18:00',
    allow_lunch_break: true
  })
  setShowConstraintsModal(true)
}, [])

// Et réinitialiser après fermeture :
onClose={() => {
  setShowConstraintsModal(false)
  setConstraintsInitialForm(undefined)
}}

// Passage à la modale :
<ConstraintsModal
  constraints={constraints}
  onClose={() => { setShowConstraintsModal(false); setConstraintsInitialForm(undefined) }}
  onSave={updateConstraints}
  initialFormData={constraintsInitialForm}
/>
```

- [ ] **Step 3 : Build check**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 4 : Commit**

```bash
git add app/(main)/profil/page.tsx components/shared/ConstraintsModal.tsx
git commit -m "feat(profil): add OrganisationSection with exceptions modal and work hours quick setup"
```

---

## Chunk 4 : Intégration planification

### Task 11 : slots.service.ts — bloquer créneaux selon exceptions

**Files:**
- Modify: `features/schedule/services/slots.service.ts`

- [ ] **Step 1 : Ajouter `exceptions` dans `FindSlotsParams`**

Dans l'interface `FindSlotsParams` (ligne ~747), ajouter :

```typescript
exceptions?: ScheduleException[]
```

Et ajouter l'import en haut du fichier :

```typescript
import type { ScheduleException } from '@/types'
```

- [ ] **Step 2 : Ajouter la fonction de filtrage par exception**

Ajouter cette fonction **avant** `findAvailableSlots` :

```typescript
/**
 * Retourne l'exception active pour une date donnée, si elle existe
 */
function getActiveException(
  exceptions: ScheduleException[],
  date: Date
): ScheduleException | null {
  const dateStr = formatDate(date)
  return exceptions.find(ex => ex.start_date <= dateStr && ex.end_date >= dateStr) ?? null
}
```

- [ ] **Step 3 : Utiliser les exceptions dans la boucle principale**

Dans `findAvailableSlots`, après la destructuration des params, ajouter :

```typescript
const exceptions = params.exceptions ?? []
```

Dans la boucle `while (currentDate <= endDate)`, juste après `const dateStr = formatDate(currentDate)`, ajouter :

```typescript
// Vérifier si ce jour est couvert par une exception
const activeException = getActiveException(exceptions, currentDate)

if (activeException?.type === 'blocked') {
  // Jour entièrement bloqué — passer au suivant
  currentDate.setDate(currentDate.getDate() + 1)
  continue
}

// Pour les exceptions "modified" : réduire les bornes du jour
const effectiveDayBounds: DayBounds = activeException?.type === 'modified' && activeException.modified_start_time && activeException.modified_end_time
  ? { start: activeException.modified_start_time, end: activeException.modified_end_time }
  : dayBounds
```

Remplacer ensuite toutes les occurrences de `dayBounds` dans la boucle par `effectiveDayBounds`.

Il n'y a qu'une seule utilisation directe de `dayBounds` dans la boucle (ligne `findFreeBlocks(allBusyBlocks, dayBounds)`). La changer en `findFreeBlocks(allBusyBlocks, effectiveDayBounds)`.

- [ ] **Step 4 : Build check**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 5 : Commit**

```bash
git add features/schedule/services/slots.service.ts
git commit -m "feat(schedule): block slots on exceptions (blocked=skip day, modified=reduce bounds)"
```

---

### Task 12 : useScheduling.ts — fetch exceptions + passage à slots service

**Files:**
- Modify: `features/schedule/hooks/useScheduling.ts`

- [ ] **Step 1 : Importer le service et le type**

En haut du fichier, ajouter :

```typescript
import { scheduleExceptionsService } from '@/services/schedule-exceptions.service'
import { createClient } from '@/lib/supabase/client'
```

- [ ] **Step 2 : Fetch des exceptions**

Dans la fonction `loadSlots` (autour de la ligne 168, là où `getConstraints()` est appelé), ajouter le fetch d'exceptions en parallèle :

```typescript
// 2. Récupérer les contraintes horaires ET les exceptions
const supabase = createClient()
const { data: { user: currentUser } } = await supabase.auth.getUser()

const [constraints, exceptions] = await Promise.all([
  getConstraints(),
  currentUser
    ? scheduleExceptionsService.getExceptions(supabase, currentUser.id)
    : Promise.resolve([])
])
```

- [ ] **Step 3 : Passer les exceptions à findAvailableSlots**

Dans l'appel `findAvailableSlots` (ligne ~201), ajouter le paramètre :

```typescript
const result = await findAvailableSlots({
  // ... params existants
  exceptions,
  taskContext
})
```

- [ ] **Step 4 : Build check**

```bash
npm run build 2>&1 | head -30
```

- [ ] **Step 5 : Test manuel**

1. Aller dans Profil → Mon organisation → Exceptions
2. Ajouter une exception "bloquée" pour aujourd'hui
3. Aller dans Clarté → planifier une tâche
4. Vérifier qu'aucun créneau n'est proposé pour aujourd'hui

- [ ] **Step 6 : Commit**

```bash
git add features/schedule/hooks/useScheduling.ts
git commit -m "feat(schedule): fetch and pass schedule exceptions to findAvailableSlots"
```

---

## Vérification finale

- [ ] `npm run build` — zéro erreur TypeScript
- [ ] `npm run lint` — zéro warning
- [ ] Test manuel profil : section "Mon organisation" visible, les deux entrées fonctionnent
- [ ] Test quick setup : bouton "Configurer mes heures pro" ouvre le formulaire pré-rempli lun-ven 9h-18h
- [ ] Test exception bloquée : créneaux supprimés sur la période
- [ ] Test exception modifiée : créneaux limités aux horaires réduits
- [ ] Test contrainte `context: work` : toujours respectée pour les tâches non-pro
