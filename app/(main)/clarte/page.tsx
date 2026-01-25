'use client'

import { useState, useCallback, useMemo, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { ClarteHeader } from '@/components/clarte/ClarteHeader'
import { TasksBlock } from '@/components/clarte/blocks/TasksBlock'
import { TasksFullView } from '@/components/clarte/views/TasksFullView'
import { NotesBlock } from '@/components/clarte/blocks/NotesBlock'
import { NotesFullView } from '@/components/clarte/views/NotesFullView'
import { IdeasBlock } from '@/components/clarte/blocks/IdeasBlock'
import { IdeasFullView } from '@/components/clarte/views/IdeasFullView'
import { ShoppingBlock } from '@/components/clarte/blocks/ShoppingBlock'
import { ShoppingFullView } from '@/components/clarte/views/ShoppingFullView'
import { EmptySearchResult } from '@/components/clarte/EmptySearchResult'
import { NoteDetailModal } from '@/components/clarte/modals/NoteDetailModal'
import { TaskActiveModal } from '@/components/clarte/modals/TaskActiveModal'
import { TaskDetailModal } from '@/components/clarte/modals/TaskDetailModal'
import { PlanTaskModal } from '@/components/clarte/modals/PlanTaskModal'
import { IdeaDetailModal } from '@/components/clarte/modals/IdeaDetailModal'
import { IdeaDevelopModal } from '@/components/clarte/modals/IdeaDevelopModal'
import { PlanShoppingModal } from '@/components/clarte/modals/PlanShoppingModal'
import { useClarteData } from '@/contexts/ClarteDataContext'
import { normalizeString } from '@/components/ui/SearchBar'
import {
  completeItem,
  deleteItem,
  archiveItem,
  activateItem,
  updateItemContent,
  updateItemState
} from '@/services/items.service'
import type { Item, ItemContext } from '@/types/items'
import type { FilterType } from '@/config/filters'
import type { ContextFilterType } from '@/components/ui/ContextFilterTabs'

function ClartePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, firstName, isLoading: authLoading } = useAuth()

  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [activeContext, setActiveContext] = useState<ContextFilterType>('all')
  const [searchQuery, setSearchQuery] = useState<string | null>(null)

  // Utiliser le context pour les données partagées
  const { data, isLoading: dataLoading, refetch, loadFullData } = useClarteData()

  // Charger toutes les données quand on passe en mode recherche
  useEffect(() => {
    if (searchQuery) {
      loadFullData()
    }
  }, [searchQuery, loadFullData])
  const [selectedNote, setSelectedNote] = useState<Item | null>(null)
  const [selectedTask, setSelectedTask] = useState<Item | null>(null)
  const [selectedIdea, setSelectedIdea] = useState<Item | null>(null)
  const [ideaToDevelop, setIdeaToDevelop] = useState<Item | null>(null)
  const [taskToPlan, setTaskToPlan] = useState<Item | null>(null)
  const [showShoppingPlanModal, setShowShoppingPlanModal] = useState(false)
  const [shoppingItemCount, setShoppingItemCount] = useState(0)

  // Fonction de filtrage par recherche
  const filterBySearch = useCallback((items: Item[]) => {
    if (!searchQuery) return items
    const normalizedQuery = normalizeString(searchQuery)
    return items.filter(item =>
      normalizeString(item.content || '').includes(normalizedQuery)
    )
  }, [searchQuery])

  // Items filtrés par recherche
  const filteredTasks = useMemo(() => filterBySearch(data?.tasks || []), [data?.tasks, filterBySearch])
  const filteredNotes = useMemo(() => filterBySearch(data?.notes || []), [data?.notes, filterBySearch])
  const filteredIdeas = useMemo(() => filterBySearch(data?.ideas || []), [data?.ideas, filterBySearch])
  const filteredShopping = useMemo(() => filterBySearch(data?.shoppingItems || []), [data?.shoppingItems, filterBySearch])

  // Compteurs (reflètent la recherche si active)
  const displayCounts = useMemo(() => {
    if (!searchQuery) return data?.counts
    return {
      tasks: filteredTasks.length,
      notes: filteredNotes.length,
      ideas: filteredIdeas.length,
      shopping: filteredShopping.length
    }
  }, [searchQuery, data?.counts, filteredTasks.length, filteredNotes.length, filteredIdeas.length, filteredShopping.length])

  // Gérer le retour après connexion Google Calendar
  const hasResumedPlanning = useRef(false)
  useEffect(() => {
    const resumePlanning = searchParams.get('resumePlanning')
    if (resumePlanning === 'true' && !hasResumedPlanning.current) {
      const pendingPlanning = localStorage.getItem('manae_pending_planning')
      if (pendingPlanning) {
        try {
          const context = JSON.parse(pendingPlanning)

          // Cas spécial : planification des courses
          if (context.itemId === 'shopping-trip') {
            hasResumedPlanning.current = true
            localStorage.removeItem('manae_pending_planning')
            requestAnimationFrame(() => {
              setActiveFilter('shopping')
              setShowShoppingPlanModal(true)
            })
            router.replace('/clarte')
            return
          }

          // Cas standard : planification d'une tâche
          if (context.itemId && data?.tasks) {
            const task = data.tasks.find(t => t.id === context.itemId)
            if (task) {
              hasResumedPlanning.current = true
              requestAnimationFrame(() => {
                setTaskToPlan(task)
                setActiveFilter('tasks')
              })
            }
          }
          localStorage.removeItem('manae_pending_planning')
          router.replace('/clarte')
        } catch (e) {
          console.error('Erreur parsing pending planning:', e)
          localStorage.removeItem('manae_pending_planning')
        }
      }
    }
  }, [searchParams, data?.tasks, router])

  // Handlers
  const handleMarkDone = useCallback(async (id: string) => {
    try {
      await completeItem(id)
      setSelectedTask(null)
      await refetch()
    } catch (error) {
      console.error('Erreur completion:', error)
    }
  }, [refetch])

  const handlePlan = useCallback((id: string) => {
    const task = data?.tasks.find(t => t.id === id)
    if (task) {
      setSelectedTask(null)
      setTaskToPlan(task)
    }
  }, [data?.tasks])

  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      await deleteItem(id)
      setSelectedTask(null)
      await refetch()
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }, [refetch])

  const handleStoreTask = useCallback(async (id: string) => {
    try {
      await archiveItem(id)
      setSelectedTask(null)
      await refetch()
    } catch (error) {
      console.error('Erreur archivage:', error)
    }
  }, [refetch])

  const handleReactivateTask = useCallback(async (id: string) => {
    try {
      await activateItem(id)
      setSelectedTask(null)
      await refetch()
    } catch (error) {
      console.error('Erreur réactivation:', error)
    }
  }, [refetch])

  const handleEditTask = useCallback(async (id: string, content: string, context: ItemContext) => {
    try {
      await updateItemContent(id, content, context)
      setSelectedTask(null)
      await refetch()
    } catch (error) {
      console.error('Erreur modification:', error)
    }
  }, [refetch])

  const handleTapTask = useCallback((id: string) => {
    const task = data?.tasks.find(t => t.id === id)
    if (task) setSelectedTask(task)
  }, [data?.tasks])

  const handleTapNote = useCallback((id: string) => {
    const note = data?.notes.find(n => n.id === id)
    if (note) setSelectedNote(note)
  }, [data?.notes])

  const handleTapIdea = useCallback((id: string) => {
    const idea = data?.ideas.find(i => i.id === id)
    if (!idea) return
    if (idea.state === 'project') {
      router.push(`/projects/${id}`)
    } else {
      setSelectedIdea(idea)
    }
  }, [data?.ideas, router])

  const handleDevelopIdea = useCallback((id: string) => {
    const idea = data?.ideas.find(i => i.id === id)
    if (idea) {
      setSelectedIdea(null)
      setIdeaToDevelop(idea)
    }
  }, [data?.ideas])

  const handleIdeaDeveloped = useCallback(async () => {
    setIdeaToDevelop(null)
    await refetch()
  }, [refetch])

  const handleArchiveIdea = useCallback(async (id: string) => {
    try {
      await archiveItem(id)
      setSelectedIdea(null)
      await refetch()
    } catch (error) {
      console.error('Erreur archivage:', error)
    }
  }, [refetch])

  const handleDeleteIdea = useCallback(async (id: string) => {
    try {
      await deleteItem(id)
      setSelectedIdea(null)
      await refetch()
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }, [refetch])

  const handleToggleShoppingItem = useCallback(async (id: string) => {
    try {
      const item = data?.shoppingItems.find(i => i.id === id)
      if (!item) return
      const newState = item.state === 'completed' ? 'active' : 'completed'
      await updateItemState(id, newState)
      await refetch()
    } catch (error) {
      console.error('Erreur toggle shopping:', error)
    }
  }, [data, refetch])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchQuery(null)
  }, [])

  const handleShowShoppingPlanModal = useCallback((itemCount: number) => {
    setShoppingItemCount(itemCount)
    setShowShoppingPlanModal(true)
  }, [])

  const handleEditNote = useCallback(async (id: string, content: string, context: ItemContext) => {
    try {
      await updateItemContent(id, content, context)
      setSelectedNote(null)
      await refetch()
    } catch (error) {
      console.error('Erreur modification:', error)
    }
  }, [refetch])

  const handleArchiveNote = useCallback(async (id: string) => {
    try {
      await archiveItem(id)
      setSelectedNote(null)
      await refetch()
    } catch (error) {
      console.error('Erreur archivage:', error)
    }
  }, [refetch])

  const handleDeleteNote = useCallback(async (id: string) => {
    try {
      await deleteItem(id)
      setSelectedNote(null)
      await refetch()
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }, [refetch])

  // Filtrer les notes par contexte
  const notesByContext = useMemo(() => {
    if (activeContext === 'all') return filteredNotes
    return filteredNotes.filter(item => item.context === activeContext)
  }, [filteredNotes, activeContext])

  // Filtrer les idées par contexte
  const ideasByContext = useMemo(() => {
    if (activeContext === 'all') return filteredIdeas
    return filteredIdeas.filter(item => item.context === activeContext)
  }, [filteredIdeas, activeContext])

  const isLoading = authLoading || dataLoading
  // Ne pas afficher le spinner de chargement si un modal est ouvert
  // pour éviter de perdre l'état du wizard (ex: développement d'idée)
  const hasOpenModal = selectedNote || selectedTask || selectedIdea || ideaToDevelop || taskToPlan || showShoppingPlanModal

  const handlePullRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  if (isLoading && !hasOpenModal) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user && !hasOpenModal) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-text-muted">Veuillez vous connecter pour accéder à vos éléments.</p>
          <a href="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </a>
        </div>
      </div>
    )
  }

  if (!data && !hasOpenModal) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="text-red-500">Erreur de chargement</div>
      </div>
    )
  }

  // Déterminer quels blocs afficher selon le filtre type
  const showTasks = activeFilter === 'all' || activeFilter === 'tasks'
  const showNotes = activeFilter === 'all' || activeFilter === 'notes'
  const showIdeas = activeFilter === 'all' || activeFilter === 'ideas'
  const showShopping = activeFilter === 'all' || activeFilter === 'shopping'

  // En mode recherche, masquer les blocs vides
  const isSearching = !!searchQuery
  const shouldShowTasks = showTasks && (!isSearching || filteredTasks.length > 0)
  const shouldShowNotes = showNotes && (!isSearching || notesByContext.length > 0)
  const shouldShowIdeas = showIdeas && (!isSearching || ideasByContext.length > 0)
  const shouldShowShopping = showShopping && (!isSearching || filteredShopping.length > 0)

  // Vérifier si aucun résultat pendant une recherche
  const noResults = isSearching && !shouldShowTasks && !shouldShowNotes && !shouldShowIdeas && !shouldShowShopping

  return (
    <>
      <PullToRefresh onRefresh={handlePullRefresh} className="flex-1 flex flex-col pb-24">
        <div className="w-full max-w-2xl mx-auto px-4">
            <ClarteHeader
              activeFilter={activeFilter}
              activeContext={activeContext}
              counts={displayCounts}
              onFilterChange={setActiveFilter}
              onContextChange={setActiveContext}
              onSearch={handleSearch}
              onClearSearch={handleClearSearch}
            />

            {noResults ? (
              <EmptySearchResult query={searchQuery!} />
            ) : (
              <div className="space-y-4 mt-4">
                {shouldShowTasks && (
                  activeFilter === 'tasks' && !isSearching ? (
                    <TasksFullView
                      tasks={filteredTasks}
                      onRefresh={refetch}
                      initialTaskToPlan={taskToPlan}
                      onTaskToPlanHandled={() => setTaskToPlan(null)}
                      externalModalControl={true}
                      onSelectTask={setSelectedTask}
                      onSelectTaskToPlan={setTaskToPlan}
                    />
                  ) : (
                    <TasksBlock
                      tasks={filteredTasks}
                      totalCount={filteredTasks.length}
                      onMarkDone={handleMarkDone}
                      onPlan={handlePlan}
                      onTap={handleTapTask}
                      onShowFullView={() => setActiveFilter('tasks')}
                    />
                  )
                )}

                {shouldShowNotes && (
                  activeFilter === 'notes' && !isSearching ? (
                    <NotesFullView notes={notesByContext} contextFilter={activeContext} onRefresh={refetch} />
                  ) : (
                    <NotesBlock
                      notes={notesByContext}
                      totalCount={notesByContext.length}
                      onTapNote={handleTapNote}
                      onShowFullView={() => setActiveFilter('notes')}
                    />
                  )
                )}

                {shouldShowIdeas && (
                  activeFilter === 'ideas' && !isSearching ? (
                    <IdeasFullView
                      ideas={ideasByContext}
                      contextFilter={activeContext}
                      onRefresh={refetch}
                    />
                  ) : (
                    <IdeasBlock
                      ideas={ideasByContext}
                      totalCount={ideasByContext.length}
                      onTapIdea={handleTapIdea}
                      onShowFullView={() => setActiveFilter('ideas')}
                    />
                  )
                )}

                {shouldShowShopping && (
                  activeFilter === 'shopping' && !isSearching ? (
                    <ShoppingFullView
                      items={filteredShopping}
                      onRefresh={refetch}
                      initialShowPlanModal={showShoppingPlanModal}
                      onPlanModalClosed={() => setShowShoppingPlanModal(false)}
                      onShowPlanModal={handleShowShoppingPlanModal}
                      externalPlanModalControl={true}
                    />
                  ) : (
                    <ShoppingBlock
                      items={filteredShopping}
                      totalCount={filteredShopping.length}
                      onToggleItem={handleToggleShoppingItem}
                      onShowFullView={() => setActiveFilter('shopping')}
                    />
                  )
                )}
              </div>
            )}
          </div>
      </PullToRefresh>

      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onEdit={handleEditNote}
          onArchive={handleArchiveNote}
          onDelete={handleDeleteNote}
        />
      )}

      {selectedTask && (selectedTask.state === 'active' || selectedTask.state === 'planned' || selectedTask.state === 'captured') && (
        <TaskActiveModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onMarkDone={handleMarkDone}
          onPlan={handlePlan}
          onStore={handleStoreTask}
          onDelete={handleDeleteTask}
          onEdit={handleEditTask}
        />
      )}

      {selectedTask && (selectedTask.state === 'completed' || selectedTask.state === 'archived') && (
        <TaskDetailModal
          task={selectedTask}
          mode={selectedTask.state === 'completed' ? 'done' : 'stored'}
          onClose={() => setSelectedTask(null)}
          onReactivate={handleReactivateTask}
          onStore={selectedTask.state === 'completed' ? handleStoreTask : undefined}
          onDelete={selectedTask.state === 'archived' ? handleDeleteTask : undefined}
        />
      )}

      {taskToPlan && (
        <PlanTaskModal
          task={taskToPlan}
          onClose={() => setTaskToPlan(null)}
          onSuccess={refetch}
        />
      )}

      {selectedIdea && (
        <IdeaDetailModal
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onDevelop={handleDevelopIdea}
          onArchive={handleArchiveIdea}
          onDelete={handleDeleteIdea}
        />
      )}

      {ideaToDevelop && (
        <IdeaDevelopModal
          idea={ideaToDevelop}
          onClose={() => setIdeaToDevelop(null)}
          onDeveloped={handleIdeaDeveloped}
        />
      )}

      {showShoppingPlanModal && (
        <PlanShoppingModal
          itemCount={shoppingItemCount}
          onClose={() => setShowShoppingPlanModal(false)}
          onSuccess={refetch}
        />
      )}
    </>
  )
}

export default function ClartePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <ClartePageContent />
    </Suspense>
  )
}
