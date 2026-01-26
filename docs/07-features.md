# 07 - Features Fonctionnelles

> Documentation détaillée des modules fonctionnels

---

## 1. Feature: Capture (`/features/capture`)

### 1.1 Objectif

Permettre capture rapide pensées (texte/voix) avec mood tracking et analyse IA automatique.

### 1.2 Composants

#### `CaptureFlow.tsx`

**Composant principal** de `/capture`.

**Structure** :
```tsx
<div className="flex flex-col h-screen">
  <CaptureInput
    value={text}
    onChange={setText}
    placeholder="Qu'as-tu en tête ?"
  />

  <VoiceRecorder onTranscript={setText} />

  <MoodSelector selected={mood} onChange={setMood} />

  <OrganizeButton
    onClick={handleOrganize}
    isLoading={isAnalyzing}
    disabled={!text.trim()}
  />

  <PendingCounter count={pendingItems} />
</div>
```

**Flow** :
1. User saisit texte ou parle
2. Sélectionne mood (énergique/calme/débordé/fatigué)
3. Clique "Organiser"
4. Appel `useItemCapture().analyzeAndCapture(text, mood)`
5. Appel `/api/analyze-v2`
6. Résultat → `CaptureModal`
7. User confirme → sauvegarde DB

---

#### `CaptureModal.tsx`

**Props** :
```typescript
interface CaptureModalProps {
  items: AIAnalyzedItem[]
  onConfirm: (items: AIAnalyzedItem[]) => void
  onCancel: () => void
  isLoading?: boolean
}
```

**Fonctionnalités** :
- Affiche items classés avec icônes type/contexte
- Édition contenu possible
- Changement contexte via boutons
- Boutons "Annuler" / "Confirmer"

**Responsive** :
- Mobile : Bottom sheet
- Desktop : Modal centré

---

#### `VoiceRecorder.tsx`

**API** : Web Speech API (`webkitSpeechRecognition`).

```typescript
const recognition = new webkitSpeechRecognition()
recognition.lang = 'fr-FR'
recognition.continuous = false
recognition.interimResults = false

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript
  onTranscript(transcript)
}

recognition.start()
```

**États** :
- Idle : Bouton microphone gris
- Recording : Bouton rouge pulsant
- Processing : Spinner

---

### 1.3 Hook `useItemCapture()`

**Localisation** : `hooks/useItemCapture.ts`

**API** :
```typescript
const {
  isCapturing,
  isAnalyzing,
  error,
  lastCapturedItems,
  analysisResult,
  captureAndAnalyze,
  captureRaw,
  analyzeText,
  saveAnalyzedItems
} = useItemCapture()
```

**Méthodes** :
- `captureAndAnalyze(text, mood)` : Flow complet (analyse + sauvegarde)
- `captureRaw(text, mood)` : Capture sans analyse
- `analyzeText(text)` : Analyse seule
- `saveAnalyzedItems(items, mood)` : Sauvegarde items en DB

**Gestion quota** :
- Vérifie quota IA avant analyse
- Si quota épuisé → fallback règles basiques ou erreur

---

## 2. Feature: Ideas (`/features/ideas`)

### 2.1 Objectif

Transformer idées floues en projets structurés avec étapes actionnables.

### 2.2 Hook `useIdeaDevelop()`

**Localisation** : `features/ideas/hooks/useIdeaDevelop.ts`

**API** :
```typescript
const {
  currentStep,    // 'age' | 'blockers' | 'result'
  ideaAge,        // 'fresh' | 'old'
  blockers,       // string[]
  isLoading,
  error,
  result,         // DevelopIdeaResponse

  setIdeaAge,     // (age: IdeaAge) => void
  toggleBlocker,  // (blocker: IdeaBlocker) => void
  develop,        // () => Promise<void>
  goBack,         // () => void
  reset           // () => void
} = useIdeaDevelop(itemId)
```

