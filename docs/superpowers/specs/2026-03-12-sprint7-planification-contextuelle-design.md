# Sprint 7 — Planification contextuelle

## Objectif

Proposer des créneaux de planification adaptés au contexte de la tâche : les tâches pro pendant les heures de travail, les tâches personnelles en dehors. Ajouter la possibilité de bloquer toute planification pendant des périodes ponctuelles (vacances, congés).

## Décisions de design

- **Trois mécanismes coexistants** : heures de travail (nouveau), contraintes récurrentes (existant), périodes d'exception (nouveau)
- **Heures de travail** : optionnelles — si non configurées, comportement actuel inchangé
- **Contexte de la tâche** : `work` → créneaux pendant les heures de travail, autres contextes → créneaux hors heures de travail
- **Périodes d'exception** : bloquent toute planification (tous contextes) pendant une plage de dates
- **Migration** : les contraintes existantes couvrant les heures de travail restent valides — pas de migration forcée

## Architecture

### Base de données

Nouvelle table `user_work_schedule` (heures de travail récurrentes) :
```sql
create table user_work_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  work_days int[] not null,        -- [1,2,3,4,5] = Lun–Ven (ISO: 1=lundi)
  start_time time not null,        -- ex: 09:00
  end_time time not null,          -- ex: 18:00
  created_at timestamptz default now()
);
-- RLS : user voit uniquement ses lignes
```

Nouvelle table `schedule_exceptions` (périodes ponctuelles) :
```sql
create table schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  label text,                      -- ex: "Vacances été" (optionnel)
  start_date date not null,
  end_date date not null,
  created_at timestamptz default now()
);
-- RLS : user voit uniquement ses lignes
```

### Logique de planification

`findAvailableSlots()` dans `features/schedule/services/slots.service.ts` reçoit un nouveau paramètre `taskContext: ItemContext | undefined`.

**Ordre des filtres appliqués :**

1. **Filtrage exceptions** : aucun créneau dont la date tombe dans une `schedule_exception` active (end_date ≥ aujourd'hui)
2. **Filtrage contextuel** (uniquement si `user_work_schedule` configuré) :
   - Tâche `work` → créneaux dans les `work_days` + plage `start_time`/`end_time`
   - Tâche non-`work` (personal, family, health, admin, home) → créneaux hors plage de travail
   - Pas de schedule configuré → aucun filtrage contextuel (comportement actuel)

### Fichiers

| Fichier | Action | Rôle |
|---------|--------|------|
| `supabase/migrations/007_work_schedule.sql` | Créer | Tables `user_work_schedule` + `schedule_exceptions` + RLS |
| `services/schedule/work-schedule.service.ts` | Créer | CRUD heures de travail + exceptions |
| `features/schedule/services/slots.service.ts` | Modifier | Paramètre `taskContext`, filtrage exceptions + contextuel |
| `types/schedule.ts` | Créer | Types `WorkSchedule`, `ScheduleException` |
| `app/settings/page.tsx` | Modifier | Section "Planification" (heures de travail + exceptions) |
| `components/settings/WorkScheduleForm.tsx` | Créer | Formulaire jours + plage horaire |
| `components/settings/ExceptionsList.tsx` | Créer | Liste + ajout/suppression périodes d'exception |

## UI Paramètres

Nouvelle section "Planification" dans les paramètres utilisateur, après les contraintes récurrentes existantes.

### Heures de travail

- Checkboxes jours de la semaine (Lun–Dim)
- Deux pickers heure : heure de début / heure de fin
- Message d'aide : "Vos tâches pro seront proposées sur ces créneaux, vos autres tâches en dehors"
- Section masquable si non configurée (toggle d'activation)

### Périodes d'exception

- Liste des exceptions futures (les passées sont masquées automatiquement)
- Chaque ligne : label (ou "Sans titre") + plage de dates + bouton supprimer
- Bouton "Ajouter une période" → formulaire inline : date début, date fin, label optionnel
- Aucune limite de nombre

### Contraintes récurrentes (existant)

Conservées sans modification. Exemples d'usage : sport, rdv médical, garde d'enfants.

## Ce qui est hors scope

- Semaines paires/impaires
- Jours fériés automatiques
- Horaires variables selon les jours (ex: mercredi 14h vs autres jours 18h)
- Plusieurs profils d'heures de travail (ex: télétravail vs présentiel)
- Notification avant une période d'exception
