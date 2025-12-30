'use client'

import { useState, useMemo } from 'react'
import { Item } from '@/types/items'
import { TaskCard } from '../cards/TaskCard'
import { EmptyState } from '../EmptyState'
import { sortTasksForPreview } from '@/lib/task-utils'

// Configuration
const INITIAL_VISIBLE_COUNT = 4

interface TasksBlockProps {
  tasks: Item[]
  totalCount: number
  onMarkDone?: (id: string) => void
  onPlan?: (id: string) => void
  onTap?: (id: string) => void
  onShowFullView?: () => void
}

export function TasksBlock({
  tasks,
  totalCount,
  onMarkDone,
  onPlan,
  onTap,
  onShowFullView
}: TasksBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Trier les tâches avec le tri intelligent
  const sortedTasks = useMemo(() => sortTasksForPreview(tasks), [tasks])

  // Nombre de tâches visibles
  const visibleTasks = isExpanded ? sortedTasks : sortedTasks.slice(0, INITIAL_VISIBLE_COUNT)
  const hiddenCount = sortedTasks.length - INITIAL_VISIBLE_COUNT
  const hasMoreTasks = hiddenCount > 0

  return (
    <section>
      {/* Header cliquable */}
      <button
        onClick={onShowFullView}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <h2 className="text-xs font-semibold text-primary uppercase tracking-wider group-hover:text-primary/80 transition-colors">
          Tâches
        </h2>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-xs text-text-muted">
              {totalCount} tâche{totalCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-text-muted group-hover:text-primary transition-colors">
            →
          </span>
        </div>
      </button>

      {/* État vide */}
      {sortedTasks.length === 0 ? (
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
                onTap={onTap}
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
                : `+ Voir les ${hiddenCount} autre${hiddenCount > 1 ? 's' : ''} tâche${hiddenCount > 1 ? 's' : ''}`
              }
            </button>
          )}
        </>
      )}
    </section>
  )
}
