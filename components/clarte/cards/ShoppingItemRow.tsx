'use client'

import { Item } from '@/types/items'
import { SHOPPING_CATEGORY_CONFIG, ShoppingCategory } from '@/config/shopping-categories'
import { CheckIcon } from '@/components/ui/icons'

interface ShoppingItemRowProps {
  item: Item
  onToggle: (id: string) => void
  onTap?: (id: string) => void
}

export function ShoppingItemRow({ item, onToggle, onTap }: ShoppingItemRowProps) {
  const isCompleted = item.state === 'completed'
  const category = (item.shopping_category || 'other') as ShoppingCategory
  const categoryConfig = SHOPPING_CATEGORY_CONFIG[category]
  const CategoryIcon = categoryConfig.icon

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(item.id)
  }

  const handleTap = () => {
    if (onTap) {
      onTap(item.id)
    }
  }

  return (
    <div
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleTap()
        }
      }}
      className={`
        w-full flex items-center gap-3 p-3 rounded-xl border transition-all
        ${onTap ? 'cursor-pointer hover:shadow-sm' : ''}
        ${isCompleted
          ? 'bg-gray-50 border-gray-200'
          : 'bg-white border-border hover:border-primary/50'
        }
      `}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        aria-label={isCompleted ? 'Marquer comme non acheté' : 'Marquer comme acheté'}
        className={`
          w-6 h-6 rounded-lg border-2 flex items-center justify-center
          transition-all shrink-0
          ${isCompleted
            ? 'bg-primary border-primary text-white'
            : 'border-gray-300 hover:border-primary'
          }
        `}
      >
        {isCompleted && <CheckIcon className="w-4 h-4" />}
      </button>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <span className={`
          text-base leading-snug
          ${isCompleted ? 'line-through text-text-muted' : 'text-text-dark'}
        `}>
          {item.content}
        </span>
      </div>

      {/* Icône catégorie */}
      <div className={`
        shrink-0 w-8 h-8 rounded-lg flex items-center justify-center
        ${categoryConfig.bgClass}
      `}>
        <CategoryIcon className={`w-4 h-4 ${categoryConfig.colorClass}`} />
      </div>
    </div>
  )
}
