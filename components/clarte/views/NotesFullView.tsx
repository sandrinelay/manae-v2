'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TabBar } from '@/components/clarte/tabs/TabBar'
import { NoteRow } from '@/components/clarte/cards/NoteRow'
import { NoteDetailModal } from '@/components/clarte/modals/NoteDetailModal'
import { NoteArchivedModal } from '@/components/clarte/modals/NoteArchivedModal'
import { EmptyState } from '@/components/clarte/EmptyState'
import type { Item, ItemContext } from '@/types/items'

type TabId = 'active' | 'archived'

const TABS = [
  { id: 'active' as TabId, label: 'Actives' },
  { id: 'archived' as TabId, label: 'Archivées' }
]

type ContextFilter = ItemContext | 'all'

interface NotesFullViewProps {
  notes: Item[] // Notes initiales (actives seulement)
  contextFilter?: ContextFilter
  onRefresh: () => Promise<void>
}

export function NotesFullView({ notes: initialNotes, contextFilter = 'all', onRefresh }: NotesFullViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('active')
  const [selectedNote, setSelectedNote] = useState<Item | null>(null)
  const [allNotes, setAllNotes] = useState<Item[]>(initialNotes)
  const [isLoading, setIsLoading] = useState(false)

  // Fetch toutes les notes quand on change d'onglet
  const fetchAllNotes = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'note')
        .order('updated_at', { ascending: false })

      if (data) setAllNotes(data)
    } catch (error) {
      console.error('Erreur fetch notes:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Charger toutes les notes au montage
  useEffect(() => {
    fetchAllNotes()
  }, [fetchAllNotes])

  // Refresh
  const handleRefresh = useCallback(async () => {
    await onRefresh()
    await fetchAllNotes()
  }, [onRefresh, fetchAllNotes])

  // Filtrer les notes par contexte
  const notesByContext = useMemo(() => {
    if (contextFilter === 'all') return allNotes
    return allNotes.filter(n => n.context === contextFilter)
  }, [allNotes, contextFilter])

  // Filtrer les notes selon l'onglet
  const activeNotes = useMemo(() =>
    notesByContext.filter(n => n.state === 'active' || n.state === 'captured'),
    [notesByContext]
  )

  const archivedNotes = useMemo(() =>
    notesByContext.filter(n => n.state === 'archived'),
    [notesByContext]
  )

  // Compteurs pour les onglets
  const tabsWithCounts = useMemo(() => TABS.map(tab => ({
    ...tab,
    count: tab.id === 'active' ? activeNotes.length : archivedNotes.length
  })), [activeNotes.length, archivedNotes.length])

  // Handlers
  const handleTapNote = useCallback((id: string) => {
    const note = allNotes.find(n => n.id === id)
    if (note) setSelectedNote(note)
  }, [allNotes])

  const handleEdit = useCallback(async (id: string, content: string, context: ItemContext) => {
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
    await handleRefresh()
  }, [handleRefresh])

  const handleArchive = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .update({
        state: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    setSelectedNote(null)
    await handleRefresh()
  }, [handleRefresh])

  const handleReactivate = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .update({
        state: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    setSelectedNote(null)
    await handleRefresh()
  }, [handleRefresh])

  const handleDelete = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase.from('items').delete().eq('id', id)
    setSelectedNote(null)
    await handleRefresh()
  }, [handleRefresh])

  // Détermine si la note sélectionnée est active
  const isSelectedNoteActive = selectedNote &&
    (selectedNote.state === 'active' || selectedNote.state === 'captured')

  // Notes à afficher selon l'onglet actif
  const displayedNotes = activeTab === 'active' ? activeNotes : archivedNotes

  return (
    <>
      {/* Onglets */}
      <TabBar
        tabs={tabsWithCounts}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
        className="border-b border-gray-100 pb-2"
      />

      {/* Contenu */}
      <div className="mt-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : displayedNotes.length === 0 ? (
          <EmptyState
            message={activeTab === 'active'
              ? "Aucune note pour le moment"
              : "Aucune note archivée"
            }
          />
        ) : (
          <div className="space-y-3">
            {displayedNotes.map(note => (
              <NoteRow
                key={note.id}
                item={note}
                onTap={handleTapNote}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal pour note active */}
      {selectedNote && isSelectedNoteActive && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      )}

      {/* Modal pour note archivée */}
      {selectedNote && !isSelectedNoteActive && (
        <NoteArchivedModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onEdit={handleEdit}
          onReactivate={handleReactivate}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
