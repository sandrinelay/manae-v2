'use client'

import { FILTER_CONFIG, type FilterType } from '@/config/filters'

interface FilterTabsProps {
  activeFilter: FilterType
  counts?: {
    tasks: number
    notes: number
    ideas: number
    shopping: number
  }
  onFilterChange: (filter: FilterType) => void
  showIndicator?: boolean
  className?: string
}

export function FilterTabs({
  activeFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  counts: _counts,
  onFilterChange,
  showIndicator = true,
  className = ''
}: FilterTabsProps) {
  return (
    <div className={`flex items-center justify-center gap-6 ${className}`}>
      {FILTER_CONFIG.map((filter) => {
        const isActive = activeFilter === filter.id
        const Icon = filter.icon

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] py-2 px-2 transition-all"
            aria-label={filter.label}
            aria-pressed={isActive}
          >
            <div
              className={`
                p-2.5 rounded-xl transition-colors
                ${isActive
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-dark'
                }
              `}
            >
              <Icon className="w-5 h-5" />
            </div>

            {/* Indicateur actif (point) */}
            {showIndicator && (
              <div
                className={`
                  w-1 h-1 rounded-full transition-all
                  ${isActive ? 'bg-primary scale-100' : 'bg-transparent scale-0'}
                `}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

// Export du type pour réutilisation
export type { FilterType }
