# Sprint 5 — Agenda Panel Design

## Objectif

Afficher les 7 prochains jours (événements Google Calendar + tâches Manae planifiées) dans un panel accessible depuis le header de toutes les pages. Lecture seule.

## Décisions de design

- **Pas de page dédiée** : un panel global monté dans le layout, invisible par défaut
- **Déclencheur** : icône calendrier dans le header de chaque page
- **Animation** : slide-down depuis le haut (~250ms, CSS transform translateY)
- **Fermeture** : tap backdrop ou swipe vers le haut

## Architecture

### Composants

| Fichier | Rôle |
|---------|------|
| `components/agenda/AgendaPanel.tsx` | Panel complet (7 jours, scroll vertical) |
| `components/agenda/AgendaEvent.tsx` | Ligne d'événement (heure + titre + source) |
| `hooks/useAgenda.ts` | Fetch GCal + tâches planifiées, état ouvert/fermé |

### Fichiers modifiés

- Header existant (toutes pages) — ajout icône calendrier + handler open
- `features/schedule/services/calendar.service.ts` — `getCalendarEvents()` existe déjà, pas de modification

### État global

Un context React léger (ou state hoisted dans le layout) gère `isOpen: boolean`. Pas de store externe.

## Contenu affiché

**Sources fusionnées et triées par heure pour chaque jour :**

1. **Événements Google Calendar** — via `getCalendarEvents(today, today+7)`
   - Affichage : heure début–fin + titre + icône GCal
2. **Tâches Manae planifiées** (`state: 'planned'`, `scheduled_at` non null)
   - Affichage : heure + titre + icône Manae + badge contexte coloré

**Organisation :** sections par jour (Aujourd'hui, Demain, Lundi 16 mars…). Jours vides affichés avec "Rien de prévu".

**Fenêtre :** aujourd'hui J+0 → J+6 (7 jours).

## UX

### Panel

- Hauteur : ~70% de l'écran, scrollable verticalement à l'intérieur
- Header du panel : "Agenda — 7 jours" + bouton × fermer
- Backdrop semi-transparent derrière, tap pour fermer

### États

| État | Comportement |
|------|-------------|
| Chargement GCal | Skeleton loader sur les événements GCal, tâches Manae affichées immédiatement |
| Erreur GCal | Tâches Manae seules + message discret "Impossible de charger Google Calendar" |
| Non connecté GCal | Bandeau "Connecter Google Calendar pour voir vos événements", tâches Manae affichées |
| Aucun événement sur un jour | Label "Rien de prévu" |

## Ce qui est hors scope

- Création/modification d'événements depuis le panel
- Navigation semaine/mois
- Autres sources calendrier (Apple, Outlook)
- Notifications ou rappels

## Fichiers à créer

```
components/agenda/
├── AgendaPanel.tsx
└── AgendaEvent.tsx
hooks/
└── useAgenda.ts
```
