import {
  HomeIcon,
  UsersIcon,
  BriefcaseIcon,
  ActivityIcon,
  MoreHorizontalIcon
} from '@/components/ui/icons'
import type { ItemContext } from '@/types/items'

export const CONTEXT_CONFIG: Record<ItemContext, {
  icon: React.FC<{ className?: string }>
  label: string
  colorClass: string
}> = {
  personal: {
    icon: HomeIcon,
    label: 'Personnel',
    colorClass: 'text-slate-500'
  },
  family: {
    icon: UsersIcon,
    label: 'Famille',
    colorClass: 'text-teal-500'
  },
  work: {
    icon: BriefcaseIcon,
    label: 'Travail',
    colorClass: 'text-blue-500'
  },
  health: {
    icon: ActivityIcon,
    label: 'Santé',
    colorClass: 'text-red-500'
  },
  other: {
    icon: MoreHorizontalIcon,
    label: 'Autre',
    colorClass: 'text-gray-500'
  }
}
