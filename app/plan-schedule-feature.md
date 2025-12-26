# 🎯 PLAN DÉVELOPPEMENT : Feature "Plan Task"

**Objectif** : Permettre à l'utilisateur de planifier une tâche en suggérant des créneaux optimaux basés sur :
1. Son Google Calendar (événements existants)
2. Ses contraintes horaires (step 3 onboarding)
3. Ses moments d'énergie (step 2 onboarding)
4. Son mood actuel (capturé avec la tâche)

---

## 📊 ÉTAT DES LIEUX

### ✅ Ce qui existe déjà
- `lib/googleCalendar.ts` : OAuth Google + échange de tokens
- `hooks/useGoogleCalendarStatus.ts` : Hook pour détecter si Calendar connecté
- `components/layout/Header.tsx` : Badge Calendar (connecté/non connecté)
- `components/capture/GoogleCalendarCTA.tsx` : CTA pour connecter Calendar
- `features/capture/components/CaptureModal.tsx` : Modal organize (actions par type)
- Table `constraints` en DB avec contraintes horaires
- Table `users` avec `energy_moments`
- Tokens Google stockés dans localStorage sous clé `google_tokens`

### ❌ Ce qui n'existe PAS
- Récupération des événements Google Calendar
- Algorithme de détection de créneaux libres
- Service de scoring des créneaux (énergie, mood, proximité)
- UI de planification avec suggestions
- Création d'événement dans Google Calendar
- Update item avec `scheduled_at` + `google_event_id`

---

## 🏗️ ARCHITECTURE

```
features/schedule/
├── services/
│   ├── calendar.service.ts           # API Google Calendar
│   ├── slots.service.ts              # Algorithme créneaux libres
│   ├── scoring.service.ts            # Scoring des créneaux
│   └── ai-scheduling.service.ts      # Suggestions IA (optionnel)
├── components/
│   ├── ScheduleModal.tsx             # Modal principale
│   ├── TimeSlotCard.tsx              # Carte de créneau suggéré
│   └── DurationSelector.tsx          # Sélecteur de durée
├── hooks/
│   └── useScheduling.ts              # Hook orchestrateur
└── types/
    └── scheduling.types.ts           # Types

services/
└── items.service.ts                  # CRUD items (à compléter)

types/
└── items.ts                          # Types Item existants
```

---

## 🔧 ÉTAPES DE DÉVELOPPEMENT

### **ÉTAPE 1 : Types & Interfaces** (30 min)

**Fichier** : `features/schedule/types/scheduling.types.ts`

**Contenu** :
```typescript
export interface GoogleCalendarEvent {
  id: string
  summary: string
  start: {
    dateTime?: string  // ISO 8601
    date?: string      // YYYY-MM-DD (all-day events)
  }
  end: {
    dateTime?: string
    date?: string
  }
  status: 'confirmed' | 'tentative' | 'cancelled'
}

export interface TimeSlot {
  date: string           // YYYY-MM-DD
  startTime: string      // HH:mm
  endTime: string        // HH:mm
  durationMinutes: number
  score: number          // 0-100
  reason: string         // Explication du score
}

export interface SchedulingContext {
  userId: string
  taskContent: string
  taskDuration: number   // minutes
  mood?: 'energetic' | 'neutral' | 'tired'
  energyMoments: string[]
  constraints: Constraint[]
  calendarEvents: GoogleCalendarEvent[]
}

export interface SchedulingResult {
  slots: TimeSlot[]
  aiSuggestion?: {
    slotIndex: number
    reasoning: string
  }
}
```

**Conventions** :
- Toutes les heures en format `HH:mm` (24h)
- Dates en `YYYY-MM-DD`
- DateTimes en ISO 8601

**Validation** :
- Créer le fichier
- Vérifier que TypeScript compile sans erreur
- Pas de code métier ici, uniquement des types

---

### **ÉTAPE 2 : Service Google Calendar API** (2h)

**Fichier** : `features/schedule/services/calendar.service.ts`

**Responsabilité** : Communication avec Google Calendar API

**Fonctions à implémenter** :

