'use client'

import { useState } from 'react'
import { Item } from '@/types/items'
import { ShoppingItemChip } from '../cards/ShoppingItemChip'
import { EmptyState } from '../EmptyState'

// Configuration
const INITIAL_VISIBLE_COUNT = 8

interface ShoppingBlockProps {
  items: Item[]
  totalCount: number
  onToggleItem: (id: string) => void
  onPlanShopping?: () => void
}

export function ShoppingBlock({ items, totalCount, onToggleItem, onPlanShopping }: ShoppingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Nombre d'items visibles
  const visibleItems = isExpanded ? items : items.slice(0, INITIAL_VISIBLE_COUNT)
  const hiddenCount = items.length - INITIAL_VISIBLE_COUNT
  const hasMoreItems = hiddenCount > 0

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
          Courses
        </h2>
        {totalCount > 0 && (
          <span className="text-xs text-text-muted">
            {totalCount} article{totalCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* État vide */}
      {items.length === 0 ? (
        <EmptyState message="Aucun article pour le moment" />
      ) : (
        <>
          {/* Grille d'articles */}
          <div className="flex flex-wrap gap-2">
            {visibleItems.map(item => (
              <ShoppingItemChip
                key={item.id}
                item={item}
                onToggle={onToggleItem}
              />
            ))}
          </div>

          {/* Bouton dépliant */}
          {hasMoreItems && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-4 py-3 text-sm font-medium text-text-muted hover:text-text-dark transition-colors border-t border-gray-100"
            >
              {isExpanded
                ? '− Réduire'
                : `+ Voir les ${hiddenCount} autre${hiddenCount > 1 ? 's' : ''} article${hiddenCount > 1 ? 's' : ''}`
              }
            </button>
          )}
        </>
      )}
    </section>
  )
}
