'use client'

import { Item, ItemState } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { CalendarIcon, TrashIcon } from '@/components/ui/icons/ItemTypeIcons'
import { formatScheduledDate } from '@/lib/date-utils'

interface TaskCardProps {
  item: Item
  onPlan?: (id: string) => void
  onDelete?: (id: string) => void
  onMarkDone?: (id: string) => void
}

// Couleurs douces pour les boutons d'action
const ACTION_COLORS = {
  calendar: {
    bg: 'bg-teal-50',
    text: 'text-teal-500',
    hover: 'hover:bg-teal-100'
  },
  trash: {
    bg: 'bg-rose-50',
    text: 'text-rose-400',
    hover: 'hover:bg-rose-100'
  }
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

export function TaskCard({ item, onPlan, onDelete, onMarkDone }: TaskCardProps) {
  const context = item.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  const state = item.state || 'active'
  const statusConfig = STATUS_CONFIG[state]
  const isInactive = state === 'completed' || state === 'archived'

  // Afficher le bouton planifier seulement si active ou captured
  const showPlanButton = state === 'active' || state === 'captured'

  return (
    <div className={`
      bg-white rounded-2xl p-4 border border-gray-100
      transition-all duration-200
      ${isInactive ? 'opacity-60' : ''}
    `}>
      {/* Indicateur + Titre */}
      <div className="flex items-start gap-3">
        {/* Indicateur de statut (point coloré) */}
        <div className={`
          w-2 h-2 rounded-full mt-2 shrink-0
          ${statusConfig.dotColor}
        `} />

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <h3 className={`
            font-medium leading-snug
            ${isInactive ? 'text-gray-400 line-through' : 'text-text-dark'}
          `}>
            {item.content}
          </h3>

          {/* Statut + Date (si planifié) + Contexte */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className={`text-xs font-medium uppercase tracking-wide ${statusConfig.className}`}>
              {statusConfig.label}
            </span>
            {state === 'planned' && item.scheduled_at && (
              <span className="text-xs text-text-muted">
                {formatScheduledDate(item.scheduled_at)}
              </span>
            )}
            <ContextIcon className={`w-4 h-4 ${contextConfig.colorClass}`} />
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Bouton Planifier */}
          {showPlanButton && onPlan && (
            <button
              onClick={() => onPlan(item.id)}
              className={`
                p-2 rounded-xl transition-colors
                ${ACTION_COLORS.calendar.bg} ${ACTION_COLORS.calendar.text} ${ACTION_COLORS.calendar.hover}
              `}
              aria-label="Planifier"
            >
              <CalendarIcon className="w-5 h-5" />
            </button>
          )}

          {/* Bouton Supprimer */}
          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className={`
                p-2 rounded-xl transition-colors
                ${ACTION_COLORS.trash.bg} ${ACTION_COLORS.trash.text} ${ACTION_COLORS.trash.hover}
              `}
              aria-label="Supprimer"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
