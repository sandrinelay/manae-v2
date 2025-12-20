'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Item } from '@/types/items'
import type { ShoppingList, ShoppingListWithItems } from '@/types/shopping-lists'
import {
  getOrCreateDefaultShoppingList,
  getShoppingListWithItems,
  getActiveShoppingLists,
  addToDefaultShoppingList,
  addMultipleToDefaultShoppingList,
  markShoppingListCompleted,
  scheduleShoppingList,
  deleteShoppingList
} from '@/services/supabase/shopping-lists.service'
import { updateItemState, deleteItem } from '@/services/supabase/items.service'

interface UseShoppingListOptions {
  autoLoad?: boolean
  listId?: string // Si fourni, charge cette liste spécifique
}

interface UseShoppingListReturn {
  // État
  isLoading: boolean
  error: Error | null
  shoppingList: ShoppingListWithItems | null
  allLists: ShoppingList[]

  // Actions
  loadList: (listId?: string) => Promise<void>
  loadAllLists: () => Promise<void>
  addItem: (content: string) => Promise<Item>
  addItems: (contents: string[]) => Promise<Item[]>
  checkItem: (itemId: string) => Promise<void>
  uncheckItem: (itemId: string) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  completeList: () => Promise<void>
  scheduleList: (date: string, googleEventId?: string) => Promise<void>
  deleteList: () => Promise<void>
  refresh: () => Promise<void>
  clearError: () => void
}

export function useShoppingList(options: UseShoppingListOptions = {}): UseShoppingListReturn {
  const { autoLoad = true, listId } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [shoppingList, setShoppingList] = useState<ShoppingListWithItems | null>(null)
  const [allLists, setAllLists] = useState<ShoppingList[]>([])

  const clearError = useCallback(() => setError(null), [])

  /**
   * Charge une liste de courses spécifique ou la liste par défaut
   */
  const loadList = useCallback(async (targetListId?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      let list: ShoppingListWithItems | null

      if (targetListId) {
        list = await getShoppingListWithItems(targetListId)
      } else {
        // Récupérer ou créer la liste par défaut
        const defaultList = await getOrCreateDefaultShoppingList()
        list = await getShoppingListWithItems(defaultList.id)
      }

      setShoppingList(list)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load list')
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Charge toutes les listes actives
   */
  const loadAllLists = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const lists = await getActiveShoppingLists()
      setAllLists(lists)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load lists')
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Ajoute un item à la liste
   */
  const addItem = useCallback(async (content: string): Promise<Item> => {
    try {
      const item = await addToDefaultShoppingList(content)

      // Mettre à jour l'état local
      setShoppingList(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: [...prev.items, item]
        }
      })

      return item
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add item')
      setError(error)
      throw error
    }
  }, [])

  /**
   * Ajoute plusieurs items à la liste
   */
  const addItems = useCallback(async (contents: string[]): Promise<Item[]> => {
    try {
      const items = await addMultipleToDefaultShoppingList(contents)

      // Mettre à jour l'état local
      setShoppingList(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: [...prev.items, ...items]
        }
      })

      return items
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add items')
      setError(error)
      throw error
    }
  }, [])

  /**
   * Marque un item comme complété (coché)
   */
  const checkItem = useCallback(async (itemId: string) => {
    try {
      await updateItemState(itemId, 'completed')

      setShoppingList(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map(item =>
            item.id === itemId ? { ...item, state: 'completed' as const } : item
          )
        }
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check item')
      setError(error)
      throw error
    }
  }, [])

  /**
   * Décoche un item (remet en active)
   */
  const uncheckItem = useCallback(async (itemId: string) => {
    try {
      await updateItemState(itemId, 'active')

      setShoppingList(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map(item =>
            item.id === itemId ? { ...item, state: 'active' as const } : item
          )
        }
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to uncheck item')
      setError(error)
      throw error
    }
  }, [])

  /**
   * Supprime un item de la liste
   */
  const removeItem = useCallback(async (itemId: string) => {
    try {
      await deleteItem(itemId)

      setShoppingList(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.filter(item => item.id !== itemId)
        }
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove item')
      setError(error)
      throw error
    }
  }, [])

  /**
   * Marque la liste comme complétée
   */
  const completeList = useCallback(async () => {
    if (!shoppingList) return

    try {
      await markShoppingListCompleted(shoppingList.id)
      setShoppingList(prev => prev ? { ...prev, status: 'completed' } : null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to complete list')
      setError(error)
      throw error
    }
  }, [shoppingList])

  /**
   * Planifie la liste sur le calendrier
   */
  const scheduleList = useCallback(async (date: string, googleEventId?: string) => {
    if (!shoppingList) return

    try {
      await scheduleShoppingList(shoppingList.id, date, googleEventId)
      setShoppingList(prev => prev ? {
        ...prev,
        scheduled_at: date,
        google_event_id: googleEventId || null
      } : null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to schedule list')
      setError(error)
      throw error
    }
  }, [shoppingList])

  /**
   * Supprime la liste
   */
  const deleteList = useCallback(async () => {
    if (!shoppingList) return

    try {
      await deleteShoppingList(shoppingList.id)
      setShoppingList(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete list')
      setError(error)
      throw error
    }
  }, [shoppingList])

  /**
   * Rafraîchit la liste courante
   */
  const refresh = useCallback(async () => {
    if (shoppingList) {
      await loadList(shoppingList.id)
    } else if (listId) {
      await loadList(listId)
    } else {
      await loadList()
    }
  }, [loadList, shoppingList, listId])

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      loadList(listId)
    }
  }, [autoLoad, listId, loadList])

  return {
    isLoading,
    error,
    shoppingList,
    allLists,
    loadList,
    loadAllLists,
    addItem,
    addItems,
    checkItem,
    uncheckItem,
    removeItem,
    completeList,
    scheduleList,
    deleteList,
    refresh,
    clearError
  }
}
