import {
  HomeIcon,
  UsersIcon,
  BriefcaseIcon,
  ActivityIcon,
  MoreHorizontalIcon
} from '@/components/ui/icons'
import { CONTEXT_LABELS } from '@/constants/labels'
import type { ItemContext } from '@/types/items'

export const CONTEXT_CONFIG: Record<ItemContext, {
  icon: React.FC<{ className?: string }>
  label: string
  colorClass: string
}> = {
  personal: {
    icon: HomeIcon,
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
  other: {
    icon: MoreHorizontalIcon,
    label: CONTEXT_LABELS.other,
    colorClass: 'text-gray-500'
  }
}
