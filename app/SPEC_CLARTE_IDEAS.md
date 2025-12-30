# État des lieux - Page Clarté : Module Idées

## Vue d'ensemble

Le module Idées permet de capturer des idées et de les transformer en projets structurés via l'IA. C'est le seul type avec une transformation IA (idée → projet avec étapes).

---

## Architecture actuelle

### Structure des fichiers

```
app/clarte/
├── idees/
│   └── page.tsx              # Page dédiée aux idées (à supprimer pour cohérence)

components/clarte/
├── blocks/
│   └── IdeasBlock.tsx        # Bloc idées (max 4 affichées)
├── cards/
│   └── IdeaCard.tsx          # Carte d'idée individuelle
└── modals/
    └── (aucune modal idées)  # MANQUANT

features/ideas/
├── components/
│   └── IdeaDevelopPanel.tsx  # Wizard de développement (NON UTILISÉ)
├── hooks/
│   └── useIdeaDevelop.ts     # State management du develop
├── types.ts                  # Types spécifiques aux idées
└── index.ts                  # Exports

app/api/
└── develop-idea/
    └── route.ts              # Endpoint IA pour développer une idée
```

---

## États et transitions

### États possibles pour une idée

| État | Description | Badge affiché |
|------|-------------|---------------|
| `captured` | Vient d'être capturée | ⚡ À clarifier (amber) |
| `active` | Clarifiée, prête à développer | 💡 À développer (teal) |
| `project` | Transformée en projet par l'IA | ✨ Projet (purple) |
| `archived` | Archivée | (non affiché actuellement) |

### Transitions prévues (types/items.ts)

```
captured → active, archived
active → project, completed, archived
project → active, completed, archived
archived → active
```

### Transitions implémentées

```
captured/active → project (via API develop-idea) ✅
Autres → ❌ Non implémentées
```

---

## Comparaison avec les patterns existants

### Composants par type

| Composant | Tâches | Notes | Idées |
|-----------|--------|-------|-------|
| Block | TasksBlock.tsx | NotesBlock.tsx | IdeasBlock.tsx |
| Card/Row | TaskCard.tsx | NoteRow.tsx | IdeaCard.tsx |
| FullView | TasksFullView.tsx | NotesFullView.tsx | ❌ **MANQUANT** |
| Modal active | TaskActiveModal.tsx | NoteDetailModal.tsx | ❌ **MANQUANT** |
| Modal archived | TaskDetailModal.tsx | NoteArchivedModal.tsx | ❌ **MANQUANT** |

### Fonctionnalités par type

| Fonctionnalité | Tâches | Notes | Idées |
|----------------|--------|-------|-------|
| Affichage bloc | ✅ | ✅ | ✅ |
| Vue complète avec onglets | ✅ | ✅ | ❌ |
| Actions rapides sur carte | ✅ (Fait, Caler) | ❌ | ❌ |
| Modal de détail | ✅ | ✅ | ❌ |
| Modifier le contenu | ❌ | ✅ | ❌ |
| Changer le contexte | ❌ | ✅ | ❌ |
| Archiver | ✅ | ✅ | ❌ |
| Supprimer | ✅ | ✅ | ❌ |
| Réactiver depuis archives | ✅ | ✅ | ❌ |
| Transformation IA | ❌ | ❌ | ✅ (isolé) |
| Filtre par contexte | ❌ | ✅ | ❌ |

---

## Ce qui fonctionne

### Implémenté et fonctionnel

1. **Affichage des idées**
   - IdeasBlock affiche max 4 idées avec bouton "Voir plus"
   - IdeaCard affiche contenu, état, contexte, progression (si projet)
   - Groupement par état sur la page idées

2. **API de développement** (`/api/develop-idea`)
   - Reçoit le texte de l'idée + contexte (age, blockers)
   - Utilise GPT-4o-mini pour structurer un projet
   - Crée 3-5 sous-tâches (type='task', parent_id=idea_id)
   - Met à jour l'idée : state='project', metadata enrichi

3. **Wizard de développement** (IdeaDevelopPanel)
   - Étape 1 : Sélection de l'âge (fraîche / ancienne)
   - Étape 2 : Sélection des blockers (temps, budget, peur, énergie)
   - Étape 3 : Loading avec animation
   - Étape 4 : Résultat (titre raffiné, étapes, temps estimé, motivation)

4. **Navigation vers projets**
   - Si state='project', clic → `/projects/{id}`

---

## Ce qui ne fonctionne pas / manque

### Problèmes critiques

1. **IdeaDevelopPanel non intégré**
   ```typescript
   // app/clarte/idees/page.tsx:57
   } else {
     // TODO: Ouvrir panel Develop Idea
     console.log('Develop idea:', id)
   }
   ```
   - Le composant existe mais n'est pas utilisé
   - Clic sur une idée non-projet → rien ne se passe (juste un console.log)

2. **Aucune modal pour les idées**
   - Pas de IdeaDetailModal (équivalent de NoteDetailModal)
   - Pas de IdeaArchivedModal
   - Impossible de voir le détail, modifier, archiver ou supprimer

3. **Pas de IdeasFullView**
   - La page `/clarte/idees` existe mais ne suit pas le pattern
   - Devrait être un composant IdeasFullView comme NotesFullView

4. **Actions impossibles depuis l'UI**
   - Archiver une idée
   - Supprimer une idée
   - Modifier le contenu d'une idée
   - Réactiver une idée archivée

---

## Proposition d'amélioration

### Approche recommandée

Aligner le module Idées sur le pattern Notes (le plus proche) :

