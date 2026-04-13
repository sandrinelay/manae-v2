export interface List {
  id: string
  user_id: string
  name: string
  slug: ListSlug
  position: number
  enabled: boolean
  created_at: string
}

export type ListSlug = 'alimentaire' | 'maison' | 'enfants' | 'pro' | 'en-ligne'

export const LIST_SLUGS: ListSlug[] = ['alimentaire', 'maison', 'enfants', 'pro', 'en-ligne']

export const LIST_NAMES: Record<ListSlug, string> = {
  'alimentaire': 'Alimentaire',
  'maison':      'Maison',
  'enfants':     'Enfants',
  'pro':         'Pro',
  'en-ligne':    'En ligne',
}
