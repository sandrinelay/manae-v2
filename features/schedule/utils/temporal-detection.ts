/**
 * Détection des contraintes temporelles dans le texte
 *
 * Exemples supportés :
 * - "ce soir", "ce matin", "cet après-midi" (aujourd'hui + plage horaire)
 * - "demain", "après-demain", "aujourd'hui"
 * - "lundi", "vendredi matin", "samedi soir"
 * - "lundi prochain"
 * - "avant lundi", "avant vendredi" (deadline)
 * - "ce week-end" (samedi et dimanche)
 * - "le 10 mars", "10 mars", "le 1er février"
 * - "fin du mois", "début du mois", "milieu du mois"
 * - "fin du mois prochain", "début du mois prochain"
 * - "fin janvier", "début février", "mi mars"
 * - "avant midi", "avant 14h" (plage horaire)
 */

import type { TimeSlot } from '../types/scheduling.types'

// ============================================
// CONSTANTES
// ============================================

export const FRENCH_MONTHS: Record<string, number> = {
  'janvier': 0, 'jan': 0, 'janv': 0,
  'février': 1, 'fevrier': 1, 'fév': 1, 'fev': 1,
  'mars': 2,
  'avril': 3, 'avr': 3,
  'mai': 4,
  'juin': 5, 'jun': 5,
  'juillet': 6, 'juil': 6, 'jul': 6,
  'août': 7, 'aout': 7, 'aou': 7,
  'septembre': 8, 'sept': 8, 'sep': 8,
  'octobre': 9, 'oct': 9,
  'novembre': 10, 'nov': 10,
  'décembre': 11, 'decembre': 11, 'déc': 11, 'dec': 11
}

// Note: "mar" retiré car ambigu avec "mars" (mois)
export const FRENCH_WEEKDAYS: Record<string, number> = {
  'dimanche': 0, 'dim': 0,
  'lundi': 1, 'lun': 1,
  'mardi': 2,
  'mercredi': 3, 'mer': 3,
  'jeudi': 4, 'jeu': 4,
  'vendredi': 5, 'ven': 5,
  'samedi': 6, 'sam': 6
}

type DayPeriod = 'matin' | 'midi' | 'après-midi' | 'soir'

export const DAY_PERIOD_HOURS: Record<DayPeriod, { start: string; end: string }> = {
  'matin': { start: '08:00', end: '12:00' },
  'midi': { start: '12:00', end: '14:00' },
  'après-midi': { start: '14:00', end: '18:00' },
  'soir': { start: '18:00', end: '21:00' }
}

const DAY_PERIOD_VARIANTS: Record<string, DayPeriod> = {
  'matin': 'matin',
  'matinée': 'matin',
  'midi': 'midi',
  'après-midi': 'après-midi',
  'apres-midi': 'après-midi',
  'aprèm': 'après-midi',
  'aprem': 'après-midi',
  'soir': 'soir',
  'soirée': 'soir'
}

// ============================================
// TYPES
// ============================================

export interface DetectedTemporalConstraint {
  targetDate: Date
  pattern: string
  isWeekday: boolean      // true si c'est un jour de la semaine (vendredi, lundi, etc.)
  isExactDay: boolean     // true si c'est "demain", "aujourd'hui" ou un jour de semaine
  isStartOfPeriod: boolean // true si c'est "début [mois]" (pas de créneaux avant)
  isWeekend: boolean      // true si c'est "ce week-end" (samedi + dimanche)
  timeRange: { start: string; end: string } | null
}

export interface SearchRange {
  startDate: Date
  endDate: Date
  daysRange: number
  targetDate: Date | null
  isWeekday: boolean
  isExactDay: boolean
  isStartOfPeriod: boolean
  isWeekend: boolean
  timeRange: { start: string; end: string } | null
}

// ============================================
// HELPERS - Dates
// ============================================

/**
 * Formate une date en YYYY-MM-DD en utilisant le fuseau horaire LOCAL
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Détermine l'année pour un mois donné (gère le passage d'année)
 */
function getYearForMonth(monthIndex: number, today: Date): number {
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  if (monthIndex < currentMonth) {
    return currentYear + 1
  }
  return currentYear
}

/**
 * Retourne la prochaine occurrence d'un jour de la semaine
 */
