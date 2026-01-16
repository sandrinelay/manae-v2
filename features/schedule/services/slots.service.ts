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
 * Détecte le moment de journée depuis rawPattern ou le contenu
 * Retourne les bornes horaires correspondantes (en minutes)
 */
function detectTimeOfDayFromPattern(rawPattern?: string): { start: number; end: number } | null {
  if (!rawPattern) return null

  const pattern = rawPattern.toLowerCase()

  // Détection des moments de journée
  if (pattern.includes('après-midi') || pattern.includes('apres-midi') || pattern.includes('aprèm')) {
    return { start: 12 * 60, end: 18 * 60 }  // 12h-18h
  }
  if (pattern.includes('matin') && !pattern.includes('fin de matin')) {
    return { start: 8 * 60, end: 12 * 60 }   // 8h-12h
  }
  if (pattern.includes('fin de matin')) {
    return { start: 10 * 60, end: 12 * 60 }  // 10h-12h
  }
  if (pattern.includes('midi')) {
    return { start: 11 * 60 + 30, end: 14 * 60 }  // 11h30-14h
  }
  if (pattern.includes('soir')) {
    return { start: 18 * 60, end: 22 * 60 }  // 18h-22h
  }
  if (pattern.includes('fin d\'après-midi') || pattern.includes('fin après-midi')) {
    return { start: 16 * 60, end: 19 * 60 }  // 16h-19h
  }

  return null
}

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

      // Vérifier si l'heure est incluse dans la date ISO (ex: "2025-12-28T11:00:00")
      const hasTime = constraint.date.includes('T')
      const deadline = new Date(constraint.date)

      if (!hasTime) {
        // Si pas d'heure spécifiée, prendre fin de journée
        deadline.setHours(23, 59, 59, 999)
      }

      return slots.filter(slot => {
        // Construire la date/heure complète du créneau (fin du créneau doit être avant deadline)
        const slotDateTime = new Date(`${slot.date}T${slot.endTime}:00`)
        return slotDateTime <= deadline
      })
    }

    case 'fixed_date': {
      // Garder UNIQUEMENT les créneaux du jour spécifié, proches de l'heure demandée
      if (!constraint.date) return slots

      // Vérifier si l'heure est incluse (ex: "2025-12-28T14:00:00")
      const hasTime = constraint.date.includes('T')

      console.log('[filterSlotsByTemporalConstraint] fixed_date:', {
        date: constraint.date,
        hasTime,
        slotsCount: slots.length
      })

      if (hasTime) {
        const targetDateTime = new Date(constraint.date)
        const targetDateStr = constraint.date.split('T')[0]
        const targetHour = targetDateTime.getHours()
        const targetMinutes = targetHour * 60 + targetDateTime.getMinutes()

        console.log('[filterSlotsByTemporalConstraint] fixed_date details:', {
          targetDateStr,
          targetHour,
          targetMinutes,
          slotsForDate: slots.filter(s => s.date === targetDateStr).length
        })

        // Pour un RDV précis (ex: "réunion mardi 14h"), on veut un créneau
        // qui commence à cette heure ou dans les 60 minutes qui suivent
        const filteredSlots = slots.filter(slot => {
          if (slot.date !== targetDateStr) return false
          const slotStart = timeToMinutes(slot.startTime)
          const diff = slotStart - targetMinutes
          return diff >= 0 && diff <= 60
        })

        console.log('[filterSlotsByTemporalConstraint] fixed_date filtered:', {
          targetMinutes,
          filteredCount: filteredSlots.length
        })

        return filteredSlots
      }

      // Sans heure dans la date ISO, essayer de détecter le moment depuis rawPattern
      const targetDate = constraint.date.split('T')[0]
      const timeOfDayRange = detectTimeOfDayFromPattern(constraint.rawPattern)

      if (timeOfDayRange) {
        console.log('[slots.service] Fallback: moment détecté depuis rawPattern:', constraint.rawPattern, '→', timeOfDayRange)
        return slots.filter(slot => {
          if (slot.date !== targetDate) return false
          const slotStart = timeToMinutes(slot.startTime)
          const slotEnd = timeToMinutes(slot.endTime)
          return slotStart >= timeOfDayRange.start && slotEnd <= timeOfDayRange.end
        })
      }

      // Vraiment sans indication horaire, garder tous les créneaux du jour
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
      // Garder les créneaux dans la plage date ET heure
      // Exemple: "mardi avant 14h" → start_date=mardi 08:00, end_date=mardi 14:00
      const rangeStart = constraint.startDate ? new Date(constraint.startDate) : today
      const rangeEnd = constraint.endDate ? new Date(constraint.endDate) : new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

      // Extraire les dates et heures limites
      const rangeStartDate = rangeStart.toISOString().split('T')[0]
      const rangeEndDate = rangeEnd.toISOString().split('T')[0]
      const rangeStartTime = rangeStart.toTimeString().slice(0, 5) // "08:00"
      const rangeEndTime = rangeEnd.toTimeString().slice(0, 5)     // "14:00"

      console.log('[filterSlotsByTemporalConstraint] time_range:', {
        rangeStartDate, rangeStartTime, rangeEndDate, rangeEndTime
      })

      return slots.filter(slot => {
        // Vérifier la date d'abord
        if (slot.date < rangeStartDate || slot.date > rangeEndDate) {
          return false
        }

        // Si même jour que start, vérifier que le créneau ne commence pas trop tôt
        if (slot.date === rangeStartDate && slot.startTime < rangeStartTime) {
          return false
        }

        // Si même jour que end, vérifier que le créneau se termine avant la limite
        // Le créneau doit FINIR avant l'heure limite (pas juste commencer)
        if (slot.date === rangeEndDate && slot.endTime > rangeEndTime) {
          return false
        }

        return true
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
  ignoreServiceConstraints?: boolean  // Pour forcer l'affichage sans filtrage service
}

// Résultat enrichi avec métadonnées
export interface FindSlotsResult {
  slots: TimeSlot[]
  serviceConstraint?: {
    type: 'medical' | 'administrative' | 'commercial'
    filteredCount: number  // Nombre de créneaux filtrés par le service
    reason: string  // Message explicatif
  }
}

/**
 * Trouve tous les créneaux disponibles sur une période
 * en tenant compte des contraintes et événements calendrier
 *
 * Architecture à 2 niveaux :
 * 1. HARD constraints : filtrage des créneaux impossibles (temporalConstraint, calendar, availability)
 * 2. SOFT preferences : scoring des créneaux restants (energy, mood, cognitive)
 */
export async function findAvailableSlots(params: FindSlotsParams): Promise<FindSlotsResult> {
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
    taskContent = '',
    ignoreServiceConstraints = false
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

  // Déterminer si on doit ignorer les contraintes utilisateur
  // Quand il y a une contrainte temporelle explicite (fixed_date, time_range),
  // l'utilisateur a explicitement demandé ce moment, donc on ignore ses indispos
  const hasExplicitTimeConstraint = temporalConstraint &&
    (temporalConstraint.type === 'fixed_date' || temporalConstraint.type === 'time_range')

  // Parcourir chaque jour de la période
  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate)

    // 1. Récupérer les contraintes du jour (work, school, etc.)
    // Ces contraintes représentent les moments où l'utilisateur est OCCUPÉ
    // SAUF si une contrainte temporelle explicite est définie
    const dayConstraints = hasExplicitTimeConstraint
      ? [] // Ignorer les indispos utilisateur si contrainte temporelle explicite
      : getConstraintsForDay(constraints, currentDate)
    const constraintBlocks = constraintsToBlocks(dayConstraints)

    // 2. Récupérer les événements du jour (HARD) - événements Google Calendar
    // Les événements calendar sont TOUJOURS respectés (ce sont des vrais RDV)
    const dayEvents = getEventsForDay(calendarEvents, currentDate)
    const eventBlocks = eventsToBlocks(dayEvents)

    // 3. Combiner tous les blocs busy
    const allBusyBlocks = [...constraintBlocks, ...eventBlocks]

    // Log pour debug
    if (dayConstraints.length > 0 || eventBlocks.length > 0) {
      console.log(`[slots.service] ${formatDate(currentDate)}: ${dayConstraints.length} contraintes, ${eventBlocks.length} événements calendar`)
    }

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

  // 6. FILTRAGE HARD : Exclure les créneaux dans le passé (+ marge de 15 min)
  const now = new Date()
  const nowDateStr = formatDate(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const MIN_ADVANCE_MINUTES = 15 // Pas de créneau dans moins de 15 minutes

  const futureSlots = slots.filter(slot => {
    // Si le créneau est un jour futur → OK
    if (slot.date > nowDateStr) return true

    // Si le créneau est aujourd'hui → vérifier l'heure
    if (slot.date === nowDateStr) {
      const slotStartMinutes = timeToMinutes(slot.startTime)
      return slotStartMinutes > nowMinutes + MIN_ADVANCE_MINUTES
    }

    // Créneau dans le passé → Exclure
    return false
  })

  // 7. Appliquer le filtrage HARD des contraintes temporelles
  console.log('[slots.service] Avant filtrage temporel:', futureSlots.length, 'créneaux')
  console.log('[slots.service] temporalConstraint:', JSON.stringify(temporalConstraint, null, 2))
  let filteredSlots = filterSlotsByTemporalConstraint(futureSlots, temporalConstraint)
  console.log('[slots.service] Après filtrage temporel:', filteredSlots.length, 'créneaux')

  // 8. Appliquer le filtrage HARD des contraintes de service (sauf si ignoré)
  let serviceConstraintInfo: FindSlotsResult['serviceConstraint'] = undefined
  const slotsBeforeServiceFilter = filteredSlots.length

  if (serviceConstraints && !ignoreServiceConstraints) {
    filteredSlots = filterSlotsByServiceConstraints(filteredSlots, serviceConstraints)

    const filteredCount = slotsBeforeServiceFilter - filteredSlots.length

    if (filteredCount > 0) {
      console.log(`[slots.service] Filtrage service ${serviceConstraints.type}: ${slotsBeforeServiceFilter} → ${filteredSlots.length} créneaux`)

      // Générer le message explicatif
      const serviceNames: Record<string, string> = {
        medical: 'cabinet médical',
        administrative: 'service administratif',
        commercial: 'commerce'
      }
      const serviceName = serviceNames[serviceConstraints.type] || 'service'

      serviceConstraintInfo = {
        type: serviceConstraints.type,
        filteredCount,
        reason: `${filteredCount} créneaux exclus (${serviceName} fermé le week-end ou hors horaires)`
      }
    }
  }

  // 9. Trier par score décroissant (sauf pour ASAP qui trie par date)
  let sortedSlots: TimeSlot[]
  if (temporalConstraint?.type === 'asap') {
    // Pour ASAP, déjà trié par date dans filterSlotsByTemporalConstraint
    sortedSlots = filteredSlots
  } else {
    sortedSlots = filteredSlots.sort((a, b) => b.score - a.score)
  }

  return {
    slots: sortedSlots,
    serviceConstraint: serviceConstraintInfo
  }
}

/**
 * Trouve le meilleur créneau disponible
 */
export async function findBestSlot(params: FindSlotsParams): Promise<TimeSlot | null> {
  const result = await findAvailableSlots(params)
  return result.slots.length > 0 ? result.slots[0] : null
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
    'kiné', 'ostéo', 'radiologue', 'labo', 'laboratoire',
    'vétérinaire', 'véto'
  ]

  if (medicalKeywords.some(k => content.includes(k))) {
    return {
      type: 'medical',
      openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      openHours: { start: '09:00', end: '18:00' }
    }
  }

  // Services administratifs (fermés dimanche, 9h-16h30)
  const adminKeywords = [
    'mairie', 'préfecture', 'caf', 'pôle emploi', 'sécurité sociale',
    'banque', 'notaire', 'avocat', 'assurance', 'impôts',
    'poste', 'la poste', 'bureau de poste',
    'carte d\'identité', 'passeport', 'permis'
  ]

  if (adminKeywords.some(k => content.includes(k))) {
    return {
      type: 'administrative',
      openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      openHours: { start: '09:00', end: '16:30' }
    }
  }

  // Écoles et périscolaire (Lun-Ven, 8h-18h)
  const schoolKeywords = [
    'école', 'crèche', 'périscolaire', 'cantine', 'garderie',
    'maternelle', 'primaire', 'collège', 'lycée'
  ]

  if (schoolKeywords.some(k => content.includes(k))) {
    return {
      type: 'administrative',
      openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      openHours: { start: '08:00', end: '18:00' }
    }
  }

  // Garages et auto (Lun-Sam, 8h-18h)
  // Note: "garage" seul est ambigu (peut être "ranger le garage")
  // On ne matche que les termes explicitement liés aux services auto
  const garageKeywords = [
    'garagiste', 'contrôle technique', 'mécanicien',
    'carrossier', 'pneus', 'vidange', 'garage auto', 'garage voiture'
  ]

  if (garageKeywords.some(k => content.includes(k))) {
    return {
      type: 'commercial',
      openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      openHours: { start: '08:00', end: '18:00' }
    }
  }

  // Commerces (fermés dimanche, 9h-19h)
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

const MIN_GAP_HOURS = 3 // 3h minimum d'écart entre créneaux le même jour

/**
 * Sélectionne 3 créneaux diversifiés avec règles STRICTES :
 * - Slot 1 : Meilleur score
 * - Slot 2 : PRIORITÉ à un autre jour, sinon même jour avec +3h d'écart
 * - Slot 3 : OBLIGATOIREMENT un autre jour différent des 2 premiers
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
  const slot1 = allSlots[0]
  const slot1Date = slot1.date
  const slot1Minutes = timeToMinutes(slot1.startTime)

  // 1️⃣ MEILLEUR créneau (score le plus élevé)
  selected.push({ ...slot1, label: 'Meilleur moment' })

  // 2️⃣ DEUXIÈME créneau : PRIORITÉ à un autre jour
  const otherDaySlot = allSlots.find((slot, i) => i > 0 && slot.date !== slot1Date)

  if (otherDaySlot) {
    selected.push({ ...otherDaySlot, label: 'Autre jour' })
  } else {
    // Sinon même jour avec gap minimum 3h
    const sameDayWithGap = allSlots.find((slot, i) => {
      if (i === 0) return false
      if (slot.date !== slot1Date) return false
      const gap = Math.abs(timeToMinutes(slot.startTime) - slot1Minutes)
      return gap >= MIN_GAP_HOURS * 60
    })

    if (sameDayWithGap) {
      selected.push({ ...sameDayWithGap, label: 'Alternative (+3h)' })
    } else {
      // Fallback : prendre le plus éloigné temporellement
      const sorted = allSlots.slice(1).sort((a, b) => {
        const gapA = Math.abs(timeToMinutes(a.startTime) - slot1Minutes)
        const gapB = Math.abs(timeToMinutes(b.startTime) - slot1Minutes)
        return gapB - gapA // Plus grand écart en premier
      })
      if (sorted.length > 0) {
        selected.push({ ...sorted[0], label: 'Alternative' })
      }
    }
  }

  // 3️⃣ TROISIÈME créneau : OBLIGATOIREMENT un autre jour différent
  const usedDates = [...new Set(selected.map(s => s.date))]

  const differentDaySlot = allSlots.find(slot => {
    // Ne pas reprendre un slot déjà sélectionné
    if (selected.some(s => s.date === slot.date && s.startTime === slot.startTime)) return false
    // Doit être sur un jour non utilisé
    return !usedDates.includes(slot.date)
  })

  if (differentDaySlot) {
    selected.push({ ...differentDaySlot, label: 'Autre jour' })
  } else {
    // Pas d'autre jour disponible → prendre le créneau le plus éloigné des 2 premiers
    const remaining = allSlots.filter(slot =>
      !selected.some(s => s.date === slot.date && s.startTime === slot.startTime)
    )

    if (remaining.length > 0) {
      // Calculer l'écart minimum avec tous les slots déjà sélectionnés
      const withMaxGap = remaining.sort((a, b) => {
        const minGapA = Math.min(...selected.map(s => {
          if (s.date !== a.date) return Infinity
          return Math.abs(timeToMinutes(a.startTime) - timeToMinutes(s.startTime))
        }))
        const minGapB = Math.min(...selected.map(s => {
          if (s.date !== b.date) return Infinity
          return Math.abs(timeToMinutes(b.startTime) - timeToMinutes(s.startTime))
        }))
        return minGapB - minGapA // Plus grand écart en premier
      })

      selected.push({ ...withMaxGap[0], label: 'Alternative' })
    }
  }

  return selected
}