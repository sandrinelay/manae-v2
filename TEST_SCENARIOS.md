# Scénarios de test - Planification cognitive

Ce document contient des scénarios de test pour valider le système de planification avec analyse cognitive et temporelle.

## 🧪 Tests Charge Cognitive + Mood

### 1. Fatigué + Tâche complexe (HIGH)
**Pensée** : "Réfléchir à la stratégie marketing pour le Q2"
- **Mood** : Fatigué
- **Cognitive Load** : HIGH (mot-clé "réfléchir", "stratégie")
- **Message attendu** : "Créneaux adaptés à votre fatigue pour une tâche demandant de la concentration"
- **Créneaux attendus** : Matinées 9h-12h (compromis fatigue/complexité)

### 2. Énergique + Tâche complexe (HIGH)
**Pensée** : "Créer la présentation pour le conseil d'administration"
- **Mood** : Énergique
- **Cognitive Load** : HIGH (mots-clés "créer", "présentation")
- **Message attendu** : "Matinées idéales pour profiter de votre énergie sur cette tâche exigeante"
- **Créneaux attendus** : Matinées 8h-12h

### 3. Fatigué + Tâche simple (LOW)
**Pensée** : "Appeler le médecin pour prendre rdv"
- **Mood** : Fatigué
- **Cognitive Load** : LOW (mots-clés "appeler", "rdv", "médecin")
- **Message attendu** : "Créneaux idéals pour une tâche simple, même fatigué"
- **Créneaux attendus** : 10h-16h + filtrage service médical (Lun-Ven 9h-18h)

### 4. Énergique + Tâche simple (LOW)
**Pensée** : "Acheter du pain et faire les courses"
- **Mood** : Énergique
- **Cognitive Load** : LOW (mots-clés "acheter", "courses")
- **Message attendu** : "Moments parfaits pour expédier cette tâche rapidement"
- **Créneaux attendus** : Matinées + filtrage commerce (Lun-Sam 9h-19h)

### 5. Débordé + Tâche complexe (HIGH)
**Pensée** : "Analyser le rapport financier et préparer le budget"
- **Mood** : Débordé (Overwhelmed)
- **Cognitive Load** : HIGH (mots-clés "analyser", "rapport", "budget")
- **Message attendu** : "Moments de calme après vos pauses pour vous concentrer"
- **Créneaux attendus** : Après pauses (14h-15h30, 15h30-17h)

### 6. Débordé + Tâche simple (LOW)
**Pensée** : "Envoyer email de confirmation et payer la facture"
- **Mood** : Débordé
- **Cognitive Load** : LOW (mots-clés "envoyer email", "payer")
- **Message attendu** : "Moments propices pour avancer rapidement sur une tâche simple"
- **Créneaux attendus** : Après pauses + après-midi

### 7. Calme + Tâche complexe (HIGH)
**Pensée** : "Écrire le dossier de synthèse du projet"
- **Mood** : Calme
- **Cognitive Load** : HIGH (mots-clés "écrire", "dossier", "synthèse")
- **Message attendu** : "Après-midis propices pour vous plonger dans cette tâche demandant réflexion"
- **Créneaux attendus** : Après-midis 14h-18h

### 8. Calme + Tâche simple (LOW)
**Pensée** : "Confirmer ma présence et imprimer les documents"
- **Mood** : Calme
- **Cognitive Load** : LOW (mots-clés "confirmer", "imprimer")
- **Message attendu** : "Moments idéals pour gérer cette tâche tranquillement"
- **Créneaux attendus** : Après-midis

### 9. Neutre + Tâche moyenne (MEDIUM)
**Pensée** : "Préparer la réunion de demain"
- **Mood** : Neutre (ou absent)
- **Cognitive Load** : MEDIUM (pas de mots-clés spécifiques)
- **Message attendu** : "Créneaux disponibles adaptés à votre planning"
- **Créneaux attendus** : Selon énergie personnelle

---

## 🕐 Tests Contraintes Temporelles

### 10. Contrainte temporelle + Tâche complexe
**Pensée** : "Réfléchir au projet avant vendredi"
- **Mood** : Énergique
- **Cognitive Load** : HIGH ("réfléchir", "projet")
- **Contrainte** : DEADLINE avant vendredi
- **Message attendu** : "Matinées idéales pour profiter de votre énergie sur cette tâche exigeante"
- **Créneaux attendus** : Matinées jusqu'à jeudi inclus

### 11. "Ce soir" + Tâche simple
**Pensée** : "Appeler maman ce soir"
- **Mood** : Neutre
- **Cognitive Load** : LOW ("appeler")
- **Contrainte** : Aujourd'hui soir (18h-21h)
- **Message attendu** : "Moments pratiques pour cette tâche simple"
- **Créneaux attendus** : Ce soir 18h-21h uniquement

### 12. "Demain matin" + Tâche urgente
**Pensée** : "Réviser le rapport demain matin"
- **Mood** : Neutre
- **Cognitive Load** : LOW ("réviser")
- **Contrainte** : Demain matin (8h-12h)
- **Créneaux attendus** : Demain 8h-12h uniquement

### 13. "Lundi prochain" + Service médical
**Pensée** : "Prendre rdv dentiste lundi prochain"
- **Mood** : Neutre
- **Cognitive Load** : LOW ("rdv", "dentiste")
- **Contrainte** : Lundi prochain (jour exact)
- **Service** : Médical (Lun-Ven 9h-18h)
- **Créneaux attendus** : Lundi prochain 9h-18h uniquement

