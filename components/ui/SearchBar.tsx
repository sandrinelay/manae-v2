'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { SearchIcon, XIcon } from '@/components/ui/icons'

/**
 * Normalise une chaîne: minuscules + sans accents
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

interface SearchBarProps {
  placeholder?: string
  debounceMs?: number
  onSearch: (query: string) => void
  onClear: () => void
  className?: string
}

export function SearchBar({
  placeholder = 'Rechercher...',
  debounceMs = 300,
  onSearch,
  onClear,
  className = ''
}: SearchBarProps) {
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
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, onSearch, onClear, debounceMs])

  const handleClear = useCallback(() => {
    setQuery('')
    onClear()
    inputRef.current?.focus()
  }, [onClear])

  return (
    <div className={`relative ${className}`}>
      <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="input-field !pl-12 !pr-10 py-3.5 rounded-2xl border-0"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Effacer la recherche"
        >
          <XIcon className="w-4 h-4 text-text-muted" />
        </button>
      )}
    </div>
  )
}