```typescript
/**
 * Récupère les événements du calendrier entre 2 dates
 * @throws Error si tokens invalides ou Calendar non connecté
 */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<GoogleCalendarEvent[]>

/**
 * Crée un événement dans Google Calendar
 * @returns L'ID de l'événement créé
 * @throws Error si échec de création
 */
export async function createCalendarEvent(params: {
  summary: string
  description?: string
  startDateTime: string  // ISO 8601
  endDateTime: string    // ISO 8601
}): Promise<string>

/**
 * Vérifie si les tokens Google sont valides
 * Tente un refresh si expiré
 */
export async function ensureValidTokens(): Promise<void>
```

**Détails d'implémentation** :

1. **Récupération des tokens** :
```typescript
function getGoogleTokens(): { access_token: string; refresh_token: string } | null {
  const stored = localStorage.getItem('google_tokens')
  if (!stored) return null
  return JSON.parse(stored)
}
```

2. **Appel API Google Calendar** :
```typescript
const response = await fetch(
  `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
  `timeMin=${startDate.toISOString()}&` +
  `timeMax=${endDate.toISOString()}&` +
  `singleEvents=true&` +
  `orderBy=startTime`,
  {
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json'
    }
  }
)
```

3. **Gestion erreurs** :
- 401 Unauthorized → Tokens invalides, demander reconnexion
- 403 Forbidden → Permissions insuffisantes
- 429 Too Many Requests → Rate limiting, retry après délai
- Network errors → Afficher message "Impossible de se connecter à Google"

4. **Filtrage des événements** :
- Exclure les événements `cancelled`
- Gérer les événements "all-day" (sans heures précises)
- Gérer les fuseaux horaires (convertir en heure locale)

**Validation** :
- Créer un test manuel : récupérer les événements des 7 prochains jours
- Logger les événements dans la console
- Vérifier que les dates/heures sont correctes (fuseau horaire)

**Points de vigilance** :
- ⚠️ Les tokens expirent après 1h → implémenter refresh
- ⚠️ Quotas Google : 1M requêtes/jour (suffisant)
- ⚠️ Événements récurrents → `singleEvents=true` les explose

---

### **ÉTAPE 3 : Algorithme créneaux libres** (3h)

**Fichier** : `features/schedule/services/slots.service.ts`

**Responsabilité** : Identifier les créneaux libres entre événements et contraintes

**Fonction principale** :
```typescript
/**
 * Trouve tous les créneaux libres sur une période
 * @param durationMinutes - Durée minimale du créneau
 * @param constraints - Contraintes horaires de l'utilisateur
 * @param calendarEvents - Événements Google Calendar
 * @param dateRange - Période à analyser (ex: 7 jours)
 * @returns Liste de créneaux libres
 */
export async function findAvailableSlots(params: {
  durationMinutes: number
  constraints: Constraint[]
  calendarEvents: GoogleCalendarEvent[]
  startDate: Date
  endDate: Date
}): Promise<TimeSlot[]>
```

**Algorithme détaillé** :

```
POUR chaque jour de startDate à endDate :
  
  1. Définir les bornes de la journée (8h-22h par défaut)
  
  2. Récupérer les contraintes applicables ce jour :
     - Filtrer constraints où day in constraint.days
     - Exemple : "Travail" lundi-vendredi 9h-18h
  
  3. Récupérer les événements Calendar de ce jour :
     - Filtrer calendarEvents où date = jour actuel
  
  4. Construire la timeline de la journée :
     - 08:00 -> LIBRE
     - 09:00 -> BLOQUÉ (contrainte "Travail")
     - 12:00 -> LIBRE (si allow_lunch_break = true)
     - 14:00 -> BLOQUÉ (contrainte "Travail")
     - 15:00 -> BLOQUÉ (événement Calendar "Réunion")
     - 16:00 -> LIBRE
     - 18:00 -> LIBRE
     - 22:00 -> FIN
  
  5. Détecter les plages LIBRE continues >= durationMinutes :
     - Si durationMinutes = 60, et plage LIBRE = 12:00-14:00 (120 min)
     - → Créer 2 slots : 12:00-13:00 et 13:00-14:00
     - Ou 1 seul slot : 12:00-14:00 (selon stratégie)
  
  6. Pour chaque slot, calculer un score de base (0-100) :
     - Score = 50 (neutre)
     - +10 si pas d'événement proche (buffer de 30 min avant/après)
     - +5 si plage > durationMinutes * 1.5 (confortable)