```
┌─────────────────────────────────────────────┐
│ Dashboard Clarté (filtre "all")             │
├─────────────────────────────────────────────┤
│ [IdeasBlock] - Affiche 4 idées max          │
│   → Clic sur header → filtre "ideas"        │
│   → Clic sur idée → IdeaDetailModal         │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│ Dashboard Clarté (filtre "ideas")           │
├─────────────────────────────────────────────┤
│ [IdeasFullView] avec onglets :              │
│   - Actives (captured + active)             │
│   - Projets (project)                       │
│   - Archivées (archived)                    │
│                                             │
│ + Filtre par contexte                       │
│ + Clic sur idée → Modal appropriée          │
└─────────────────────────────────────────────┘
```

### Composants à créer

1. **IdeaDetailModal** (pour captured/active)
   ```
   ┌─────────────────────────────────┐
   │ [💡 Idée]                   [X] │
   ├─────────────────────────────────┤
   │ Contenu de l'idée...            │
   │                                 │
   │ [Contexte] • Créée il y a 2h    │
   ├─────────────────────────────────┤
   │ [Développer] [Modifier] [🗑️]    │
   │     (vert)    (gris)   (rouge)  │
   └─────────────────────────────────┘
   ```
   - **Développer** : Ouvre IdeaDevelopPanel (en modal ou plein écran)
   - **Modifier** : Mode édition inline (comme NoteDetailModal)
   - **Supprimer** : Suppression directe

2. **IdeaProjectModal** (pour state='project')
   ```
   ┌─────────────────────────────────┐
   │ [✨ Projet]                 [X] │
   ├─────────────────────────────────┤
   │ Titre raffiné du projet         │
   │                                 │
   │ ⏱️ 2-3 heures • 💸 50€          │
   │ 💪 "Ta motivation ici"          │
   │                                 │
   │ Étapes: 2/5 terminées           │
   │ [Contexte] • Développé il y a 1j│
   ├─────────────────────────────────┤
   │ [Voir le projet] [Archiver] [🗑️]│
   │     (primary)     (gris)  (rouge)│
   └─────────────────────────────────┘
   ```

3. **IdeaArchivedModal** (pour archived)
   ```
   ┌─────────────────────────────────┐
   │ [Idée archivée]             [X] │
   ├─────────────────────────────────┤
   │ Contenu de l'idée...            │
   ├─────────────────────────────────┤
   │ [Réactiver] [Modifier] [🗑️]     │
   └─────────────────────────────────┘
   ```

4. **IdeasFullView** (comme NotesFullView)
   - Onglets : Actives | Projets | Archivées
   - Compteurs dans les onglets
   - Filtre par contexte
   - Gestion des modals selon l'état

### Intégration du développement

Deux options pour IdeaDevelopPanel :

**Option A : Modal plein écran**
- Ouvre le panel dans une modal qui prend tout l'écran
- Plus immersif pour le wizard multi-étapes
- Cohérent avec le design existant du panel

**Option B : Drawer latéral**
- Panel qui slide depuis la droite
- Permet de voir l'idée originale à gauche
- Plus complexe à implémenter

**Recommandation** : Option A (modal plein écran) pour la cohérence.

---

## Plan d'implémentation suggéré

### Phase 1 : Alignement sur le pattern (priorité haute)

1. Supprimer `app/clarte/idees/page.tsx`
2. Créer `IdeasFullView.tsx` avec onglets Actives/Projets/Archivées
3. Créer `IdeaDetailModal.tsx` pour captured/active
4. Créer `IdeaArchivedModal.tsx` pour archived
5. Mettre à jour `IdeasBlock.tsx` avec `onShowFullView`
6. Mettre à jour `clarte/page.tsx` pour utiliser IdeasFullView

### Phase 2 : Intégration du développement (priorité haute)

7. Créer `IdeaDevelopModal.tsx` qui wrap IdeaDevelopPanel
8. Connecter le bouton "Développer" de IdeaDetailModal
9. Après succès → afficher IdeaProjectModal ou naviguer vers /projects

### Phase 3 : Modal projet (priorité moyenne)

10. Créer `IdeaProjectModal.tsx`
11. Afficher metadata (temps, budget, motivation)
12. Preview des étapes
13. Lien vers page projet complète

### Phase 4 : Améliorations (priorité basse)

14. Filtre par contexte dans IdeasFullView
15. Édition inline du contenu
16. Changement de contexte

---

## Fichiers à modifier/créer

### À créer
- `components/clarte/views/IdeasFullView.tsx`
- `components/clarte/modals/IdeaDetailModal.tsx`
- `components/clarte/modals/IdeaArchivedModal.tsx`
- `components/clarte/modals/IdeaProjectModal.tsx`
- `components/clarte/modals/IdeaDevelopModal.tsx`

### À modifier
- `components/clarte/blocks/IdeasBlock.tsx` (ajouter onShowFullView)
- `app/clarte/page.tsx` (intégrer IdeasFullView, handlers)

### À supprimer
- `app/clarte/idees/` (page dédiée)

---

## Notes techniques

### Metadata d'une idée développée

```typescript
metadata: {
  development_context: {
    idea_age: 'fresh' | 'old',
    blockers: ('time' | 'budget' | 'fear' | 'energy')[],
    developed_at: string (ISO date)
  },
  original_content: string,
  refined_title: string,
  estimated_time: string,
  budget: string | null,
  motivation: string,
  steps_count: number,
  completed_steps: number
}
```

### Composants existants à réutiliser

- `ActionButton` pour les actions (Développer, Modifier, etc.)
- `IconButton` pour le bouton supprimer
- `TabBar` pour les onglets dans FullView
- `CONTEXT_CONFIG` pour les icônes/couleurs de contexte
- `formatRelativeTime` pour les dates

### Hook existant

`useIdeaDevelop` dans `features/ideas/hooks/` gère déjà :
- État du wizard (step, age, blockers)
- Appel API develop-idea
- Loading et erreurs
- Résultat du développement
