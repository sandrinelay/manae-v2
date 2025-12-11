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
// ITEMS (résultats analyse IA)
// ============================================

export type ItemType = 'task' | 'course' | 'note'

export type ItemStatus =
  | 'idea'      // 💡 Envie floue, pas structurée
  | 'project'   // 📋 Décomposée en étapes
  | 'ready'     // ✅ Prête à planifier
  | 'planned'   // 📅 Slot Google Calendar trouvé
  | 'completed' // ✔️ Terminée
  | 'rejected'  // ❌ Refusée par user

export type ItemCategory = 'work' | 'personal' | 'kids' | 'admin' | 'home' | 'other'

export type ItemPriority = 'low' | 'medium' | 'high'

export interface SuggestedSlot {
  start: string // ISO 8601
  end: string   // ISO 8601
  duration: number // minutes
}

export interface Item {
  id: string
  user_id: string
  thought_id: string | null

  // Contenu
  text: string
  refined_text: string | null

  // Classification
  type: ItemType
  status: ItemStatus
  category: ItemCategory | null

  // Métadonnées projet (si status = 'project')
  project_steps: string[] | null
  project_budget: string | null
  project_time: string | null
  project_motivation: string | null

  // Planification
  priority: ItemPriority | null
  deadline: string | null
  suggested_slot: SuggestedSlot | null
  planned_date: string | null
  completed_date: string | null

  // Relations
  parent_project_id: string | null

  // Timestamps
  created_at: string
  analyzed_at: string | null
  developed_at: string | null
  updated_at: string
}

// ============================================
// RESPONSES IA
// ============================================

export interface AIAnalysisResult {
  items: AIAnalyzedItem[]
  thoughts_processed: string[] // IDs des thoughts analysées
}

export interface AIAnalyzedItem {
  text: string
  type: ItemType
  status: ItemStatus
  category: ItemCategory
  priority?: ItemPriority
  deadline?: string
  reasoning?: string // Pour debug
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
// THOUGHT (mise à jour)
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