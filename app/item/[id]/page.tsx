'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { fetchItemById } from '@/services/items.service'

interface ItemPageProps {
  params: Promise<{ id: string }>
}

export default function ItemPage({ params }: ItemPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function redirectToItem() {
      try {
        const item = await fetchItemById(id)

        if (!item) {
          setError('Item introuvable')
          return
        }

        // Rediriger vers la page Clarté avec le filtre approprié
        switch (item.type) {
          case 'task':
            router.replace('/clarte?filter=tasks')
            break
          case 'note':
            router.replace('/clarte?filter=notes')
            break
          case 'idea':
            if (item.state === 'project') {
              router.replace(`/projects/${id}`)
            } else {
              router.replace('/clarte?filter=ideas')
            }
            break
          case 'list_item':
            router.replace('/clarte?filter=shopping')
            break
          default:
            router.replace('/clarte')
        }
      } catch {
        setError('Erreur de redirection')
      }
    }

    redirectToItem()
  }, [id, router])

  if (error) {
    return (
      <div className="min-h-screen bg-mint flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => router.push('/clarte')}
            className="text-primary font-medium hover:underline"
          >
            Retourner à Clarté
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mint flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )
}
