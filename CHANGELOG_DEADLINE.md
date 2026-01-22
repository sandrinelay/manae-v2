# 🔧 Correction : Gestion des Deadlines

## 📋 Résumé

Correction du filtrage des créneaux pour les contraintes "avant [jour]" (deadlines).

**Avant** : "avant vendredi" proposait des créneaux du lundi au dimanche suivant (fenêtre de ±8 jours)
**Après** : "avant vendredi" propose des créneaux jusqu'au jeudi inclus (dernier jour possible)

## 🎯 Problème résolu

### Comportement incorrect

Pour **"préparer la réunion avant le 7 février"** (un vendredi) :

```
❌ Avant la correction
→ Détecte : 6 février (jeudi)
→ Applique : Fenêtre de 5 jours avant + 3 jours après
→ Propose : 1, 2, 3, 4, 5, 6, 7, 8, 9 février
→ Problème : Propose des créneaux APRÈS la deadline !
```

### Comportement correct

```
✅ Après la correction
→ Détecte : 6 février (jeudi) + flag isDeadline=true
→ Applique : Tous les créneaux <= 6 février
→ Propose : 3, 4, 5, 6 février uniquement
→ Résultat : Respecte la deadline !
```

## 📝 Modifications techniques

### 1. Interface `DetectedTemporalConstraint`
**Fichier** : `features/schedule/utils/temporal-detection.ts:75`

```typescript
export interface DetectedTemporalConstraint {
  targetDate: Date
  pattern: string
  isWeekday: boolean
  isExactDay: boolean
  isStartOfPeriod: boolean
  isWeekend: boolean
  isDeadline: boolean  // ← AJOUTÉ
  timeRange: { start: string; end: string } | null
}
```

### 2. Interface `SearchRange`
**Fichier** : `features/schedule/utils/temporal-detection.ts:86`

```typescript
export interface SearchRange {
  startDate: Date
  endDate: Date
  daysRange: number
  targetDate: Date | null
  isWeekday: boolean
  isExactDay: boolean
  isStartOfPeriod: boolean
  isWeekend: boolean
  isDeadline: boolean  // ← AJOUTÉ
  timeRange: { start: string; end: string } | null
}
```

### 3. Pattern de détection
**Fichier** : `features/schedule/utils/temporal-detection.ts:267`

```typescript
// "avant lundi", "avant vendredi", etc. → deadline
{
  pattern: new RegExp(`avant\\s+(${weekdayPattern})`, 'i'),
  getDate: (match) => {
    const targetDay = getNextWeekday(match[1], today, false)
    if (targetDay) {
      targetDay.setDate(targetDay.getDate() - 1)
    }
    return targetDay
  },
  isExactDay: false,
  isDeadline: true  // ← AJOUTÉ
}
```

### 4. Fonction `detectTemporalConstraintFromText`
**Fichier** : `features/schedule/utils/temporal-detection.ts:415`

```typescript
// Extraire isDeadline du pattern
for (const { pattern, getDate, isExactDay, isStartOfPeriod, isWeekend, isDeadline } of patterns) {
  // ...
  return {
    targetDate,
    pattern: match[0],
    isWeekday,
    isExactDay: isExactDay || false,
    isStartOfPeriod: isStartOfPeriod || false,
    isWeekend: isWeekend || false,
    isDeadline: isDeadline || false,  // ← AJOUTÉ
    timeRange
  }
}
```

### 5. Fonction `calculateSearchRange`
**Fichier** : `features/schedule/utils/temporal-detection.ts:477`

```typescript
let isDeadline = false  // ← AJOUTÉ

const detected = detectTemporalConstraintFromText(taskContent, today)
if (detected) {
  // ...
  isDeadline = detected.isDeadline  // ← AJOUTÉ
  // ...
}

return { startDate, endDate, daysRange, targetDate, isWeekday, isExactDay, isStartOfPeriod, isWeekend, isDeadline, timeRange }
```

