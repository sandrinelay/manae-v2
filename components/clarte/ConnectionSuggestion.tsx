'use client'

import { LinkIcon, X } from 'lucide-react'
import type { DailySuggestion, Item } from '@/types'

// ============================================
// HELPERS
// ============================================

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max) + '…'
}

// ============================================
// TYPES
// ============================================

interface ConnectionSuggestionProps {
  suggestion: DailySuggestion | null
  items: Item[]
  onDismiss: (id: string) => void
  onItemClick: (item: Item) => void
}

// ============================================
// COMPOSANT
// ============================================

/**
 * Bannière discrète affichant la connexion thématique du jour.
 * Rendu nul si aucune suggestion disponible.
 * Placée en haut de Clarté, au-dessus de tous les blocs.
 */
export function ConnectionSuggestion({
  suggestion,
  items,
  onDismiss,
  onItemClick
}: ConnectionSuggestionProps) {
  if (!suggestion) return null

  const item1 = items.find(i => i.id === suggestion.item_id_1) ?? null
  const item2 = items.find(i => i.id === suggestion.item_id_2) ?? null

  if (!item1 || !item2) return null

  return (
    <div className="bg-gray-50 border border-[var(--color-border)] rounded-xl p-4 space-y-3">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
          <LinkIcon className="w-4 h-4" />
          <span className="text-sm font-medium">On a remarqué un lien</span>
        </div>
        <button
          onClick={() => onDismiss(suggestion.id)}
          aria-label="Fermer la suggestion"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Paire d'items */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onItemClick(item1)}
          className="text-sm font-medium text-[var(--color-text-primary)] bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
        >
          {truncate(item1.content, 30)}
        </button>
        <span className="text-[var(--color-text-muted)] text-sm">→</span>
        <button
          onClick={() => onItemClick(item2)}
          className="text-sm font-medium text-[var(--color-text-primary)] bg-white border border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors text-left"
        >
          {truncate(item2.content, 30)}
        </button>
      </div>

      {/* Raison */}
      <p className="text-sm text-[var(--color-text-muted)] italic">
        &ldquo;{suggestion.reason}&rdquo;
      </p>
    </div>
  )
}
