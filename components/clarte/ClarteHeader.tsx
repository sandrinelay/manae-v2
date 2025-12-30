'use client'

import { SearchBar } from '@/components/ui/SearchBar'
import { FilterTabs } from '@/components/ui/FilterTabs'
import { ContextFilterTabs, type ContextFilterType } from '@/components/ui/ContextFilterTabs'
import type { FilterType } from '@/config/filters'

interface ClarteHeaderProps {
  activeFilter: FilterType
  activeContext: ContextFilterType
  counts?: {
    tasks: number
    notes: number
    ideas: number
    shopping: number
  }
  onFilterChange: (filter: FilterType) => void
  onContextChange: (context: ContextFilterType) => void
  onSearch: (query: string) => void
  onClearSearch: () => void
}

export function ClarteHeader({
  activeFilter,
  activeContext,
  counts,
  onFilterChange,
  onContextChange,
  onSearch,
  onClearSearch
}: ClarteHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-mint pt-4 pb-2">
      {/* Barre de recherche */}
      <SearchBar
        placeholder="Rechercher..."
        onSearch={onSearch}
        onClear={onClearSearch}
      />

      {/* Filtres par type */}
      <FilterTabs
        activeFilter={activeFilter}
        counts={counts}
        onFilterChange={onFilterChange}
        className="mt-3"
      />

      {/* Filtres par contexte (uniquement pour les notes) */}
      {activeFilter === 'notes' && (
        <>
          <div className="h-px bg-gray-200/50 mt-3" />
          <ContextFilterTabs
            activeContext={activeContext}
            onContextChange={onContextChange}
            className="mt-2"
          />
        </>
      )}
    </header>
  )
}

// Re-export des types pour la page
export type { FilterType, ContextFilterType }
