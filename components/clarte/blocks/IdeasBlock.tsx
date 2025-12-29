'use client'

import { useState } from 'react'
import { Item } from '@/types/items'
import { IdeaCard } from '../cards/IdeaCard'
import { EmptyState } from '../EmptyState'

// Configuration
const INITIAL_VISIBLE_COUNT = 4

interface IdeasBlockProps {
  ideas: Item[]
  totalCount: number
  onTapIdea: (id: string) => void
}

export function IdeasBlock({ ideas, totalCount, onTapIdea }: IdeasBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Nombre d'idées visibles
  const visibleIdeas = isExpanded ? ideas : ideas.slice(0, INITIAL_VISIBLE_COUNT)
  const hiddenCount = ideas.length - INITIAL_VISIBLE_COUNT
  const hasMoreIdeas = hiddenCount > 0

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
          Idées
        </h2>
        {totalCount > 0 && (
          <span className="text-xs text-text-muted">
            {totalCount} pensée{totalCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* État vide */}
      {ideas.length === 0 ? (
        <EmptyState message="Aucune idée pour le moment" />
      ) : (
        <>
          {/* Liste d'idées */}
          <div className="space-y-3">
            {visibleIdeas.map(idea => (
              <IdeaCard
                key={idea.id}
                item={idea}
                onTap={onTapIdea}
              />
            ))}
          </div>

          {/* Bouton dépliant */}
          {hasMoreIdeas && (
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
