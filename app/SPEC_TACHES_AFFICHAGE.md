# SPEC : Affichage des Tâches sur la page Clarté

> **Document focalisé sur les TÂCHES uniquement**
> S'intègre avec l'existant sans casser les composants actuels

---

## 📋 Contexte

### Ce qui existe déjà (à ne pas modifier)

| Élément | Fichier | Status |
|---------|---------|--------|
| Filtres page Clarté | `FilterChips.tsx` | ✅ Existant — NE PAS TOUCHER |
| Modal détail | `NoteDetailModal.tsx` | ✅ Existant — À RÉUTILISER |
| TaskCard | `components/clarte/cards/TaskCard.tsx` | ✅ Existant — À RÉUTILISER |
| Structure blocs | `TasksBlock.tsx` | ✅ Existant |

### Positionnement Manae (rappel)

- Ton : Doux, rassurant, non culpabilisant
- Vocabulaire : "Terminé" (pas "Complété"), "Rangé" (pas "Archivé"), "En attente" (pas "En retard")

---

## 🎯 Objectif de cette spec

Spécifier **uniquement** :
1. Le tri des tâches dans l'aperçu (bloc TasksBlock)
2. La vue complète des tâches (`/clarte/taches`)
3. Les onglets Actives / Terminées / Rangées
4. La réutilisation de la modal existante pour les tâches

---

## 1️⃣ Aperçu des tâches (Bloc dans page Clarté)

### Comportement actuel conservé

- Grille 2×2 (4 tâches max)
- Composant `TaskCard` existant
- **PAS de lien "Voir tout"** dans le header du bloc

### Tri des tâches affichées (à implémenter)

Les 4 tâches affichées sont sélectionnées dans cet ordre de priorité :

| Priorité | Condition | Exemple |
|----------|-----------|---------|
| 1 | Tâches du jour | `scheduled_at` = aujourd'hui, triées par heure |
| 2 | Tâches en attente | `scheduled_at` < aujourd'hui (date passée) |
| 3 | Tâches de la semaine | `scheduled_at` dans les 7 prochains jours |
| 4 | Tâches à caler | Pas de `scheduled_at`, triées par `created_at` DESC |

### Algorithme de tri

```typescript
function sortTasksForPreview(tasks: Item[]): Item[] {
  return tasks.sort((a, b) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    const aDate = a.scheduled_at ? new Date(a.scheduled_at) : null
    const bDate = b.scheduled_at ? new Date(b.scheduled_at) : null
    
    // Fonction pour déterminer la priorité
    const getPriority = (date: Date | null): number => {
      if (!date) return 4 // À caler
      if (date < today) return 2 // En attente
      if (date < new Date(today.getTime() + 24 * 60 * 60 * 1000)) return 1 // Aujourd'hui
      if (date < weekFromNow) return 3 // Cette semaine
      return 5 // Plus tard
    }
    
    const priorityA = getPriority(aDate)
    const priorityB = getPriority(bDate)
    
    // Tri par priorité d'abord
    if (priorityA !== priorityB) return priorityA - priorityB
    
    // Puis par date si les deux ont une date
    if (aDate && bDate) return aDate.getTime() - bDate.getTime()
    
    // Sinon par date de création (plus récent d'abord)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}
```

---

## 2️⃣ Vue complète des tâches (`/clarte/taches`)

### Accès

- Via tap sur le bloc "Tâches" dans la page Clarté
- Ou via navigation directe `/clarte/taches`

### Structure de la page

```
┌─────────────────────────────────────────────┐
│ ← Tâches                                    │  ← Header avec retour
├─────────────────────────────────────────────┤
│ Actives    Terminées    Rangées             │  ← Onglets discrets
├─────────────────────────────────────────────┤
│                                             │
│           [Contenu selon onglet]            │
│                                             │
└─────────────────────────────────────────────┘
```

### Header

| Élément | Comportement |
|---------|--------------|
| Bouton retour (←) | Retour à `/clarte` |
| Titre | "Tâches" |

### Onglets (style discret)

```typescript
// Style des onglets : texte simple, pas de fond coloré
// L'onglet actif a juste un underline discret

interface TabProps {
  label: string
  count?: number  // Optionnel, affiché en gris
  isActive: boolean
  onClick: () => void
}
```

**Style CSS des onglets :**

```css
/* Onglet inactif */
.tab {
  padding: 8px 16px;
  font-size: 14px;
  color: #9CA3AF;  /* Gris */
  border-bottom: 2px solid transparent;
}

/* Onglet actif */
.tab-active {
  color: #4A7488;  /* Bleu-gris Manae */
  border-bottom-color: #4A7488;
}
```

