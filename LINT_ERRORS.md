# Erreurs ESLint - Manae V2

> Mis à jour le 31/12/2024 - **34 problèmes** (0 erreurs, 34 warnings)

---

## ✅ TOUTES LES ERREURS ONT ÉTÉ CORRIGÉES !

Le projet ne contient plus aucune erreur ESLint. Il reste uniquement 34 warnings (principalement des variables non utilisées).

---

## 🟡 WARNINGS RESTANTS (34)

### 1. Variables/imports non utilisés (30 warnings)

Code mort qui alourdit le bundle.

| Fichier | Variables non utilisées |
|---------|------------------------|
| `app/api/analyze-v2/route.ts` | `parseError` |
| `app/api/analyze/route.ts` | `parseError` |
| `app/api/develop-idea/route.ts` | `parseError` |
| `app/onboarding/layout.tsx` | `useEffect`, `useState` |
| `app/onboarding/page.tsx` | `EMAIL_REGEX` |
| `components/capture/CaptureInput.tsx` | `useState` |
| `components/capture/VoiceRecorder.tsx` | `audioBlob` |
| `components/clarte/blocks/ShoppingBlock.tsx` | `onPlanShopping` |
| `components/clarte/cards/TaskCard.tsx` | `isClickable` |
| `components/clarte/views/TasksFullView.tsx` | `isLoading` |
| `components/onboarding/header.tsx` | `useRouter` |
| `components/ui/ConstraintCard.tsx` | `categoryInfo` |
| `components/ui/FilterTabs.tsx` | `count` |
| `features/capture/components/CaptureFlow.tsx` | `MicrophoneIcon`, `CameraIcon` |
| `features/capture/components/CaptureModal.tsx` | `ReactNode`, `showSuccessModal` |
| `features/ideas/components/IdeaDevelopPanel.tsx` | `itemContent` |
| `features/schedule/services/slots.service.ts` | `DAY_MAP` |
| `hooks/useItems.ts` | `ItemType`, `getCapturedItems`, `getActiveItems`, `getPlannedItems`, `getChildItems`, `markItemActive`, `markItemCompleted`, `markItemArchived` |
| `services/ai/analysis.service.ts` | `AIAnalysis`, `TemporalConstraint` |

**Solution** : Supprimer les imports/variables non utilisés ou les préfixer avec `_` si intentionnellement ignorés.

---

### 2. Dépendances manquantes dans useEffect (4 warnings)

Le tableau de dépendances est incomplet, risque de bugs subtils.

| Fichier | Ligne | Dépendances manquantes |
|---------|-------|----------------------|
| `components/clarte/modals/PlanTaskModal.tsx` | 43 | `scheduling` |
| `features/capture/components/CaptureModal.tsx` | 169 | `scheduling` |
| `features/schedule/hooks/useScheduling.ts` | 113 | `loadSlotsInternal`, `slotsLoaded` |
| `hooks/useItems.ts` | 249 | `initialFilters`, `loadItems` |

**Solution** : Ajouter les dépendances manquantes ou utiliser `useCallback` pour stabiliser les fonctions.

---

## 📊 Synthèse

| Priorité | Type | Nb | Status |
|----------|------|---:|--------|
| 🟡 **Basse** | Variables non utilisées | 30 | Warning - à nettoyer |
| 🟡 **Basse** | Dépendances useEffect | 4 | Warning - à surveiller |

---

## 🛠️ Commandes utiles

```bash
# Lancer le linter
npm run lint

# Corriger automatiquement ce qui peut l'être
npm run lint -- --fix

# Voir uniquement les erreurs (pas les warnings)
npm run lint -- --quiet
```

---

## ✅ Erreurs corrigées (historique)

### Session du 31/12/2024

| Catégorie | Fichiers corrigés | Correction appliquée |
|-----------|-------------------|---------------------|
| **setState dans useEffect (6)** | `app/page.tsx`, `components/layout/Header.tsx`, `components/ui/ConflictModal.tsx`, `components/ui/ConstraintForm.tsx`, `components/ui/DeleteConfirmModal.tsx`, `hooks/useGoogleCalendarStatus.ts` | Utilisation de `useSyncExternalStore` pour localStorage |
| **Fonctions impures (2)** | `components/capture/VoiceRecorder.tsx`, `features/schedule/components/TimeSlotCard.tsx` | `useMemo` + `useCallback` pour isoler les appels `Date.now()` |
| **Apostrophes/guillemets (35)** | 12 fichiers | Remplacement par `&apos;` et `&quot;` |
| **Utilisation de `any` (2)** | `features/schedule/services/calendar.service.ts` | Création du type `GoogleCalendarRawEvent` |
| **let au lieu de const (1)** | `app/api/analyze-v2/route.ts` | `let type` → `const type` |
| **Autres** | `app/clarte/page.tsx`, modales clarte | `requestAnimationFrame`, `aria-label`, ordre des fonctions |

### Progression des erreurs

```
83 problèmes (48 erreurs, 35 warnings)  → Initial
78 problèmes                            → Après setState fixes
76 problèmes                            → Après nettoyage imports
74 problèmes                            → Après fonctions impures
37 problèmes                            → Après apostrophes/guillemets
35 problèmes                            → Après any → types
34 problèmes (0 erreurs, 34 warnings)   → Après let → const ✅
```
