'use client'

import { useAgenda } from '@/hooks/useAgenda'
import { AgendaPanel } from './AgendaPanel'
import { AppHeader } from '@/components/layout/AppHeader'

export function AgendaWrapper() {
  const { isOpen, days, isLoadingGcal, gcalError, isGcalConnected, open, close } = useAgenda()

  return (
    <>
      <AppHeader onAgendaOpen={open} />
      <AgendaPanel
        isOpen={isOpen}
        days={days}
        isLoadingGcal={isLoadingGcal}
        gcalError={gcalError}
        isGcalConnected={isGcalConnected}
        onClose={close}
      />
    </>
  )
}
