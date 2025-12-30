'use client'

import { useState } from 'react'
import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import {
  TaskIcon,
  XIcon,
  CheckIcon,
  CalendarIcon,
  ArchiveIcon,
  TrashIcon
} from '@/components/ui/icons'
import { IconButton } from '@/components/ui/IconButton'
import { ActionButton } from '@/components/ui/ActionButton'
import { formatRelativeTime, formatScheduledDate } from '@/lib/date-utils'

interface TaskActiveModalProps {
  task: Item
  onClose: () => void
  onMarkDone: (id: string) => void
  onPlan: (id: string) => void
  onStore: (id: string) => void
  onDelete: (id: string) => void
}

export function TaskActiveModal({
  task,
  onClose,
  onMarkDone,
  onPlan,
  onStore,
  onDelete
}: TaskActiveModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const context = task.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  const isPlanned = task.state === 'planned'
  const planButtonLabel = isPlanned ? 'Décaler' : 'Caler'

  const handleDelete = () => {
    onDelete(task.id)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={onClose}
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
                <span className="font-medium">Tâche</span>
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
              <p className="text-text-dark text-lg">{task.content}</p>

              <div className={`flex items-center gap-1.5 text-sm mt-4 ${contextConfig.colorClass}`}>
                <ContextIcon className="w-4 h-4" />
                <span>{contextConfig.label}</span>
                <span className="text-text-muted">•</span>
                {isPlanned && task.scheduled_at ? (
                  <span className="text-text-muted">
                    Prévu {formatScheduledDate(task.scheduled_at)}
                  </span>
                ) : (
                  <span className="text-text-muted">
                    Créée {formatRelativeTime(task.created_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 p-4 border-t border-border">
              {/* Fait */}
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

              {/* Caler / Décaler */}
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

              {/* Ranger */}
              <ActionButton
                label="Ranger"
                icon={<ArchiveIcon />}
                variant="archive"
                onClick={() => {
                  onStore(task.id)
                  onClose()
                }}
              />

              {/* Supprimer */}
              <IconButton
                icon={<TrashIcon />}
                label="Supprimer"
                variant="danger"
                size="md"
                onClick={() => setShowDeleteConfirm(true)}
              />
            </div>
          </>
        )}
      </div>
    </>
  )
}
