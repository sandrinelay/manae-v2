'use client'

import { useState } from 'react'
import { Item } from '@/types/items'
import { CONTEXT_CONFIG } from '@/config/contexts'
import {
  XIcon,
  UndoIcon,
  ArchiveIcon,
  TrashIcon,
  CheckCircleFilledIcon,
  DashedCircleIcon
} from '@/components/ui/icons/ItemTypeIcons'
import { formatRelativeTime } from '@/lib/date-utils'

type TaskMode = 'done' | 'stored'

interface TaskDetailModalProps {
  task: Item
  mode: TaskMode
  onClose: () => void
  onReactivate: (id: string) => void
  onStore?: (id: string) => void      // Seulement si mode = 'done'
  onDelete?: (id: string) => void     // Seulement si mode = 'stored'
}

export function TaskDetailModal({
  task,
  mode,
  onClose,
  onReactivate,
  onStore,
  onDelete
}: TaskDetailModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const context = task.context || 'other'
  const contextConfig = CONTEXT_CONFIG[context]
  const ContextIcon = contextConfig.icon

  // Déterminer le label et l'icône selon le mode
  const modeConfig = {
    done: {
      icon: CheckCircleFilledIcon,
      label: 'Tâche terminée',
      iconColor: 'text-green-400',
      dateLabel: 'Terminé'
    },
    stored: {
      icon: DashedCircleIcon,
      label: 'Tâche rangée',
      iconColor: 'text-gray-400',
      dateLabel: 'Rangé'
    }
  }

  const config = modeConfig[mode]
  const ModeIcon = config.icon

  // Date relative (utilise updated_at car c'est la date de complétion/archivage)
  const relativeDate = formatRelativeTime(task.updated_at || task.created_at)

  const handleDelete = () => {
    if (onDelete) {
      onDelete(task.id)
      onClose()
    }
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
              <div className={`flex items-center gap-2 ${config.iconColor}`}>
                <ModeIcon className="w-5 h-5" />
                <span className="font-medium text-text-dark">{config.label}</span>
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
                <span className="text-text-muted">{config.dateLabel} {relativeDate}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-4 border-t border-border">
              {/* Réactiver (toujours présent) */}
              <button
                onClick={() => {
                  onReactivate(task.id)
                  onClose()
                }}
                className="flex-1 py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl border border-border hover:bg-gray-50 transition-colors"
              >
                <UndoIcon className="w-4 h-4" />
                <span>Réactiver</span>
              </button>

              {/* Ranger (mode done) ou Supprimer (mode stored) */}
              {mode === 'done' && onStore && (
                <button
                  onClick={() => {
                    onStore(task.id)
                    onClose()
                  }}
                  className="flex-1 py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl border border-border hover:bg-gray-50 transition-colors"
                >
                  <ArchiveIcon className="w-4 h-4" />
                  <span>Ranger</span>
                </button>
              )}

              {mode === 'stored' && onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-2.5 px-4 flex items-center justify-center gap-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