RETOURNER tous les slots triés par date puis heure
```

**Structures de données** :

```typescript
interface TimelineBlock {
  type: 'FREE' | 'BUSY_CONSTRAINT' | 'BUSY_EVENT'
  startTime: string  // HH:mm
  endTime: string    // HH:mm
  reason?: string    // "Travail", "Réunion équipe", etc.
}

function buildDayTimeline(
  date: string,
  constraints: Constraint[],
  events: GoogleCalendarEvent[]
): TimelineBlock[]
```

**Cas limites à gérer** :
- Événements qui se chevauchent → merger les blocs BUSY
- Contraintes avec `allow_lunch_break: true` → découper le bloc
- Événements "all-day" → bloquer toute la journée (8h-22h)
- Pas de créneaux libres → retourner array vide (pas d'erreur)

**Validation** :
- Test case 1 : Aucune contrainte, aucun événement → 7 jours * 14h = 98 créneaux d'1h
- Test case 2 : Contrainte "Travail" 9h-18h L-V → créneaux soirs et week-end uniquement
- Test case 3 : Événement Calendar 10h-11h → créneau bloqué, vérifier buffer

**Points de vigilance** :
- ⚠️ Ne PAS créer de créneaux qui commencent après 21h (trop tard)
- ⚠️ Ne PAS créer de créneaux < 30 min (trop courts)
- ⚠️ Gérer les chevauchements horaires (event 10h-11h30 + contrainte 10h-12h)

---

### **ÉTAPE 4 : Scoring des créneaux** (2h)

**Fichier** : `features/schedule/services/scoring.service.ts`

**Responsabilité** : Améliorer le score des créneaux selon énergie, mood, proximité

**Fonction principale** :
```typescript
/**
 * Améliore les scores des créneaux selon le contexte utilisateur
 * @modifies slots - Scores mis à jour in-place
 */
export function scoreSlots(
  slots: TimeSlot[],
  context: {
    energyMoments: string[]
    mood?: 'energetic' | 'neutral' | 'tired'
  }
): void
```

**Logique de scoring** :

```
Score de base (calculé dans slots.service) : 50

BONUS ÉNERGIE (+30 max) :
- Si créneau dans energy_moments de l'utilisateur :
  - "morning-energy" (6h-9h) → +30
  - "morning" (9h-12h) → +25
  - "afternoon" (14h-18h) → +20
  - "evening" (18h-21h) → +15
  - "lunch" (12h-14h) → +10
  - "night" (21h+) → +0

BONUS MOOD (+20 max) :
- Si mood = 'energetic' :
  - Créneaux matin (6h-12h) → +20
  - Créneaux après-midi (12h-18h) → +10
- Si mood = 'tired' :
  - Créneaux matin (6h-12h) → +5
  - Créneaux après-midi (12h-18h) → +20 (préférer plus tard)
  - Créneaux soir (18h-21h) → +15
- Si mood = 'neutral' :
  - Pas de bonus spécifique

BONUS PROXIMITÉ (+20 max) :
- Aujourd'hui dans les 2 prochaines heures → +20
- Aujourd'hui plus tard → +15
- Demain → +10
- Dans 2-3 jours → +5
- Plus tard → +0

