# Sprint 1 — Refactoring Prompt IA — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réécrire les prompts IA de Manae pour mieux gérer les saisies vocales, les cas familiaux complexes, et les nouveaux contextes `admin` et `home`.

**Architecture:** Modifications pures de `prompts/system.ts` et `prompts/analyze.ts`. Aucun changement de structure d'API, de modèle ou de format JSON. Le signal `source: 'voice' | 'text'` est traité dans le ticket suivant (SAN-27).

**Tech Stack:** TypeScript, OpenAI gpt-4o-mini, few-shot prompting

---

## Chunk 1 : Mise à jour de `prompts/system.ts`

### Fichiers

- Modifier : `prompts/system.ts`

### Contexte

Le `BASE_PERSONA` actuel cible "parents débordés" — trop restrictif. Le `ANALYSIS_SYSTEM` n'a pas de chain-of-thought ni d'instructions pour la gestion vocale.

### Tâche 1 : Mettre à jour `BASE_PERSONA` et `ANALYSIS_SYSTEM`

- [ ] **Step 1 : Remplacer le contenu de `prompts/system.ts`**

Remplacer l'intégralité du fichier par :

```typescript
/**
 * Prompts système réutilisables
 * Définissent la personnalité et le comportement de base de l'IA
 */

/**
 * Personnalité inclusive : adulte qui jongle entre vie pro, famille et mille pensées
 */
export const BASE_PERSONA = `Tu es un assistant d'organisation pour adultes qui jonglent entre vie professionnelle, famille et mille pensées.
Tu analyses des pensées capturées rapidement — à l'oral comme à l'écrit — et les structures de façon claire.
Tu es bienveillant, pragmatique et tu vas droit au but.`

/**
 * Règle JSON stricte
 */
export const JSON_ONLY_RULE = `Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.`

/**
 * Système pour l'analyse de pensées
 * Inclut chain-of-thought en 3 étapes + gestion des saisies vocales
 */
export const ANALYSIS_SYSTEM = `${BASE_PERSONA}

MÉTHODE D'ANALYSE — SUIVRE CES 3 ÉTAPES DANS L'ORDRE :
Étape 1 — NETTOYER : Si la saisie vient de la voix, ignorer les hésitations ("euh", "donc", "enfin", "je sais pas", "voilà", "en fait") et les auto-corrections. Garder l'intention finale.
Étape 2 — SEGMENTER : Y a-t-il plusieurs items avec des acteurs ou contextes différents ? Si oui, les séparer en items distincts.
Étape 3 — CLASSIFIER : Pour chaque item, déterminer le type (task/note/idea/list_item), l'état et le contexte.

GESTION DES SAISIES VOCALES :
- Ignorer les mots de remplissage : "euh", "donc", "enfin", "voilà", "je sais pas", "en fait", "ouais", "bon"
- Auto-corrections : garder uniquement l'intention après correction ("appeler... enfin écrire à Patrick" → "Écrire à Patrick")
- Phrases nominales sans verbe : "Patrick pour le devis" → task "Contacter Patrick pour le devis"
- Hésitations au début : "euh je sais pas... enfin si, rappeler le médecin pour Tom" → task "Rappeler le médecin pour Tom" (health)

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

${JSON_ONLY_RULE}`

/**
 * Système pour le développement d'idées
 */
export const DEVELOP_IDEA_SYSTEM = `Tu es un coach en organisation pour adultes mentalement surchargés.
Tu transformes les idées floues en projets concrets et motivants.
Tu es empathique, encourageant et pragmatique.

${JSON_ONLY_RULE}`
```

- [ ] **Step 2 : Vérifier qu'il n'y a pas d'erreurs TypeScript**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run lint 2>&1 | head -30
```

Attendu : 0 erreur sur `prompts/system.ts`

- [ ] **Step 3 : Commit**

```bash
git add prompts/system.ts
git commit -m "feat(prompt): persona inclusive + chain-of-thought + gestion vocale"
```

---

## Chunk 2 : Mise à jour de `prompts/analyze.ts`

### Fichiers

- Modifier : `prompts/analyze.ts`

### Tâche 2 : Mettre à jour les RULES (contextes admin/home)

- [ ] **Step 1 : Remplacer la section `RULES` dans `prompts/analyze.ts`**

Remplacer le bloc `const RULES = \`...\`` (lignes 122–149) par :

```typescript
const RULES = `
RÈGLES :
1. TYPE : task (action), note (info), idea (projet flou), list_item (courses alimentaires/ménage)
2. STATE : "active" si clair, "captured" si flou (ideas uniquement)
3. CONTEXT :
   - health : médical, santé, sport, pédiatre, dentiste, médecin
   - family : enfants, école, activités enfants, famille, nounou
   - work : professionnel, boulot, collègues, clients, réunions
   - personal : perso, loisirs, développement personnel, voyage, vacances
   - admin : banque, impôts, paperasse, assurance, administration, mairie, déclarations
   - home : maison, travaux, réparations, jardinage, plomberie, électricité, bricolage
