'use client'

import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'

interface IdeaCardProps {
  item: Item
  onTap: (id: string) => void
}

const STATE_CONFIG = {
  captured: {
    badge: 'À clarifier',
    emoji: '⚡',
    bgClass: 'bg-amber-50 border-amber-200'
  },
  active: {
    badge: 'À développer',
    emoji: '💡',
    bgClass: 'bg-teal-50 border-teal-200'
  },
  project: {
    badge: 'Projet',
    emoji: '✨',
    bgClass: 'bg-purple-50 border-purple-200'
  }
} as const

export function IdeaCard({ item, onTap }: IdeaCardProps) {
  const context = item.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  const state = item.state as 'captured' | 'active' | 'project'
  const stateConfig = STATE_CONFIG[state] || STATE_CONFIG.active

  // Progression pour les projets
  const progress = getProjectProgress(item)

  return (
    <button
      onClick={() => onTap(item.id)}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md ${stateConfig.bgClass}`}
    >
      {/* Contenu */}
      <h3 className="font-medium text-text-dark line-clamp-2 mb-3">
        {item.content}
      </h3>

      {/* Badge état */}
      <div className="text-sm font-medium mb-1">
        {stateConfig.emoji} {stateConfig.badge}
      </div>

      {/* Progression si projet */}
      {progress && (
        <div className="text-xs text-text-muted mb-2">
          {progress}
        </div>
      )}

      {/* Contexte */}
      <div className={`flex items-center gap-1.5 text-xs ${contextConfig.colorClass}`}>
        <ContextIcon className="w-3.5 h-3.5" />
        <span>{contextConfig.label}</span>
      </div>
    </button>
  )
}

function getProjectProgress(item: Item): string | null {
  if (item.state !== 'project') return null

  const metadata = item.metadata as { steps_count?: number; completed_steps?: number } | null
  if (!metadata?.steps_count) return null

  const completed = metadata.completed_steps || 0
  return `${completed}/${metadata.steps_count} étapes`
}
