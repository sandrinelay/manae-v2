# 04 - Composants UI

> Documentation des composants React et patterns UI

---

## 1. Architecture Composants

### 1.1 Pattern Block/FullView/Modal (Clarté)

Chaque type d'item suit ce pattern à 3 niveaux :

```
┌──────────────────────────────────────────────────────────────┐
│                          BLOCK                                │
│  - Affiche 4-6 items max                                     │
│  - Bouton "Voir tout" si plus d'items                        │
│  - Clic sur "Voir tout" → ouvre FullView                     │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                        FULL VIEW                              │
│  - Tabs pour filtrer (actives/terminées/archivées)          │
│  - Scroll infini ou pagination                               │
│  - SearchBar en header                                        │
│  - Clic sur item → ouvre Modal                               │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                          MODAL                                │
│  - Affiche détail complet                                    │
│  - Actions (Archiver, Planifier, Développer...)             │
│  - Fermeture → retour FullView                               │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Implémentation par Type

| Type | Block | FullView | Modal |
|------|-------|----------|-------|
| **Tasks** | `TasksBlock` | `TasksFullView` | `TaskActiveModal`, `TaskDetailModal`, `PlanTaskModal` |
| **Notes** | `NotesBlock` | `NotesFullView` | `NoteDetailModal`, `NoteArchivedModal` |
| **Ideas** | `IdeasBlock` | `IdeasFullView` | `IdeaDetailModal`, `IdeaDevelopModal` |
| **Shopping** | `ShoppingBlock` | `ShoppingFullView` | `ShoppingItemModal`, `PlanShoppingModal` |

---

## 2. Composants UI Réutilisables (`/components/ui`)

### 2.1 Boutons

#### `Button.tsx`

**Usage** :
```tsx
<Button variant="primary" size="lg" onClick={handleClick}>
  Enregistrer
</Button>
```

**Props** :
- `variant`: `'primary'` | `'secondary'` | `'outline'` | `'danger'`
- `size`: `'sm'` | `'md'` | `'lg'`
- `disabled`: boolean
- `loading`: boolean (affiche spinner)
- `className`: string (override)

**Variantes CSS** :
- `primary`: bg-primary, text-white
- `secondary`: bg-secondary, text-dark
- `outline`: border-primary, text-primary
- `danger`: bg-red-500, text-white

---

#### `ActionButton.tsx`

**Usage** : Boutons CTA avec états de chargement.

```tsx
<ActionButton
  label="Planifier"
  variant="primary"
  onClick={handlePlan}
  isLoading={isPlanning}
/>
```

**Props** :
- `label`: string
- `variant`: `'primary'` | `'secondary'` | `'delete'` | `'outline'`
- `onClick`: fonction
- `isLoading`: boolean
- `disabled`: boolean

---

#### `IconButton.tsx`

**Usage** : Boutons icon-only avec label accessible.

```tsx
<IconButton
  icon={<EditIcon />}
  label="Modifier"
  variant="teal"
  size="sm"
  onClick={onEdit}
/>
```

**Props** :
- `icon`: ReactNode (Lucide icon)
- `label`: string (aria-label)
- `variant`: `'teal'` | `'danger'` | `'gray'`
- `size`: `'sm'` | `'md'`

---

### 2.2 Inputs

#### `Input.tsx`

```tsx
<Input
  type="text"
  placeholder="Prénom"
  value={firstName}
  onChange={setFirstName}
  error={errors.firstName}
/>
```

**Props** :
- `type`: `'text'` | `'email'` | `'password'`
- `value`: string
- `onChange`: (value: string) => void
- `placeholder`: string
- `error`: string | null
- `disabled`: boolean

**Styles** :
- Border primary on focus
- Red border si `error` présent
- Message erreur affiché en dessous

---

### 2.3 Filtres & Navigation

#### `FilterTabs.tsx`

**Usage** : Tabs horizontaux pour filtrer (Tout / Tâches / Notes / Idées / Courses).

```tsx
<FilterTabs
  filters={FILTER_CONFIG}
  activeFilter={activeFilter}
  onFilterChange={setActiveFilter}
  counts={{ tasks: 5, notes: 3, ideas: 2, shopping: 10 }}