4. DÉCOUPAGE : séparer si virgules/et avec entités ou contextes différents
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
`
```

### Tâche 3 : Mettre à jour les EXAMPLES (15 exemples ciblés)

- [ ] **Step 2 : Remplacer la section `EXAMPLES` dans `prompts/analyze.ts`**

Remplacer le bloc `const EXAMPLES = \`...\`` (lignes 24–116) par :

```typescript
const EXAMPLES = `
EXEMPLES (entrée → sortie attendue) :

1. TÂCHES — GARDER LE CONTENU ORIGINAL
⚠️ Ne PAS nettoyer le contenu des tâches. Garder les infos temporelles dans le texte.

TEMPORAL_CONSTRAINT — RÈGLES :
- "[jour] [heure]" ou "à [heure]" → type: "fixed_date"
- "[jour] avant [heure]" → type: "time_range" avec start_date=[jour]T08:00 et end_date=[jour]T[heure]
- "[jour] matin" → type: "time_range" start_date=[jour]T08:00 end_date=[jour]T12:00
- "[jour] après-midi" → type: "time_range" start_date=[jour]T14:00 end_date=[jour]T18:00
- "avant [jour]" (sans heure) → type: "deadline"
- "urgent", "asap" ou "vite" → type: "asap"
- "à partir de [jour]" → type: "start_date"
⚠️ PRIORITAIRES :
- "fin du mois" → type: "deadline" date = FIN DU MOIS (voir dates de référence)
- "début du mois prochain" → type: "fixed_date" date = DÉBUT MOIS PROCHAIN

TÂCHES CLASSIQUES :
"Appeler le dentiste" → { content: "Appeler le dentiste", type: "task", state: "active", context: "health" }
"Réunion mardi 14h" → { content: "Réunion mardi 14h", type: "task", state: "active", context: "work", temporal_constraint: { type: "fixed_date", date: "[mardi]T14:00:00" } }
"Finir rapport avant vendredi" → { content: "Finir rapport avant vendredi", type: "task", state: "active", context: "work", temporal_constraint: { type: "deadline", date: "[vendredi]", urgency: "high" } }
"Urgent rappeler client" → { content: "Urgent rappeler client", type: "task", state: "active", context: "work", temporal_constraint: { type: "asap", urgency: "critical" } }
"Appeler dentiste et pédiatre" → 2 items : { content: "Appeler le dentiste", context: "health" } + { content: "Appeler le pédiatre", context: "health" }

TÂCHES ADMIN (paperasse, banque, impôts) :
"Envoyer la déclaration d'impôts avant le 15" → { content: "Envoyer la déclaration d'impôts avant le 15", type: "task", state: "active", context: "admin", temporal_constraint: { type: "deadline", date: "[15 du mois]", urgency: "high" } }
"Appeler EDF fin du mois" → { content: "Appeler EDF fin du mois", type: "task", state: "active", context: "admin", temporal_constraint: { type: "deadline", date: "UTILISER LA DATE FIN DU MOIS INDIQUÉE CI-DESSOUS", urgency: "low" } }
"Renouveler assurance voiture" → { content: "Renouveler assurance voiture", type: "task", state: "active", context: "admin" }

TÂCHES HOME (maison, travaux) :
"Appeler le plombier pour la fuite" → { content: "Appeler le plombier pour la fuite", type: "task", state: "active", context: "home" }
"Acheter des ampoules pour le couloir" → { content: "Acheter des ampoules pour le couloir", type: "task", state: "active", context: "home" }

2. SAISIES VOCALES — cas difficiles
⚠️ Appliquer chain-of-thought : nettoyer hésitations → segmenter → classifier

"euh je sais pas... enfin si, rappeler le médecin pour Tom" → 1 item : { content: "Rappeler le médecin pour Tom", type: "task", state: "active", context: "health" }
"donc voilà faut que je pense à la déc... la déclaration d'impôts" → 1 item : { content: "Faire la déclaration d'impôts", type: "task", state: "active", context: "admin" }
"courses et aussi répondre à Patrick pour le devis" → 2 items : { content: "Courses", type: "task", context: "personal" } + { content: "Répondre à Patrick pour le devis", type: "task", context: "work" }
"faut que je pense à la déc d'impôts et acheter du pain" → 2 items : { content: "Faire la déclaration d'impôts", type: "task", context: "admin" } + { content: "Pain", type: "list_item", extracted_data: { category: "bakery" } }
"appeler... enfin écrire à la mairie pour les travaux" → 1 item : { content: "Écrire à la mairie pour les travaux", type: "task", state: "active", context: "home" }

