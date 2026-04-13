# Planification contextuelle — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Associer un contexte à chaque contrainte horaire pour que les tâches pro soient planifiées sur les heures pro, et les tâches famille/perso soient planifiées hors des heures pro.

**Architecture:** Ajout d'une colonne `context` sur la table `user_constraints` (default `'any'`). Le type `Constraint` est mis à jour dans les deux fichiers qui le définissent. `FindSlotsParams` reçoit un `taskContext` optionnel. Dans `findAvailableSlots`, les contraintes dédiées à un autre contexte que la tâche sont exclues des blocs "busy". L'UI `ConstraintForm` expose ce champ via des pills.

**Tech Stack:** Supabase SQL migration, TypeScript, React

---

## Fichiers modifiés

| Fichier | Action |
|--------|--------|
| `supabase/migrations/YYYYMMDD_add_context_to_constraints.sql` | Créer |
| `types/index.ts` | Modifier ligne 24–33 |
| `services/supabaseService.ts` | Modifier ligne 16–26 |
| `features/schedule/services/slots.service.ts` | Modifier lignes 708–721 + 784–787 |
| `features/schedule/hooks/useScheduling.ts` | Modifier lignes 26–35 + 199–215 |
| `components/ui/ConstraintForm.tsx` | Modifier |
| `components/ui/ConstraintCard.tsx` | Modifier |

---

## Task 1 : Migration Supabase

**Files:**
- Create: `supabase/migrations/20260319000000_add_context_to_constraints.sql`

- [ ] **Step 1 : Créer le fichier de migration**

```sql
-- Ajouter le champ context aux contraintes utilisateur
-- 'any' = bloque toutes les tâches (comportement actuel, rétrocompatible)
ALTER TABLE user_constraints
ADD COLUMN IF NOT EXISTS context TEXT NOT NULL DEFAULT 'any';
```

> Note : si la table s'appelle `constraints` (pas `user_constraints`), adapter le nom. Vérifier dans Supabase Studio → Table Editor.

- [ ] **Step 2 : Appliquer la migration**

```bash
npx supabase db push
# ou via Supabase Studio : SQL Editor → coller et exécuter la migration
```

Vérifier que la colonne apparaît dans la table avec `DEFAULT 'any'`.

- [ ] **Step 3 : Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add context column to constraints table"
```

---

## Task 2 : Types TypeScript

**Files:**
- Modify: `types/index.ts:24-33`
- Modify: `services/supabaseService.ts:16-26`

**Contexte :** `Constraint` est défini dans deux endroits. Les deux doivent être mis à jour.

- [ ] **Step 1 : Mettre à jour `types/index.ts`**

Remplacer l'interface `Constraint` (lignes 24–33) par :

```typescript
export interface Constraint {
    id: string;
    user_id?: string;
    name: string;
    category: 'work' | 'school' | 'home' | 'sport' | 'social' | 'other';
    context: ItemContext | 'any';  // 'any' = bloque toutes les tâches
    days: string[];
    start_time: string;
    end_time: string;
    allow_lunch_break: boolean | null;
    created_at?: string;
}
```

`ItemContext` est déjà exporté via `export * from './items'` — pas besoin d'import supplémentaire.

- [ ] **Step 2 : Mettre à jour `services/supabaseService.ts`**

Remplacer l'interface `Constraint` (lignes 16–26) par :

```typescript
export interface Constraint {
    id: string
    user_id: string
    name: string
    category: 'work' | 'school' | 'home' | 'sport' | 'social' | 'other'
    context: string  // 'any' | ItemContext — on garde string ici pour simplicité
    days: string[]
    start_time: string
    end_time: string
    allow_lunch_break: boolean | null
    created_at: string
}
```

- [ ] **Step 3 : Vérifier que TypeScript compile**

```bash
npx tsc --noEmit 2>&1 | grep -E "types/index|supabaseService|Constraint"
```

Attendu : aucune erreur sur ces fichiers.

- [ ] **Step 4 : Commit**

```bash
git add types/index.ts services/supabaseService.ts
git commit -m "feat(types): add context field to Constraint interface"
```

---

## Task 3 : Logique de planification — slots.service.ts

**Files:**
- Modify: `features/schedule/services/slots.service.ts:708-721` (interface `FindSlotsParams`)
- Modify: `features/schedule/services/slots.service.ts:784-787` (filtrage contraintes)

- [ ] **Step 1 : Ajouter `taskContext` à `FindSlotsParams` (ligne ~720)**

Ajouter après `ignoreServiceConstraints` :

```typescript
export interface FindSlotsParams {
  durationMinutes: number
  constraints: Constraint[]
  calendarEvents: GoogleCalendarEvent[]
  startDate: Date
  endDate: Date
  energyMoments?: string[]
  mood?: string
  cognitiveLoad?: CognitiveLoad
  dayBounds?: DayBounds
  temporalConstraint?: TemporalConstraint | null
  taskContent?: string
  ignoreServiceConstraints?: boolean
  taskContext?: string  // Contexte de la tâche à planifier (ItemContext | undefined)
}
```

- [ ] **Step 2 : Extraire `taskContext` dans le corps de `findAvailableSlots` (ligne ~743)**

Dans le bloc de destructuring (autour des lignes 743–756), ajouter `taskContext = undefined` :

```typescript
const {
    durationMinutes,
    constraints,
    calendarEvents,
    startDate,
    endDate,
    energyMoments = [],
    mood = 'calm',
    cognitiveLoad = 'medium',
    dayBounds = DEFAULT_DAY_BOUNDS,
    temporalConstraint = null,
    taskContent = '',
    ignoreServiceConstraints = false,
    taskContext = undefined   // ← nouveau
  } = params
