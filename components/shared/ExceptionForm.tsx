'use client'

import { useState } from 'react'
import { ActionButton } from '@/components/ui/ActionButton'
import type { ScheduleException, ScheduleExceptionType } from '@/types'

interface ExceptionFormProps {
  onSave: (data: Omit<ScheduleException, 'id' | 'user_id' | 'created_at'>) => void
  onCancel: () => void
}

export function ExceptionForm({ onSave, onCancel }: ExceptionFormProps) {
  const today = new Date().toISOString().split('T')[0]

  const [label, setLabel] = useState('')
  const [type, setType] = useState<ScheduleExceptionType>('blocked')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [modifiedStartTime, setModifiedStartTime] = useState('09:00')
  const [modifiedEndTime, setModifiedEndTime] = useState('13:00')

  const isValid =
    label.trim().length > 0 &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    endDate >= startDate &&
    (type === 'blocked' || (modifiedStartTime < modifiedEndTime))

  const handleSave = () => {
    if (!isValid) return
    onSave({
      label: label.trim(),
      type,
      start_date: startDate,
      end_date: endDate,
      modified_start_time: type === 'modified' ? modifiedStartTime : null,
      modified_end_time: type === 'modified' ? modifiedEndTime : null
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="exception-label" className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
          Nom
        </label>
        <input
          id="exception-label"
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="ex : Vacances d'été, Congé maladie..."
          className="input-field w-full"
        />
      </div>

      <div>
        <p className="text-sm font-medium text-[var(--color-text-dark)] mb-2">Type</p>
        <div className="flex gap-2">
          {([
            { value: 'blocked', label: 'Bloqué (rien planifier)' },
            { value: 'modified', label: 'Horaires réduits' }
          ] as const).map(option => (
            <button
              key={option.value}
              onClick={() => setType(option.value)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-colors ${
                type === option.value
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="exception-start" className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
            Du
          </label>
          <input
            id="exception-start"
            type="date"
            value={startDate}
            onChange={e => {
              setStartDate(e.target.value)
              if (e.target.value > endDate) setEndDate(e.target.value)
            }}
            className="input-field w-full"
          />
        </div>
        <div>
          <label htmlFor="exception-end" className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
            Au
          </label>
          <input
            id="exception-end"
            type="date"
            value={endDate}
            min={startDate}
            onChange={e => setEndDate(e.target.value)}
            className="input-field w-full"
          />
        </div>
      </div>

      {type === 'modified' && (
        <div>
          <p className="text-sm font-medium text-[var(--color-text-dark)] mb-2">Horaires réduits</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exception-modified-start" className="block text-xs text-[var(--color-text-muted)] mb-1">De</label>
              <input
                id="exception-modified-start"
                type="time"
                value={modifiedStartTime}
                onChange={e => setModifiedStartTime(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label htmlFor="exception-modified-end" className="block text-xs text-[var(--color-text-muted)] mb-1">À</label>
              <input
                id="exception-modified-end"
                type="time"
                value={modifiedEndTime}
                onChange={e => setModifiedEndTime(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <ActionButton label="Annuler" variant="secondary" onClick={onCancel} className="flex-1" />
        <ActionButton label="Ajouter" variant="plan" onClick={handleSave} disabled={!isValid} className="flex-1" />
      </div>
    </div>
  )
}
