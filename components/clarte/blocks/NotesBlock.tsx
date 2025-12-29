'use client'

import { useRouter } from 'next/navigation'
import { Item } from '@/types/items'
import { NoteRow } from '../cards/NoteRow'
import { ChevronRightIcon } from '@/components/ui/icons/ItemTypeIcons'

interface NotesBlockProps {
  notes: Item[]
  totalCount: number
  onTapNote: (id: string) => void
}

export function NotesBlock({ notes, totalCount, onTapNote }: NotesBlockProps) {
  const router = useRouter()

  if (notes.length === 0) {
    return (
      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-dark">Notes</h2>
        </div>
        <p className="text-text-muted text-center py-8">
          Aucune note pour le moment
        </p>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <button
        onClick={() => router.push('/clarte/notes')}
        className="w-full flex items-center justify-between mb-2 group"
      >
        <h2 className="text-lg font-semibold text-text-dark">Notes</h2>
        <span className="flex items-center gap-1 text-sm text-primary group-hover:underline">
          Voir tout ({totalCount})
          <ChevronRightIcon className="w-4 h-4" />
        </span>
      </button>

      {/* Liste de notes */}
      <div>
        {notes.map(note => (
          <NoteRow
            key={note.id}
            item={note}
            onTap={onTapNote}
          />
        ))}
      </div>
    </section>
  )
}