```

- [ ] **Step 3 : Filtrer les contraintes selon le contexte de la tâche (ligne ~784)**

Remplacer :

```typescript
    const dayConstraints = hasExplicitTimeConstraint
      ? []
      : getConstraintsForDay(constraints, currentDate)
    const constraintBlocks = constraintsToBlocks(dayConstraints)
```

Par :

```typescript
    const rawDayConstraints = hasExplicitTimeConstraint
      ? []
      : getConstraintsForDay(constraints, currentDate)

    // Filtrage contextuel :
    // - contrainte 'any' → bloque toujours (comportement actuel)
    // - contrainte dédiée au même contexte que la tâche → ne bloque pas (c'est le bon moment)
    // - contrainte dédiée à un autre contexte → bloque
    const dayConstraints = taskContext
      ? rawDayConstraints.filter(c =>
          !c.context || c.context === 'any' || c.context !== taskContext
        )
      : rawDayConstraints

    const constraintBlocks = constraintsToBlocks(dayConstraints)
```

- [ ] **Step 4 : Vérifier que TypeScript compile**

```bash
npx tsc --noEmit 2>&1 | grep "slots.service"
```

Attendu : aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add features/schedule/services/slots.service.ts
git commit -m "feat(schedule): filter constraints by task context in findAvailableSlots"
```

---

## Task 4 : Hook useScheduling — passer taskContext

**Files:**
- Modify: `features/schedule/hooks/useScheduling.ts:26-35` (interface `UseSchedulingParams`)
- Modify: `features/schedule/hooks/useScheduling.ts:199-215` (appel `findAvailableSlots`)

- [ ] **Step 1 : Ajouter `taskContext` à `UseSchedulingParams` (lignes 26–35)**

```typescript
export interface UseSchedulingParams {
  itemId: string
  taskContent: string
  mood?: Mood
  temporalConstraint?: TemporalConstraint | null
  skipItemUpdate?: boolean
  currentGoogleEventId?: string | null
  taskContext?: string  // Contexte de la tâche (ex: 'work', 'family', 'personal')
}
```

- [ ] **Step 2 : Extraire `taskContext` dans le corps du hook (ligne 71)**

```typescript
const { itemId, taskContent, mood, temporalConstraint, skipItemUpdate = false, currentGoogleEventId, taskContext } = params
```

- [ ] **Step 3 : Passer `taskContext` à `findAvailableSlots` (ligne ~199)**

Dans l'appel à `findAvailableSlots`, ajouter `taskContext` :

```typescript
      const result = await findAvailableSlots({
        durationMinutes: estimatedDuration,
        constraints,
        calendarEvents,
        startDate,
        endDate,
        energyMoments,
        mood: mood || 'neutral',
        cognitiveLoad: taskAnalysis.cognitiveLoad,
        temporalConstraint: (targetDate && !(temporalConstraint?.type === 'fixed_date' && temporalConstraint.date?.includes('T') && /\b([0-1]?\d|2[0-3])[h:]\d{0,2}\b/i.test(taskContent))) ? null : temporalConstraint,
        taskContent,
        ignoreServiceConstraints: forceIgnoreService,
        taskContext  // ← nouveau
      })
```

- [ ] **Step 4 : Vérifier que TypeScript compile**

```bash
npx tsc --noEmit 2>&1 | grep "useScheduling"
```

Attendu : aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add features/schedule/hooks/useScheduling.ts
git commit -m "feat(schedule): pass taskContext to findAvailableSlots from useScheduling"
```

---

## Task 5 : ConstraintForm — sélecteur de contexte

**Files:**
- Modify: `components/ui/ConstraintForm.tsx`

- [ ] **Step 1 : Ajouter la config des contextes en haut du fichier**

Après les imports existants, ajouter :

```typescript
import type { ItemContext } from '@/types'

