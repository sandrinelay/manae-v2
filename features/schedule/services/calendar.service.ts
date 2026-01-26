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
 * Récupère les événements d'un calendrier spécifique entre 2 dates
 */
async function getEventsFromCalendar(
  calendarId: string,
  startDate: Date,
  endDate: Date,
  accessToken: string
): Promise<GoogleCalendarEvent[]> {
  const url = new URL(`${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`)
  url.searchParams.append('timeMin', startDate.toISOString())
  url.searchParams.append('timeMax', endDate.toISOString())
  url.searchParams.append('singleEvents', 'true')
  url.searchParams.append('orderBy', 'startTime')
  url.searchParams.append('maxResults', '250')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    if (response.status === 404) {
      // Calendrier non trouvé (peut avoir été supprimé)
      console.warn(`[calendar.service] Calendrier ${calendarId} non trouvé`)
      return []
    }
    throw new Error(`Erreur API: ${response.status}`)
  }

  const data = await response.json()

  return (data.items || [])
    .filter((event: GoogleCalendarRawEvent) => {
      if (event.status === 'cancelled') return false
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
}

/**
 * Récupère les événements de TOUS les calendriers sélectionnés entre 2 dates
 * @param startDate - Date de début (incluse)
 * @param endDate - Date de fin (incluse)
 * @returns Liste des événements fusionnés
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

  // 2. Récupérer la liste des calendriers sélectionnés
  const selectedCalendarIds = getSelectedCalendarIds()
  console.log(`[calendar.service] Calendriers à interroger: ${selectedCalendarIds.join(', ')}`)

  // 3. Récupérer les événements de chaque calendrier en parallèle
  try {
    const eventsArrays = await Promise.all(
      selectedCalendarIds.map(calendarId =>
        getEventsFromCalendar(calendarId, startDate, endDate, tokens.access_token)
          .catch(err => {
            console.warn(`[calendar.service] Erreur calendrier ${calendarId}:`, err)
            return [] // Continuer avec les autres calendriers en cas d'erreur
          })
      )
    )

    // 4. Fusionner tous les événements
    const allEvents = eventsArrays.flat()

    // 5. Dédupliquer (un événement peut apparaître sur plusieurs calendriers)
    const uniqueEvents = allEvents.filter((event, index, self) =>
      index === self.findIndex(e => e.id === event.id)
    )

    console.log(`[calendar.service] Récupéré ${uniqueEvents.length} événements (${selectedCalendarIds.length} calendriers)`)
    return uniqueEvents

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        localStorage.removeItem(GOOGLE_TOKENS_KEY)
        throw new Error('Session Google expirée, reconnexion requise')
      }
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

// ============================================
// SUPPRESSION D'ÉVÉNEMENT
// ============================================

/**
 * Supprime un événement du Google Calendar
 * @param eventId - L'ID de l'événement à supprimer
 * @throws Error si échec de suppression
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  // 1. Vérifier et refresh tokens si nécessaire
  await ensureValidTokens()

  const tokens = getGoogleTokens()
  if (!tokens) {
    throw new Error('Google Calendar non connecté')
  }

  // 2. Appel API DELETE
  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      }
    )

    // 204 No Content = succès
    // 404 Not Found = événement déjà supprimé (on considère comme succès)
    // 410 Gone = événement supprimé (on considère comme succès)
    if (response.ok || response.status === 204 || response.status === 404 || response.status === 410) {
      console.log(`[calendar.service] Événement ${eventId} supprimé`)
      return
    }

    // Gestion des erreurs HTTP
    if (response.status === 401) {
      localStorage.removeItem(GOOGLE_TOKENS_KEY)
      throw new Error('Session Google expirée, reconnexion requise')
    }
    if (response.status === 403) {
      throw new Error('Permissions insuffisantes pour supprimer cet événement')
    }

    const errorData = await response.json().catch(() => ({}))
    console.error('[calendar.service] Erreur suppression événement:', errorData)
    throw new Error(`Échec suppression événement: ${response.status}`)

  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Impossible de supprimer l\'événement du calendrier')
  }
}

// ============================================
// GESTION DES CALENDRIERS MULTIPLES
// ============================================

const SELECTED_CALENDARS_KEY = 'manae_selected_calendars'

export interface GoogleCalendar {
  id: string
  summary: string
  backgroundColor?: string
  primary?: boolean
  accessRole?: string
}

/**
 * Récupère la liste de tous les calendriers de l'utilisateur
 */
export async function getCalendarList(): Promise<GoogleCalendar[]> {
  await ensureValidTokens()

  const tokens = getGoogleTokens()
  if (!tokens) {
    throw new Error('Google Calendar non connecté')
  }

  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem(GOOGLE_TOKENS_KEY)
        throw new Error('Session Google expirée, reconnexion requise')
      }
      throw new Error(`Erreur API Google Calendar: ${response.status}`)
    }

    const data = await response.json()

    const calendars: GoogleCalendar[] = (data.items || [])
      .filter((cal: { accessRole?: string }) =>
        // Garder les calendriers où l'utilisateur peut au moins lire
        ['owner', 'writer', 'reader'].includes(cal.accessRole || '')
      )
      .map((cal: { id: string; summary?: string; backgroundColor?: string; primary?: boolean; accessRole?: string }) => ({
        id: cal.id,
        summary: cal.summary || '(Sans nom)',
        backgroundColor: cal.backgroundColor,
        primary: cal.primary || false,
        accessRole: cal.accessRole
      }))

    console.log(`[calendar.service] ${calendars.length} calendriers trouvés`)
    return calendars

  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Impossible de récupérer la liste des calendriers')
  }
}

/**
 * Récupère les IDs des calendriers sélectionnés par l'utilisateur
 * Par défaut, retourne ['primary'] si aucune sélection n'est sauvegardée
 */
export function getSelectedCalendarIds(): string[] {
  const stored = localStorage.getItem(SELECTED_CALENDARS_KEY)
  if (!stored) {
    return ['primary']
  }
  try {
    const ids = JSON.parse(stored)
    return Array.isArray(ids) && ids.length > 0 ? ids : ['primary']
  } catch {
    return ['primary']
  }
}

/**
 * Sauvegarde les IDs des calendriers sélectionnés
 */
export function saveSelectedCalendarIds(calendarIds: string[]): void {
  localStorage.setItem(SELECTED_CALENDARS_KEY, JSON.stringify(calendarIds))
  console.log(`[calendar.service] Calendriers sélectionnés: ${calendarIds.join(', ')}`)
}