// features/schedule/services/slots.service.ts

import type { GoogleCalendarEvent, TimeSlot } from '../types/scheduling.types'
import type { Constraint } from '@/types'
import type { TemporalConstraint, TemporalUrgency } from '@/types/items'

// ============================================
// TYPES INTERNES
// ============================================

interface TimelineBlock {
  type: 'FREE' | 'BUSY_CONSTRAINT' | 'BUSY_EVENT'
  startTime: string  // HH:mm
  endTime: string    // HH:mm
  reason?: string
}

interface DayBounds {
  start: string  // HH:mm (ex: "08:00")
  end: string    // HH:mm (ex: "22:00")
}

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_DAY_BOUNDS: DayBounds = {
  start: '08:00',
  end: '22:00'
}

const MIN_SLOT_DURATION = 30 // minutes minimum pour un créneau

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
}

// Pondération du scoring selon l'urgence
// Plus l'urgence est élevée, moins on optimise les préférences
const URGENCY_WEIGHTS: Record<TemporalUrgency, { energy: number; mood: number }> = {
  critical: { energy: 0.1, mood: 0.1 },  // On prend ce qui est dispo
  high: { energy: 0.3, mood: 0.2 },
  medium: { energy: 0.6, mood: 0.5 },
  low: { energy: 1.0, mood: 1.0 }        // Optimisation maximale
}

// ============================================
// UTILITAIRES TEMPS
// ============================================

/**
 * Convertit "HH:mm" en minutes depuis minuit
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Convertit minutes depuis minuit en "HH:mm"
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Formatte une date en "YYYY-MM-DD"
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Obtient le nom du jour en anglais minuscule
 */
function getDayName(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[date.getDay()]
}

// ============================================
// LOGIQUE CONTRAINTES
// ============================================

/**
 * Récupère les contraintes actives pour un jour donné
 */
function getConstraintsForDay(constraints: Constraint[], date: Date): Constraint[] {
  const dayName = getDayName(date)
  return constraints.filter(c => c.days.includes(dayName))
}

/**
 * Convertit les contraintes en blocs BUSY
 */
function constraintsToBlocks(constraints: Constraint[]): TimelineBlock[] {
  return constraints.map(c => ({
    type: 'BUSY_CONSTRAINT' as const,
    startTime: c.start_time,
    endTime: c.end_time,
    reason: c.name
  }))
}

// ============================================
// LOGIQUE ÉVÉNEMENTS CALENDAR
// ============================================

/**
 * Récupère les événements du calendrier pour un jour donné
 */
function getEventsForDay(events: GoogleCalendarEvent[], date: Date): GoogleCalendarEvent[] {
  const dateStr = formatDate(date)

  return events.filter(event => {
    // Événement avec date/heure
    if (event.start.dateTime) {
      const eventDate = event.start.dateTime.split('T')[0]
      return eventDate === dateStr
    }
    // Événement journée entière
    if (event.start.date) {
      return event.start.date === dateStr
    }
    return false
  })
}

/**
 * Convertit les événements Google Calendar en blocs BUSY
 */
function eventsToBlocks(events: GoogleCalendarEvent[]): TimelineBlock[] {
  return events
    .filter(e => e.start.dateTime && e.end.dateTime) // Ignore les événements journée entière
    .map(event => {
      const startTime = event.start.dateTime!.split('T')[1].substring(0, 5)
      const endTime = event.end.dateTime!.split('T')[1].substring(0, 5)

      return {
        type: 'BUSY_EVENT' as const,
        startTime,
        endTime,
        reason: event.summary || 'Événement calendrier'
      }
    })
}

// ============================================
// TIMELINE & CRÉNEAUX LIBRES
// ============================================

/**
 * Fusionne et trie tous les blocs busy, puis calcule les créneaux libres
 */