const CONTEXT_OPTIONS: Array<{ value: ItemContext | 'any'; label: string }> = [
    { value: 'any',      label: 'Toutes les tâches' },
    { value: 'work',     label: 'Pro' },
    { value: 'family',   label: 'Famille' },
    { value: 'personal', label: 'Personnel' },
    { value: 'health',   label: 'Santé' },
    { value: 'admin',    label: 'Admin' },
    { value: 'home',     label: 'Maison' },
]
```

- [ ] **Step 2 : Ajouter `context` au state `formData`**

Dans `useState` (ligne ~50), ajouter :

```typescript
    const [formData, setFormData] = useState({
        name: constraint?.name || '',
        category: constraint?.category || 'other' as Constraint['category'],
        context: (constraint?.context || 'any') as ItemContext | 'any',
        days: constraint?.days || [],
        start_time: constraint?.start_time || '09:00',
        end_time: constraint?.end_time || '18:00',
        allow_lunch_break: constraint?.allow_lunch_break || false
    });
```

- [ ] **Step 3 : Ajouter la section sélecteur dans le JSX**

Ajouter après la section "ICÔNE" et avant la section "JOURS DE LA SEMAINE" :

```tsx
                {/* Contexte dédié */}
                <div>
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                        CETTE PLAGE EST DÉDIÉE À
                    </label>
                    <div className="flex gap-2 flex-wrap">
                        {CONTEXT_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, context: opt.value }))}
                                className={`
                                    px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all
                                    ${formData.context === opt.value
                                        ? 'border-primary bg-mint text-primary'
                                        : 'border-border text-text-dark hover:border-primary'
                                    }
                                `}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
```

- [ ] **Step 4 : Vérifier que le formulaire compile et s'affiche**

```bash
npx tsc --noEmit 2>&1 | grep "ConstraintForm"
```

Attendu : aucune erreur.

- [ ] **Step 5 : Commit**

```bash
git add components/ui/ConstraintForm.tsx
git commit -m "feat(ui): add context selector to ConstraintForm"
```

---

## Task 6 : ConstraintCard — affichage du contexte

**Files:**
- Modify: `components/ui/ConstraintCard.tsx`

- [ ] **Step 1 : Ajouter les labels de contexte**

En haut du fichier (après les imports), ajouter :

```typescript
const CONTEXT_LABELS: Record<string, string> = {
    work:     'Pro uniquement',
    family:   'Famille uniquement',
    personal: 'Personnel uniquement',
    health:   'Santé uniquement',
    admin:    'Admin uniquement',
    home:     'Maison uniquement',
}
```

- [ ] **Step 2 : Afficher le label dans la card**

Après la section "Pause déjeuner" (ligne ~87), ajouter :

```tsx
            {/* Contexte dédié — affiché seulement si différent de 'any' */}
            {constraint.context && constraint.context !== 'any' && (
                <div className="flex items-center gap-2 text-sm text-primary mt-1">
                    <span className="text-xs font-medium">
                        {CONTEXT_LABELS[constraint.context] ?? constraint.context}
                    </span>
                </div>
            )}
```

- [ ] **Step 3 : Vérifier que TypeScript compile**

```bash
npx tsc --noEmit 2>&1 | grep "ConstraintCard"
```

Attendu : aucune erreur.

- [ ] **Step 4 : Commit**

```bash
git add components/ui/ConstraintCard.tsx
git commit -m "feat(ui): show context label in ConstraintCard"
```

---

## Task 7 : Vérification manuelle

- [ ] **Step 1 : Démarrer le serveur de dev**

```bash
npm run dev
```

- [ ] **Step 2 : Tester le formulaire de contrainte**

1. Aller dans Profil → Préférences → Indisponibilités
2. Créer une nouvelle contrainte "Travail" avec horaires lun-ven 9h-18h
3. Sélectionner "Pro" dans le sélecteur de contexte
4. Sauvegarder → la card affiche "Pro uniquement"

- [ ] **Step 3 : Tester la planification d'une tâche pro**

1. Capturer une tâche pro : "Appeler le client Dupont"
2. Lancer la planification (bouton Planifier)
3. Vérifier que des créneaux apparaissent dans la plage 9h-18h lun-ven
   (alors qu'avant ces heures étaient bloquées par la contrainte "Travail")

- [ ] **Step 4 : Tester la planification d'une tâche famille**

1. Capturer une tâche famille : "Aller chercher les enfants"
2. Lancer la planification
3. Vérifier que les créneaux 9h-18h lun-ven sont bien bloqués (la contrainte "Travail" s'applique)

- [ ] **Step 5 : Vérifier les contraintes existantes**

Les contraintes existantes (sans contexte) doivent se comporter exactement comme avant : elles bloquent toutes les tâches. Tester une planification avec une contrainte sans contexte et vérifier que rien n'a changé.

- [ ] **Step 6 : Commit final**

```bash
git add -A
git commit -m "feat(schedule): contextual planning — constraints now respect task context"
```
