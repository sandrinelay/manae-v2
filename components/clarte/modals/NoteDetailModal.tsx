'use client'

import { useState, useRef, useEffect } from 'react'
import { Item, ItemContext } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { NoteIcon, XIcon, EditIcon, ArchiveIcon, TrashIcon } from '@/components/ui/icons'
import { IconButton } from '@/components/ui/IconButton'
import { ActionButton } from '@/components/ui/ActionButton'
import { formatRelativeTime } from '@/lib/date-utils'

interface NoteDetailModalProps {
  note: Item
  onClose: () => void
  onEdit: (id: string, content: string, context: ItemContext) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}

export function NoteDetailModal({ note, onClose, onEdit, onArchive, onDelete }: NoteDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editContent, setEditContent] = useState(note.content)
  const [editContext, setEditContext] = useState<ItemContext>(note.context || 'other')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const context = note.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  // Focus et ajuste la hauteur du textarea en mode édition
  useEffect(() => {
    if (isEditMode && textareaRef.current) {
      textareaRef.current.focus()
      adjustTextareaHeight()
    }
  }, [isEditMode])

  // Ajuste la hauteur du textarea au contenu
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value)
    adjustTextareaHeight()
  }

  const handleSave = () => {
    const trimmedContent = editContent.trim()
    if (trimmedContent) {
      onEdit(note.id, trimmedContent, editContext)
      setIsEditMode(false)
    }
  }

  const handleCancel = () => {
    setEditContent(note.content)
    setEditContext(note.context || 'other')
    setIsEditMode(false)
  }

  const isContentValid = editContent.trim().length > 0
  const hasChanges = editContent !== note.content || editContext !== (note.context || 'other')

  // Liste des contextes pour le sélecteur
  const contexts: ItemContext[] = ['personal', 'family', 'work', 'health', 'other']

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={isEditMode ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-lg mx-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <NoteIcon className="w-5 h-5" />
            <span className="font-medium">
              {isEditMode ? 'Modifier la note' : 'Note'}
            </span>
          </div>
          <button
            onClick={isEditMode ? handleCancel : onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XIcon className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Contenu */}
        <div className="p-4">
          {isEditMode ? (
            <>
              {/* Textarea éditable */}
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={handleContentChange}
                className="w-full text-text-dark text-lg resize-none border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                style={{ minHeight: '80px', maxHeight: '200px' }}
                placeholder="Contenu de la note..."
              />

              {/* Sélecteur de contexte */}
              <div className="mt-4">
                <p className="text-sm text-text-muted mb-2">Contexte</p>
                <div className="flex flex-wrap gap-2">
                  {contexts.map((ctx) => {
                    const ctxConfig = CONTEXT_CONFIG[ctx]
                    const CtxIcon = ctxConfig.icon
                    const isSelected = editContext === ctx

                    return (
                      <button
                        key={ctx}
                        onClick={() => setEditContext(ctx)}
                        className={`
                          flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors
                          ${isSelected
                            ? 'bg-primary/10 text-primary border-2 border-primary'
                            : 'bg-gray-100 text-text-muted border-2 border-transparent hover:bg-gray-200'
                          }
                        `}
                      >
                        <CtxIcon className="w-4 h-4" />
                        <span>{ctxConfig.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Affichage lecture seule */}
              <p className="text-text-dark text-lg whitespace-pre-wrap">{note.content}</p>

              <div className={`flex items-center gap-1.5 text-sm mt-4 ${contextConfig.colorClass}`}>
                <ContextIcon className="w-4 h-4" />
                <span>{contextConfig.label}</span>
                <span className="text-text-muted">•</span>
                <span className="text-text-muted">Créée {formatRelativeTime(note.created_at)}</span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-border">
          {isEditMode ? (
            <>
              <ActionButton
                label="Annuler"
                variant="secondary"
                onClick={handleCancel}
                className="flex-1"
              />
              <ActionButton
                label="Enregistrer"
                variant="save"
                onClick={handleSave}
                disabled={!isContentValid || !hasChanges}
                className="flex-1"
              />
            </>
          ) : (
            <>
              <ActionButton
                label="Modifier"
                icon={<EditIcon />}
                variant="secondary"
                onClick={() => setIsEditMode(true)}
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
            </>
          )}
        </div>
      </div>
    </>
  )
}