function getNextWeekday(weekdayName: string, today: Date, forceNextWeek = false): Date | null {
  const targetDay = FRENCH_WEEKDAYS[weekdayName.toLowerCase()]
  if (targetDay === undefined) return null

  const currentDay = today.getDay()
  let daysToAdd = targetDay - currentDay

  if (daysToAdd < 0 || (daysToAdd === 0 && forceNextWeek)) {
    daysToAdd += 7
  }
  if (forceNextWeek && daysToAdd > 0 && daysToAdd < 7) {
    daysToAdd += 7
  }

  const result = new Date(today)
  result.setDate(result.getDate() + daysToAdd)
  return result
}

/**
 * Retourne la date de fin d'un mois nommé
 */
function getEndOfNamedMonth(monthName: string, today: Date): Date | null {
  const monthIndex = FRENCH_MONTHS[monthName.toLowerCase()]
  if (monthIndex === undefined) return null

  const year = getYearForMonth(monthIndex, today)
  return new Date(year, monthIndex + 1, 0)
}

/**
 * Retourne la date de début d'un mois nommé
 */
function getStartOfNamedMonth(monthName: string, today: Date): Date | null {
  const monthIndex = FRENCH_MONTHS[monthName.toLowerCase()]
  if (monthIndex === undefined) return null

  const year = getYearForMonth(monthIndex, today)
  return new Date(year, monthIndex, 1)
}

/**
 * Retourne la date du milieu d'un mois nommé
 */
function getMidOfNamedMonth(monthName: string, today: Date): Date | null {
  const monthIndex = FRENCH_MONTHS[monthName.toLowerCase()]
  if (monthIndex === undefined) return null

  const year = getYearForMonth(monthIndex, today)
  return new Date(year, monthIndex, 15)
}

/**
 * Retourne une date spécifique d'un mois nommé (ex: "le 10 mars" → 10 mars)
 */
function getSpecificDateOfMonth(dayNumber: number, monthName: string, today: Date): Date | null {
  const monthIndex = FRENCH_MONTHS[monthName.toLowerCase()]
  if (monthIndex === undefined) return null

  // Valider le numéro du jour (1-31)
  if (dayNumber < 1 || dayNumber > 31) return null

  const year = getYearForMonth(monthIndex, today)
  const date = new Date(year, monthIndex, dayNumber)

  // Vérifier que le jour existe dans ce mois (ex: 31 février n'existe pas)
  if (date.getMonth() !== monthIndex) return null

  return date
}

// ============================================
// DÉTECTION
// ============================================

/**
 * Patterns pour détecter les contraintes temporelles dans le texte
 */
