'use client'

import { CalendarOffIcon, ClockIcon, TrashIcon } from '@/components/ui/icons'
import type { ScheduleException } from '@/types'

interface ExceptionCardProps {
  exception: ScheduleException
  onDelete: (id: string) => void
}

const TYPE_CONFIG = {
  blocked: {
    label: 'Bloqué',
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50',
    icon: CalendarOffIcon
  },
  modified: {
    label: 'Horaires réduits',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    icon: ClockIcon
  }
} as const

function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ExceptionCard({ exception, onDelete }: ExceptionCardProps) {
  const config = TYPE_CONFIG[exception.type]
  const Icon = config.icon
  const isSameDay = exception.start_date === exception.end_date

  const dateLabel = isSameDay
    ? formatDateFr(exception.start_date)
    : `${formatDateFr(exception.start_date)} → ${formatDateFr(exception.end_date)}`

  return (
    <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-[var(--color-border)]">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bgClass}`}>
        <Icon className={`w-4 h-4 ${config.colorClass}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-dark)] truncate">
          {exception.label}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{dateLabel}</p>
        {exception.type === 'modified' && exception.modified_start_time && (
          <p className="text-xs text-amber-600 mt-0.5">
            {exception.modified_start_time} – {exception.modified_end_time}
          </p>
        )}
      </div>

      <button
        onClick={() => onDelete(exception.id)}
        aria-label={`Supprimer l'exception ${exception.label}`}
        className="p-1.5 text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
