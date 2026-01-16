'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchIdeas, archiveItem, deleteItem } from '@/services/items.service'
import { TabBar } from '@/components/clarte/tabs/TabBar'
import { IdeaCard } from '@/components/clarte/cards/IdeaCard'
import { IdeaDetailModal } from '@/components/clarte/modals/IdeaDetailModal'
import { IdeaDevelopModal } from '@/components/clarte/modals/IdeaDevelopModal'
import { EmptyState } from '@/components/clarte/EmptyState'
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
  const [isLoading, setIsLoading] = useState(false)

  // Fetch toutes les idées
  const fetchAllIdeas = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchIdeas()
      setAllIdeas(data)
    } catch (error) {
      console.error('Erreur fetch ideas:', error)
    } finally {
      setIsLoading(false)
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

  // Message vide selon l'onglet
  const emptyMessage = activeTab === 'ideas' ? "Aucune idée pour le moment"
                     : activeTab === 'projects' ? "Aucun projet en cours"
                     : "Aucune idée rangée"

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
        ) : displayedIdeas.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {displayedIdeas.map(idea => (
              <IdeaCard
                key={idea.id}
                item={idea}
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
    </>
  )
}
