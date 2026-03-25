// ============================================
// RE-EXPORT NOUVEAUX TYPES (Source de vérité)
// ============================================

export * from './items'
export * from './shopping-lists'
import type { ItemContext } from './items'

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
    user_id?: string;
    name: string;
    category: 'work' | 'school' | 'home' | 'sport' | 'social' | 'other';
    context: ItemContext | 'any';  // 'any' = bloque toutes les tâches
    days: string[];
    start_time: string;
    end_time: string;
    allow_lunch_break: boolean | null;
    created_at?: string;
}

export type ScheduleExceptionType = 'blocked' | 'modified'

export interface ScheduleException {
  id: string
  user_id?: string
  label: string
  type: ScheduleExceptionType
  start_date: string  // "YYYY-MM-DD"
  end_date: string    // "YYYY-MM-DD"
  modified_start_time?: string | null  // "HH:mm" — uniquement si type === 'modified'
  modified_end_time?: string | null    // "HH:mm"
  created_at?: string
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
// TYPES UTILITAIRES
// ============================================

export type ItemPriority = 'low' | 'medium' | 'high'

export interface SuggestedSlot {
  start: string
  end: string
  duration: number
}

export interface AIProjectDevelopment {
  refined_text: string
  steps: string[]
  estimated_time: string
  budget: string | null
  best_timing: string
  motivation: string
}
