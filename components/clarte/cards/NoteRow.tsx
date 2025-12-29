'use client'

import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { NoteIcon } from '@/components/ui/icons/ItemTypeIcons'
import { formatRelativeTime } from '@/lib/date-utils'

interface NoteRowProps {
  item: Item
  onTap: (id: string) => void
}

export function NoteRow({ item, onTap }: NoteRowProps) {
  const context = item.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  return (
    <button
      onClick={() => onTap(item.id)}
      className="w-full text-left py-3 border-b border-border last:border-b-0 hover:bg-mint/30 transition-colors"
    >
      <div className="flex items-start gap-2">
        <NoteIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-text-dark truncate">{item.content}</p>
          <div className={`flex items-center gap-1.5 text-xs mt-1 ${contextConfig.colorClass}`}>
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
