import type { Item } from '@/types/items'
import { TASK_TIME_LABELS } from '@/constants/labels'

/**
 * Catégories temporelles pour les tâches
 */
export type TaskTimeCategory = 'today' | 'overdue' | 'thisWeek' | 'toSchedule' | 'later'

/**
 * Labels pour les catégories (vocabulaire Manae : doux, non culpabilisant)
 * Re-export depuis constants/labels pour rétrocompatibilité
 */
export const TASK_CATEGORY_LABELS: Record<TaskTimeCategory, string> = TASK_TIME_LABELS

/**
 * Détermine la catégorie temporelle d'une tâche
 */
export function getTaskTimeCategory(task: Item): TaskTimeCategory {
  if (!task.scheduled_at) return 'toSchedule'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Normaliser le format de date Supabase
  const normalizedDateStr = task.scheduled_at.replace(' ', 'T')
  const taskDate = new Date(normalizedDateStr)
  const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate())

  if (taskDateOnly < today) return 'overdue'
  if (taskDateOnly < tomorrow) return 'today'
  if (taskDateOnly < weekFromNow) return 'thisWeek'
  return 'later'
}

/**
 * Priorité de tri (1 = plus prioritaire)
 */
function getCategoryPriority(category: TaskTimeCategory): number {
  const priorities: Record<TaskTimeCategory, number> = {
    today: 1,
    overdue: 2,
    thisWeek: 3,
    toSchedule: 4,
    later: 5
  }
  return priorities[category]
}

/**
 * Trie les tâches pour l'aperçu (bloc sur /clarte)
 * Ordre de priorité : Aujourd'hui > En attente > Cette semaine > À caler > Plus tard
 */
export function sortTasksForPreview(tasks: Item[]): Item[] {
  return [...tasks].sort((a, b) => {
    const categoryA = getTaskTimeCategory(a)
    const categoryB = getTaskTimeCategory(b)
    const priorityA = getCategoryPriority(categoryA)
    const priorityB = getCategoryPriority(categoryB)

    // Tri par priorité de catégorie d'abord
    if (priorityA !== priorityB) return priorityA - priorityB

    // Normaliser les dates
    const dateA = a.scheduled_at ? new Date(a.scheduled_at.replace(' ', 'T')) : null
    const dateB = b.scheduled_at ? new Date(b.scheduled_at.replace(' ', 'T')) : null

    // Si les deux ont une date, tri par date (plus proche d'abord)
    if (dateA && dateB) return dateA.getTime() - dateB.getTime()

    // Sinon par date de création (plus récent d'abord)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

/**
 * Groupe les tâches par catégorie temporelle
 * Utilisé dans la vue complète /clarte/taches
 */
export function groupTasksByCategory(tasks: Item[]): Record<TaskTimeCategory, Item[]> {
  const groups: Record<TaskTimeCategory, Item[]> = {
    today: [],
    overdue: [],
    thisWeek: [],
    toSchedule: [],
    later: []
  }

  // D'abord trier les tâches
  const sortedTasks = sortTasksForPreview(tasks)

  // Puis grouper par catégorie
  for (const task of sortedTasks) {
    const category = getTaskTimeCategory(task)
    groups[category].push(task)
  }

  return groups
}

/**
 * Filtre les tâches actives (non complétées, non archivées)
 */
export function filterActiveTasks(tasks: Item[]): Item[] {
  return tasks.filter(task =>
    task.state === 'active' || task.state === 'planned' || task.state === 'captured'
  )
}

/**
 * Filtre les tâches terminées
 */
export function filterCompletedTasks(tasks: Item[]): Item[] {
  return tasks.filter(task => task.state === 'completed')
}

/**
 * Filtre les tâches rangées (archivées)
 */
export function filterArchivedTasks(tasks: Item[]): Item[] {
  return tasks.filter(task => task.state === 'archived')
}
