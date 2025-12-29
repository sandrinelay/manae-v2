'use client'

import { useRouter } from 'next/navigation'
import { Item } from '@/types/items'
import { TaskCard } from '../cards/TaskCard'
import { ChevronRightIcon } from '@/components/ui/icons/ItemTypeIcons'

interface TasksBlockProps {
  tasks: Item[]
  totalCount: number
  onMarkDone: (id: string) => void
  onPlan: (id: string) => void
  onPostpone: (id: string) => void
}

export function TasksBlock({ tasks, totalCount, onMarkDone, onPlan, onPostpone }: TasksBlockProps) {
  const router = useRouter()

  if (tasks.length === 0) {
    return (
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-dark">Tâches</h2>
        </div>
        <p className="text-text-muted text-center py-8">
          Aucune tâche pour le moment
        </p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <button
        onClick={() => router.push('/clarte/taches')}
        className="w-full flex items-center justify-between mb-4 group"
      >
        <h2 className="text-lg font-semibold text-text-dark">Tâches</h2>
        <span className="flex items-center gap-1 text-sm text-primary group-hover:underline">
          Voir tout ({totalCount})
          <ChevronRightIcon className="w-4 h-4" />
        </span>
      </button>

      {/* Grille de cartes 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            item={task}
            onMarkDone={onMarkDone}
            onPlan={onPlan}
            onPostpone={onPostpone}
          />
        ))}
      </div>
    </section>
  )
}