**States** :
```typescript
type DevelopStep = 'age' | 'blockers' | 'result'
type IdeaAge = 'fresh' | 'old'
type IdeaBlocker = 'time' | 'budget' | 'fear' | 'energy'

interface DevelopIdeaResponse {
  refined_title: string
  steps: string[]
  estimated_time: string
  budget: string | null
  motivation: string
}
```

**Flow** :
```
1. currentStep = 'age'
   → User clique "Fraîche" ou "Ancienne"
   → setIdeaAge('fresh' | 'old')
   → si 'fresh': currentStep = 'result', develop()
   → si 'old': currentStep = 'blockers'

2. currentStep = 'blockers' (si old)
   → User sélectionne blocages
   → toggleBlocker('time'), toggleBlocker('budget')...
   → Clique "Continuer"
   → develop()

3. develop()
   → POST /api/develop-idea { itemId, idea_age, blockers }
   → OpenAI génère steps
   → currentStep = 'result'

4. currentStep = 'result'
   → Affiche refined_title, steps, time, budget, motivation
   → Bouton "Fermer"
```

---

### 2.3 Composant `IdeaDevelopPanel.tsx`

**Props** :
```typescript
interface IdeaDevelopPanelProps {
  itemId: string
  onClose: () => void
  onDeveloped: () => void
}
```

**UI Étape 1 (Âge)** :
```tsx
<div className="flex flex-col gap-4">
  <h3>Cette idée, elle date de quand ?</h3>

  <button onClick={() => setIdeaAge('fresh')}>
    <span className="text-4xl">🌟</span>
    <span>Elle est toute fraîche</span>
  </button>

  <button onClick={() => setIdeaAge('old')}>
    <span className="text-4xl">⏳</span>
    <span>Elle traîne depuis longtemps</span>
  </button>
</div>
```

**UI Étape 2 (Blocages)** :
```tsx
<div>
  <h3>Qu'est-ce qui te bloque ?</h3>

  <div className="flex flex-col gap-3">
    <Checkbox
      label="Manque de temps"
      checked={blockers.includes('time')}
      onChange={() => toggleBlocker('time')}
    />
    <Checkbox label="Budget limité" ... />
    <Checkbox label="Peur de mal faire" ... />
    <Checkbox label="Manque d'énergie" ... />
  </div>

  <button onClick={develop} disabled={isLoading}>
    {isLoading ? 'En cours...' : 'Continuer'}
  </button>
</div>
```

**UI Étape 3 (Résultat)** :
```tsx
<div className="space-y-6">
  <h2>{result.refined_title}</h2>

  <div>
    <h4>Étapes</h4>
    <ol>
      {result.steps.map((step, i) => (
        <li key={i}>{step}</li>
      ))}
    </ol>
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <span>⏱ Durée</span>
      <p>{result.estimated_time}</p>
    </div>
    <div>
      <span>💰 Budget</span>
      <p>{result.budget || 'Gratuit'}</p>
    </div>
  </div>

  <div className="bg-accent-light p-4 rounded-xl">
    <p>💪 {result.motivation}</p>
  </div>

  <button onClick={onClose}>Fermer</button>
</div>
```

---

## 3. Feature: Schedule (`/features/schedule`)

### 3.1 Objectif

Planification intelligente tâches sur Google Calendar avec détection contraintes temporelles.

### 3.2 Hook `useScheduling()`

**Localisation** : `features/schedule/hooks/useScheduling.ts`

**API** :
```typescript
const {
  bestSlot,            // TimeSlot recommandé
  alternativeSlots,    // TimeSlot[] (2 autres options)
  estimatedDuration,   // number (minutes)
  isCalendarConnected, // boolean
  isLoading,
  error,

  findSlots,           // (task: Item) => Promise<void>
  scheduleTask,        // (slot: TimeSlot) => Promise<void>
  refreshCalendar      // () => Promise<void>
} = useScheduling()
```

