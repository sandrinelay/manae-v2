'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import {
  fetchAllShoppingItems,
  toggleShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  addShoppingItem,
  fetchActiveShoppingList,
  clearCompletedShoppingItems,
  updateShoppingItemCategory
} from '@/services/shopping.service'
import { TabBar } from '@/components/clarte/tabs/TabBar'
import { ShoppingItemRow } from '@/components/clarte/cards/ShoppingItemRow'
import { ShoppingItemModal } from '@/components/clarte/modals/ShoppingItemModal'
import { PlanShoppingModal } from '@/components/clarte/modals/PlanShoppingModal'
import { CategorySelectorModal } from '@/components/clarte/modals/CategorySelectorModal'
import { EmptyState } from '@/components/clarte/EmptyState'
import {
  PlusIcon,
  CalendarIcon,
  TrashIcon
} from '@/components/ui/icons'
import {
  type ShoppingCategory,
  cleanShoppingItemContent,
  SHOPPING_CATEGORY_ORDER,
  SHOPPING_CATEGORY_CONFIG
} from '@/config/shopping-categories'
import type { Item } from '@/types/items'

type TabId = 'active' | 'completed'

const TABS = [
  { id: 'active' as TabId, label: 'À acheter' },
  { id: 'completed' as TabId, label: 'Achetés' }
]

interface ShoppingFullViewProps {
  items: Item[]
  onRefresh: () => Promise<void>
  initialShowPlanModal?: boolean
  onPlanModalClosed?: () => void
}

// Groupe les articles par catégorie dans l'ordre logique du magasin
function groupByCategory(items: Item[]): Map<ShoppingCategory, Item[]> {
  const grouped = new Map<ShoppingCategory, Item[]>()

  // Initialiser toutes les catégories dans l'ordre
  for (const category of SHOPPING_CATEGORY_ORDER) {
    grouped.set(category, [])
  }

  // Répartir les items
  for (const item of items) {
    const category = (item.shopping_category || 'other') as ShoppingCategory
    const categoryItems = grouped.get(category) || []
    categoryItems.push(item)
    grouped.set(category, categoryItems)
  }

  return grouped
}

export function ShoppingFullView({
  items: initialItems,
  onRefresh,
  initialShowPlanModal = false,
  onPlanModalClosed
}: ShoppingFullViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('active')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [allItems, setAllItems] = useState<Item[]>(initialItems)
  const [isLoading, setIsLoading] = useState(false)
  const [newItemContent, setNewItemContent] = useState('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [listId, setListId] = useState<string | null>(null)
  const [showPlanModal, setShowPlanModal] = useState(initialShowPlanModal)
  const [isClearingCompleted, setIsClearingCompleted] = useState(false)
  const [itemToChangeCategory, setItemToChangeCategory] = useState<Item | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Ouvrir la modale si le prop change (retour après connexion Google)
  useEffect(() => {
    if (initialShowPlanModal) {
      setShowPlanModal(true)
    }
  }, [initialShowPlanModal])

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

  // Articles groupés par catégorie (pour l'onglet actif)
  const groupedActiveItems = useMemo(() =>
    groupByCategory(activeItems),
    [activeItems]
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

  // Vider les articles achetés
  const handleClearCompleted = useCallback(async () => {
    if (completedItems.length === 0) return

    try {
      setIsClearingCompleted(true)
      await clearCompletedShoppingItems()
      await handleRefresh()
    } catch (error) {
      console.error('Erreur vidage:', error)
    } finally {
      setIsClearingCompleted(false)
    }
  }, [completedItems.length, handleRefresh])

  // Changer la catégorie d'un article (long press)
  const handleLongPress = useCallback((id: string) => {
    const item = allItems.find(i => i.id === id)
    if (item) {
      setItemToChangeCategory(item)
    }
  }, [allItems])

  // Mettre à jour la catégorie
  const handleCategoryChange = useCallback(async (category: ShoppingCategory) => {
    if (!itemToChangeCategory) return

    try {
      await updateShoppingItemCategory(itemToChangeCategory.id, category)
      setItemToChangeCategory(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur changement catégorie:', error)
    }
  }, [itemToChangeCategory, handleRefresh])

  // Articles à afficher selon l'onglet actif
  const displayedItems = activeTab === 'active' ? activeItems : completedItems

  return (
    <>
      {/* Bouton principal */}
      <div className="mb-4">
        <button
          onClick={() => setShowPlanModal(true)}
          disabled={activeItems.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          <CalendarIcon className="w-5 h-5" />
          <span>Faire les courses</span>
        </button>
      </div>

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
            className="px-4 py-3 rounded-xl bg-secondary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary/90 transition-colors flex items-center gap-2"
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
        ) : activeTab === 'active' ? (
          // Vue groupée par catégorie pour les articles actifs
          <div className="space-y-4">
            {SHOPPING_CATEGORY_ORDER.map(category => {
              const items = groupedActiveItems.get(category) || []
              if (items.length === 0) return null

              const config = SHOPPING_CATEGORY_CONFIG[category]
              const Icon = config.icon

              return (
                <div key={category}>
                  {/* Header de catégorie */}
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${config.bgClass}`}>
                      <Icon className={`w-3.5 h-3.5 ${config.colorClass}`} />
                    </div>
                    <span className={`text-sm font-medium ${config.colorClass}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-text-muted">
                      ({items.length})
                    </span>
                  </div>

                  {/* Items de la catégorie */}
                  <div className="space-y-2">
                    {items.map(item => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        onToggle={handleToggle}
                        onTap={handleTapItem}
                        onLongPress={handleLongPress}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Liste simple pour les articles achetés + bouton vider
          <div className="space-y-2">
            {displayedItems.map(item => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onTap={handleTapItem}
              />
            ))}

            {/* Bouton vider la liste - en bas de l'onglet Achetés */}
            {completedItems.length > 0 && (
              <button
                onClick={handleClearCompleted}
                disabled={isClearingCompleted}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-red-200 text-red-500 font-medium hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
              >
                <TrashIcon className="w-5 h-5" />
                <span>Vider la liste</span>
              </button>
            )}
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

      {/* Modal de planification */}
      {showPlanModal && (
        <PlanShoppingModal
          itemCount={activeItems.length}
          onClose={() => {
            setShowPlanModal(false)
            onPlanModalClosed?.()
          }}
          onSuccess={handleRefresh}
        />
      )}

      {/* Modal de sélection de catégorie */}
      {itemToChangeCategory && (
        <CategorySelectorModal
          currentCategory={(itemToChangeCategory.shopping_category || 'other') as ShoppingCategory}
          onSelect={handleCategoryChange}
          onClose={() => setItemToChangeCategory(null)}
        />
      )}
    </>
  )
}
