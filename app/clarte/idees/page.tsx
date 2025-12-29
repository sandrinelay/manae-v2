'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IdeaCard } from '@/components/clarte/cards/IdeaCard'
import { ChevronLeft } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import type { Item } from '@/types/items'

type TabType = 'all' | 'projects' | 'archived'

export default function IdeesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [ideas, setIdeas] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchIdeas = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    let query = supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'idea')
      .order('updated_at', { ascending: false })

    if (activeTab === 'all') {
      query = query.in('state', ['active', 'captured', 'project'])
    } else if (activeTab === 'projects') {
      query = query.eq('state', 'project')
    } else {
      query = query.eq('state', 'archived')
    }

    const { data } = await query
    setIdeas(data || [])
    setIsLoading(false)
  }, [activeTab])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  const handleTapIdea = (id: string) => {
    const idea = ideas.find(i => i.id === id)
    if (!idea) return

    if (idea.state === 'project') {
      router.push(`/projects/${id}`)
    } else {
      // TODO: Ouvrir panel Develop Idea
      console.log('Develop idea:', id)
    }
  }

  // Grouper par état
  const projectIdeas = ideas.filter(i => i.state === 'project')
  const activeIdeas = ideas.filter(i => i.state === 'active')
  const capturedIdeas = ideas.filter(i => i.state === 'captured')

  const TABS = [
    { id: 'all' as TabType, label: 'Toutes' },
    { id: 'projects' as TabType, label: 'Projets' },
    { id: 'archived' as TabType, label: 'Archivées' }
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
            <h1 className="text-xl font-semibold text-text-dark">Idées</h1>
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
        </header>

        {/* Contenu */}
        <div className="px-4 py-4">
          {isLoading ? (
            <div className="text-center py-12 text-text-muted">Chargement...</div>
          ) : ideas.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              Aucune idée {activeTab === 'projects' ? 'en projet' : activeTab === 'archived' ? 'archivée' : ''}
            </div>
          ) : activeTab === 'all' ? (
            <div className="space-y-6">
              {/* Projets */}
              {projectIdeas.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    ✨ Projets en cours ({projectIdeas.length})
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {projectIdeas.map(idea => (
                      <IdeaCard key={idea.id} item={idea} onTap={handleTapIdea} />
                    ))}
                  </div>
                </section>
              )}

              {/* À développer */}
              {activeIdeas.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    💡 À développer ({activeIdeas.length})
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {activeIdeas.map(idea => (
                      <IdeaCard key={idea.id} item={idea} onTap={handleTapIdea} />
                    ))}
                  </div>
                </section>
              )}

              {/* À clarifier */}
              {capturedIdeas.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    ⚡ À clarifier ({capturedIdeas.length})
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {capturedIdeas.map(idea => (
                      <IdeaCard key={idea.id} item={idea} onTap={handleTapIdea} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ideas.map(idea => (
                <IdeaCard key={idea.id} item={idea} onTap={handleTapIdea} />
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
