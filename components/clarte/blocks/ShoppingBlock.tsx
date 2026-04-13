'use client'

import { ChevronRight } from 'lucide-react'
import { EmptyState, EMPTY_STATE_CONFIG } from '../EmptyState'
import type { List, ListSlug } from '@/types/lists'

interface ListWithCount extends List {
  activeCount: number
}

interface ShoppingBlockProps {
  listsWithCounts: ListWithCount[]
  onViewAll?: () => void
  onOpenList?: (slug: ListSlug) => void
}

export function ShoppingBlock({ listsWithCounts, onViewAll, onOpenList }: ShoppingBlockProps) {
  const nonEmptyLists = listsWithCounts.filter(l => l.activeCount > 0)
  const totalCount = listsWithCounts.reduce((sum, l) => sum + l.activeCount, 0)

  return (
    <section>
      <button
        onClick={onViewAll}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <h2 className="typo-section-label group-hover:text-primary/80 transition-colors">
          Achats
        </h2>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-xs text-text-muted">
              {totalCount} article{totalCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-text-muted group-hover:text-primary transition-colors">
            →
          </span>
        </div>
      </button>

      {totalCount === 0 ? (
        <EmptyState {...EMPTY_STATE_CONFIG.shopping} />
      ) : (
        <div className="space-y-1">
          {nonEmptyLists.map(list => (
            <button
              key={list.id}
              onClick={() => onOpenList?.(list.slug as ListSlug)}
              className="w-full flex items-center justify-between py-1.5 text-left hover:bg-gray-50 rounded-lg px-1 transition-colors"
            >
              <span className="text-sm text-text-dark">{list.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-text-muted">
                  {list.activeCount} article{list.activeCount > 1 ? 's' : ''}
                </span>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
