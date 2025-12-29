'use client'

import { useState, useEffect, useRef } from 'react'
import { SearchIcon, XIcon } from '@/components/ui/icons/ItemTypeIcons'

interface SearchInputProps {
  onSearch: (query: string) => void
  onClear: () => void
}

export function SearchInput({ onSearch, onClear }: SearchInputProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search
  useEffect(() => {
    if (query.length < 2) {
      if (query.length === 0) onClear()
      return
    }

    const timer = setTimeout(() => {
      onSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, onSearch, onClear])

  const handleClear = () => {
    setQuery('')
    onClear()
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une pensée..."
        className="w-full pl-10 pr-10 py-3 bg-gray-100 rounded-xl text-text-dark placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition-colors"
        >
          <XIcon className="w-4 h-4 text-text-muted" />
        </button>
      )}
    </div>
  )
}
