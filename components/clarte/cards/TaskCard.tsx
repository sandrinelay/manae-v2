'use client'

import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { CalendarIcon, ClockIcon } from '@/components/ui/icons/ItemTypeIcons'
import { formatScheduledDate } from '@/lib/date-utils'

interface TaskCardProps {
  item: Item
  onMarkDone: (id: string) => void
  onPlan: (id: string) => void
  onPostpone: (id: string) => void
  onClarify?: (id: string) => void
}

export function TaskCard({ item, onMarkDone, onPlan, onPostpone, onClarify }: TaskCardProps) {
  const context = item.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  const isPlanned = !!item.scheduled_at
  const isCaptured = item.state === 'captured'

  // Déterminer l'affichage selon l'état
  const statusDisplay = isPlanned
    ? { icon: <CalendarIcon className="w-4 h-4" />, text: formatScheduledDate(item.scheduled_at!) }
    : isCaptured
    ? { icon: <span>⚡</span>, text: 'À clarifier' }
    : { icon: <ClockIcon className="w-4 h-4" />, text: 'À planifier' }

  return (
    <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
      {/* Contenu */}
      <h3 className="font-medium text-text-dark line-clamp-2 mb-2">
        {item.content}
      </h3>

      {/* Statut */}
      <div className="flex items-center gap-1.5 text-sm text-text-muted mb-2">
        {statusDisplay.icon}
        <span>{statusDisplay.text}</span>
      </div>

      {/* Contexte */}
      <div className={`flex items-center gap-1.5 text-sm ${contextConfig.colorClass}`}>
        <ContextIcon className="w-4 h-4" />
        <span>{contextConfig.label}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
        <button
          onClick={() => onMarkDone(item.id)}
          className="flex-1 py-2 px-3 text-sm font-medium rounded-lg border border-border hover:bg-mint transition-colors"
        >
          Fait
        </button>

        {isPlanned ? (
          <button
            onClick={() => onPostpone(item.id)}
            className="flex-1 py-2 px-3 text-sm font-medium rounded-lg border border-border hover:bg-mint transition-colors"
          >
            Reporter
          </button>
        ) : isCaptured ? (
          <button
            onClick={() => onClarify?.(item.id)}
            className="flex-1 py-2 px-3 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-colors"
          >
            Clarifier
          </button>
        ) : (
          <button
            onClick={() => onPlan(item.id)}
            className="flex-1 py-2 px-3 text-sm font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-colors"
          >
            Planifier
          </button>
        )}
      </div>
    </div>
  )
}
