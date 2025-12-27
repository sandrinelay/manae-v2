# 🎯 PLAN DÉVELOPPEMENT : Feature "Plan Task" - VERSION 2

**Objectif** : Permettre à l'utilisateur de planifier une tâche en suggérant des créneaux optimaux basés sur :
1. Son Google Calendar (événements existants)
2. Ses contraintes horaires (temps indisponibles)
3. Ses moments d'énergie préférés
4. Son mood actuel (capturé avec la tâche)
5. Les sciences cognitives (pics de performance)

---

## 📊 ÉTAT DES LIEUX

### ✅ Ce qui est TERMINÉ (Étapes 1-3)

- **Étape 1** : Types & Interfaces ✅
  - Fichier : `features/schedule/types/scheduling.types.ts`
  - Contenu : GoogleCalendarEvent, TimeSlot, SchedulingContext, SchedulingResult

- **Étape 2** : Service Google Calendar API ✅
  - Fichier : `features/schedule/services/calendar.service.ts`
  - Fonctions : getCalendarEvents(), createCalendarEvent(), ensureValidTokens()
  - Gestion tokens avec expires_at, refresh automatique

- **Étape 3** : Algorithme créneaux libres + Scoring ✅
  - Fichier : `features/schedule/services/slots.service.ts`
  - Fonction : findAvailableSlots()
  - Scoring intégrant : energy_moments, mood, constraints, sciences cognitives, proximité, buffer

### ❌ Ce qui reste À FAIRE (Étapes 4-7)

- **Étape 4** : Hook orchestrateur
- **Étape 5** : Composants UI
- **Étape 6** : Intégration dans CaptureModal
- **Étape 7** : Tests & gestion des edge cases

---

## 🏗️ ARCHITECTURE CIBLE

```
features/schedule/
├── services/
│   ├── calendar.service.ts           ✅ TERMINÉ
│   ├── slots.service.ts              ✅ TERMINÉ
│   └── ai-duration.service.ts        🆕 À CRÉER (estimation durée IA)
├── components/
│   ├── DurationSelector.tsx          🆕 À CRÉER
│   ├── ContextSelector.tsx           🆕 À CRÉER
│   ├── TimeSlotCard.tsx              🆕 À CRÉER
│   └── SuccessModal.tsx              🆕 À CRÉER
├── hooks/
│   └── useScheduling.ts              🆕 À CRÉER
└── types/
    └── scheduling.types.ts           ✅ TERMINÉ

features/capture/components/
└── CaptureModal.tsx                  📝 À MODIFIER (step system)

app/
└── items/[id]/schedule/
    └── page.tsx                      🆕 À CRÉER (route retour Google Calendar)
```

---

## 🔧 ÉTAPES DE DÉVELOPPEMENT

---

### **ÉTAPE 4 : Services & Hook orchestrateur** (2h)

---

#### 4.1 - Service estimation durée IA (30 min)

**Fichier** : `features/schedule/services/ai-duration.service.ts`

**Objectif** : Analyser le contenu de la tâche pour suggérer une durée intelligente

**Fonction principale** :

```typescript
/**
 * Estime la durée d'une tâche via IA
 * @param taskContent - Le contenu de la tâche
 * @returns Durée estimée en minutes (15, 30 ou 60)
 */
export async function estimateTaskDuration(
  taskContent: string
): Promise<15 | 30 | 60>
```

**Logique d'implémentation** :

Option A - Simple (sans API IA) :
```typescript
// Règles heuristiques basiques
export function estimateTaskDuration(taskContent: string): 15 | 30 | 60 {
  const content = taskContent.toLowerCase()
  
  // Tâches rapides (15 min)
  const quickKeywords = ['appeler', 'envoyer', 'répondre', 'vérifier', 'checker']
  if (quickKeywords.some(k => content.includes(k))) {
    return 15
  }
  
  // Tâches longues (1h)
  const longKeywords = ['réunion', 'rendez-vous', 'atelier', 'formation', 'réfléchir']
  if (longKeywords.some(k => content.includes(k))) {
    return 60
  }
  
  // Par défaut (30 min)
  return 30
}
```

Option B - Avec OpenAI (si quota IA disponible) :
```typescript
export async function estimateTaskDuration(
  taskContent: string,
  userId: string
): Promise<15 | 30 | 60> {
  try {
    // Vérifier quota IA disponible
    const hasQuota = await checkAIQuota(userId)
    if (!hasQuota) {
      // Fallback sur règles heuristiques
      return estimateTaskDurationHeuristic(taskContent)
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant qui estime la durée des tâches. Réponds UNIQUEMENT avec 15, 30 ou 60.'
        },
        {
          role: 'user',
          content: `Estime la durée de cette tâche en minutes (15, 30 ou 60) : "${taskContent}"`
        }
      ],
      max_tokens: 10
    })
    
    const duration = parseInt(response.choices[0].message.content || '30')
    
    // Valider et coercer aux options valides
    if (duration <= 20) return 15
    if (duration <= 45) return 30
    return 60
    
  } catch (error) {
    console.error('Erreur estimation IA:', error)
    return estimateTaskDurationHeuristic(taskContent)
  }
}
```

