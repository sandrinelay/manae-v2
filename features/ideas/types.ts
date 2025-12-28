// ============================================
// TYPES - Développement d'idées
// ============================================

/**
 * Âge de l'idée
 */
export type IdeaAge = 'fresh' | 'old'

/**
 * Blocages possibles
 */
export type IdeaBlocker = 'time' | 'budget' | 'fear' | 'energy'

/**
 * Contexte de développement (stocké dans item.metadata)
 */
export interface DevelopmentContext {
  idea_age: IdeaAge
  blockers?: IdeaBlocker[]
  developed_at: string
}

/**
 * Configuration UI des blocages
 */
export const BLOCKER_CONFIG: Record<IdeaBlocker, { label: string; emoji: string }> = {
  time: { label: 'Temps', emoji: '⏰' },
  budget: { label: 'Budget', emoji: '💸' },
  fear: { label: 'Peur', emoji: '😰' },
  energy: { label: 'Énergie', emoji: '🔋' }
}

/**
 * Étapes du flow UI
 */
export type DevelopStep = 'age' | 'blockers' | 'loading' | 'result'

/**
 * Réponse de l'API develop-idea
 */
export interface DevelopIdeaResponse {
  project: {
    id: string
    content: string
    refined_title: string
    estimated_time: string
    budget: string | null
    motivation: string
  }
  steps: {
    id: string
    content: string
    order: number
  }[]
}

/**
 * Body de la requête API
 */
export interface DevelopIdeaRequest {
  itemId: string
  idea_age: IdeaAge
  blockers?: IdeaBlocker[]
}
