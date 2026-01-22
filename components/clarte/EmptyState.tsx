'use client'

import {
  SparklesIcon,
  CheckCircleIcon,
  ArchiveIcon,
  NoteIcon,
  IdeaIcon,
  ShoppingIcon,
  CheckIcon
} from '@/components/ui/icons'

// Types d'icônes disponibles pour les états vides
type EmptyStateIconType = 'sparkles' | 'check-circle' | 'archive' | 'note' | 'idea' | 'shopping' | 'check'

interface EmptyStateProps {
  icon?: EmptyStateIconType
  title: string
  subtitle?: string
  className?: string
}

// Mapping des types vers les composants d'icônes
const ICON_COMPONENTS: Record<EmptyStateIconType, React.FC<{ className?: string }>> = {
  sparkles: SparklesIcon,
  'check-circle': CheckCircleIcon,
  archive: ArchiveIcon,
  note: NoteIcon,
  idea: IdeaIcon,
  shopping: ShoppingIcon,
  check: CheckIcon
}

/**
 * Composant d'état vide engageant
 * Affiché quand une liste est vide pour guider l'utilisateur
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  className = ''
}: EmptyStateProps) {
  const IconComponent = icon ? ICON_COMPONENTS[icon] : null

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {IconComponent && (
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 animate-pop-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
          <IconComponent className="w-6 h-6 text-text-muted" />
        </div>
      )}
      <h3 className="text-lg font-medium text-text-dark mb-1 animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-text-muted max-w-[240px] animate-fade-in" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

// Configuration des états vides par type de contenu
export const EMPTY_STATE_CONFIG = {
  // Tâches
  tasks: {
    icon: 'sparkles' as EmptyStateIconType,
    title: 'Aucune tâche en cours',
    subtitle: 'Capturez vos pensées, elles apparaîtront ici'
  },
  tasksDone: {
    icon: 'check-circle' as EmptyStateIconType,
    title: 'Rien pour l\'instant',
    subtitle: 'Vos tâches terminées apparaîtront ici'
  },
  tasksStored: {
    icon: 'archive' as EmptyStateIconType,
    title: 'Rien de rangé',
    subtitle: 'Les tâches archivées seront conservées ici'
  },
  // Notes
  notes: {
    icon: 'note' as EmptyStateIconType,
    title: 'Pas encore de notes',
    subtitle: 'Vos informations importantes seront rangées ici'
  },
  notesArchived: {
    icon: 'archive' as EmptyStateIconType,
    title: 'Aucune note archivée',
    subtitle: 'Les notes archivées seront conservées ici'
  },
  // Idées
  ideas: {
    icon: 'idea' as EmptyStateIconType,
    title: 'L\'inspiration arrive...',
    subtitle: 'Vos idées prendront vie ici'
  },
  projects: {
    icon: 'sparkles' as EmptyStateIconType,
    title: 'Aucun projet en cours',
    subtitle: 'Développez une idée pour créer un projet'
  },
  ideasArchived: {
    icon: 'archive' as EmptyStateIconType,
    title: 'Aucune idée rangée',
    subtitle: 'Les idées archivées seront conservées ici'
  },
  // Shopping
  shopping: {
    icon: 'shopping' as EmptyStateIconType,
    title: 'Liste vide',
    subtitle: 'Ajoutez des articles à acheter'
  },
  shoppingDone: {
    icon: 'check' as EmptyStateIconType,
    title: 'Rien d\'acheté',
    subtitle: 'Les articles cochés apparaîtront ici'
  }
} as const

export type EmptyStateType = keyof typeof EMPTY_STATE_CONFIG