### 6. Fonction `filterSlotsByTargetDate`
**Fichier** : `features/schedule/utils/temporal-detection.ts:523`

**Signature modifiée** :
```typescript
export function filterSlotsByTargetDate(
  slots: TimeSlot[],
  targetDate: Date | null,
  isExactDay: boolean,
  isStartOfPeriod: boolean,
  isWeekend: boolean,
  isDeadline: boolean,  // ← AJOUTÉ
  timeRange: { start: string; end: string } | null
): TimeSlot[] {
```

**Logique de filtrage** :
```typescript
if (isWeekend) {
  // Week-end : samedi + dimanche
  filtered = slots.filter(slot => slot.date === saturdayStr || slot.date === sundayStr)
} else if (isDeadline) {  // ← AJOUTÉ
  // Deadline : tous les créneaux jusqu'à cette date (incluse)
  filtered = slots.filter(slot => slot.date <= targetDateStr)
} else if (isExactDay) {
  // Jour exact : uniquement ce jour
  filtered = slots.filter(slot => slot.date === targetDateStr)
} else {
  // Période : fenêtre autour de la date
  // ...
}
```

### 7. Hook `useScheduling`
**Fichier** : `features/schedule/hooks/useScheduling.ts:168`

**Extraction** :
```typescript
const { startDate, endDate, daysRange, targetDate, isExactDay, isStartOfPeriod, isWeekend, isDeadline, timeRange } = calculateSearchRange(taskContent, temporalConstraint)
```

**Appel du filtre** :
```typescript
const slotsForTarget = filterSlotsByTargetDate(
  result.slots,
  targetDate,
  isExactDay,
  isStartOfPeriod,
  isWeekend,
  isDeadline,  // ← AJOUTÉ
  timeRange
)
```

## 🧪 Tests

### Exemples à tester

1. **"Préparer la réunion avant vendredi"**
   - ✅ Créneaux jusqu'à jeudi inclus
   - ❌ Aucun créneau vendredi ou après

2. **"Appeler le médecin avant mercredi"**
   - ✅ Créneaux jusqu'à mardi inclus
   - ✅ Filtrage service médical appliqué (Lun-Ven 9h-18h)

3. **"Finir le dossier avant lundi prochain"**
   - ✅ Créneaux jusqu'à dimanche inclus
   - ✅ Plusieurs jours disponibles

## 📊 Impact

### Fichiers modifiés
- ✅ `features/schedule/utils/temporal-detection.ts` (6 modifications)
- ✅ `features/schedule/hooks/useScheduling.ts` (2 modifications)

### Fichiers créés
- 📄 `TEST_DEADLINE.md` - Guide de test
- 📄 `CHANGELOG_DEADLINE.md` - Ce fichier

### Rétrocompatibilité
✅ **Aucun breaking change**
- Les contraintes existantes (jour exact, week-end, période) fonctionnent toujours
- Seul le comportement des deadlines ("avant [jour]") est corrigé
- Pas d'impact sur les autres fonctionnalités

## 🔍 Vérification

### Compilation TypeScript
```bash
npx tsc --noEmit
```
✅ Aucune erreur

### Tests manuels
Suivre le guide dans [TEST_DEADLINE.md](./TEST_DEADLINE.md)

### Logs de console
Vérifier la présence de :
```
[temporal-detection] Pattern détecté: avant vendredi → 2026-02-06 (deadline)
[temporal-detection] Filtrage par deadline: { targetDate: '2026-02-06', ... }
```

## ✅ Validation

- [x] TypeScript compile sans erreur
- [x] Aucun breaking change
- [x] Logs de détection corrects
- [x] Logique de filtrage implémentée
- [x] Documentation créée (TEST_DEADLINE.md)
- [x] Changelog créé (ce fichier)

## 📅 Date

**Implémenté le** : 22 janvier 2026
**Version** : manae-v2
