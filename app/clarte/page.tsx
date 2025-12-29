'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AppHeader } from '@/components/layout'
import BottomNav from '@/components/layout/BottomNav'
import { ClarteHeader } from '@/components/clarte/ClarteHeader'
import { TasksBlock } from '@/components/clarte/blocks/TasksBlock'
import { NotesBlock } from '@/components/clarte/blocks/NotesBlock'
import { IdeasBlock } from '@/components/clarte/blocks/IdeasBlock'
import { ShoppingBlock } from '@/components/clarte/blocks/ShoppingBlock'
import { NoteDetailModal } from '@/components/clarte/modals/NoteDetailModal'
import { useClarteData } from '@/hooks/useClarteData'
import { createClient } from '@/lib/supabase/client'
import type { Item } from '@/types/items'
import type { FilterType } from '@/components/clarte/FilterChips'

export default function ClartePage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { data, isLoading: dataLoading, refetch } = useClarteData()

  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<Item | null>(null)

  // Handlers
  const handleMarkDone = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .update({ state: 'completed' })
      .eq('id', id)
    await refetch()
  }, [refetch])

  const handlePlan = useCallback((id: string) => {
    // TODO: Ouvrir modal Plan Task
    console.log('Plan:', id)
  }, [])

  const handlePostpone = useCallback((id: string) => {
    // TODO: Ouvrir modal Report
    console.log('Postpone:', id)
  }, [])

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

  // Déterminer quels blocs afficher selon le filtre
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
          counts={data.counts}
          onFilterChange={setActiveFilter}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
        />

        {/* TODO: Afficher SearchResults si searchQuery existe */}

        {/* Blocs */}
        <div className="space-y-4 mt-4">
          {showTasks && (
            <TasksBlock
              tasks={data.tasks}
              totalCount={data.counts.tasks}
              onMarkDone={handleMarkDone}
              onPlan={handlePlan}
              onPostpone={handlePostpone}
            />
          )}

          {showNotes && (
            <NotesBlock
              notes={data.notes}
              totalCount={data.counts.notes}
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

      <BottomNav />
    </div>
  )
}
