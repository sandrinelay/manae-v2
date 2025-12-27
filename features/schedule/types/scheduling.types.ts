import type { Constraint } from '@/types'

export interface GoogleCalendarEvent {
    id: string
    summary: string
    start: {
      dateTime?: string  // ISO 8601
      date?: string      // YYYY-MM-DD (all-day events)
    }
    end: {
      dateTime?: string
      date?: string
    }
    status: 'confirmed' | 'tentative' | 'cancelled'
  }
  
  export interface TimeSlot {
    date: string           // YYYY-MM-DD
    startTime: string      // HH:mm
    endTime: string        // HH:mm
    durationMinutes: number
    score: number          // 0-100
    reason: string         // Explication du score
  }
  
  export interface SchedulingContext {
    userId: string
    taskContent: string
    taskDuration: number   // minutes
    mood?: 'energetic' | 'neutral' | 'tired'
    energyMoments: string[]
    constraints: Constraint[]
    calendarEvents: GoogleCalendarEvent[]
  }
  
  export interface SchedulingResult {
    slots: TimeSlot[]
    aiSuggestion?: {
      slotIndex: number
      reasoning: string
    }
  }