---

## 3️⃣ Onglet "Actives"

### Sections (dans l'ordre)

| Section | Condition | Affichage si vide |
|---------|-----------|-------------------|
| **Aujourd'hui** | `scheduled_at` = aujourd'hui | Section masquée |
| **En attente** | `scheduled_at` < aujourd'hui | Section masquée |
| **Cette semaine** | `scheduled_at` dans 7 prochains jours | Section masquée |
| **À caler** | Pas de `scheduled_at` | Section masquée |
| **Plus tard** | `scheduled_at` > 7 jours | Section masquée |

### Header de section

```
─── Aujourd'hui (2) ───
```

Style discret : ligne fine + texte en gris + compteur

```typescript
interface SectionHeaderProps {
  title: string
  count: number
}

// Style
// text-sm text-gray-500 font-medium
// Lignes : border-t border-gray-100
```

### Layout des tâches par section

| Section | Layout |
|---------|--------|
| Aujourd'hui | Grille 2×2 |
| En attente | Grille 2×2 |
| Cette semaine | Grille 2×2 |
| À caler | Grille 2×2 |
| Plus tard | Grille 2×2 |

### Composant utilisé

**Réutiliser `TaskCard` existant** sans modification.

### État vide (aucune tâche active)

```
┌─────────────────────────────────────────────┐
│                                             │
│               ○                             │
│                                             │
│      Aucune tâche en cours                  │
│                                             │
│      Tes pensées capturées                  │
│      apparaîtront ici                       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 4️⃣ Onglet "Terminées"

### Objectif

Voir ce qu'on a accompli → **moment feel-good, pas de culpabilité**

### Pas de sections temporelles

Liste simple, triée par date de complétion (plus récent en haut).

### Affichage des tâches terminées

**Réutiliser `TaskCard` existant** avec adaptation :

| Élément | Affichage pour tâche terminée |
|---------|-------------------------------|
| Icône état | ● (cercle plein vert menthe `#BEE5D3`) |
| Titre | Normal (pas barré) |
| Indicateur | "Terminé [date relative]" |
| Actions | Masquées — affichées dans la modal au tap |

### Interaction au tap

Ouvre la **modal de détail** (réutiliser `NoteDetailModal` adaptée) avec :

**Contenu de la modal :**
- Titre de la tâche
- Contexte (icône + label)
- Date de complétion : "Terminé il y a 2j"

**Actions dans la modal :**
- `[Réactiver]` → Remet en état "active"
- `[Ranger]` → Passe en état "stored"

### État vide

```
┌─────────────────────────────────────────────┐
│                                             │
│               ●                             │
│                                             │
│      Aucune tâche terminée                  │
│                                             │
│      Tes accomplissements                   │
│      apparaîtront ici ✨                    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 5️⃣ Onglet "Rangées"

### Objectif

Accéder aux anciennes tâches si besoin, sans encombrer.

### Pas de recherche

Simple liste, pas de barre de recherche.

### Pas de tri spécifique

Liste par date de rangement (plus récent en haut).

### Affichage des tâches rangées

**Réutiliser `TaskCard` existant** avec adaptation :

| Élément | Affichage pour tâche rangée |
|---------|----------------------------|
| Icône état | ◌ (cercle pointillé gris `#D1D5DB`) |
| Titre | Gris atténué |
| Indicateur | "Rangé [date relative]" |
| Actions | Masquées — affichées dans la modal au tap |

### Interaction au tap

Ouvre la **modal de détail** avec :

**Contenu de la modal :**
- Titre de la tâche
- Contexte (icône + label)
- Date de rangement : "Rangé il y a 1 mois"

**Actions dans la modal :**
- `[Réactiver]` → Remet en état "active"
- `[Supprimer]` → Suppression définitive (avec confirmation)

### État vide