**Recommandation** : Commencer avec Option A (heuristiques) pour MVP, ajouter Option B plus tard si nécessaire.

---

#### 4.2 - Hook useScheduling (1h30)

**Fichier** : `features/schedule/hooks/useScheduling.ts`

**Interface** :

```typescript
interface UseSchedulingParams {
  itemId: string
  taskContent: string
  mood?: 'energetic' | 'neutral' | 'tired'
}

interface UseSchedulingReturn {
  // État
  isLoading: boolean
  error: string | null
  slots: TimeSlot[]
  estimatedDuration: number
  suggestedContext: ItemContext | null
  selectedSlot: TimeSlot | null
  
  // Actions
  setDuration: (duration: number) => void
  setContext: (context: ItemContext) => void
  selectSlot: (slot: TimeSlot) => void
  loadSlots: () => Promise<void>
  scheduleTask: () => Promise<void>
}

export function useScheduling(params: UseSchedulingParams): UseSchedulingReturn
```

**Implémentation complète** :

```typescript
import { useState, useEffect } from 'react'
import { getOrCreateUserProfile, getConstraints } from '@/services/supabaseService'
import { getCalendarEvents, createCalendarEvent } from '@/features/schedule/services/calendar.service'
import { findAvailableSlots } from '@/features/schedule/services/slots.service'
import { estimateTaskDuration } from '@/features/schedule/services/ai-duration.service'
import type { TimeSlot } from '../types/scheduling.types'
import type { ItemContext } from '@/types'

export function useScheduling(params: UseSchedulingParams) {
  const { itemId, taskContent, mood } = params
  
  // ============================================
  // ÉTAT
  // ============================================
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [estimatedDuration, setEstimatedDuration] = useState<number>(30)
  const [suggestedContext, setSuggestedContext] = useState<ItemContext | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  
  // ============================================
  // ESTIMATION INITIALE
  // ============================================
  
  useEffect(() => {
    // Estimer la durée dès le chargement du hook
    const duration = estimateTaskDuration(taskContent)
    setEstimatedDuration(duration)
    
    // TODO: Estimer le contexte via IA aussi
    // Pour l'instant, laisser null (user choisit manuellement)
  }, [taskContent])
  
  // ============================================
  // ACTIONS
  // ============================================
  
  const setDuration = (duration: number) => {
    setEstimatedDuration(duration)
    // Recharger les créneaux avec la nouvelle durée
    loadSlots()
  }
  
  const setContext = (context: ItemContext) => {
    setSuggestedContext(context)
  }
  
  const selectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot)
  }
  
  /**
   * Charge les créneaux disponibles
   */
  const loadSlots = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 1. Récupérer le profil user (energy_moments)
      const profile = await getOrCreateUserProfile()
      
      // 2. Récupérer les contraintes horaires
      const constraints = await getConstraints()
      
      // 3. Récupérer les événements Google Calendar (7 jours)
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 7)
      
      const events = await getCalendarEvents(startDate, endDate)
      
      // 4. Trouver les créneaux libres
      const allSlots = await findAvailableSlots({
        durationMinutes: estimatedDuration,
        constraints,
        calendarEvents: events,
        startDate,
        endDate,
        energyMoments: profile.energy_moments || [],
        mood
      })
      
      // 5. Garder uniquement le TOP 3
      const top3 = allSlots.slice(0, 3)
      setSlots(top3)
      
      console.log('[useScheduling] Top 3 créneaux:', top3)
      
    } catch (err) {
      console.error('[useScheduling] Erreur loadSlots:', err)
      
      // Gestion erreurs spécifiques
      if (err instanceof Error) {
        if (err.message.includes('Google Calendar non connecté')) {
          setError('calendar_not_connected')
        } else if (err.message.includes('Session Google expirée')) {
          setError('calendar_session_expired')
        } else {
          setError(err.message)
        }
      } else {
        setError('Erreur lors de la recherche de créneaux')
      }
      
      setSlots([])
    } finally {
      setIsLoading(false)
    }
  }
  
  /**
   * Planifie la tâche dans le créneau sélectionné
   */
  const scheduleTask = async () => {
    if (!selectedSlot) {
      throw new Error('Aucun créneau sélectionné')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // 1. Créer l'événement dans Google Calendar
      const startDateTime = `${selectedSlot.date}T${selectedSlot.startTime}:00`
      const endDateTime = `${selectedSlot.date}T${selectedSlot.endTime}:00`
      
      console.log('[useScheduling] Création événement Calendar:', {
        summary: taskContent,
        startDateTime,
        endDateTime
      })
      
      const eventId = await createCalendarEvent({
        summary: taskContent,
        description: suggestedContext ? `Contexte: ${suggestedContext}` : undefined,
        startDateTime,
        endDateTime
      })
      
      console.log('[useScheduling] Événement créé:', eventId)
      
      // 2. Update l'item en DB
      const { updateItem } = await import('@/services/items.service')
      
      await updateItem(itemId, {
        state: 'planned',
        scheduled_at: startDateTime,
        google_event_id: eventId,
        context: suggestedContext || undefined
      })
      
      console.log('[useScheduling] Item mis à jour en DB')
      
    } catch (err) {
      console.error('[useScheduling] Erreur scheduleTask:', err)
      
      // Rollback si échec (supprimer l'événement Calendar si créé)
      // TODO: implémenter rollback si nécessaire
      
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erreur lors de la planification')
      }
      
      throw err
    } finally {
      setIsLoading(false)
    }
  }
  
  // ============================================
  // RETURN
  // ============================================
  
  return {
    isLoading,
    error,
    slots,
    estimatedDuration,
    suggestedContext,
    selectedSlot,
    setDuration,
    setContext,
    selectSlot,
    loadSlots,
    scheduleTask
  }
}
```

