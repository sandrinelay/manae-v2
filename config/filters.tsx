import {
  TaskIcon,
  NoteIcon,
  IdeaIcon,
  ShoppingIcon,
  MenuIcon
} from '@/components/ui/icons'
import { FILTER_LABELS } from '@/constants/labels'

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
  { id: 'all', icon: MenuIcon, label: FILTER_LABELS.all },
  { id: 'tasks', icon: TaskIcon, label: FILTER_LABELS.tasks, countKey: 'tasks' },
  { id: 'notes', icon: NoteIcon, label: FILTER_LABELS.notes, countKey: 'notes' },
  { id: 'ideas', icon: IdeaIcon, label: FILTER_LABELS.ideas, countKey: 'ideas' },
  { id: 'shopping', icon: ShoppingIcon, label: FILTER_LABELS.shopping, countKey: 'shopping' }
]

// Helper pour récupérer un filtre par son ID
export function getFilterById(id: FilterType): FilterConfig | undefined {
  return FILTER_CONFIG.find(f => f.id === id)
}
