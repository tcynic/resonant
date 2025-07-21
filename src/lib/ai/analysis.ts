/**
 * AI analysis utilities implementing DSPy patterns
 * Core analysis functions for relationship health scoring using DSPy framework
 */

import { DSPyModule, DSPySignature } from './dspy-config'
import {
  GeminiClient,
  getGeminiClient,
  SentimentAnalysisResult,
} from './gemini-client'
// Removed unused imports from prompts
import { z } from 'zod'
import { executeAIOperation } from './recovery'
import { withMonitoring } from './monitoring'
import { aiFallback } from './fallback'
import { AIAnalysisProcessingError, AIDataValidationError } from './errors'

// DSPy Signatures following official patterns
const SentimentAnalysisSignature: DSPySignature = {
  name: 'SentimentAnalysis',
  description:
    'Analyze sentiment of relationship journal entries with emotional intelligence',
  inputs: {
    journal_entry: {
      type: 'string',
      description: "User's journal entry text about their relationship",
      required: true,
      validation: z.string().min(10).max(2000),
    },
  },
  outputs: {
    sentiment_score: {
      type: 'number',
      description:
        'Sentiment score 1-10, where 1=very negative, 10=very positive',
      required: true,
      validation: z.number().min(1).max(10),
    },
    emotions_detected: {
      type: 'array',
      description: 'List of emotions found with individual analysis',
      required: true,
      validation: z.array(z.string()),
    },
    confidence: {
      type: 'number',
      description: 'AI confidence in analysis 0-1',
      required: true,
      validation: z.number().min(0).max(1),
    },
    explanation: {
      type: 'string',
      description: 'Brief explanation of the sentiment analysis',
      required: false,
      validation: z.string().optional(),
    },
  },
  examples: [
    {
      inputs: {
        journal_entry:
          'I had a wonderful day with my partner. We laughed and felt so connected.',
      },
      outputs: {
        sentiment_score: 8.5,
        emotions_detected: ['joy', 'love', 'connection'],
        confidence: 0.92,
        explanation:
          'Very positive emotional content with strong connection indicators',
      },
    },
    {
      inputs: {
        journal_entry:
          'We had another argument today. I feel frustrated and disconnected.',
      },
      outputs: {
        sentiment_score: 2.5,
        emotions_detected: ['frustration', 'sadness', 'disconnection'],
        confidence: 0.88,
        explanation: 'Negative sentiment with conflict and emotional distance',
      },
    },
  ],
}

const EmotionalStabilitySignature: DSPySignature = {
  name: 'EmotionalStability',
  description:
    'Analyze emotional stability patterns over time in relationship dynamics',
  inputs: {
    sentiment_history: {
      type: 'array',
      description: 'Recent sentiment scores and timestamps for trend analysis',
      required: true,
      validation: z.array(
        z.object({
          score: z.number(),
          timestamp: z.number(),
          emotions: z.array(z.string()).optional(),
        })
      ),
    },
  },
  outputs: {
    stability_score: {
      type: 'number',
      description: 'Emotional stability score 0-100, higher means more stable',
      required: true,
      validation: z.number().min(0).max(100),
    },
    trend_direction: {
      type: 'string',
      description: 'Overall emotional trend: improving, declining, or stable',
      required: true,
      validation: z.enum(['improving', 'declining', 'stable']),
    },
    volatility_level: {
      type: 'string',
      description: 'Emotional volatility: low, moderate, high',
      required: true,
      validation: z.enum(['low', 'moderate', 'high']),
    },
    recovery_patterns: {
      type: 'string',
      description: 'How quickly emotions recover from negative states',
      required: true,
      validation: z.string(),
    },
  },
}

const EnergyImpactSignature: DSPySignature = {
  name: 'EnergyImpact',
  description:
    'Analyze how relationship interactions affect personal energy levels',
  inputs: {
    journal_entry: {
      type: 'string',
      description: 'Journal entry describing relationship interaction',
      required: true,
      validation: z.string().min(10).max(2000),
    },
  },
  outputs: {
    energy_score: {
      type: 'number',
      description:
        'Energy impact score 1-10, where 1=very draining, 10=very energizing',
      required: true,
      validation: z.number().min(1).max(10),
    },
    energy_indicators: {
      type: 'array',
      description: 'Specific words/phrases indicating energy impact',
      required: true,
      validation: z.array(z.string()),
    },
    overall_effect: {
      type: 'string',
      description: 'General energy effect category',
      required: true,
      validation: z.enum(['energizing', 'neutral', 'draining']),
    },
    explanation: {
      type: 'string',
      description: 'Analysis of why this interaction had the energy impact',
      required: true,
      validation: z.string(),
    },
  },
}

