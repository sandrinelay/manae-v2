'use client'

interface EmptySearchResultProps {
  query: string
}

export function EmptySearchResult({ query }: EmptySearchResultProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4">🔍</div>
      <p className="text-text-dark font-medium mb-2">
        Aucun résultat pour &quot;{query}&quot;
      </p>
      <p className="text-text-muted text-sm">
        Essaie avec d&apos;autres mots
      </p>
    </div>
  )
}
