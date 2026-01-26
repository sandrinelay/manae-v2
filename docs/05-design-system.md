# 05 - Design System

> Documentation complète du design system CSS et charte graphique

---

## 1. Variables CSS (`styles/globals.css`)

### 1.1 Couleurs

```css
:root {
  /* Base */
  --background: #fefefe;
  --foreground: #171717;

  /* Brand */
  --primary: #4A7488;              /* Bleu-gris principal */
  --primary-dark: #4A7488;
  --secondary: #BEE5D3;            /* Vert menthe secondaire */
  --secondary-light: #BEE5D3;

  /* Backgrounds */
  --bg-mint: #F2F5F7;              /* Fond général app */
  --bg-white: #FFFFFF;
  --bg-gray: #F2F5F7;

  /* Text */
  --text-dark: #333538;            /* Texte principal */
  --text-medium: #333538;
  --text-muted: #a8a8af;           /* Texte secondaire */

  /* Borders */
  --border-light: #E2E8F0;
  --border-primary: #4A7488;

  /* Accent (highlights, alerts) */
  --accent: #A03884;               /* Violet pour accents */
  --accent-light: #F9F0F7;
  --accent-medium: #DDB8D4;
  --accent-dark: #6B245A;

  /* Mood colors */
  --mood-energetic: #E89B6C;       /* Orange */
  --mood-calm: #7EB89E;            /* Vert */
  --mood-overwhelmed: #E07B7B;     /* Rouge */
  --mood-tired: #8E9AAF;           /* Gris-bleu */
}
```

### 1.2 Usage dans Tailwind

```tsx
// ✅ CORRECT : Utiliser variables CSS
<div className="bg-[var(--color-primary)] text-[var(--color-text-dark)]">

// ❌ INTERDIT : Valeurs hardcodées
<div className="bg-[#4A7488] text-[#333538]">
```

---

## 2. Typographie

### 2.1 Fonts

```css
--font-sans: var(--font-nunito);         /* Corps de texte */
--font-quicksand: var(--font-quicksand); /* Titres */
```

**Chargement** (`app/layout.tsx`) :
```tsx
import { Nunito, Quicksand } from 'next/font/google'

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito'
})

const quicksand = Quicksand({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-quicksand'
})
```

### 2.2 Classes Typography

```css
/* Titres principaux (h1, h2) */
.typo-title {
  font-family: var(--font-quicksand), sans-serif;
  font-weight: 700;
  color: var(--color-text-dark);
}

.typo-title-lg {
  font-family: var(--font-quicksand), sans-serif;
  font-size: 1.5rem;      /* 24px */
  font-weight: 700;
}

.typo-title-md {
  font-family: var(--font-quicksand), sans-serif;
  font-size: 1.25rem;     /* 20px */
  font-weight: 600;
}

.typo-title-sm {
  font-family: var(--font-quicksand), sans-serif;
  font-size: 1.125rem;    /* 18px */
  font-weight: 600;
}

/* Labels de section (TÂCHES, NOTES, etc.) */
.typo-section-label {
  font-family: var(--font-quicksand), sans-serif;
  font-size: 0.75rem;     /* 12px */
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-primary);
}

/* Labels formulaires */
.typo-form-label {
  font-family: var(--font-quicksand), sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: var(--color-text-dark);
}

/* Textes d'aide */
.typo-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Titres de cartes */
.typo-card-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-dark);
  line-height: 1.375;
}

/* Contenu modales */
.typo-modal-content {
  font-size: 1.125rem;    /* 18px */
  color: var(--color-text-dark);
}

/* Métadonnées (contexte, date) */
.typo-metadata {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

/* Onglets */
.typo-tab {
  font-size: 0.875rem;    /* 14px */
  font-weight: 500;
}

/* Messages vides */
.typo-empty {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
```

---

## 3. Spacing & Border Radius

### 3.1 Border Radius

```css
--radius-sm: 0.5rem;     /* 8px */
--radius-md: 0.75rem;    /* 12px */
--radius-lg: 1rem;       /* 16px */
--radius-xl: 1.5rem;     /* 24px */
--radius-full: 9999px;   /* Circulaire */
```