// Validation schemas for responses
const SentimentResponseSchema = z.object({
  sentiment_score: z.number().min(1).max(10),
  emotions_detected: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  explanation: z.string().optional(),
})

const EmotionalStabilityResponseSchema = z.object({
  stability_score: z.number().min(0).max(100),
  trend_direction: z.enum(['improving', 'declining', 'stable']),
  volatility_level: z.enum(['low', 'moderate', 'high']),
  recovery_patterns: z.string(),
})

const EnergyImpactResponseSchema = z.object({
  energy_score: z.number().min(1).max(10),
  energy_indicators: z.array(z.string()),
  overall_effect: z.enum(['energizing', 'neutral', 'draining']),
  explanation: z.string(),
})

// Enhanced DSPy Module Implementations
export class SentimentAnalysisModule extends DSPyModule {
  private geminiClient: GeminiClient

  constructor(geminiClient?: GeminiClient) {
    super(SentimentAnalysisSignature)
    this.geminiClient = geminiClient || getGeminiClient()
  }

  async forward(
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return withMonitoring(
      'sentiment_analysis',
      'sentiment',
      async () => {
        // Validate inputs using DSPy signature
        try {
          this.validateInputs(inputs)
        } catch {
          throw new AIDataValidationError(['Input validation failed'], inputs, {
            analysisType: 'sentiment',
            stage: 'input_validation',
          })
        }

        // Generate DSPy-style prompt with examples
        const prompt = this.generatePromptWithExamples(inputs)

        try {
          const response =
            await this.geminiClient.generateStructuredResponse<SentimentAnalysisResult>(
              prompt,
              {
                sentiment_score: 'number between 1-10',
                emotions_detected: 'array of emotion strings',
                confidence: 'number between 0-1',
                explanation: 'optional brief explanation',
              }
            )

          // Validate outputs using signature validation
          let validatedResponse: SentimentAnalysisResult
          try {
            validatedResponse = SentimentResponseSchema.parse(response)
            this.validateOutputs(validatedResponse)
          } catch (validationError) {
            throw new AIDataValidationError(
              validationError instanceof z.ZodError
                ? validationError.issues.map((e: z.ZodIssue) => e.message)
                : ['Response validation failed'],
              response,
              { analysisType: 'sentiment', stage: 'output_validation' }
            )
          }

          return validatedResponse as Record<string, unknown>
        } catch (error) {
          if (error instanceof AIDataValidationError) {
            throw error
          }

          throw new AIAnalysisProcessingError(
            'sentiment',
            'ai_generation',
            error instanceof Error ? error : new Error('Unknown error'),
            { journalEntry: inputs.journal_entry }
          )
        }
      },
      { journalEntry: inputs.journal_entry }
    )
  }

  private generatePromptWithExamples(inputs: Record<string, unknown>): string {
    const basePrompt = `${this.signature.description}

Task: Analyze the sentiment of the following relationship journal entry and provide:
1. A sentiment score from 1-10 (1=very negative, 10=very positive)
2. A list of emotions detected in the text
3. Your confidence level in this analysis (0-1)
4. A brief explanation of your reasoning

Examples:
${
  this.signature.examples
    ?.map(
      example => `
Input: ${example.inputs.journal_entry}
Output: ${JSON.stringify(example.outputs, null, 2)}
`
    )
    .join('\n') || ''
}

Now analyze this entry:
Journal Entry: ${inputs.journal_entry}

Respond in valid JSON format with the required fields.`

    return basePrompt
  }

  async analyzeSentiment(
    journalEntry: string
  ): Promise<SentimentAnalysisResult> {
    return executeAIOperation(
      async () => {
        const result = await this.forward({ journal_entry: journalEntry })
        return result as SentimentAnalysisResult
      },
      'sentiment_analysis',
      'sentiment',
      async () => {
        // Fallback: Use rule-based sentiment analysis
        return aiFallback.analyzeSentimentFallback(journalEntry)
      },
      { journalEntry }
    )
  }
}

export class EmotionalStabilityModule extends DSPyModule {
  private geminiClient: GeminiClient

  constructor(geminiClient?: GeminiClient) {
    super(EmotionalStabilitySignature)
    this.geminiClient = geminiClient || getGeminiClient()
  }