function findFreeBlocks(
  busyBlocks: TimelineBlock[],
  dayBounds: DayBounds = DEFAULT_DAY_BOUNDS
): TimelineBlock[] {
  if (busyBlocks.length === 0) {
    return [{
      type: 'FREE',
      startTime: dayBounds.start,
      endTime: dayBounds.end
    }]
  }

  // Trier les blocs busy par heure de début
  const sortedBusy = [...busyBlocks].sort((a, b) =>
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  )

  // Fusionner les blocs qui se chevauchent
  const mergedBusy: TimelineBlock[] = []
  let current = { ...sortedBusy[0] }

  for (let i = 1; i < sortedBusy.length; i++) {
    const next = sortedBusy[i]
    const currentEnd = timeToMinutes(current.endTime)
    const nextStart = timeToMinutes(next.startTime)

    if (nextStart <= currentEnd) {
      // Chevauchement → fusionner
      current.endTime = minutesToTime(Math.max(currentEnd, timeToMinutes(next.endTime)))
    } else {
      mergedBusy.push(current)
      current = { ...next }
    }
  }
  mergedBusy.push(current)

  // Calculer les créneaux libres
  const freeBlocks: TimelineBlock[] = []
  const dayStart = timeToMinutes(dayBounds.start)
  const dayEnd = timeToMinutes(dayBounds.end)
  let cursor = dayStart

  for (const busy of mergedBusy) {
    const busyStart = timeToMinutes(busy.startTime)
    const busyEnd = timeToMinutes(busy.endTime)

    // Bloc libre avant le busy (si dans les limites de la journée)
    if (cursor < busyStart && busyStart > dayStart) {
      const freeStart = Math.max(cursor, dayStart)
      const freeEnd = Math.min(busyStart, dayEnd)
      if (freeEnd > freeStart) {
        freeBlocks.push({
          type: 'FREE',
          startTime: minutesToTime(freeStart),
          endTime: minutesToTime(freeEnd)
        })
      }
    }

    cursor = Math.max(cursor, busyEnd)
  }

  // Bloc libre après le dernier busy
  if (cursor < dayEnd) {
    freeBlocks.push({
      type: 'FREE',
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(dayEnd)
    })
  }

  return freeBlocks
}

// ============================================
// SCORING DES CRÉNEAUX
// ============================================

interface ScoringContext {
  energyMoments: string[]
  mood: string
  urgency?: TemporalUrgency
}

/**
 * Calcule un score pour un créneau selon les préférences utilisateur
 * Le score est pondéré par l'urgence : plus c'est urgent, moins on optimise
 */
function scoreSlot(
  startTime: string,
  endTime: string,
  context: ScoringContext
): { score: number; reason: string } {
  let score = 50 // Score de base
  const reasons: string[] = []

  const startMinutes = timeToMinutes(startTime)
  const hour = Math.floor(startMinutes / 60)

  // Récupérer les poids selon l'urgence
  const urgency = context.urgency || 'low'
  const weights = URGENCY_WEIGHTS[urgency]

  // Déterminer le moment de la journée
  let moment: string
  if (hour < 12) {
    moment = 'morning'
  } else if (hour < 14) {
    moment = 'noon'
  } else if (hour < 18) {
    moment = 'afternoon'
  } else {
    moment = 'evening'
  }

  // Bonus si le créneau correspond aux moments d'énergie préférés (pondéré)
  if (context.energyMoments.length === 0 || context.energyMoments.includes(moment)) {
    const bonus = Math.round(20 * weights.energy)
    score += bonus
    if (bonus > 5) reasons.push('Moment d\'énergie favorable')
  }

  // Bonus/malus selon le mood (pondéré)
  const moodBonus = Math.round(15 * weights.mood)
  switch (context.mood) {
    case 'energetic':
      if (hour >= 8 && hour < 12) {
        score += moodBonus
        if (moodBonus > 5) reasons.push('Matin idéal')
      }
      break
    case 'calm':
      if (hour >= 14 && hour < 18) {
        score += moodBonus
        if (moodBonus > 5) reasons.push('Après-midi propice')
      }
      break
    case 'tired':
      if (hour >= 10 && hour < 16) {
        score += Math.round(10 * weights.mood)
        if (weights.mood > 0.5) reasons.push('Adapté à la fatigue')
      }
      break
    case 'overwhelmed':
      score += Math.round(5 * weights.mood)
      break
  }

  // Bonus pour les créneaux en dehors des heures de repas
  if ((hour < 12 || hour >= 14) && (hour < 19 || hour >= 20)) {
    score += 5
  }

  // Pour les urgences critiques, ajouter un message spécifique
  if (urgency === 'critical') {
    reasons.unshift('Premier créneau disponible')
  } else if (urgency === 'high') {
    reasons.unshift('Avant la deadline')
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reason: reasons.length > 0 ? reasons.join(', ') : 'Créneau disponible'
  }
}

// ============================================
// FILTRAGE CONTRAINTES TEMPORELLES (HARD)
// ============================================

