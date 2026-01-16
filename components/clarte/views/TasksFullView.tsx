'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  fetchTasks,
  deleteItem,
  completeItem,
  activateItem,
  archiveItem,
  updateItemContent
} from '@/services/items.service'
import { TabBar } from '@/components/clarte/tabs/TabBar'
import { TaskCard } from '@/components/clarte/cards/TaskCard'
import { TaskActiveModal } from '@/components/clarte/modals/TaskActiveModal'
import { TaskDetailModal } from '@/components/clarte/modals/TaskDetailModal'
import { PlanTaskModal } from '@/components/clarte/modals/PlanTaskModal'
import { EmptyState } from '@/components/clarte/EmptyState'
import {
  groupTasksByCategory,
  filterActiveTasks,
  filterCompletedTasks,
  filterArchivedTasks,
  TASK_CATEGORY_LABELS,
  type TaskTimeCategory
} from '@/lib/task-utils'
import type { Item, ItemContext } from '@/types/items'

type TabId = 'active' | 'done' | 'stored'

const TABS = [
  { id: 'active' as TabId, label: 'Actives' },
  { id: 'done' as TabId, label: 'Terminées' },
  { id: 'stored' as TabId, label: 'Rangées' }
]

// Ordre des catégories pour l'affichage
const CATEGORY_ORDER: TaskTimeCategory[] = ['today', 'overdue', 'thisWeek', 'toSchedule', 'later']

interface TasksFullViewProps {
  tasks: Item[] // Tâches initiales (actives seulement)
  onRefresh: () => Promise<void>
  initialTaskToPlan?: Item | null // Tâche à planifier (pour reprise après connexion Google)
  onTaskToPlanHandled?: () => void // Callback pour signaler que la tâche a été traitée
}

