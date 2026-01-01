// features/schedule/services/calendar.service.ts

import type { GoogleCalendarEvent } from '../types/scheduling.types'

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

// ============================================
// GESTION DES TOKENS
// ============================================

interface GoogleTokens {
  access_token: string
  refresh_token: string
  expires_at?: number
}

// Type pour les événements bruts retournés par l'API Google Calendar
interface GoogleCalendarRawEvent {
  id: string
  summary?: string
  status?: string
  start?: {
    dateTime?: string
    date?: string
  }
  end?: {
    dateTime?: string
    date?: string
  }
}

const GOOGLE_TOKENS_KEY = 'google_tokens'

/**
 * Récupère les tokens Google depuis localStorage
 */
function getGoogleTokens(): GoogleTokens | null {
  const stored = localStorage.getItem(GOOGLE_TOKENS_KEY)
  if (!stored) return null

  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Sauvegarde les tokens Google dans localStorage
 */
function saveGoogleTokens(tokens: GoogleTokens): void {
  localStorage.setItem(GOOGLE_TOKENS_KEY, JSON.stringify(tokens))
}

/**
 * Vérifie si les tokens Google sont valides
 * Tente un refresh si expiré
 * @throws Error si tokens invalides ou refresh échoue
 */
export async function ensureValidTokens(): Promise<void> {
  const tokens = getGoogleTokens()
  
  if (!tokens) {
    throw new Error('Google Calendar non connecté')
  }

  // Si pas d'expires_at, on considère que c'est valide (à améliorer)
  if (!tokens.expires_at) {
    return
  }

  // Vérifier si le token a expiré (avec marge de 5 min)
  const now = Date.now()
  const expiryWithBuffer = tokens.expires_at - (5 * 60 * 1000)

  if (now < expiryWithBuffer) {
    // Token encore valide
    return
  }

  // Token expiré, tenter refresh
  console.log('[calendar.service] Token expiré, tentative de refresh...')
  
  try {
    const response = await fetch('/api/auth/google/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refresh_token })
    })

    if (!response.ok) {
      throw new Error('Échec refresh token')
    }

    const newTokens = await response.json()
    saveGoogleTokens({
      ...tokens,
      access_token: newTokens.access_token,
      expires_at: newTokens.expires_at
    })

    console.log('[calendar.service] Token refreshed avec succès')
  } catch (error) {
    console.error('[calendar.service] Échec refresh token:', error)
    // Supprimer les tokens invalides
    localStorage.removeItem(GOOGLE_TOKENS_KEY)
    throw new Error('Session Google expirée, reconnexion requise')
  }
}

// ============================================
// RÉCUPÉRATION DES ÉVÉNEMENTS
// ============================================

/**
 * Récupère les événements du calendrier entre 2 dates
 * @param startDate - Date de début (incluse)
 * @param endDate - Date de fin (incluse)
 * @returns Liste des événements
 * @throws Error si tokens invalides ou erreur API
 */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<GoogleCalendarEvent[]> {
  // 1. Vérifier et refresh tokens si nécessaire
  await ensureValidTokens()

  const tokens = getGoogleTokens()
  if (!tokens) {
    throw new Error('Google Calendar non connecté')
  }

  // 2. Construire l'URL avec paramètres
  const url = new URL(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events`)
  url.searchParams.append('timeMin', startDate.toISOString())
  url.searchParams.append('timeMax', endDate.toISOString())
  url.searchParams.append('singleEvents', 'true') // Explose les événements récurrents
  url.searchParams.append('orderBy', 'startTime')
  url.searchParams.append('maxResults', '250') // Max autorisé par Google

  // 3. Appel API
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    // Gestion des erreurs HTTP
    if (!response.ok) {
      if (response.status === 401) {
        // Token invalide malgré le refresh
        localStorage.removeItem(GOOGLE_TOKENS_KEY)
        throw new Error('Session Google expirée, reconnexion requise')
      }
      if (response.status === 403) {
        throw new Error('Permissions insuffisantes pour accéder au calendrier')
      }
      if (response.status === 429) {
        throw new Error('Trop de requêtes, réessayez dans quelques instants')
      }
      throw new Error(`Erreur API Google Calendar: ${response.status}`)
    }

    const data = await response.json()

    // 4. Filtrer et formater les événements
    const events: GoogleCalendarEvent[] = (data.items || [])
      .filter((event: GoogleCalendarRawEvent) => {
        // Exclure les événements annulés
        if (event.status === 'cancelled') return false

        // Exclure les événements sans date (edge case)
        if (!event.start?.dateTime && !event.start?.date) return false

        return true
      })
      .map((event: GoogleCalendarRawEvent) => ({
        id: event.id,
        summary: event.summary || '(Sans titre)',
        start: {
          dateTime: event.start?.dateTime,
          date: event.start?.date
        },
        end: {
          dateTime: event.end?.dateTime,
          date: event.end?.date
        },
        status: event.status || 'confirmed'
      }))

    console.log(`[calendar.service] Récupéré ${events.length} événements`)
    return events

  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Impossible de récupérer les événements du calendrier')
  }
}

// ============================================
// CRÉATION D'ÉVÉNEMENT
// ============================================

/**
 * Crée un événement dans Google Calendar
 * @param params - Paramètres de l'événement
 * @returns L'ID de l'événement créé
 * @throws Error si échec de création
 */
export async function createCalendarEvent(params: {
  summary: string
  description?: string
  startDateTime: string  // ISO 8601: "2025-01-15T14:00:00"
  endDateTime: string    // ISO 8601: "2025-01-15T15:00:00"
}): Promise<string> {
  // 1. Vérifier et refresh tokens si nécessaire
  await ensureValidTokens()

  const tokens = getGoogleTokens()
  if (!tokens) {
    throw new Error('Google Calendar non connecté')
  }

  // 2. Construire le body de l'événement
  // On ajoute le fuseau horaire local pour éviter les décalages
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const eventBody = {
    summary: params.summary,
    description: params.description,
    start: {
      dateTime: params.startDateTime,
      timeZone
    },
    end: {
      dateTime: params.endDateTime,
      timeZone
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 } // Rappel 15 min avant
      ]
    }
  }

  // 3. Appel API
  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventBody)
      }
    )

    // Gestion des erreurs HTTP
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(GOOGLE_TOKENS_KEY)
        throw new Error('Session Google expirée, reconnexion requise')
      }
      if (response.status === 403) {
        throw new Error('Permissions insuffisantes pour créer un événement')
      }
      if (response.status === 429) {
        throw new Error('Trop de requêtes, réessayez dans quelques instants')
      }
      
      const errorData = await response.json().catch(() => ({}))
      console.error('[calendar.service] Erreur création événement:', errorData)
      throw new Error(`Échec création événement: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[calendar.service] Événement créé: ${data.id}`)
    
    return data.id

  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Impossible de créer l\'événement dans le calendrier')
  }
}