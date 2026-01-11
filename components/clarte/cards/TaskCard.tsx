'use client'

import { Item, ItemState } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { IconButton } from '@/components/ui/IconButton'
import { formatScheduledDate, formatRelativeTime } from '@/lib/date-utils'
import { Calendar, Check } from 'lucide-react'

// Mode d'affichage de la carte
type CardMode = 'active' | 'done' | 'stored'

interface TaskCardProps {
  item: Item
  mode?: CardMode // Par défaut 'active'
  onMarkDone?: (id: string) => void
  onPlan?: (id: string) => void
  onTap?: (id: string) => void // Pour ouvrir la modal de détail
}


// Configuration des statuts selon l'état de l'item
const STATUS_CONFIG: Record<ItemState, { label: string; className: string; dotColor: string }> = {
  captured: {
    label: 'À CLARIFIER',
    className: 'text-amber-600',
    dotColor: 'bg-amber-500'
  },
  active: {
    label: 'À TRAITER',
    className: 'text-teal-600',
    dotColor: 'bg-teal-500'
  },
  planned: {
    label: 'POSÉ',
    className: 'text-blue-600',
    dotColor: 'bg-blue-500'
  },
  project: {
    label: 'PROJET',
    className: 'text-purple-600',
    dotColor: 'bg-purple-500'
  },
  completed: {
    label: 'FAIT',
    className: 'text-gray-400',
    dotColor: 'bg-gray-300'
  },
  archived: {
    label: 'RANGÉ',
    className: 'text-gray-400',
    dotColor: 'bg-gray-300'
  }
}

// Configuration pour les modes done/stored
const MODE_CONFIG: Record<'done' | 'stored', { dotColor: string; label: string; textClass: string }> = {
  done: {
    dotColor: 'bg-green-300',
    label: 'Terminé',
    textClass: 'text-text-dark'
  },
  stored: {
    dotColor: 'bg-gray-300',
    label: 'Rangé',
    textClass: 'text-gray-400'
  }
}

export function TaskCard({ item, mode = 'active', onMarkDone, onPlan, onTap }: TaskCardProps) {
  const context = item.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  const state = item.state || 'active'
  const statusConfig = STATUS_CONFIG[state]

  // Détermine si on affiche en mode spécial (done/stored)
  const isSpecialMode = mode === 'done' || mode === 'stored'
  const modeConfig = isSpecialMode ? MODE_CONFIG[mode] : null

  // Styles selon le mode
  const dotColor = modeConfig?.dotColor || statusConfig.dotColor
  const titleClass = modeConfig?.textClass || (state === 'completed' || state === 'archived' ? 'text-gray-400' : 'text-text-dark')
  const cardOpacity = mode === 'stored' ? 'opacity-70' : ''

  // En mode active, la carte est cliquable pour ouvrir la modal
  const showActions = mode === 'active'

  // Boutons selon l'état :
  // - active/captured : [Fait] [Caler]
  // - planned : [Fait] [Décaler]
  const isPlanned = state === 'planned'
  const planButtonLabel = isPlanned ? 'Décaler' : 'Caler'

  // Date relative pour les modes done/stored
  const relativeDate = isSpecialMode ? formatRelativeTime(item.updated_at || item.created_at) : null

  const handleCardClick = () => {
    if (onTap) {
      onTap(item.id)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
      className={`
        relative w-full text-left bg-white rounded-2xl p-4 border border-gray-100
        transition-all duration-200 hover:shadow-md cursor-pointer
        ${cardOpacity}
      `}
    >
      {/* Indicateur + Titre */}
      <div className="flex items-start gap-3">
        {/* Indicateur de statut (point coloré) */}
        <div className={`
          w-2 h-2 rounded-full mt-2 shrink-0
          ${dotColor}
        `} />

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium leading-snug ${titleClass}`}>
            {item.content}
          </h3>

          {/* Statut + Date + Contexte */}
          <div className="flex items-center gap-2 mt-1.5">
            {/* Mode active : affiche le statut normal */}
            {mode === 'active' && (
              <>
                <span className={`text-xs font-medium uppercase tracking-wide ${statusConfig.className}`}>
                  {statusConfig.label}
                </span>
                {state === 'planned' && item.scheduled_at && (
                  <span className="text-xs text-text-muted">
                    {formatScheduledDate(item.scheduled_at)}
                  </span>
                )}
              </>
            )}

            {/* Mode done/stored : affiche le label + date relative */}
            {isSpecialMode && modeConfig && (
              <span className="text-xs text-text-muted">
                {modeConfig.label} {relativeDate}
              </span>
            )}

            <ContextIcon className={`w-4 h-4 ${contextConfig.colorClass}`} />
          </div>
        </div>

        {/* Boutons d'action (seulement en mode active) */}
        {showActions && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Bouton Fait */}
            {onMarkDone && (
              <IconButton
                icon={<Check />}
                label="Marquer comme fait"
                variant="success"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkDone(item.id)
                }}
              />
            )}

            {/* Bouton Caler / Décaler */}
            {onPlan && (
              <IconButton
                icon={<Calendar />}
                label={planButtonLabel}
                variant="plan"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onPlan(item.id)
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