export function TasksFullView({ tasks: initialTasks, onRefresh, initialTaskToPlan, onTaskToPlanHandled }: TasksFullViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('active')
  const [selectedTask, setSelectedTask] = useState<Item | null>(null)
  const [taskToPlan, setTaskToPlan] = useState<Item | null>(initialTaskToPlan || null)
  const [allTasks, setAllTasks] = useState<Item[]>(initialTasks)

  // Fetch toutes les tâches
  const fetchAllTasks = useCallback(async () => {
    try {
      const data = await fetchTasks()
      setAllTasks(data)
    } catch (error) {
      console.error('Erreur fetch tasks:', error)
    }
  }, [])

  // Charger toutes les tâches au montage
  useEffect(() => {
    // Utiliser une fonction async auto-invoquée pour éviter l'erreur set-state-in-effect
    const loadTasks = async () => {
      await fetchAllTasks()
    }
    loadTasks()
  }, [fetchAllTasks])

  // Gérer la mise à jour de initialTaskToPlan depuis le parent
  useEffect(() => {
    if (initialTaskToPlan) {
      // Utiliser requestAnimationFrame pour différer le setState
      const frameId = requestAnimationFrame(() => {
        setTaskToPlan(initialTaskToPlan)
      })
      return () => cancelAnimationFrame(frameId)
    }
  }, [initialTaskToPlan])

  // Refresh quand on appelle onRefresh
  const handleRefresh = useCallback(async () => {
    await onRefresh()
    await fetchAllTasks()
  }, [onRefresh, fetchAllTasks])

  // Filtrer les tâches selon l'onglet
  const activeTasks = useMemo(() => filterActiveTasks(allTasks), [allTasks])
  const completedTasks = useMemo(() => filterCompletedTasks(allTasks), [allTasks])
  const archivedTasks = useMemo(() => filterArchivedTasks(allTasks), [allTasks])

  // Grouper les tâches actives par catégorie temporelle
  const groupedActiveTasks = useMemo(() => groupTasksByCategory(activeTasks), [activeTasks])

  // Compteurs pour les onglets
  const tabsWithCounts = useMemo(() => TABS.map(tab => ({
    ...tab,
    count: tab.id === 'active' ? activeTasks.length
         : tab.id === 'done' ? completedTasks.length
         : archivedTasks.length
  })), [activeTasks.length, completedTasks.length, archivedTasks.length])

  // Handlers
  const handlePlan = useCallback((id: string) => {
    const task = allTasks.find(t => t.id === id)
    if (task) {
      setSelectedTask(null) // Fermer la modal de détail si ouverte
      setTaskToPlan(task)
    }
  }, [allTasks])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteItem(id)
      setSelectedTask(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }, [handleRefresh])

  const handleMarkDone = useCallback(async (id: string) => {
    try {
      await completeItem(id)
      setSelectedTask(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur completion:', error)
    }
  }, [handleRefresh])

  const handleReactivate = useCallback(async (id: string) => {
    try {
      await activateItem(id)
      setSelectedTask(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur réactivation:', error)
    }
  }, [handleRefresh])

  const handleStore = useCallback(async (id: string) => {
    try {
      await archiveItem(id)
      setSelectedTask(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur archivage:', error)
    }
  }, [handleRefresh])

  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      await deleteItem(id)
      setSelectedTask(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }, [handleRefresh])

  const handleTapTask = useCallback((id: string) => {
    const task = allTasks.find(t => t.id === id)
    if (task) setSelectedTask(task)
  }, [allTasks])

  const handleEditTask = useCallback(async (id: string, content: string, context: ItemContext) => {
    try {
      await updateItemContent(id, content, context)
      setSelectedTask(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur modification:', error)
    }
  }, [handleRefresh])

  // Détermine si la tâche sélectionnée est active (active ou planned)
  const isSelectedTaskActive = selectedTask &&
    (selectedTask.state === 'active' || selectedTask.state === 'planned' || selectedTask.state === 'captured')

  return (
    <>
      {/* Onglets discrets */}
      <TabBar
        tabs={tabsWithCounts}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
        className="border-b border-gray-100 pb-2"
      />

      {/* Contenu selon l'onglet */}
      <div className="mt-4 space-y-6">
        {/* Onglet Actives */}
        {activeTab === 'active' && (
          activeTasks.length === 0 ? (
            <EmptyState message="Aucune tâche en cours. Tes pensées capturées apparaîtront ici." />
          ) : (
            CATEGORY_ORDER.map(category => {
              const categoryTasks = groupedActiveTasks[category]
              if (categoryTasks.length === 0) return null

              return (
                <div key={category}>
                  {/* Header de section discret */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span className="text-xs font-medium text-text-muted">
                      {TASK_CATEGORY_LABELS[category]} ({categoryTasks.length})
                    </span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>

                  {/* Liste des tâches */}
                  <div className="space-y-3">
                    {categoryTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        item={task}
                        mode="active"
                        onPlan={handlePlan}
                        onMarkDone={handleMarkDone}
                        onTap={handleTapTask}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )
        )}

        {/* Onglet Terminées */}
        {activeTab === 'done' && (
          completedTasks.length === 0 ? (
            <EmptyState message="Aucune tâche terminée. Tes accomplissements apparaîtront ici." />
          ) : (
            <div className="space-y-3">
              {completedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  item={task}
                  mode="done"
                  onTap={handleTapTask}
                />
              ))}
            </div>
          )
        )}

        {/* Onglet Rangées */}
        {activeTab === 'stored' && (
          archivedTasks.length === 0 ? (
            <EmptyState message="Rien de rangé. Les tâches que tu ranges apparaîtront ici." />
          ) : (
            <div className="space-y-3">
              {archivedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  item={task}
                  mode="stored"
                  onTap={handleTapTask}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal selon le type de tâche */}
      {selectedTask && isSelectedTaskActive && (
        <TaskActiveModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onMarkDone={handleMarkDone}
          onPlan={handlePlan}
          onStore={handleStore}
          onDelete={handleDelete}
          onEdit={handleEditTask}
        />
      )}

      {selectedTask && !isSelectedTaskActive && (
        <TaskDetailModal
          task={selectedTask}
          mode={selectedTask.state === 'completed' ? 'done' : 'stored'}
          onClose={() => setSelectedTask(null)}
          onReactivate={handleReactivate}
          onStore={selectedTask.state === 'completed' ? handleStore : undefined}
          onDelete={selectedTask.state === 'archived' ? handleDeleteTask : undefined}
        />
      )}

      {/* Modal de planification */}
      {taskToPlan && (
        <PlanTaskModal
          task={taskToPlan}
          onClose={() => {
            setTaskToPlan(null)
            onTaskToPlanHandled?.()
          }}
          onSuccess={handleRefresh}
        />
      )}
    </>
  )
}
