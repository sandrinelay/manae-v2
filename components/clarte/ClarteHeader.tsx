'use client'

import { SearchInput } from './SearchInput'
import { FilterChips, type FilterType } from './FilterChips'

interface ClarteHeaderProps {
  activeFilter: FilterType
  counts: {
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
    <header className="sticky top-0 z-10 bg-mint pt-4 pb-2 px-4 -mx-4">
      <SearchInput onSearch={onSearch} onClear={onClearSearch} />
      <div className="mt-3">
        <FilterChips
          activeFilter={activeFilter}
          counts={counts}
          onFilterChange={onFilterChange}
        />
      </div>
    </header>
  )
}
