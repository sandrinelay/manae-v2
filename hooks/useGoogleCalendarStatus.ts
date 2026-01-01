'use client'

import { useSyncExternalStore, useCallback } from 'react'

// Helper pour lire le statut Google Calendar depuis localStorage
function getCalendarSnapshot() {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('google_tokens')
}

function getServerSnapshot() {
  return false
}

export function useGoogleCalendarStatus() {
  // Subscribe aux changements (storage event + custom event)
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback)
    window.addEventListener('calendar-connection-changed', callback)

    return () => {
      window.removeEventListener('storage', callback)
      window.removeEventListener('calendar-connection-changed', callback)
    }
  }, [])

  const isConnected = useSyncExternalStore(
    subscribe,
    getCalendarSnapshot,
    getServerSnapshot
  )

  // Plus besoin de isLoading car useSyncExternalStore est synchrone
  return { isConnected, isLoading: false }
}