/**
 * Filtre les créneaux selon les contraintes temporelles HARD
 * Ces contraintes sont non-négociables (deadline, fixed_date, etc.)
 */
function filterSlotsByTemporalConstraint(
  slots: TimeSlot[],
  constraint: TemporalConstraint | null | undefined
): TimeSlot[] {
  if (!constraint) return slots

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (constraint.type) {
    case 'deadline': {
      // Garder UNIQUEMENT les créneaux AVANT la deadline
      if (!constraint.date) return slots
      const deadline = new Date(constraint.date)
      deadline.setHours(23, 59, 59, 999)

      return slots.filter(slot => {
        const slotDate = new Date(slot.date)
        return slotDate <= deadline
      })
    }

    case 'fixed_date': {
      // Garder UNIQUEMENT les créneaux du jour spécifié
      if (!constraint.date) return slots
      const targetDate = constraint.date

      return slots.filter(slot => slot.date === targetDate)
    }

    case 'start_date': {
      // Garder UNIQUEMENT les créneaux APRÈS la date de début
      if (!constraint.startDate) return slots
      const startDate = new Date(constraint.startDate)
      startDate.setHours(0, 0, 0, 0)

      return slots.filter(slot => {
        const slotDate = new Date(slot.date)
        return slotDate >= startDate
      })
    }

    case 'time_range': {
      // Garder les créneaux dans la plage
      const rangeStart = constraint.startDate ? new Date(constraint.startDate) : today
      const rangeEnd = constraint.endDate ? new Date(constraint.endDate) : new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      rangeStart.setHours(0, 0, 0, 0)
      rangeEnd.setHours(23, 59, 59, 999)

      return slots.filter(slot => {
        const slotDate = new Date(slot.date)
        return slotDate >= rangeStart && slotDate <= rangeEnd
      })
    }

    case 'asap': {
      // Pour les urgences, prendre les 3-5 premiers créneaux disponibles
      // Tri par date/heure croissante (le plus tôt possible)
      const sorted = [...slots].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare !== 0) return dateCompare
        return a.startTime.localeCompare(b.startTime)
      })
      return sorted.slice(0, 5)
    }

    default:
      return slots
  }
}

// ============================================
// API PRINCIPALE
// ============================================

export interface FindSlotsParams {
  durationMinutes: number
  constraints: Constraint[]
  calendarEvents: GoogleCalendarEvent[]
  startDate: Date
  endDate: Date
  energyMoments?: string[]
  mood?: string
  dayBounds?: DayBounds
  temporalConstraint?: TemporalConstraint | null
  taskContent?: string  // Pour détecter les contraintes de service
}

/**
 * Trouve tous les créneaux disponibles sur une période
 * en tenant compte des contraintes et événements calendrier
 *
 * Architecture à 2 niveaux :
 * 1. HARD constraints : filtrage des créneaux impossibles (temporalConstraint, calendar, availability)
 * 2. SOFT preferences : scoring des créneaux restants (energy, mood, cognitive)
 */
