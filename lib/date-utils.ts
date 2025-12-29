const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']

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

  if (dateOnly.getTime() === today.getTime()) {
    return `Auj. ${time}`
  }

  if (dateOnly.getTime() === tomorrow.getTime()) {
    return `Demain ${time}`
  }

  const diffDays = Math.floor((dateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays > 0 && diffDays < 7) {
    return `${DAYS_SHORT[date.getDay()]} ${time}`
  }

  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${day}/${month} ${time}`
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

  if (diffMinutes < 1) return 'à l\'instant'
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays < 7) return `il y a ${diffDays}j`
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem`
  return `il y a ${Math.floor(diffDays / 30)} mois`
}
