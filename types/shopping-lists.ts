// ============================================
// SHOPPING LISTS - Types conformes au schéma DB
// ============================================

/**
 * Status d'une liste de courses
 */
export type ShoppingListStatus = 'active' | 'completed' | 'archived'

/**
 * Interface principale ShoppingList conforme au schéma Supabase
 */
export interface ShoppingList {
  id: string
  user_id: string
  name: string
  scheduled_at?: string | null
  google_event_id?: string | null
  status: ShoppingListStatus
  created_at: string
  updated_at: string
}

/**
 * Données pour créer une nouvelle liste de courses
 */
export interface CreateShoppingListInput {
  name?: string // Défaut : 'Courses'
  scheduled_at?: string | null
  status?: ShoppingListStatus // Défaut : 'active'
}

/**
 * Données pour mettre à jour une liste de courses
 */
export interface UpdateShoppingListInput {
  name?: string
  scheduled_at?: string | null
  google_event_id?: string | null
  status?: ShoppingListStatus
}

/**
 * Filtres pour requêter les listes de courses
 */
export interface ShoppingListFilters {
  status?: ShoppingListStatus | ShoppingListStatus[]
  has_scheduled?: boolean
}

/**
 * Liste de courses avec ses items (pour affichage)
 */
export interface ShoppingListWithItems extends ShoppingList {
  items: import('./items').Item[]
}
