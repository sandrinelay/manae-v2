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
import { NotesFullView } from '@/components/clarte/views/NotesFullView'
import { IdeasBlock } from '@/components/clarte/blocks/IdeasBlock'
import { ShoppingBlock } from '@/components/clarte/blocks/ShoppingBlock'
import { EmptySearchResult } from '@/components/clarte/EmptySearchResult'
import { NoteDetailModal } from '@/components/clarte/modals/NoteDetailModal'
import { TaskActiveModal } from '@/components/clarte/modals/TaskActiveModal'
import { PlanTaskModal } from '@/components/clarte/modals/PlanTaskModal'
import { useClarteData } from '@/hooks/useClarteData'
import { normalizeString } from '@/components/ui/SearchBar'
import { createClient } from '@/lib/supabase/client'
import type { Item, ItemContext } from '@/types/items'
import type { FilterType } from '@/config/filters'
import type { ContextFilterType } from '@/components/ui/ContextFilterTabs'

function ClartePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()

  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [activeContext, setActiveContext] = useState<ContextFilterType>('all')
  const [searchQuery, setSearchQuery] = useState<string | null>(null)

  // Passer searchQuery au hook pour charger tous les items en mode recherche
  const { data, isLoading: dataLoading, refetch } = useClarteData({ searchQuery })
  const [selectedNote, setSelectedNote] = useState<Item | null>(null)
  const [selectedTask, setSelectedTask] = useState<Item | null>(null)
  const [taskToPlan, setTaskToPlan] = useState<Item | null>(null)

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
  useEffect(() => {
    const resumePlanning = searchParams.get('resumePlanning')
    if (resumePlanning === 'true' && data?.tasks) {
      const pendingPlanning = localStorage.getItem('manae_pending_planning')
      if (pendingPlanning) {
        try {
          const context = JSON.parse(pendingPlanning)
          if (context.itemId) {
            const task = data.tasks.find(t => t.id === context.itemId)
            if (task) {
              setTaskToPlan(task)
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
      setSelectedTask(null)
      setTaskToPlan(task)
    }
  }, [data?.tasks])

  const handleDeleteTask = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase.from('items').delete().eq('id', id)
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
      console.log('Tap idea:', id, idea.state)
    }
  }, [data?.ideas, router])

  const handleToggleShoppingItem = useCallback(async (id: string) => {
    const supabase = createClient()
    const item = data?.shoppingItems.find(i => i.id === id)
    if (!item) return
    const newState = item.state === 'completed' ? 'active' : 'completed'
    await supabase.from('items').update({ state: newState }).eq('id', id)
    await refetch()
  }, [data?.shoppingItems, refetch])

  const handlePlanShopping = useCallback(() => {
    console.log('Plan shopping')
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchQuery(null)
  }, [])

  const handleEditNote = useCallback(async (id: string, content: string, context: ItemContext) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .update({
        content,
        context,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    setSelectedNote(null)
    await refetch()
  }, [refetch])

  const handleArchiveNote = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase.from('items').update({ state: 'archived' }).eq('id', id)
    setSelectedNote(null)
    await refetch()
  }, [refetch])

  const handleDeleteNote = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase.from('items').delete().eq('id', id)
    setSelectedNote(null)
    await refetch()
  }, [refetch])

  // Filtrer les notes par contexte
  const notesByContext = useMemo(() => {
    if (activeContext === 'all') return filteredNotes
    return filteredNotes.filter(item => item.context === activeContext)
  }, [filteredNotes, activeContext])

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

  // En mode recherche, masquer les blocs vides
  const isSearching = !!searchQuery
  const shouldShowTasks = showTasks && (!isSearching || filteredTasks.length > 0)
  const shouldShowNotes = showNotes && (!isSearching || notesByContext.length > 0)
  const shouldShowIdeas = showIdeas && (!isSearching || filteredIdeas.length > 0)
  const shouldShowShopping = showShopping && (!isSearching || filteredShopping.length > 0)

  // Vérifier si aucun résultat pendant une recherche
  const noResults = isSearching && !shouldShowTasks && !shouldShowNotes && !shouldShowIdeas && !shouldShowShopping

  return (
    <div className="min-h-screen bg-mint flex flex-col">
      <AppHeader userName={user.email?.split('@')[0]} />
      <div className="flex-1 pb-24">
        <div className="max-w-2xl mx-auto px-4">
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
                  <TasksFullView tasks={filteredTasks} onRefresh={refetch} />
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
                  <NotesFullView notes={notesByContext} onRefresh={refetch} />
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
                <IdeasBlock
                  ideas={filteredIdeas}
                  totalCount={filteredIdeas.length}
                  onTapIdea={handleTapIdea}
                />
              )}

              {shouldShowShopping && (
                <ShoppingBlock
                  items={filteredShopping}
                  totalCount={filteredShopping.length}
                  onToggleItem={handleToggleShoppingItem}
                  onPlanShopping={handlePlanShopping}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onEdit={handleEditNote}
          onArchive={handleArchiveNote}
          onDelete={handleDeleteNote}
        />
      )}

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