**Points clés** :
- Estimation durée automatique au mount
- Rechargement créneaux si durée change
- Top 3 créneaux uniquement
- Gestion erreurs spécifiques (Calendar non connecté, session expirée)
- Rollback à implémenter si échec création événement

---

### **ÉTAPE 5 : Composants UI** (3h)

---

#### 5.1 - DurationSelector (30 min)

**Fichier** : `features/schedule/components/DurationSelector.tsx`

```typescript
'use client'

import { cn } from '@/lib/utils'

interface DurationSelectorProps {
  value: number  // minutes
  onChange: (minutes: number) => void
  aiSuggested?: number  // Pour highlight la suggestion IA
}

const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1h' }
]

export function DurationSelector({ value, onChange, aiSuggested }: DurationSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-dark">
        Durée estimée
      </label>
      
      <div className="flex gap-2">
        {DURATIONS.map(duration => {
          const isSelected = value === duration.value
          const isAISuggested = aiSuggested === duration.value
          
          return (
            <button
              key={duration.value}
              onClick={() => onChange(duration.value)}
              className={cn(
                "flex-1 px-4 py-3 rounded-lg border-2 transition-all font-medium",
                "hover:shadow-sm active:scale-95",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 text-text-muted"
              )}
            >
              <div className="flex items-center justify-center gap-1">
                <span>{duration.label}</span>
                {isAISuggested && (
                  <span className="text-xs" title="Suggéré par l'IA">
                    ✨
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      
      {aiSuggested && (
        <p className="text-xs text-text-muted">
          💡 L'IA suggère {aiSuggested} min pour cette tâche
        </p>
      )}
    </div>
  )
}
```

---

#### 5.2 - ContextSelector (30 min)

**Fichier** : `features/schedule/components/ContextSelector.tsx`

```typescript
'use client'

import { cn } from '@/lib/utils'
import type { ItemContext } from '@/types'

interface ContextSelectorProps {
  value: ItemContext | null
  onChange: (context: ItemContext) => void
  aiSuggested?: ItemContext  // Pour highlight la suggestion IA
}

const CONTEXTS: Array<{
  value: ItemContext
  label: string
  icon: string
  color: string
}> = [
  { value: 'personal', label: 'Personnel', icon: '👤', color: 'blue' },
  { value: 'family', label: 'Famille', icon: '👨‍👩‍👧', color: 'green' },
  { value: 'work', label: 'Travail', icon: '💼', color: 'purple' },
  { value: 'health', label: 'Santé', icon: '🏃', color: 'red' }
]

export function ContextSelector({ value, onChange, aiSuggested }: ContextSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text-dark">
        Contexte
      </label>
      
      <div className="grid grid-cols-2 gap-2">
        {CONTEXTS.map(context => {
          const isSelected = value === context.value
          const isAISuggested = aiSuggested === context.value
          
          return (
            <button
              key={context.value}
              onClick={() => onChange(context.value)}
              className={cn(
                "px-3 py-2 rounded-lg border-2 transition-all",
                "hover:shadow-sm active:scale-95",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{context.icon}</span>
                <span className={cn(
                  "text-sm font-medium",
                  isSelected ? "text-primary" : "text-text-muted"
                )}>
                  {context.label}
                </span>
                {isAISuggested && (
                  <span className="text-xs ml-auto">✨</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      
      {aiSuggested && (
        <p className="text-xs text-text-muted">
          💡 L'IA suggère le contexte "{CONTEXTS.find(c => c.value === aiSuggested)?.label}"
        </p>
      )}
    </div>
  )
}
```

