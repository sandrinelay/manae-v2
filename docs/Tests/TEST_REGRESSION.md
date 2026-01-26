# 🧪 Tests de Régression - Vérification Dette Technique

Ces tests vérifient que la modification du système de deadline n'a pas cassé les fonctionnalités existantes.

---

## 📋 Groupe 1 : Contraintes Temporelles (Régression)

### ✅ Test 1.1 : Jour exact - "Appeler maman vendredi"
**Contrainte** : Jour exact (vendredi)
**Mood** : Neutre
**Cognitive Load** : LOW (appeler)

**Résultat attendu** :
- ✅ Créneaux UNIQUEMENT vendredi
- ✅ Pas de créneaux jeudi, samedi
- ✅ Message : "Moments pratiques pour cette tâche simple"

**Vérifier** : `isExactDay=true`, `isDeadline=false`

---

### ✅ Test 1.2 : "Ce soir" - Plage horaire aujourd'hui
**Contrainte** : Aujourd'hui soir (18h-21h)
**Mood** : Fatigué
**Cognitive Load** : LOW

**Résultat attendu** :
- ✅ Créneaux UNIQUEMENT aujourd'hui 18h-21h
- ✅ Pas de créneaux demain
- ✅ Message : "Créneaux idéals pour une tâche simple, même fatigué"

**Vérifier** : `isExactDay=true`, `timeRange={start:'18:00',end:'21:00'}`

---

### ✅ Test 1.3 : "Demain matin" - Jour + Plage
**Contrainte** : Demain matin (8h-12h)
**Mood** : Énergique
**Cognitive Load** : HIGH (réfléchir)

**Résultat attendu** :
- ✅ Créneaux UNIQUEMENT demain 8h-12h
- ✅ Pas d'après-midi
- ✅ Message : "Matinées idéales pour profiter de votre énergie sur cette tâche exigeante"

**Vérifier** : `isExactDay=true`, `timeRange={start:'08:00',end:'12:00'}`

---

### ✅ Test 1.4 : "Ce week-end" - Samedi + Dimanche
**Contrainte** : Week-end (samedi + dimanche)
**Mood** : Calme
**Cognitive Load** : MEDIUM

**Résultat attendu** :
- ✅ Créneaux samedi ET dimanche
- ✅ Pas de vendredi ni lundi
- ✅ Message : "Créneaux calmes pour avancer sereinement"

**Vérifier** : `isWeekend=true`, `isDeadline=false`

---

### ✅ Test 1.5 : "Fin mars" - Période floue
**Contrainte** : Fin de mois (fenêtre ±8 jours)
**Mood** : Neutre
**Cognitive Load** : MEDIUM

**Résultat attendu** :
- ✅ Créneaux 5 jours avant + 3 jours après le 31 mars
- ✅ Fenêtre de dates respectée
- ✅ Message : "Créneaux disponibles adaptés à votre planning"

**Vérifier** : `isExactDay=false`, `isDeadline=false`, `isStartOfPeriod=false`

---

## 🏥 Groupe 2 : Services + Contraintes (Régression)

### ✅ Test 2.1 : Service médical - "Aller chez le dentiste mardi"
**Service** : Médical (Lun-Ven 9h-18h)
**Contrainte** : Mardi (jour exact)
**Mood** : Neutre
**Cognitive Load** : LOW

**Résultat attendu** :
- ✅ Créneaux UNIQUEMENT mardi 9h-18h
- ✅ Pas avant 9h ni après 18h
- ✅ Filtrage service appliqué

**Vérifier** : Jour exact + service médical fonctionnent ensemble

---

### ✅ Test 2.2 : Service + Deadline - "Aller à la mairie avant jeudi"
**Service** : Administratif (Lun-Sam 9h-16h30)
**Contrainte** : Avant jeudi (deadline mercredi)
**Mood** : Débordé
**Cognitive Load** : LOW

**Résultat attendu** :
- ✅ Créneaux jusqu'à mercredi inclus
- ✅ Filtrés par horaires mairie (9h-16h30)
- ✅ Bonus après pauses (14h-15h30)
- ✅ Message : "Moments propices pour avancer rapidement sur une tâche simple"

**Vérifier** : Deadline + Service + Mood fonctionnent ensemble

---

### ✅ Test 2.3 : Service commercial + Week-end
**Service** : Commercial (Lun-Sam 9h-19h)
**Contrainte** : Ce week-end
**Mood** : Neutre
**Cognitive Load** : LOW (courses)

**Résultat attendu** :
- ✅ Créneaux UNIQUEMENT samedi 9h-19h
- ❌ Pas dimanche (commerces fermés)
- ✅ Message "service_closed" si 0 créneaux ou proposition samedi

**Vérifier** : Week-end + Service commercial = samedi uniquement

---

## 🧠 Groupe 3 : Mood × Cognitive (Régression)

