# Voice Capture UX — Plan d'implémentation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la capture vocale en 3 composants à responsabilité unique (RecordButton, RecordingFeedback, VoiceCaptureOverlay) pour remplacer le VoiceButton God component, et afficher un overlay on-page au lieu de rediriger depuis le bouton flottant.

**Architecture:** `VoiceButton.tsx` est supprimé et remplacé par `RecordButton` (interaction hold + slide-to-cancel), `RecordingFeedback` (timer pill), et `VoiceCaptureOverlay` (bottom sheet flottant). `useVoiceCapture`, `voice.service` et `voice.types` restent inchangés. `CaptureFlow` et `VoiceButtonGlobal` utilisent directement `useVoiceCapture` et les nouveaux composants.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Lucide React, useVoiceCapture hook (inchangé)

**Spec:** `docs/superpowers/specs/2026-03-10-voice-capture-ux-design.md`

---

## Fichiers touchés

| Action | Fichier | Rôle |
|--------|---------|------|
| Créer | `features/voice/components/RecordButton.tsx` | Bouton hold-to-record avec slide-to-cancel |
| Créer | `features/voice/components/RecordingFeedback.tsx` | Timer pill pendant l'enregistrement |
| Créer | `features/voice/components/VoiceCaptureOverlay.tsx` | Bottom sheet transcript pour le bouton flottant |
| Modifier | `features/voice/components/VoiceButtonGlobal.tsx` | Orchestration avec les nouveaux composants |
| Modifier | `features/capture/components/CaptureFlow.tsx` | Remplacer VoiceButton inline + supprimer localStorage useEffect |
| Supprimer | `features/voice/components/VoiceButton.tsx` | God component remplacé |

**Inchangés :** `useVoiceCapture.ts`, `voice.service.ts`, `voice.types.ts`

---

## Chunk 1 — RecordButton + RecordingFeedback

### Task 1 : RecordButton.tsx

**Fichiers :**
- Créer : `features/voice/components/RecordButton.tsx`

**Interface :**
```typescript
interface RecordButtonProps {
  state: VoiceState           // depuis useVoiceCapture
  onStart: () => void
  onStop: () => void
  onCancel: () => void
  size?: 'sm' | 'lg'          // 'sm' = inline, 'lg' = flottant
  className?: string
}
```

**Comportement hold + slide-to-cancel :**
- `pointerdown` → setTimeout 200ms → `onStart()`
- `pointerup` (si recording) → `onStop()`
- `pointermove` (si recording, déplacement X < -50px) → `isCancelling = true`
- `pointerup` (si `isCancelling`) → `onCancel()` au lieu de `onStop()`
- `pointerleave` (si recording) → `onStop()`
- Clic court (< 200ms) : ignoré silencieusement

**États visuels :**
- `idle` : bouton primaire, `Mic`
- `recording` + !isCancelling : rouge pulse, `MicOff`
- `recording` + isCancelling : gris, label "Relâcher pour annuler"
- `processing` : primaire opaque, spinner
- `error` : primaire, `Mic` (clearError géré par le parent)

- [ ] **Étape 1 : Créer le composant**