---

#### 5.3 - TimeSlotCard (45 min)

**Fichier** : `features/schedule/components/TimeSlotCard.tsx`

```typescript
'use client'

import { cn } from '@/lib/utils'
import type { TimeSlot } from '../types/scheduling.types'

interface TimeSlotCardProps {
  slot: TimeSlot
  rank: 1 | 2 | 3
  isSelected: boolean
  onSelect: () => void
}

const RANK_MEDALS = {
  1: '🥇',
  2: '🥈',
  3: '🥉'
}

export function TimeSlotCard({ slot, rank, isSelected, onSelect }: TimeSlotCardProps) {
  // Formater la date en français
  const date = new Date(slot.date)
  const isToday = date.toDateString() === new Date().toDateString()
  const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString()
  
  let dateLabel: string
  if (isToday) {
    dateLabel = "Aujourd'hui"
  } else if (isTomorrow) {
    dateLabel = "Demain"
  } else {
    dateLabel = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'short'
    })
  }
  
  // Couleur du score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }
  
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full p-4 rounded-xl border-2 transition-all text-left",
        "hover:shadow-md active:scale-[0.98]",
        isSelected
          ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Header avec médaille et score */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{RANK_MEDALS[rank]}</span>
          <div>
            <div className="font-semibold text-text-dark capitalize">
              {dateLabel}
            </div>
            <div className="text-base text-text-muted font-medium">
              {slot.startTime} → {slot.endTime}
            </div>
          </div>
        </div>
        
        <div className={cn(
          "text-xs font-semibold px-2 py-1 rounded",
          getScoreColor(slot.score)
        )}>
          {slot.score}
        </div>
      </div>
      
      {/* Raison */}
      <div className="text-xs text-text-muted flex items-start gap-1.5">
        <span>💡</span>
        <span className="flex-1">{slot.reason}</span>
      </div>
      
      {/* Indicateur sélection */}
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-primary/20">
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
              <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Créneau sélectionné</span>
          </div>
        </div>
      )}
    </button>
  )
}
```

---

#### 5.4 - SuccessModal (45 min)

**Fichier** : `features/schedule/components/SuccessModal.tsx`

```typescript
'use client'

import { useEffect } from 'react'

interface SuccessModalProps {
  taskContent: string
  scheduledDate: string  // Format: "Demain à 14h00"
  onClose: () => void
}

export function SuccessModal({ taskContent, scheduledDate, onClose }: SuccessModalProps) {
  // Auto-fermer après 2 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [onClose])
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-fadeIn">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-scale-in">
        {/* Icône animée */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
            <svg 
              width="40" 
              height="40" 
              viewBox="0 0 24 24" 
              fill="none" 
              className="text-green-600"
            >
              <path 
                d="M20 6L9 17L4 12" 
                stroke="currentColor" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        
        {/* Titre */}
        <h3 className="text-2xl font-bold text-center text-text-dark mb-2 font-quicksand">
          Tâche planifiée !
        </h3>
        
        {/* Description */}
        <p className="text-center text-text-muted mb-1">
          <span className="font-medium text-text-dark">"{taskContent}"</span>
        </p>
        <p className="text-center text-sm text-text-muted">
          ajoutée à ton calendrier {scheduledDate}
        </p>
      </div>
    </div>
  )
}
```

**Ajouter les animations dans globals.css** :

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.3s ease-out;
}
```

---

### **ÉTAPE 6 : Intégration dans CaptureModal** (2h)

---

#### 6.1 - Modification CaptureModal avec step system (1h30)

**Fichier** : `features/capture/components/CaptureModal.tsx`

**Objectif** : Transformer la modal en système à 2 étapes (organize → schedule) sans jamais fermer la modal

**Modifications à apporter** :

```typescript
'use client'

import { useState } from 'react'
import { useScheduling } from '@/features/schedule/hooks/useScheduling'
import { DurationSelector } from '@/features/schedule/components/DurationSelector'
import { ContextSelector } from '@/features/schedule/components/ContextSelector'
import { TimeSlotCard } from '@/features/schedule/components/TimeSlotCard'
import { SuccessModal } from '@/features/schedule/components/SuccessModal'
import { GoogleCalendarCTA } from '@/components/capture/GoogleCalendarCTA'
import { useGoogleCalendarStatus } from '@/hooks/useGoogleCalendarStatus'
import type { CaptureResult, Mood } from '@/types'