/>
```

**Props** :
- `filters`: `FilterConfig[]` (config des filtres avec icônes)
- `activeFilter`: string (id du filtre actif)
- `onFilterChange`: (filterId: string) => void
- `counts`: objet avec counts par type

---

#### `ContextFilterTabs.tsx`

**Usage** : Filtres par contexte (Personnel / Famille / Travail / Santé / Autre).

```tsx
<ContextFilterTabs
  activeContext={context}
  onContextChange={setContext}
/>
```

**Affiche** : Icônes + labels depuis `CONTEXT_CONFIG`.

---

### 2.4 Modales

#### Pattern Modale Standard

**Structure** :
```tsx
{isOpen && createPortal(
  <>
    {/* Backdrop */}
    <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

    {/* Modal */}
    <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-lg mx-auto">
      {/* Header */}
      <div className="p-4 border-b">
        <h2>Titre</h2>
        <button onClick={onClose}>×</button>
      </div>

      {/* Content */}
      <div className="p-6">
        ...
      </div>

      {/* Actions */}
      <div className="p-4 border-t flex gap-3">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={onConfirm}>Confirmer</Button>
      </div>
    </div>
  </>,
  document.body
)}
```

**Règles** :
- Utiliser `createPortal` pour rendre au top-level du DOM
- Utiliser `useSyncExternalStore` pour éviter hydration mismatch
- Backdrop cliquable pour fermer
- `stopPropagation` sur modal pour éviter fermeture involontaire

---

#### `DeleteConfirmModal.tsx`

**Usage** : Confirmation avant suppression.

```tsx
<DeleteConfirmModal
  itemName="Judo Milo"
  onCancel={onClose}
  onConfirm={handleDelete}
/>
```

**Affiche** :
- Message de confirmation
- Warning "Cette action est irréversible"
- Boutons Annuler / Supprimer

---

#### `ConflictModal.tsx`

**Usage** : Alerte chevauchement indisponibilités.

```tsx
<ConflictModal
  conflict={{
    constraint1: { name: "Multisports Léa", ... },
    constraint2: { name: "Judo Milo", ... },
    overlappingDays: ['monday', 'wednesday']
  }}
  onCancel={onClose}
  onConfirm={onConfirm}
/>
```

**Features** :
- Traduction jours en français
- Affichage heures chevauchement
- Message explicatif

---

### 2.5 Cards

#### `ConstraintCard.tsx`

**Usage** : Affiche une indisponibilité récurrente.

```tsx
<ConstraintCard
  constraint={{
    name: "Travail",
    category: "work",
    days: ['monday', 'tuesday', 'wednesday'],
    start_time: "09:00",
    end_time: "18:00",
    allow_lunch_break: true
  }}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

**Affiche** :
- Icône catégorie
- Nom
- Jours (lun, mar, mer...)
- Horaires
- Pause déjeuner si applicable
- Boutons Edit / Delete

---

#### `EnergyCard.tsx`

**Usage** : Sélection niveau d'énergie.

```tsx
<EnergyCard
  value="morning"
  label="Matin"
  description="Je suis plus efficace le matin"
  icon={<SunIcon />}
  selected={selectedMoment === 'morning'}
  onClick={() => setSelectedMoment('morning')}
/>
```

---

### 2.6 Autres Composants

#### `SearchBar.tsx`

```tsx
<SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Rechercher..."
/>
```

**Features** :
- Normalisation texte (accents, casse)
- Icône loupe
- Clear button si valeur présente

---

#### `PullToRefresh.tsx`

```tsx
<PullToRefresh onRefresh={refetchData}>
  {children}
</PullToRefresh>
```

**Features** :
- Détection gesture pull-to-refresh
- Spinner pendant loading
- Callback `onRefresh` async

---

## 3. Composants Clarté (`/components/clarte`)

### 3.1 Blocks (Preview)

#### `TasksBlock.tsx`

**Props** :
- `tasks`: `Item[]`
- `onTaskClick`: (id: string) => void
- `onSeeAll`: () => void