function getTemporalPatterns(today: Date): Array<{
  pattern: RegExp
  getDate: (match: RegExpMatchArray) => Date | null
  isExactDay?: boolean
  isStartOfPeriod?: boolean
  isWeekend?: boolean
}> {
  const monthPattern = Object.keys(FRENCH_MONTHS).join('|')
  const weekdayPattern = Object.keys(FRENCH_WEEKDAYS).join('|')

  return [
    // "ce soir", "ce matin", "cet après-midi" → aujourd'hui + plage horaire
    // AVANT les autres patterns pour être prioritaire
    {
      pattern: /\bce\s+soir\b/i,
      getDate: () => new Date(today),
      isExactDay: true
    },
    {
      pattern: /\bce\s+matin\b/i,
      getDate: () => new Date(today),
      isExactDay: true
    },
    {
      pattern: /\bcet?\s+apr[èe]s[- ]?midi\b/i,
      getDate: () => new Date(today),
      isExactDay: true
    },
    // "après-demain", "apres-demain", "après demain" (AVANT "demain" pour éviter faux positif)
    {
      pattern: /\bapr[èe]s[- ]?demain\b/i,
      getDate: () => {
        const dayAfterTomorrow = new Date(today)
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
        return dayAfterTomorrow
      },
      isExactDay: true
    },
    // "demain"
    {
      pattern: /\bdemain\b/i,
      getDate: () => {
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow
      },
      isExactDay: true
    },
    // "aujourd'hui"
    {
      pattern: /\baujourd'?hui\b/i,
      getDate: () => new Date(today),
      isExactDay: true
    },
    // "ce week-end", "ce weekend" → samedi prochain (mais filtre samedi + dimanche)
    {
      pattern: /\bce\s+week[- ]?end\b/i,
      getDate: () => getNextWeekday('samedi', today, false),
      isWeekend: true  // Filtre samedi ET dimanche
    },
    // "avant lundi", "avant vendredi", etc. → deadline (créneaux jusqu'à ce jour exclu)
    {
      pattern: new RegExp(`avant\\s+(${weekdayPattern})`, 'i'),
      getDate: (match) => {
        // Retourne le jour AVANT le jour mentionné (deadline)
        const targetDay = getNextWeekday(match[1], today, false)
        if (targetDay) {
          targetDay.setDate(targetDay.getDate() - 1)
        }
        return targetDay
      },
      isExactDay: false  // C'est une deadline, pas un jour exact
    },
    // "lundi prochain", "vendredi prochain", etc.
    {
      pattern: new RegExp(`(${weekdayPattern})\\s+prochain`, 'i'),
      getDate: (match) => getNextWeekday(match[1], today, true),
      isExactDay: true
    },
    // "vendredi", "lundi", etc.
    {
      pattern: new RegExp(`\\b(${weekdayPattern})\\b`, 'i'),
      getDate: (match) => getNextWeekday(match[1], today, false),
      isExactDay: true
    },
    // "fin février", "fin mars", etc.
    {
      pattern: new RegExp(`fin\\s+(${monthPattern})`, 'i'),
      getDate: (match) => getEndOfNamedMonth(match[1], today)
    },
    // "début mars", "début avril", etc.
    {
      pattern: new RegExp(`d[ée]but\\s+(${monthPattern})`, 'i'),
      getDate: (match) => getStartOfNamedMonth(match[1], today),
      isStartOfPeriod: true
    },
    // "mi-mars", "mi mars", "mi février", etc.
    {
      pattern: new RegExp(`mi[- ]?(${monthPattern})`, 'i'),
      getDate: (match) => getMidOfNamedMonth(match[1], today)
    },
    // "le 10 mars", "10 mars", "le 1er février", "1er mars", "le 2 avril", etc.
    {
      pattern: new RegExp(`(?:le\\s+)?(\\d{1,2})(?:er)?\\s+(${monthPattern})`, 'i'),
      getDate: (match) => getSpecificDateOfMonth(parseInt(match[1], 10), match[2], today),
      isExactDay: true
    },
    // "début du mois prochain"
    {
      pattern: /d[ée]but\s+(?:du\s+)?mois\s+prochain/i,
      getDate: () => new Date(today.getFullYear(), today.getMonth() + 1, 1),
      isStartOfPeriod: true
    },
    // "fin du mois prochain"
    {
      pattern: /fin\s+(?:du\s+)?mois\s+prochain/i,
      getDate: () => new Date(today.getFullYear(), today.getMonth() + 2, 0)
    },
    // "milieu du mois prochain"
    {
      pattern: /mi(?:lieu)?\s+(?:du\s+)?mois\s+prochain/i,
      getDate: () => new Date(today.getFullYear(), today.getMonth() + 1, 15)
    },
    // "début du mois" (mois en cours)
    {
      pattern: /d[ée]but\s+(?:du\s+|de\s+)?mois(?!\s+prochain)/i,
      getDate: () => new Date(today.getFullYear(), today.getMonth(), 1),
      isStartOfPeriod: true
    },
    // "fin du mois" (mois en cours)
    {
      pattern: /fin\s+(?:du\s+|de\s+)?mois(?!\s+prochain)/i,
      getDate: () => new Date(today.getFullYear(), today.getMonth() + 1, 0)
    },
    // "milieu du mois" (mois en cours)
    {
      pattern: /mi(?:lieu)?\s+(?:du\s+|de\s+)?mois(?!\s+prochain)/i,
      getDate: () => new Date(today.getFullYear(), today.getMonth(), 15)
    }
  ]
}

/**
 * Détecte une période de la journée dans le texte
 * Supporte : "matin", "soir", "avant midi", "avant 14h", etc.
 */
