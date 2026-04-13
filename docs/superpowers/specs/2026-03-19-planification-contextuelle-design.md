# Planification contextuelle — Design

**Goal:** Associer un contexte à chaque contrainte horaire pour que les tâches pro soient planifiées sur les heures pro, et les tâches famille hors des heures pro.

**Architecture:** Ajout d'un champ `context` sur la table `user_constraints` et le type `Constraint`. La logique de filtrage dans `slots.service.ts` est étendue pour ignorer les contraintes dédiées à un autre contexte que la tâche à planifier. L'UI `ConstraintForm` expose ce champ via des pills.

**Tech Stack:** Supabase migration SQL, TypeScript, React (ConstraintForm, ConstraintCard, slots.service.ts, useScheduling.ts)

---

## Section 1 — Données

**Migration Supabase :**
```sql
ALTER TABLE user_constraints
ADD COLUMN context TEXT NOT NULL DEFAULT 'any';
```

Les contraintes existantes héritent de `'any'` → comportement inchangé.

**Type TypeScript mis à jour :**
```typescript
export interface Constraint {
  id: string
  user_id?: string
  name: string
  category: 'work' | 'school' | 'home' | 'sport' | 'social' | 'other'
  context: ItemContext | 'any'  // nouveau — default 'any'
  days: string[]
  start_time: string
  end_time: string
  allow_lunch_break: boolean | null
  created_at?: string
}
```

Valeurs possibles pour `context` : `'any' | 'personal' | 'family' | 'work' | 'health' | 'admin' | 'home'`

---

## Section 2 — Logique de planification

**`slots.service.ts` — nouvelle règle de filtrage :**

```typescript
function constraintBlocks(constraint: Constraint, taskContext?: ItemContext): boolean {
  if (constraint.context === 'any') return true      // comportement actuel
  if (!taskContext) return true                       // pas de contexte → bloque par sécurité
  return constraint.context !== taskContext           // bloque seulement si contexte différent
}
```

**`findAvailableSlots`** reçoit un paramètre optionnel `taskContext?: ItemContext`, extrait du champ `context` de la tâche à planifier.

**`useScheduling.ts`** transmet `taskAnalysis.context` (ou `item.context`) comme `taskContext` lors de l'appel à `findAvailableSlots`.

**Exemple concret :**
- Contrainte "Travail" : lun-ven 9h-18h, `context: 'work'`
- Tâche `family` → contrainte bloque (9h-18h indisponibles)
- Tâche `work` → contrainte ne bloque pas (9h-18h disponibles)
- Contrainte sans contexte (`'any'`) → bloque toujours toutes les tâches

---

## Section 3 — UI

**`ConstraintForm`** — sélecteur de contexte ajouté après le champ "Nom" :

Pills cliquables identiques au sélecteur de jours existant :
```
Cette plage est dédiée à...
[ Toutes les tâches ] [ Pro ] [ Famille ] [ Personnel ] [ Santé ] [ Admin ] [ Maison ]
```
Défaut : "Toutes les tâches" (`'any'`).

**`ConstraintCard`** — affichage discret du contexte si différent de `'any'` :
- Petite mention sous les horaires : "Pro uniquement", "Famille uniquement", etc.
- Rien affiché si `context === 'any'`

---

## Rétrocompatibilité

- Contraintes existantes : `context = 'any'` → comportement identique à aujourd'hui
- Tâches sans contexte : `taskContext = undefined` → toutes les contraintes s'appliquent
- Aucune migration de données applicatives requise
