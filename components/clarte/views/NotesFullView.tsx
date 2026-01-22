'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  fetchNotes,
  archiveItem,
  activateItem,
  deleteItem,
  updateItemContent
} from '@/services/items.service'
import { TabBar } from '@/components/clarte/tabs/TabBar'
import { NoteRow } from '@/components/clarte/cards/NoteRow'
import { NoteDetailModal } from '@/components/clarte/modals/NoteDetailModal'
import { NoteArchivedModal } from '@/components/clarte/modals/NoteArchivedModal'
import { EmptyState, EMPTY_STATE_CONFIG } from '@/components/clarte/EmptyState'
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

  // Fetch toutes les notes
  const fetchAllNotes = useCallback(async () => {
    try {
      const data = await fetchNotes()
      setAllNotes(data)
    } catch (error) {
      console.error('Erreur fetch notes:', error)
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
    try {
      await updateItemContent(id, content, context)
      setSelectedNote(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur modification:', error)
    }
  }, [handleRefresh])

  const handleArchive = useCallback(async (id: string) => {
    try {
      await archiveItem(id)
      setSelectedNote(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur archivage:', error)
    }
  }, [handleRefresh])

  const handleReactivate = useCallback(async (id: string) => {
    try {
      await activateItem(id)
      setSelectedNote(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur réactivation:', error)
    }
  }, [handleRefresh])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteItem(id)
      setSelectedNote(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }, [handleRefresh])

  // Détermine si la note sélectionnée est active
  const isSelectedNoteActive = selectedNote &&
    (selectedNote.state === 'active' || selectedNote.state === 'captured')

  // Notes à afficher selon l'onglet actif
  const displayedNotes = activeTab === 'active' ? activeNotes : archivedNotes

  return (
    <div className="w-full">
      {/* Onglets */}
      <TabBar
        tabs={tabsWithCounts}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
        className="border-b border-gray-100 pb-2"
      />

      {/* Contenu */}
      <div className="w-full mt-4">
        {displayedNotes.length === 0 ? (
          <EmptyState {...(activeTab === 'active' ? EMPTY_STATE_CONFIG.notes : EMPTY_STATE_CONFIG.notesArchived)} />
        ) : (
          <div className="space-y-3">
            {displayedNotes.map((note, idx) => (
              <NoteRow
                key={note.id}
                item={note}
                index={idx}
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
    </div>
  )
}