3. NOTES (infos à retenir, pas d'action)
"Léa adore les licornes" → { content: "Léa adore les licornes", type: "note", state: "active", context: "family" }
"Emma allergique aux arachides" → { content: "Emma allergique aux arachides", type: "note", state: "active", context: "family" }
"Code WiFi: abc123" → { content: "Code WiFi: abc123", type: "note", state: "active", context: "home" }

4. IDÉES (projets futurs flous)
"Partir au Japon un jour" → { content: "Partir au Japon un jour", type: "idea", state: "captured", context: "personal" }
"Refaire la cuisine" → { content: "Refaire la cuisine", type: "idea", state: "captured", context: "home" }

5. COURSES (list_item) — NETTOYER le contenu + CATÉGORISER

CATÉGORIES (OBLIGATOIRE pour list_item) :
- bakery : pain, farine, brioche, croissant
- dairy : lait, œufs, fromage, beurre, yaourt, crème
- meat : viande, poisson, jambon, poulet, saucisse, lardons
- produce : fruits, légumes, banane, pomme, salade, compotes
- grocery : pâtes, riz, conserves, huile, sucre, sel, sauce
- frozen : surgelés, glace
- hygiene : savon, shampoing, dentifrice, PQ, sopalin
- household : lessive, liquide vaisselle, éponges
- drinks : eau, café, thé, jus, vin, bière
- baby : couches, lingettes, compotes bébé
- other : piles, ampoules, et tout le reste

"Acheter du lait" → { content: "Lait", type: "list_item", state: "active", context: "other", extracted_data: { category: "dairy" } }
"6 œufs" → { content: "6 œufs", type: "list_item", state: "active", context: "other", extracted_data: { category: "dairy" } }
"lait oeufs pain" → 3 items avec catégories (dairy, dairy, bakery)
"2 briques de lait" → { content: "2 briques de lait", extracted_data: { category: "dairy" } }

MIX COURSES + TÂCHE :
"lait pain et appeler nounou" → 3 items :
  - { content: "Lait", type: "list_item", extracted_data: { category: "dairy" } }
  - { content: "Pain", type: "list_item", extracted_data: { category: "bakery" } }
  - { content: "Appeler nounou", type: "task", context: "family" }
`
```

### Tâche 4 : Mettre à jour le JSON_FORMAT (contextes admin/home)

- [ ] **Step 3 : Remplacer la section `JSON_FORMAT` dans `prompts/analyze.ts`**

Remplacer le bloc `const JSON_FORMAT = \`...\`` (lignes 155–179) par :

```typescript
const JSON_FORMAT = `
FORMAT JSON (strict) :
{
  "items": [{
    "content": "⚠️ RÈGLE :
      - task/note/idea → CONTENU ORIGINAL (ne pas modifier, garder dates/heures)
      - list_item → PRODUIT SEULEMENT (nettoyer verbes et phrases)",
    "type": "task|note|idea|list_item",
    "state": "active|captured",
    "context": "personal|family|work|health|admin|home",
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
`
```

- [ ] **Step 4 : Vérifier la cohérence TypeScript**

```bash
cd /Users/sandrinelay/Projets/manae-v2 && npm run lint 2>&1 | head -30
```

Attendu : 0 erreur TypeScript. Note : `admin` et `home` ne sont pas encore dans `ItemContext` (ça sera fait en Sprint 2 SAN-8) — le prompt les référence en texte uniquement, pas en type TS.

- [ ] **Step 5 : Commit**

```bash
git add prompts/analyze.ts
git commit -m "feat(prompt): 15 exemples ciblés, contextes admin/home, règles vocales"
```

---

## Chunk 3 : Tests manuels

### Tâche 5 : Vérification manuelle sur 10 cas

Tester les captures suivantes dans l'app (page Capture, `npm run dev`) :

**5 cas vocaux :**
- [ ] "euh je sais pas... enfin si, rappeler le médecin pour Tom" → task health
- [ ] "donc voilà faut que je pense à la déclaration d'impôts" → task admin
- [ ] "courses et aussi répondre à Patrick pour le devis" → 2 items (list_item + task work)
- [ ] "faut que je pense à la décl d'impôts et acheter du pain" → 2 items (task admin + list_item)
- [ ] "appeler... enfin écrire à la mairie pour les travaux" → task home

**5 cas classiques (non-régression) :**
- [ ] "Réunion mardi 14h" → task work fixed_date
- [ ] "Lait oeufs pain" → 3 list_items avec bonnes catégories
- [ ] "Léa adore les licornes" → note family
- [ ] "Refaire la cuisine" → idea captured home
- [ ] "Appeler dentiste et pédiatre" → 2 tasks health

- [ ] **Commit final si tous les cas passent**

```bash
git add .
git commit -m "test(prompt): validation manuelle 10 cas vocaux et classiques"
```

---

## Résumé des fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `prompts/system.ts` | Persona inclusive, chain-of-thought 3 étapes, instructions vocales |
| `prompts/analyze.ts` | RULES (admin/home), EXAMPLES (15 ciblés dont 5 vocaux), JSON_FORMAT |
