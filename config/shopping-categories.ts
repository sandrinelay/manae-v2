/**
 * Configuration des catégories de courses
 * Utilisé pour le tri, l'affichage et l'auto-catégorisation IA
 */

import {
  BreadIcon,
  MilkIcon,
  MeatIcon,
  AppleIcon,
  PackageIcon,
  SnowflakeIcon,
  SparklesIcon,
  SprayCanIcon,
  WineIcon,
  BoxIcon
} from '@/components/ui/icons'

// Types
export type ShoppingCategory =
  | 'bakery'
  | 'dairy'
  | 'meat'
  | 'produce'
  | 'grocery'
  | 'frozen'
  | 'hygiene'
  | 'household'
  | 'drinks'
  | 'other'

// Configuration de chaque catégorie
export interface ShoppingCategoryConfig {
  icon: React.FC<{ className?: string }>
  label: string
  colorClass: string
  bgClass: string
  keywords: string[] // Pour l'auto-catégorisation IA
}

export const SHOPPING_CATEGORY_CONFIG: Record<ShoppingCategory, ShoppingCategoryConfig> = {
  bakery: {
    icon: BreadIcon,
    label: 'Boulangerie',
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50',
    keywords: ['pain', 'baguette', 'croissant', 'brioche', 'viennoiserie', 'biscotte', 'toast', 'mie', 'céréales', 'muesli', 'farine', 'levure']
  },
  dairy: {
    icon: MilkIcon,
    label: 'Produits laitiers',
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-50',
    keywords: ['lait', 'yaourt', 'fromage', 'beurre', 'crème', 'œuf', 'oeuf', 'oeufs', 'œufs', 'margarine', 'mascarpone', 'ricotta', 'mozzarella', 'parmesan', 'gruyère', 'emmental', 'camembert', 'chèvre', 'feta']
  },
  meat: {
    icon: MeatIcon,
    label: 'Viandes & Poissons',
    colorClass: 'text-red-500',
    bgClass: 'bg-red-50',
    keywords: ['poulet', 'bœuf', 'boeuf', 'porc', 'agneau', 'veau', 'dinde', 'canard', 'jambon', 'bacon', 'lardons', 'saucisse', 'merguez', 'steak', 'escalope', 'côtelette', 'filet', 'poisson', 'saumon', 'thon', 'cabillaud', 'crevette', 'moule', 'fruits de mer']
  },
  produce: {
    icon: AppleIcon,
    label: 'Fruits & Légumes',
    colorClass: 'text-green-600',
    bgClass: 'bg-green-100',
    keywords: ['pomme', 'banane', 'orange', 'citron', 'fraise', 'framboise', 'raisin', 'poire', 'pêche', 'abricot', 'cerise', 'mangue', 'ananas', 'kiwi', 'melon', 'pastèque', 'tomate', 'salade', 'laitue', 'carotte', 'courgette', 'aubergine', 'poivron', 'oignon', 'ail', 'pomme de terre', 'patate', 'haricot', 'petit pois', 'brocoli', 'chou', 'épinard', 'concombre', 'avocat', 'champignon', 'poireau', 'céleri', 'radis', 'betterave', 'navet', 'courge', 'citrouille']
  },
  grocery: {
    icon: PackageIcon,
    label: 'Épicerie',
    colorClass: 'text-orange-500',
    bgClass: 'bg-orange-50',
    keywords: ['pâtes', 'riz', 'semoule', 'quinoa', 'boulgour', 'lentilles', 'haricots secs', 'conserve', 'sauce', 'ketchup', 'mayonnaise', 'moutarde', 'vinaigre', 'huile', 'sel', 'poivre', 'épice', 'sucre', 'miel', 'confiture', 'nutella', 'chocolat', 'bonbon', 'biscuit', 'gâteau', 'chips', 'apéritif']
  },
  frozen: {
    icon: SnowflakeIcon,
    label: 'Surgelés',
    colorClass: 'text-cyan-500',
    bgClass: 'bg-cyan-50',
    keywords: ['surgelé', 'glace', 'pizza surgelée', 'frites', 'légumes surgelés', 'poisson pané', 'nuggets', 'cordon bleu', 'crème glacée', 'sorbet']
  },
  hygiene: {
    icon: SparklesIcon,
    label: 'Hygiène',
    colorClass: 'text-pink-500',
    bgClass: 'bg-pink-50',
    keywords: ['shampoing', 'shampooing', 'savon', 'gel douche', 'dentifrice', 'brosse à dents', 'déodorant', 'rasoir', 'mousse à raser', 'coton', 'mouchoir', 'papier toilette', 'serviette hygiénique', 'tampon', 'crème', 'lotion', 'parfum']
  },
  household: {
    icon: SprayCanIcon,
    label: 'Entretien',
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-50',
    keywords: ['lessive', 'adoucissant', 'liquide vaisselle', 'éponge', 'javel', 'nettoyant', 'désinfectant', 'balai', 'serpillière', 'sac poubelle', 'aluminium', 'film alimentaire', 'sopalin', 'essuie-tout']
  },
  drinks: {
    icon: WineIcon,
    label: 'Boissons',
    colorClass: 'text-violet-500',
    bgClass: 'bg-violet-50',
    keywords: ['eau', 'jus', 'soda', 'coca', 'limonade', 'sirop', 'café', 'thé', 'tisane', 'vin', 'bière', 'alcool', 'apéritif', 'whisky', 'vodka', 'rhum', 'champagne']
  },
  other: {
    icon: BoxIcon,
    label: 'Autre',
    colorClass: 'text-gray-500',
    bgClass: 'bg-gray-50',
    keywords: []
  }
}

