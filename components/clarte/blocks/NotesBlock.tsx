'use client'

import { useState } from 'react'
import { Item } from '@/types/items'
import { NoteRow } from '../cards/NoteRow'
import { EmptyState } from '../EmptyState'

// Configuration
const INITIAL_VISIBLE_COUNT = 4

interface NotesBlockProps {
  notes: Item[]
  totalCount: number
  onTapNote: (id: string) => void
}

export function NotesBlock({ notes, totalCount, onTapNote }: NotesBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Nombre de notes visibles
  const visibleNotes = isExpanded ? notes : notes.slice(0, INITIAL_VISIBLE_COUNT)
  const hiddenCount = notes.length - INITIAL_VISIBLE_COUNT
  const hasMoreNotes = hiddenCount > 0

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
          Notes
        </h2>
        {totalCount > 0 && (
          <span className="text-xs text-text-muted">
            {totalCount} pensée{totalCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* État vide */}
      {notes.length === 0 ? (
        <EmptyState message="Aucune note pour le moment" />
      ) : (
        <>
          {/* Liste de notes */}
          <div className="space-y-3">
            {visibleNotes.map(note => (
              <NoteRow
                key={note.id}
                item={note}
                onTap={onTapNote}
              />
            ))}
          </div>

          {/* Bouton dépliant */}
          {hasMoreNotes && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-4 py-3 text-sm font-medium text-text-muted hover:text-text-dark transition-colors border-t border-gray-100"
            >
              {isExpanded
                ? '− Réduire'
                : `+ Voir les ${hiddenCount} autre${hiddenCount > 1 ? 's' : ''} pensée${hiddenCount > 1 ? 's' : ''}`
              }
            </button>
          )}
        </>
      )}
    </section>
  )
}
