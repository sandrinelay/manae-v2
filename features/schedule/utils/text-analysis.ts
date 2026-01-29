/**
 * Analyse sémantique du contenu des tâches
 *
 * Ce module centralise toute la détection de patterns dans le texte :
 * - Charge cognitive (complexe, admin, créatif)
 * - Contraintes de service (médecin, mairie, commerces)
 */

// ============================================
// TYPES
// ============================================

export type CognitiveLoad = 'high' | 'medium' | 'low'

export interface ServiceConstraints {
  type: 'medical' | 'administrative' | 'commercial'
  openDays: string[]
  openHours: { start: string; end: string }
}

export interface TaskAnalysis {
  cognitiveLoad: CognitiveLoad
  serviceConstraints: ServiceConstraints | null
}

// ============================================
// CONSTANTES - CHARGE COGNITIVE
// ============================================

/**
 * Mots-clés indiquant une charge cognitive élevée
 * Tâches nécessitant réflexion, créativité, concentration
 */
const HIGH_COGNITIVE_KEYWORDS = [
  // Réflexion & Stratégie
  'réfléchir', 'penser', 'analyser', 'étudier', 'évaluer',
  'stratégie', 'planifier', 'concevoir', 'définir',

  // Création & Innovation
  'créer', 'rédiger', 'écrire', 'composer', 'développer',
  'imaginer', 'inventer', 'innover', 'design',

  // Apprentissage & Compréhension
  'apprendre', 'comprendre', 'assimiler', 'étudier', 'réviser',
  'formation', 'cours', 'étude',

  // Décision & Résolution
  'décider', 'choisir', 'résoudre', 'trouver solution',
  'problème complexe', 'casse-tête',

  // Documents complexes
  'rapport', 'présentation', 'projet', 'dossier',
  'budget', 'bilan', 'synthèse', 'analyse'
]

/**
 * Mots-clés indiquant une charge cognitive faible
 * Tâches administratives, routinières, simples
 */
const LOW_COGNITIVE_KEYWORDS = [
  // Administratif
  'appeler', 'téléphoner', 'envoyer email', 'mail',
  'répondre', 'confirmer', 'valider', 'signer',

  // Courses & Achats
  'acheter', 'courses', 'shopping', 'commander',
  'récupérer', 'chercher', 'déposer',

  // Tâches ménagères
  'ranger', 'nettoyer', 'laver', 'trier',
  'vider', 'jeter', 'plier',

  // Routine
  'rdv', 'rendez-vous', 'dentiste', 'médecin',
  'coiffeur', 'pressing', 'poste',

  // Actions simples
  'payer', 'imprimer', 'scanner', 'photocopier',
  'relire', 'vérifier', 'consulter'
]

// ============================================
// CONSTANTES - SERVICES
// ============================================

/**
 * Patterns de détection des services avec horaires spécifiques
 */
const SERVICE_PATTERNS = {
  // Services médicaux (Lun-Ven, 9h-18h)
  medical: {
    keywords: [
      'médecin', 'dentiste', 'pédiatre', 'docteur', 'rdv médical',
      'clinique', 'hôpital', 'cabinet', 'ophtalmo', 'dermato',
      'kiné', 'ostéo', 'radiologue', 'labo', 'laboratoire',
      'vétérinaire', 'véto'
    ],
    openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    openHours: { start: '09:00', end: '18:00' }
  },

  // Services administratifs (Lun-Sam, 9h-16h30)
  administrative: {
    keywords: [
      'mairie', 'préfecture', 'caf', 'pôle emploi', 'pole emploi', 'sécurité sociale',
      'banque', 'notaire', 'avocat', 'assurance', 'impôts',
      'poste', 'la poste', 'bureau de poste',
      'carte d\'identité', 'passeport', 'permis',
      'école', 'crèche', 'périscolaire', 'cantine', 'garderie',
      'maternelle', 'primaire', 'collège', 'lycée',
      'déchetterie', 'dechetterie', 'déchèterie', 'decheterie'
    ],
    openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    openHours: { start: '09:00', end: '16:30' }
  },

  // Commerces (Lun-Sam, 9h-19h)
  commercial: {
    keywords: [
      'magasin', 'boutique', 'acheter', 'courses', 'supermarché',
      'boulangerie', 'pharmacie', 'pressing', 'coiffeur',
      'garagiste', 'contrôle technique', 'mécanicien',
      'carrossier', 'pneus', 'vidange', 'garage auto', 'garage voiture'
    ],
    openDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    openHours: { start: '09:00', end: '19:00' }
  }
}

// ============================================
// DÉTECTION - CHARGE COGNITIVE
// ============================================

/**
 * Détecte la charge cognitive d'une tâche depuis son contenu
 *
 * @param text - Contenu de la tâche
 * @returns CognitiveLoad ('high', 'medium', 'low')
 */
export function detectCognitiveLoad(text: string): CognitiveLoad {
  const lowerText = text.toLowerCase()

  // Compter les occurrences de mots-clés
  const highMatches = HIGH_COGNITIVE_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword.toLowerCase())
  ).length

  const lowMatches = LOW_COGNITIVE_KEYWORDS.filter(keyword =>
    lowerText.includes(keyword.toLowerCase())
  ).length

  // Logique de décision
  if (highMatches > 0 && lowMatches === 0) {
    return 'high'
  }

  if (lowMatches > 0 && highMatches === 0) {
    return 'low'
  }

  // Si les deux ou aucun des deux → medium (par défaut)
  return 'medium'
}

// ============================================
// DÉTECTION - SERVICES
// ============================================

/**
 * Détecte les contraintes de service (horaires d'ouverture)
 *
 * @param text - Contenu de la tâche
 * @returns ServiceConstraints | null
 */
export function detectServiceConstraints(text: string): ServiceConstraints | null {
  const lowerText = text.toLowerCase()

  // Parcourir les types de services
  for (const [type, config] of Object.entries(SERVICE_PATTERNS)) {
    const hasMatch = config.keywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase())
    )

    if (hasMatch) {
      return {
        type: type as 'medical' | 'administrative' | 'commercial',
        openDays: config.openDays,
        openHours: config.openHours
      }
    }
  }

  return null
}

// ============================================
// API PRINCIPALE
// ============================================

/**
 * Analyse complète du contenu d'une tâche
 * Détecte à la fois la charge cognitive et les contraintes de service
 *
 * @param text - Contenu de la tâche
 * @returns TaskAnalysis
 */
export function analyzeTaskContent(text: string): TaskAnalysis {
  return {
    cognitiveLoad: detectCognitiveLoad(text),
    serviceConstraints: detectServiceConstraints(text)
  }
}