function detectDayPeriod(text: string): { start: string; end: string } | null {
  // 1. Détecter "avant midi" → 08:00 - 12:00
  if (/\bavant\s+midi\b/i.test(text)) {
    return { start: '08:00', end: '12:00' }
  }

  // 2. Détecter "avant [heure]h" → 08:00 - [heure]:00
  const avantHeureMatch = text.match(/\bavant\s+(\d{1,2})\s*h/i)
  if (avantHeureMatch) {
    const heure = parseInt(avantHeureMatch[1], 10)
    if (heure >= 8 && heure <= 21) {
      return { start: '08:00', end: `${heure.toString().padStart(2, '0')}:00` }
    }
  }

  // 3. Détecter les périodes standard (matin, soir, etc.)
  const periodPattern = Object.keys(DAY_PERIOD_VARIANTS).join('|')
  const periodRegex = new RegExp(`\\b(${periodPattern})\\b`, 'i')
  const match = text.match(periodRegex)

  if (match) {
    const normalizedPeriod = DAY_PERIOD_VARIANTS[match[1].toLowerCase()]
    if (normalizedPeriod) {
      return DAY_PERIOD_HOURS[normalizedPeriod]
    }
  }
  return null
}

/**
 * Vérifie si une plage horaire est déjà passée pour une date donnée
 */
function isTimeRangePassed(targetDate: Date, timeRange: { start: string; end: string } | null, now: Date): boolean {
  // Si pas de plage horaire, on vérifie juste si c'est aujourd'hui et tard (après 21h)
  if (!timeRange) {
    if (formatDateLocal(targetDate) === formatDateLocal(now)) {
      return now.getHours() >= 21
    }
    return false
  }

  // Si ce n'est pas aujourd'hui, pas encore passé
  if (formatDateLocal(targetDate) !== formatDateLocal(now)) {
    return false
  }

  // Comparer l'heure actuelle avec la fin de la plage
  const [endHour, endMin] = timeRange.end.split(':').map(Number)
  const endMinutes = endHour * 60 + endMin
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  return nowMinutes >= endMinutes
}

/**
 * Détecte une contrainte temporelle depuis le texte de la tâche
 */
export function detectTemporalConstraintFromText(text: string, today: Date = new Date()): DetectedTemporalConstraint | null {
  const patterns = getTemporalPatterns(today)
  const weekdayPattern = Object.keys(FRENCH_WEEKDAYS).join('|')
  const weekdayRegex = new RegExp(`^(${weekdayPattern})(\\s+prochain)?$`, 'i')

  for (const { pattern, getDate, isExactDay, isStartOfPeriod, isWeekend } of patterns) {
    const match = text.match(pattern)
    if (match) {
      let targetDate = getDate(match)
      if (targetDate) {
        const isWeekday = weekdayRegex.test(match[0])
        const timeRange = detectDayPeriod(text)

        // Si c'est un jour de la semaine (pas "demain", "aujourd'hui", etc.)
        // et que la plage horaire est déjà passée, avancer d'une semaine
        if (isWeekday && isTimeRangePassed(targetDate, timeRange, today)) {
          console.log('[temporal-detection] Plage horaire passée, avance d\'une semaine')
          targetDate = new Date(targetDate)
          targetDate.setDate(targetDate.getDate() + 7)
        }

        console.log('[temporal-detection] Pattern détecté:', match[0], '→', formatDateLocal(targetDate),
          isExactDay ? '(jour exact)' : '',
          isStartOfPeriod ? '(début de période)' : '',
          isWeekend ? '(week-end)' : '',
          timeRange ? `(${timeRange.start}-${timeRange.end})` : '')

        return {
          targetDate,
          pattern: match[0],
          isWeekday,
          isExactDay: isExactDay || false,
          isStartOfPeriod: isStartOfPeriod || false,
          isWeekend: isWeekend || false,
          timeRange
        }
      }
    }
  }

  return null
}

// ============================================
// CALCUL DE PLAGE
// ============================================

/**
 * Calcule la plage de recherche en fonction de la contrainte temporelle détectée
 */
