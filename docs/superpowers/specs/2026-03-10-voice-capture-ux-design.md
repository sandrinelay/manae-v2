# Design — Capture vocale tap-and-hold (refonte UX)

Date : 2026-03-10
Statut : Approuvé

---

## Contexte

L'app dispose déjà d'un `VoiceButton` avec long press, mais le composant cumule trop de responsabilités (180 lignes, 2 variants, 5 états, logique overlay). Le comportement flottant redirige vers `/capture` via `localStorage`, ce qui est une friction inutile.

Objectif : meilleure UX tap-and-hold + mini-overlay sur place pour le bouton flottant, sans casser le flux de capture existant.

---

## Décisions de conception

| Décision | Choix |
|----------|-------|
| Post-transcription | Transcript dans la textarea, validation manuelle par l'utilisateur |
| Périmètre | Inline (page capture) + bouton flottant (toutes pages) |
| Feedback enregistrement | Bouton pulse + agrandissement + wash fond de carte (`bg-black/5`) |
| Bouton flottant | Mini-overlay (bottom sheet) sur la page courante — pas de redirect |

---

## Architecture

```
features/voice/
├── components/
│   ├── RecordButton.tsx          # Bouton hold-to-record, émet onStart/onStop
│   ├── RecordingFeedback.tsx     # Feedback visuel (pulse, wash, timer)
│   ├── VoiceCaptureOverlay.tsx   # Bottom sheet flottant (transcript + actions)
│   └── VoiceButtonGlobal.tsx     # Wrapper de positionnement flottant (inchangé)
├── hooks/
│   └── useVoiceCapture.ts        # Inchangé
├── services/
│   └── voice.service.ts          # Inchangé
└── types/
    └── voice.types.ts            # Inchangé
```

**Supprimé :** `VoiceButton.tsx` — remplacé par `RecordButton` + `RecordingFeedback`.

### Responsabilités

| Composant | Fait | Ne fait pas |
|-----------|------|-------------|
| `RecordButton` | Gère le hold (pointerdown/up/leave), émet `onStart`/`onStop`, slide-to-cancel | Ne sait pas ce qu'on fait du son |
| `RecordingFeedback` | Pulse, wash fond de carte, timer discret | Ne gère pas l'audio |
| `VoiceCaptureOverlay` | Affiche transcript éditable, 3 actions | Ne fait pas l'enregistrement |
| `VoiceButtonGlobal` | Positionne le bouton flottant, orchestre overlay | Ne touche pas à CaptureFlow |

---

## États UX

### Bouton inline (page `/capture`)

```
idle → [hold ≥200ms] → recording → [release] → processing → preview (textarea remplie)
                            ↑
                    [slide gauche]
                        cancelled
```

- **idle** : bouton micro, couleur primaire
- **recording** : bouton pulse + grandit, fond de carte `bg-black/5`, timer discret
- **processing** : spinner, bouton désactivé
- **preview** : transcript dans la textarea, curseur en fin de texte — l'utilisateur édite puis clique "Je dépose" normalement

**Gesture d'annulation :** glisser vers la gauche pendant le hold → bouton devient gris + label "Relâcher pour annuler" → release = cancelled sans transcription.

### Bouton flottant (autres pages)

```
idle → [hold ≥200ms] → recording → [release] → processing → VoiceCaptureOverlay
                                                                      ↓
                                                  [Envoyer]        → saveItem() direct (type: note)
                                                  [Modifier]       → redirect /capture avec transcript
                                                  [✕]              → fermer, transcript perdu
```

- **VoiceCaptureOverlay** : bottom sheet qui remonte depuis le bas
- **Envoyer** : sauvegarde directe sans analyse IA (type `note`, contexte `personal` par défaut) — capture rapide
- **Modifier dans Capture** : redirect vers `/capture` avec transcript pré-rempli pour passer par l'analyse IA complète
- **✕** : ferme l'overlay sans sauvegarder

---

## Gestion des erreurs

| Situation | Comportement |
|-----------|-------------|
| Micro refusé | Toast d'erreur discret, bouton reste `idle` |
| Hold < 200ms (tap accidentel) | Ignoré silencieusement |
| Audio trop court (< 1000 bytes) | Message : "Enregistrement trop court, réessaie" |
| Transcription échoue | Message : "Transcription impossible" + bouton réessayer |
| Overlay ouvert + navigation | Overlay se ferme, transcript perdu |

---

## Ce qui reste inchangé

- `useVoiceCapture` — logique d'enregistrement et transcription
- `voice.service` — appel API `/api/transcribe`
- `CaptureFlow` — consomme `RecordButton` en inline comme avant
- Seuil 200ms et validation taille audio
- Flux normal de capture (textarea → "Je dépose" → analyse IA → modal)

---

## Ce qui est supprimé

- Logique `localStorage.manae_voice_transcript` pour le bridge flottant → capture (remplacée par l'overlay)
- `VoiceButton.tsx` (God component)
