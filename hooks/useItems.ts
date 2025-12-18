'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Item, ItemType, ItemState, ItemFilters, UpdateItemInput } from '@/types/items'
import {
  getItems,
  getItem,
  getItemsCount,
  getCapturedItems,
  getActiveItems,
  getPlannedItems,
  getChildItems,
  updateItem,
  updateItemState,
  markItemActive,
  markItemCompleted,
  markItemArchived,
  scheduleItem,
  deleteItem,
  deleteItems
} from '@/services/supabase/items.service'

interface UseItemsOptions {
  filters?: ItemFilters
  autoLoad?: boolean
}

interface UseItemsReturn {
  // État
  isLoading: boolean
  error: Error | null
  items: Item[]
  count: number

  // Actions
  loadItems: (filters?: ItemFilters) => Promise<void>
  loadItem: (id: string) => Promise<Item | null>
  loadCaptured: () => Promise<void>
  loadActive: () => Promise<void>
  loadPlanned: () => Promise<void>
  loadChildren: (parentId: string) => Promise<void>
  updateItemData: (id: string, updates: UpdateItemInput) => Promise<Item>
  changeState: (id: string, state: ItemState) => Promise<Item>
  markActive: (id: string) => Promise<Item>
  markCompleted: (id: string) => Promise<Item>
  markArchived: (id: string) => Promise<Item>
  schedule: (id: string, date: string, googleEventId?: string) => Promise<Item>
  remove: (id: string) => Promise<void>
  removeMultiple: (ids: string[]) => Promise<void>
  refresh: () => Promise<void>
  clearError: () => void
}

export function useItems(options: UseItemsOptions = {}): UseItemsReturn {
  const { filters: initialFilters, autoLoad = true } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [count, setCount] = useState(0)
  const [currentFilters, setCurrentFilters] = useState<ItemFilters | undefined>(initialFilters)

  const clearError = useCallback(() => setError(null), [])

  /**
   * Charge les items avec filtres optionnels
   */
  const loadItems = useCallback(async (filters?: ItemFilters) => {
    setIsLoading(true)
    setError(null)
    setCurrentFilters(filters)

    try {
      const [loadedItems, itemCount] = await Promise.all([
        getItems(filters),
        getItemsCount(filters)
      ])

      setItems(loadedItems)
      setCount(itemCount)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load items')
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Charge un item spécifique par ID
   */
  const loadItem = useCallback(async (id: string): Promise<Item | null> => {
    try {
      return await getItem(id)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load item')
      setError(error)
      return null
    }
  }, [])

  /**
   * Charge les items capturés (non traités)
   */
  const loadCaptured = useCallback(async () => {
    await loadItems({ state: 'captured' })
  }, [loadItems])

  /**
   * Charge les items actifs
   */
  const loadActive = useCallback(async () => {
    await loadItems({ state: 'active' })
  }, [loadItems])

  /**
   * Charge les items planifiés (tasks uniquement)
   */
  const loadPlanned = useCallback(async () => {
    await loadItems({ state: 'planned', type: 'task' })
  }, [loadItems])

  /**
   * Charge les items enfants d'un projet
   */
  const loadChildren = useCallback(async (parentId: string) => {
    await loadItems({ parent_id: parentId })
  }, [loadItems])

  /**
   * Met à jour un item
   */
  const updateItemData = useCallback(async (
    id: string,
    updates: UpdateItemInput
  ): Promise<Item> => {
    try {
      const updated = await updateItem(id, updates)

      // Mettre à jour l'état local
      setItems(prev => prev.map(item =>
        item.id === id ? updated : item
      ))

      return updated
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update item')
      setError(error)
      throw error
    }
  }, [])

  /**
   * Change l'état d'un item
   */
  const changeState = useCallback(async (id: string, state: ItemState): Promise<Item> => {
    try {
      const updated = await updateItemState(id, state)

      setItems(prev => prev.map(item =>
        item.id === id ? updated : item
      ))

      return updated
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to change state')
      setError(error)
      throw error
    }
  }, [])

  const markActive = useCallback(async (id: string): Promise<Item> => {
    return changeState(id, 'active')
  }, [changeState])

  const markCompleted = useCallback(async (id: string): Promise<Item> => {
    return changeState(id, 'completed')
  }, [changeState])

  const markArchived = useCallback(async (id: string): Promise<Item> => {
    return changeState(id, 'archived')
  }, [changeState])

  /**
   * Planifie un item sur le calendrier
   */
  const schedule = useCallback(async (
    id: string,
    date: string,
    googleEventId?: string
  ): Promise<Item> => {
    try {
      const updated = await scheduleItem(id, date, googleEventId)

      setItems(prev => prev.map(item =>
        item.id === id ? updated : item
      ))

      return updated
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to schedule item')
      setError(error)
      throw error
    }
  }, [])

  /**
   * Supprime un item
   */
  const remove = useCallback(async (id: string) => {
    try {
      await deleteItem(id)
      setItems(prev => prev.filter(item => item.id !== id))
      setCount(prev => prev - 1)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete item')
      setError(error)
      throw error
    }
  }, [])

  /**
   * Supprime plusieurs items
   */
  const removeMultiple = useCallback(async (ids: string[]) => {
    try {
      await deleteItems(ids)
      setItems(prev => prev.filter(item => !ids.includes(item.id)))
      setCount(prev => prev - ids.length)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete items')
      setError(error)
      throw error
    }
  }, [])

  /**
   * Rafraîchit avec les filtres courants
   */
  const refresh = useCallback(async () => {
    await loadItems(currentFilters)
  }, [loadItems, currentFilters])

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      loadItems(initialFilters)
    }
  }, [autoLoad]) // Intentionally not including initialFilters to prevent loops

  return {
    isLoading,
    error,
    items,
    count,
    loadItems,
    loadItem,
    loadCaptured,
    loadActive,
    loadPlanned,
    loadChildren,
    updateItemData,
    changeState,
    markActive,
    markCompleted,
    markArchived,
    schedule,
    remove,
    removeMultiple,
    refresh,
    clearError
  }
}

// ============================================
// HOOKS SPÉCIALISÉS
// ============================================

/**
 * Hook pour les items capturés (inbox)
 */
export function useCapturedItems() {
  return useItems({ filters: { state: 'captured' } })
}

/**
 * Hook pour les tâches actives
 */
export function useActiveTasks() {
  return useItems({ filters: { state: 'active', type: 'task' } })
}

/**
 * Hook pour les tâches planifiées
 */
export function usePlannedTasks() {
  return useItems({ filters: { state: 'planned', type: 'task' } })
}

/**
 * Hook pour les notes
 */
export function useNotes() {
  return useItems({ filters: { type: 'note', state: 'active' } })
}

/**
 * Hook pour les idées
 */
export function useIdeas() {
  return useItems({ filters: { type: 'idea' } })
}

/**
 * Hook pour les projets (idées développées)
 */
export function useProjects() {
  return useItems({ filters: { type: 'idea', state: 'project' } })
}