### ✅ Test 3.1 : Fatigué + Complexe + Jour exact
**Contrainte** : Lundi prochain (jour exact)
**Mood** : Fatigué
**Cognitive Load** : HIGH (analyser le rapport)

**Résultat attendu** :
- ✅ Créneaux lundi 10h-16h prioritaires
- ✅ Évite avant 9h30 et après 17h
- ✅ Matinées 9h-12h avec bonus compromis
- ✅ Message : "Créneaux adaptés à votre fatigue pour une tâche demandant de la concentration"

**Vérifier** : Mood + Cognitive + Jour exact sans conflit

---

### ✅ Test 3.2 : Énergique + Simple + Deadline
**Contrainte** : Avant vendredi
**Mood** : Énergique
**Cognitive Load** : LOW (envoyer email)

**Résultat attendu** :
- ✅ Créneaux jusqu'à jeudi
- ✅ Matinées privilégiées (énergie)
- ✅ Message : "Moments parfaits pour expédier cette tâche rapidement"

**Vérifier** : Deadline + Mood + Cognitive sans conflit

---

### ✅ Test 3.3 : Débordé + Moyenne + "Ce soir"
**Contrainte** : Ce soir (18h-21h)
**Mood** : Débordé
**Cognitive Load** : MEDIUM

**Résultat attendu** :
- ✅ Créneaux ce soir 18h-21h uniquement
- ✅ Scoring adapté au débordement
- ✅ Message : "Créneaux après vos pauses pour souffler un peu"

**Vérifier** : Plage horaire + Mood fonctionne

---

## ⚡ Groupe 4 : Cas Limites (Edge Cases)

### ✅ Test 4.1 : "Avant lundi" un dimanche soir
**Contexte** : Dimanche 22h
**Contrainte** : Avant lundi (deadline dimanche)
**Résultat attendu** :
- ✅ Aucun créneau disponible (deadline passée)
- ✅ Message d'erreur approprié

---

### ✅ Test 4.2 : "Vendredi soir" un vendredi 20h
**Contexte** : Vendredi 20h
**Contrainte** : Vendredi soir (18h-21h)
**Résultat attendu** :
- ✅ Créneaux 20h-21h uniquement ce soir
- OU ✅ Vendredi prochain 18h-21h

**Vérifier** : Détection plage horaire passée

---

### ✅ Test 4.3 : Pas de contrainte temporelle
**Contrainte** : Aucune
**Mood** : Calme
**Cognitive Load** : HIGH (créer présentation)

**Résultat attendu** :
- ✅ Créneaux sur 7 jours
- ✅ Après-midis 14h-18h privilégiées (calme + complexe)
- ✅ Message : "Après-midis propices pour vous plonger dans cette tâche demandant réflexion"

**Vérifier** : Fonctionnement par défaut sans contrainte

---

### ✅ Test 4.4 : Contrainte + Aucun créneau disponible
**Contrainte** : Avant demain
**Contexte** : Agenda plein jusqu'à demain
**Résultat attendu** :
- ✅ Message "Aucun créneau disponible sur les X prochains jours"
- ✅ Pas d'erreur JavaScript
- ✅ UI ne crash pas

---

## 🔄 Groupe 5 : Patterns Multiples (Priorité)

### ✅ Test 5.1 : "Après-demain" vs "Demain"
**Contrainte** : "Finir après-demain"
**Résultat attendu** :
- ✅ Détecte "après-demain" (pas "demain")
- ✅ Créneaux J+2 uniquement

**Vérifier** : Ordre des patterns respecté

---

### ✅ Test 5.2 : "Ce soir" vs "Ce"
**Contrainte** : "Appeler ce soir"
**Résultat attendu** :
- ✅ Détecte "ce soir" (18h-21h)
- ✅ Pas juste "aujourd'hui"

**Vérifier** : Priorité des patterns spécifiques

---

## 🎯 Groupe 6 : Nouvelle Fonctionnalité (Deadline)

### ✅ Test 6.1 : "Avant vendredi" - Cas nominal
**Contrainte** : Avant vendredi
**Mood** : Énergique
**Cognitive Load** : HIGH

**Résultat attendu** :
- ✅ Créneaux jusqu'à jeudi inclus
- ❌ Aucun créneau vendredi, samedi, dimanche
- ✅ Message d'explication affiché
- ✅ Log console : `(deadline)`

**Vérifier** : Nouvelle fonctionnalité fonctionne

---

### ✅ Test 6.2 : "Avant mercredi" + Service médical
**Service** : Médical
**Contrainte** : Avant mercredi
**Mood** : Fatigué
**Cognitive Load** : LOW

**Résultat attendu** :
- ✅ Créneaux jusqu'à mardi inclus
- ✅ Filtrés par horaires médical (9h-18h)
- ✅ Deadline + Service fonctionnent ensemble

---