export async function findAvailableSlots(params: FindSlotsParams): Promise<TimeSlot[]> {
  const {
    durationMinutes,
    constraints,
    calendarEvents,
    startDate,
    endDate,
    energyMoments = [],
    mood = 'calm',
    dayBounds = DEFAULT_DAY_BOUNDS,
    temporalConstraint = null,
    taskContent = ''
  } = params

  // Détecter les contraintes de service depuis le contenu de la tâche
  const serviceConstraints = taskContent ? detectServiceConstraints(taskContent) : null

  if (serviceConstraints) {
    console.log('[slots.service] Contraintes de service détectées:', serviceConstraints.type)
  }

  // Récupérer l'urgence pour le scoring
  const urgency = temporalConstraint?.urgency || 'low'

  const slots: TimeSlot[] = []
  const currentDate = new Date(startDate)

  // Parcourir chaque jour de la période
  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate)

    // 1. Récupérer les contraintes du jour (HARD)
    const dayConstraints = getConstraintsForDay(constraints, currentDate)
    const constraintBlocks = constraintsToBlocks(dayConstraints)

    // 2. Récupérer les événements du jour (HARD)
    const dayEvents = getEventsForDay(calendarEvents, currentDate)
    const eventBlocks = eventsToBlocks(dayEvents)

    // 3. Combiner tous les blocs busy
    const allBusyBlocks = [...constraintBlocks, ...eventBlocks]

    // 4. Calculer les créneaux libres
    const freeBlocks = findFreeBlocks(allBusyBlocks, dayBounds)

    // 5. Découper en créneaux de la durée demandée
    for (const free of freeBlocks) {
      const freeStart = timeToMinutes(free.startTime)
      const freeEnd = timeToMinutes(free.endTime)
      const freeDuration = freeEnd - freeStart

      // Si le bloc libre est assez grand
      if (freeDuration >= durationMinutes) {
        // Créer des créneaux toutes les 30 minutes
        let slotStart = freeStart

        while (slotStart + durationMinutes <= freeEnd) {
          const slotEnd = slotStart + durationMinutes
          const startTime = minutesToTime(slotStart)
          const endTime = minutesToTime(slotEnd)

          // Scorer le créneau (SOFT - pondéré par urgence)
          const { score, reason } = scoreSlot(startTime, endTime, {
            energyMoments,
            mood,
            urgency
          })

          slots.push({
            date: dateStr,
            startTime,
            endTime,
            durationMinutes,
            score,
            reason
          })

          slotStart += MIN_SLOT_DURATION // Avancer de 30 minutes
        }
      }
    }

    // Passer au jour suivant
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // 6. Appliquer le filtrage HARD des contraintes temporelles
  let filteredSlots = filterSlotsByTemporalConstraint(slots, temporalConstraint)

  // 7. Appliquer le filtrage HARD des contraintes de service
  filteredSlots = filterSlotsByServiceConstraints(filteredSlots, serviceConstraints)

  if (serviceConstraints && filteredSlots.length < slots.length) {
    console.log(`[slots.service] Filtrage service ${serviceConstraints.type}: ${slots.length} → ${filteredSlots.length} créneaux`)
  }

  // 8. Trier par score décroissant (sauf pour ASAP qui trie par date)
  if (temporalConstraint?.type === 'asap') {
    // Pour ASAP, déjà trié par date dans filterSlotsByTemporalConstraint
    return filteredSlots
  }

  return filteredSlots.sort((a, b) => b.score - a.score)
}

/**
 * Trouve le meilleur créneau disponible
 */
export async function findBestSlot(params: FindSlotsParams): Promise<TimeSlot | null> {
  const slots = await findAvailableSlots(params)
  return slots.length > 0 ? slots[0] : null
}

// ============================================
// CONTRAINTES DE SERVICE
// ============================================

// Type pour les contraintes de service
interface ServiceConstraints {
  type: 'medical' | 'administrative' | 'commercial'
  openDays: string[]
  openHours: { start: string; end: string }
}

/**
 * Détecte le type de service et ses contraintes horaires
 */
function detectServiceConstraints(taskContent: string): ServiceConstraints | null {
  const content = taskContent.toLowerCase()
  
  // Services médicaux (fermés week-end, 9h-18h)
  const medicalKeywords = [
    'médecin', 'dentiste', 'pédiatre', 'docteur', 'rdv médical',
    'clinique', 'hôpital', 'cabinet', 'ophtalmo', 'dermato',
    'kiné', 'ostéo', 'radiologue', 'labo', 'laboratoire'
  ]
  
  if (medicalKeywords.some(k => content.includes(k))) {
    return {
      type: 'medical',
      openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      openHours: { start: '09:00', end: '18:00' }
    }
  }
  
  // Services administratifs (fermés week-end, 9h-17h)
  const adminKeywords = [
    'mairie', 'préfecture', 'caf', 'pôle emploi', 'sécurité sociale',
    'banque', 'notaire', 'avocat', 'assurance', 'impôts'
  ]
  
  if (adminKeywords.some(k => content.includes(k))) {
    return {
      type: 'administrative',
      openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      openHours: { start: '09:00', end: '17:00' }
    }
  }
  
  // Commerces (fermés dimanche, certains samedi)
  const commercialKeywords = [
    'magasin', 'boutique', 'acheter', 'courses', 'supermarché',
    'boulangerie', 'pharmacie', 'pressing', 'coiffeur'
  ]
  
  if (commercialKeywords.some(k => content.includes(k))) {
    return {
      type: 'commercial',
      openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      openHours: { start: '09:00', end: '19:00' }
    }
  }
  
  // Pas de contrainte détectée
  return null
}

/**
 * Filtre les créneaux selon les contraintes de service (HARD)
 * Élimine les créneaux où le service est fermé
 */
