/**
 * LangExtract Actions with Node.js Runtime Support
 *
 * This file contains actions that use Node.js APIs for LangExtract processing.
 * The "use node" directive enables access to Node.js runtime for the langextract library.
 */

'use node'

import { action } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

// LangExtract types - imported dynamically to avoid Node.js API issues at module level
type AnnotatedDocument = any
type ExampleData = any

export interface LangExtractResult {
  structuredData: {
    emotions: Array<{ text: string; type: string; intensity?: string }>
    themes: Array<{ text: string; category: string; context?: string }>
    triggers: Array<{ text: string; type: string; severity?: string }>
    communication: Array<{ text: string; style: string; tone?: string }>
    relationships: Array<{ text: string; type: string; dynamic?: string }>
  }
  extractedEntities: string[]
  processingSuccess: boolean
  errorMessage?: string
}

// Feature flag for LangExtract preprocessing
const LANGEXTRACT_ENABLED = process.env.LANGEXTRACT_ENABLED === 'true'

/**
 * Action for LangExtract processing with Node.js runtime
 */
export const processWithLangExtract = action({
  args: {
    content: v.string(),
    relationshipContext: v.optional(v.string()),
    userId: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now()

    try {
      const { content, relationshipContext, userId, entryId } = args

      // Check if LangExtract is enabled
      if (!LANGEXTRACT_ENABLED) {
        const result: LangExtractResult = {
          structuredData: {
            emotions: [],
            themes: [],
            triggers: [],
            communication: [],
            relationships: [],
          },
          extractedEntities: [],
          processingSuccess: false,
          errorMessage: 'LangExtract preprocessing disabled',
        }

        return {
          success: false,
          result,
          error: 'LangExtract disabled',
          processingTimeMs: Date.now() - startTime,
        }
      }

      // Process with LangExtract
      const result = await performLangExtractProcessing(
        content,
        relationshipContext
      )
      const processingTimeMs = Date.now() - startTime

      // Record metrics using internal mutation
      await ctx.runMutation(
        internal.langextract_mutations.recordProcessingMetrics,
        {
          userId,
          entryId,
          result,
          processingTimeMs,
          fallbackUsed: false,
        }
      )

      const response: any = {
        success: result.processingSuccess,
        result,
        processingTimeMs,
      }

      if (!result.processingSuccess) {
        response.error = result.errorMessage
      }

      return response
    } catch (error) {
      const processingTimeMs = Date.now() - startTime
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      console.error('LangExtract processing failed:', error)

      // Try to record failure metrics
      try {
        const failureResult: LangExtractResult = {
          structuredData: {
            emotions: [],
            themes: [],
            triggers: [],
            communication: [],
            relationships: [],
          },
          extractedEntities: [],
          processingSuccess: false,
          errorMessage,
        }

        await ctx.runMutation(
          internal.langextract_mutations.recordProcessingMetrics,
          {
            userId: args.userId,
            entryId: args.entryId,
            result: failureResult,
            processingTimeMs,
            fallbackUsed: false,
          }
        )
      } catch (metricsError) {
        console.warn('Failed to record failure metrics:', metricsError)
      }

      return {
        success: false,
        error: errorMessage,
        processingTimeMs,
      }
    }
  },
})

/**
 * Internal function to perform the actual LangExtract processing
 */
