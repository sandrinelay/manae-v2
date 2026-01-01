'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, Trash2, Calendar, Edit2 } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import {
  fetchActiveShoppingList,
  fetchShoppingListItems,
  addShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  renameShoppingList
} from '@/services/shopping.service'
import type { Item } from '@/types/items'
import type { ShoppingList } from '@/types/shopping-lists'

export default function CoursesPage() {
  const router = useRouter()
  const [list, setList] = useState<ShoppingList | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newItemText, setNewItemText] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const activeList = await fetchActiveShoppingList()

      if (activeList) {
        setList(activeList)
        const listItems = await fetchShoppingListItems(activeList.id)
        setItems(listItems)
      }
    } catch (error) {
      console.error('Erreur fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddItem = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemText.trim() || !list || isAdding) return

    setIsAdding(true)
    try {
      await addShoppingItem(list.id, newItemText)
      setNewItemText('')
      await fetchData()
    } catch (error) {
      console.error('Erreur ajout item:', error)
    } finally {
      setIsAdding(false)
    }
  }, [newItemText, list, isAdding, fetchData])

  const handleToggleItem = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    try {
      await toggleShoppingItem(id, item.state)
      await fetchData()
    } catch (error) {
      console.error('Erreur toggle item:', error)
    }
  }, [items, fetchData])

  const handleDeleteItem = useCallback(async (id: string) => {
    try {
      await deleteShoppingItem(id)
      await fetchData()
    } catch (error) {
      console.error('Erreur suppression item:', error)
    }
  }, [fetchData])

  const handlePlanShopping = useCallback(() => {
    // TODO: Ouvrir flow Plan Task avec description de la liste
    console.log('Plan shopping with items:', items.map(i => i.content).join(', '))
  }, [items])

  const handleRenameList = useCallback(async () => {
    if (!list) return
    const newName = prompt('Nouveau nom de la liste:', list.name)
    if (!newName || newName === list.name) return

    try {
      await renameShoppingList(list.id, newName)
      await fetchData()
    } catch (error) {
      console.error('Erreur renommage liste:', error)
    }
  }, [list, fetchData])

  return (
    <div className="min-h-screen bg-mint pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-mint px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/clarte')}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-text-dark">Courses</h1>
          </div>

          {/* Nom de la liste */}
          {list && (
            <button
              onClick={handleRenameList}
              className="flex items-center gap-2 mt-3 text-text-muted hover:text-text-dark transition-colors"
            >
              <span className="text-sm">{list.name}</span>
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
        </header>

        {/* Contenu */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="text-center py-12 text-text-muted">Chargement...</div>
          ) : (
            <div className="space-y-4">
              {/* Input ajout */}
              <form onSubmit={handleAddItem} className="flex gap-2">
                <div className="flex-1 relative">
                  <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Ajouter un article..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newItemText.trim() || isAdding}
                  className="px-4 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors"
                >
                  Ajouter
                </button>
              </form>

              {/* Liste des items */}
              {items.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  Aucun article dans la liste
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-border divide-y divide-border">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <button
                        onClick={() => handleToggleItem(item.id)}
                        className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
                      >
                        {/* Checkbox vide */}
                      </button>
                      <span className="flex-1 text-text-dark">{item.content}</span>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Bouton planifier */}
              {items.length > 0 && (
                <button
                  onClick={handlePlanShopping}
                  className="w-full py-3 px-4 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                  Planifier les courses
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
