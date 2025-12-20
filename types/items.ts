// ============================================
// ITEMS - Types conformes au nouveau schéma DB
// ============================================

/**
 * Type = Nature de l'item (IMMUTABLE après création)
 * - task : Chose à faire
 * - note : Information à retenir
 * - idea : Concept abstrait à développer
 * - list_item : Item d'une liste de courses
 */
export type ItemType = 'task' | 'note' | 'idea' | 'list_item'

/**
 * State = Étape dans le cycle de vie (MUTABLE selon actions utilisateur)
 * - captured : Vient d'être saisi, pas encore traité
 * - active : Clarifié, prêt à être utilisé
 * - project : Idée transformée en projet (avec tasks enfants)
 * - planned : Planifié sur calendrier (tasks uniquement)
 * - completed : Terminé
 * - archived : Archivé
 */
export type ItemState =
  | 'captured'
  | 'active'
  | 'project'
  | 'planned'
  | 'completed'
  | 'archived'

/**
 * Context = Domaine de vie associé
 */
export type ItemContext = 'personal' | 'family' | 'work' | 'health'

/**
 * Mood = Humeur au moment de la capture
 */
export type Mood = 'energetic' | 'neutral' | 'tired'

/**
 * Structure retournée par l'IA lors de l'analyse
 */
export interface AIAnalysis {
  type_suggestion: ItemType
  confidence: number
  extracted_data: {
    date?: string
    time?: string
    location?: string
    items?: string[] // Pour list_item (détection multi-items)
  }
  suggestions: string[]
}

/**
 * Interface principale Item conforme au schéma Supabase
 */
export interface Item {
  id: string
  user_id: string
  type: ItemType
  state: ItemState
  content: string
  context?: ItemContext | null
  ai_analysis?: AIAnalysis | null
  metadata: Record<string, unknown>
  parent_id?: string | null
  list_id?: string | null
  scheduled_at?: string | null
  google_event_id?: string | null
  mood?: Mood | null
  created_at: string
  updated_at: string
}

/**
 * Données pour créer un nouvel item
 */
export interface CreateItemInput {
  type: ItemType
  state?: ItemState
  content: string
  context?: ItemContext | null
  ai_analysis?: AIAnalysis | null
  metadata?: Record<string, unknown>
  parent_id?: string | null
  list_id?: string | null
  scheduled_at?: string | null
  mood?: Mood | null
}

/**
 * Données pour mettre à jour un item
 */
export interface UpdateItemInput {
  type?: ItemType
  state?: ItemState
  content?: string
  context?: ItemContext | null
  ai_analysis?: AIAnalysis | null
  metadata?: Record<string, unknown>
  parent_id?: string | null
  list_id?: string | null
  scheduled_at?: string | null
  google_event_id?: string | null
  mood?: Mood | null
}

/**
 * Filtres pour requêter les items
 */
export interface ItemFilters {
  type?: ItemType | ItemType[]
  state?: ItemState | ItemState[]
  context?: ItemContext
  parent_id?: string | null
  list_id?: string | null
  has_scheduled?: boolean
}

// ============================================
// RÉPONSES IA
// ============================================

/**
 * Résultat de l'analyse IA d'une pensée capturée
 */
export interface AIAnalysisResult {
  items: AIAnalyzedItem[]
  raw_input: string
}

/**
 * Item analysé par l'IA (avant insertion en base)
 */
export interface AIAnalyzedItem {
  content: string
  type: ItemType
  state: ItemState
  context?: ItemContext
  ai_analysis: AIAnalysis
  metadata?: Record<string, unknown>
  list_id?: string // Rempli si type = list_item
}

// ============================================
// HELPERS DE VALIDATION
// ============================================

/**
 * Vérifie si une transition d'état est valide
 */
export function isValidStateTransition(
  type: ItemType,
  currentState: ItemState,
  newState: ItemState
): boolean {
  // Règle : planned seulement pour les tasks
  if (newState === 'planned' && type !== 'task') {
    return false
  }

  // Règle : project seulement pour les ideas
  if (newState === 'project' && type !== 'idea') {
    return false
  }

  // Transitions autorisées par état
  const allowedTransitions: Record<ItemState, ItemState[]> = {
    captured: ['active', 'archived'],
    active: ['planned', 'project', 'completed', 'archived'],
    project: ['active', 'completed', 'archived'],
    planned: ['active', 'completed', 'archived'],
    completed: ['active', 'archived'],
    archived: ['active']
  }

  return allowedTransitions[currentState]?.includes(newState) ?? false
}

/**
 * Vérifie la cohérence type/state d'un item
 */
export function isValidItemTypeState(type: ItemType, state: ItemState): boolean {
  // planned : seulement tasks
  if (state === 'planned' && type !== 'task') {
    return false
  }

  // project : seulement ideas
  if (state === 'project' && type !== 'idea') {
    return false
  }

  return true
}

/**
 * Vérifie qu'un list_item a bien un list_id
 */
export function isValidListItem(type: ItemType, listId: string | null | undefined): boolean {
  if (type === 'list_item' && !listId) {
    return false
  }
  return true
}
