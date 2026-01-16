'use client'

import { useRef, useCallback } from 'react'
import { Item } from '@/types/items'
import { SHOPPING_CATEGORY_CONFIG, type ShoppingCategory } from '@/config/shopping-categories'
import { CheckIcon } from '@/components/ui/icons'

interface ShoppingItemRowProps {
  item: Item
  onToggle: (id: string) => void
  onTap?: (id: string) => void
  onLongPress?: (id: string) => void
}

const LONG_PRESS_DURATION = 500 // ms

export function ShoppingItemRow({ item, onToggle, onTap, onLongPress }: ShoppingItemRowProps) {
  const isCompleted = item.state === 'completed'
  const category = (item.shopping_category || 'other') as ShoppingCategory
  const categoryConfig = SHOPPING_CATEGORY_CONFIG[category]
  const CategoryIcon = categoryConfig?.icon

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressing = useRef(false)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(item.id)
  }

  const handleTap = () => {
    // Ne pas déclencher le tap si on vient de faire un long press
    if (isLongPressing.current) {
      isLongPressing.current = false
      return
    }
    if (onTap) {
      onTap(item.id)
    }
  }

  // Handlers pour le long press (touch)
  const handleTouchStart = useCallback(() => {
    if (!onLongPress) return

    longPressTimer.current = setTimeout(() => {
      isLongPressing.current = true
      onLongPress(item.id)
    }, LONG_PRESS_DURATION)
  }, [onLongPress, item.id])

  const handleTouchMove = useCallback(() => {
    // Annuler le long press si l'utilisateur bouge (scroll)
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  // Handler clic droit (desktop)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (onLongPress) {
      e.preventDefault()
      onLongPress(item.id)
    }
  }, [onLongPress, item.id])

  return (
    <div
      onClick={handleTap}
      onTouchStart={onLongPress ? handleTouchStart : undefined}
      onTouchMove={onLongPress ? handleTouchMove : undefined}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
      onContextMenu={handleContextMenu}
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
        ${categoryConfig?.bgClass}
      `}>
       {CategoryIcon && <CategoryIcon className={`w-4 h-4 ${categoryConfig?.colorClass}`} />}
      </div>
    </div>
  )
}
