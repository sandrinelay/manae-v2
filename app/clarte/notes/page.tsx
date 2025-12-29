'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NoteRow } from '@/components/clarte/cards/NoteRow'
import { NoteDetailModal } from '@/components/clarte/modals/NoteDetailModal'
import { CONTEXT_CONFIG } from '@/config/contexts'
import { ChevronLeft, Search } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import type { Item, ItemContext } from '@/types/items'

type TabType = 'active' | 'archived'

export default function NotesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [contextFilter, setContextFilter] = useState<ItemContext | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [notes, setNotes] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState<Item | null>(null)

  const fetchNotes = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    let query = supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'note')
      .order('updated_at', { ascending: false })

    if (activeTab === 'active') {
      query = query.in('state', ['active', 'captured'])
    } else {
      query = query.eq('state', 'archived')
    }

    if (contextFilter !== 'all') {
      query = query.eq('context', contextFilter)
    }

    const { data } = await query
    setNotes(data || [])
    setIsLoading(false)
  }, [activeTab, contextFilter])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleTapNote = (id: string) => {
    const note = notes.find(n => n.id === id)
    if (note) setSelectedNote(note)
  }

  const handleArchive = async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .update({ state: 'archived', updated_at: new Date().toISOString() })
      .eq('id', id)
    setSelectedNote(null)
    fetchNotes()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette note ?')) return
    const supabase = createClient()
    await supabase.from('items').delete().eq('id', id)
    setSelectedNote(null)
    fetchNotes()
  }

  // Filtrer par recherche
  const filteredNotes = searchQuery
    ? notes.filter(n => n.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : notes

  const TABS = [
    { id: 'active' as TabType, label: 'Actives' },
    { id: 'archived' as TabType, label: 'Archivées' }
  ]

  const CONTEXT_FILTERS: Array<{ id: ItemContext | 'all', icon?: React.FC<{className?: string}>, label: string }> = [
    { id: 'all', label: 'Tous' },
    { id: 'personal', icon: CONTEXT_CONFIG.personal.icon, label: '' },
    { id: 'family', icon: CONTEXT_CONFIG.family.icon, label: '' },
    { id: 'work', icon: CONTEXT_CONFIG.work.icon, label: '' },
    { id: 'health', icon: CONTEXT_CONFIG.health.icon, label: '' },
    { id: 'other', icon: CONTEXT_CONFIG.other.icon, label: '' }
  ]

  return (
    <div className="min-h-screen bg-mint pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-mint px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/clarte')}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-text-dark">Notes</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-text-dark hover:bg-gray-200'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filtres contexte */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {CONTEXT_FILTERS.map(filter => {
              const Icon = filter.icon
              return (
                <button
                  key={filter.id}
                  onClick={() => setContextFilter(filter.id)}
                  className={`
                    flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap
                    ${contextFilter === filter.id
                      ? 'bg-primary/10 text-primary border border-primary'
                      : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                    }
                  `}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {filter.label}
                </button>
              )
            })}
          </div>

          {/* Recherche */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans les notes..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </header>

        {/* Contenu */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="text-center py-12 text-text-muted">Chargement...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              {searchQuery ? 'Aucun résultat' : 'Aucune note'}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border divide-y divide-border">
              {filteredNotes.map(note => (
                <NoteRow key={note.id} item={note} onTap={handleTapNote} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onEdit={() => {/* TODO */}}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      )}

      <BottomNav />
    </div>
  )
}
