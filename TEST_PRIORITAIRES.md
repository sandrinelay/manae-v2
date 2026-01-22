# 🎯 5 Tests Prioritaires (15 minutes)

Tests critiques pour valider qu'il n'y a **AUCUNE régression** après la modification.

---

## ✅ Test 1 : Jour Exact - "Appeler maman vendredi"

**Objectif** : Vérifier que les jours exacts fonctionnent toujours

### Étapes
1. Mood : Neutre (ou aucun)
2. Capture : `"Appeler maman vendredi"`
3. Clique sur "Caler"

### ✅ Résultat attendu
- Créneaux **UNIQUEMENT vendredi**
- Aucun créneau jeudi ni samedi
- Message : "Moments pratiques pour cette tâche simple"

### ❌ Si échec
Problème : Le flag `isExactDay` ne fonctionne plus correctement

---

## ✅ Test 2 : Plage Horaire - "Appeler ce soir"

**Objectif** : Vérifier les plages horaires

### Étapes
1. Mood : Fatigué
2. Capture : `"Appeler ce soir"`
3. Clique sur "Caler"

### ✅ Résultat attendu
- Créneaux **UNIQUEMENT aujourd'hui 18h-21h**
- Aucun créneau demain
- Message : "Créneaux idéals pour une tâche simple, même fatigué"

### ❌ Si échec
Problème : La détection "ce soir" ne fonctionne plus

---

## ✅ Test 3 : DEADLINE - "Préparer réunion avant vendredi"

**Objectif** : Vérifier la NOUVELLE fonctionnalité

### Étapes
1. Mood : Énergique
2. Capture : `"Préparer la réunion avant vendredi"`
3. Clique sur "Caler"

### ✅ Résultat attendu
- Créneaux **jusqu'à jeudi inclus**
- **AUCUN créneau** vendredi, samedi, dimanche
- Console (F12) : `[temporal-detection] Pattern détecté: avant vendredi → (deadline)`
- Message : "Matinées idéales pour profiter de votre énergie sur cette tâche exigeante"

### ❌ Si échec
Problème : La nouvelle fonctionnalité deadline ne fonctionne pas

---

## ✅ Test 4 : Service + Deadline - "Aller mairie avant jeudi"

**Objectif** : Vérifier que Service + Deadline fonctionnent ensemble

### Étapes
1. Mood : Débordé
2. Capture : `"Aller à la mairie avant jeudi"`
3. Clique sur "Caler"

### ✅ Résultat attendu
- Créneaux **jusqu'à mercredi inclus**
- Filtrés par horaires mairie (**9h-16h30**)
- Message : "Moments propices pour avancer rapidement sur une tâche simple"
- Bonus après pauses (14h-15h30) visible dans les scores

### ❌ Si échec
Problème : Deadline et Service ne cohabitent pas correctement

---

## ✅ Test 5 : Mood + Cognitive - "Analyser rapport lundi"

**Objectif** : Vérifier Mood × Cognitive Load

### Étapes
1. Mood : Fatigué
2. Capture : `"Analyser le rapport financier lundi"`
3. Clique sur "Caler"

### ✅ Résultat attendu
- Créneaux **uniquement lundi**
- Privilégie **10h-16h** (adapté à la fatigue)
- Matinées **9h-12h** avec bonus (complexe)
- Message : "Créneaux adaptés à votre fatigue pour une tâche demandant de la concentration"

### ❌ Si échec
Problème : Le scoring Mood × Cognitive ne fonctionne plus

---

## 🔍 Console à Surveiller (F12)

Ouvre la console du navigateur et cherche :

### Pour Test 1 (Jour exact)
```
[temporal-detection] Pattern détecté: vendredi → 2026-XX-XX (jour exact)
[temporal-detection] Filtrage par jour exact: { ... }
```

### Pour Test 2 (Ce soir)
```
[temporal-detection] Pattern détecté: ce soir → 2026-XX-XX (jour exact)
[temporal-detection] Créneaux après filtrage horaire: X (18:00-21:00)
```

### Pour Test 3 (Deadline)
```
[temporal-detection] Pattern détecté: avant vendredi → 2026-XX-XX (deadline)
[temporal-detection] Filtrage par deadline: { targetDate: '2026-XX-XX', ... }
[temporal-detection] Créneaux après filtrage (deadline): X
```

### Pour Test 4 (Service + Deadline)
```
[temporal-detection] Pattern détecté: avant jeudi → 2026-XX-XX (deadline)
[slots.service] Filtrage service: administrative (9h-16h30)
```

### Pour Test 5 (Mood + Cognitive)
```
[temporal-detection] Pattern détecté: lundi → 2026-XX-XX (jour exact)
[useScheduling] Cognitive load: high
```

---

## 📊 Tableau de Résultats

| Test | Description | Statut | Notes |
|------|-------------|--------|-------|
| 1 | Jour exact | ⬜ | |
| 2 | Plage horaire | ⬜ | |
| 3 | Deadline | ⬜ | |
| 4 | Service + Deadline | ⬜ | |
| 5 | Mood + Cognitive | ⬜ | |

**Légende** :
- ✅ = Passe
- ❌ = Échoue
- ⬜ = Pas encore testé

---

## ✅ Validation Finale

### Si TOUS les 5 tests passent ✅
→ **Aucune dette technique créée**
→ **Modification validée**
→ **Prêt pour production**

### Si 1 test échoue ❌
→ **STOP** : Ne pas merger
→ **Investiguer et corriger**
→ **Re-tester**

---

## ⏱️ Temps Estimé

- **Test 1** : 2 min
- **Test 2** : 2 min
- **Test 3** : 3 min (nouveau, vérifier console)
- **Test 4** : 4 min (combinaison)
- **Test 5** : 4 min (scoring)

**Total** : ~15 minutes

---

## 💡 Conseils

1. **Fais les tests dans l'ordre** (du plus simple au plus complexe)
2. **Ouvre la console (F12)** AVANT de commencer
3. **Prends des captures d'écran** des créneaux proposés
4. **Note les scores** des créneaux pour vérifier le scoring
5. **Vérifie le message d'explication** s'affiche à chaque fois

---

## 🚀 Après les Tests

Si tout passe :
- ✅ Coche la checklist dans `TEST_REGRESSION.md`
- ✅ Commit avec message : `fix: gestion correcte des deadlines "avant [jour]"`
- ✅ Push et merge

Si un test échoue :
- 🔍 Ouvre un issue avec le test qui échoue
- 📝 Détaille le comportement attendu vs observé
- 🐛 Corrige avant de merger
