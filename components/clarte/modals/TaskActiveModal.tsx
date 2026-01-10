'use client'

import { useState, useRef, useEffect } from 'react'
import { Item, ItemContext } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import {
  TaskIcon,
  XIcon,
  ArchiveIcon,
  TrashIcon,
  EditIcon
} from '@/components/ui/icons'
import { IconButton } from '@/components/ui/IconButton'
import { ActionButton } from '@/components/ui/ActionButton'
import { formatRelativeTime, formatScheduledDateFull } from '@/lib/date-utils'

interface TaskActiveModalProps {
  task: Item
  onClose: () => void
  onMarkDone?: (id: string) => void
  onPlan?: (id: string) => void
  onStore: (id: string) => void
  onDelete: (id: string) => void
  onEdit?: (id: string, content: string, context: ItemContext) => void
}

export function TaskActiveModal({
  task,
  onClose,
  // Props optionnelles conservées pour l'API mais non utilisées dans ce composant
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onMarkDone: _onMarkDone,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPlan: _onPlan,
  onStore,
  onDelete,
  onEdit
}: TaskActiveModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editContent, setEditContent] = useState(task.content)
  const [editContext, setEditContext] = useState<ItemContext>(task.context || 'other')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const context = task.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  const isPlanned = task.state === 'planned'

  // Liste des contextes pour le sélecteur
  const contexts: ItemContext[] = ['personal', 'family', 'work', 'health', 'other']

  // Ajuste la hauteur du textarea au contenu
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  // Focus et ajuste la hauteur du textarea en mode édition
  useEffect(() => {
    if (isEditMode && textareaRef.current) {
      textareaRef.current.focus()
      adjustTextareaHeight()
    }
  }, [isEditMode])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value)
    adjustTextareaHeight()
  }

  const handleSave = () => {
    const trimmedContent = editContent.trim()
    if (trimmedContent && onEdit) {
      onEdit(task.id, trimmedContent, editContext)
      setIsEditMode(false)
    }
  }

  const handleCancel = () => {
    setEditContent(task.content)
    setEditContext(task.context || 'other')
    setIsEditMode(false)
  }

  const isContentValid = editContent.trim().length > 0
  const hasChanges = editContent !== task.content || editContext !== (task.context || 'other')

  const handleDelete = () => {
    onDelete(task.id)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={isEditMode ? undefined : onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl max-w-lg mx-auto animate-scale-in">
        {/* Confirmation de suppression */}
        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-medium text-text-dark">
              Supprimer cette tâche ?
            </h3>
            <p className="text-sm text-text-muted">
              Cette action est irréversible.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-border hover:bg-gray-50 transition-colors text-text-dark"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2 text-primary">
                <TaskIcon className="w-5 h-5" />
                <span className="font-medium">
                  {isEditMode ? 'Modifier la tâche' : 'Tâche'}
                </span>
              </div>
              <button
                onClick={isEditMode ? handleCancel : onClose}
                aria-label={isEditMode ? 'Annuler' : 'Fermer'}
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
                    placeholder="Contenu de la tâche..."
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
                  <p className="text-text-dark text-lg whitespace-pre-wrap">{task.content}</p>

                  <div className={`flex items-center gap-1.5 text-sm mt-4 ${contextConfig.colorClass}`}>
                    <ContextIcon className="w-4 h-4" />
                    <span>{contextConfig.label}</span>
                    <span className="text-text-muted">•</span>
                    {isPlanned && task.scheduled_at ? (
                      <span className="text-text-muted">
                        Prévu {formatScheduledDateFull(task.scheduled_at)}
                      </span>
                    ) : (
                      <span className="text-text-muted">
                        Créée {formatRelativeTime(task.created_at)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 p-4 border-t border-border">
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
                  {/* Fait - déjà sur la carte
                  <ActionButton
                    label="Fait"
                    icon={<CheckIcon />}
                    variant="done"
                    onClick={() => {
                      onMarkDone(task.id)
                      onClose()
                    }}
                    className="flex-1"
                  />
                  */}

                  {/* Caler / Décaler - déjà sur la carte
                  <ActionButton
                    label={planButtonLabel}
                    icon={<CalendarIcon />}
                    variant="plan"
                    onClick={() => {
                      onPlan(task.id)
                      onClose()
                    }}
                    className="flex-1"
                  />
                  */}

                  {/* Modifier (si onEdit est fourni) */}
                  {onEdit && (
                    <ActionButton
                      label="Modifier"
                      icon={<EditIcon />}
                      variant="secondary"
                      onClick={() => setIsEditMode(true)}
                      className="flex-1"
                    />
                  )}

                  {/* Ranger */}
                  <ActionButton
                    label="Ranger"
                    icon={<ArchiveIcon />}
                    variant="archive"
                    onClick={() => {
                      onStore(task.id)
                      onClose()
                    }}
                    className="flex-1"
                  />

                  {/* Supprimer */}
                  <IconButton
                    icon={<TrashIcon />}
                    label="Supprimer"
                    variant="danger"
                    size="md"
                    onClick={() => setShowDeleteConfirm(true)}
                  />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