```tsx
'use client'

import { useRef, useState } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import type { VoiceState } from '../types/voice.types'

interface RecordButtonProps {
  state: VoiceState
  onStart: () => void
  onStop: () => void
  onCancel: () => void
  size?: 'sm' | 'lg'
  className?: string
}

export function RecordButton({ state, onStart, onStop, onCancel, size = 'sm', className = '' }: RecordButtonProps) {
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressRef = useRef(false)
  const startXRef = useRef<number>(0)
  const [isCancelling, setIsCancelling] = useState(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (state !== 'idle' && state !== 'error') return
    isLongPressRef.current = false
    startXRef.current = e.clientX
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onStart()
    }, 200)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isLongPressRef.current || state !== 'recording') return
    const deltaX = e.clientX - startXRef.current
    setIsCancelling(deltaX < -50)
  }

  const handlePointerUp = async () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    if (isLongPressRef.current && state === 'recording') {
      if (isCancelling) {
        setIsCancelling(false)
        onCancel()
      } else {
        onStop()
      }
      setTimeout(() => { isLongPressRef.current = false }, 50)
    }
  }

  const handlePointerLeave = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    if (isLongPressRef.current && state === 'recording') {
      isLongPressRef.current = false
      setIsCancelling(false)
      onStop()
    }
  }

  const handleClick = () => {
    if (isLongPressRef.current) return
    // Clic court ignoré silencieusement
  }

  const sizeClass = size === 'lg' ? 'w-14 h-14' : 'w-10 h-10'

  const colorClass = isCancelling
    ? 'bg-gray-400 text-white'
    : state === 'recording'
    ? 'bg-red-500 text-white animate-pulse'
    : state === 'processing'
    ? 'bg-[var(--color-primary)] text-white opacity-70 cursor-not-allowed'
    : 'bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-95'

  return (
    <button
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      disabled={state === 'processing'}
      aria-label={
        isCancelling ? 'Relâcher pour annuler'
        : state === 'idle' ? 'Démarrer la capture vocale'
        : state === 'recording' ? 'Relâcher pour arrêter'
        : state === 'processing' ? 'Transcription en cours'
        : 'Capture vocale'
      }
      className={[
        'flex items-center justify-center rounded-full transition-all duration-200 touch-none select-none',
        sizeClass,
        colorClass,
        className,
      ].join(' ')}
    >
      {state === 'processing' ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : state === 'recording' ? (
        <MicOff className="w-6 h-6" />
      ) : (
        <Mic className="w-6 h-6" />
      )}
    </button>
  )
}
```

- [ ] **Étape 2 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "RecordButton"
```
Attendu : aucune erreur sur ce fichier.

- [ ] **Étape 3 : Commit**

```bash
git add features/voice/components/RecordButton.tsx
git commit -m "feat(voice): add RecordButton with hold and slide-to-cancel"
```

---

### Task 2 : RecordingFeedback.tsx

**Fichiers :**
- Créer : `features/voice/components/RecordingFeedback.tsx`

**Interface :**
```typescript
interface RecordingFeedbackProps {
  recordingTime: number    // secondes depuis useVoiceCapture
  isCancelling?: boolean   // affiche "Relâcher pour annuler" en rouge
  onCancel: () => void
  className?: string
}
```

**Rendu :** pill avec point rouge pulsant + timer MM:SS + bouton ✕. Si `isCancelling`, fond gris + texte "Relâcher pour annuler".

- [ ] **Étape 1 : Créer le composant**

```tsx
'use client'

import { X } from 'lucide-react'

