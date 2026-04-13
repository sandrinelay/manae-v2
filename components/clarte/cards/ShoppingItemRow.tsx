'use client'

import { useState, useCallback } from 'react'
import { Item } from '@/types/items'
import { SHOPPING_CATEGORY_CONFIG, type ShoppingCategory } from '@/config/shopping-categories'
import { CheckIcon } from '@/components/ui/icons/index'

interface ShoppingItemRowProps {
  item: Item
  index?: number
  onToggle: (id: string) => void
  onTap?: (id: string) => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
  isExiting?: boolean
}

export function ShoppingItemRow({
  item,
  index = 0,
  onToggle,
  onTap,
  isSelectionMode = false,
  isSelected = false,
  onSelect,
  isExiting = false,
}: ShoppingItemRowProps) {
  const [isAnimatingCheck, setIsAnimatingCheck] = useState(false)
  const [isAnimatingSelect, setIsAnimatingSelect] = useState(false)
  const isCompleted = item.state === 'completed'
  const category = (item.shopping_category || 'other') as ShoppingCategory
  const categoryConfig = SHOPPING_CATEGORY_CONFIG[category]
  const CategoryIcon = categoryConfig?.icon
  const staggerClass = index < 5 ? `stagger-${index + 1}` : ''

  const handleClick = useCallback(() => {
    if (isSelectionMode && onSelect) {
      setIsAnimatingSelect(true)
      setTimeout(() => setIsAnimatingSelect(false), 300)
      onSelect(item.id)
      return
    }
    onTap?.(item.id)
  }, [isSelectionMode, onSelect, onTap, item.id])

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelectionMode) return
    if (!isCompleted) {
      setIsAnimatingCheck(true)
      setTimeout(() => setIsAnimatingCheck(false), 300)
    }
    onToggle(item.id)
  }, [isSelectionMode, isCompleted, onToggle, item.id])

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-pressed={isSelectionMode ? isSelected : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      className={`
        w-full flex items-center gap-3 p-3 rounded-xl border transition-all select-none
        active:scale-[0.98] ${isExiting ? 'animate-fade-out-up' : `animate-slide-in-right ${staggerClass}`}
        ${onTap || isSelectionMode ? 'cursor-pointer hover:shadow-sm' : ''}
        ${isSelected
          ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]'
          : isCompleted
            ? 'bg-gray-50 border-gray-200'
            : 'bg-white border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
        }
      `}
      style={isExiting ? undefined : { opacity: 0, animationFillMode: 'forwards' }}
    >
      {/* Checkbox sélection ou achat */}
      {isSelectionMode ? (
        <button
          onClick={(e) => { e.stopPropagation(); setIsAnimatingSelect(true); setTimeout(() => setIsAnimatingSelect(false), 300); onSelect?.(item.id) }}
          aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
          className="min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center shrink-0"
        >
          <span className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
            ${isAnimatingSelect ? 'animate-pop-in' : ''}
            ${isSelected
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
              : 'border-gray-400 bg-white'
            }
          `}>
            {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
          </span>
        </button>
      ) : (
        <button
          onClick={handleToggle}
          aria-label={isCompleted ? 'Marquer comme non acheté' : 'Marquer comme acheté'}
          className="min-w-[44px] min-h-[44px] -m-2 flex items-center justify-center shrink-0"
        >
          <span className={`
            w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
            ${isAnimatingCheck ? 'animate-check-bounce' : ''}
            ${isCompleted
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
              : 'border-gray-300 hover:border-[var(--color-primary)]'
            }
          `}>
            {isCompleted && <CheckIcon className="w-4 h-4" />}
          </span>
        </button>
      )}

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <span className={`
          text-base leading-snug
          ${isCompleted ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-dark)]'}
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