type ModalStep = 'organize' | 'schedule'

interface CaptureModalProps {
  captureResult: CaptureResult
  selectedMood: Mood | null
  onClose: () => void
  onSuccess: () => void
}

export function CaptureModal({
  captureResult,
  selectedMood,
  onClose,
  onSuccess
}: CaptureModalProps) {
  // État de la modal
  const [currentStep, setCurrentStep] = useState<ModalStep>('organize')
  const [savedItemId, setSavedItemId] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successData, setSuccessData] = useState<{ task: string; date: string } | null>(null)
  
  // Google Calendar status
  const { isConnected: isCalendarConnected } = useGoogleCalendarStatus()
  
  // Hook scheduling (initialisé uniquement si on passe en step 'schedule')
  const scheduling = useScheduling({
    itemId: savedItemId || '',
    taskContent: captureResult.content,
    mood: convertMoodToSchedulingMood(selectedMood)
  })
  
  // ============================================
  // HANDLERS STEP 'ORGANIZE'
  // ============================================
  
  const handlePlanAction = async () => {
    // 1. Sauvegarder l'item en DB (state: 'active' pour l'instant)
    const itemId = await saveItemToDatabase({
      type: captureResult.type,
      content: captureResult.content,
      mood: selectedMood,
      aiAnalysis: captureResult.aiAnalysis,
      state: 'active'
    })
    
    setSavedItemId(itemId)
    
    // 2. Passer à l'étape 'schedule'
    setCurrentStep('schedule')
    
    // 3. Charger les créneaux
    await scheduling.loadSlots()
  }
  
  // ============================================
  // HANDLERS STEP 'SCHEDULE'
  // ============================================
  
  const handleBack = () => {
    setCurrentStep('organize')
  }
  
  const handleSchedule = async () => {
    try {
      // Planifier la tâche
      await scheduling.scheduleTask()
      
      // Préparer les données pour la modal de succès
      const selectedSlot = scheduling.selectedSlot!
      const date = new Date(selectedSlot.date)
      const isToday = date.toDateString() === new Date().toDateString()
      const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString()
      
      let dateLabel: string
      if (isToday) {
        dateLabel = `aujourd'hui à ${selectedSlot.startTime}`
      } else if (isTomorrow) {
        dateLabel = `demain à ${selectedSlot.startTime}`
      } else {
        dateLabel = date.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'short'
        }) + ` à ${selectedSlot.startTime}`
      }
      
      setSuccessData({
        task: captureResult.content,
        date: dateLabel
      })
      
      // Afficher la modal de succès
      setShowSuccessModal(true)
      
      // Après 2 secondes, fermer tout et retourner à l'accueil
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
      
    } catch (error) {
      console.error('Erreur planification:', error)
      // L'erreur est déjà gérée dans useScheduling (state error)
    }
  }
  
  const handleConnectCalendar = async () => {
    // Sauvegarder le contexte dans sessionStorage
    sessionStorage.setItem('scheduleContext', JSON.stringify({
      itemId: savedItemId,
      taskContent: captureResult.content,
      estimatedDuration: scheduling.estimatedDuration,
      suggestedContext: scheduling.suggestedContext,
      mood: selectedMood,
      returnTo: 'schedule'
    }))
    
    // Rediriger vers onboarding step 4
    window.location.href = '/onboarding/step4'
  }
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <>
      {/* Modal principale */}
      <div className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
        "animate-fadeIn"
      )}>
        <div className={cn(
          "bg-white rounded-2xl shadow-2xl overflow-hidden",
          "animate-scale-in",
          // Full width en mode schedule
          currentStep === 'schedule' ? "w-full max-w-full" : "w-full max-w-md"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            {currentStep === 'schedule' && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            
            <h2 className="text-xl font-bold text-text-dark font-quicksand flex-1 text-center">
              {currentStep === 'organize' ? 'Organiser' : 'Planifier la tâche'}
            </h2>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className={cn(
            "p-6",
            currentStep === 'schedule' && "max-w-2xl mx-auto"
          )}>
            {currentStep === 'organize' && (
              <OrganizeContent
                captureResult={captureResult}
                onPlan={handlePlanAction}
                // ... autres props
              />
            )}
            
            {currentStep === 'schedule' && (
              <ScheduleContent
                taskContent={captureResult.content}
                scheduling={scheduling}
                isCalendarConnected={isCalendarConnected}
                onConnectCalendar={handleConnectCalendar}
                onSchedule={handleSchedule}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de succès */}
      {showSuccessModal && successData && (
        <SuccessModal
          taskContent={successData.task}
          scheduledDate={successData.date}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </>
  )
}

// ============================================
// COMPOSANT SCHEDULE CONTENT
// ============================================

interface ScheduleContentProps {
  taskContent: string
  scheduling: ReturnType<typeof useScheduling>
  isCalendarConnected: boolean
  onConnectCalendar: () => void
  onSchedule: () => void
}

function ScheduleContent({
  taskContent,
  scheduling,
  isCalendarConnected,
  onConnectCalendar,
  onSchedule
}: ScheduleContentProps) {
  const {
    isLoading,
    error,
    slots,
    estimatedDuration,
    suggestedContext,
    selectedSlot,
    setDuration,
    setContext,
    selectSlot
  } = scheduling
  
  return (
    <div className="space-y-6">
      {/* Tâche (lecture seule) */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-text-dark font-medium">
          "{taskContent}"
        </p>
      </div>
      
      {/* Durée estimée */}
      <DurationSelector
        value={estimatedDuration}
        onChange={setDuration}
        aiSuggested={estimatedDuration}  // La valeur initiale est la suggestion IA
      />
      
      {/* Contexte */}
      <ContextSelector
        value={suggestedContext}
        onChange={setContext}
        aiSuggested={suggestedContext}
      />
      
      <div className="border-t border-border pt-6">
        {/* Google Calendar non connecté */}
        {!isCalendarConnected && (
          <GoogleCalendarCTA
            onConnect={onConnectCalendar}
            isConnecting={false}
          />
        )}
        
        {/* Chargement */}
        {isCalendarConnected && isLoading && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-text-muted">
              🔍 Recherche des meilleurs créneaux...
            </p>
          </div>
        )}
        
        {/* Erreur */}
        {error && error !== 'calendar_not_connected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800 text-sm">
              ⚠️ {error}
            </p>
          </div>
        )}
        
        {/* Créneaux */}
        {isCalendarConnected && !isLoading && slots.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-text-dark mb-3">
              Créneaux suggérés
            </h3>
            
            {slots.map((slot, index) => (
              <TimeSlotCard
                key={`${slot.date}-${slot.startTime}`}
                slot={slot}
                rank={(index + 1) as 1 | 2 | 3}
                isSelected={selectedSlot?.date === slot.date && selectedSlot?.startTime === slot.startTime}
                onSelect={() => selectSlot(slot)}
              />
            ))}
          </div>
        )}
        
        {/* Aucun créneau */}
        {isCalendarConnected && !isLoading && slots.length === 0 && !error && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
            <p className="text-orange-800 text-sm">
              Aucun créneau disponible sur les 7 prochains jours
            </p>
            <p className="text-orange-600 text-xs mt-2">
              Essaye de modifier la durée ou tes contraintes horaires
            </p>
          </div>
        )}
      </div>
      
      {/* Actions */}
      {isCalendarConnected && slots.length > 0 && (
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => window.history.back()}
            className="flex-1 px-6 py-3 border-2 border-border rounded-lg font-medium text-text-dark hover:bg-gray-50 transition-colors"
          >
            Retour
          </button>
          
          <button
            onClick={onSchedule}
            disabled={!selectedSlot || isLoading}
            className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Planification...' : 'Planifier'}
          </button>
        </div>
      )}
    </div>
  )
}
```

---

#### 6.2 - Gestion retour après connexion Google Calendar (30 min)

**Fichier** : `app/onboarding/step4/page.tsx`

**Modification** : Ajouter la logique de retour après connexion

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { openGoogleAuthPopup, exchangeCodeForToken } from '@/lib/googleCalendar'
import { updateUserProfile } from '@/services/supabaseService'

export default function OnboardingStep4() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // 1. Connexion Google Calendar
      const code = await openGoogleAuthPopup()
      const tokens = await exchangeCodeForToken(code)

      // Ajouter expires_at
      const tokensWithExpiry = {
        ...tokens,
        expires_at: tokens.expires_at || (Date.now() + (tokens.expires_in * 1000))
      }

      localStorage.setItem('manae_google_tokens', JSON.stringify(tokensWithExpiry))
      
      // Notifier la connexion
      window.dispatchEvent(new CustomEvent('calendar-connection-changed', {
        detail: { connected: true }
      }))

      // 2. Marquer onboarding terminé
      await updateUserProfile({
        onboarding_completed: true
      })

      const onboardingData = localStorage.getItem('manae_onboarding')
      const parsedData = onboardingData ? JSON.parse(onboardingData) : {}
      localStorage.setItem('manae_onboarding', JSON.stringify({
        ...parsedData,
        step: 4,
        completed_at: new Date().toISOString()
      }))

      // 3. Vérifier si on doit retourner en planification
      const scheduleContext = sessionStorage.getItem('scheduleContext')
      
      if (scheduleContext) {
        const context = JSON.parse(scheduleContext)
        sessionStorage.removeItem('scheduleContext')
        
        // Rediriger vers la page de planification
        router.push(`/items/${context.itemId}/schedule`)
      } else {
        // Comportement normal
        router.push('/capture')
      }
      
    } catch (err) {
      console.error('Auth error:', err)
      setError('Une erreur est survenue lors de la connexion.')
    } finally {
      setIsLoading(false)
    }
  }
  
  // ... reste du code (handleBack, handleSkip, etc.)
}
```

