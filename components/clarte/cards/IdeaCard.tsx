'use client'

import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'

interface IdeaCardProps {
  item: Item
  onTap: (id: string) => void
}

// Configuration couleurs post-it par état
const STATE_CONFIG = {
  captured: {
    emoji: '💡',
    bgClass: 'bg-yellow-100' // #FEF9C3
  },
  active: {
    emoji: '💡',
    bgClass: 'bg-yellow-100' // #FEF9C3
  },
  project: {
    emoji: '✨',
    bgClass: 'bg-purple-100' // #F3E8FF
  },
  archived: {
    emoji: '📦',
    bgClass: 'bg-gray-100' // #F3F4F6
  }
} as const

export function IdeaCard({ item, onTap }: IdeaCardProps) {
  const context = item.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  const state = (item.state || 'active') as keyof typeof STATE_CONFIG
  const stateConfig = STATE_CONFIG[state] || STATE_CONFIG.active

  // Progression pour les projets
  const progress = getProjectProgress(item)

  // Titre : refined_title pour les projets, sinon content
  const title = getTitle(item)

  return (
    <button
      onClick={() => onTap(item.id)}
      className={`w-full aspect-square text-left rounded-xl p-3 transition-all hover:shadow-md hover:scale-[1.02] ${stateConfig.bgClass}`}
    >
      <div className="h-full flex flex-col">
        {/* Icône état (haut gauche) */}
        <div className="text-lg mb-2">
          {stateConfig.emoji}
        </div>

        {/* Titre (16px, max 3 lignes) */}
        <h3 className="flex-1 typo-card-title line-clamp-3">
          {title}
        </h3>

        {/* Footer */}
        <div className="mt-auto pt-2 space-y-1">
          {/* Badge contexte */}
          <div className={`flex items-center gap-1.5 text-xs ${contextConfig.colorClass}`}>
            <ContextIcon className="w-3.5 h-3.5" />
            <span>{contextConfig.label}</span>
          </div>

          {/* Progression si projet */}
          {progress && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span>📋</span>
              <span>{progress}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

function getTitle(item: Item): string {
  // Pour les projets, utiliser refined_title si disponible
  if (item.state === 'project') {
    const metadata = item.metadata as { refined_title?: string } | null
    if (metadata?.refined_title) return metadata.refined_title
  }
  return item.content || ''
}

function getProjectProgress(item: Item): string | null {
  if (item.state !== 'project') return null

  const metadata = item.metadata as { steps_count?: number; completed_steps?: number } | null
  if (!metadata?.steps_count) return null

  const completed = metadata.completed_steps || 0
  return `${completed}/${metadata.steps_count}`
}