async function performLangExtractProcessing(
  content: string,
  relationshipContext?: string
): Promise<LangExtractResult> {
  try {
    // Define extraction prompt for relationship journal entries
    const promptDescription = `
      Extract emotional and relationship information from this journal entry.
      Focus on emotions, themes, triggers, communication patterns, and relationship dynamics.
      Use exact text from the entry for extractions.
    `

    // Define examples for relationship journal analysis
    const examples: ExampleData[] = [
      {
        text: "Today I felt really frustrated when my partner didn't listen during our conversation about finances. We ended up arguing again, which makes me feel disconnected from them.",
        extractions: [
          {
            extractionClass: 'emotion',
            extractionText: 'frustrated',
            attributes: { type: 'negative', intensity: 'high' },
          },
          {
            extractionClass: 'trigger',
            extractionText: "didn't listen",
            attributes: { type: 'communication', severity: 'medium' },
          },
          {
            extractionClass: 'theme',
            extractionText: 'conversation about finances',
            attributes: { category: 'money', context: 'relationship' },
          },
          {
            extractionClass: 'communication',
            extractionText: 'arguing',
            attributes: { style: 'confrontational', tone: 'negative' },
          },
          {
            extractionClass: 'relationship',
            extractionText: 'feel disconnected',
            attributes: { type: 'emotional_distance', dynamic: 'negative' },
          },
        ],
      },
    ]

    // Add relationship context to the content if provided
    const textToAnalyze = relationshipContext
      ? `${content}\n\nRelationship context: ${relationshipContext}`
      : content

    // Import langextract library dynamically (Node.js APIs available with "use node")
    let langExtract: any
    try {
      const moduleId = 'lang' + 'extract' // Dynamic module name to avoid static analysis
      const langextractModule = await import(moduleId)
      langExtract = langextractModule.extract
    } catch (importError) {
      throw new Error(`Failed to import langextract: ${importError}`)
    }
    const result = await langExtract(textToAnalyze, {
      promptDescription,
      examples,
      modelId: 'gemini-2.5-flash',
      modelType: 'gemini',
      temperature: 0.3,
      debug: false,
    })

    // Process the results with proper validation
    if (Array.isArray(result) && result.length === 0) {
      throw new Error('Invalid LangExtract response format: empty result array')
    }

    const annotatedDoc = Array.isArray(result) ? result[0] : result
    if (!annotatedDoc || typeof annotatedDoc !== 'object') {
      throw new Error(
        'Invalid LangExtract response format: missing or invalid document structure'
      )
    }

    if (!Array.isArray(annotatedDoc.extractions)) {
      throw new Error(
        'Invalid LangExtract response format: extractions must be an array'
      )
    }

    const extractions = annotatedDoc.extractions

    // Validate extraction structure
    for (const extraction of extractions) {
      if (!extraction || typeof extraction !== 'object') {
        throw new Error(
          'Invalid LangExtract response format: extraction must be an object'
        )
      }
      if (typeof extraction.extractionText !== 'string') {
        throw new Error(
          'Invalid LangExtract response format: extractionText must be a string'
        )
      }
      if (typeof extraction.extractionClass !== 'string') {
        throw new Error(
          'Invalid LangExtract response format: extractionClass must be a string'
        )
      }
      // attributes is optional, but if present, must be an object
      if (extraction.attributes && typeof extraction.attributes !== 'object') {
        throw new Error(
          'Invalid LangExtract response format: attributes must be an object'
        )
      }
    }

    const structuredData = {
      emotions: extractions
        .filter((e: any) => e.extractionClass === 'emotion')
        .map((e: any) => ({
          text: e.extractionText,
          type: (e.attributes?.type as string) || 'unknown',
          intensity: e.attributes?.intensity as string,
        })),
      themes: extractions
        .filter((e: any) => e.extractionClass === 'theme')
        .map((e: any) => ({
          text: e.extractionText,
          category: (e.attributes?.category as string) || 'general',
          context: e.attributes?.context as string,
        })),
      triggers: extractions
        .filter((e: any) => e.extractionClass === 'trigger')
        .map((e: any) => ({
          text: e.extractionText,
          type: (e.attributes?.type as string) || 'unknown',
          severity: e.attributes?.severity as string,
        })),
      communication: extractions
        .filter((e: any) => e.extractionClass === 'communication')
        .map((e: any) => ({
          text: e.extractionText,
          style: (e.attributes?.style as string) || 'neutral',
          tone: e.attributes?.tone as string,
        })),
      relationships: extractions
        .filter((e: any) => e.extractionClass === 'relationship')
        .map((e: any) => ({
          text: e.extractionText,
          type: (e.attributes?.type as string) || 'general',
          dynamic: e.attributes?.dynamic as string,
        })),
    }

    return {
      structuredData,
      extractedEntities: extractions.map((e: any) => e.extractionText),
      processingSuccess: true,
    }
  } catch (error) {
    console.error('LangExtract preprocessing failed:', error)
    return {
      structuredData: {
        emotions: [],
        themes: [],
        triggers: [],
        communication: [],
        relationships: [],
      },
      extractedEntities: [],
      processingSuccess: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
