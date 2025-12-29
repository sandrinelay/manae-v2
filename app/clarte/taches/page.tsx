'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TaskCard } from '@/components/clarte/cards/TaskCard'
import { ChevronLeft } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import type { Item } from '@/types/items'

type TabType = 'active' | 'completed' | 'archived'

export default function TachesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [tasks, setTasks] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    let query = supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'task')
      .is('parent_id', null)
      .order('scheduled_at', { ascending: true, nullsFirst: false })

    if (activeTab === 'active') {
      query = query.in('state', ['active', 'planned', 'captured'])
    } else if (activeTab === 'completed') {
      query = query.eq('state', 'completed')
    } else {
      query = query.eq('state', 'archived')
    }

    const { data } = await query
    setTasks(data || [])
    setIsLoading(false)
  }, [activeTab])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleMarkDone = async (id: string) => {
    const supabase = createClient()
    await supabase
      .from('items')
      .update({ state: 'completed', updated_at: new Date().toISOString() })
      .eq('id', id)
    fetchTasks()
  }

  const handlePlan = (id: string) => {
    // TODO: Ouvrir modal Plan Task
    console.log('Plan:', id)
  }

  const handlePostpone = (id: string) => {
    // TODO: Ouvrir modal Report
    console.log('Postpone:', id)
  }

  // Grouper les tâches par état
  const plannedTasks = tasks.filter(t => t.scheduled_at && t.state === 'planned')
  const activeTasks = tasks.filter(t => !t.scheduled_at && t.state === 'active')
  const capturedTasks = tasks.filter(t => t.state === 'captured')

  const TABS = [
    { id: 'active' as TabType, label: 'Actives' },
    { id: 'completed' as TabType, label: 'Complétées' },
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
            <h1 className="text-xl font-semibold text-text-dark">Tâches</h1>
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
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              Aucune tâche {activeTab === 'active' ? 'active' : activeTab === 'completed' ? 'complétée' : 'archivée'}
            </div>
          ) : activeTab === 'active' ? (
            <div className="space-y-6">
              {/* Planifiées */}
              {plannedTasks.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    📅 Planifiées ({plannedTasks.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {plannedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        item={task}
                        onMarkDone={handleMarkDone}
                        onPlan={handlePlan}
                        onPostpone={handlePostpone}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* À planifier */}
              {activeTasks.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    ⏳ À planifier ({activeTasks.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        item={task}
                        onMarkDone={handleMarkDone}
                        onPlan={handlePlan}
                        onPostpone={handlePostpone}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* À clarifier */}
              {capturedTasks.length > 0 && (
                <section>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                    ⚡ À clarifier ({capturedTasks.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {capturedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        item={task}
                        onMarkDone={handleMarkDone}
                        onPlan={handlePlan}
                        onPostpone={handlePostpone}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  item={task}
                  onMarkDone={handleMarkDone}
                  onPlan={handlePlan}
                  onPostpone={handlePostpone}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