**Usage** :
- Cards : `rounded-2xl` (24px)
- Modales : `rounded-2xl`
- Boutons : `rounded-xl` ou `rounded-full`
- Inputs : `rounded-xl`

### 3.2 Spacing

Utiliser l'échelle Tailwind standard :
- `p-2` = 8px
- `p-4` = 16px
- `p-6` = 24px
- `gap-2`, `gap-3`, `gap-4`...

---

## 4. Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
```

**Usage** :
- Cards : `shadow-md`
- Modales : `shadow-2xl`
- Dropdowns : `shadow-lg`

---

## 5. Animations

### 5.1 Keyframes

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes checkDraw {
  0% { stroke-dasharray: 0, 100; }
  100% { stroke-dasharray: 100, 0; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.8); }
  70% { transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1); }
}
```

### 5.2 Classes Utilitaires

```css
.animate-fadeIn { animation: fadeIn 0.3s ease-out; }
.animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.animate-pop-in { animation: pop-in 0.3s ease-out forwards; }
.animate-pulse { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
.animate-spin { animation: spin 1s linear infinite; }
```

### 5.3 Staggered Animations

```css
.stagger-1 { animation-delay: 0.03s; }
.stagger-2 { animation-delay: 0.06s; }
.stagger-3 { animation-delay: 0.09s; }
.stagger-4 { animation-delay: 0.12s; }
.stagger-5 { animation-delay: 0.15s; }
```

**Usage** :
```tsx
{items.map((item, i) => (
  <div key={item.id} className={`animate-slide-in-right stagger-${i+1}`}>
    {item.content}
  </div>
))}
```

---

## 6. Couleurs Contexte

```typescript
// config/contexts.ts
export const CONTEXT_CONFIG = {
  personal: {
    icon: HomeIcon,
    label: 'Personnel',
    colorClass: 'text-slate-500'
  },
  family: {
    icon: UsersIcon,
    label: 'Famille',
    colorClass: 'text-teal-500'
  },
  work: {
    icon: BriefcaseIcon,
    label: 'Travail',
    colorClass: 'text-blue-500'
  },
  health: {
    icon: ActivityIcon,
    label: 'Santé',
    colorClass: 'text-red-500'
  },
  other: {
    icon: MoreHorizontalIcon,
    label: 'Autre',
    colorClass: 'text-gray-500'
  }
}
```

---

## 7. Couleurs État Items

### 7.1 Ideas & Projects

```tsx
// Idea active
<div className="bg-yellow-100 border-yellow-300">

// Project
<div className="bg-purple-100 border-purple-300">

// Archived
<div className="bg-gray-100 border-gray-300">
```

### 7.2 Tasks

```tsx
// Active
<div className="bg-white border-gray-200">

// Planned (avec date)
<div className="bg-blue-50 border-blue-200">

// Completed
<div className="bg-green-50 border-green-200 opacity-60">

// Archived
<div className="bg-gray-100 border-gray-300">
```

---

## 8. Couleurs Catégories Courses

```typescript
// config/shopping-categories.ts
export const SHOPPING_CATEGORIES = {
  bakery: {
    icon: CakeIcon,
    label: 'Boulangerie',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50'
  },
  dairy: {
    icon: MilkIcon,
    label: 'Crémerie',
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50'
  },
  meat: {
    icon: MeatIcon,
    label: 'Boucherie',
    colorClass: 'text-red-600',
    bgClass: 'bg-red-50'
  },
  produce: {
    icon: AppleIcon,
    label: 'Fruits & Légumes',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-50'
  },
  grocery: {
    icon: PackageIcon,
    label: 'Épicerie',
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50'
  },
  frozen: {
    icon: SnowflakeIcon,
    label: 'Surgelés',
    colorClass: 'text-cyan-600',
    bgClass: 'bg-cyan-50'
  },
  hygiene: {
    icon: SparklesIcon,
    label: 'Hygiène',
    colorClass: 'text-pink-600',
    bgClass: 'bg-pink-50'
  },
  household: {
    icon: HomeIcon,
    label: 'Entretien',
    colorClass: 'text-purple-600',
    bgClass: 'bg-purple-50'
  },
  drinks: {
    icon: GlassWaterIcon,
    label: 'Boissons',
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50'
  },
  baby: {
    icon: BabyIcon,
    label: 'Bébé',
    colorClass: 'text-rose-600',
    bgClass: 'bg-rose-50'
  },
  other: {
    icon: MoreHorizontalIcon,
    label: 'Autre',
    colorClass: 'text-gray-600',
    bgClass: 'bg-gray-50'
  }
}
```

