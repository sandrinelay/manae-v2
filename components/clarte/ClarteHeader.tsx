'use client'

import { SearchBar } from '@/components/ui/SearchBar'
import { FilterTabs } from '@/components/ui/FilterTabs'
import type { FilterType } from '@/config/filters'

interface ClarteHeaderProps {
  activeFilter: FilterType
  counts?: {
    tasks: number
    notes: number
    ideas: number
    shopping: number
  }
  onFilterChange: (filter: FilterType) => void
  onSearch: (query: string) => void
  onClearSearch: () => void
}

export function ClarteHeader({
  activeFilter,
  counts,
  onFilterChange,
  onSearch,
  onClearSearch
}: ClarteHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-mint pt-4 pb-2">
      {/* Barre de recherche */}
      <SearchBar
        placeholder="Rechercher une pensée..."
        onSearch={onSearch}
        onClear={onClearSearch}
      />

      {/* Filtres par type */}
      <FilterTabs
        activeFilter={activeFilter}
        counts={counts}
        onFilterChange={onFilterChange}
        className="mt-4"
      />
    </header>
  )
}

// Re-export du type pour la page
export type { FilterType }
