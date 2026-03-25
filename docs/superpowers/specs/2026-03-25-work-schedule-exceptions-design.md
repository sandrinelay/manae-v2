# Work Schedule & Exceptions — Design Spec

**Date:** 2026-03-25
**Sprint:** 7 — SAN-35, SAN-36, SAN-37
**Status:** Approved

---

## Contexte

La planification contextuelle (filtrage des créneaux par contexte de tâche) est déjà en place. Ce sprint complète le tableau en permettant à l'utilisateur de :
1. Configurer ses plages horaires récurrentes (heures de travail, contraintes) avec une meilleure UX
2. Déclarer des exceptions ponctuelles (congés, journées à horaires réduits) qui bloquent automatiquement la planification

---

## Décisions clés

- **Pas de nouvelle table `user_work_schedule`** — le modèle `constraints` existant (avec `context`) suffit pour les plages récurrentes. On améliore l'UX, pas le modèle.
- **Nouvelle table `schedule_exceptions`** pour les exceptions ponctuelles (nature différente : date-based vs recurring weekdays).
- **UI dans la page profil** — nouvelle section "Mon organisation" avec deux entrées distinctes (plages horaires + exceptions), chacune avec sa propre modale.

---

## Modèle de données

### Table `schedule_exceptions` (nouvelle)

```sql
CREATE TABLE schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  label TEXT NOT NULL,
  type TEXT CHECK (type IN ('blocked', 'modified')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  modified_start_time TEXT,   -- ex: "10:00" — uniquement si type = 'modified'
  modified_end_time TEXT,     -- ex: "15:00"
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own exceptions" ON schedule_exceptions
  FOR ALL USING (auth.uid() = user_id);
```

**Types d'exceptions :**
- `blocked` : toute la plage est bloquée (vacances, congé maladie) — aucun créneau proposé
- `modified` : horaires réduits sur la plage (ex: télétravail partiel, journée light)

---

## Architecture UI

### Changements dans la page profil

Remplacement de l'entrée "Indisponibilités" dans `PreferencesSection` par une section dédiée **"Mon organisation"** avec deux entrées :

1. **Plages horaires** → ouvre `ConstraintsModal` (existante)
   - Bouton "Configurer mes heures pro" → ouvre `ConstraintForm` pré-rempli (lun-ven, 9h-18h, context: work)
2. **Exceptions** → ouvre `ExceptionsModal` (nouvelle)

### Nouveaux composants

```
components/shared/
├── ExceptionsModal.tsx     # Liste des exceptions + bouton ajout + suppression
└── ExceptionForm.tsx       # Formulaire: label, type (blocked/modified), dates, horaires si modified

components/ui/
└── ExceptionCard.tsx       # Affichage d'une exception: label, plage de dates, type
```

### Fichiers modifiés

```
app/(main)/profil/page.tsx              # Section "Mon organisation" + état exceptions
components/shared/ConstraintsModal.tsx  # Renommer "Indisponibilités" → "Plages horaires"
services/schedule-exceptions.service.ts # CRUD exceptions (nouveau)
types/index.ts                          # Type ScheduleException
features/schedule/services/slots.service.ts  # Bloquer créneaux selon exceptions
features/schedule/hooks/useScheduling.ts     # Fetch exceptions + passage à slots service
```

---

## Service `schedule-exceptions.service.ts`

```typescript
export const scheduleExceptionsService = {
  getExceptions: (supabase, userId) => ...,
  createException: (supabase, userId, data) => ...,
  deleteException: (supabase, id) => ...
}
```

---

## Intégration planification

### `slots.service.ts`

`FindSlotsParams` reçoit un nouveau champ `exceptions?: ScheduleException[]`.

Logique dans `findAvailableSlots()` — appliquée avant le scoring :
- **`blocked`** : si `slotDate` est dans `[start_date, end_date]` → créneau supprimé
- **`modified`** : si `slotDate` est dans la plage → `dayBounds` remplacé par `{ start: modified_start_time, end: modified_end_time }`

### `useScheduling.ts`

Fetch des exceptions au même moment que les contraintes (`getExceptions()`), puis passage à `findAvailableSlots()`.

---

## UX — Quick setup heures pro

Le bouton **"Configurer mes heures pro"** dans la section "Mon organisation" ouvre `ConstraintForm` pré-rempli avec :
- Jours : lun, mar, mer, jeu, ven
- Horaires : 09:00 → 18:00
- Contexte : `work`
- Nom : "Heures de travail"

L'utilisateur peut ajuster avant de sauvegarder. Pas de création silencieuse.

---

## Ce qui n'est PAS dans le scope

- Gestion des fuseaux horaires multiples
- Exceptions récurrentes (ex: "chaque premier lundi du mois")
- Import/export depuis Google Calendar
- Notifications de rappel d'exception
