/**
 * Google Gemini Flash API client for AI text analysis
 * Provides authenticated access to Gemini API with error handling and rate limiting
 */

import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
} from '@google/generative-ai'
import { AIModelConfig, defaultAIConfig } from './dspy-config'
import { withRateLimit, getAIRateLimiter } from './rate-limiter'
import { checkBudget, getAICostTracker } from './cost-tracker'
import { AnalysisType } from '../types'

export class GeminiAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'GeminiAPIError'
  }
}

export class GeminiRateLimitError extends GeminiAPIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429)
    this.name = 'GeminiRateLimitError'
  }
}

export interface GeminiResponse {
  text: string
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
  finishReason?: string
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI
  private model!: GenerativeModel
  private config: AIModelConfig
  private requestCount: number = 0
  private lastRequestTime: number = 0
  private readonly maxRequestsPerMinute: number = 60

  constructor(apiKey?: string, config?: Partial<AIModelConfig>) {
    const finalApiKey = apiKey || process.env.GOOGLE_GEMINI_API_KEY

    if (!finalApiKey) {
      throw new GeminiAPIError('Google Gemini API key is required')
    }

    this.config = {
      ...defaultAIConfig,
      apiKey: finalApiKey,
      ...config,
    }

    this.genAI = new GoogleGenerativeAI(this.config.apiKey)
    this.initializeModel()
  }

