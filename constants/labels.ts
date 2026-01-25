// ============================================
// LABELS UI - Textes centralisés
// ============================================

/**
 * Messages d'états vides
 */
export const EMPTY_STATE_MESSAGES = {
  // Tasks
  tasks: {
    active: 'Aucune tâche en cours. Tes pensées capturées apparaîtront ici.',
    completed: 'Aucune tâche terminée. Tes accomplissements apparaîtront ici.',
    archived: 'Rien de rangé. Les tâches que tu ranges apparaîtront ici.'
  },
  // Notes
  notes: {
    active: 'Aucune note pour le moment',
    archived: 'Aucune note archivée'
  },
  // Ideas
  ideas: {
    active: 'Aucune idée pour le moment',
    projects: 'Aucun projet en cours',
    archived: 'Aucune idée rangée'
  },
  // Shopping
  shopping: {
    empty: 'Aucun article dans la liste'
  },
  // Search
  search: {
    noResults: 'Aucun résultat pour'
  }
} as const

/**
 * Labels des onglets
 */
export const TAB_LABELS = {
  tasks: {
    active: 'Actives',
    done: 'Terminées',
    stored: 'Rangées'
  },
  notes: {
    active: 'Actives',
    archived: 'Archivées'
  },
  ideas: {
    ideas: 'Idées',
    projects: 'Projets',
    archived: 'Rangées'
  }
} as const

/**
 * Labels des catégories temporelles (vocabulaire Manae : doux, non culpabilisant)
 */
export const TASK_TIME_LABELS = {
  today: 'Aujourd\'hui',
  overdue: 'C\'est fait ?',   // Encourageant, invite à valider
  thisWeek: 'Cette semaine',
  toSchedule: 'À caler',
  later: 'Plus tard'
} as const

/**
 * Labels des filtres
 */
export const FILTER_LABELS = {
  all: 'Tout',
  tasks: 'Tâches',
  notes: 'Notes',
  ideas: 'Idées',
  shopping: 'Courses'
} as const

/**
 * Labels des contextes
 */
export const CONTEXT_LABELS = {
  all: 'Tous',
  personal: 'Personnel',
  family: 'Famille',
  work: 'Travail',
  health: 'Santé',
  other: 'Autre'
} as const

/**
 * Labels des humeurs
 */
export const MOOD_LABELS = {
  energetic: 'Énergique',
  calm: 'Calme',
  overwhelmed: 'Débordé(e)',
  tired: 'Fatigué(e)'
} as const

/**
 * Labels des actions
 */
export const ACTION_LABELS = {
  close: 'Fermer',
  save: 'Enregistrer',
  cancel: 'Annuler',
  delete: 'Supprimer',
  archive: 'Ranger',
  reactivate: 'Réactiver',
  plan: 'Caler',
  replan: 'Décaler',
  markDone: 'Terminer',
  develop: 'Développer',
  back: 'Retour',
  add: 'Ajouter',
  skip: 'Passer'
} as const

/**
 * Labels des sections
 */
export const SECTION_LABELS = {
  moodQuestion: 'Comment te sens-tu ? (optionnel)',
  moodHint: 'Ton humeur colore ta perception, la connaître t\'aide à mieux organiser tes pensées.',
  progression: 'Progression',
  steps: 'Étapes',
  project: 'Projet',
  estimatedTime: 'Durée estimée',
  budget: 'Budget'
} as const

/**
 * Messages d'erreur
 */
export const ERROR_MESSAGES = {
  generic: 'Une erreur est survenue',
  notFound: 'Élément introuvable',
  projectNotFound: 'Projet non trouvé',
  loadingError: 'Erreur lors du chargement',
  redirectError: 'Erreur de redirection',
  loginRequired: 'Veuillez vous connecter pour accéder à vos éléments.'
} as const

/**
 * Labels de chargement
 */
export const LOADING_LABELS = {
  default: 'Chargement...'
} as const
