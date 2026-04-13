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
  TrashIcon,
  XIcon
} from '@/components/ui/icons/index'
import { ActionButton } from '@/components/ui/ActionButton'
import { IconButton } from '@/components/ui/IconButton'
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

  // État du mode sélection multiple
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showMoveSelector, setShowMoveSelector] = useState(false)

  // IDs des items en cours de sortie (animation avant suppression/déplacement)
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set())

  const inputRef = useRef<HTMLInputElement>(null)

  const activeList = lists.find(l => l.slug === activeTab) ?? null
  const otherLists = lists.filter(l => l.slug !== activeTab)

  // Défini tôt pour être disponible dans les useEffect suivants
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false)
    setSelectedIds(new Set())
    setShowMoveSelector(false)
    setExitingIds(new Set())
  }, [])

  // Lance l'animation de sortie sur un ensemble d'IDs, puis exécute l'action
  const withExitAnimation = useCallback(async (ids: Set<string>, action: () => Promise<void>) => {
    setExitingIds(ids)
    await new Promise(resolve => setTimeout(resolve, 280))
    setExitingIds(new Set())
    await action()
  }, [])

  // Ouvrir la modale si le prop change (retour après connexion Google)
  useEffect(() => {
    if (initialShowPlanModal) {
      setShowPlanModal(true)
    }
  }, [initialShowPlanModal])

  // Quitter le mode sélection quand on change d'onglet
  useEffect(() => {
    exitSelectionMode()
  }, [activeTab, exitSelectionMode])

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

  // --- Handlers mode normal ---

  const handleTapItem = useCallback((id: string) => {
    if (isSelectionMode) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      return
    }
    const item = items.find(i => i.id === id)
    if (item) setSelectedItem(item)
  }, [items, isSelectionMode])

  const handleToggle = useCallback(async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    // Mise à jour optimiste : le rond se remplit immédiatement
    const newState = item.state === 'completed' ? 'active' : 'completed'
    setItems(prev => prev.map(i => i.id === id ? { ...i, state: newState } : i))

    try {
      await toggleShoppingItem(id, item.state)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur toggle:', error)
      // Revenir à l'état précédent en cas d'erreur
      setItems(prev => prev.map(i => i.id === id ? { ...i, state: item.state } : i))
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

    const segments = newItemContent
      .split(',')
      .map(s => cleanShoppingItemContent(s))
      .filter(s => s.length > 0)

    if (segments.length === 0) return

    try {
      setIsAddingItem(true)
      await Promise.all(segments.map(content => addShoppingItem(activeList.id, content)))
      setNewItemContent('')
      await handleRefresh()
    } catch (error) {
      console.error('Erreur ajout:', error)
    } finally {
      setIsAddingItem(false)
      setTimeout(() => inputRef.current?.focus(), 0)
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

  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true)
    setSelectedIds(new Set())
  }, [])

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

  // --- Handlers mode sélection multiple ---

  const handleSelectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(activeItems.map(i => i.id))
    setSelectedIds(allIds)
  }, [activeItems])

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return

    await withExitAnimation(selectedIds, async () => {
      try {
        await Promise.all(Array.from(selectedIds).map(id => deleteShoppingItem(id)))
        exitSelectionMode()
        await handleRefresh()
      } catch (error) {
        console.error('Erreur suppression multiple:', error)
      }
    })
  }, [selectedIds, exitSelectionMode, handleRefresh, withExitAnimation])

  const handleToggleSelected = useCallback(async () => {
    if (selectedIds.size === 0) return

    await withExitAnimation(selectedIds, async () => {
      try {
        await Promise.all(
          Array.from(selectedIds).map(id => {
            const item = items.find(i => i.id === id)
            if (!item) return Promise.resolve()
            return toggleShoppingItem(id, item.state)
          })
        )
        exitSelectionMode()
        await handleRefresh()
      } catch (error) {
        console.error('Erreur toggle multiple:', error)
      }
    })
  }, [selectedIds, items, exitSelectionMode, handleRefresh, withExitAnimation])

  const handleMoveSelected = useCallback(async (targetListId: string) => {
    if (selectedIds.size === 0) return

    await withExitAnimation(selectedIds, async () => {
      try {
        const supabase = createClient()
        await Promise.all(Array.from(selectedIds).map(id => moveItemToList(supabase, id, targetListId)))
        exitSelectionMode()
        await handleRefresh()
      } catch (error) {
        console.error('Erreur déplacement multiple:', error)
      }
    })
  }, [selectedIds, exitSelectionMode, handleRefresh, withExitAnimation])

  // Rendu d'un article avec les props de sélection
  const renderItem = (item: Item, idx: number) => (
    <ShoppingItemRow
      key={item.id}
      item={item}
      index={idx}
      onToggle={handleToggle}
      onTap={handleTapItem}
      isSelectionMode={isSelectionMode}
      isSelected={selectedIds.has(item.id)}
      onSelect={handleSelectItem}
      isExiting={exitingIds.has(item.id)}
    />
  )

  return (
    <div className="w-full">
      {/* Bouton principal planification — masqué en mode sélection */}
      {!isSelectionMode && (
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
      )}

      {/* Input d'ajout rapide — masqué en mode sélection */}
      {!isSelectionMode && (
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
      )}

      {/* Onglets + lien Sélectionner (mode normal) ou barre d'actions (mode sélection) */}
      {isSelectionMode ? (
        /* Barre d'actions — en haut, toujours visible */
        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-3 space-y-2 mb-4 animate-scale-in">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-text-dark)]">
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="text-sm text-[var(--color-primary)] font-medium hover:opacity-75 transition-opacity"
              >
                Tout sélectionner
              </button>
              <IconButton
                icon={<XIcon className="w-5 h-5" />}
                label="Annuler la sélection"
                variant="default"
                size="sm"
                onClick={exitSelectionMode}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <ActionButton
              label="Achetés"
              variant="done"
              onClick={handleToggleSelected}
              disabled={selectedIds.size === 0}
              className="flex-1"
            />
            {otherLists.length > 0 && (
              <ActionButton
                label="Déplacer"
                variant="secondary"
                onClick={() => setShowMoveSelector(prev => !prev)}
                disabled={selectedIds.size === 0}
                className="flex-1"
              />
            )}
            <ActionButton
              label="Supprimer"
              variant="delete"
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="flex-1"
            />
          </div>

          {showMoveSelector && otherLists.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <p className="w-full text-xs text-[var(--color-text-muted)]">Déplacer vers :</p>
              {otherLists.map(list => (
                <button
                  key={list.id}
                  onClick={() => handleMoveSelected(list.id)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-[var(--color-text-dark)] transition-colors"
                >
                  {list.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Onglets + lien Sélectionner */
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--color-border)]">
            {lists.map(list => {
              const count = list.activeCount
              return (
                <button
                  key={list.slug}
                  onClick={() => setActiveTab(list.slug as ListSlug)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === list.slug
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-gray-100 text-[var(--color-text-muted)] hover:bg-gray-200'
                  }`}
                >
                  {list.name}{count > 0 ? ` ${count}` : ''}
                </button>
              )
            })}
          </div>
          {activeItems.length > 0 && (
            <div className="flex justify-end mt-2 animate-fade-in">
              <button
                onClick={enterSelectionMode}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-dark)] transition-colors"
              >
                Sélectionner
              </button>
            </div>
          )}
        </div>
      )}

      {/* Contenu */}
      <div className="w-full pb-4">
        {isLoadingItems && items.length === 0 ? (
          // Skeleton uniquement au premier chargement (pas sur les refresh)
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
                    <span className="text-xs text-[var(--color-text-muted)]">
                      ({categoryItems.length})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {categoryItems.map((item, idx) => renderItem(item, idx))}
                  </div>
                </div>
              )
            })}

            {/* Articles achetés — masqués en mode sélection pour simplifier */}
            {!isSelectionMode && completedItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-[var(--color-text-muted)] px-1">Achetés ({completedItems.length})</p>
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
            {activeItems.map((item, idx) => renderItem(item, idx))}

            {/* Articles achetés — masqués en mode sélection pour simplifier */}
            {!isSelectionMode && completedItems.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-[var(--color-text-muted)] px-1">Achetés ({completedItems.length})</p>
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
