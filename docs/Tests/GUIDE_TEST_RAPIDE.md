# 🧪 Guide de Test Rapide - Planification Cognitive

## 🚀 Setup

1. Le serveur est déjà lancé sur **http://localhost:3000**
2. Ouvre l'application dans ton navigateur
3. Assure-toi d'être connecté et d'avoir Google Calendar connecté

---

## 📝 Tests Rapides à Faire

### Test 1 : Fatigué + Tâche Complexe
**Étapes** :
1. Sélectionne le mood **Fatigué** 😴
2. Capture : `"Réfléchir à la stratégie marketing"`
3. Clique sur **Caler**

**Résultat attendu** :
- ✅ Message : *"Créneaux adaptés à votre fatigue pour une tâche demandant de la concentration"*
- ✅ Créneaux proposés : Matinées 9h-12h principalement
- ✅ Évite avant 9h30 et après 17h

---

### Test 2 : Énergique + Tâche Simple
**Étapes** :
1. Sélectionne le mood **Énergique** ⚡
2. Capture : `"Appeler le dentiste pour rdv"`
3. Clique sur **Caler**

**Résultat attendu** :
- ✅ Message : *"Moments parfaits pour expédier cette tâche rapidement"*
- ✅ Créneaux matinaux proposés
- ✅ Filtrage service médical (Lun-Ven 9h-18h)

---

### Test 3 : Débordé + Tâche Moyenne
**Étapes** :
1. Sélectionne le mood **Débordé** 😰
2. Capture : `"Préparer la réunion de demain"`
3. Clique sur **Caler**

**Résultat attendu** :
- ✅ Message : *"Créneaux après vos pauses pour souffler un peu"*
- ✅ Créneaux après 14h privilégiés
- ✅ Bonus 14h-15h30 (après déjeuner)

---

### Test 4 : Contrainte Temporelle "Ce soir"
**Étapes** :
1. Mood quelconque
2. Capture : `"Appeler maman ce soir"`
3. Clique sur **Caler**

**Résultat attendu** :
- ✅ Créneaux uniquement ce soir (18h-21h)
- ✅ Pas de créneaux sur d'autres jours

---

### Test 5 : Contrainte "Avant vendredi" + Complexe
**Étapes** :
1. Sélectionne le mood **Énergique** ⚡
2. Capture : `"Analyser le rapport financier avant vendredi"`
3. Clique sur **Caler**

**Résultat attendu** :
- ✅ Message : *"Matinées idéales pour profiter de votre énergie sur cette tâche exigeante"*
- ✅ Créneaux jusqu'à jeudi inclus
- ✅ Matinées privilégiées (tâche complexe)

---

### Test 6 : Service Médical + Contrainte Jour
**Étapes** :
1. Mood quelconque
2. Capture : `"Aller chez le médecin lundi matin"`
3. Clique sur **Caler**

**Résultat attendu** :
- ✅ Créneaux uniquement lundi matin (9h-12h)
- ✅ Filtrage service médical appliqué
- ✅ Si aucun créneau : bouton "Voir tous les créneaux quand même"

---

### Test 7 : Courses Week-end
**Étapes** :
1. Mood quelconque
2. Capture : `"Faire les courses ce week-end"`
3. Clique sur **Caler**

**Résultat attendu** :
- ✅ Créneaux uniquement samedi 9h-19h (commerces fermés dimanche)
- ✅ Message service commercial si applicable

---

### Test 8 : Calme + Tâche Complexe
**Étapes** :
1. Sélectionne le mood **Calme** 😌
2. Capture : `"Écrire le rapport de synthèse"`
3. Clique sur **Caler**

**Résultat attendu** :
- ✅ Message : *"Après-midis propices pour vous plonger dans cette tâche demandant réflexion"*
- ✅ Créneaux après-midi 14h-18h privilégiés

---

### Test 9 : Tâche Simple Sans Mood
**Étapes** :
1. Ne sélectionne AUCUN mood (neutre)
2. Capture : `"Imprimer les documents"`
3. Clique sur **Caler**

**Résultat attendu** :
- ✅ Message : *"Moments pratiques pour cette tâche simple"*
- ✅ Créneaux diversifiés selon disponibilités

---

### Test 10 : Service Administratif
**Étapes** :
1. Mood quelconque
2. Capture : `"Aller à la mairie pour passeport"`
3. Clique sur **Caler**

**Résultat attendu** :
- ✅ Filtrage service administratif (Lun-Sam 9h-16h30)
- ✅ Créneaux matinaux et début après-midi uniquement

---

## 🔍 Points à Vérifier

### UI
- [ ] Le message d'explication s'affiche dans une box verte claire
- [ ] Le message est lisible et pertinent
- [ ] Le message apparaît juste après le titre "Meilleur moment suggéré"
- [ ] Le message disparaît si on change de créneau

### Logique
- [ ] La détection cognitive fonctionne (high/medium/low)
- [ ] Le mood influence le scoring
- [ ] Les contraintes temporelles sont respectées
- [ ] Les services sont bien filtrés

### Messages
- [ ] Le message correspond bien au mood × cognitive load
- [ ] Le français est correct
- [ ] Le ton est encourageant et utile

---

## 🐛 Bugs Potentiels à Chercher

1. **Message ne s'affiche pas** → Vérifier que `scheduling.explanation` est bien défini
2. **Mauvais message** → Vérifier la détection du mood et cognitive load
3. **Créneaux inappropriés** → Vérifier le scoring (console du navigateur)
4. **Contrainte temporelle ignorée** → Vérifier les logs de détection
5. **Service mal filtré** → Vérifier la détection de mots-clés

---

## 📊 Console du Navigateur

Ouvre la console (F12) pour voir les logs :
- `[temporal-detection]` → Détection des contraintes temporelles
- `[text-analysis]` → Détection cognitive + services
- `[slots.service]` → Scoring et filtrage

---

## ✅ Checklist Finale

- [ ] Testé 3+ combinaisons mood × cognitive
- [ ] Testé 2+ contraintes temporelles
- [ ] Testé 2+ services (médical, administratif, commercial)
- [ ] Message s'affiche correctement
- [ ] Performance OK (< 1 seconde)
- [ ] Pas d'erreurs dans la console
- [ ] UI agréable et claire

---

## 💡 Exemples de Pensées pour Tests Rapides

**Complexes** :
- "Réfléchir à la stratégie"
- "Créer une présentation"
- "Analyser le rapport"
- "Écrire le dossier"
- "Concevoir le plan"

**Simples** :
- "Appeler le médecin"
- "Envoyer un email"
- "Acheter du pain"
- "Imprimer les documents"
- "Confirmer le rdv"

**Moyennes** :
- "Préparer la réunion"
- "Organiser les fichiers"
- "Vérifier les comptes"

**Temporelles** :
- "...ce soir"
- "...demain matin"
- "...avant vendredi"
- "...lundi prochain"
- "...ce week-end"

**Services** :
- "...chez le médecin"
- "...à la mairie"
- "...au magasin"
- "...chez le dentiste"
- "...à la poste"