**Types** :
```typescript
interface TimeSlot {
  start: string  // ISO
  end: string    // ISO
  score?: number // 0-100
}
```

**Workflow** :
```
1. User clique "Caler" sur tâche
   → findSlots(task)

2. findSlots():
   a. Détecte contraintes temporelles (ai_analysis.temporal_constraint)
   b. Fetch Google Calendar events (getCalendarEvents)
   c. Fetch user constraints (table: constraints)
   d. Appelle findAvailableSlots(task, calendar, constraints)
   e. Score créneaux (scoring.service.ts)
   f. Sélectionne top 3 diversifiés (matin/après-midi/soir)

3. User sélectionne créneau
   → scheduleTask(slot)

4. scheduleTask():
   a. createCalendarEvent(task, slot)
   b. Update item: scheduled_at, google_event_id, state='planned'
```

---

### 3.3 Services

#### `calendar.service.ts`

```typescript
// Récupérer événements (multi-calendriers)
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<GoogleCalendarEvent[]> {
  // Récupère les événements de TOUS les calendriers sélectionnés
  const selectedCalendarIds = getSelectedCalendarIds()

  // Fetch en parallèle depuis tous les calendriers
  const eventsArrays = await Promise.all(
    selectedCalendarIds.map(calendarId =>
      getEventsFromCalendar(calendarId, startDate, endDate, token)
    )
  )

  // Fusionner et dédupliquer
  return eventsArrays.flat().filter((event, index, self) =>
    index === self.findIndex(e => e.id === event.id)
  )
}

// Créer événement
export async function createCalendarEvent(
  event: {
    summary: string
    description?: string
    startDateTime: string
    endDateTime: string
  }
): Promise<string> {
  const token = getTokenFromLocalStorage()

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.startDateTime, timeZone: 'Europe/Paris' },
        end: { dateTime: event.endDateTime, timeZone: 'Europe/Paris' }
      })
    }
  )

  const data = await response.json()
  return data.id  // google_event_id
}

// Supprimer événement (pour déplacement de tâche)
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const token = getTokenFromLocalStorage()

  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token.access_token}` }
    }
  )
}

// Gestion multi-calendriers
export async function getCalendarList(): Promise<GoogleCalendar[]>
export function getSelectedCalendarIds(): string[]
export function saveSelectedCalendarIds(ids: string[]): void
```

---

#### `slots.service.ts`

```typescript
export function findAvailableSlots(
  task: Item,
  calendarEvents: GoogleCalendarEvent[],
  constraints: Constraint[]
): TimeSlot[] {
  const duration = estimateDuration(task)
  const slots: TimeSlot[] = []

  // Fenêtre recherche : 7 prochains jours
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 7)

  // Pour chaque jour
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Heures ouvrables : 8h-20h
    for (let hour = 8; hour <= 20; hour++) {
      const slotStart = new Date(d)
      slotStart.setHours(hour, 0, 0, 0)

      const slotEnd = new Date(slotStart)
      slotEnd.setMinutes(slotEnd.getMinutes() + duration)

      // Vérif disponibilité
      if (
        !isSlotBusy(slotStart, slotEnd, calendarEvents) &&
        !isSlotConstrained(slotStart, slotEnd, constraints)
      ) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString()
        })
      }
    }
  }

  return slots
}

function isSlotBusy(
  start: Date,
  end: Date,
  events: GoogleCalendarEvent[]
): boolean {
  return events.some(event => {
    const eventStart = new Date(event.start.dateTime)
    const eventEnd = new Date(event.end.dateTime)
    return (start < eventEnd && end > eventStart)  // Overlap
  })
}

