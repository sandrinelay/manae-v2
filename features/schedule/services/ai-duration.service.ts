// features/schedule/services/ai-duration.service.ts

/**
 * Service d'estimation de durée des tâches
 * MVP: Utilise des règles heuristiques basiques
 * Future: Peut être enrichi avec IA si quota disponible
 */

// ============================================
// TYPES
// ============================================

export type DurationOption = 15 | 30 | 60

// ============================================
// MOTS-CLÉS PAR CATÉGORIE
// ============================================

const QUICK_KEYWORDS = [
  'appeler', 'appel',
  'envoyer', 'email', 'mail', 'message',
  'répondre', 'réponse',
  'vérifier', 'checker', 'check',
  'confirmer', 'confirmation',
  'rappeler', 'rappel',
  'noter', 'note',
  'lire', 'lecture rapide'
]

const LONG_KEYWORDS = [
  'réunion', 'meeting',
  'rendez-vous', 'rdv',
  'atelier', 'workshop',
  'formation', 'cours',
  'réfléchir', 'réflexion',
  'planifier', 'planification',
  'organiser', 'organisation',
  'préparer', 'préparation',
  'rédiger', 'rédaction',
  'analyser', 'analyse',
  'projet', 'présentation'
]

// ============================================
// FONCTION PRINCIPALE
// ============================================

/**
 * Estime la durée d'une tâche basée sur son contenu
 * @param taskContent - Le contenu textuel de la tâche
 * @returns Durée estimée en minutes (15, 30 ou 60)
 */
export function estimateTaskDuration(taskContent: string): DurationOption {
  const content = taskContent.toLowerCase().trim()

  // Vérifier d'abord les tâches rapides (15 min)
  const isQuick = QUICK_KEYWORDS.some(keyword => content.includes(keyword))
  if (isQuick) {
    return 15
  }

  // Vérifier les tâches longues (60 min)
  const isLong = LONG_KEYWORDS.some(keyword => content.includes(keyword))
  if (isLong) {
    return 60
  }

  // Par défaut, durée moyenne (30 min)
  return 30
}

/**
 * Valide et coerce une durée aux options valides
 * @param duration - Durée en minutes à valider
 * @returns Durée valide la plus proche (15, 30 ou 60)
 */
export function normalizeDuration(duration: number): DurationOption {
  if (duration <= 20) return 15
  if (duration <= 45) return 30
  return 60
}
