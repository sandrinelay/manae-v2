'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchIdeas, archiveItem, deleteItem } from '@/services/items.service'
import { TabBar } from '@/components/clarte/tabs/TabBar'
import { IdeaCard } from '@/components/clarte/cards/IdeaCard'
import { IdeaDetailModal } from '@/components/clarte/modals/IdeaDetailModal'
import { IdeaDevelopModal } from '@/components/clarte/modals/IdeaDevelopModal'
import { EmptyState, EMPTY_STATE_CONFIG } from '@/components/clarte/EmptyState'
import type { Item, ItemContext } from '@/types/items'

type TabId = 'ideas' | 'projects' | 'archived'

const TABS = [
  { id: 'ideas' as TabId, label: 'Idées' },
  { id: 'projects' as TabId, label: 'Projets' },
  { id: 'archived' as TabId, label: 'Rangées' }
]

type ContextFilter = ItemContext | 'all'

interface IdeasFullViewProps {
  ideas: Item[]
  contextFilter?: ContextFilter
  onRefresh: () => Promise<void>
}

export function IdeasFullView({ ideas: initialIdeas, contextFilter = 'all', onRefresh }: IdeasFullViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('ideas')
  const [selectedIdea, setSelectedIdea] = useState<Item | null>(null)
  const [ideaToDevelop, setIdeaToDevelop] = useState<Item | null>(null)
  const [allIdeas, setAllIdeas] = useState<Item[]>(initialIdeas)

  // Fetch toutes les idées
  const fetchAllIdeas = useCallback(async () => {
    try {
      const data = await fetchIdeas()
      setAllIdeas(data)
    } catch (error) {
      console.error('Erreur fetch ideas:', error)
    }
  }, [])

  // Charger toutes les idées au montage
  useEffect(() => {
    fetchAllIdeas()
  }, [fetchAllIdeas])

  // Refresh
  const handleRefresh = useCallback(async () => {
    await onRefresh()
    await fetchAllIdeas()
  }, [onRefresh, fetchAllIdeas])

  // Filtrer par contexte
  const ideasByContext = useMemo(() => {
    if (contextFilter === 'all') return allIdeas
    return allIdeas.filter(i => i.context === contextFilter)
  }, [allIdeas, contextFilter])

  // Filtrer selon l'onglet
  const activeIdeas = useMemo(() =>
    ideasByContext.filter(i => i.state === 'active' || i.state === 'captured'),
    [ideasByContext]
  )

  const projectIdeas = useMemo(() =>
    ideasByContext.filter(i => i.state === 'project'),
    [ideasByContext]
  )

  const archivedIdeas = useMemo(() =>
    ideasByContext.filter(i => i.state === 'archived'),
    [ideasByContext]
  )

  // Compteurs pour les onglets
  const tabsWithCounts = useMemo(() => TABS.map(tab => ({
    ...tab,
    count: tab.id === 'ideas' ? activeIdeas.length
         : tab.id === 'projects' ? projectIdeas.length
         : archivedIdeas.length
  })), [activeIdeas.length, projectIdeas.length, archivedIdeas.length])

  // Idées à afficher selon l'onglet
  const displayedIdeas = activeTab === 'ideas' ? activeIdeas
                       : activeTab === 'projects' ? projectIdeas
                       : archivedIdeas

  // Config empty state selon l'onglet
  const emptyConfig = activeTab === 'ideas'
    ? EMPTY_STATE_CONFIG.ideas
    : activeTab === 'projects'
    ? EMPTY_STATE_CONFIG.projects
    : EMPTY_STATE_CONFIG.ideasArchived

  // Handlers
  const handleTapIdea = useCallback((id: string) => {
    // Chercher dans toutes les sources possibles
    const idea = allIdeas.find(i => i.id === id)
      || displayedIdeas.find(i => i.id === id)
      || initialIdeas.find(i => i.id === id)

    if (!idea) {
      console.error('Idée non trouvée:', id)
      return
    }

    // Projet → page dédiée
    if (idea.state === 'project') {
      router.push(`/projects/${id}`)
      return
    }

    // Idée ou archivée → modal
    setSelectedIdea(idea)
  }, [allIdeas, displayedIdeas, initialIdeas, router])

  const handleDevelop = useCallback((id: string) => {
    const idea = allIdeas.find(i => i.id === id)
      || displayedIdeas.find(i => i.id === id)
      || initialIdeas.find(i => i.id === id)

    if (idea) {
      setSelectedIdea(null)
      setIdeaToDevelop(idea)
    }
  }, [allIdeas, displayedIdeas, initialIdeas])

  const handleDeveloped = useCallback(async () => {
    setIdeaToDevelop(null)
    await handleRefresh()
    // Basculer vers l'onglet Projets
    setActiveTab('projects')
  }, [handleRefresh])

  const handleArchive = useCallback(async (id: string) => {
    try {
      await archiveItem(id)
      setSelectedIdea(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur archivage:', error)
    }
  }, [handleRefresh])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteItem(id)
      setSelectedIdea(null)
      await handleRefresh()
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }, [handleRefresh])

  // Vérifier si l'idée sélectionnée est active (non archivée)
  const isSelectedIdeaActive = selectedIdea &&
    (selectedIdea.state === 'active' || selectedIdea.state === 'captured')

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
        {displayedIdeas.length === 0 ? (
          <EmptyState {...emptyConfig} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayedIdeas.map((idea, idx) => (
              <IdeaCard
                key={idea.id}
                item={idea}
                index={idx}
                onTap={handleTapIdea}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal pour idée active */}
      {selectedIdea && isSelectedIdeaActive && (
        <IdeaDetailModal
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onDevelop={handleDevelop}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      )}

      {/* Modal pour idée archivée */}
      {selectedIdea && !isSelectedIdeaActive && (
        <IdeaDetailModal
          idea={selectedIdea}
          onClose={() => setSelectedIdea(null)}
          onDevelop={handleDevelop}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      )}

      {/* Modal de développement */}
      {ideaToDevelop && (
        <IdeaDevelopModal
          idea={ideaToDevelop}
          onClose={() => setIdeaToDevelop(null)}
          onDeveloped={handleDeveloped}
        />
      )}
    </div>
  )
}