function isSlotConstrained(
  start: Date,
  end: Date,
  constraints: Constraint[]
): boolean {
  const day = start.toLocaleDateString('en-US', { weekday: 'lowercase' })

  return constraints.some(c => {
    if (!c.days.includes(day)) return false

    const constraintStart = parseTime(c.start_time)
    const constraintEnd = parseTime(c.end_time)

    const slotTime = start.getHours() * 60 + start.getMinutes()
    const slotEndTime = end.getHours() * 60 + end.getMinutes()

    return (slotTime < constraintEnd && slotEndTime > constraintStart)
  })
}
```

---

#### `scoring.service.ts`

```typescript
export function scoreSlots(
  slots: TimeSlot[],
  task: Item,
  userPreferences: {
    energyMoments: string[]  // ['morning', 'afternoon', 'evening']
  }
): TimeSlot[] {
  return slots.map(slot => {
    let score = 50  // Base

    const hour = new Date(slot.start).getHours()

    // Score selon moment préféré
    if (userPreferences.energyMoments.includes('morning') && hour >= 8 && hour < 12) {
      score += 20
    }
    if (userPreferences.energyMoments.includes('afternoon') && hour >= 14 && hour < 18) {
      score += 20
    }
    if (userPreferences.energyMoments.includes('evening') && hour >= 18 && hour < 21) {
      score += 10
    }

    // Bonus si proche temporalConstraint
    if (task.ai_analysis?.temporal_constraint) {
      const targetDate = new Date(task.ai_analysis.temporal_constraint.date)
      const slotDate = new Date(slot.start)
      const daysDiff = Math.abs((slotDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysDiff < 1) score += 30
      else if (daysDiff < 3) score += 10
    }

    // Pénalité si très loin dans le futur
    const daysFromNow = (new Date(slot.start).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysFromNow > 5) score -= 10

    return { ...slot, score: Math.min(100, score) }
  })
}

export function selectTop3Diversified(slots: TimeSlot[]): TimeSlot[] {
  // Trier par score
  const sorted = slots.sort((a, b) => (b.score || 0) - (a.score || 0))

  const selected: TimeSlot[] = []
  const periods: Set<string> = new Set()

  for (const slot of sorted) {
    if (selected.length >= 3) break

    const hour = new Date(slot.start).getHours()
    let period: string

    if (hour < 12) period = 'morning'
    else if (hour < 18) period = 'afternoon'
    else period = 'evening'

    // Diversifier : 1 matin, 1 après-midi, 1 soir
    if (!periods.has(period)) {
      selected.push(slot)
      periods.add(period)
    }
  }

  // Compléter si < 3
  for (const slot of sorted) {
    if (selected.length >= 3) break
    if (!selected.includes(slot)) selected.push(slot)
  }

  return selected
}
```

---

### 3.4 Composants

#### `TimeSlotCard.tsx`

```tsx
interface TimeSlotCardProps {
  slot: TimeSlot
  isSelected: boolean
  onSelect: () => void
}

export function TimeSlotCard({ slot, isSelected, onSelect }: TimeSlotCardProps) {
  const startDate = new Date(slot.start)
  const endDate = new Date(slot.end)

  const dateLabel = startDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  })

  const timeLabel = `${startDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })} - ${endDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })}`

  const score = slot.score || 0
  const isRecommended = score >= 80

  return (
    <button
      onClick={onSelect}
      className={cn(
        'p-4 rounded-xl border-2 transition-all',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-gray-200 hover:border-primary/50'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-left">
          <p className="font-medium text-text-dark">{dateLabel}</p>
          <p className="text-sm text-text-muted">{timeLabel}</p>
        </div>

        {isRecommended && (
          <span className="px-2 py-1 bg-accent text-white text-xs rounded-full">
            Recommandé
          </span>
        )}
      </div>

      {/* Score visuel */}
      <div className="mt-2 flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full',
              i < Math.floor(score / 20)
                ? 'bg-accent'
                : 'bg-gray-200'
            )}
          />
        ))}
      </div>
    </button>
  )
}
```

---

## 4. Feature: Shopping Lists

### 4.1 Catégorisation Automatique

**Service** : `/services/ai/analysis.service.ts`

Lors de l'analyse, les `list_item` reçoivent automatiquement une `category` selon mots-clés :

```typescript
const CATEGORY_KEYWORDS = {
  dairy: ['lait', 'œufs', 'fromage', 'beurre', 'yaourt', 'crème'],
  bakery: ['pain', 'farine', 'brioche', 'croissant'],
  meat: ['viande', 'poisson', 'jambon', 'poulet', 'steak'],
  produce: ['fruit', 'légume', 'banane', 'pomme', 'salade', 'tomate'],
  // ...
}
```

### 4.2 Affichage par Catégorie

**Composant** : `ShoppingFullView.tsx`

```tsx
const itemsByCategory = items.reduce((acc, item) => {
  const cat = item.shopping_category || 'other'
  if (!acc[cat]) acc[cat] = []
  acc[cat].push(item)
  return acc
}, {} as Record<string, Item[]>)

