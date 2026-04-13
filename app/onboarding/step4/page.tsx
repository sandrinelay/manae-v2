'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAllLists, updateListEnabled } from '@/services/lists.service'
import { Button } from '@/components/ui/Button'
import type { List } from '@/types/lists'

export default function OnboardingStep4() {
  const router = useRouter()
  const [lists, setLists] = useState<List[]>([])
  const [enabled, setEnabled] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const allLists = await getAllLists(supabase, user.id)
      setLists(allLists)
      const initial: Record<string, boolean> = {}
      for (const l of allLists) {
        initial[l.id] = l.enabled
      }
      setEnabled(initial)
      setIsLoading(false)
    }
    load()
  }, [])

  const handleToggle = (listId: string, slug: string) => {
    if (slug === 'alimentaire') return
    setEnabled(prev => ({ ...prev, [listId]: !prev[listId] }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      await Promise.all(
        lists
          .filter(l => l.slug !== 'alimentaire')
          .map(l => updateListEnabled(supabase, l.id, enabled[l.id]))
      )
      router.push('/capture')
    } catch (err) {
      console.error('Erreur sauvegarde listes:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mint flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text-dark mb-2 text-center">
          Tes listes d&apos;achats
        </h1>
        <p className="text-text-muted text-center mb-8">
          Choisis celles dont tu as besoin. Tu pourras modifier ça plus tard dans ton profil.
        </p>

        <div className="space-y-3 mb-8">
          {lists.map(list => {
            const isAlimentaire = list.slug === 'alimentaire'
            const isEnabled = enabled[list.id] ?? true

            return (
              <button
                key={list.id}
                onClick={() => handleToggle(list.id, list.slug)}
                disabled={isAlimentaire}
                aria-label={`${isEnabled ? 'Désactiver' : 'Activer'} la liste ${list.name}`}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                  isEnabled
                    ? 'border-primary bg-white'
                    : 'border-transparent bg-white/60'
                } ${isAlimentaire ? 'opacity-80 cursor-default' : 'cursor-pointer hover:border-primary/50'}`}
              >
                <span className={`font-medium ${isEnabled ? 'text-text-dark' : 'text-text-muted'}`}>
                  {list.name}
                </span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isEnabled ? 'border-primary bg-primary' : 'border-gray-300'
                }`}>
                  {isEnabled && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? 'Enregistrement...' : 'Commencer →'}
        </Button>
      </div>
    </div>
  )
}
