'use client'

import { useState, useCallback } from 'react'
import type {
  Item,
  Mood,
  AIAnalyzedItem,
  AIAnalysisResult,
  CreateItemInput
} from '@/types/items'
import { createItem, createItems } from '@/services/supabase/items.service'
import { addMultipleToDefaultShoppingList } from '@/services/supabase/shopping-lists.service'
import { analyzeCapture, analyzeWithRules } from '@/services/ai/analysis.service'

interface UseItemCaptureOptions {
  onCaptureSuccess?: (items: Item[]) => void
  onCaptureError?: (error: Error) => void
  onAnalysisComplete?: (result: AIAnalysisResult) => void
}

interface UseItemCaptureReturn {
  // État
  isCapturing: boolean
  isAnalyzing: boolean
  error: Error | null
  lastCapturedItems: Item[]
  analysisResult: AIAnalysisResult | null

  // Actions
  captureAndAnalyze: (text: string, mood?: Mood) => Promise<Item[]>
  captureRaw: (text: string, mood?: Mood) => Promise<Item>
  analyzeText: (text: string) => Promise<AIAnalysisResult>
  saveAnalyzedItems: (items: AIAnalyzedItem[], mood?: Mood) => Promise<Item[]>
  clearError: () => void
}

export function useItemCapture(options: UseItemCaptureOptions = {}): UseItemCaptureReturn {
  const { onCaptureSuccess, onCaptureError, onAnalysisComplete } = options

  const [isCapturing, setIsCapturing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastCapturedItems, setLastCapturedItems] = useState<Item[]>([])
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null)

  const clearError = useCallback(() => setError(null), [])

  /**
   * Analyse un texte avec l'IA (ou fallback règles)
   */
  const analyzeText = useCallback(async (text: string): Promise<AIAnalysisResult> => {
    setIsAnalyzing(true)
    setError(null)

    try {
      // Essayer l'analyse IA via API
      const result = await analyzeCapture(text)
      setAnalysisResult(result)
      onAnalysisComplete?.(result)
      return result
    } catch (err) {
      console.error('AI analysis failed, using rules:', err)
      // Fallback sur règles basiques
      const fallbackResult = analyzeWithRules(text)
      setAnalysisResult(fallbackResult)
      onAnalysisComplete?.(fallbackResult)
      return fallbackResult
    } finally {
      setIsAnalyzing(false)
    }
  }, [onAnalysisComplete])

  /**
   * Sauvegarde les items analysés en base
   */
  const saveAnalyzedItems = useCallback(async (
    items: AIAnalyzedItem[],
    mood?: Mood
  ): Promise<Item[]> => {
    setIsCapturing(true)
    setError(null)

    try {
      const savedItems: Item[] = []

      // Séparer list_items des autres
      const listItems = items.filter(i => i.type === 'list_item')
      const otherItems = items.filter(i => i.type !== 'list_item')

      // Sauvegarder les list_items dans la liste de courses
      if (listItems.length > 0) {
        const contents = listItems.map(i => i.content)
        const createdListItems = await addMultipleToDefaultShoppingList(contents)
        savedItems.push(...createdListItems)
      }

      // Sauvegarder les autres items
      if (otherItems.length > 0) {
        const inputs: CreateItemInput[] = otherItems.map(item => ({
          type: item.type,
          state: item.state,
          content: item.content,
          context: item.context,
          ai_analysis: item.ai_analysis,
          metadata: item.metadata || {},
          mood
        }))

        const createdItems = await createItems(inputs)
        savedItems.push(...createdItems)
      }

      setLastCapturedItems(savedItems)
      onCaptureSuccess?.(savedItems)
      return savedItems

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Capture failed')
      setError(error)
      onCaptureError?.(error)
      throw error
    } finally {
      setIsCapturing(false)
    }
  }, [onCaptureSuccess, onCaptureError])

  /**
   * Capture un texte brut sans analyse (état captured)
   */
  const captureRaw = useCallback(async (text: string, mood?: Mood): Promise<Item> => {
    setIsCapturing(true)
    setError(null)

    try {
      const item = await createItem({
        type: 'task', // Par défaut, sera déterminé par l'analyse plus tard
        state: 'captured',
        content: text,
        mood
      })

      setLastCapturedItems([item])
      onCaptureSuccess?.([item])
      return item

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Capture failed')
      setError(error)
      onCaptureError?.(error)
      throw error
    } finally {
      setIsCapturing(false)
    }
  }, [onCaptureSuccess, onCaptureError])

  /**
   * Capture et analyse un texte en une seule opération
   */
  const captureAndAnalyze = useCallback(async (
    text: string,
    mood?: Mood
  ): Promise<Item[]> => {
    // 1. Analyser
    const result = await analyzeText(text)

    // 2. Sauvegarder les items analysés
    const savedItems = await saveAnalyzedItems(result.items, mood)

    return savedItems
  }, [analyzeText, saveAnalyzedItems])

  return {
    isCapturing,
    isAnalyzing,
    error,
    lastCapturedItems,
    analysisResult,
    captureAndAnalyze,
    captureRaw,
    analyzeText,
    saveAnalyzedItems,
    clearError
  }
}
