'use client'

import { useState } from 'react'
import { Item } from '@/types/items'
import { TaskCard } from '../cards/TaskCard'
import { EmptyState } from '../EmptyState'

// Configuration
const INITIAL_VISIBLE_COUNT = 4

interface TasksBlockProps {
  tasks: Item[]
  totalCount: number
  onMarkDone?: (id: string) => void
  onPlan?: (id: string) => void
  onDelete?: (id: string) => void
}

export function TasksBlock({
  tasks,
  totalCount,
  onMarkDone,
  onPlan,
  onDelete
}: TasksBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Nombre de tâches visibles
  const visibleTasks = isExpanded ? tasks : tasks.slice(0, INITIAL_VISIBLE_COUNT)
  const hiddenCount = tasks.length - INITIAL_VISIBLE_COUNT
  const hasMoreTasks = hiddenCount > 0

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-primary uppercase tracking-wider">
          Priorités
        </h2>
        {totalCount > 0 && (
          <span className="text-xs text-text-muted">
            {totalCount} pensée{totalCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* État vide */}
      {tasks.length === 0 ? (
        <EmptyState message="Aucune tâche pour le moment" />
      ) : (
        <>
          {/* Liste des tâches */}
          <div className="space-y-3">
            {visibleTasks.map(task => (
              <TaskCard
                key={task.id}
                item={task}
                onMarkDone={onMarkDone}
                onPlan={onPlan}
                onDelete={onDelete}
              />
            ))}
          </div>

          {/* Bouton dépliant */}
          {hasMoreTasks && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full mt-4 py-3 text-sm font-medium text-text-muted hover:text-text-dark transition-colors border-t border-gray-100"
            >
              {isExpanded
                ? '− Réduire'
                : `+ Voir les ${hiddenCount} autre${hiddenCount > 1 ? 's' : ''} pensée${hiddenCount > 1 ? 's' : ''}`
              }
            </button>
          )}
        </>
      )}
    </section>
  )
}
