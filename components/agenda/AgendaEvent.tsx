import { Calendar, Zap } from 'lucide-react'
import { CONTEXT_CONFIG } from '@/config/contexts'
import type { AgendaEvent as AgendaEventType } from '@/hooks/useAgenda'
import type { ItemContext } from '@/types/items'

interface AgendaEventProps {
  event: AgendaEventType
}

export function AgendaEvent({ event }: AgendaEventProps) {
  const isManae = event.source === 'manae'

  // Icône source
  const SourceIcon = isManae ? Zap : Calendar
  const sourceColor = isManae ? 'text-teal-500' : 'text-blue-500'

  // Couleur contexte pour les tâches Manae
  const contextConfig = isManae && event.contextColor
    ? CONTEXT_CONFIG[event.contextColor as ItemContext]
    : null

  return (
    <div className="flex items-start gap-3 py-2">
      {/* Heure */}
      <span className="text-xs text-text-muted w-10 shrink-0 pt-0.5 tabular-nums">
        {event.startTime}
      </span>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-dark truncate">{event.title}</p>
        {event.endTime && (
          <p className="text-xs text-text-muted">{`\u2192 ${event.endTime}`}</p>
        )}
      </div>

      {/* Icône source */}
      <div className="flex items-center gap-1 shrink-0">
        {contextConfig && (
          <contextConfig.icon className={`w-3 h-3 ${contextConfig.colorClass}`} />
        )}
        <SourceIcon className={`w-3.5 h-3.5 ${sourceColor}`} />
      </div>
    </div>
  )
}
