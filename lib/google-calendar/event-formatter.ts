// ============================================
// GOOGLE CALENDAR EVENT FORMATTER
// ============================================

/**
 * URL de base de l'application Manae
 */
const MANAE_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://manae.app'

/**
 * Séparateur visuel pour le footer Manae
 */
const MANAE_FOOTER_SEPARATOR = '───'

/**
 * Génère le footer Manae avec le lien vers l'item
 */
function buildManaeFooter(itemId: string): string {
  const itemUrl = `${MANAE_BASE_URL}/item/${itemId}`
  return `${MANAE_FOOTER_SEPARATOR}\n📋 Voir dans Manae : ${itemUrl}`
}

/**
 * Formate la description d'un événement Google Calendar
 * en ajoutant un lien de retour vers l'item Manae
 *
 * @param itemId - ID de l'item Manae
 * @param originalDescription - Description originale (optionnelle)
 * @returns Description formatée avec le footer Manae
 */
export function formatEventDescription(
  itemId: string,
  originalDescription?: string | null
): string {
  const footer = buildManaeFooter(itemId)

  // Si pas de description originale, retourner uniquement le footer
  if (!originalDescription?.trim()) {
    return footer
  }

  // Sinon, ajouter le footer après la description
  return `${originalDescription.trim()}\n\n${footer}`
}

/**
 * Vérifie si une description contient déjà un lien Manae
 * Utile pour éviter les doublons lors de mises à jour
 */
export function hasManaeFooter(description: string | null | undefined): boolean {
  if (!description) return false
  return description.includes('Voir dans Manae')
}
