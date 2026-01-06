/**
 * Point d'entrée centralisé pour tous les prompts
 */

// Types
export type {
  ExtractedData,
  TemporalConstraintAPI,
  AnalyzedItemAPI,
  AnalysisResponseAPI,
  DevelopIdeaResponseAPI,
  PromptConfig,
  AnalysisContext,
  DevelopIdeaContext
} from './types'

// Prompts système
export {
  BASE_PERSONA,
  JSON_ONLY_RULE,
  ANALYSIS_SYSTEM,
  DEVELOP_IDEA_SYSTEM
} from './system'

// Analyse de pensées
export {
  ANALYZE_CONFIG,
  buildAnalyzePrompt,
  SYSTEM_PROMPT
} from './analyze'

// Développement d'idées
export {
  DEVELOP_IDEA_CONFIG,
  buildDevelopIdeaPrompt
} from './develop-idea'
