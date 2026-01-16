'use client'

import Link from 'next/link'
import { SearchIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-mint flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <SearchIcon className="w-10 h-10 text-gray-400" />
        </div>

        <h1 className="text-2xl font-bold text-text-dark mb-3">
          Page introuvable
        </h1>

        <p className="text-text-muted mb-8">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>

        <Link href="/capture">
          <Button>
            Retour à l&apos;accueil
          </Button>
        </Link>
      </div>
    </div>
  )
}
