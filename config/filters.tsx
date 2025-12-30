import {
  TaskIcon,
  NoteIcon,
  IdeaIcon,
  ShoppingIcon,
  MenuIcon
} from '@/components/ui/icons'

// Types
export type FilterType = 'all' | 'tasks' | 'notes' | 'ideas' | 'shopping'

export interface FilterConfig {
  id: FilterType
  icon: React.FC<{ className?: string }>
  label: string
  countKey?: 'tasks' | 'notes' | 'ideas' | 'shopping'
}

// Configuration des filtres
export const FILTER_CONFIG: FilterConfig[] = [
  { id: 'all', icon: MenuIcon, label: 'Tout' },
  { id: 'tasks', icon: TaskIcon, label: 'Tâches', countKey: 'tasks' },
  { id: 'notes', icon: NoteIcon, label: 'Notes', countKey: 'notes' },
  { id: 'ideas', icon: IdeaIcon, label: 'Idées', countKey: 'ideas' },
  { id: 'shopping', icon: ShoppingIcon, label: 'Courses', countKey: 'shopping' }
]

// Helper pour récupérer un filtre par son ID
export function getFilterById(id: FilterType): FilterConfig | undefined {
  return FILTER_CONFIG.find(f => f.id === id)
}