return (
  <div>
    {Object.entries(itemsByCategory).map(([category, items]) => (
      <div key={category}>
        <h3>
          <Icon /> {SHOPPING_CATEGORIES[category].label}
        </h3>
        <ul>
          {items.map(item => (
            <ShoppingItemRow key={item.id} item={item} />
          ))}
        </ul>
      </div>
    ))}
  </div>
)
```

### 4.3 Planification Courses

**Modal** : `PlanShoppingModal.tsx`

```tsx
<div>
  <h2>Planifier les courses</h2>

  {/* Date/heure sélection */}
  <input type="datetime-local" value={dateTime} onChange={setDateTime} />

  {/* Liste articles */}
  <div className="max-h-64 overflow-y-auto">
    {itemsByCategory.map...}
  </div>

  {/* Actions */}
  <button onClick={handleSchedule}>
    Ajouter au calendrier
  </button>
</div>
```

**Logic** :
```typescript
const handleSchedule = async () => {
  // 1. Créer événement Google Calendar
  const eventId = await createCalendarEvent({
    summary: 'Courses',
    description: `Articles : ${items.map(i => i.content).join(', ')}`,
    start: selectedDateTime.toISOString(),
    end: addHours(selectedDateTime, 1).toISOString()
  })

  // 2. Update shopping_list
  await supabase
    .from('shopping_lists')
    .update({
      scheduled_at: selectedDateTime.toISOString(),
      google_event_id: eventId
    })
    .eq('id', listId)

  onScheduled()
}
```

---

---

## 5. Mises à jour récentes (26 janvier 2026)

### 5.1 Multi-Calendriers Google

Les utilisateurs peuvent désormais sélectionner plusieurs calendriers Google pour la planification :

- **CalendarSelectorModal** (`components/profil/CalendarSelectorModal.tsx`) : Interface de sélection
- **getCalendarList()** : Récupère tous les calendriers de l'utilisateur
- **getSelectedCalendarIds()** / **saveSelectedCalendarIds()** : Persistance localStorage
- **getCalendarEvents()** : Fetch depuis TOUS les calendriers sélectionnés en parallèle

### 5.2 Déplacement de Tâches Planifiées

Quand une tâche déjà planifiée est déplacée vers un nouveau créneau :

1. L'ancien événement Google Calendar est supprimé (`deleteCalendarEvent()`)
2. Le nouvel événement est créé au nouveau créneau
3. La base de données est mise à jour avec le nouveau `google_event_id`

**Hook modifié** : `useScheduling()` accepte maintenant `currentGoogleEventId` pour gérer le déplacement.

### 5.3 Fix Fuseau Horaire

Correction du parsing des heures d'événements Google Calendar :
- Utilise maintenant l'heure locale (`getHours()`, `getMinutes()`) au lieu de parser manuellement l'ISO string
- Évite les décalages horaires lors de l'affichage des créneaux occupés

---

*Document technique - Features Fonctionnelles Manae*
*Dernière mise à jour : 26 janvier 2026*
