'use client'

import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { NoteIcon, XIcon, EditIcon, ArchiveIcon, TrashIcon } from '@/components/ui/icons'
import { IconButton } from '@/components/ui/IconButton'
import { ActionButton } from '@/components/ui/ActionButton'
import { formatRelativeTime } from '@/lib/date-utils'

interface NoteDetailModalProps {
  note: Item
  onClose: () => void
  onEdit: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

export function NoteDetailModal({ note, onClose, onEdit, onArchive, onDelete }: NoteDetailModalProps) {
  const context = note.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-lg mx-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <NoteIcon className="w-5 h-5" />
            <span className="font-medium">Note</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4">
          <p className="text-text-dark text-lg">{note.content}</p>

          <div className={`flex items-center gap-1.5 text-sm mt-4 ${contextConfig.colorClass}`}>
            <ContextIcon className="w-4 h-4" />
            <span>{contextConfig.label}</span>
            <span className="text-text-muted">•</span>
            <span className="text-text-muted">Créée {formatRelativeTime(note.created_at)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-border">
          <ActionButton
            label="Modifier"
            icon={<EditIcon />}
            variant="secondary"
            onClick={() => onEdit(note.id)}
            className="flex-1"
          />
          <ActionButton
            label="Archiver"
            icon={<ArchiveIcon />}
            variant="archive"
            onClick={() => onArchive(note.id)}
            className="flex-1"
          />
          <IconButton
            icon={<TrashIcon />}
            label="Supprimer"
            variant="danger"
            size="md"
            onClick={() => onDelete(note.id)}
          />
        </div>
      </div>
    </>
  )
}
