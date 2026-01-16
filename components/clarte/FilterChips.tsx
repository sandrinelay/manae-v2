'use client'

import { TaskIcon, NoteIcon, IdeaIcon, ShoppingIcon } from '@/components/ui/icons'

export type FilterType = 'all' | 'tasks' | 'notes' | 'ideas' | 'shopping'

interface FilterChipsProps {
  activeFilter: FilterType
  counts: {
    tasks: number
    notes: number
    ideas: number
    shopping: number
  }
  onFilterChange: (filter: FilterType) => void
}

const FILTERS: Array<{
  id: FilterType
  label: string
  icon?: React.ReactNode
  countKey?: keyof FilterChipsProps['counts']
}> = [
  { id: 'all', label: 'Tout' },
  { id: 'tasks', label: 'Tâches', icon: <TaskIcon className="w-4 h-4" />, countKey: 'tasks' },
  { id: 'notes', label: 'Notes', icon: <NoteIcon className="w-4 h-4" />, countKey: 'notes' },
  { id: 'ideas', label: 'Idées', icon: <IdeaIcon className="w-4 h-4" />, countKey: 'ideas' },
  { id: 'shopping', label: 'Courses', icon: <ShoppingIcon className="w-4 h-4" />, countKey: 'shopping' }
]

export function FilterChips({ activeFilter, counts, onFilterChange }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {FILTERS.map(filter => {
        const isActive = activeFilter === filter.id
        const count = filter.countKey ? counts[filter.countKey] : null

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${isActive
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-text-dark hover:bg-gray-200'
              }
            `}
          >
            {filter.icon}
            <span>{filter.label}</span>
            {count !== null && count > 0 && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${isActive ? 'bg-white/20' : 'bg-primary/10 text-primary'}
              `}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
