const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const MONTHS_SHORT = ['janv.', 'fev.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'aout', 'sept.', 'oct.', 'nov.', 'dec.']

/**
 * Formate une date planifiée pour affichage
 * - Aujourd'hui : "Auj. 19:00"
 * - Demain : "Demain 22:30"
 * - Cette semaine : "Mar. 20:00"
 * - Au-delà : "Mar. 6 janv. 20:00"
 */
export function formatScheduledDate(dateStr: string): string {
  // Normaliser le format de date Supabase (remplace l'espace par T pour ISO)
  const normalizedDateStr = dateStr.replace(' ', 'T')
  const date = new Date(normalizedDateStr)
  const now = new Date()

  // Reset time for date comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const time = `${hours}:${minutes}`

  // Aujourd'hui
  if (dateOnly.getTime() === today.getTime()) {
    return `Auj. ${time}`
  }

  // Demain
  if (dateOnly.getTime() === tomorrow.getTime()) {
    return `Demain ${time}`
  }

  const diffDays = Math.floor((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const dayName = DAYS_SHORT[date.getDay()]
  const dayOfMonth = date.getDate()
  const monthName = MONTHS_SHORT[date.getMonth()]

  // Cette semaine (2-6 jours)
  if (diffDays > 0 && diffDays < 7) {
    return `${dayName} ${time}`
  }

  // Au-delà : format complet "Mar. 6 janv. 20:00"
  return `${dayName} ${dayOfMonth} ${monthName} ${time}`
}

/**
 * Formate une date planifiée de manière détaillée (pour les modales)
 * Toujours affiche le format complet : "Mar. 6 janv. 20:00"
 * Sauf pour aujourd'hui et demain où on garde le contexte
 */
export function formatScheduledDateFull(dateStr: string): string {
  const normalizedDateStr = dateStr.replace(' ', 'T')
  const date = new Date(normalizedDateStr)
  const now = new Date()

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const time = `${hours}:${minutes}`

  const dayName = DAYS_SHORT[date.getDay()]
  const dayOfMonth = date.getDate()
  const monthName = MONTHS_SHORT[date.getMonth()]

  // Aujourd'hui : "Auj. (mer. 1 janv.) 19:00"
  if (dateOnly.getTime() === today.getTime()) {
    return `Aujourd'hui ${time} (${dayName} ${dayOfMonth} ${monthName})`
  }

  // Demain : "Demain (jeu. 2 janv.) 22:30"
  if (dateOnly.getTime() === tomorrow.getTime()) {
    return `Demain ${time} (${dayName} ${dayOfMonth} ${monthName})`
  }

  // Autres jours : "Mar. 6 janv. 20:00"
  return `${dayName} ${dayOfMonth} ${monthName} ${time}`
}

export function formatRelativeTime(dateStr: string): string {
  // Normaliser le format de date Supabase (remplace l'espace par T pour ISO)
  const normalizedDateStr = dateStr.replace(' ', 'T')
  const date = new Date(normalizedDateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return "à l'instant"
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays < 7) return `il y a ${diffDays}j`
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem`
  return `il y a ${Math.floor(diffDays / 30)} mois`
}
