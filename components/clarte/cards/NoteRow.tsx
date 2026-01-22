'use client'

import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { NoteIcon } from '@/components/ui/icons'
import { formatRelativeTime } from '@/lib/date-utils'

interface NoteRowProps {
  item: Item
  index?: number
  onTap: (id: string) => void
}

export function NoteRow({ item, index = 0, onTap }: NoteRowProps) {
  const context = item.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  const staggerClass = index < 5 ? `stagger-${index + 1}` : ''

  return (
    <button
      onClick={() => onTap(item.id)}
      className={`w-full text-left py-3 border-b border-border last:border-b-0 hover:bg-mint/30 active:scale-[0.99] transition-all animate-slide-in-right ${staggerClass}`}
      style={{ opacity: 0, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start gap-2">
        <NoteIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="typo-card-title truncate">{item.content}</p>
          <div className={`flex items-center gap-1.5 typo-metadata mt-1 ${contextConfig.colorClass}`}>
            <ContextIcon className="w-3.5 h-3.5" />
            <span>{contextConfig.label}</span>
            <span className="text-text-muted">•</span>
            <span className="text-text-muted">{formatRelativeTime(item.updated_at)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}