function filterSlotsByServiceConstraints(
  slots: TimeSlot[],
  serviceConstraints: ServiceConstraints | null
): TimeSlot[] {
  if (!serviceConstraints) return slots

  return slots.filter(slot => {
    // Vérifier que c'est un jour d'ouverture
    const slotDate = new Date(slot.date)
    const dayName = getDayName(slotDate)

    if (!serviceConstraints.openDays.includes(dayName)) {
      return false // Service fermé ce jour
    }

    // Vérifier que c'est dans les heures d'ouverture
    const slotStart = timeToMinutes(slot.startTime)
    const slotEnd = timeToMinutes(slot.endTime)
    const serviceStart = timeToMinutes(serviceConstraints.openHours.start)
    const serviceEnd = timeToMinutes(serviceConstraints.openHours.end)

    // Le créneau doit être entièrement dans les heures d'ouverture
    return slotStart >= serviceStart && slotEnd <= serviceEnd
  })
}

// ============================================
// DIVERSIFICATION DES CRÉNEAUX
// ============================================

/**
 * Sélectionne 3 créneaux diversifiés :
 * - Le meilleur score
 * - Un 2ème avec au moins 2h d'écart OU autre jour
 * - Un 3ème sur un jour différent si possible
 */
export function selectTop3Diversified(allSlots: TimeSlot[]): TimeSlot[] {
  if (allSlots.length === 0) return []
  if (allSlots.length === 1) {
    return [{ ...allSlots[0], label: 'Meilleur moment' }]
  }
  if (allSlots.length === 2) {
    return [
      { ...allSlots[0], label: 'Meilleur moment' },
      { ...allSlots[1], label: allSlots[1].date !== allSlots[0].date ? 'Autre jour' : 'Alternative' }
    ]
  }

  const selected: TimeSlot[] = []

  // 1️⃣ MEILLEUR créneau (score le plus élevé)
  selected.push({ ...allSlots[0], label: 'Meilleur moment' })

  // 2️⃣ DEUXIÈME créneau : même jour +2h OU autre jour
  const slot1Date = allSlots[0].date
  const slot1Minutes = timeToMinutes(allSlots[0].startTime)

  // Chercher d'abord un créneau le même jour avec 2h+ d'écart
  const sameDayAlternative = allSlots.find((slot, index) => {
    if (index === 0) return false // Skip le premier
    if (slot.date !== slot1Date) return false

    const slotMinutes = timeToMinutes(slot.startTime)
    const gap = Math.abs(slotMinutes - slot1Minutes)

    return gap >= 120 // 2h minimum
  })

  if (sameDayAlternative) {
    selected.push({ ...sameDayAlternative, label: 'Alternative même jour' })
  } else {
    // Sinon, prendre le meilleur créneau d'un autre jour
    const otherDay = allSlots.find((slot, index) => {
      if (index === 0) return false
      return slot.date !== slot1Date
    })

    if (otherDay) {
      selected.push({ ...otherDay, label: 'Lendemain' })
    } else {
      // Fallback : prendre le 2ème meilleur score même s'il est proche
      selected.push({ ...allSlots[1], label: 'Alternative' })
    }
  }

  // 3️⃣ TROISIÈME créneau : jour différent des 2 premiers
  const usedDates = selected.map(s => s.date)

  const thirdSlot = allSlots.find(slot => {
    if (selected.some(s => s.date === slot.date && s.startTime === slot.startTime)) return false
    return !usedDates.includes(slot.date)
  })

  if (thirdSlot) {
    selected.push({ ...thirdSlot, label: 'Autre jour' })
  } else {
    // Fallback : prendre le meilleur score restant avec gap minimum
    const remaining = allSlots.filter(slot =>
      !selected.some(s => s.date === slot.date && s.startTime === slot.startTime)
    )

    const withGap = remaining.find(slot => {
      const slotMinutes = timeToMinutes(slot.startTime)

      // Vérifier qu'il y a au moins 1h d'écart avec tous les slots déjà sélectionnés
      return selected.every(s => {
        if (s.date !== slot.date) return true // Autre jour = OK

        const sMinutes = timeToMinutes(s.startTime)
        const gap = Math.abs(slotMinutes - sMinutes)
        return gap >= 60 // 1h minimum
      })
    })

    if (withGap) {
      selected.push({ ...withGap, label: 'Alternative' })
    } else if (remaining.length > 0) {
      // Dernier fallback : prendre ce qui reste
      selected.push({ ...remaining[0], label: 'Alternative' })
    }
  }

  return selected
}