### ✅ Test 6.3 : "Avant lundi prochain" - Longue deadline
**Contrainte** : Avant lundi prochain (dans 7 jours)
**Résultat attendu** :
- ✅ Créneaux jusqu'à dimanche inclus
- ✅ Plage étendue à 7+ jours

---

## 🔍 Checklist de Validation Globale

### Architecture & Code
- [ ] TypeScript compile sans erreur
- [ ] Aucun warning ESLint critique
- [ ] Pas de code dupliqué
- [ ] Logs de console cohérents

### Fonctionnalités Existantes
- [ ] Jour exact ("vendredi") fonctionne ✅
- [ ] Plage horaire ("ce soir") fonctionne ✅
- [ ] Week-end fonctionne ✅
- [ ] Période floue ("fin mars") fonctionne ✅
- [ ] Services (médical, admin, commercial) fonctionnent ✅

### Nouvelle Fonctionnalité
- [ ] Deadline ("avant vendredi") fonctionne ✅
- [ ] Flag `isDeadline` correctement détecté ✅
- [ ] Filtrage <= targetDate appliqué ✅
- [ ] Logs montrent "(deadline)" ✅

### Intégrations
- [ ] Deadline + Service fonctionnent ensemble ✅
- [ ] Deadline + Mood fonctionnent ensemble ✅
- [ ] Deadline + Cognitive Load fonctionnent ensemble ✅
- [ ] Message d'explication s'affiche ✅

### Performance
- [ ] Temps de réponse < 1 seconde ✅
- [ ] Pas de calculs inutiles ✅
- [ ] Pas de re-renders excessifs ✅

### UX
- [ ] Messages d'erreur clairs ✅
- [ ] Pas de crash si 0 créneaux ✅
- [ ] UI responsive ✅
- [ ] Message d'explication pertinent ✅

---

## 🐛 Bugs Potentiels à Surveiller

### 1. Confusion entre Deadline et Jour Exact
**Symptôme** : "Avant vendredi" propose uniquement jeudi (au lieu de tous les jours jusqu'à jeudi)
**Cause** : `isExactDay` mal géré
**Vérification** : Logs doivent montrer `(deadline)` pas `(jour exact)`

---

### 2. Fenêtre de Date Incorrecte
**Symptôme** : "Avant vendredi" propose des créneaux après vendredi
**Cause** : Filtrage `<=` mal implémenté
**Vérification** : Aucun créneau avec `date > targetDateStr`

---

### 3. Service + Deadline Conflit
**Symptôme** : "Aller chez le médecin avant jeudi" ne filtre pas par horaires médical
**Cause** : Ordre des filtres
**Vérification** : Créneaux entre 9h-18h seulement

---

### 4. Mood/Cognitive Ignorés avec Deadline
**Symptôme** : Message d'explication ne s'affiche pas avec deadline
**Cause** : `explanation` non généré
**Vérification** : Message contextuel présent

---

### 5. Plage Horaire + Deadline
**Symptôme** : "Avant vendredi matin" ne filtre pas par matin
**Cause** : `timeRange` non appliqué après filtrage deadline
**Vérification** : Créneaux uniquement le matin (8h-12h)

---

## 📊 Résultat Attendu

✅ **25 tests** doivent passer
❌ **0 régression** tolérée
⚠️ **Tout échec** doit être investigué et corrigé

---

## 🎯 Priorisation des Tests

### Priorité 1 (Critique - Blocker) 🔴
- Test 1.1 : Jour exact
- Test 1.2 : Ce soir
- Test 6.1 : Avant vendredi (deadline)
- Test 2.2 : Service + Deadline

### Priorité 2 (Important) 🟠
- Test 3.1 : Fatigué + Complexe
- Test 3.2 : Énergique + Simple + Deadline
- Test 1.4 : Week-end
- Test 2.3 : Service commercial + Week-end

### Priorité 3 (Nice to have) 🟡
- Test 4.1 à 4.4 : Edge cases
- Test 5.1 à 5.2 : Patterns multiples
- Test 1.5 : Période floue

---

## 💡 Comment Tester Efficacement

### 1. Tests Manuels (15 min)
Ouvre http://localhost:3000 et fais les tests Priorité 1

### 2. Console (F12)
Vérifie les logs :
```
[temporal-detection] Pattern détecté: avant vendredi → (deadline)
[temporal-detection] Filtrage par deadline: { targetDate: '2026-02-06', ... }
```

### 3. Snapshots
Prends des captures d'écran des créneaux proposés pour comparer

### 4. Validation
Coche les cases dans la checklist au fur et à mesure

---

## ✅ Validation Finale

Si TOUS les tests passent :
- ✅ **Aucune dette technique créée**
- ✅ **Fonctionnalités existantes préservées**
- ✅ **Nouvelle feature fonctionne**
- ✅ **Code production-ready**

Si un test échoue :
- 🔍 **Investiguer immédiatement**
- 🐛 **Corriger avant de merger**
- 📝 **Documenter le fix**