SCORE FINAL = min(100, score_base + bonus_energie + bonus_mood + bonus_proximite)
```

**Implémentation** :

```typescript
export function scoreSlots(slots: TimeSlot[], context: {...}): void {
  const now = new Date()
  
  for (const slot of slots) {
    const slotHour = parseInt(slot.startTime.split(':')[0])
    
    // Bonus énergie
    const energyBonus = calculateEnergyBonus(slotHour, context.energyMoments)
    
    // Bonus mood
    const moodBonus = calculateMoodBonus(slotHour, context.mood)
    
    // Bonus proximité
    const proximityBonus = calculateProximityBonus(slot.date, slot.startTime, now)
    
    // Mise à jour score
    slot.score = Math.min(100, slot.score + energyBonus + moodBonus + proximityBonus)
    
    // Mise à jour reason
    const reasons = []
    if (energyBonus > 0) reasons.push(`Moment d'énergie préféré`)
    if (moodBonus > 0) reasons.push(`Adapté à ton humeur`)
    if (proximityBonus > 15) reasons.push(`Disponible bientôt`)
    slot.reason = reasons.join(' • ') || 'Créneau disponible'
  }
  
  // Tri par score décroissant
  slots.sort((a, b) => b.score - a.score)
}
```

**Validation** :
- Test avec `energyMoments: ['morning']` et créneau 10h → score > 70
- Test avec `mood: 'tired'` et créneau 19h → score > 65
- Test avec créneau aujourd'hui 14h (maintenant 12h) → score > 75
- Vérifier que les créneaux sont triés par score décroissant

---

### **ÉTAPE 5 : Hook orchestrateur** (1h)

**Fichier** : `features/schedule/hooks/useScheduling.ts`

**Responsabilité** : Orchestrer les appels aux services + gérer l'état UI

**Interface** :
```typescript
export function useScheduling(params: {
  itemId: string
  taskContent: string
  taskDuration: number
  mood?: 'energetic' | 'neutral' | 'tired'
}) {
  // État
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  
  // Actions
  async function loadSlots(): Promise<void>
  async function scheduleTask(slot: TimeSlot): Promise<void>
  
  return {
    isLoading,
    error,
    slots,
    loadSlots,
    scheduleTask
  }
}
```

**Implémentation** :

```typescript
async function loadSlots() {
  setIsLoading(true)
  setError(null)
  
  try {
    // 1. Récupérer le profil user (energy_moments)
    const profile = await getOrCreateUserProfile()
    
    // 2. Récupérer les contraintes
    const constraints = await getConstraints()
    
    // 3. Récupérer les événements Calendar (7 prochains jours)
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 7)
    const events = await getCalendarEvents(startDate, endDate)
    
    // 4. Trouver les créneaux libres
    const freeSlots = await findAvailableSlots({
      durationMinutes: taskDuration,
      constraints,
      calendarEvents: events,
      startDate,
      endDate
    })
    
    // 5. Scorer les créneaux
    scoreSlots(freeSlots, {
      energyMoments: profile.energy_moments || [],
      mood: mood
    })
    
    // 6. Garder top 10
    setSlots(freeSlots.slice(0, 10))
    
  } catch (err) {
    console.error('Error loading slots:', err)
    setError(err instanceof Error ? err.message : 'Erreur inconnue')
  } finally {
    setIsLoading(false)
  }
}

async function scheduleTask(slot: TimeSlot) {
  try {
    // 1. Créer l'événement dans Google Calendar
    const startDateTime = `${slot.date}T${slot.startTime}:00`
    const endDateTime = `${slot.date}T${slot.endTime}:00`
    
    const eventId = await createCalendarEvent({
      summary: taskContent,
      startDateTime,
      endDateTime
    })
    
    // 2. Update l'item en DB
    await updateItem(itemId, {
      state: 'planned',
      scheduled_at: startDateTime,
      google_event_id: eventId
    })
    
    // 3. Notifier succès (toast ou callback)
    
  } catch (err) {
    setError('Erreur lors de la planification')
    throw err
  }
}
```

**Gestion d'erreurs** :
- Google Calendar non connecté → afficher CTA connexion
- Pas de créneaux disponibles → message "Aucun créneau trouvé sur 7 jours"
- Échec création événement → rollback (ne pas mettre `planned` en DB)

---

### **ÉTAPE 6 : Composants UI** (3h)

#### 6.1 DurationSelector

**Fichier** : `features/schedule/components/DurationSelector.tsx`

```typescript
interface DurationSelectorProps {
  value: number  // minutes
  onChange: (minutes: number) => void
}

