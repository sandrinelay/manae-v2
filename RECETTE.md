# Recette Fonctionnelle et Technique - Manae v2

Document de validation pour tester l'application Manae point par point.

---

## Table des matières

1. [Authentification](#1-authentification)
2. [Onboarding](#2-onboarding)
3. [Capture](#3-capture)
4. [Clarté (Dashboard)](#4-clarté-dashboard)
5. [Gestion des Tâches](#5-gestion-des-tâches)
6. [Gestion des Notes](#6-gestion-des-notes)
7. [Gestion des Idées](#7-gestion-des-idées)
8. [Gestion des Projets](#8-gestion-des-projets)
9. [Liste de Courses](#9-liste-de-courses)
10. [Profil](#10-profil)
11. [Modales et Confirmations](#11-modales-et-confirmations)
12. [Interface Utilisateur](#12-interface-utilisateur)
13. [PWA et Performance](#13-pwa-et-performance)
14. [Intégrations](#14-intégrations)
15. [Gestion des Erreurs](#15-gestion-des-erreurs)

---

## 1. Authentification

### 1.1 Page de connexion (`/login`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 1.1.1 | Affichage de la page | Champs email et mot de passe visibles | ☐ |
| 1.1.2 | Connexion valide | Redirection vers `/clarte` | ☐ |
| 1.1.3 | Email invalide | Message d'erreur approprié | ☐ |
| 1.1.4 | Mot de passe incorrect | Message d'erreur approprié | ☐ |
| 1.1.5 | Champs vides | Validation empêche la soumission | ☐ |
| 1.1.6 | Lien "Mot de passe oublié" | Redirection vers `/forgot-password` | ☐ |

### 1.2 Mot de passe oublié (`/forgot-password`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 1.2.1 | Envoi email valide | Message de confirmation | ☐ |
| 1.2.2 | Email non inscrit | Message d'erreur approprié | ☐ |

### 1.3 Définir mot de passe (`/set-password`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 1.3.1 | Mot de passe < 8 caractères | Erreur de validation | ☐ |
| 1.3.2 | Mots de passe différents | Erreur de correspondance | ☐ |
| 1.3.3 | Mot de passe valide | Redirection vers onboarding ou clarté | ☐ |

### 1.4 Déconnexion

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 1.4.1 | Clic sur déconnexion | Modale de confirmation apparaît | ☐ |
| 1.4.2 | Confirmation déconnexion | Redirection vers `/login` | ☐ |
| 1.4.3 | Annulation | Modale se ferme, reste connecté | ☐ |

---

## 2. Onboarding

### 2.1 Étape 1 - Informations personnelles (`/onboarding`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 2.1.1 | Affichage des champs | Prénom, Nom, Email (lecture seule) | ☐ |
| 2.1.2 | Prénom requis | Validation si vide | ☐ |
| 2.1.3 | Passage étape suivante | Sauvegarde + navigation vers step2 | ☐ |

### 2.2 Étape 2 - Moments d'énergie (`/onboarding/step2`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 2.2.1 | Affichage des 6 créneaux | Matin tôt, Matin, Déjeuner, Après-midi, Soirée, Nuit | ☐ |
| 2.2.2 | Sélection multiple | Plusieurs créneaux sélectionnables | ☐ |
| 2.2.3 | Au moins 1 sélection requise | Validation si aucune sélection | ☐ |
| 2.2.4 | Passage étape suivante | Sauvegarde + navigation vers step3 | ☐ |

### 2.3 Étape 3 - Contraintes de temps (`/onboarding/step3`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 2.3.1 | Ajout d'une contrainte | Formulaire avec nom, catégorie, jours, heures | ☐ |
| 2.3.2 | Sélection des jours | Multi-sélection Lun-Dim | ☐ |
| 2.3.3 | Heures de début/fin | Sélecteur de temps fonctionnel | ☐ |
| 2.3.4 | Toggle pause déjeuner | Activation/désactivation | ☐ |
| 2.3.5 | Modification contrainte | Édition des valeurs existantes | ☐ |
| 2.3.6 | Suppression contrainte | Modale de confirmation + suppression | ☐ |
| 2.3.7 | Détection conflit | Modale si chevauchement horaire | ☐ |
| 2.3.8 | Passage étape suivante | Navigation vers step4 | ☐ |

### 2.4 Étape 4 - Google Calendar (`/onboarding/step4`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 2.4.1 | Bouton "Connecter" | Redirection OAuth Google | ☐ |
| 2.4.2 | Bouton "Passer" | Termine l'onboarding sans calendrier | ☐ |
| 2.4.3 | Connexion réussie | Tokens sauvegardés, redirection clarté | ☐ |
| 2.4.4 | Connexion échouée | Message d'erreur, possibilité de réessayer | ☐ |

---

## 3. Capture

### 3.1 Page de capture (`/capture`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 3.1.1 | Champ de saisie | Placeholder visible, focus auto | ☐ |
| 3.1.2 | Sélecteur d'humeur | 4 options (énergique, neutre, débordé, fatigué) | ☐ |
| 3.1.3 | Compteur pending | Affiche le nombre d'items en attente | ☐ |
| 3.1.4 | Bouton enregistreur vocal | Visible et cliquable | ☐ |
| 3.1.5 | CTA Google Calendar | Visible si calendrier non connecté | ☐ |

### 3.2 Saisie et analyse

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 3.2.1 | Saisie simple (1 item) | Texte capturé correctement | ☐ |
| 3.2.2 | Saisie multiple (plusieurs items) | Détection et séparation par l'IA | ☐ |
| 3.2.3 | Bouton "Organiser" | Déclenche l'analyse IA | ☐ |
| 3.2.4 | Animation de chargement | Spinner visible pendant l'analyse | ☐ |
| 3.2.5 | Animation de succès | Animation après capture réussie | ☐ |

### 3.3 Modale de capture simple

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 3.3.1 | Type détecté | Tâche, Note, Idée ou Liste courses | ☐ |
| 3.3.2 | Contexte détecté | Personnel, Famille, Travail, Santé, Autre | ☐ |
| 3.3.3 | Modification type/contexte | Possibilité de changer | ☐ |
| 3.3.4 | Bouton Valider | Sauvegarde l'item | ☐ |
| 3.3.5 | Bouton Annuler | Ferme la modale sans sauvegarder | ☐ |

### 3.4 Modale multi-capture

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 3.4.1 | Liste des items détectés | Tous les items visibles | ☐ |
| 3.4.2 | Modification individuelle | Chaque item modifiable | ☐ |
| 3.4.3 | Suppression d'un item | Retrait de la liste | ☐ |
| 3.4.4 | Validation globale | Tous les items sauvegardés | ☐ |

### 3.5 Planification post-capture

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 3.5.1 | Tâche avec contrainte temporelle | Option "Caler" proposée | ☐ |
| 3.5.2 | Sélection de créneau | Liste des créneaux disponibles | ☐ |
| 3.5.3 | Confirmation planification | Item planifié sur le calendrier | ☐ |

---

## 4. Clarté (Dashboard)

### 4.1 Page principale (`/clarte`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 4.1.1 | Affichage header | Nom de l'utilisateur visible | ☐ |
| 4.1.2 | Barre de recherche | Fonctionnelle avec placeholder | ☐ |
| 4.1.3 | Filtres de type | Tout, Tâches, Notes, Idées, Courses | ☐ |
| 4.1.4 | Filtres de contexte | Personnel, Famille, Travail, Santé, Autre | ☐ |
| 4.1.5 | Blocs prévisualisation | Max 4 items par bloc | ☐ |
| 4.1.6 | Boutons "Voir tout" | Navigation vers vue complète | ☐ |

### 4.2 Recherche

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 4.2.1 | Recherche par mot-clé | Résultats filtrés en temps réel | ☐ |
| 4.2.2 | Recherche insensible casse | "TÂCHE" = "tâche" | ☐ |
| 4.2.3 | Recherche avec accents | "énergie" = "energie" | ☐ |
| 4.2.4 | Aucun résultat | Message "Aucun résultat" | ☐ |
| 4.2.5 | Effacer recherche | Retour à la liste complète | ☐ |

### 4.3 Filtrage

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 4.3.1 | Filtre type "Tâches" | Seules les tâches affichées | ☐ |
| 4.3.2 | Filtre type "Notes" | Seules les notes affichées | ☐ |
| 4.3.3 | Filtre type "Idées" | Seules les idées affichées | ☐ |
| 4.3.4 | Filtre type "Courses" | Seuls les items de courses | ☐ |
| 4.3.5 | Filtre contexte | Items du contexte sélectionné | ☐ |
| 4.3.6 | Combinaison filtres | Type + Contexte fonctionne | ☐ |

---

## 5. Gestion des Tâches

### 5.1 Bloc Tâches (TasksBlock)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 5.1.1 | Affichage max 4 tâches | Prévisualisation limitée | ☐ |
| 5.1.2 | Badge compteur | Nombre total de tâches | ☐ |
| 5.1.3 | Bouton "Voir tout" | Ouvre TasksFullView | ☐ |

### 5.2 Vue complète Tâches (TasksFullView)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 5.2.1 | Onglet "À faire" | Tâches actives et planifiées | ☐ |
| 5.2.2 | Onglet "Terminées" | Tâches complétées | ☐ |
| 5.2.3 | Onglet "Rangées" | Tâches archivées | ☐ |
| 5.2.4 | Compteur par onglet | Nombre affiché sur chaque onglet | ☐ |

### 5.3 Carte Tâche

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 5.3.1 | Affichage contenu | Texte de la tâche visible | ☐ |
| 5.3.2 | Icône contexte | Couleur selon le contexte | ☐ |
| 5.3.3 | Checkbox "Fait" | Toggle état completed | ☐ |
| 5.3.4 | Bouton "Caler" | Ouvre le planificateur | ☐ |
| 5.3.5 | Tap sur carte | Ouvre la modale détail | ☐ |

### 5.4 Modale Tâche Active (TaskActiveModal)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 5.4.1 | Header "Tâche" | Titre avec icône | ☐ |
| 5.4.2 | Contenu affiché | Texte complet de la tâche | ☐ |
| 5.4.3 | Contexte + date | Info sous le contenu | ☐ |
| 5.4.4 | Bouton "Modifier" | Passe en mode édition | ☐ |
| 5.4.5 | Bouton "Ranger" | Archive la tâche | ☐ |
| 5.4.6 | Bouton "Supprimer" | Ouvre confirmation | ☐ |
| 5.4.7 | Bouton fermer (X) | Ferme la modale | ☐ |

### 5.5 Mode édition tâche

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 5.5.1 | Textarea éditable | Contenu modifiable | ☐ |
| 5.5.2 | Sélecteur contexte | 5 options cliquables | ☐ |
| 5.5.3 | Bouton "Annuler" | Annule les modifications | ☐ |
| 5.5.4 | Bouton "Enregistrer" | Sauvegarde les modifications | ☐ |
| 5.5.5 | Validation contenu | Désactivé si vide | ☐ |

### 5.6 Modale Tâche Terminée/Rangée (TaskDetailModal)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 5.6.1 | Header selon état | "Tâche terminée" ou "Tâche rangée" | ☐ |
| 5.6.2 | Bouton "Réactiver" | Remet en état actif | ☐ |
| 5.6.3 | Bouton "Ranger" (terminée) | Archive la tâche | ☐ |
| 5.6.4 | Bouton "Supprimer" (rangée) | Ouvre confirmation | ☐ |

---

## 6. Gestion des Notes

### 6.1 Bloc Notes (NotesBlock)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 6.1.1 | Affichage max 4 notes | Prévisualisation limitée | ☐ |
| 6.1.2 | Badge compteur | Nombre total de notes | ☐ |
| 6.1.3 | Bouton "Voir tout" | Ouvre NotesFullView | ☐ |

### 6.2 Vue complète Notes (NotesFullView)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 6.2.1 | Onglet "Actives" | Notes actives | ☐ |
| 6.2.2 | Onglet "Archivées" | Notes archivées | ☐ |
| 6.2.3 | Compteur par onglet | Nombre affiché | ☐ |

### 6.3 Carte Note

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 6.3.1 | Affichage contenu | Texte de la note visible | ☐ |
| 6.3.2 | Icône contexte | Couleur selon le contexte | ☐ |
| 6.3.3 | Tap sur carte | Ouvre la modale détail | ☐ |

### 6.4 Modale Note (NoteDetailModal)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 6.4.1 | Header "Note" | Titre avec icône | ☐ |
| 6.4.2 | Contenu affiché | Texte complet | ☐ |
| 6.4.3 | Contexte + date | Info sous le contenu | ☐ |
| 6.4.4 | Bouton "Archiver" | Archive la note | ☐ |
| 6.4.5 | Bouton "Supprimer" | Ouvre confirmation | ☐ |

### 6.5 Modale Note Archivée (NoteArchivedModal)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 6.5.1 | Header "Note archivée" | Titre approprié | ☐ |
| 6.5.2 | Bouton "Réactiver" | Remet en état actif | ☐ |
| 6.5.3 | Bouton "Modifier" | Passe en mode édition | ☐ |
| 6.5.4 | Bouton "Supprimer" | Ouvre confirmation | ☐ |

---

## 7. Gestion des Idées

### 7.1 Bloc Idées (IdeasBlock)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 7.1.1 | Affichage max 4 idées | Prévisualisation limitée | ☐ |
| 7.1.2 | Badge compteur | Nombre total d'idées | ☐ |
| 7.1.3 | Bouton "Voir tout" | Ouvre IdeasFullView | ☐ |

### 7.2 Vue complète Idées (IdeasFullView)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 7.2.1 | Onglet "Idées" | Idées actives | ☐ |
| 7.2.2 | Onglet "Projets" | Idées développées en projets | ☐ |
| 7.2.3 | Onglet "Rangées" | Idées archivées | ☐ |
| 7.2.4 | Compteur par onglet | Nombre affiché | ☐ |

### 7.3 Carte Idée

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 7.3.1 | Fond jaune (active) | `bg-yellow-100` | ☐ |
| 7.3.2 | Fond violet (projet) | `bg-purple-100` | ☐ |
| 7.3.3 | Fond gris (archivée) | `bg-gray-100` | ☐ |
| 7.3.4 | Tap sur idée active | Ouvre IdeaDetailModal | ☐ |
| 7.3.5 | Tap sur projet | Navigation vers `/projects/[id]` | ☐ |

### 7.4 Modale Idée (IdeaDetailModal)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 7.4.1 | Header "Idée" | Titre sans emoji | ☐ |
| 7.4.2 | Contenu affiché | Texte complet | ☐ |
| 7.4.3 | Contexte + date | Info sous le contenu | ☐ |
| 7.4.4 | Bouton "Développer" | Ouvre IdeaDevelopModal | ☐ |
| 7.4.5 | Bouton "Ranger" | Archive l'idée | ☐ |
| 7.4.6 | Bouton "Supprimer" | Ouvre confirmation | ☐ |

### 7.5 Modale Développement Idée (IdeaDevelopModal)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 7.5.1 | Header "Développer l'idée" | Titre sans emoji | ☐ |
| 7.5.2 | Affichage idée originale | Fond jaune avec contenu | ☐ |
| 7.5.3 | Étape 1 - Ancienneté | "Fraîche" ou "Ancienne" | ☐ |
| 7.5.4 | Étape 2 - Blocages | Temps, Budget, Peur, Énergie | ☐ |
| 7.5.5 | Appel API développement | Chargement IA | ☐ |
| 7.5.6 | Résultat projet | Titre raffiné + étapes générées | ☐ |
| 7.5.7 | Navigation vers projet | Bouton "Voir le projet" | ☐ |

---

## 8. Gestion des Projets

### 8.1 Page Projet (`/projects/[id]`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 8.1.1 | Header avec actions | Bouton Retour, Ranger, Supprimer | ☐ |
| 8.1.2 | Titre du projet | Contenu raffiné par l'IA | ☐ |
| 8.1.3 | Barre de progression | % d'étapes complétées | ☐ |
| 8.1.4 | Métadonnées | Durée estimée, Budget (si définis) | ☐ |
| 8.1.5 | Message motivation | Affiché si présent | ☐ |
| 8.1.6 | Liste des étapes | Toutes les étapes du projet | ☐ |

### 8.2 Gestion des étapes

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 8.2.1 | Numéro d'étape | "Étape 1", "Étape 2", etc. | ☐ |
| 8.2.2 | Checkbox étape | Toggle état completed | ☐ |
| 8.2.3 | Style étape complétée | Fond vert, texte barré | ☐ |
| 8.2.4 | Mise à jour progression | Barre se met à jour | ☐ |

### 8.3 Actions projet

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 8.3.1 | Bouton "Ranger" (header) | Archive le projet | ☐ |
| 8.3.2 | Bouton "Supprimer" (header) | Ouvre modale confirmation | ☐ |
| 8.3.3 | Confirmation suppression | Supprime projet + étapes | ☐ |
| 8.3.4 | Annulation suppression | Ferme la modale | ☐ |
| 8.3.5 | Redirection après action | Retour vers `/clarte` | ☐ |

---

## 9. Liste de Courses

### 9.1 Bloc Courses (ShoppingBlock)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 9.1.1 | Affichage items | Prévisualisation des courses | ☐ |
| 9.1.2 | Bouton "Voir tout" | Ouvre ShoppingFullView | ☐ |

### 9.2 Page Courses (`/clarte/courses`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 9.2.1 | Liste des items | Tous les items de la liste | ☐ |
| 9.2.2 | Checkbox item | Toggle état completed | ☐ |
| 9.2.3 | Ajout nouvel item | Formulaire d'ajout | ☐ |
| 9.2.4 | Suppression item | Avec confirmation | ☐ |
| 9.2.5 | Renommer la liste | Modification du titre | ☐ |

### 9.3 Planification courses

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 9.3.1 | Bouton "Planifier" | Ouvre PlanShoppingModal | ☐ |
| 9.3.2 | Sélection créneau | Liste des créneaux disponibles | ☐ |
| 9.3.3 | Confirmation | Événement créé sur Google Calendar | ☐ |

---

## 10. Profil

### 10.1 Page Profil (`/profil`)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 10.1.1 | Section Informations | Prénom, Nom, Email | ☐ |
| 10.1.2 | Section Préférences | Moments d'énergie, Contraintes | ☐ |
| 10.1.3 | Section Connexions | Statut Google Calendar | ☐ |
| 10.1.4 | Section Plus | Liens supplémentaires | ☐ |
| 10.1.5 | Bouton Déconnexion | En bas de page | ☐ |

### 10.2 Modification nom

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 10.2.1 | Bouton éditer | Ouvre modale d'édition | ☐ |
| 10.2.2 | Modification prénom | Champ éditable | ☐ |
| 10.2.3 | Modification nom | Champ éditable | ☐ |
| 10.2.4 | Sauvegarde | Mise à jour en base | ☐ |

### 10.3 Moments d'énergie

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 10.3.1 | Affichage créneaux | 6 créneaux visibles | ☐ |
| 10.3.2 | Modification sélection | Multi-sélection | ☐ |
| 10.3.3 | Sauvegarde auto | Mise à jour immédiate | ☐ |

### 10.4 Contraintes de temps

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 10.4.1 | Liste des contraintes | Toutes les contraintes affichées | ☐ |
| 10.4.2 | Ajout contrainte | Formulaire fonctionnel | ☐ |
| 10.4.3 | Modification contrainte | Édition possible | ☐ |
| 10.4.4 | Suppression contrainte | Avec confirmation | ☐ |
| 10.4.5 | Détection conflits | Modale si chevauchement | ☐ |

### 10.5 Google Calendar

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 10.5.1 | Statut connexion | "Connecté" ou "Non connecté" | ☐ |
| 10.5.2 | Bouton connecter | Lance OAuth Google | ☐ |
| 10.5.3 | Bouton reconnecter | Si déjà connecté | ☐ |

---

## 11. Modales et Confirmations

### 11.1 Structure des modales

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 11.1.1 | Backdrop | Fond noir/50 cliquable pour fermer | ☐ |
| 11.1.2 | Centrage | Modale centrée verticalement | ☐ |
| 11.1.3 | Bordures arrondies | `rounded-2xl` | ☐ |
| 11.1.4 | Ombre | `shadow-2xl` | ☐ |
| 11.1.5 | Bouton fermer (X) | En haut à droite | ☐ |

### 11.2 Modales de confirmation

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 11.2.1 | Titre sans emoji | Pas d'emoji avant le titre | ☐ |
| 11.2.2 | Message explicatif | Description de l'action | ☐ |
| 11.2.3 | Bouton "Annuler" | Variante secondary | ☐ |
| 11.2.4 | Bouton action | Variante appropriée (delete, etc.) | ☐ |
| 11.2.5 | Suppression projet | "Le projet et toutes ses étapes..." | ☐ |
| 11.2.6 | Suppression item | "Cette action est irréversible" | ☐ |
| 11.2.7 | Déconnexion | "Tu pourras te reconnecter..." | ☐ |

### 11.3 Modale de conflit (ConflictModal)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 11.3.1 | Titre "Chevauchement détecté" | Sans emoji | ☐ |
| 11.3.2 | Détails du conflit | Noms et horaires | ☐ |
| 11.3.3 | Message explicatif | Sans emoji | ☐ |
| 11.3.4 | Bouton "Modifier" | Ferme la modale | ☐ |
| 11.3.5 | Bouton "Ajouter quand même" | Confirme malgré conflit | ☐ |

---

## 12. Interface Utilisateur

### 12.1 Navigation (BottomNav)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 12.1.1 | 3 onglets | Capture, Clarté, Profil | ☐ |
| 12.1.2 | Icônes 24px | `w-6 h-6` | ☐ |
| 12.1.3 | Texte 12px | `text-xs` | ☐ |
| 12.1.4 | État actif | Couleur primary | ☐ |
| 12.1.5 | Navigation fonctionnelle | Redirection correcte | ☐ |

### 12.2 Boutons (ActionButton)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 12.2.1 | Hauteur 48px | `h-12` | ☐ |
| 12.2.2 | Bordures arrondies | `rounded-xl` | ☐ |
| 12.2.3 | Variante save | Vert primaire | ☐ |
| 12.2.4 | Variante delete | Rouge | ☐ |
| 12.2.5 | Variante secondary | Gris | ☐ |
| 12.2.6 | Variante archive | Style archivage | ☐ |
| 12.2.7 | État disabled | Opacité réduite | ☐ |

### 12.3 Boutons icônes (IconButton)

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 12.3.1 | Variante ghost | Fond transparent | ☐ |
| 12.3.2 | Variante danger | Fond rouge clair | ☐ |
| 12.3.3 | Variante primary | Fond primaire | ☐ |
| 12.3.4 | Taille md | Dimensions correctes | ☐ |

### 12.4 Champs de saisie

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 12.4.1 | Style input-field | Classe CSS appliquée | ☐ |
| 12.4.2 | Placeholder | Texte indicatif visible | ☐ |
| 12.4.3 | Focus state | Bordure primaire | ☐ |
| 12.4.4 | Textarea auto-resize | Hauteur s'adapte au contenu | ☐ |

### 12.5 Cartes et blocs

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 12.5.1 | Fond blanc | `bg-white` | ☐ |
| 12.5.2 | Bordure | `border border-border` | ☐ |
| 12.5.3 | Bordures arrondies | `rounded-xl` | ☐ |
| 12.5.4 | Hover state | Effet au survol | ☐ |

---

## 13. PWA et Performance

### 13.1 Progressive Web App

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 13.1.1 | Manifest | `/manifest.json` accessible | ☐ |
| 13.1.2 | Service Worker | Enregistré correctement | ☐ |
| 13.1.3 | Installation | Prompt "Ajouter à l'écran" | ☐ |
| 13.1.4 | Icônes | Toutes tailles disponibles | ☐ |
| 13.1.5 | Splash screen | Affiché au lancement | ☐ |

### 13.2 Mode hors ligne

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 13.2.1 | Page offline | `/offline` affichée | ☐ |
| 13.2.2 | Cache statique | Assets en cache | ☐ |
| 13.2.3 | Reconnexion | Reprise automatique | ☐ |

### 13.3 Performance

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 13.3.1 | Temps de chargement | < 3s sur 3G | ☐ |
| 13.3.2 | Animations fluides | Pas de lag | ☐ |
| 13.3.3 | Scroll fluide | 60fps | ☐ |
| 13.3.4 | Mémoire | Pas de fuite mémoire | ☐ |

---

## 14. Intégrations

### 14.1 Supabase

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 14.1.1 | Authentification | Login/logout fonctionnel | ☐ |
| 14.1.2 | CRUD items | Create, Read, Update, Delete | ☐ |
| 14.1.3 | CRUD contraintes | Gestion des contraintes | ☐ |
| 14.1.4 | Profil utilisateur | Lecture/écriture | ☐ |
| 14.1.5 | Listes de courses | Gestion complète | ☐ |

### 14.2 OpenAI

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 14.2.1 | Analyse de capture | Classification type/contexte | ☐ |
| 14.2.2 | Développement idée | Génération projet + étapes | ☐ |
| 14.2.3 | Fallback | Analyse règles si API down | ☐ |
| 14.2.4 | Rate limiting | Retry automatique | ☐ |
| 14.2.5 | Quota | Gestion des limites | ☐ |

### 14.3 Google Calendar

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 14.3.1 | OAuth | Connexion/déconnexion | ☐ |
| 14.3.2 | Tokens | Stockage sécurisé | ☐ |
| 14.3.3 | Refresh token | Renouvellement auto | ☐ |
| 14.3.4 | Créer événement | Tâche planifiée → Calendar | ☐ |
| 14.3.5 | Lecture événements | Disponibilités correctes | ☐ |

---

## 15. Gestion des Erreurs

### 15.1 Erreurs réseau

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 15.1.1 | Perte connexion | Message d'erreur | ☐ |
| 15.1.2 | Timeout | Message approprié | ☐ |
| 15.1.3 | Retry automatique | Tentative de reconnexion | ☐ |

### 15.2 Erreurs API

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 15.2.1 | 401 Unauthorized | Redirection login | ☐ |
| 15.2.2 | 404 Not Found | Page/message d'erreur | ☐ |
| 15.2.3 | 500 Server Error | Message utilisateur | ☐ |
| 15.2.4 | OpenAI unavailable | Fallback activé | ☐ |

### 15.3 Erreurs de validation

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 15.3.1 | Champs requis vides | Message de validation | ☐ |
| 15.3.2 | Format email invalide | Message spécifique | ☐ |
| 15.3.3 | Mot de passe trop court | Message spécifique | ☐ |
| 15.3.4 | Conflit horaire | Modale de conflit | ☐ |

### 15.4 États de chargement

| Test | Description | Attendu | OK |
|------|-------------|---------|-----|
| 15.4.1 | Spinner global | Visible pendant chargement | ☐ |
| 15.4.2 | Skeleton loading | Pour les listes | ☐ |
| 15.4.3 | Bouton désactivé | Pendant soumission | ☐ |
| 15.4.4 | Message "Chargement..." | Texte approprié | ☐ |

---

## Récapitulatif

| Section | Tests | Validés | Échecs |
|---------|-------|---------|--------|
| 1. Authentification | 14 | ☐ | ☐ |
| 2. Onboarding | 18 | ☐ | ☐ |
| 3. Capture | 19 | ☐ | ☐ |
| 4. Clarté | 16 | ☐ | ☐ |
| 5. Tâches | 26 | ☐ | ☐ |
| 6. Notes | 14 | ☐ | ☐ |
| 7. Idées | 19 | ☐ | ☐ |
| 8. Projets | 13 | ☐ | ☐ |
| 9. Courses | 9 | ☐ | ☐ |
| 10. Profil | 17 | ☐ | ☐ |
| 11. Modales | 15 | ☐ | ☐ |
| 12. UI | 20 | ☐ | ☐ |
| 13. PWA | 10 | ☐ | ☐ |
| 14. Intégrations | 15 | ☐ | ☐ |
| 15. Erreurs | 14 | ☐ | ☐ |
| **TOTAL** | **219** | | |

---

## Notes de test

### Environnement de test
- [ ] Navigateur : _______________
- [ ] Version : _______________
- [ ] Device : _______________
- [ ] Résolution : _______________
- [ ] Date : _______________
- [ ] Testeur : _______________

### Bugs identifiés
| ID | Description | Sévérité | Statut |
|----|-------------|----------|--------|
| | | | |

### Remarques générales
_Espace pour notes et observations pendant les tests_

---

Document généré le : 2026-01-12
Version : 1.0