export function calculateSearchRange(
  taskContent: string,
  existingConstraint: { date?: string; startDate?: string; endDate?: string } | null | undefined
): SearchRange {
  const today = new Date()
  const startDate = new Date()

  let daysRange = 7
  let targetDate: Date | null = null
  let isWeekday = false
  let isExactDay = false
  let isStartOfPeriod = false
  let isWeekend = false
  let timeRange: { start: string; end: string } | null = null

  // 1. Essayer de détecter depuis le texte de la tâche
  const detected = detectTemporalConstraintFromText(taskContent, today)
  if (detected) {
    targetDate = detected.targetDate
    isWeekday = detected.isWeekday
    isExactDay = detected.isExactDay
    isStartOfPeriod = detected.isStartOfPeriod
    isWeekend = detected.isWeekend
    timeRange = detected.timeRange
  }

  // 2. Sinon, utiliser la contrainte existante
  if (!targetDate && existingConstraint) {
    const dateStr = existingConstraint.date || existingConstraint.startDate || existingConstraint.endDate
    if (dateStr) {
      targetDate = new Date(dateStr)
    }
  }

  // 3. Calculer la plage si une date cible est trouvée
  if (targetDate && !isNaN(targetDate.getTime())) {
    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays > 7) {
      daysRange = Math.min(diffDays + 3, 90)
      console.log('[temporal-detection] Plage étendue à', daysRange, 'jours pour atteindre', formatDateLocal(targetDate))
    }
  }

  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + daysRange)

  return { startDate, endDate, daysRange, targetDate, isWeekday, isExactDay, isStartOfPeriod, isWeekend, timeRange }
}

// ============================================
// FILTRAGE DE CRÉNEAUX
// ============================================

/**
 * Filtre les créneaux pour ne garder que ceux proches de la date cible
 */
export function filterSlotsByTargetDate(
  slots: TimeSlot[],
  targetDate: Date | null,
  isExactDay: boolean,
  isStartOfPeriod: boolean,
  isWeekend: boolean,
  timeRange: { start: string; end: string } | null
): TimeSlot[] {
  if (!targetDate) return slots

  const targetDateStr = formatDateLocal(targetDate)
  let filtered: TimeSlot[]

  if (isWeekend) {
    // Pour "ce week-end" : samedi ET dimanche
    const saturday = new Date(targetDate)
    const sunday = new Date(targetDate)
    sunday.setDate(sunday.getDate() + 1)

    const saturdayStr = formatDateLocal(saturday)
    const sundayStr = formatDateLocal(sunday)

    console.log('[temporal-detection] Filtrage par week-end:', {
      samedi: saturdayStr,
      dimanche: sundayStr,
      timeRange,
      slotsAvant: slots.length
    })

    filtered = slots.filter(slot => slot.date === saturdayStr || slot.date === sundayStr)
    console.log('[temporal-detection] Créneaux après filtrage (week-end):', filtered.length)
  } else if (isExactDay) {
    // Pour un jour exact (demain, vendredi, etc.) : uniquement ce jour
    console.log('[temporal-detection] Filtrage par jour exact:', {
      targetDate: targetDateStr,
      timeRange,
      slotsAvant: slots.length
    })

    filtered = slots.filter(slot => slot.date === targetDateStr)
    console.log('[temporal-detection] Créneaux après filtrage (jour exact):', filtered.length)
  } else {
    // Pour une date de mois : fenêtre autour de la date
    const targetTime = targetDate.getTime()

    // - "début [mois]" : 0 jours avant, 5 jours après
    // - "fin [mois]" / "mi-[mois]" : 5 jours avant, 3 jours après
    const windowBefore = isStartOfPeriod ? 0 : 5 * 24 * 60 * 60 * 1000
    const windowAfter = isStartOfPeriod ? 5 * 24 * 60 * 60 * 1000 : 3 * 24 * 60 * 60 * 1000

    const minDate = new Date(targetTime - windowBefore)
    const maxDate = new Date(targetTime + windowAfter)

    const minDateStr = formatDateLocal(minDate)
    const maxDateStr = formatDateLocal(maxDate)

    console.log('[temporal-detection] Filtrage par date cible:', {
      targetDate: targetDateStr,
      isStartOfPeriod,
      timeRange,
      window: `${minDateStr} → ${maxDateStr}`,
      slotsAvant: slots.length
    })

    filtered = slots.filter(slot => slot.date >= minDateStr && slot.date <= maxDateStr)
    console.log('[temporal-detection] Créneaux après filtrage (date):', filtered.length)
  }

  // Filtrer par plage horaire si spécifiée
  if (timeRange && filtered.length > 0) {
    const beforeTimeFilter = filtered.length
    filtered = filtered.filter(slot => {
      return slot.startTime >= timeRange.start && slot.startTime < timeRange.end
    })
    console.log('[temporal-detection] Créneaux après filtrage horaire:', filtered.length, `(${beforeTimeFilter} → ${filtered.length})`)
  }

  return filtered
}
