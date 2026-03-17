'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  toggleShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  addShoppingItem,
  clearCompletedShoppingItems,
  updateShoppingItemCategory
} from '@/services/shopping.service'
import { getItemsByList, moveItemToList } from '@/services/lists.service'
import { ShoppingItemRow } from '@/components/clarte/cards/ShoppingItemRow'
import { ShoppingItemModal } from '@/components/clarte/modals/ShoppingItemModal'
import { PlanShoppingModal } from '@/components/clarte/modals/PlanShoppingModal'
import { CategorySelectorModal } from '@/components/clarte/modals/CategorySelectorModal'
import { EmptyState, EMPTY_STATE_CONFIG } from '@/components/clarte/EmptyState'
import {
  PlusIcon,
  CalendarIcon,
  TrashIcon
} from '@/components/ui/icons'
import { ActionButton } from '@/components/ui/ActionButton'
import {
  type ShoppingCategory,
  cleanShoppingItemContent,
  SHOPPING_CATEGORY_ORDER,
  SHOPPING_CATEGORY_CONFIG
} from '@/config/shopping-categories'
import type { Item } from '@/types/items'
import type { List, ListSlug } from '@/types/lists'

interface ListWithCount extends List {
  activeCount: number
}

interface ShoppingFullViewProps {
  lists: ListWithCount[]
  initialTab?: ListSlug
  onRefresh: () => Promise<void>
  initialShowPlanModal?: boolean
  onPlanModalClosed?: () => void
  onShowPlanModal?: (itemCount: number, listName?: string) => void
  externalPlanModalControl?: boolean
}

// Groupe les articles par catégorie dans l'ordre logique du magasin
function groupByCategory(items: Item[]): Map<ShoppingCategory, Item[]> {
  const grouped = new Map<ShoppingCategory, Item[]>()

  for (const category of SHOPPING_CATEGORY_ORDER) {
    grouped.set(category, [])
  }

  for (const item of items) {
    const category = (item.shopping_category || 'other') as ShoppingCategory
    const categoryItems = grouped.get(category) || []
    categoryItems.push(item)
    grouped.set(category, categoryItems)
  }

  return grouped
}