  private initializeModel(): void {
    const generationConfig: GenerationConfig = {
      temperature: this.config.temperature,
      topP: this.config.topP,
      topK: this.config.topK,
      maxOutputTokens: this.config.maxTokens,
    }

    this.model = this.genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig,
    })
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    // Reset counter every minute
    if (timeSinceLastRequest > 60000) {
      this.requestCount = 0
    }

    if (this.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - timeSinceLastRequest
      if (waitTime > 0) {
        throw new GeminiRateLimitError(
          `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`
        )
      }
    }

    this.requestCount++
    this.lastRequestTime = now
  }

  async generateContent(
    prompt: string,
    analysisType: AnalysisType = 'sentiment',
    userId?: string,
    organizationId?: string
  ): Promise<GeminiResponse> {
    // Estimate token usage for rate limiting and budget checks
    const estimatedTokens = Math.ceil(prompt.length / 4) + 500 // Rough estimation
    const costTracker = getAICostTracker()
    const rateLimiter = getAIRateLimiter()

    // Estimate cost (in cents)
    const estimatedCost = Math.ceil(
      ((estimatedTokens * 0.7) / 1000) * 0.035 * 100 + // Input tokens
        ((estimatedTokens * 0.3) / 1000) * 0.105 * 100 + // Output tokens
        0.01 * 100 // Base request cost
    )

    // Check budget before proceeding
    await checkBudget(analysisType, estimatedCost, userId, organizationId)

    // Use rate limiting wrapper
    return withRateLimit(
      async () => {
        try {
          await this.enforceRateLimit()

          const startTime = Date.now()
          const result = await this.model.generateContent(prompt)
          const processingTime = Date.now() - startTime

          if (!result.response) {
            throw new GeminiAPIError('No response received from Gemini API')
          }

          const response = result.response
          const text = response.text()

          if (!text) {
            throw new GeminiAPIError('Empty response from Gemini API')
          }

          // Get actual usage for cost tracking
          const usage = response.usageMetadata
          const actualTokens = usage?.totalTokenCount || estimatedTokens
          const actualCost = this.calculateActualCost(
            usage?.promptTokenCount || Math.ceil(estimatedTokens * 0.7),
            usage?.candidatesTokenCount || Math.ceil(estimatedTokens * 0.3)
          )

          // Record actual cost
          costTracker.recordCost({
            analysisType,
            operation: 'generateContent',
            inputTokens:
              usage?.promptTokenCount || Math.ceil(estimatedTokens * 0.7),
            outputTokens:
              usage?.candidatesTokenCount || Math.ceil(estimatedTokens * 0.3),
            totalTokens: actualTokens,
            estimatedCost,
            actualCost,
            userId,
            organizationId,
            metadata: {
              prompt: prompt.substring(0, 100), // First 100 chars for debugging
              processingTime,
              finishReason: response.candidates?.[0]?.finishReason,
            },
          })

          // Record usage with rate limiter
          rateLimiter.recordUsage(actualTokens, actualCost)

          return {
            text,
            usageMetadata: usage,
            finishReason: response.candidates?.[0]?.finishReason,
          }
        } catch (error) {
          // Handle specific API errors
          if (error instanceof Error) {
            if (
              error.message.includes('quota') ||
              error.message.includes('rate')
            ) {
              throw new GeminiRateLimitError(error.message)
            }
            if (error.message.includes('RESOURCE_EXHAUSTED')) {
              throw new GeminiRateLimitError('API quota exhausted')
            }
            if (error.message.includes('invalid API key')) {
              throw new GeminiAPIError('Invalid API key', 401, error)
            }

            throw new GeminiAPIError(
              `Gemini API error: ${error.message}`,
              undefined,
              error
            )
          }

          throw new GeminiAPIError('Unknown Gemini API error', undefined, error)
        }
      },
      analysisType,
      estimatedTokens,
      'normal'
    )
  }

  private calculateActualCost(
    inputTokens: number,
    outputTokens: number
  ): number {
    const inputCost = (inputTokens / 1000) * 0.035 // $0.000035 per token
    const outputCost = (outputTokens / 1000) * 0.105 // $0.000105 per token
    const baseCost = 0.01 // $0.0001 per request

    // Return cost in cents
    return Math.ceil((inputCost + outputCost + baseCost) * 100)
  }

  async generateWithRetry(
    prompt: string,
    analysisType: AnalysisType = 'sentiment',
    userId?: string,
    organizationId?: string,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<GeminiResponse> {
    let lastError: Error = new Error('No attempts made')

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.generateContent(
          prompt,
          analysisType,
          userId,
          organizationId
        )
      } catch (error) {
        lastError = error as Error

        // Don't retry on certain errors
        if (
          error instanceof GeminiAPIError &&
          (error.statusCode === 401 || error.statusCode === 400)
        ) {
          throw error
        }

        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw new GeminiAPIError(
      `Failed after ${maxRetries} attempts: ${lastError!.message}`,
      undefined,
      lastError
    )
  }

  // Helper method for structured JSON responses
  async generateStructuredResponse<T extends Record<string, unknown>>(
    prompt: string,
    schema: { [K in keyof T]: string },
    analysisType: AnalysisType = 'sentiment',
    userId?: string,
    organizationId?: string
  ): Promise<T> {
    const structuredPrompt = `${prompt}

Please respond in valid JSON format with the following structure:
${JSON.stringify(schema, null, 2)}

Ensure your response is valid JSON and includes all required fields.`

    const response = await this.generateWithRetry(
      structuredPrompt,
      analysisType,
      userId,
      organizationId
    )

    try {
      const parsed = JSON.parse(response.text) as T

      // Basic validation that all schema keys exist
      for (const key of Object.keys(schema)) {
        if (!(key in parsed)) {
          throw new Error(`Missing required field: ${key}`)
        }
      }

      return parsed
    } catch (error) {
      throw new GeminiAPIError(
        `Failed to parse structured response: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
        undefined,
        error
      )
    }
  }

  // Get current configuration
  getConfig(): Readonly<AIModelConfig> {
    return { ...this.config }
  }

  // Update configuration
  updateConfig(newConfig: Partial<AIModelConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.initializeModel()
  }

  // Get usage statistics
  getUsageStats(): { requestCount: number; lastRequestTime: number } {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
    }
  }
}

// Singleton instance for default usage
let defaultClient: GeminiClient | null = null

export function getGeminiClient(
  apiKey?: string,
  config?: Partial<AIModelConfig>
): GeminiClient {
  if (!defaultClient || apiKey || config) {
    defaultClient = new GeminiClient(apiKey, config)
  }
  return defaultClient
}

// Type definitions for AI analysis results
export interface SentimentAnalysisResult extends Record<string, unknown> {
  sentiment_score: number
  emotions_detected: string[]
  confidence: number
  explanation?: string
}

export interface AnalysisMetadata {
  modelVersion: string
  processingTime: number
  tokenCount?: number
  apiCosts?: number
}