**Affichage** :
- Max 4 tâches actives/planifiées
- Groupées par priorité temporelle :
  - "Aujourd'hui" (scheduled_at aujourd'hui)
  - "Cette semaine" (scheduled_at cette semaine)
  - "À caler" (pas de date)
- Bouton "Voir tout" si > 4 tâches

---

#### `NotesBlock.tsx`

**Props** :
- `notes`: `Item[]`
- `onNoteClick`: (id: string) => void
- `onSeeAll`: () => void

**Affichage** :
- Max 5 notes actives
- Tri : récentes d'abord
- Preview contenu tronqué (2 lignes)

---

#### `IdeasBlock.tsx`

**Props** :
- `ideas`: `Item[]` (type `idea` + `project`)
- `onIdeaClick`: (id: string) => void
- `onSeeAll`: () => void

**Affichage** :
- Idées actives + projets
- Badge "Projet" si `state === 'project'`
- Couleur fond : jaune (idea), violet (project)

---

#### `ShoppingBlock.tsx`

**Props** :
- `items`: `Item[]` (type `list_item`)
- `onItemClick`: (id: string) => void
- `onSeeAll`: () => void
- `onPlanShopping`: () => void

**Affichage** :
- Max 6 articles actifs
- Groupés par catégorie (avec icônes)
- Bouton "Planifier courses"

---

### 3.2 Views (Complètes)

#### `TasksFullView.tsx`

**Props** :
- `onClose`: () => void

**Features** :
- Tabs : Actives / Terminées / Rangées
- SearchBar
- Filtres contexte (Personnel/Famille/Work...)
- Liste complète avec scroll
- Clic task → `TaskActiveModal` ou `TaskDetailModal`

**États** :
- `active` + `planned` → Tab "Actives"
- `completed` → Tab "Terminées"
- `archived` → Tab "Rangées"

---

#### `NotesFullView.tsx`

**Props** :
- `onClose`: () => void

**Features** :
- Tabs : Actives / Archivées
- SearchBar
- Filtres contexte
- Clic note → `NoteDetailModal`

---

#### `IdeasFullView.tsx`

**Props** :
- `onClose`: () => void

**Features** :
- Tabs : Idées / Projets / Rangées
- SearchBar
- Clic → `IdeaDetailModal` ou `IdeaDevelopModal`

---

#### `ShoppingFullView.tsx`

**Props** :
- `onClose`: () => void

**Features** :
- Tabs par catégorie (Boulangerie, Crémerie...)
- Clic → `ShoppingItemModal`
- Bouton "Planifier les courses" → `PlanShoppingModal`

---

### 3.3 Modals

#### `TaskActiveModal.tsx`

**Props** :
- `task`: `Item`
- `onClose`: () => void
- `onArchive`: (id: string) => void
- `onComplete`: (id: string) => void
- `onPlan`: (id: string) => void

**Actions** :
- Planifier (si pas encore planifiée)
- Terminer
- Archiver

---

#### `PlanTaskModal.tsx`

**Props** :
- `task`: `Item`
- `onClose`: () => void
- `onScheduled`: () => void

**Features** :
- Détection contraintes temporelles
- Récup Google Calendar
- Affichage 3 créneaux suggérés
- Sélection → création événement + update item

---

#### `IdeaDevelopModal.tsx`

**Props** :
- `idea`: `Item`
- `onClose`: () => void
- `onDeveloped`: () => void

**Features** :
- Utilise `IdeaDevelopPanel` (wizard 3 étapes)
- Étape 1 : Âge idée (fraîche/ancienne)
- Étape 2 : Blocages (si ancienne)
- Étape 3 : Résultat (steps, timing, budget, motivation)

---

#### `PlanShoppingModal.tsx`

**Props** :
- `items`: `Item[]` (articles courses)
- `onClose`: () => void
- `onScheduled`: () => void

**Features** :
- Sélection date/heure courses
- Création événement Google Calendar "Courses"
- Affichage liste articles par catégorie

---

## 4. Composants Features (`/features`)

### 4.1 Capture (`/features/capture`)

#### `CaptureFlow.tsx`

**Composant principal** de la page `/capture`.

**Features** :
- `CaptureInput` (textarea)
- `VoiceRecorder` (transcription voix)
- `MoodSelector` (4 moods)
- `OrganizeButton` (lance analyse IA)
- `PendingCounter` (nombre items non traités)

**Flow** :
1. User saisit texte ou parle
2. Sélectionne mood
3. Clique "Organiser"
4. Appel `/api/analyze-v2`
5. Affichage `CaptureModal` avec résultats
6. Confirmation → sauvegarde DB

---

#### `CaptureModal.tsx`

**Props** :
- `items`: `AIAnalyzedItem[]`
- `onConfirm`: (items) => void
- `onCancel`: () => void

**Features** :
- Affichage items classés avec type/contexte
- Modification possible avant confirmation
- Boutons contexte pour changer

---

### 4.2 Ideas (`/features/ideas`)

#### `IdeaDevelopPanel.tsx`

**Wizard 3 étapes** pour développer une idée.

**Étape 1 - Âge** :
```tsx
<div>
  <button onClick={() => handleAgeSelect('fresh')}>
    🌟 Elle est toute fraîche
  </button>
  <button onClick={() => handleAgeSelect('old')}>
    ⏳ Elle traîne depuis longtemps
  </button>
</div>
```

**Étape 2 - Blocages** (si old) :
```tsx
<div>
  <Checkbox label="Manque de temps" value="time" />
  <Checkbox label="Budget limité" value="budget" />
  <Checkbox label="Peur de mal faire" value="fear" />
  <Checkbox label="Manque d'énergie" value="energy" />
  <Button onClick={handleDevelop}>Continuer</Button>
</div>
```

**Étape 3 - Résultat** :
```tsx
<div>
  <h3>{result.refined_title}</h3>
  <ul>
    {result.steps.map(step => <li>{step}</li>)}
  </ul>
  <p>⏱ {result.estimated_time}</p>
  <p>💰 {result.budget}</p>
  <p>💪 {result.motivation}</p>
  <Button onClick={onClose}>Fermer</Button>
</div>
```

---

### 4.3 Schedule (`/features/schedule`)

#### `TimeSlotCard.tsx`

**Props** :
- `slot`: `TimeSlot` (`{ start, end, score }`)
- `onSelect`: () => void
- `isSelected`: boolean

**Affichage** :
- Date + heure (ex: "Lundi 23 jan à 14h")
- Durée (ex: "1h")
- Score visuel (étoiles/barres)
- Badge "Recommandé" si meilleur score

---

## 5. Conventions Composants

### 5.1 Props Nommage

```typescript
// ✅ CORRECT
interface TaskCardProps {
  task: Item
  onTaskClick: (id: string) => void
  onArchive: (id: string) => void
}

// ❌ À ÉVITER
interface TaskCardProps {
  data: any  // Trop générique
  onClick: () => void  // Pas assez spécifique
}
```

### 5.2 Directive `'use client'`

**Obligatoire** si le composant utilise :
- Hooks React (`useState`, `useEffect`, etc.)
- Event handlers (`onClick`, `onChange`, etc.)
- Browser APIs (`localStorage`, `document`, etc.)
- Context (`useContext`)

```tsx
'use client'

import { useState } from 'react'

export function MyComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

### 5.3 Gestion Erreurs

```tsx
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<Error | null>(null)

const handleSubmit = async () => {
  setIsLoading(true)
  setError(null)

  try {
    await submitData()
  } catch (err) {
    setError(err instanceof Error ? err : new Error('Erreur'))
  } finally {
    setIsLoading(false)
  }
}
```

### 5.4 Accessibilité

```tsx
// ✅ CORRECT
<button
  onClick={handleClick}
  aria-label="Fermer la modale"
  disabled={isLoading}
>
  <X className="w-5 h-5" />
</button>

<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-describedby="email-error"
/>
{error && (
  <span id="email-error" role="alert">
    {error}
  </span>
)}
```

---

*Document technique - Composants UI Manae*
