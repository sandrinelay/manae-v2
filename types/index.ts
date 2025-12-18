// ============================================
// RE-EXPORT NOUVEAUX TYPES (Source de vérité)
// ============================================

export * from './items'
export * from './shopping-lists'

// ============================================
// ONBOARDING & CONSTRAINTS (existants)
// ============================================

export interface OnboardingData {
    firstName: string;
    lastName: string;
    email: string;
}

export interface ValidationErrors {
    firstName?: string;
    lastName?: string;
    email?: string;
}

export interface Constraint {
    id: string;
    name: string;
    category: 'work' | 'school' | 'home' | 'sport' | 'social' | 'other';
    days: string[];
    start_time: string;
    end_time: string;
    allow_lunch_break: boolean;
}

export const CATEGORY_CONFIG = {
    work: { label: 'Travail' },
    school: { label: 'École' },
    home: { label: 'Maison' },
    sport: { label: 'Sport' },
    social: { label: 'Social' },
    other: { label: 'Autre' }
};

export const DAYS_OF_WEEK = [
    { id: 'monday', label: 'Lun' },
    { id: 'tuesday', label: 'Mar' },
    { id: 'wednesday', label: 'Mer' },
    { id: 'thursday', label: 'Jeu' },
    { id: 'friday', label: 'Ven' },
    { id: 'saturday', label: 'Sam' },
    { id: 'sunday', label: 'Dim' }
];

// ============================================
// TYPES LEGACY (pour compatibilité pendant migration)
// À terme, utiliser les nouveaux types de ./items.ts
// ============================================

/** @deprecated Utiliser ItemType de ./items.ts */
export type LegacyItemType = 'task' | 'course' | 'note'

/** @deprecated Utiliser ItemState de ./items.ts */
export type LegacyItemStatus =
  | 'idea'
  | 'project'
  | 'ready'
  | 'planned'
  | 'completed'
  | 'rejected'

/** @deprecated Utiliser ItemContext de ./items.ts */
export type LegacyItemCategory = 'work' | 'personal' | 'kids' | 'admin' | 'home' | 'other'

export type ItemPriority = 'low' | 'medium' | 'high'

export interface SuggestedSlot {
  start: string
  end: string
  duration: number
}

/** @deprecated Utiliser Item de ./items.ts */
export interface LegacyItem {
  id: string
  user_id: string
  thought_id: string | null
  text: string
  refined_text: string | null
  type: LegacyItemType
  status: LegacyItemStatus
  category: LegacyItemCategory | null
  project_steps: string[] | null
  project_budget: string | null
  project_time: string | null
  project_motivation: string | null
  priority: ItemPriority | null
  deadline: string | null
  suggested_slot: SuggestedSlot | null
  planned_date: string | null
  completed_date: string | null
  parent_project_id: string | null
  created_at: string
  analyzed_at: string | null
  developed_at: string | null
  updated_at: string
}

/** @deprecated */
export interface LegacyAIAnalysisResult {
  items: LegacyAIAnalyzedItem[]
  thoughts_processed: string[]
}

/** @deprecated */
export interface LegacyAIAnalyzedItem {
  text: string
  type: LegacyItemType
  status: LegacyItemStatus
  category: LegacyItemCategory
  priority?: ItemPriority
  deadline?: string
  reasoning?: string
}

export interface AIProjectDevelopment {
  refined_text: string
  steps: string[]
  estimated_time: string
  budget: string | null
  best_timing: string
  motivation: string
}

// ============================================
// THOUGHT (compatible legacy)
// ============================================

export interface Thought {
  id: string
  user_id: string
  raw_text: string
  mood: 'energetic' | 'calm' | 'overwhelmed' | 'tired' | null
  processed: boolean
  processed_at: string | null
  created_at: string
}