// Ordre d'affichage des catégories
export const SHOPPING_CATEGORY_ORDER: ShoppingCategory[] = [
  'produce',
  'dairy',
  'meat',
  'bakery',
  'grocery',
  'frozen',
  'drinks',
  'hygiene',
  'household',
  'other'
]

// Liste des catégories pour les sélecteurs
export const SHOPPING_CATEGORIES: ShoppingCategory[] = [
  'bakery',
  'dairy',
  'meat',
  'produce',
  'grocery',
  'frozen',
  'hygiene',
  'household',
  'drinks',
  'other'
]

/**
 * Détecte automatiquement la catégorie d'un article de courses
 * Basé sur les mots-clés configurés
 */
export function detectShoppingCategory(content: string): ShoppingCategory {
  const normalizedContent = content.toLowerCase().trim()

  for (const [category, config] of Object.entries(SHOPPING_CATEGORY_CONFIG)) {
    if (category === 'other') continue // Skip 'other' as it's the fallback

    for (const keyword of config.keywords) {
      if (normalizedContent.includes(keyword.toLowerCase())) {
        return category as ShoppingCategory
      }
    }
  }

  return 'other'
}

/**
 * Nettoie le contenu d'un article de courses
 * Supprime les préfixes courants comme "acheter", "prendre", etc.
 */
export function cleanShoppingItemContent(content: string): string {
  const prefixesToRemove = [
    /^acheter\s+(du|de la|des|de l['']|le|la|les|un|une)?\s*/i,
    /^prendre\s+(du|de la|des|de l['']|le|la|les|un|une)?\s*/i,
    /^achète\s+(du|de la|des|de l['']|le|la|les|un|une)?\s*/i,
    /^prends\s+(du|de la|des|de l['']|le|la|les|un|une)?\s*/i,
    /^il\s+(me\s+)?faut\s+(du|de la|des|de l['']|le|la|les|un|une)?\s*/i,
    /^je\s+(dois|veux)\s+acheter\s+(du|de la|des|de l['']|le|la|les|un|une)?\s*/i,
    /^penser\s+[àa]\s+acheter\s+(du|de la|des|de l['']|le|la|les|un|une)?\s*/i,
    /^(du|de la|des|de l[''])\s+/i
  ]

  let cleaned = content.trim()

  for (const regex of prefixesToRemove) {
    cleaned = cleaned.replace(regex, '')
  }

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  return cleaned
}