// Options : 15, 30, 45, 60, 90, 120 minutes
```

**Design** :
- Pills cliquables horizontales
- Selected = border primary + bg primary/10
- Custom input pour durée personnalisée (optionnel)

---

#### 6.2 TimeSlotCard

**Fichier** : `features/schedule/components/TimeSlotCard.tsx`

```typescript
interface TimeSlotCardProps {
  slot: TimeSlot
  onSelect: () => void
  isSelected?: boolean
}
```

**Design** :
```
┌─────────────────────────────────────┐
│ 🟢 Score: 85                        │
│                                      │
│ Jeudi 2 janvier                     │
│ 14:00 - 15:00 (60 min)              │
│                                      │
│ 💡 Moment d'énergie préféré •       │
│    Adapté à ton humeur              │
└─────────────────────────────────────┘
```

- Score → Badge rond vert/orange/rouge selon valeur
- Date formatée en français (ex: "Aujourd'hui", "Demain", "Lundi 6 janvier")
- Heure en format 12h ou 24h selon préférence
- Reason → avec icône emoji selon type

---

#### 6.3 ScheduleModal

**Fichier** : `features/schedule/components/ScheduleModal.tsx`

```typescript
interface ScheduleModalProps {
  item: Item
  onClose: () => void
  onSuccess: () => void
}
```

**Structure** :
```
┌─────────────────────────────────────┐
│ Planifier la tâche                  │ [X]
├─────────────────────────────────────┤
│                                      │
│ "Appeler le dentiste"                │
│                                      │
│ Durée estimée :                      │
│ [15] [30] [45] [●60] [90] [120]      │
│                                      │
│ Créneaux suggérés :                  │
│                                      │
│ ┌─ TimeSlotCard (score 85) ────┐    │
│ └─────────────────────────────┘    │
│                                      │
│ ┌─ TimeSlotCard (score 72) ────┐    │
│ └─────────────────────────────┘    │
│                                      │
│ ... (3-5 suggestions)                │
│                                      │
│ [Voir plus de créneaux]              │
│                                      │
│         [Planifier] [Annuler]        │
└─────────────────────────────────────┘
```

**Flow** :
1. Modal s'ouvre avec loader "Recherche de créneaux..." (2-3s)
2. Affichage des 3-5 meilleurs créneaux
3. User clique sur un créneau → highlight + bouton "Planifier" activé
4. User clique "Planifier" → loader + création événement
5. Succès → message "Tâche planifiée !" + fermeture modal
6. Erreur → afficher message + possibilité retry

**Gestion Google Calendar non connecté** :
- Afficher `GoogleCalendarCTA` en haut de modal
- Désactiver sélection créneaux
- Message : "Connecte ton Google Calendar pour planifier cette tâche"

---

### **ÉTAPE 7 : Intégration dans OrganizeModal** (30 min)

**Fichier** : `features/capture/components/CaptureModal.tsx`

**Modification** :
```typescript
// Dans handleSave, quand action === 'plan'
case 'plan':
  // NE PAS créer l'événement ici
  // Juste rediriger vers la modal de planification
  await saveItem({
    userId,
    type,
    content,
    state: 'active',  // PAS 'planned' tout de suite
    mood: convertMoodToItemMood(selectedMood),
    aiAnalysis: captureResult?.aiAnalysis
  })
  
  // Ouvrir ScheduleModal
  setShowScheduleModal(true)
  break
