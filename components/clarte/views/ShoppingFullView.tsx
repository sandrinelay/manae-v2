'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  fetchAllShoppingItems,
  toggleShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  addShoppingItem,
  fetchActiveShoppingList
} from '@/services/shopping.service'
import { TabBar } from '@/components/clarte/tabs/TabBar'
import { ShoppingItemRow } from '@/components/clarte/cards/ShoppingItemRow'
import { ShoppingItemModal } from '@/components/clarte/modals/ShoppingItemModal'
import { EmptyState } from '@/components/clarte/EmptyState'
import { PlusIcon } from '@/components/ui/icons'
import { ShoppingCategory, detectShoppingCategory, cleanShoppingItemContent } from '@/config/shopping-categories'
import type { Item } from '@/types/items'

type TabId = 'active' | 'completed'

const TABS = [
  { id: 'active' as TabId, label: 'À acheter' },
  { id: 'completed' as TabId, label: 'Achetés' }
]

interface ShoppingFullViewProps {
  items: Item[]
  onRefresh: () => Promise<void>
}

export function ShoppingFullView({ items: initialItems, onRefresh }: ShoppingFullViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('active')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [allItems, setAllItems] = useState<Item[]>(initialItems)
  const [isLoading, setIsLoading] = useState(false)
  const [newItemContent, setNewItemContent] = useState('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [listId, setListId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch liste active pour avoir le list_id
  useEffect(() => {
    async function fetchList() {
      try {
        const list = await fetchActiveShoppingList()
        if (list) {
          setListId(list.id)
        }
      } catch (error) {
        console.error('Erreur fetch liste:', error)
      }
    }
    fetchList()
  }, [])

  // Fetch tous les articles
  const fetchItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchAllShoppingItems()
      setAllItems(data)
    } catch (error) {
      console.error('Erreur fetch items:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Charger tous les articles au montage
  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Refresh
  const handleRefresh = useCallback(async () => {
    await onRefresh()
    await fetchItems()
  }, [onRefresh, fetchItems])

  // Filtrer les articles selon l'onglet
  const activeItems = useMemo(() =>
    allItems.filter(item => item.state === 'active'),
    [allItems]
  )

  const completedItems = useMemo(() =>
    allItems.filter(item => item.state === 'completed'),
    [allItems]
  )

  // Compteurs pour les onglets
  const tabsWithCounts = useMemo(() => TABS.map(tab => ({
    ...tab,
    count: tab.id === 'active' ? activeItems.length : completedItems.length
  })), [activeItems.length, completedItems.length])

  // Handlers
  const handleTapItem = useCallback((id: string) => {
    const item = allItems.find(i => i.id === id)
    if (item) setSelectedItem(item)
  }, [allItems])

  const handleToggle = useCallback(async (id: string) => {
    const item = allItems.find(i => i.id === id)
    if (!item) return

    try {
      await toggleShoppingItem(id, item.state)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur toggle:', error)
    }
  }, [allItems, handleRefresh])

  const handleEdit = useCallback(async (id: string, content: string, category: ShoppingCategory) => {
    try {
      await updateShoppingItem(id, content, category)
      setSelectedItem(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur modification:', error)
    }
  }, [handleRefresh])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteShoppingItem(id)
      setSelectedItem(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }, [handleRefresh])

  const handleAddItem = useCallback(async () => {
    if (!newItemContent.trim() || !listId) return

    try {
      setIsAddingItem(true)
      const cleanedContent = cleanShoppingItemContent(newItemContent)
      await addShoppingItem(listId, cleanedContent)
      setNewItemContent('')
      await handleRefresh()
      inputRef.current?.focus()
    } catch (error) {
      console.error('Erreur ajout:', error)
    } finally {
      setIsAddingItem(false)
    }
  }, [newItemContent, listId, handleRefresh])

  // Articles à afficher selon l'onglet actif
  const displayedItems = activeTab === 'active' ? activeItems : completedItems

  return (
    <>
      {/* Input d'ajout rapide */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newItemContent}
            onChange={(e) => setNewItemContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newItemContent.trim()) {
                handleAddItem()
              }
            }}
            placeholder="Ajouter un article..."
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            disabled={isAddingItem || !listId}
          />
          <button
            onClick={handleAddItem}
            disabled={!newItemContent.trim() || isAddingItem || !listId}
            className="px-4 py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {/* Onglets */}
      <TabBar
        tabs={tabsWithCounts}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
        className="border-b border-gray-100 pb-2"
      />

      {/* Contenu */}
      <div className="mt-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : displayedItems.length === 0 ? (
          <EmptyState
            message={activeTab === 'active'
              ? "Aucun article à acheter"
              : "Aucun article acheté"
            }
          />
        ) : (
          <div className="space-y-2">
            {displayedItems.map(item => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onTap={handleTapItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de détail */}
      {selectedItem && (
        <ShoppingItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
        />
      )}
    </>
  )
}
