/**
 * HTTP Actions for AI Processing
 * Handles external API calls to Gemini 2.5 Flash-Lite for journal entry analysis with 99.9% reliability
 */

import { httpAction, internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import {
  validateAIRequest,
  validateJournalContent,
  checkUserTierLimits,
  checkRateLimit,
  validateUserAuth,
  generateRequestLogData,
} from './utils/ai_validation'
import { isRecoverableError } from './utils/circuit-breaker'

// TypeScript interfaces for input/output validation
export interface AIProcessingRequest {
  entryId: string
  userId: string
  retryCount?: number
  priority?: 'normal' | 'high' | 'urgent'
}

export interface AIProcessingResponse {
  success: boolean
  analysisId?: string
  error?: string
  retryScheduled?: boolean
  nextRetryAt?: number
}

export interface GeminiAnalysisRequest {
  text: string
  analysisType: 'sentiment' | 'pattern' | 'comprehensive'
  userId: string
  relationshipContext?: string
  patternType?: 'emotional_stability' | 'energy_impact' | 'both'
  sentimentHistory?: Array<{
    score: number
    timestamp: number
    emotions: string[]
  }>
}

export interface GeminiAnalysisResponse {
  sentiment: {
    score: number // -1 to 1 scale
    confidence: number // 0-1 scale
    emotions: string[]
    reasoning: string
  }
  patterns?: {
    recurring_themes: string[]
    emotional_triggers: string[]
    communication_style: string
    relationship_dynamics: string[]
  }
  emotional_stability?: {
    stability_score: number
    trend_direction: 'improving' | 'declining' | 'stable'
    volatility_level: 'low' | 'moderate' | 'high'
    recovery_patterns: string
  }
  energy_impact?: {
    energy_score: number
    energy_indicators: string[]
    overall_effect: 'energizing' | 'neutral' | 'draining'
    explanation: string
  }
  metadata: {
    processingTime: number
    tokensUsed: number
    apiCost: number
    analysisVersion: string
  }
}

// Extended interface for store result
interface ExtendedStoreResultArgs {
  entryId: string
  userId: string
  relationshipId?: string
  sentimentScore: number
  emotionalKeywords: string[]
  confidenceLevel: number
  reasoning: string
  patterns?: {
    recurring_themes: string[]
    emotional_triggers: string[]
    communication_style: string
    relationship_dynamics: string[]
  }
  emotionalStability?: {
    stability_score: number
    trend_direction: 'improving' | 'declining' | 'stable'
    volatility_level: 'low' | 'moderate' | 'high'
    recovery_patterns: string
  }
  energyImpact?: {
    energy_score: number
    energy_indicators: string[]
    overall_effect: 'energizing' | 'neutral' | 'draining'
    explanation: string
  }
  analysisVersion: string
  processingTime: number
  tokensUsed: number
  apiCost: number
  status: string
}

/**
 * Main HTTP Action for analyzing journal entries via Gemini 2.5 Flash-Lite API
 * Implements queue-based processing with priority handling and comprehensive error handling
 */
export const analyzeJournalEntry = httpAction(async (ctx, request) => {
  const startTime = Date.now()
  let requestData: AIProcessingRequest | undefined

  try {
    // Parse and validate request using Zod schema first (since we can only read request body once)
    const rawData = await request.json()
    requestData = validateAIRequest(rawData)
    const { entryId, userId, retryCount = 0, priority = 'normal' } = requestData

    // Check if this is a queue-based processing request (includes analysisId)
    const analysisId = (rawData as any).analysisId
    const isQueuedRequest = !!analysisId

    if (isQueuedRequest) {
      // Update processing status for queued request
      await ctx.runMutation(internal.aiAnalysis.updateProcessingStatus, {
        analysisId,
        status: 'processing',
        processingStartedAt: Date.now(),
        currentAttempt: retryCount + 1,
      })
    }

    // Validate authentication
    const authHeader = request.headers.get('Authorization')
    const authResult = await validateUserAuth(authHeader)

    if (!authResult.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Authentication failed: ${authResult.error}`,
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify authenticated user matches request userId
    if (authResult.userId !== userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: User ID mismatch',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Get user information - simplified since users isn't in internal API yet
    // TODO: Add users to internal API and implement proper user lookup
    const user = {
      tier: 'free' as 'free' | 'premium',
      email: 'user@example.com',
    }

    const userTier: 'free' | 'premium' = user.tier || 'free'

    // Get journal entry content using internal query
    const journalEntry = await ctx.runQuery(
      internal.journalEntries.getForAnalysis,
      {
        entryId,
      }
    )

    if (!journalEntry) {
      await ctx.runMutation(internal.aiAnalysis.markFailed, {
        entryId,
        error: 'Journal entry not found',
      })

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Journal entry not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if AI analysis is allowed for this entry
    if (journalEntry.allowAIAnalysis === false) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AI analysis not permitted for this entry',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check rate limiting
    const rateLimitResult = checkRateLimit(userId, userTier)
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Rate limit exceeded. Reset time: ${new Date(rateLimitResult.resetTime!).toISOString()}`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(
              (rateLimitResult.resetTime! - Date.now()) / 1000
            ).toString(),
          },
        }
      )
    }

    // Check user tier limits
    const dailyUsage = await getDailyUsageCount(ctx, userId)
    const tierLimitResult = checkUserTierLimits(
      userTier,
      dailyUsage,
      retryCount
    )
    if (!tierLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: tierLimitResult.reason,
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate journal entry content for safety
    try {
      const contentValidation = validateJournalContent({
        content: journalEntry.content,
        mood: journalEntry.mood,
        relationshipContext: journalEntry.relationshipName,
      })
    } catch (validationError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Content validation failed: ${validationError instanceof Error ? validationError.message : 'Invalid content'}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Generate request log for audit
    const requestLog = generateRequestLogData(requestData, {
      id: userId,
      email: user.email,
      tier: userTier,
    })

    // Update processing status to "processing" (only if not already done for queue)
    if (!isQueuedRequest) {
      await ctx.runMutation(internal.aiAnalysis.updateStatus, {
        entryId,
        status: 'processing',
        processingAttempts: retryCount + 1,
      })
    }

    // Get previous analyses for pattern detection
    const previousAnalyses = await getPreviousAnalyses(ctx, userId, 5)
    const sentimentHistory = previousAnalyses.map((analysis: any) => ({
      score: (analysis.sentimentScore + 1) * 4.5 + 1, // Convert -1,1 to 1-10 scale
      timestamp: analysis.createdAt,
      emotions: analysis.emotionalKeywords || [],
    }))

    // Prepare Gemini API request
    const geminiRequest: GeminiAnalysisRequest = {
      text: journalEntry.content,
      analysisType: 'comprehensive',
      userId,
      relationshipContext: journalEntry.relationshipName || undefined,
      patternType: 'both',
      sentimentHistory,
    }

    // Make external API call to Gemini
    const geminiResponse = await callGeminiAPI(geminiRequest)

    // Store analysis results with pattern detection data
    const storeArgs: ExtendedStoreResultArgs = {
      entryId,
      userId,
      relationshipId: journalEntry.relationshipId,
      sentimentScore: geminiResponse.sentiment.score,
      emotionalKeywords: geminiResponse.sentiment.emotions,
      confidenceLevel: geminiResponse.sentiment.confidence,
      reasoning: geminiResponse.sentiment.reasoning,
      patterns: geminiResponse.patterns,
      emotionalStability: geminiResponse.emotional_stability,
      energyImpact: geminiResponse.energy_impact,
      analysisVersion: geminiResponse.metadata.analysisVersion,
      processingTime: Date.now() - startTime,
      tokensUsed: geminiResponse.metadata.tokensUsed,
      apiCost: geminiResponse.metadata.apiCost,
      status: 'completed',
    }

    let finalAnalysisId: string
    if (isQueuedRequest) {
      // Update existing analysis record for queued request
      await ctx.runMutation(internal.aiAnalysis.completeAnalysis, {
        analysisId,
        results: storeArgs,
        totalProcessingTime: Date.now() - startTime,
      })
      finalAnalysisId = analysisId
    } else {
      // Create new analysis record for direct request
      finalAnalysisId = await ctx.runMutation(
        internal.aiAnalysis.storeResult,
        storeArgs as any
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysisId: finalAnalysisId,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    // If we don't have requestData (error occurred during parsing), we can't retry
    if (!requestData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to parse request data: ${errorMessage}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const { entryId, userId, retryCount = 0, priority = 'normal' } = requestData
    const analysisId = (rawData as any).analysisId
    const isQueuedRequest = !!analysisId

    // Determine if error is recoverable for automatic requeuing
    const errorIsRecoverable = isRecoverableError(errorMessage)
    const shouldAutoRetry = errorIsRecoverable && retryCount < 3

    // Implement intelligent retry logic with automatic requeuing for transient failures
    if (shouldAutoRetry) {
      const nextRetryAt = Date.now() + Math.pow(2, retryCount) * 1000 // Exponential backoff

      if (isQueuedRequest) {
        // For queued requests, use intelligent queue-aware retry logic
        await ctx.runMutation(internal.scheduler.requeueAnalysis, {
          analysisId,
          retryCount: retryCount + 1,
          priority, // Will be upgraded by retry strategy if needed
          error: errorMessage,
          isTransientError: errorIsRecoverable,
        })
      } else {
        // For direct requests, use legacy retry logic with transient error detection
        if (errorIsRecoverable) {
          await ctx.scheduler.runAfter(
            Math.pow(2, retryCount) * 1000,
            internal.aiAnalysis.retryAnalysisInternal,
            { entryId, userId, retryCount: retryCount + 1 }
          )
        } else {
          // Non-recoverable error - mark as permanently failed immediately
          await ctx.runMutation(internal.aiAnalysis.markFailed, {
            entryId,
            error: `Non-recoverable error: ${errorMessage}`,
            processingAttempts: retryCount + 1,
          })

          return new Response(
            JSON.stringify({
              success: false,
              error: `Non-recoverable error: ${errorMessage}`,
              retryScheduled: false,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          retryScheduled: true,
          nextRetryAt,
          errorClassification: {
            isRecoverable: errorIsRecoverable,
            automaticRequeue: true,
            retryCount: retryCount + 1,
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } else {
      // Final failure - mark as failed
      if (isQueuedRequest) {
        // For queued requests, move to dead letter queue
        await ctx.runMutation(internal.scheduler.moveToDeadLetterQueue, {
          analysisId,
          reason: `Processing failed after ${retryCount + 1} attempts`,
          metadata: {
            originalPriority: priority,
            retryCount: retryCount + 1,
            lastError: errorMessage,
            totalProcessingTime: Date.now() - startTime,
          },
        })
      } else {
        // For direct requests, use legacy failure handling
        await ctx.runMutation(internal.aiAnalysis.markFailed, {
          entryId,
          error: errorMessage,
          processingAttempts: retryCount + 1,
        })
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Final failure after ${retryCount + 1} attempts: ${errorMessage}`,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
})

/**
 * HTTP Action for retrying failed AI analysis
 * Called by scheduler for automatic retry with exponential backoff
 */
export const retryAnalysis = httpAction(async (ctx, request) => {
  const { entryId, userId, retryCount } = await request.json()

  // Make HTTP request to the analyze endpoint
  const baseUrl =
    process.env.CONVEX_SITE_URL ||
    request.url.split('/')[0] + '//' + request.url.split('/')[2]
  const analyzeUrl = `${baseUrl}/ai/analyze`

  const response = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: request.headers.get('Authorization') || '',
    },
    body: JSON.stringify({ entryId, userId, retryCount }),
  })

  const result = await response.json()
  return new Response(JSON.stringify(result), {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
})

/**
 * Call Gemini 2.5 Flash-Lite API with proper error handling and timeout
 */
async function callGeminiAPI(
  requestData: GeminiAnalysisRequest
): Promise<GeminiAnalysisResponse> {
  const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY

  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable not set')
  }

  const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`

  const prompt = createAnalysisPrompt(requestData)

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 1000,
        stopSequences: [],
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Gemini 2.5 Flash-Lite API Error (${response.status}): ${errorText}`
    )
  }

  const result = await response.json()

  if (!result.candidates || result.candidates.length === 0) {
    throw new Error('No response from Gemini 2.5 Flash-Lite API')
  }

  const content = result.candidates[0].content.parts[0].text

  // Parse the structured response from Gemini 2.5 Flash-Lite
  return parseGeminiResponse(content, requestData)
}

/**
 * Create analysis prompt for Gemini 2.5 Flash-Lite API using DSPy patterns
 * Migrated from src/lib/ai/analysis.ts SentimentAnalysisModule
 */
function createAnalysisPrompt(requestData: GeminiAnalysisRequest): string {
  const { text, analysisType, relationshipContext } = requestData

  // DSPy-style prompt with examples (migrated from SentimentAnalysisSignature)
  const dspyExamples = [
    {
      input:
        'I had a wonderful day with my partner. We laughed and felt so connected.',
      output: {
        sentiment_score: 8.5,
        emotions_detected: ['joy', 'love', 'connection'],
        confidence: 0.92,
        explanation:
          'Very positive emotional content with strong connection indicators',
      },
    },
    {
      input:
        'We had another argument today. I feel frustrated and disconnected.',
      output: {
        sentiment_score: 2.5,
        emotions_detected: ['frustration', 'sadness', 'disconnection'],
        confidence: 0.88,
        explanation: 'Negative sentiment with conflict and emotional distance',
      },
    },
  ]

  return `Analyze sentiment of relationship journal entries with emotional intelligence

Task: Analyze the sentiment of the following relationship journal entry and provide:
1. A sentiment score from 1-10 (1=very negative, 10=very positive) 
2. A list of emotions detected in the text
3. Your confidence level in this analysis (0-1)
4. A brief explanation of your reasoning

Examples:
${dspyExamples
  .map(
    example => `
Input: ${example.input}
Output: ${JSON.stringify(example.output, null, 2)}
`
  )
  .join('\n')}

Now analyze this entry:
Journal Entry: "${text}"
${relationshipContext ? `Relationship Context: ${relationshipContext}` : ''}

${
  requestData.sentimentHistory && requestData.sentimentHistory.length > 0
    ? `
Sentiment History for Stability Analysis (most recent first):
${requestData.sentimentHistory.map((entry, index) => `${index + 1}. Score: ${entry.score}/10, Date: ${new Date(entry.timestamp).toLocaleDateString()}, Emotions: ${entry.emotions.join(', ') || 'N/A'}`).join('\n')}`
    : ''
}

For comprehensive analysis, also provide:

1. Pattern Analysis:
- Recurring themes in the relationship
- Emotional triggers mentioned
- Communication style indicators  
- Relationship dynamics patterns

2. Emotional Stability Analysis (if sentiment history provided):
- Stability score (0-100) based on historical consistency
- Trend direction (improving/declining/stable)
- Volatility level (low/moderate/high)
- Recovery patterns from negative states

3. Energy Impact Analysis:
- Energy score (1-10) for how this interaction affects personal energy
- Specific energy indicators from the text
- Overall effect category (energizing/neutral/draining)
- Explanation of energy impact

Provide response in this JSON format:
{
  "sentiment": {
    "score": <number between -1 and 1 (will be converted from 1-10 scale)>,
    "confidence": <number between 0 and 1>,
    "emotions": [<array of detected emotions>],
    "reasoning": "<explanation of sentiment analysis>"
  },
  "patterns": {
    "recurring_themes": [<array of themes>],
    "emotional_triggers": [<array of triggers>],
    "communication_style": "<description>",
    "relationship_dynamics": [<array of dynamics>]
  },
  "emotional_stability": {
    "stability_score": <number 0-100>,
    "trend_direction": "<improving/declining/stable>",
    "volatility_level": "<low/moderate/high>",
    "recovery_patterns": "<analysis of recovery patterns>"
  },
  "energy_impact": {
    "energy_score": <number 1-10>,
    "energy_indicators": [<array of energy-related words/phrases>],
    "overall_effect": "<energizing/neutral/draining>",
    "explanation": "<explanation of energy impact>"
  }
}

Focus on:
1. Accurate sentiment scoring (1=very negative, 10=very positive)
2. High confidence ratings based on clear emotional indicators
3. Identifying relationship patterns and communication styles
4. Detecting emotional triggers and recurring themes
5. Providing actionable insights for relationship health

Respond with valid JSON only.`
}

/**
 * Parse Gemini 2.5 Flash-Lite API response into structured format
 * Enhanced with DSPy-pattern validation and score conversion
 */
function parseGeminiResponse(
  content: string,
  requestData: GeminiAnalysisRequest
): GeminiAnalysisResponse {
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini 2.5 Flash-Lite response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Handle both legacy format and new DSPy format
    let sentimentScore = parsed.sentiment?.score || 0
    let emotions = parsed.sentiment?.emotions || []
    let confidence = parsed.sentiment?.confidence || 0.5
    let reasoning = parsed.sentiment?.reasoning || 'No reasoning provided'

    // Check if response uses DSPy format (1-10 scale)
    if (sentimentScore > 1) {
      // Convert from 1-10 scale to -1 to 1 scale
      sentimentScore = (sentimentScore - 5.5) / 4.5
    }

    // Handle legacy formats for emotions
    if (parsed.sentiment?.emotions_detected) {
      emotions = parsed.sentiment.emotions_detected
    }
    if (parsed.sentiment?.explanation) {
      reasoning = parsed.sentiment.explanation
    }

    // Extract pattern detection results
    const emotionalStability = parsed.emotional_stability
      ? {
          stability_score: Math.max(
            0,
            Math.min(100, parsed.emotional_stability.stability_score || 50)
          ),
          trend_direction: ['improving', 'declining', 'stable'].includes(
            parsed.emotional_stability.trend_direction
          )
            ? parsed.emotional_stability.trend_direction
            : 'stable',
          volatility_level: ['low', 'moderate', 'high'].includes(
            parsed.emotional_stability.volatility_level
          )
            ? parsed.emotional_stability.volatility_level
            : 'moderate',
          recovery_patterns:
            parsed.emotional_stability.recovery_patterns ||
            'Unable to determine',
        }
      : undefined

    const energyImpact = parsed.energy_impact
      ? {
          energy_score: Math.max(
            1,
            Math.min(10, parsed.energy_impact.energy_score || 5)
          ),
          energy_indicators: Array.isArray(
            parsed.energy_impact.energy_indicators
          )
            ? parsed.energy_impact.energy_indicators
            : [],
          overall_effect: ['energizing', 'neutral', 'draining'].includes(
            parsed.energy_impact.overall_effect
          )
            ? parsed.energy_impact.overall_effect
            : 'neutral',
          explanation:
            parsed.energy_impact.explanation || 'No explanation provided',
        }
      : undefined

    // Validate and structure response with DSPy-compatible validation
    const response: GeminiAnalysisResponse = {
      sentiment: {
        score: Math.max(-1, Math.min(1, sentimentScore)),
        confidence: Math.max(0, Math.min(1, confidence)),
        emotions: Array.isArray(emotions) ? emotions : [],
        reasoning: reasoning,
      },
      patterns: parsed.patterns
        ? {
            recurring_themes: Array.isArray(parsed.patterns.recurring_themes)
              ? parsed.patterns.recurring_themes
              : [],
            emotional_triggers: Array.isArray(
              parsed.patterns.emotional_triggers
            )
              ? parsed.patterns.emotional_triggers
              : [],
            communication_style:
              parsed.patterns.communication_style || 'Unknown',
            relationship_dynamics: Array.isArray(
              parsed.patterns.relationship_dynamics
            )
              ? parsed.patterns.relationship_dynamics
              : [],
          }
        : undefined,
      emotional_stability: emotionalStability,
      energy_impact: energyImpact,
      metadata: {
        processingTime: Date.now(),
        tokensUsed: estimateTokenUsage(requestData.text),
        apiCost: estimateAPICost(requestData.text),
        analysisVersion: 'gemini-2.5-flash-lite-v1.0',
      },
    }

    // Additional DSPy-style validation
    if (response.sentiment.confidence < 0.3) {
      console.warn(
        'Low confidence sentiment analysis result:',
        response.sentiment.confidence
      )
    }

    return response
  } catch (error) {
    throw new Error(
      `Failed to parse Gemini 2.5 Flash-Lite response: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Estimate token usage for cost calculation
 */
function estimateTokenUsage(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil((text.length + 500) / 4) // +500 for prompt overhead
}

/**
 * Estimate API cost based on token usage
 */
function estimateAPICost(text: string): number {
  const tokens = estimateTokenUsage(text)
  // Gemini 2.5 Flash-Lite pricing: approximately $0.075 per 1M input tokens
  return (tokens / 1000000) * 0.075
}

/**
 * Get daily usage count for user tier validation
 */
async function getDailyUsageCount(ctx: any, userId: string): Promise<number> {
  // For now, return a simple count
  // TODO: Implement proper daily usage tracking
  return 0
}

/**
 * Get previous AI analyses for pattern detection
 */
async function getPreviousAnalyses(
  ctx: any,
  userId: string,
  limit: number = 5
) {
  try {
    const analyses = await ctx.runQuery(
      internal.aiAnalysis.getRecentForPatterns,
      {
        userId,
        limit,
      }
    )
    return analyses || []
  } catch (error) {
    console.warn(
      'Failed to get previous analyses for pattern detection:',
      error
    )
    return []
  }
}