interface RecordingFeedbackProps {
  recordingTime: number
  isCancelling?: boolean
  onCancel: () => void
  className?: string
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function RecordingFeedback({ recordingTime, isCancelling = false, onCancel, className = '' }: RecordingFeedbackProps) {
  if (isCancelling) {
    return (
      <div className={['flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-full', className].join(' ')}>
        <span className="text-gray-500 text-sm font-medium">Relâcher pour annuler</span>
      </div>
    )
  }

  return (
    <div className={['flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full', className].join(' ')}>
      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
      <span className="text-red-600 text-sm font-medium">{formatTime(recordingTime)}</span>
      <button
        onClick={onCancel}
        aria-label="Annuler l'enregistrement"
        className="ml-1 text-red-400 hover:text-red-600"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
```

- [ ] **Étape 2 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "RecordingFeedback"
```
Attendu : aucune erreur.

- [ ] **Étape 3 : Commit**

```bash
git add features/voice/components/RecordingFeedback.tsx
git commit -m "feat(voice): add RecordingFeedback timer pill component"
```

---

## Chunk 2 — VoiceCaptureOverlay

### Task 3 : VoiceCaptureOverlay.tsx

**Fichiers :**
- Créer : `features/voice/components/VoiceCaptureOverlay.tsx`

**Interface :**
```typescript
interface VoiceCaptureOverlayProps {
  transcript: string
  onTranscriptChange: (text: string) => void
  onSend: () => Promise<void>   // sauvegarde directe (note sans IA)
  onEdit: () => void             // redirect /capture avec transcript
  onClose: () => void            // fermer sans sauvegarder
}
```

**Comportement :**
- Bottom sheet fixe en bas de l'écran, z-50
- Backdrop semi-transparent, clic dessus → `onClose()`
- Textarea éditable avec le transcript
- 3 boutons : "Envoyer" (primary), "Modifier dans Capture" (secondary), ✕ (fermer)
- "Envoyer" : appelle `onSend()`, gère l'état loading pendant la sauvegarde
- Slide down (swipe bas > 80px) → `onClose()`

- [ ] **Étape 1 : Créer le composant**

```tsx
'use client'

import { useState, useRef } from 'react'
import { X, Send, Edit3, Loader2 } from 'lucide-react'

interface VoiceCaptureOverlayProps {
  transcript: string
  onTranscriptChange: (text: string) => void
  onSend: () => Promise<void>
  onEdit: () => void
  onClose: () => void
}

export function VoiceCaptureOverlay({ transcript, onTranscriptChange, onSend, onEdit, onClose }: VoiceCaptureOverlayProps) {
  const [isSending, setIsSending] = useState(false)
  const startYRef = useRef<number>(0)

  const handleSend = async () => {
    setIsSending(true)
    try {
      await onSend()
    } finally {
      setIsSending(false)
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    startYRef.current = e.clientY
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.clientY - startYRef.current > 80) onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl p-5 pb-8"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-[var(--color-text-muted)]">Retranscription — tu peux corriger :</p>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-dark)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transcript éditable */}
        <textarea
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          rows={3}
          autoFocus
          className="w-full text-[var(--color-text-dark)] text-sm leading-relaxed border border-[var(--color-border)] rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] mb-4"
        />

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSend}
            disabled={isSending || !transcript.trim()}
            aria-label="Envoyer comme note"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Envoyer
          </button>
          <button
            onClick={onEdit}
            aria-label="Modifier dans la page Capture"
            className="flex items-center justify-center gap-2 w-full py-3 border border-[var(--color-border)] text-[var(--color-text-dark)] text-sm rounded-xl hover:bg-gray-50"
          >
            <Edit3 className="w-4 h-4" />
            Modifier dans Capture
          </button>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Étape 2 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "VoiceCaptureOverlay"
```
Attendu : aucune erreur.

- [ ] **Étape 3 : Commit**

```bash
git add features/voice/components/VoiceCaptureOverlay.tsx
git commit -m "feat(voice): add VoiceCaptureOverlay bottom sheet"
```

---

## Chunk 3 — Intégration

### Task 4 : Mettre à jour VoiceButtonGlobal.tsx

**Fichiers :**
- Modifier : `features/voice/components/VoiceButtonGlobal.tsx`

**Changements :**
1. Importer `useVoiceCapture` directement
2. Importer `useAuth` pour avoir `userId`
3. Remplacer `VoiceButton` par `RecordButton` + `RecordingFeedback` + `VoiceCaptureOverlay`
4. Supprimer la logique `localStorage` + `router.push('/capture')`
5. Pour "Envoyer" : appeler `saveItem({ userId, type: 'note', content: transcript, state: 'active' })`
6. Pour "Modifier" : redirect `/capture?voice=${encodeURIComponent(transcript)}`

**Note sur le redirect "Modifier" :** On passe le transcript en query param plutôt que via localStorage — plus propre. `CaptureFlow` doit lire ce param (voir Task 5).

- [ ] **Étape 1 : Réécrire VoiceButtonGlobal.tsx**

```tsx
'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useVoiceCapture } from '../hooks/useVoiceCapture'
import { saveItem } from '@/services/capture'
import { RecordButton } from './RecordButton'
import { RecordingFeedback } from './RecordingFeedback'
import { VoiceCaptureOverlay } from './VoiceCaptureOverlay'

const HIDDEN_ROUTES = ['/capture', '/login', '/signup', '/onboarding', '/set-password', '/forgot-password']

export function VoiceButtonGlobal() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [localTranscript, setLocalTranscript] = useState('')

  const { state, transcript, recordingTime, startRecording, stopRecording, cancelRecording, clearError, setTranscript } = useVoiceCapture({
    onTranscript: (text) => setLocalTranscript(text),
  })

  if (isLoading || !user) return null
  if (HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) return null

  const handleSend = async () => {
    await saveItem({
      userId: user.id,
      type: 'note',
      content: localTranscript,
      state: 'active',
    })
    clearError()
    setLocalTranscript('')
  }

  const handleEdit = () => {
    router.push(`/capture?voice=${encodeURIComponent(localTranscript)}`)
    setLocalTranscript('')
  }

  const handleClose = () => {
    setLocalTranscript('')
    clearError()
  }

  // Synchronise le transcript local avec le hook quand on est en preview
  const currentTranscript = state === 'preview' ? (transcript ?? localTranscript) : localTranscript

  return (
    <>
      {/* Bouton flottant */}
      <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
        {state === 'recording' && (
          <RecordingFeedback
            recordingTime={recordingTime}
            onCancel={cancelRecording}
          />
        )}
        <RecordButton
          state={state}
          onStart={startRecording}
          onStop={stopRecording}
          onCancel={cancelRecording}
          size="lg"
          className="shadow-lg"
        />
      </div>

      {/* Overlay transcript */}
      {state === 'preview' && (
        <VoiceCaptureOverlay
          transcript={currentTranscript}
          onTranscriptChange={(text) => { setLocalTranscript(text); setTranscript(text) }}
          onSend={handleSend}
          onEdit={handleEdit}
          onClose={handleClose}
        />
      )}
    </>
  )
}
```

- [ ] **Étape 2 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "VoiceButtonGlobal|RecordButton|VoiceCaptureOverlay"
```
Attendu : aucune erreur.

- [ ] **Étape 3 : Commit**

```bash
git add features/voice/components/VoiceButtonGlobal.tsx
git commit -m "feat(voice): refactor VoiceButtonGlobal with overlay instead of redirect"
```

---

### Task 5 : Mettre à jour CaptureFlow.tsx

**Fichiers :**
- Modifier : `features/capture/components/CaptureFlow.tsx`

**Changements :**
1. Remplacer l'import `VoiceButton` par `RecordButton` + `RecordingFeedback`
2. Ajouter `useVoiceCapture` directement dans le composant
3. Supprimer le `useEffect` localStorage (lignes 122-130 actuelles)
4. Ajouter la lecture du query param `voice` (redirect depuis "Modifier dans Capture")
5. Appliquer le wash `bg-black/5` sur la card principale quand `state === 'recording'`
6. L'`onTranscript` callback ne fait que `setContent(text)` — pas d'auto-trigger

- [ ] **Étape 1 : Modifier les imports**

Dans `CaptureFlow.tsx`, remplacer :
```typescript
import { VoiceButton } from '@/features/voice/components/VoiceButton'
```
Par :
```typescript
import { useVoiceCapture } from '@/features/voice/hooks/useVoiceCapture'
import { RecordButton } from '@/features/voice/components/RecordButton'
import { RecordingFeedback } from '@/features/voice/components/RecordingFeedback'
```

- [ ] **Étape 2 : Ajouter le hook et lire le query param `voice`**

Après `const searchParams = useSearchParams()`, ajouter :

```typescript
const { state: voiceState, recordingTime, startRecording, stopRecording, cancelRecording } = useVoiceCapture({
  onTranscript: (text) => setContent(text),
})
```

Dans le `useEffect` existant sur `searchParams` (celui qui gère `resumePlanning`), ajouter la lecture du param `voice` :

```typescript
// Lecture du transcript passé depuis VoiceButtonGlobal ("Modifier dans Capture")
const voiceParam = searchParams.get('voice')
if (voiceParam) {
  setContent(decodeURIComponent(voiceParam))
  const url = new URL(window.location.href)
  url.searchParams.delete('voice')
  window.history.replaceState({}, '', url.pathname)
}
```

- [ ] **Étape 3 : Supprimer le useEffect localStorage**

Supprimer complètement ces lignes (useEffect des lignes 122-130) :

```typescript
// Récupérer un transcript vocal venant du bouton flottant (autres pages)
useEffect(() => {
  const pendingTranscript = localStorage.getItem('manae_voice_transcript')
  if (pendingTranscript) {
    localStorage.removeItem('manae_voice_transcript')
    setContent(pendingTranscript)
    handleCapture(pendingTranscript)
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

- [ ] **Étape 4 : Remplacer le bloc VoiceButton inline dans le JSX**

Remplacer :
```tsx
{/* Bouton micro inline dans la card */}
<div className="flex justify-end mt-3">
  <VoiceButton
    variant="inline"
    onTranscript={(text) => {
      setContent(text)
      handleCapture(text)
    }}
  />
</div>
```

Par :
```tsx
{/* Bouton micro inline dans la card */}
<div className="flex items-center justify-end gap-3 mt-3">
  {voiceState === 'recording' && (
    <RecordingFeedback
      recordingTime={recordingTime}
      onCancel={cancelRecording}
    />
  )}
  <RecordButton
    state={voiceState}
    onStart={startRecording}
    onStop={stopRecording}
    onCancel={cancelRecording}
    size="sm"
  />
</div>
```

- [ ] **Étape 5 : Appliquer le wash sur la card principale**

Sur la div card principale (actuellement `className="bg-white rounded-3xl p-5 shadow-sm mb-6"`), ajouter la classe conditionnelle :

```tsx
<div className={[
  'bg-white rounded-3xl p-5 shadow-sm mb-6 transition-colors duration-200',
  voiceState === 'recording' ? 'bg-black/5' : 'bg-white',
].join(' ')}>
```

- [ ] **Étape 6 : Vérifier le build TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "CaptureFlow"
```
Attendu : aucune erreur.

- [ ] **Étape 7 : Commit**

```bash
git add features/capture/components/CaptureFlow.tsx
git commit -m "feat(voice): integrate RecordButton inline in CaptureFlow, remove localStorage bridge"
```

---

### Task 6 : Supprimer VoiceButton.tsx

**Fichiers :**
- Supprimer : `features/voice/components/VoiceButton.tsx`

- [ ] **Étape 1 : Vérifier qu'il n'est plus importé nulle part**

```bash
grep -r "VoiceButton" --include="*.tsx" --include="*.ts" .
```
Attendu : uniquement `VoiceButtonGlobal.tsx` (qui n'importe plus `VoiceButton`).
Si d'autres fichiers apparaissent, les mettre à jour avant de supprimer.

- [ ] **Étape 2 : Supprimer le fichier**

```bash
rm features/voice/components/VoiceButton.tsx
```

- [ ] **Étape 3 : Vérifier le build complet**

```bash
npm run build 2>&1 | tail -20
```
Attendu : build réussi, pas d'erreurs TypeScript.

- [ ] **Étape 4 : Commit**

```bash
git add -A
git commit -m "chore(voice): remove VoiceButton God component"
```

---

## Vérification finale

- [ ] Lancer `npm run dev` et tester sur mobile (DevTools → responsive)
- [ ] Vérifier le bouton inline sur `/capture` : hold → enregistrement (wash visible) → relâcher → transcript dans textarea
- [ ] Vérifier slide-to-cancel inline : hold + glisser gauche → texte "Relâcher pour annuler" → relâcher → rien
- [ ] Vérifier le bouton flottant sur `/clarte` : hold → enregistrement → relâcher → overlay apparaît
- [ ] Vérifier "Envoyer" dans l'overlay : item sauvegardé sans analyse IA
- [ ] Vérifier "Modifier dans Capture" : redirige vers `/capture` avec transcript pré-rempli
- [ ] Vérifier `npm run lint`
