'use client'

import { useRouter } from 'next/navigation'
import { Item } from '@/types/items'
import { ShoppingItemChip } from '../cards/ShoppingItemChip'
import { ChevronRightIcon, CalendarIcon } from '@/components/ui/icons/ItemTypeIcons'

interface ShoppingBlockProps {
  items: Item[]
  totalCount: number
  onToggleItem: (id: string) => void
  onPlanShopping: () => void
}

export function ShoppingBlock({ items, totalCount, onToggleItem, onPlanShopping }: ShoppingBlockProps) {
  const router = useRouter()
  const remainingCount = totalCount - items.length

  if (items.length === 0 && totalCount === 0) {
    return (
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-dark">Courses</h2>
        </div>
        <p className="text-text-muted text-center py-8">
          Aucun article pour le moment
        </p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <button
        onClick={() => router.push('/clarte/courses')}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <h2 className="text-lg font-semibold text-text-dark">Courses</h2>
        <span className="flex items-center gap-1 text-sm text-primary group-hover:underline">
          Voir tout ({totalCount})
          <ChevronRightIcon className="w-4 h-4" />
        </span>
      </button>

      {/* Grille d'articles */}
      <div className="flex flex-wrap gap-2 mb-3">
        {items.map(item => (
          <ShoppingItemChip
            key={item.id}
            item={item}
            onToggle={onToggleItem}
          />
        ))}
      </div>

      {/* Indication items restants */}
      {remainingCount > 0 && (
        <p className="text-sm text-text-muted mb-3">
          + {remainingCount} autres articles
        </p>
      )}

      {/* Bouton planifier */}
      <button
        onClick={onPlanShopping}
        className="w-full py-3 px-4 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-colors"
      >
        <CalendarIcon className="w-5 h-5" />
        Planifier les courses
      </button>
    </section>
  )
}
