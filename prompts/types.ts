/**
 * Types centralisés pour les réponses IA
 * Utilisés par tous les prompts de l'application
 */

import type {
  ItemType,
  ItemState,
  ItemContext,
  TemporalConstraintType,
  TemporalUrgency,
  ShoppingCategory
} from '@/types/items'

// ============================================
// TYPES RÉPONSES IA
// ============================================

/**
 * Données extraites d'une pensée analysée
 */
export interface ExtractedData {
  date?: string
  time?: string
  location?: string
  items?: string[]
  category?: ShoppingCategory
}

/**
 * Contrainte temporelle détectée (format API)
 */
export interface TemporalConstraintAPI {
  type: TemporalConstraintType
  date?: string
  start_date?: string
  end_date?: string
  urgency: TemporalUrgency
  raw_pattern?: string
}

/**
 * Item analysé par l'IA (format brut API)
 */
export interface AnalyzedItemAPI {
  content: string
  type: ItemType
  state: ItemState
  context?: ItemContext
  confidence: number
  extracted_data?: ExtractedData
  suggestions?: string[]
  reasoning?: string
  temporal_constraint?: TemporalConstraintAPI | null
}

/**
 * Réponse complète de l'analyse
 */
export interface AnalysisResponseAPI {
  items: AnalyzedItemAPI[]
}

/**
 * Réponse du développement d'idée
 */
export interface DevelopIdeaResponseAPI {
  refined_title: string
  steps: string[]
  estimated_time: string
  budget: string | null
  motivation: string
}

// ============================================
// TYPES CONFIGURATION PROMPTS
// ============================================

/**
 * Configuration d'un prompt
 */
export interface PromptConfig {
  /** Prompt système (personnalité de l'IA) */
  system: string
  /** Température (0 = déterministe, 1 = créatif) */
  temperature: number
  /** Tokens max pour la réponse */
  maxTokens: number
  /** Modèle OpenAI à utiliser */
  model: 'gpt-4o-mini' | 'gpt-4o'
}

/**
 * Contexte pour construire un prompt d'analyse
 */
export interface AnalysisContext {
  rawText: string
  today: Date
  historyContext?: string
}

/**
 * Contexte pour construire un prompt de développement d'idée
 */
export interface DevelopIdeaContext {
  ideaText: string
  ideaAge: 'fresh' | 'old'
  blockers?: ('time' | 'budget' | 'fear' | 'energy')[]
}
