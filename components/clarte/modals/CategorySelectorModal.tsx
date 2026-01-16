'use client'

import { XIcon } from '@/components/ui/icons'
import {
  SHOPPING_CATEGORY_CONFIG,
  SHOPPING_CATEGORIES,
  type ShoppingCategory
} from '@/config/shopping-categories'

interface CategorySelectorModalProps {
  currentCategory: ShoppingCategory
  onSelect: (category: ShoppingCategory) => void
  onClose: () => void
}

export function CategorySelectorModal({
  currentCategory,
  onSelect,
  onClose
}: CategorySelectorModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 bottom-4 z-50 bg-white rounded-2xl shadow-2xl max-w-md mx-auto animate-slide-up safe-area-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="font-medium text-text-dark">Changer de catégorie</span>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Grid de catégories */}
        <div className="p-4 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
          {SHOPPING_CATEGORIES.map((category) => {
            const config = SHOPPING_CATEGORY_CONFIG[category]
            const Icon = config.icon
            const isSelected = category === currentCategory

            return (
              <button
                key={category}
                onClick={() => {
                  onSelect(category)
                  onClose()
                }}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                  ${isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }
                `}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bgClass}`}>
                  <Icon className={`w-5 h-5 ${config.colorClass}`} />
                </div>
                <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-text-dark'}`}>
                  {config.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
