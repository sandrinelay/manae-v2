'use client'

import { Item } from '@/types/items'

interface ShoppingItemChipProps {
  item: Item
  onToggle: (id: string) => void
}

export function ShoppingItemChip({ item, onToggle }: ShoppingItemChipProps) {
  const isCompleted = item.state === 'completed'

  return (
    <button
      onClick={() => onToggle(item.id)}
      className={`
        flex items-center gap-2 py-2 px-3 rounded-lg border transition-all
        ${isCompleted
          ? 'bg-gray-100 border-gray-200 line-through text-text-muted'
          : 'bg-white border-border hover:border-primary'
        }
      `}
    >
      <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs
        ${isCompleted ? 'bg-primary border-primary text-white' : 'border-gray-300'}
      `}>
        {isCompleted && '✓'}
      </span>
      <span className="truncate text-sm">{item.content}</span>
    </button>
  )
}