---

## 9. Responsive Design

### 9.1 Breakpoints Tailwind

```css
sm: 640px   /* Tablette portrait */
md: 768px   /* Tablette landscape */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

### 9.2 Container Responsive

```css
/* Mobile first */
.app-container {
  width: 100%;
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--bg-mint);
}

/* Tablette */
@media (min-width: 640px) {
  body {
    display: flex;
    justify-content: center;
    background: #f2F3F7;
  }

  .app-container {
    max-width: 540px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .app-container {
    max-width: 480px;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.08);
    border-left: 1px solid var(--border-light);
    border-right: 1px solid var(--border-light);
  }
}
```

### 9.3 Modales Responsive

```tsx
// Mobile : Bottom sheet
<div className="fixed inset-x-0 rounded-t-3xl"
     style={{ bottom: 'calc(95px + env(safe-area-inset-bottom))' }}>

// Desktop : Centered modal
<div className="md:inset-x-4 md:max-w-lg md:mx-auto md:rounded-2xl md:top-1/2 md:-translate-y-1/2">
```

---

## 10. Icônes (Lucide React)

### 10.1 Bibliothèque Unique

**Règle absolue** : Toutes les icônes proviennent de **Lucide React**.

```typescript
// ✅ CORRECT
import { Check, X, ChevronRight, Home, Users } from 'lucide-react'

// ❌ INTERDIT
import { FaCheck } from 'react-icons/fa'  // Autre bibliothèque
<svg>...</svg>  // SVG custom
```

### 10.2 Export Centralisé

```typescript
// components/ui/icons/index.tsx
export {
  Check as CheckIcon,
  X as XIcon,
  ChevronRight as ChevronRightIcon,
  Home as HomeIcon,
  Users as UsersIcon,
  Briefcase as BriefcaseIcon,
  Activity as ActivityIcon,
  MoreHorizontal as MoreHorizontalIcon,
  // ... etc
} from 'lucide-react'
```

### 10.3 Usage Standard

```tsx
import { CheckIcon, XIcon } from '@/components/ui/icons'

<CheckIcon className="w-5 h-5 text-green-500" />
<XIcon className="w-4 h-4 text-red-500" />
```

**Tailles standards** :
- `w-4 h-4` : 16px (petite)
- `w-5 h-5` : 20px (normale)
- `w-6 h-6` : 24px (moyenne)
- `w-8 h-8` : 32px (grande)

---

## 11. Inputs & Forms

### 11.1 Input Field Standard

```css
.input-field {
  width: 100%;
  padding-block: 0.75rem;
  padding-inline: 1rem;
  font-size: 1rem;
  color: var(--color-text-dark);
  background-color: white;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  outline: none;
  transition: all 0.2s;
}

.input-field::placeholder {
  color: var(--color-text-muted);
}

.input-field:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(74, 116, 136, 0.2);
}
```

### 11.2 Alert Box

```css
.alert-box {
  background-color: var(--accent-light);
  border: 1px solid var(--accent-medium);
  border-left: 4px solid var(--accent);
  border-radius: 0.75rem;
  padding: 1rem;
}

.alert-box-title {
  color: var(--accent);
  font-size: 0.875rem;
  font-weight: 600;
}

.alert-box-text {
  color: var(--accent-dark);
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
```

---

## 12. Checklist Design

### Avant création/modification composant :

- [ ] **Variables CSS** : Aucune valeur hardcodée (couleurs, spacing)
- [ ] **Icônes** : Uniquement Lucide React
- [ ] **Composants UI** : Réutiliser existants (`Button`, `Input`, `Modal`)
- [ ] **Typography** : Classes `.typo-*` appropriées
- [ ] **Responsive** : Mobile-first avec breakpoints `md:`, `lg:`
- [ ] **Animations** : Classes `.animate-*` existantes
- [ ] **Accessibilité** : `aria-label`, `role`, labels explicites

---

*Document technique - Design System Manae*