export function ShoppingFullView({
  lists,
  initialTab,
  onRefresh,
  initialShowPlanModal = false,
  onPlanModalClosed,
  onShowPlanModal,
  externalPlanModalControl = false
}: ShoppingFullViewProps) {
  const [activeTab, setActiveTab] = useState<ListSlug>(
    (initialTab as ListSlug) || (lists[0]?.slug as ListSlug) || 'alimentaire'
  )
  const [items, setItems] = useState<Item[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [newItemContent, setNewItemContent] = useState('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(initialShowPlanModal)
  const [isClearingCompleted, setIsClearingCompleted] = useState(false)
  const [itemToChangeCategory, setItemToChangeCategory] = useState<Item | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeList = lists.find(l => l.slug === activeTab) ?? null

  // Ouvrir la modale si le prop change (retour après connexion Google)
  useEffect(() => {
    if (initialShowPlanModal) {
      setShowPlanModal(true)
    }
  }, [initialShowPlanModal])

  // Charger les articles de la liste active
  const loadItems = useCallback(async () => {
    if (!activeList) return
    setIsLoadingItems(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const data = await getItemsByList(supabase, user.id, activeList.id)
      setItems(data)
    } catch (error) {
      console.error('Erreur chargement articles:', error)
    } finally {
      setIsLoadingItems(false)
    }
  }, [activeList])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  // Refresh complet (données parent + items locaux)
  const handleRefresh = useCallback(async () => {
    await onRefresh()
    await loadItems()
  }, [onRefresh, loadItems])

  // Articles filtrés par état
  const activeItems = useMemo(() =>
    items.filter(item => item.state === 'active'),
    [items]
  )

  const completedItems = useMemo(() =>
    items.filter(item => item.state === 'completed'),
    [items]
  )

  // Articles actifs groupés par catégorie (pour la liste Alimentaire)
  const groupedActiveItems = useMemo(() =>
    groupByCategory(activeItems),
    [activeItems]
  )

  // Handlers
  const handleTapItem = useCallback((id: string) => {
    const item = items.find(i => i.id === id)
    if (item) setSelectedItem(item)
  }, [items])

  const handleToggle = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    try {
      await toggleShoppingItem(id, item.state)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur toggle:', error)
    }
  }, [items, handleRefresh])

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
    if (!newItemContent.trim() || !activeList) return

    try {
      setIsAddingItem(true)
      const cleanedContent = cleanShoppingItemContent(newItemContent)
      await addShoppingItem(activeList.id, cleanedContent)
      setNewItemContent('')
      await handleRefresh()
      inputRef.current?.focus()
    } catch (error) {
      console.error('Erreur ajout:', error)
    } finally {
      setIsAddingItem(false)
    }
  }, [newItemContent, activeList, handleRefresh])

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

  const handleLongPress = useCallback((id: string) => {
    const item = items.find(i => i.id === id)
    if (item) {
      setItemToChangeCategory(item)
    }
  }, [items])

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

  const handleMoveItem = useCallback(async (itemId: string, targetListId: string) => {
    try {
      const supabase = createClient()
      await moveItemToList(supabase, itemId, targetListId)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur déplacement:', error)
    }
  }, [handleRefresh])

  return (
    <div className="w-full">
      {/* Bouton principal planification */}
      <div className="w-full mb-4">
        <ActionButton
          label="Faire les achats"
          icon={<CalendarIcon className="w-5 h-5" />}
          variant="plan"
          onClick={() => {
            if (externalPlanModalControl && onShowPlanModal) {
              onShowPlanModal(activeItems.length, activeList?.name)
            } else {
              setShowPlanModal(true)
            }
          }}
          disabled={activeItems.length === 0}
          fullWidth
        />
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
            placeholder={`Ajouter dans ${activeList?.name ?? 'la liste'}...`}
            className="input-field flex-1"
            disabled={isAddingItem || !activeList}
          />
          <button
            onClick={handleAddItem}
            disabled={!newItemContent.trim() || isAddingItem || !activeList}
            className="px-4 py-3 rounded-xl bg-secondary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary/90 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {/* Onglets par liste */}
      <div className="flex gap-2 overflow-x-auto pb-2 px-4 shrink-0 scrollbar-none border-b border-border mb-4">
        {lists.map(list => {
          const count = list.activeCount
          return (
            <button
              key={list.slug}
              onClick={() => setActiveTab(list.slug as ListSlug)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === list.slug
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text-muted hover:bg-gray-200'
              }`}
            >
              {list.name}{count > 0 ? ` ${count}` : ''}
            </button>
          )
        })}
      </div>

      {/* Contenu */}
      <div className="w-full">
        {isLoadingItems ? (
          // Skeleton de chargement
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : activeItems.length === 0 && completedItems.length === 0 ? (
          <EmptyState {...EMPTY_STATE_CONFIG.shopping} />
        ) : activeTab === 'alimentaire' ? (
          // Vue groupée par catégorie pour la liste Alimentaire
          <div className="space-y-4">
            {SHOPPING_CATEGORY_ORDER.map(category => {
              const categoryItems = groupedActiveItems.get(category) || []
              if (categoryItems.length === 0) return null

              const config = SHOPPING_CATEGORY_CONFIG[category]
              const Icon = config.icon

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${config.bgClass}`}>
                      <Icon className={`w-3.5 h-3.5 ${config.colorClass}`} />
                    </div>
                    <span className={`text-sm font-medium ${config.colorClass}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-text-muted">
                      ({categoryItems.length})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {categoryItems.map((item, idx) => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        index={idx}
                        onToggle={handleToggle}
                        onTap={handleTapItem}
                        onLongPress={handleLongPress}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Articles achetés */}
            {completedItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-text-muted px-1">Achetés ({completedItems.length})</p>
                {completedItems.map((item, idx) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    index={idx}
                    onToggle={handleToggle}
                    onTap={handleTapItem}
                  />
                ))}
                <button
                  onClick={handleClearCompleted}
                  disabled={isClearingCompleted}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-red-200 text-red-500 font-medium hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                >
                  <TrashIcon className="w-5 h-5" />
                  <span>Vider les achetés</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          // Liste plate pour les autres onglets
          <div className="space-y-2">
            {activeItems.map((item, idx) => (
              <ShoppingItemRow
                key={item.id}
                item={item}
                index={idx}
                onToggle={handleToggle}
                onTap={handleTapItem}
                onLongPress={handleLongPress}
              />
            ))}

            {completedItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-text-muted px-1">Achetés ({completedItems.length})</p>
                {completedItems.map((item, idx) => (
                  <ShoppingItemRow
                    key={item.id}
                    item={item}
                    index={idx}
                    onToggle={handleToggle}
                    onTap={handleTapItem}
                  />
                ))}
                <button
                  onClick={handleClearCompleted}
                  disabled={isClearingCompleted}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-red-200 text-red-500 font-medium hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                >
                  <TrashIcon className="w-5 h-5" />
                  <span>Vider les achetés</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de détail article */}
      {selectedItem && (
        <ShoppingItemModal
          item={selectedItem}
          availableLists={lists}
          currentListId={activeList?.id ?? null}
          onClose={() => setSelectedItem(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          onMove={handleMoveItem}
        />
      )}

      {/* Modal de planification (seulement si pas de contrôle externe) */}
      {!externalPlanModalControl && showPlanModal && (
        <PlanShoppingModal
          listName={activeList?.name ?? 'Achats'}
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
    </div>
  )
}