```
┌─────────────────────────────────────────────┐
│                                             │
│               ◌                             │
│                                             │
│      Rien de rangé                          │
│                                             │
│      Les tâches que tu ranges               │
│      apparaîtront ici                       │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 6️⃣ Modal de détail (réutilisation)

### Base

Réutiliser la structure de `NoteDetailModal` existante.

### Adaptation pour les tâches

```typescript
interface TaskDetailModalProps {
  task: Item
  mode: 'done' | 'stored'  // Détermine les actions affichées
  onClose: () => void
  onReactivate: (id: string) => void
  onStore?: (id: string) => void      // Seulement si mode = 'done'
  onDelete?: (id: string) => void     // Seulement si mode = 'stored'
}
```

### Structure de la modal

```
┌─────────────────────────────────────────────┐
│ ✓ Tâche terminée                        ✕   │  ← Header
├─────────────────────────────────────────────┤
│                                             │
│  Aller au relais chercher le colis          │  ← Contenu
│                                             │
│  🏠 Personnel · Terminé il y a 2j           │  ← Contexte + Date
│                                             │
├─────────────────────────────────────────────┤
│  [Réactiver]              [Ranger]          │  ← Actions (mode 'done')
└─────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────┐
│ ◌ Tâche rangée                          ✕   │  ← Header
├─────────────────────────────────────────────┤
│                                             │
│  Ancien devis plombier                      │  ← Contenu
│                                             │
│  🏠 Personnel · Rangé il y a 2 mois         │  ← Contexte + Date
│                                             │
├─────────────────────────────────────────────┤
│  [Réactiver]              [Supprimer]       │  ← Actions (mode 'stored')
└─────────────────────────────────────────────┘
```

### Actions

| Mode | Action 1 | Action 2 |
|------|----------|----------|
| `done` | Réactiver (→ active) | Ranger (→ stored) |
| `stored` | Réactiver (→ active) | Supprimer (confirmation) |

### Confirmation de suppression

```
┌─────────────────────────────────────────────┐
│                                             │
│  Supprimer cette tâche ?                    │
│                                             │
│  Cette action est irréversible.             │
│                                             │
│  [Annuler]              [Supprimer]         │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 7️⃣ États des tâches (DB)

### Mapping des états

| État DB | Label affiché | Contexte |
|---------|---------------|----------|
| `active` | "À caler" ou date | Onglet Actives |
| `placed` | Date planifiée | Onglet Actives |
| `done` | "Terminé [date]" | Onglet Terminées |
| `stored` | "Rangé [date]" | Onglet Rangées |

### Transitions d'état

```
active ←→ placed (planification)
    ↓
   done (complétion)
    ↓
  stored (rangement)
    ↓
 supprimé (définitif)
```

**Réactivation possible :**
- `done` → `active`
- `stored` → `active`

---

## 8️⃣ Indicateurs temporels

### Format des dates

| Situation | Affichage |
|-----------|-----------|
| Aujourd'hui | "Auj. HH:mm" |
| Demain | "Demain HH:mm" |
| Cette semaine | "Lun.", "Mar.", etc. |
| Plus loin | "dd/MM" |
| Date passée | "En attente" (PAS "en retard") |
| Pas de date | "À caler" |

### Pour les tâches terminées/rangées

| Situation | Affichage |
|-----------|-----------|
| Aujourd'hui | "Terminé aujourd'hui" |
| Hier | "Terminé hier" |
| Cette semaine | "Terminé il y a Xj" |
| Plus ancien | "Terminé il y a X sem" / "il y a X mois" |

---

## 9️⃣ Fichiers à créer/modifier

### À créer

| Fichier | Description |
|---------|-------------|
| `app/clarte/taches/page.tsx` | Page vue complète des tâches |
| `components/clarte/TaskDetailModal.tsx` | Modal détail tâche (basée sur NoteDetailModal) |
| `components/clarte/tabs/TabBar.tsx` | Composant onglets discrets réutilisable |
| `components/clarte/EmptyState.tsx` | Composant état vide réutilisable |

### À modifier

| Fichier | Modification |
|---------|--------------|
| `components/clarte/blocks/TasksBlock.tsx` | Ajouter le tri intelligent |
| `components/clarte/cards/TaskCard.tsx` | Ajouter variantes pour done/stored |

---

## 🔟 Checklist d'implémentation

- [ ] Implémenter `sortTasksForPreview()` dans TasksBlock
- [ ] Créer `TabBar.tsx` (onglets discrets)
- [ ] Créer `EmptyState.tsx` (états vides)
- [ ] Créer `TaskDetailModal.tsx` (basé sur NoteDetailModal)
- [ ] Créer `app/clarte/taches/page.tsx`
- [ ] Ajouter variante `mode` à TaskCard pour done/stored
- [ ] Connecter les actions (réactiver, ranger, supprimer)
- [ ] Tester les transitions d'état

---

## 📝 Notes importantes

1. **Ne pas toucher aux FilterChips existants** — ils fonctionnent déjà
2. **Réutiliser TaskCard** — juste ajouter une prop `mode` pour les variantes
3. **Réutiliser la structure de NoteDetailModal** — adapter pour les tâches
4. **Onglets très discrets** — juste du texte avec underline, pas de fond coloré
5. **Pas de compteurs stressants** — le nombre dans l'onglet est optionnel et gris