### 14. "Avant 14h" + Tâche administrative
**Pensée** : "Aller à la mairie avant 14h"
- **Mood** : Neutre
- **Cognitive Load** : LOW
- **Contrainte** : Avant 14h (urgence haute)
- **Service** : Administratif (Lun-Sam 9h-16h30)
- **Créneaux attendus** : Matinées jusqu'à 14h max

### 15. "Ce week-end" + Courses
**Pensée** : "Faire les courses ce week-end"
- **Mood** : Neutre
- **Cognitive Load** : LOW ("courses")
- **Contrainte** : Week-end (samedi + dimanche)
- **Service** : Commercial (Lun-Sam 9h-19h)
- **Créneaux attendus** : Samedi uniquement 9h-19h (dimanche fermé)

---

## 🔀 Tests Mixtes (Cognitif + Temporel + Service)

### 16. Complexe + Urgent + Fatigué
**Pensée** : "Finir le bilan financier avant demain soir"
- **Mood** : Fatigué
- **Cognitive Load** : HIGH ("bilan")
- **Contrainte** : DEADLINE demain soir
- **Message attendu** : "Créneaux adaptés à votre fatigue pour une tâche demandant de la concentration"
- **Créneaux attendus** : Demain matin 10h-16h (compromis urgence/fatigue/complexité)

### 17. Service + Débordé + Contrainte jour
**Pensée** : "Aller chez le kiné jeudi après-midi"
- **Mood** : Débordé
- **Cognitive Load** : LOW ("kiné")
- **Contrainte** : Jeudi après-midi (14h-18h)
- **Service** : Médical (Lun-Ven 9h-18h)
- **Message attendu** : "Moments propices pour avancer rapidement sur une tâche simple"
- **Créneaux attendus** : Jeudi 14h-18h

### 18. Service + Énergique + Matin
**Pensée** : "Déposer le courrier à la poste demain matin"
- **Mood** : Énergique
- **Cognitive Load** : LOW ("déposer")
- **Contrainte** : Demain matin (8h-12h)
- **Service** : Administratif (Lun-Sam 9h-16h30)
- **Créneaux attendus** : Demain 9h-12h (intersection service + contrainte)

### 19. Complexe + Service commercial + Week-end
**Pensée** : "Choisir le canapé au magasin samedi"
- **Mood** : Calme
- **Cognitive Load** : MEDIUM ("choisir" peut être réflexion)
- **Contrainte** : Samedi
- **Service** : Commercial (Lun-Sam 9h-19h)
- **Message attendu** : "Créneaux calmes pour avancer sereinement"
- **Créneaux attendus** : Samedi 14h-18h (après-midi propice au calme)

### 20. ASAP + Simple + Neutre
**Pensée** : "Ranger le bureau dès que possible"
- **Mood** : Neutre
- **Cognitive Load** : LOW ("ranger")
- **Contrainte** : ASAP (dès que possible)
- **Message attendu** : "Moments pratiques pour cette tâche simple"
- **Créneaux attendus** : Premier créneau disponible, trié par date

---

## 📊 Résultats Attendus

### Messages d'explication (15 combinaisons possibles)

| Mood | Cognitive Load | Message |
|------|---------------|---------|
| Tired | High | Créneaux adaptés à votre fatigue pour une tâche demandant de la concentration |
| Tired | Medium | Moments propices malgré la fatigue |
| Tired | Low | Créneaux idéals pour une tâche simple, même fatigué |
| Overwhelmed | High | Moments de calme après vos pauses pour vous concentrer |
| Overwhelmed | Medium | Créneaux après vos pauses pour souffler un peu |
| Overwhelmed | Low | Moments propices pour avancer rapidement sur une tâche simple |
| Energetic | High | Matinées idéales pour profiter de votre énergie sur cette tâche exigeante |
| Energetic | Medium | Créneaux matinaux pour tirer parti de votre énergie |
| Energetic | Low | Moments parfaits pour expédier cette tâche rapidement |
| Calm | High | Après-midis propices pour vous plonger dans cette tâche demandant réflexion |
| Calm | Medium | Créneaux calmes pour avancer sereinement |
| Calm | Low | Moments idéals pour gérer cette tâche tranquillement |
| Neutral | High | Matinées recommandées pour cette tâche nécessitant concentration |
| Neutral | Medium | Créneaux disponibles adaptés à votre planning |
| Neutral | Low | Moments pratiques pour cette tâche simple |

### Scoring Patterns

**Énergie + Complexe → Matin prioritaire**
- Score élevé : 8h-12h
- Score moyen : 14h-16h
- Score faible : après 17h

**Fatigué + Complexe → Compromis**
- Éviter : avant 9h30 et après 17h
- Privilégier : 10h-16h (meilleur compromis)

**Débordé → Après pauses**
- Bonus : 14h-15h30 (après déjeuner)
- Bonus : 15h30-17h (après pause café)
- Malus : avant 9h30

**Service médical → Filtrage strict**
- Jours : Lun-Ven uniquement
- Horaires : 9h-18h uniquement
- Message si 0 créneaux : Proposition "Voir tous les créneaux quand même"

---

## ✅ Checklist Validation

- [ ] Message d'explication s'affiche dans CaptureModal
- [ ] Message d'explication s'affiche dans PlanTaskModal
- [ ] Message d'explication s'affiche dans PlanShoppingModal
- [ ] Détection cognitive fonctionne (high/medium/low)
- [ ] Scoring adapté au mood (tired, overwhelmed, energetic, calm)
- [ ] Contraintes temporelles respectées
- [ ] Filtrage service fonctionne (médical, administratif, commercial)
- [ ] Mode forcé accessible si 0 créneaux service
- [ ] Messages en français corrects
- [ ] Performance acceptable (< 500ms)
