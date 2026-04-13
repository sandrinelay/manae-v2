import {
  UserIcon,
  HomeIcon,
  UsersIcon,
  BriefcaseIcon,
  ActivityIcon,
  FileTextIcon,
  MoreHorizontalIcon
} from '@/components/ui/icons'
import { CONTEXT_LABELS } from '@/constants/labels'
import type { ItemContext } from '@/types/items'

/**
 * Contextes disponibles dans les sélecteurs (exclu : other)
 * other reste lisible pour afficher les items existants, mais n'est pas proposé à la création
 */
export const SELECTABLE_CONTEXTS: ItemContext[] = [
  'personal',
  'family',
  'work',
  'health',
  'admin',
  'home',
]

export const CONTEXT_CONFIG: Record<ItemContext, {
  icon: React.FC<{ className?: string }>
  label: string
  colorClass: string
}> = {
  personal: {
    icon: UserIcon,
    label: CONTEXT_LABELS.personal,
    colorClass: 'text-slate-500'
  },
  family: {
    icon: UsersIcon,
    label: CONTEXT_LABELS.family,
    colorClass: 'text-teal-500'
  },
  work: {
    icon: BriefcaseIcon,
    label: CONTEXT_LABELS.work,
    colorClass: 'text-blue-500'
  },
  health: {
    icon: ActivityIcon,
    label: CONTEXT_LABELS.health,
    colorClass: 'text-red-500'
  },
  admin: {
    icon: FileTextIcon,
    label: CONTEXT_LABELS.admin,
    colorClass: 'text-amber-500'
  },
  home: {
    icon: HomeIcon,
    label: CONTEXT_LABELS.home,
    colorClass: 'text-orange-400'
  },
  // Affiché uniquement pour les items existants, non proposé à la création
  other: {
    icon: MoreHorizontalIcon,
    label: CONTEXT_LABELS.other,
    colorClass: 'text-gray-500'
  }
}
