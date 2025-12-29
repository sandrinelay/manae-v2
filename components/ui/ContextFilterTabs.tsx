'use client'

import { CONTEXT_CONFIG } from '@/config/contexts'
import type { ItemContext } from '@/types/items'

// Types pour le filtre contexte
export type ContextFilterType = 'all' | ItemContext

interface ContextFilterTabsProps {
  activeContext: ContextFilterType
  onContextChange: (context: ContextFilterType) => void
  className?: string
}

// Icône "Tous" - cercle avec points
function AllContextsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Configuration du filtre avec "all" en premier
const CONTEXT_FILTERS: { id: ContextFilterType; icon: React.FC<{ className?: string }>; label: string; colorClass: string }[] = [
  { id: 'all', icon: AllContextsIcon, label: 'Tous', colorClass: 'text-text-muted' },
  ...Object.entries(CONTEXT_CONFIG).map(([key, config]) => ({
    id: key as ItemContext,
    icon: config.icon,
    label: config.label,
    colorClass: config.colorClass
  }))
]

export function ContextFilterTabs({
  activeContext,
  onContextChange,
  className = ''
}: ContextFilterTabsProps) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      {CONTEXT_FILTERS.map((filter) => {
        const isActive = activeContext === filter.id
        const Icon = filter.icon

        return (
          <button
            key={filter.id}
            onClick={() => onContextChange(filter.id)}
            className="flex flex-col items-center gap-1 py-1 px-1 transition-all"
            aria-label={filter.label}
            aria-pressed={isActive}
          >
            <div
              className={`
                p-1.5 rounded-lg transition-all
                ${isActive
                  ? `${filter.colorClass} bg-white shadow-sm`
                  : 'text-text-muted/50 hover:text-text-muted'
                }
              `}
            >
              <Icon className="w-4 h-4" />
            </div>

            {/* Indicateur actif (ligne) */}
            <div
              className={`
                w-4 h-0.5 rounded-full transition-all
                ${isActive ? 'bg-current opacity-60' : 'bg-transparent'}
              `}
              style={{ color: isActive ? undefined : 'transparent' }}
            />
          </button>
        )
      })}
    </div>
  )
}
