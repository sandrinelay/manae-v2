import {
  TaskIcon,
  NoteIcon,
  IdeaIcon,
  ShoppingIcon
} from '@/components/ui/icons/ItemTypeIcons'

// Types
export type FilterType = 'all' | 'tasks' | 'notes' | 'ideas' | 'shopping'

export interface FilterConfig {
  id: FilterType
  icon: React.FC<{ className?: string }>
  label: string
  countKey?: 'tasks' | 'notes' | 'ideas' | 'shopping'
}

// Icône "Tout" (lignes horizontales)
const AllIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

// Configuration des filtres
export const FILTER_CONFIG: FilterConfig[] = [
  { id: 'all', icon: AllIcon, label: 'Tout' },
  { id: 'tasks', icon: TaskIcon, label: 'Tâches', countKey: 'tasks' },
  { id: 'notes', icon: NoteIcon, label: 'Notes', countKey: 'notes' },
  { id: 'ideas', icon: IdeaIcon, label: 'Idées', countKey: 'ideas' },
  { id: 'shopping', icon: ShoppingIcon, label: 'Courses', countKey: 'shopping' }
]

// Helper pour récupérer un filtre par son ID
export function getFilterById(id: FilterType): FilterConfig | undefined {
  return FILTER_CONFIG.find(f => f.id === id)
}
