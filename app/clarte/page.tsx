'use client'

import { useState, useCallback, useMemo, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppHeader } from '@/components/layout'
import BottomNav from '@/components/layout/BottomNav'
import { ClarteHeader } from '@/components/clarte/ClarteHeader'
import { TasksBlock } from '@/components/clarte/blocks/TasksBlock'
import { TasksFullView } from '@/components/clarte/views/TasksFullView'
import { NotesBlock } from '@/components/clarte/blocks/NotesBlock'
import { IdeasBlock } from '@/components/clarte/blocks/IdeasBlock'
import { ShoppingBlock } from '@/components/clarte/blocks/ShoppingBlock'
import { NoteDetailModal } from '@/components/clarte/modals/NoteDetailModal'
import { TaskActiveModal } from '@/components/clarte/modals/TaskActiveModal'
import { PlanTaskModal } from '@/components/clarte/modals/PlanTaskModal'
import { useClarteData } from '@/hooks/useClarteData'
import { createClient } from '@/lib/supabase/client'
import type { Item } from '@/types/items'
import type { FilterType } from '@/config/filters'
import type { ContextFilterType } from '@/components/ui/ContextFilterTabs'

function ClartePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  const { data, isLoading: dataLoading, refetch } = useClarteData()

  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [activeContext, setActiveContext] = useState<ContextFilterType>('all')
  const [searchQuery, setSearchQuery] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<Item | null>(null)
  const [selectedTask, setSelectedTask] = useState<Item | null>(null)
  const [taskToPlan, setTaskToPlan] = useState<Item | null>(null)

  // Gérer le retour après connexion Google Calendar
  useEffect(() => {
    const resumePlanning = searchParams.get('resumePlanning')
    if (resumePlanning === 'true' && data?.tasks) {
      const pendingPlanning = localStorage.getItem('manae_pending_planning')
      if (pendingPlanning) {
        try {
          const context = JSON.parse(pendingPlanning)
          if (context.itemId) {
            // Chercher la tâche dans les données
            const task = data.tasks.find(t => t.id === context.itemId)
            if (task) {
              setTaskToPlan(task)
            }
          }
          // Nettoyer le localStorage
          localStorage.removeItem('manae_pending_planning')
          // Nettoyer l'URL
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
    const supabase = createClient()
    await supabase
      .from('items')
      .update({ state: 'completed', updated_at: new Date().toISOString() })
      .eq('id', id)
    setSelectedTask(null)
    await refetch()
  }, [refetch])

  const handlePlan = useCallback((id: string) => {
    const task = data?.tasks.find(t => t.id === id)
    if (task) {
      setSelectedTask(null) // Fermer la modal de détail si ouverte
      setTaskToPlan(task)
    }
  }, [data?.tasks])

  const handleDeleteTask = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .delete()
      .eq('id', id)
    setSelectedTask(null)
    await refetch()
  }, [refetch])

  const handleStoreTask = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .update({ state: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
    setSelectedTask(null)
    await refetch()
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
      // TODO: Ouvrir panel Develop Idea ou modal clarification
      console.log('Tap idea:', id, idea.state)
    }
  }, [data?.ideas, router])

  const handleToggleShoppingItem = useCallback(async (id: string) => {
    const supabase = createClient()
    const item = data?.shoppingItems.find(i => i.id === id)
    if (!item) return

    const newState = item.state === 'completed' ? 'active' : 'completed'
    await supabase
      .from('items')
      .update({ state: newState })
      .eq('id', id)
    await refetch()
  }, [data?.shoppingItems, refetch])

  const handlePlanShopping = useCallback(() => {
    // TODO: Ouvrir flow Plan Task avec données courses
    console.log('Plan shopping')
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchQuery(null)
  }, [])

  const handleEditNote = useCallback((id: string) => {
    // TODO: Ouvrir modal édition
    console.log('Edit note:', id)
    setSelectedNote(null)
  }, [])

  const handleArchiveNote = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .update({ state: 'archived' })
      .eq('id', id)
    setSelectedNote(null)
    await refetch()
  }, [refetch])

  const handleDeleteNote = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .delete()
      .eq('id', id)
    setSelectedNote(null)
    await refetch()
  }, [refetch])

  // Filtrer les notes par contexte (uniquement pour les notes)
  const filteredNotes = useMemo(() => {
    if (!data?.notes) return []
    if (activeContext === 'all') return data.notes
    return data.notes.filter(item => item.context === activeContext)
  }, [data?.notes, activeContext])

  const isLoading = authLoading || dataLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
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

  if (!data) {
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

  return (
    <div className="min-h-screen bg-mint flex flex-col">
      <AppHeader userName={user.email?.split('@')[0]} />
      <div className="flex-1 pb-24">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header sticky avec recherche et filtres */}
          <ClarteHeader
            activeFilter={activeFilter}
            activeContext={activeContext}
            counts={data.counts}
            onFilterChange={setActiveFilter}
            onContextChange={setActiveContext}
            onSearch={handleSearch}
            onClearSearch={handleClearSearch}
          />

        {/* TODO: Afficher SearchResults si searchQuery existe */}

        {/* Blocs */}
        <div className="space-y-4 mt-4">
          {showTasks && (
            activeFilter === 'tasks' ? (
              // Vue complète quand filtre tâches actif
              <TasksFullView
                tasks={data.tasks}
                onRefresh={refetch}
              />
            ) : (
              // Aperçu en mode global
              <TasksBlock
                tasks={data.tasks}
                totalCount={data.counts.tasks}
                onMarkDone={handleMarkDone}
                onPlan={handlePlan}
                onTap={handleTapTask}
                onShowFullView={() => setActiveFilter('tasks')}
              />
            )
          )}

          {showNotes && (
            <NotesBlock
              notes={filteredNotes}
              totalCount={filteredNotes.length}
              onTapNote={handleTapNote}
            />
          )}

          {showIdeas && (
            <IdeasBlock
              ideas={data.ideas}
              totalCount={data.counts.ideas}
              onTapIdea={handleTapIdea}
            />
          )}

          {showShopping && (
            <ShoppingBlock
              items={data.shoppingItems}
              totalCount={data.counts.shopping}
              onToggleItem={handleToggleShoppingItem}
              onPlanShopping={handlePlanShopping}
            />
          )}
        </div>
        </div>
      </div>

      {/* Modal détail note */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onEdit={handleEditNote}
          onArchive={handleArchiveNote}
          onDelete={handleDeleteNote}
        />
      )}

      {/* Modal détail tâche active */}
      {selectedTask && (
        <TaskActiveModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onMarkDone={handleMarkDone}
          onPlan={handlePlan}
          onStore={handleStoreTask}
          onDelete={handleDeleteTask}
        />
      )}

      {/* Modal de planification */}
      {taskToPlan && (
        <PlanTaskModal
          task={taskToPlan}
          onClose={() => setTaskToPlan(null)}
          onSuccess={refetch}
        />
      )}

      <BottomNav />
    </div>
  )
}

export default function ClartePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    }>
      <ClartePageContent />
    </Suspense>
  )
}
