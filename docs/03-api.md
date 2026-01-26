# 03 - API & Prompts IA

> Documentation complète des endpoints API et prompts OpenAI

---

## Table des matières

1. [Endpoints API](#1-endpoints-api)
2. [Analyse IA - `/api/analyze-v2`](#2-analyse-ia---apianalyze-v2)
3. [Développement d'Idée - `/api/develop-idea`](#3-développement-didée---apidevelop-idea)
4. [Autres Endpoints](#4-autres-endpoints)
5. [Endpoints RGPD](#5-endpoints-rgpd)
6. [Gestion des Erreurs](#6-gestion-des-erreurs)

---

## 1. Endpoints API

### 1.1 Vue d'ensemble

| Endpoint | Méthode | Auth | Description |
|----------|---------|------|-------------|
| `/api/analyze-v2` | POST | Oui | Analyse IA d'une pensée |
| `/api/develop-idea` | POST | Oui | Développe idée → projet |
| `/api/items/update` | PATCH | Oui | Mise à jour item générique |
| `/api/auth/google` | POST | Non | OAuth token exchange |
| `/api/auth/callback` | GET | Non | Supabase auth callback |
| `/api/account/export` | GET | Oui | Export données RGPD (JSON) |
| `/api/account/delete` | DELETE | Oui | Suppression compte RGPD |
| `/api/cron/cleanup` | GET | Cron | Nettoyage auto (archivés, inactifs) |

---

## 2. Analyse IA - `/api/analyze-v2`

### 2.1 Objectif

Analyse une pensée capturée en langage naturel et la structure en items typés (tâches, notes, idées, courses).

### 2.2 Endpoint

```
POST /api/analyze-v2
```

### 2.3 Request

**Headers** :
```
Content-Type: application/json
Cookie: sb-access-token=... (auth Supabase)
```

**Body** :
```json
{
  "rawText": "Acheter du lait et appeler le dentiste demain"
}
```

**Validation** :
- `rawText` : string, non vide, requis

### 2.4 Response

#### Succès (200)

```json
{
  "items": [
    {
      "content": "Lait",
      "type": "list_item",
      "state": "active",
      "context": "other",
      "ai_analysis": {
        "type_suggestion": "list_item",
        "confidence": 0.95,
        "extracted_data": {
          "category": "dairy"
        },
        "suggestions": [],
        "temporal_constraint": null
      },
      "metadata": {}
    },
    {
      "content": "Appeler le dentiste demain",
      "type": "task",
      "state": "active",
      "context": "health",
      "ai_analysis": {
        "type_suggestion": "task",
        "confidence": 0.9,
        "extracted_data": {},
        "suggestions": [],
        "temporal_constraint": {
          "type": "fixed_date",
          "date": "2026-01-23T00:00:00.000Z",
          "urgency": "medium",
          "rawPattern": "demain"
        }
      },
      "metadata": {}
    }
  ],
  "raw_input": "Acheter du lait et appeler le dentiste demain"
}
```

#### Erreur

```json
{ "error": "rawText is required" }  // 400
{ "error": "Unauthorized" }          // 401
{ "error": "Analysis failed" }       // 500
```

#### Fallback

Si OpenAI échoue ou n'est pas configuré, l'API utilise un analyseur basé sur des règles simples et retourne un champ `warning` :

```json
{
  "items": [...],
  "warning": "Analyse simplifiée (IA non configurée)"
}
```

### 2.5 Logique Métier

1. **Authentification** : Vérifie `auth.getUser()` Supabase
2. **Validation** : Vérifie que `rawText` est présent et non vide
3. **Configuration OpenAI** : Si `OPENAI_API_KEY` absent → fallback règles
4. **Contexte historique** : Récupère les 10 derniers items de l'utilisateur pour améliorer la classification
5. **Appel OpenAI** :
   - Modèle : `gpt-4o-mini`
   - Temperature : 0.2 (faible pour cohérence)
   - Max tokens : 1500
   - Retries : 2 tentatives avec pause 30s en cas de rate limit (429)
6. **Parsing réponse** : Nettoie markdown (```json), parse JSON
7. **Validation types** : Vérifie cohérence `type` × `state` (ex: `planned` uniquement pour `task`)
8. **Transformation** : Convertit snake_case API → camelCase interne
9. **Return** : Items validés avec `ai_analysis` enrichie

### 2.6 Fallback Règles Basiques

Si OpenAI échoue, `analyzeWithRules()` applique :

- Détecte mots-clés courses ("lait", "pain", "yaourt"...)
- Détecte verbes d'action ("appeler", "acheter", "finir"...)
- Assigne contexte par défaut : `other`
- Détection temporelle basique : "demain", "urgent"

### 2.7 Configuration OpenAI

```typescript
export const ANALYZE_CONFIG = {
  system: ANALYSIS_SYSTEM,
  temperature: 0.2,
  maxTokens: 1500,
  model: 'gpt-4o-mini'
}
```

---

## 2.8 Prompt Système Complet

### System Prompt (`ANALYSIS_SYSTEM`)

```
Tu es un assistant d'organisation pour parents débordés.
Tu analyses des pensées capturées rapidement et les structures de façon claire.
Tu es bienveillant, pragmatique et tu vas droit au but.

RÈGLES FONDAMENTALES :
- TYPE = Nature de l'item (task, note, idea, list_item)
- STATE = Étape dans le cycle de vie (captured, active)
- Ne confonds JAMAIS type et state

RÈGLE ABSOLUE POUR list_item :
Si type = "list_item", alors content = NOM DU PRODUIT SEULEMENT.
Tu dois EXTRAIRE le produit et SUPPRIMER tout le reste.
- "ajouter à la liste de course du dentifrice" → content: "Dentifrice"
- "acheter du lait" → content: "Lait"
- "prendre 6 oeufs" → content: "6 œufs"
INTERDIT : content ne doit JAMAIS contenir "ajouter", "acheter", "prendre", "liste", "course"

Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.
```

### User Prompt (construit dynamiquement)

```
Analyse cette pensée et structure-la.

PENSÉE : "Acheter du lait et appeler le dentiste demain"

DATES DE RÉFÉRENCE :
- AUJOURD'HUI : 2026-01-22 (mercredi)
- DEMAIN : 2026-01-23
- JOURS : jeudi = 2026-01-23, vendredi = 2026-01-24, samedi = 2026-01-25, dimanche = 2026-01-26, lundi = 2026-01-27, mardi = 2026-01-28, mercredi = 2026-01-29
- FIN DU MOIS : 2026-01-31 ← UTILISER CETTE DATE si "fin du mois" ou "fin de mois"
- DÉBUT MOIS PROCHAIN : 2026-02-01 ← UTILISER CETTE DATE si "début du mois prochain"

⚠️ RÈGLE CRITIQUE : Si la pensée contient "fin du mois" ou "fin de mois", alors temporal_constraint.date = "2026-01-31"

[HISTORIQUE : optionnel si items récents disponibles]

RÈGLES :
1. TYPE : task (action), note (info), idea (projet flou), list_item (courses alimentaires/ménage)
2. STATE : "active" si clair, "captured" si flou (ideas uniquement)
3. CONTEXT : health (médical), family (enfants), work (pro), personal (perso), other
4. DÉCOUPAGE : séparer si virgules/et avec entités différentes
5. COURSES : TOUJOURS nettoyer (supprimer "acheter du/de la/des", garder le produit)
6. TEMPORAL : détecter dates, heures, urgences

TASK vs IDEA :
- task = action simple, planifiable en 1 étape (RDV, appel, achat spécifique)
- idea = projet nécessitant réflexion, organisation, plusieurs étapes

Exemples :
- "Inscrire Léo au foot" → task (1 action : téléphoner/s'inscrire en ligne)
- "Organiser anniversaire Léo" → idea (plusieurs étapes : lieu, invités, gâteau...)
- "Acheter chaussures Emma" → task (1 action : aller au magasin)
- "Refaire la chambre des enfants" → idea (peinture, meubles, déco...)

TASK vs LIST_ITEM :
- list_item = produits alimentaires, ménagers, hygiène (liste de courses)
- task = achats spécifiques avec contexte (vêtements, équipement, cadeaux)

Exemples :
- "Acheter du lait" → list_item (course alimentaire)
- "Acheter des chaussures pour Emma" → task (achat contextuel enfant)
- "Acheter cadeau anniversaire Théo" → task (achat contextuel événement)

EXEMPLES (entrée → sortie attendue) :

1. TÂCHES (actions concrètes) - GARDER LE CONTENU ORIGINAL
⚠️ Ne PAS nettoyer le contenu des tâches. Garder les infos temporelles dans le texte.

TEMPORAL_CONSTRAINT - RÈGLES IMPORTANTES :
- "[jour] [heure]" ou "à [heure]" → type: "fixed_date" (RDV précis à cette heure)
- "[jour] avant [heure]" → type: "time_range" avec start_date=[jour]T08:00 et end_date=[jour]T[heure] (CE jour, avant l'heure)
- "[jour] matin" → type: "time_range" avec start_date=[jour]T08:00 et end_date=[jour]T12:00 (CE jour, le matin)
- "[jour] après-midi" → type: "time_range" avec start_date=[jour]T14:00 et end_date=[jour]T18:00 (CE jour, l'après-midi)
- "avant [jour]" (sans heure) → type: "deadline" (n'importe quand avant ce jour)
- "urgent", "asap" ou "vite" → type: "asap"
- "à partir de [jour]" → type: "start_date" (créneaux CE jour et après)
- "[action] [jour]" (sans heure) → type: "fixed_date" (créneaux CE jour uniquement)
⚠️ EXPRESSIONS SPÉCIALES (PRIORITAIRES) :
- "fin du mois", "fin de mois", "à la fin du mois" → type: "deadline" avec date = FIN DU MOIS (voir ci-dessus)
- "début du mois prochain", "début de mois" → type: "fixed_date" avec date = DÉBUT MOIS PROCHAIN (voir ci-dessus)

"Appeler le dentiste" → { content: "Appeler le dentiste", type: "task", state: "active", context: "health" }
"Appeler le dentiste demain" → { content: "Appeler le dentiste demain", type: "task", state: "active", context: "health", temporal_constraint: { type: "fixed_date", date: "[demain]" } }
"Réunion mardi 14h" → { content: "Réunion mardi 14h", type: "task", state: "active", context: "work", temporal_constraint: { type: "fixed_date", date: "[mardi]T14:00:00" } }
"Réunion mardi avant 14h" → { content: "Réunion mardi avant 14h", type: "task", state: "active", context: "work", temporal_constraint: { type: "time_range", start_date: "[mardi]T08:00:00", end_date: "[mardi]T14:00:00", raw_pattern: "mardi avant 14h" } }
"Appeler comptable lundi matin" → { content: "Appeler comptable lundi matin", type: "task", state: "active", context: "work", temporal_constraint: { type: "time_range", start_date: "[lundi]T08:00:00", end_date: "[lundi]T12:00:00", raw_pattern: "lundi matin" } }
"RDV banque jeudi après-midi" → { content: "RDV banque jeudi après-midi", type: "task", temporal_constraint: { type: "time_range", start_date: "[jeudi]T14:00:00", end_date: "[jeudi]T18:00:00", raw_pattern: "jeudi après-midi" } }
"Finir rapport avant vendredi" → { content: "Finir rapport avant vendredi", type: "task", state: "active", temporal_constraint: { type: "deadline", date: "[vendredi]", urgency: "high" } }
"Payer facture avant le 15" → { content: "Payer facture avant le 15", type: "task", temporal_constraint: { type: "deadline", date: "[15 du mois]", urgency: "medium" } }
"Urgent rappeler client" → { content: "Urgent rappeler client", type: "task", state: "active", context: "work", temporal_constraint: { type: "asap", urgency: "critical" } }
"Vite répondre au mail" → { content: "Vite répondre au mail", type: "task", state: "active", temporal_constraint: { type: "asap", urgency: "high" } }
"Commencer régime lundi" → { content: "Commencer régime lundi", type: "task", state: "active", context: "health", temporal_constraint: { type: "fixed_date", date: "[lundi]" } }
"Reprendre sport à partir de mardi" → { content: "Reprendre sport à partir de mardi", type: "task", state: "active", context: "health", temporal_constraint: { type: "start_date", start_date: "[mardi]T00:00:00" } }
⚠️ "Appeler EDF fin du mois" → { content: "Appeler EDF fin du mois", type: "task", state: "active", context: "other", temporal_constraint: { type: "deadline", date: "UTILISER LA DATE FIN DU MOIS INDIQUÉE CI-DESSUS", urgency: "low", raw_pattern: "fin du mois" } }
⚠️ "Payer loyer début du mois prochain" → { content: "Payer loyer début du mois prochain", type: "task", state: "active", context: "other", temporal_constraint: { type: "fixed_date", date: "UTILISER LA DATE DÉBUT MOIS PROCHAIN INDIQUÉE CI-DESSUS", raw_pattern: "début du mois prochain" } }
"Appeler dentiste et pédiatre" → 2 items : { content: "Appeler le dentiste" } + { content: "Appeler le pédiatre" }

2. NOTES (infos à retenir, pas d'action) - GARDER LE CONTENU ORIGINAL
"Léa adore les licornes" → { content: "Léa adore les licornes", type: "note", state: "active", context: "family" }
"Code WiFi: abc123" → { content: "Code WiFi: abc123", type: "note", state: "active", context: "other" }
"Emma allergique aux arachides" → { content: "Emma allergique aux arachides", type: "note", state: "active", context: "family" }

3. IDÉES (projets futurs flous) - GARDER LE CONTENU ORIGINAL
"Partir au Japon un jour" → { content: "Partir au Japon un jour", type: "idea", state: "captured", context: "personal" }
"Refaire la cuisine" → { content: "Refaire la cuisine", type: "idea", state: "captured", context: "personal" }
"Aller au ski en février 2027" → { content: "Aller au ski en février 2027", type: "idea", state: "captured", context: "personal" }

4. COURSES (list_item) - NETTOYER le contenu + CATÉGORISER

CATÉGORIES (OBLIGATOIRE pour list_item) :
- bakery : pain, farine, brioche, croissant, pain de mie
- dairy : lait, œufs, fromage, beurre, yaourt, crème
- meat : viande, poisson, jambon, poulet, saucisse, lardons, steaks
- produce : fruits, légumes, banane, pomme, salade, compotes
- grocery : pâtes, riz, conserves, huile, sucre, sel, sauce
- frozen : surgelés, glace
- hygiene : savon, shampoing, dentifrice, PQ, sopalin
- household : lessive, liquide vaisselle, éponges
- drinks : eau, café, thé, jus, vin, bière
- baby : couches, lingettes, compotes bébé
- other : piles, ampoules, et tout le reste

⚠️ RÈGLE CRITIQUE - NETTOYAGE + CATÉGORIE OBLIGATOIRES :
Pour list_item : content = NOM DU PRODUIT SEULEMENT + extracted_data.category OBLIGATOIRE

EXEMPLES COMPLETS (format JSON attendu) :
"Ajouter à la liste de course du dentifrice" → { content: "Dentifrice", type: "list_item", state: "active", context: "other", extracted_data: { category: "hygiene" } }
"Acheter du lait" → { content: "Lait", type: "list_item", state: "active", context: "other", extracted_data: { category: "dairy" } }
"6 œufs" → { content: "6 œufs", type: "list_item", state: "active", context: "other", extracted_data: { category: "dairy" } }
"Pain" → { content: "Pain", type: "list_item", state: "active", context: "other", extracted_data: { category: "bakery" } }
"Jambon" → { content: "Jambon", type: "list_item", state: "active", context: "other", extracted_data: { category: "meat" } }
"Bananes" → { content: "Bananes", type: "list_item", state: "active", context: "other", extracted_data: { category: "produce" } }
"Pâtes" → { content: "Pâtes", type: "list_item", state: "active", context: "other", extracted_data: { category: "grocery" } }
"Piles" → { content: "Piles", type: "list_item", state: "active", context: "other", extracted_data: { category: "other" } }

LISTE BRUTE (mots séparés) :
"lait oeufs pain" → 3 items avec leurs catégories respectives (dairy, dairy, bakery)
"bananes pommes compotes" → 3 items (produce, produce, produce)

AVEC QUANTITÉS :
"2 briques de lait" → { content: "2 briques de lait", extracted_data: { category: "dairy" } }
"500g farine" → { content: "500g farine", extracted_data: { category: "bakery" } }

PRODUITS COMPOSÉS (garder ensemble) :
"yaourt au citron" → { content: "Yaourt au citron", extracted_data: { category: "dairy" } }
"jus de pomme" → { content: "Jus de pomme", extracted_data: { category: "drinks" } }
"huile d'olive" → { content: "Huile d'olive", extracted_data: { category: "grocery" } }
"sauce tomate" → { content: "Sauce tomate", extracted_data: { category: "grocery" } }

MIX COURSES + TÂCHE :
"lait pain et appeler nounou" → 3 items :
  - { content: "Lait", type: "list_item", extracted_data: { category: "dairy" } }
  - { content: "Pain", type: "list_item", extracted_data: { category: "bakery" } }
  - { content: "Appeler nounou", type: "task" }

FORMAT JSON (strict) :
{
  "items": [{
    "content": "⚠️ RÈGLE IMPORTANTE :
      - task/note/idea → CONTENU ORIGINAL (ne pas modifier, garder dates/heures dans le texte)
      - list_item → PRODUIT SEULEMENT (nettoyer verbes et phrases)",
    "type": "task|note|idea|list_item",
    "state": "active|captured",
    "context": "personal|family|work|health|other",
    "confidence": 0.0-1.0,
    "extracted_data": {
      "category": "pour list_item uniquement (bakery, dairy, meat, etc.)"
    },
    "temporal_constraint": {
      "type": "deadline|fixed_date|start_date|time_range|asap",
      "date": "ISO (pour deadline/fixed_date)",
      "start_date": "ISO (pour start_date/time_range)",
      "end_date": "ISO (pour time_range)",
      "urgency": "critical|high|medium|low",
      "raw_pattern": "expression originale"
    } ou null
  }]
}
```

---

## 3. Développement d'Idée - `/api/develop-idea`

### 3.1 Objectif

Transforme une idée floue en projet structuré avec étapes actionnables.

### 3.2 Endpoint

```
POST /api/develop-idea
```

### 3.3 Request

**Body** :
```json
{
  "itemId": "uuid-de-l-idee",
  "idea_age": "fresh",
  "blockers": ["time", "budget"]
}
```

**Paramètres** :
- `itemId` : UUID de l'item de type `idea`
- `idea_age` : `"fresh"` (idée récente) ou `"old"` (idée ancienne qui n'avance pas)
- `blockers` : Optionnel, tableau de blocages (`"time"`, `"budget"`, `"fear"`, `"energy"`)

### 3.4 Response

#### Succès (200)

```json
{
  "project": {
    "id": "uuid-item",
    "content": "Refaire la chambre des enfants",
    "refined_title": "Réaménager la chambre d'Emma et Léo",
    "estimated_time": "2 semaines (10h au total)",
    "budget": "200-400€",
    "motivation": "Un espace joyeux où ils aimeront jouer et dormir !"
  },
  "steps": [
    {
      "id": "uuid-step-1",
      "content": "Prendre les mesures et faire un plan au sol",
      "order": 1
    },
    {
      "id": "uuid-step-2",
      "content": "Trier et donner les jouets inutilisés",
      "order": 2
    },
    {
      "id": "uuid-step-3",
      "content": "Choisir une palette de couleurs avec les enfants",
      "order": 3
    },
    {
      "id": "uuid-step-4",
      "content": "Acheter la peinture et les accessoires déco",
      "order": 4
    },
    {
      "id": "uuid-step-5",
      "content": "Peindre les murs un week-end tranquille",
      "order": 5
    }
  ]
}
```

#### Erreur

```json
{ "error": "Item non trouvé" }                      // 404
{ "error": "Cet item n'est pas une idée" }         // 400
{ "error": "Cette idée a déjà été développée" }    // 400
{ "error": "Service IA non configuré" }            // 500
{ "error": "Réponse IA invalide" }                 // 500
```

### 3.5 Logique Métier

1. **Vérif OpenAI** : Si `OPENAI_API_KEY` absent → erreur 500
2. **Auth** : Vérifie user Supabase
3. **Validation params** : `itemId` et `idea_age` requis
4. **Récup item** : Vérifie que l'item existe, est une `idea`, et n'est pas déjà `project`
5. **Build prompt** : Avec contexte âge + blockers
6. **Appel OpenAI** :
   - Modèle : `gpt-4o-mini`
   - Temperature : 0.8 (créative)
   - Max tokens : 1500
7. **Parse réponse** : JSON avec `refined_title`, `steps[]`, `estimated_time`, `budget`, `motivation`
8. **Update item parent** :
   - `state` : `captured` → `project`
   - `content` : original → `refined_title`
   - `metadata` : Ajoute `development_context` avec âge, blockers, dates
9. **Créer steps** : Insert items type `task`, `state: active`, avec `parent_id` pointant vers le projet
10. **Track quota** : Appelle RPC `track_ai_usage` (2 crédits)
11. **Return** : Projet + steps créées

**Rollback** : Si création steps échoue, l'item parent est remis en état `captured`.

### 3.6 Configuration OpenAI

```typescript
export const DEVELOP_IDEA_CONFIG = {
  system: DEVELOP_IDEA_SYSTEM,
  temperature: 0.8,
  maxTokens: 1500,
  model: 'gpt-4o-mini'
}
```

### 3.7 Coût IA

**2 crédits** par appel (plus élevé car plus créatif et long).

---

## 3.8 Prompt Développement Complet

### System Prompt

```
Tu es un coach en organisation pour adultes mentalement surchargés.
Tu transformes les idées floues en projets concrets et motivants.
Tu es empathique, encourageant et pragmatique.

Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.
```

### User Prompt (construit dynamiquement)

**Exemple : Idée fraîche**

```
L'utilisateur a cette idée : "Refaire la chambre des enfants"

CONTEXTE : Idée fraîche, capturée récemment.
OBJECTIF : Structurer en projet motivant et concret.
TON : Enthousiaste, encourageant, dynamique.

TÂCHES :
1. Reformule l'idée en titre clair et engageant (max 60 caractères)
2. Décompose en 3-5 étapes concrètes et actionnables
3. Estime le temps total réaliste
4. Estime le budget si applicable (sinon null)
5. Ajoute une phrase de motivation encourageante

RÈGLES :
- Chaque étape DOIT commencer par un verbe d'action à l'infinitif
- Étapes adaptées à une personne avec charge mentale élevée
- La 1ère étape DOIT être faisable en moins de 15 minutes
- Pas de jargon, langage simple et direct
- Budget en euros avec fourchette si applicable

FORMAT JSON (strict) :
{
  "refined_title": "Titre clair du projet (max 60 car)",
  "steps": [
    "Verbe + action concrète 1",
    "Verbe + action concrète 2",
    "Verbe + action concrète 3"
  ],
  "estimated_time": "Durée totale réaliste (ex: 3h sur 2 semaines)",
  "budget": "Fourchette en euros (ex: 50-100€) ou null",
  "motivation": "Phrase encourageante courte (max 100 car)"
}
```

**Exemple : Idée ancienne avec blocages**

```
L'utilisateur a cette idée : "Créer mon blog"

CONTEXTE : Idée qui existe depuis longtemps mais n'avance pas.
BLOCAGES IDENTIFIÉS : Manque de temps, Peur de mal faire / doutes
OBJECTIF : Débloquer et relancer cette idée.
TON : Rassurant, empathique, pas culpabilisant.

ADAPTATION DES ÉTAPES SELON LES BLOCAGES :
- Manque de temps → Micro-étapes (5-15min max chacune)
- Budget limité → Étapes gratuites ou peu coûteuses en priorité
- Peur/doutes → Étapes de validation rapide, feedback tôt
- Manque d'énergie → Étapes légères, sans urgence

[... Mêmes TÂCHES, RÈGLES et FORMAT JSON que ci-dessus ...]
```

**Réponse IA attendue** :

```json
{
  "refined_title": "Lancer mon blog personnel en 5 étapes",
  "steps": [
    "Trouver 3 sujets qui me passionnent vraiment (10 min)",
    "Créer un blog gratuit sur WordPress.com (15 min)",
    "Écrire un premier brouillon court de 200 mots (20 min)",
    "Publier ce premier article même s'il est imparfait",
    "Partager le lien à 2-3 proches pour avoir des retours"
  ],
  "estimated_time": "2h sur 1 semaine",
  "budget": null,
  "motivation": "Chaque article est un pas vers ta voix unique !"
}
```

---

## 4. Autres Endpoints

### 4.1 `PATCH /api/items/update`

**Objectif** : Mise à jour générique d'un item.

**Request** :
```json
{
  "itemId": "uuid",
  "updates": {
    "content": "Nouveau contenu",
    "state": "completed",
    "context": "work"
  }
}
```

**Validation** : Vérifie ownership via `user_id`.

**Response** :
```json
{
  "id": "uuid",
  "content": "Nouveau contenu",
  "state": "completed",
  "updated_at": "2026-01-22T..."
}
```

---

### 4.2 `POST /api/auth/google`

**Objectif** : Échange du code OAuth Google contre des tokens.

**Request** :
```json
{
  "code": "4/...",
  "redirect_uri": "http://localhost:3000/onboarding/step4/callback"
}
```

**Response** :
```json
{
  "access_token": "ya29...",
  "refresh_token": "1//...",
  "expires_in": 3599,
  "token_type": "Bearer"
}
```

**Erreur** :
```json
{ "error": "Invalid authorization code" }
```

---

## 5. Endpoints RGPD

### 5.1 Export Données - `GET /api/account/export`

**Objectif** : Exporter toutes les données utilisateur en JSON (droit à la portabilité RGPD).

**Request** :
```
GET /api/account/export
Cookie: sb-access-token=... (auth Supabase)
```

**Response** (200) :
```json
{
  "export_info": {
    "generated_at": "2026-01-26T10:00:00.000Z",
    "user_id": "uuid",
    "email": "user@email.com",
    "format_version": "1.0"
  },
  "profile": {
    "first_name": "Prénom",
    "last_name": "Nom",
    "email": "user@email.com",
    "energy_moments": ["morning", "evening"],
    "created_at": "...",
    "updated_at": "..."
  },
  "items": [
    {
      "id": "uuid",
      "type": "task",
      "state": "active",
      "content": "...",
      "context": "personal",
      "mood": null,
      "scheduled_at": null,
      "shopping_category": null,
      "ai_analysis": {...},
      "metadata": {...},
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "constraints": [...],
  "shopping_lists": [...],
  "ai_usage_summary": {
    "total_operations": 42,
    "operations": [...]
  },
  "statistics": {
    "total_items": 150,
    "items_by_type": {...},
    "items_by_state": {...}
  }
}
```

**Headers réponse** :
- `Content-Type: application/json`
- `Content-Disposition: attachment; filename="manae-export-2026-01-26.json"`

**Erreurs** :
- 401 : Non autorisé
- 500 : Erreur serveur

---

### 5.2 Suppression Compte - `DELETE /api/account/delete`

**Objectif** : Supprimer le compte et toutes les données (droit à l'effacement RGPD).

**Request** :
```
DELETE /api/account/delete
Cookie: sb-access-token=... (auth Supabase)
```

**Logique** :
1. Vérifier authentification
2. Supprimer dans l'ordre (foreign keys) :
   - Items (tâches, notes, idées, courses)
   - Contraintes horaires
   - Listes de courses
   - Usage IA
   - Profil utilisateur
3. Supprimer compte auth Supabase (via Admin API)

**Response succès** (200) :
```json
{
  "success": true,
  "message": "Compte et données supprimés avec succès"
}
```

**Erreurs** :
- 401 : Non autorisé
- 500 : Erreur lors de la suppression

**Note** : Nécessite `SUPABASE_SERVICE_ROLE_KEY` pour supprimer le compte auth.

---

### 5.3 Nettoyage Automatique - `GET /api/cron/cleanup`

**Objectif** : Cron job quotidien pour suppression automatique des données obsolètes.

**Exécution** : Tous les jours à 3h00 UTC (configuré dans `vercel.json`).

**Logique** :
1. **Items archivés > 1 an** : Supprimés automatiquement
2. **Comptes inactifs > 2 ans** : Supprimés (données + compte auth)

**Configuration Vercel** (`vercel.json`) :
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Sécurité** : Vérifie l'en-tête `Authorization: Bearer CRON_SECRET`.

**Response** (200) :
```json
{
  "success": true,
  "deletedArchivedItems": 12,
  "deletedInactiveAccounts": 0
}
```

**Erreurs** :
- 401 : Token cron invalide
- 500 : Erreur serveur

---

## 6. Gestion des Erreurs

### 6.1 Codes HTTP

| Code | Signification |
|------|---------------|
| 200 | Succès |
| 400 | Bad Request (paramètres invalides) |
| 401 | Unauthorized (session expirée) |
| 404 | Not Found (item inexistant) |
| 429 | Rate Limit (OpenAI) - retry automatique |
| 500 | Internal Server Error |

### 6.2 Format Erreur Standard

```json
{
  "error": "Message d'erreur descriptif"
}
```

### 6.3 Stratégie Retry (Rate Limit OpenAI)

**Endpoint** : `/api/analyze-v2`

Si erreur 429 :
1. Attendre 30 secondes
2. Retry (max 2 tentatives)
3. Si échec final → fallback règles basiques

```typescript
let retries = 0
const maxRetries = 2

while (retries <= maxRetries) {
  try {
    completion = await openai.chat.completions.create({...})
    break
  } catch (error) {
    if (error.status === 429 && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 30000)) // 30s
      retries++
    } else {
      throw error
    }
  }
}
```

---

*Document technique - API & Prompts IA Manae*