**Fichier** : `app/items/[id]/schedule/page.tsx` (NOUVEAU)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useScheduling } from '@/features/schedule/hooks/useScheduling'
import { DurationSelector } from '@/features/schedule/components/DurationSelector'
import { ContextSelector } from '@/features/schedule/components/ContextSelector'
import { TimeSlotCard } from '@/features/schedule/components/TimeSlotCard'
import { SuccessModal } from '@/features/schedule/components/SuccessModal'

interface ScheduleContext {
  itemId: string
  taskContent: string
  estimatedDuration: number
  suggestedContext: string | null
  mood: string | null
}

export default function SchedulePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [context, setContext] = useState<ScheduleContext | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Récupérer le contexte depuis sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('scheduleContext')
    if (stored) {
      const parsed = JSON.parse(stored)
      setContext(parsed)
      sessionStorage.removeItem('scheduleContext')
    } else {
      // Pas de contexte, rediriger vers accueil
      router.push('/capture')
    }
  }, [router])
  
  const scheduling = useScheduling({
    itemId: context?.itemId || params.id,
    taskContent: context?.taskContent || '',
    mood: context?.mood as any
  })
  
  // Charger les créneaux au mount
  useEffect(() => {
    if (context) {
      scheduling.loadSlots()
    }
  }, [context])
  
  const handleSchedule = async () => {
    try {
      await scheduling.scheduleTask()
      setShowSuccess(true)
      
      setTimeout(() => {
        router.push('/capture')
      }, 2000)
    } catch (error) {
      console.error('Erreur planification:', error)
    }
  }
  
  if (!context) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted">Chargement...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-mint p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-text-dark mb-6 font-quicksand">
          Planifier la tâche
        </h1>
        
        {/* Même contenu que ScheduleContent dans CaptureModal */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-text-dark font-medium">
              "{context.taskContent}"
            </p>
          </div>
          
          <DurationSelector
            value={scheduling.estimatedDuration}
            onChange={scheduling.setDuration}
            aiSuggested={context.estimatedDuration}
          />
          
          <ContextSelector
            value={scheduling.suggestedContext}
            onChange={scheduling.setContext}
            aiSuggested={context.suggestedContext as any}
          />
          
          {/* Créneaux */}
          {scheduling.isLoading && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-text-muted">
                🔍 Recherche des meilleurs créneaux...
              </p>
            </div>
          )}
          
          {!scheduling.isLoading && scheduling.slots.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-text-dark mb-3">
                Créneaux suggérés
              </h3>
              
              {scheduling.slots.map((slot, index) => (
                <TimeSlotCard
                  key={`${slot.date}-${slot.startTime}`}
                  slot={slot}
                  rank={(index + 1) as 1 | 2 | 3}
                  isSelected={scheduling.selectedSlot?.date === slot.date}
                  onSelect={() => scheduling.selectSlot(slot)}
                />
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => router.push('/capture')}
              className="flex-1 px-6 py-3 border-2 border-border rounded-lg font-medium text-text-dark hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            
            <button
              onClick={handleSchedule}
              disabled={!scheduling.selectedSlot}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Planifier
            </button>
          </div>
        </div>
      </div>
      
      {showSuccess && (
        <SuccessModal
          taskContent={context.taskContent}
          scheduledDate="bientôt"
          onClose={() => setShowSuccess(false)}
        />
      )}
    </div>
  )
}
```

---

### **ÉTAPE 7 : Tests & Edge Cases** (1h)

---

#### 7.1 - Scénarios de test manuels

**Test 1 : Flow normal complet**
1. Capturer une tâche : "Appeler le dentiste"
2. Cliquer "Planifier"
3. Vérifier :
   - Durée suggérée = 15 min (appel rapide)
   - 3 créneaux affichés avec médailles
   - Contexte suggéré (santé si IA activée)
4. Modifier durée → 30 min
5. Vérifier que les créneaux se rechargent
6. Sélectionner le 2ème créneau
7. Cliquer "Planifier"
8. Vérifier :
   - Modal succès s'affiche 2 secondes
   - Retour à /capture
   - Événement créé dans Google Calendar
   - Item en DB avec state='planned'

**Test 2 : Google Calendar non connecté**
1. Déconnecter Google Calendar (localStorage)
2. Capturer une tâche
3. Cliquer "Planifier"
4. Vérifier :
   - CTA "Connecter Google Calendar" s'affiche
   - Pas de créneaux
5. Cliquer "Connecter"
6. Valider dans popup Google
7. Vérifier :
   - Retour automatique sur /items/{id}/schedule
   - Créneaux chargés
   - Peut planifier normalement

**Test 3 : Aucun créneau disponible**
1. Ajouter beaucoup de contraintes (bloquer presque tout)
2. Capturer une tâche avec durée 60 min
3. Cliquer "Planifier"
4. Vérifier :
   - Message "Aucun créneau disponible"
   - Suggestion de modifier durée/contraintes

**Test 4 : Gestion erreurs**
1. Déconnecter internet
2. Essayer de planifier
3. Vérifier message d'erreur clair
4. Reconnecter
5. Réessayer → doit fonctionner

---

#### 7.2 - Service items.service.ts

**Fichier** : `services/items.service.ts` (NOUVEAU)

```typescript
import { createClient } from '@/lib/supabase/client'
import type { Item, ItemType, ItemState, ItemContext } from '@/types'

/**
 * Crée un nouvel item en DB
 */
export async function createItem(params: {
  userId: string
  type: ItemType
  content: string
  state: ItemState
  mood?: string
  aiAnalysis?: any
  context?: ItemContext
}): Promise<string> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: params.userId,
      type: params.type,
      content: params.content,
      state: params.state,
      mood: params.mood,
      ai_analysis: params.aiAnalysis,
      context: params.context
    })
    .select('id')
    .single()
  
  if (error) throw error
  
  return data.id
}