  async forward(
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    this.validateInputs(inputs)

    const prompt = this.generateStabilityPrompt(inputs)

    try {
      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        {
          stability_score: 'number 0-100',
          trend_direction: 'improving/declining/stable',
          volatility_level: 'low/moderate/high',
          recovery_patterns: 'string analysis',
        }
      )

      const validatedResponse = EmotionalStabilityResponseSchema.parse(response)
      this.validateOutputs(validatedResponse)

      return validatedResponse as Record<string, unknown>
    } catch (error) {
      throw new Error(
        `Emotional stability analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private generateStabilityPrompt(inputs: Record<string, unknown>): string {
    const sentimentHistory = inputs.sentiment_history as Array<{
      score: number
      timestamp: number
      emotions?: string[]
    }>

    return `${this.signature.description}

Task: Analyze emotional stability patterns from historical sentiment data.

Sentiment History (most recent first):
${sentimentHistory
  .map(
    (entry, index) => `
${index + 1}. Score: ${entry.score}/10, Date: ${new Date(entry.timestamp).toLocaleDateString()}
   Emotions: ${entry.emotions?.join(', ') || 'N/A'}
`
  )
  .join('')}

Calculate:
1. stability_score (0-100): Higher scores indicate more emotional stability
2. trend_direction: Overall pattern (improving/declining/stable)  
3. volatility_level: Emotional variability (low/moderate/high)
4. recovery_patterns: How quickly emotions recover from negative states

Consider factors:
- Consistency in scores over time
- Recovery speed after low points
- Frequency of extreme swings
- Overall trajectory

Respond in valid JSON format.`
  }

  async analyzeStability(
    sentimentHistory: Array<{
      score: number
      timestamp: number
      emotions?: string[]
    }>
  ) {
    const result = await this.forward({ sentiment_history: sentimentHistory })
    return result
  }
}

export class EnergyImpactModule extends DSPyModule {
  private geminiClient: GeminiClient

  constructor(geminiClient?: GeminiClient) {
    super(EnergyImpactSignature)
    this.geminiClient = geminiClient || getGeminiClient()
  }

  async forward(
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    this.validateInputs(inputs)

    const prompt = this.generateEnergyPrompt(inputs)

    try {
      const response = await this.geminiClient.generateStructuredResponse(
        prompt,
        {
          energy_score: 'number 1-10',
          energy_indicators: 'array of strings',
          overall_effect: 'energizing/neutral/draining',
          explanation: 'string explanation',
        }
      )

      const validatedResponse = EnergyImpactResponseSchema.parse(response)
      this.validateOutputs(validatedResponse)

      return validatedResponse as Record<string, unknown>
    } catch (error) {
      throw new Error(
        `Energy impact analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private generateEnergyPrompt(inputs: Record<string, unknown>): string {
    return `${this.signature.description}

Task: Analyze how this relationship interaction affects personal energy levels.

Journal Entry: "${inputs.journal_entry}"

Evaluate:
1. energy_score (1-10): How this interaction impacts energy (1=very draining, 10=very energizing)
2. energy_indicators: Specific words/phrases that indicate energy impact
3. overall_effect: General category (energizing/neutral/draining)  
4. explanation: Why this interaction has this energy impact

Look for indicators like:
- Energizing: excitement, motivation, happiness, fulfillment, inspiration
- Draining: exhaustion, stress, conflict, negativity, overwhelm
- Neutral: calm, routine, stable, balanced

Respond in valid JSON format.`
  }

  async analyzeEnergyImpact(journalEntry: string) {
    const result = await this.forward({ journal_entry: journalEntry })
    return result
  }
}

// DSPy-based relationship analysis orchestrator
export class RelationshipAnalyzer {
  private sentimentModule: SentimentAnalysisModule
  private stabilityModule: EmotionalStabilityModule
  private energyModule: EnergyImpactModule

  constructor(geminiClient?: GeminiClient) {
    const client = geminiClient || getGeminiClient()
    this.sentimentModule = new SentimentAnalysisModule(client)
    this.stabilityModule = new EmotionalStabilityModule(client)
    this.energyModule = new EnergyImpactModule(client)
  }

  async analyzeSentiment(
    journalEntry: string
  ): Promise<SentimentAnalysisResult> {
    return executeAIOperation(
      async () => await this.sentimentModule.analyzeSentiment(journalEntry),
      'relationship_sentiment_analysis',
      'sentiment',
      async () => aiFallback.analyzeSentimentFallback(journalEntry),
      { journalEntry }
    )
  }

  async analyzeEmotionalStability(
    sentimentHistory: Array<{
      score: number
      timestamp: number
      emotions?: string[]
    }>
  ) {
    return executeAIOperation(
      async () => await this.stabilityModule.analyzeStability(sentimentHistory),
      'emotional_stability_analysis',
      'emotional_stability',
      async () => aiFallback.analyzeStabilityFallback(sentimentHistory),
      { historyLength: sentimentHistory.length }
    )
  }

  async analyzeEnergyImpact(journalEntry: string) {
    return executeAIOperation(
      async () => await this.energyModule.analyzeEnergyImpact(journalEntry),
      'energy_impact_analysis',
      'energy_impact',
      async () => aiFallback.analyzeEnergyFallback(journalEntry),
      { journalEntry }
    )
  }

  // Comprehensive analysis following DSPy multi-stage pipeline pattern
  async analyzeJournalEntry(
    journalEntry: string,
    sentimentHistory?: Array<{
      score: number
      timestamp: number
      emotions?: string[]
    }>
  ) {
    try {
      // Stage 1: Sentiment analysis (foundation for other analyses)
      const sentiment = await this.analyzeSentiment(journalEntry)

      // Stage 2: Energy impact analysis (independent)
      const energy = await this.analyzeEnergyImpact(journalEntry)

      // Stage 3: Stability analysis (requires sentiment history)
      const stability =
        sentimentHistory && sentimentHistory.length > 0
          ? await this.analyzeEmotionalStability(sentimentHistory)
          : null

      return {
        sentiment,
        energy,
        stability,
        metadata: {
          timestamp: Date.now(),
          modules_used: [
            'sentiment',
            'energy',
            stability ? 'stability' : null,
          ].filter(Boolean),
          overall_confidence: this.calculateOverallConfidence(
            sentiment,
            energy,
            stability
          ),
        },
      }
    } catch (error) {
      throw new Error(
        `Journal entry analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // DSPy-inspired confidence calculation
  private calculateOverallConfidence(
    sentiment: SentimentAnalysisResult,
    energy: Record<string, unknown>,
    stability: Record<string, unknown> | null
  ): number {
    const confidences = [
      sentiment.confidence || 0,
      energy.confidence || 0.8, // Default confidence for energy analysis
      stability?.confidence || null,
    ].filter((c): c is number => c !== null)

    if (confidences.length === 0) return 0.5

    // Weighted average with higher weight for sentiment (primary analysis)
    const weights = stability ? [0.5, 0.25, 0.25] : [0.7, 0.3]
    const weightedSum = confidences.reduce(
      (sum, conf, index) => sum + conf * weights[index],
      0
    )
    const totalWeight = weights
      .slice(0, confidences.length)
      .reduce((sum, w) => sum + w, 0)

    return Math.round((weightedSum / totalWeight) * 100) / 100
  }
}

// Utility functions for analysis processing
export function preprocessJournalEntry(text: string): string {
  // Remove extra whitespace and normalize text
  return text.trim().replace(/\s+/g, ' ')
}

export function calculateConfidenceScore(
  sentimentConfidence: number,
  textLength: number,
  emotionCount: number
): number {
  // Adjust confidence based on text characteristics
  let adjustedConfidence = sentimentConfidence

  // Longer texts generally provide more reliable analysis
  if (textLength < 50) {
    adjustedConfidence *= 0.8
  } else if (textLength > 200) {
    adjustedConfidence = Math.min(adjustedConfidence * 1.1, 1.0)
  }

  // More detected emotions can indicate complexity but also richness
  if (emotionCount > 4) {
    adjustedConfidence *= 0.95
  }

  return Math.max(0, Math.min(1, adjustedConfidence))
}

export function validateAnalysisResult(
  result: unknown,
  schema: z.ZodSchema
): boolean {
  try {
    schema.parse(result)
    return true
  } catch (error) {
    console.error('Analysis result validation failed:', error)
    return false
  }
}

// Export singleton analyzer instance
let defaultAnalyzer: RelationshipAnalyzer | null = null

export function getRelationshipAnalyzer(
  geminiClient?: GeminiClient
): RelationshipAnalyzer {
  if (!defaultAnalyzer || geminiClient) {
    defaultAnalyzer = new RelationshipAnalyzer(geminiClient)
  }
  return defaultAnalyzer
}
