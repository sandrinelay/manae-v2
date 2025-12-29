'use client'

import { useRouter } from 'next/navigation'
import { Item } from '@/types/items'
import { IdeaCard } from '../cards/IdeaCard'
import { ChevronRightIcon } from '@/components/ui/icons/ItemTypeIcons'

interface IdeasBlockProps {
  ideas: Item[]
  totalCount: number
  onTapIdea: (id: string) => void
}

export function IdeasBlock({ ideas, totalCount, onTapIdea }: IdeasBlockProps) {
  const router = useRouter()

  if (ideas.length === 0) {
    return (
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-dark">Idées</h2>
        </div>
        <p className="text-text-muted text-center py-8">
          Aucune idée pour le moment
        </p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <button
        onClick={() => router.push('/clarte/idees')}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <h2 className="text-lg font-semibold text-text-dark">Idées</h2>
        <span className="flex items-center gap-1 text-sm text-primary group-hover:underline">
          Voir tout ({totalCount})
          <ChevronRightIcon className="w-4 h-4" />
        </span>
      </button>

      {/* Grille de cartes 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {ideas.map(idea => (
          <IdeaCard
            key={idea.id}
            item={idea}
            onTap={onTapIdea}
          />
        ))}
      </div>
    </section>
  )
}