/**
 * Met à jour un item existant
 */
export async function updateItem(
  itemId: string,
  updates: {
    state?: ItemState
    scheduled_at?: string
    google_event_id?: string
    context?: ItemContext
  }
): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('items')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', itemId)
  
  if (error) throw error
}

/**
 * Récupère un item par ID
 */
export async function getItem(itemId: string): Promise<Item | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  
  return data as Item
}
```

---

## ✅ CHECKLIST COMPLÈTE

### Services
- [ ] `ai-duration.service.ts` : estimateTaskDuration()
- [ ] `items.service.ts` : createItem(), updateItem(), getItem()

### Hooks
- [ ] `useScheduling.ts` : loadSlots(), scheduleTask(), gestion état complet

### Composants
- [ ] `DurationSelector.tsx` : 3 options (15, 30, 60), highlight IA
- [ ] `ContextSelector.tsx` : 4 options, éditable, highlight IA
- [ ] `TimeSlotCard.tsx` : médailles, score, raison, sélection
- [ ] `SuccessModal.tsx` : animation, auto-fermeture 2s

### Intégration
- [ ] `CaptureModal.tsx` : step system (organize → schedule)
- [ ] Modal full-width en mode schedule
- [ ] Gestion Calendar non connecté
- [ ] `app/onboarding/step4/page.tsx` : retour après connexion
- [ ] `app/items/[id]/schedule/page.tsx` : route dédiée planification

### Tests
- [ ] Flow normal complet : capture → plan → vérif Calendar + DB
- [ ] Calendar non connecté → connexion → retour context
- [ ] Aucun créneau disponible → message clair
- [ ] Modification durée → reload créneaux
- [ ] Erreurs API → messages clairs

---

## 🎯 ORDRE DE DÉVELOPPEMENT RECOMMANDÉ

**Session 1 (1h30)** : Services & Hook
1. ai-duration.service.ts (30 min)
2. items.service.ts (30 min)
3. useScheduling.ts (30 min)

**Session 2 (2h)** : Composants UI
1. DurationSelector.tsx (30 min)
2. ContextSelector.tsx (30 min)
3. TimeSlotCard.tsx (30 min)
4. SuccessModal.tsx (30 min)

**Session 3 (2h)** : Intégration
1. CaptureModal step system (1h)
2. Route /items/[id]/schedule (30 min)
3. Onboarding step4 retour (30 min)

**Session 4 (1h)** : Tests
1. Tests manuels scénarios 1-4
2. Corrections bugs
3. Polish animations

**Total** : ~6h30

---

## 🚀 POUR CLAUDE CODE

**Commence par la Session 1** : Services & Hook

Crée dans l'ordre :
1. `features/schedule/services/ai-duration.service.ts`
2. `services/items.service.ts`
3. `features/schedule/hooks/useScheduling.ts`

Une fois ces 3 fichiers créés et validés, passe à la Session 2.

**Respecte SOLID, DRY, et les conventions du projet (voir CLAUDE.md).**

GO ! 💪