```

**Alternative** : Router vers `/items/{id}/schedule` (route dédiée)
- Avantage : URL propre, retour arrière fonctionne
- Inconvénient : Un peu plus long à implémenter

**Recommandation** : Modal inline pour l'instant, route dédiée en V2

---

### **ÉTAPE 8 : Tests & Validation** (2h)

**Scénarios de test** :

1. **Test basique** :
   - Créer tâche "Test" avec mood 'energetic'
   - Cliquer "Planifier"
   - Vérifier que 3-5 créneaux s'affichent
   - Sélectionner un créneau
   - Vérifier création événement Google Calendar
   - Vérifier item state = 'planned' en DB

2. **Test sans Calendar connecté** :
   - Déconnecter Google Calendar (supprimer localStorage)
   - Créer tâche et cliquer "Planifier"
   - Vérifier affichage du CTA connexion
   - Connecter Calendar
   - Vérifier que créneaux s'affichent

3. **Test avec contraintes** :
   - Ajouter contrainte "Travail" 9h-18h L-V
   - Créer tâche vendredi 16h avec durée 60 min
   - Vérifier que créneaux suggérés = soirs + week-end
   - Pas de créneaux entre 9h-18h en semaine

4. **Test avec agenda chargé** :
   - Créer 5 événements Google Calendar aujourd'hui
   - Créer tâche avec durée 60 min
   - Vérifier que créneaux suggérés = entre les événements

5. **Test edge cases** :
   - Durée 240 min (4h) → très peu de créneaux
   - Pas de créneaux disponibles → message clair
   - Événement all-day aujourd'hui → proposer demain

**Validation fonctionnelle** :
- [ ] Créneaux respectent les contraintes
- [ ] Scoring cohérent (energy_moments priorisés)
- [ ] Événement créé dans Google Calendar
- [ ] Item state = 'planned' après succès
- [ ] Gestion erreurs (Calendar déconnecté, API fail)

**Validation UX** :
- [ ] Loaders clairs (pas de freeze UI)
- [ ] Messages d'erreur compréhensibles
- [ ] Animations fluides (modal, sélection)
- [ ] Responsive mobile (cards empilées)

---

## 📋 CHECKLIST COMPLÈTE

### Services
- [ ] `calendar.service.ts` : getCalendarEvents, createCalendarEvent
- [ ] `slots.service.ts` : findAvailableSlots, buildDayTimeline
- [ ] `scoring.service.ts` : scoreSlots, calculateEnergyBonus, calculateMoodBonus
- [ ] `items.service.ts` : updateItem avec scheduled_at + google_event_id

### Composants
- [ ] `DurationSelector.tsx` : sélection durée tâche
- [ ] `TimeSlotCard.tsx` : affichage créneau avec score
- [ ] `ScheduleModal.tsx` : modal principale planification
- [ ] Intégration dans `CaptureModal.tsx`

### Hooks
- [ ] `useScheduling.ts` : orchestration loadSlots + scheduleTask

### Types
- [ ] `scheduling.types.ts` : tous les types

### Tests
- [ ] Test récupération événements Calendar
- [ ] Test algorithme créneaux libres
- [ ] Test scoring créneaux
- [ ] Test création événement Calendar
- [ ] Test flow complet : capture → organize → plan → DB + Calendar

---

## ⚠️ POINTS CRITIQUES

1. **Tokens Google expirés** :
   - Implémenter refresh token AVANT tout appel API
   - Si échec refresh → demander reconnexion

2. **Fuseaux horaires** :
   - Google retourne UTC, convertir en heure locale
   - Stocker `scheduled_at` en ISO 8601 avec TZ

3. **Performance** :
   - 7 jours × 14h = potentiellement 100+ créneaux
   - Limiter à top 10 dans UI
   - Ne PAS calculer plus de 7 jours (trop long)

4. **Gestion d'erreurs** :
   - TOUJOURS catcher les erreurs API Google
   - TOUJOURS rollback si échec partiel (event créé mais DB fail)
   - TOUJOURS afficher message clair à l'utilisateur

5. **Quotas IA** :
   - Planification coûte 1 crédit IA
   - Vérifier quota AVANT d'appeler l'algo
   - Si quota épuisé → proposer créneaux sans scoring IA (score basique uniquement)

---

## 🎯 ORDRE DE DÉVELOPPEMENT RECOMMANDÉ

**Session 1 (3h)** : Fondations
1. ÉTAPE 1 : Types (30 min)
2. ÉTAPE 2 : calendar.service.ts (2h)
3. Test manuel : récupérer événements (30 min)

**Session 2 (4h)** : Algorithme cœur
1. ÉTAPE 3 : slots.service.ts (3h)
2. Test manuel : détecter créneaux libres (1h)

**Session 3 (3h)** : Scoring + Orchestration
1. ÉTAPE 4 : scoring.service.ts (2h)
2. ÉTAPE 5 : useScheduling.ts (1h)

**Session 4 (4h)** : UI
1. ÉTAPE 6 : Composants (3h)
2. ÉTAPE 7 : Intégration (1h)

**Session 5 (2h)** : Tests
1. ÉTAPE 8 : Tests end-to-end

**Total** : ~16h de développement

---

## 🚀 PROCHAINE ACTION

**On démarre par ÉTAPE 1 : Types ?**

Je vais créer le fichier `features/schedule/types/scheduling.types.ts` avec tous les types nécessaires.

Une fois validé, on enchaîne sur ÉTAPE 2 : Service Google Calendar.

Tu es OK pour commencer ?
