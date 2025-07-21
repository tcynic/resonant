/**
 * AI API Rate Limiting and Cost Control System
 * Implements sophisticated rate limiting with cost tracking and quota management
 */

import { AnalysisType } from '../types'
import { aiMonitoring } from './monitoring'
import { AIServiceRateLimitError, AIResourceLimitError } from './errors'

// Rate limiting configuration
interface RateLimitConfig {
  // Requests per time window
  requestsPerMinute: number
  requestsPerHour: number
  requestsPerDay: number

  // Token limits (estimated)
  tokensPerMinute: number
  tokensPerHour: number
  tokensPerDay: number

  // Cost limits (in USD cents)
  costPerMinute: number
  costPerHour: number
  costPerDay: number

  // Burst allowance
  burstMultiplier: number

  // Queue limits
  maxQueueSize: number
  maxWaitTimeMs: number
}

// Rate limit buckets for different time windows
interface RateLimitBucket {
  count: number
  tokens: number
  cost: number
  windowStart: number
  windowSizeMs: number
}

// Rate limit status
interface RateLimitStatus {
  allowed: boolean
  reason?: string
  retryAfter?: number
  current: {
    requests: number
    tokens: number
    cost: number
  }
  limits: {
    requests: number
    tokens: number
    cost: number
  }
  resetTime: number
}

// Cost estimation models
interface CostModel {
  inputTokenCost: number // per 1k tokens
  outputTokenCost: number // per 1k tokens
  baseRequestCost: number // per request
}

// Test-friendly configuration that essentially disables rate limiting
const TEST_CONFIG: RateLimitConfig = {
  requestsPerMinute: 10000,
  requestsPerHour: 100000,
  requestsPerDay: 1000000,

  tokensPerMinute: 10000000,
  tokensPerHour: 100000000,
  tokensPerDay: 1000000000,

  costPerMinute: 1000000, // $10,000
  costPerHour: 10000000, // $100,000
  costPerDay: 100000000, // $1,000,000

  burstMultiplier: 1,
  maxQueueSize: 1000,
  maxWaitTimeMs: 1000,
}

// Default configurations for different service tiers
const FREE_TIER_CONFIG: RateLimitConfig = {
  requestsPerMinute: 15,
  requestsPerHour: 300,
  requestsPerDay: 1500,

  tokensPerMinute: 20000,
  tokensPerHour: 400000,
  tokensPerDay: 2000000,

  costPerMinute: 10, // $0.10
  costPerHour: 200, // $2.00
  costPerDay: 1000, // $10.00

  burstMultiplier: 2,
  maxQueueSize: 50,
  maxWaitTimeMs: 30000,
}

const PAID_TIER_CONFIG: RateLimitConfig = {
  requestsPerMinute: 60,
  requestsPerHour: 3600,
  requestsPerDay: 50000,

  tokensPerMinute: 100000,
  tokensPerHour: 2000000,
  tokensPerDay: 20000000,

  costPerMinute: 100, // $1.00
  costPerHour: 2000, // $20.00
  costPerDay: 50000, // $500.00

  burstMultiplier: 3,
  maxQueueSize: 200,
  maxWaitTimeMs: 60000,
}

// Gemini cost model (as of 2024)
const GEMINI_COST_MODEL: CostModel = {
  inputTokenCost: 0.035, // $0.000035 per token
  outputTokenCost: 0.105, // $0.000105 per token
  baseRequestCost: 0.01, // $0.0001 per request
}

export class AIRateLimiter {
  private config: RateLimitConfig
  private costModel: CostModel

  // Rate limit buckets
  private minuteBucket: RateLimitBucket
  private hourBucket: RateLimitBucket
  private dayBucket: RateLimitBucket

  // Queue for pending requests
  private requestQueue: Array<{
    id: string
    timestamp: number
    estimatedTokens: number
    estimatedCost: number
    analysisType: AnalysisType
    resolve: (status: RateLimitStatus) => void
    reject: (error: Error) => void
  }> = []

  // Performance tracking
  private metrics = {
    totalRequests: 0,
    blockedRequests: 0,
    queuedRequests: 0,
    averageWaitTime: 0,
    peakQueueSize: 0,
  }

  constructor(
    tier: 'free' | 'paid' = 'free',
    customConfig?: Partial<RateLimitConfig>,
    customCostModel?: Partial<CostModel>
  ) {
    // Select base configuration
    let baseConfig: RateLimitConfig

    // Check if we're in test environment and rate limiting is disabled
    if (
      process.env.NODE_ENV === 'test' &&
      process.env.AI_RATE_LIMITING_DISABLED === 'true'
    ) {
      baseConfig = TEST_CONFIG
    } else {
      baseConfig = tier === 'paid' ? PAID_TIER_CONFIG : FREE_TIER_CONFIG
    }

    this.config = { ...baseConfig, ...customConfig }
    this.costModel = { ...GEMINI_COST_MODEL, ...customCostModel }

    // Initialize buckets
    const now = Date.now()
    this.minuteBucket = this.createBucket(now, 60 * 1000)
    this.hourBucket = this.createBucket(now, 60 * 60 * 1000)
    this.dayBucket = this.createBucket(now, 24 * 60 * 60 * 1000)

    // Start cleanup interval (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      this.startCleanupTimer()
    }

    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      console.info(`🚦 AI Rate Limiter initialized for ${tier} tier`)
    }
  }

  private createBucket(
    timestamp: number,
    windowSizeMs: number
  ): RateLimitBucket {
    return {
      count: 0,
      tokens: 0,
      cost: 0,
      windowStart: timestamp,
      windowSizeMs,
    }
  }

  // Check if request is allowed and estimate wait time
  async checkRateLimit(
    analysisType: AnalysisType,
    estimatedTokens: number = 1000,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<RateLimitStatus> {
    this.metrics.totalRequests++

    // Clean expired buckets
    this.cleanupBuckets()

    // Estimate request cost
    const estimatedCost = this.estimateCost(estimatedTokens)

    // Check all rate limits
    const checks = [
      this.checkBucket(
        this.minuteBucket,
        this.config.requestsPerMinute,
        this.config.tokensPerMinute,
        this.config.costPerMinute,
        estimatedTokens,
        estimatedCost
      ),
      this.checkBucket(
        this.hourBucket,
        this.config.requestsPerHour,
        this.config.tokensPerHour,
        this.config.costPerHour,
        estimatedTokens,
        estimatedCost
      ),
      this.checkBucket(
        this.dayBucket,
        this.config.requestsPerDay,
        this.config.tokensPerDay,
        this.config.costPerDay,
        estimatedTokens,
        estimatedCost
      ),
    ]

    // Find the most restrictive limit
    const restrictiveCheck = checks.find(check => !check.allowed)

    if (restrictiveCheck) {
      this.metrics.blockedRequests++

      // Check if we should queue the request
      if (this.shouldQueue(priority)) {
        return this.queueRequest(analysisType, estimatedTokens, estimatedCost)
      }

      // Log rate limit hit
      aiMonitoring.logError(
        new AIServiceRateLimitError(
          'gemini',
          restrictiveCheck.retryAfter || 60000
        ),
        {
          analysisType,
          estimatedTokens,
          estimatedCost,
          reason: restrictiveCheck.reason,
          currentLimits: {
            minute: this.getBucketStatus(
              this.minuteBucket,
              this.config.requestsPerMinute,
              this.config.tokensPerMinute,
              this.config.costPerMinute
            ),
            hour: this.getBucketStatus(
              this.hourBucket,
              this.config.requestsPerHour,
              this.config.tokensPerHour,
              this.config.costPerHour
            ),
            day: this.getBucketStatus(
              this.dayBucket,
              this.config.requestsPerDay,
              this.config.tokensPerDay,
              this.config.costPerDay
            ),
          },
        }
      )

      return restrictiveCheck
    }

    // All checks passed - reserve the quota
    this.reserveQuota(estimatedTokens, estimatedCost)

    return {
      allowed: true,
      current: {
        requests: this.minuteBucket.count,
        tokens: this.minuteBucket.tokens,
        cost: this.minuteBucket.cost,
      },
      limits: {
        requests: this.config.requestsPerMinute,
        tokens: this.config.tokensPerMinute,
        cost: this.config.costPerMinute,
      },
      resetTime: this.minuteBucket.windowStart + this.minuteBucket.windowSizeMs,
    }
  }

  private checkBucket(
    bucket: RateLimitBucket,
    requestLimit: number,
    tokenLimit: number,
    costLimit: number,
    newTokens: number = 0,
    newCost: number = 0
  ): RateLimitStatus {
    // Apply burst multiplier for short-term limits
    const burstAllowance =
      bucket.windowSizeMs <= 60 * 1000 ? this.config.burstMultiplier : 1
    const effectiveRequestLimit = requestLimit * burstAllowance
    const effectiveTokenLimit = tokenLimit * burstAllowance
    const effectiveCostLimit = costLimit * burstAllowance

    // Check request limit (including the new request)
    if (bucket.count + 1 > effectiveRequestLimit) {
      return {
        allowed: false,
        reason: `Request limit exceeded (${bucket.count + 1}/${effectiveRequestLimit})`,
        retryAfter: bucket.windowStart + bucket.windowSizeMs - Date.now(),
        current: {
          requests: bucket.count,
          tokens: bucket.tokens,
          cost: bucket.cost,
        },
        limits: {
          requests: effectiveRequestLimit,
          tokens: effectiveTokenLimit,
          cost: effectiveCostLimit,
        },
        resetTime: bucket.windowStart + bucket.windowSizeMs,
      }
    }

    // Check token limit (including the new tokens)
    if (bucket.tokens + newTokens > effectiveTokenLimit) {
      return {
        allowed: false,
        reason: `Token limit exceeded (${bucket.tokens + newTokens}/${effectiveTokenLimit})`,
        retryAfter: bucket.windowStart + bucket.windowSizeMs - Date.now(),
        current: {
          requests: bucket.count,
          tokens: bucket.tokens,
          cost: bucket.cost,
        },
        limits: {
          requests: effectiveRequestLimit,
          tokens: effectiveTokenLimit,
          cost: effectiveCostLimit,
        },
        resetTime: bucket.windowStart + bucket.windowSizeMs,
      }
    }

    // Check cost limit (including the new cost)
    if (bucket.cost + newCost > effectiveCostLimit) {
      return {
        allowed: false,
        reason: `Cost limit exceeded ($${((bucket.cost + newCost) / 100).toFixed(2)}/$${(effectiveCostLimit / 100).toFixed(2)})`,
        retryAfter: bucket.windowStart + bucket.windowSizeMs - Date.now(),
        current: {
          requests: bucket.count,
          tokens: bucket.tokens,
          cost: bucket.cost,
        },
        limits: {
          requests: effectiveRequestLimit,
          tokens: effectiveTokenLimit,
          cost: effectiveCostLimit,
        },
        resetTime: bucket.windowStart + bucket.windowSizeMs,
      }
    }

    return {
      allowed: true,
      current: {
        requests: bucket.count,
        tokens: bucket.tokens,
        cost: bucket.cost,
      },
      limits: {
        requests: effectiveRequestLimit,
        tokens: effectiveTokenLimit,
        cost: effectiveCostLimit,
      },
      resetTime: bucket.windowStart + bucket.windowSizeMs,
    }
  }

  private getBucketStatus(
    bucket: RateLimitBucket,
    requestLimit: number,
    tokenLimit: number,
    costLimit: number
  ) {
    return {
      requests: `${bucket.count}/${requestLimit}`,
      tokens: `${bucket.tokens}/${tokenLimit}`,
      cost: `$${(bucket.cost / 100).toFixed(2)}/$${(costLimit / 100).toFixed(2)}`,
      resetTime: new Date(
        bucket.windowStart + bucket.windowSizeMs
      ).toISOString(),
    }
  }

  private shouldQueue(priority: 'low' | 'normal' | 'high'): boolean {
    if (this.requestQueue.length >= this.config.maxQueueSize) {
      return false
    }

    // Only queue normal and high priority requests
    return priority !== 'low'
  }

  private async queueRequest(
    analysisType: AnalysisType,
    estimatedTokens: number,
    estimatedCost: number
  ): Promise<RateLimitStatus> {
    return new Promise((resolve, reject) => {
      const queueItem = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        estimatedTokens,
        estimatedCost,
        analysisType,
        resolve,
        reject,
      }

      this.requestQueue.push(queueItem)
      this.metrics.queuedRequests++
      this.metrics.peakQueueSize = Math.max(
        this.metrics.peakQueueSize,
        this.requestQueue.length
      )

      if (process.env.NODE_ENV !== 'test') {
        console.info(
          `📋 Queued request ${queueItem.id} (queue size: ${this.requestQueue.length})`
        )
      }

      // Set timeout for queue item
      setTimeout(() => {
        const index = this.requestQueue.findIndex(
          item => item.id === queueItem.id
        )
        if (index !== -1) {
          this.requestQueue.splice(index, 1)
          reject(
            new AIResourceLimitError(
              'requests',
              this.requestQueue.length,
              this.config.maxQueueSize,
              {
                queueId: queueItem.id,
                waitTime: Date.now() - queueItem.timestamp,
                maxWaitTime: this.config.maxWaitTimeMs,
                reason: 'Queue timeout - request waited too long',
              }
            )
          )
        }
      }, this.config.maxWaitTimeMs)
    })
  }

  private reserveQuota(estimatedTokens: number, estimatedCost: number): void {
    this.minuteBucket.count++
    this.minuteBucket.tokens += estimatedTokens
    this.minuteBucket.cost += estimatedCost

    this.hourBucket.count++
    this.hourBucket.tokens += estimatedTokens
    this.hourBucket.cost += estimatedCost

    this.dayBucket.count++
    this.dayBucket.tokens += estimatedTokens
    this.dayBucket.cost += estimatedCost
  }

  // Record actual usage (called after API response)
  recordUsage(actualTokens: number, actualCost?: number): void {
    const cost = actualCost || this.estimateCost(actualTokens)

    // Record metrics
    aiMonitoring.recordMetric({
      timestamp: Date.now(),
      analysisType: 'sentiment', // Default, should be passed from context
      operation: 'api_usage',
      duration: 0,
      success: true,
      tokens: actualTokens,
      cost: cost / 100, // Convert cents to dollars
    })

    // Process queue if space is available
    this.processQueue()
  }

  private processQueue(): void {
    if (this.requestQueue.length === 0) return

    // Try to process queued requests
    const processed: string[] = []

    for (const queueItem of this.requestQueue) {
      this.cleanupBuckets()

      const status = this.checkBucket(
        this.minuteBucket,
        this.config.requestsPerMinute,
        this.config.tokensPerMinute,
        this.config.costPerMinute,
        queueItem.estimatedTokens,
        queueItem.estimatedCost
      )

      if (status.allowed) {
        this.reserveQuota(queueItem.estimatedTokens, queueItem.estimatedCost)

        const waitTime = Date.now() - queueItem.timestamp
        this.metrics.averageWaitTime =
          (this.metrics.averageWaitTime + waitTime) / 2

        if (process.env.NODE_ENV !== 'test') {
          console.info(
            `✅ Processed queued request ${queueItem.id} after ${waitTime}ms`
          )
        }
        queueItem.resolve(status)
        processed.push(queueItem.id)
      } else {
        break // Can't process more requests yet
      }
    }

    // Remove processed items
    this.requestQueue = this.requestQueue.filter(
      item => !processed.includes(item.id)
    )
  }

  private estimateCost(tokens: number): number {
    // Estimate input/output split (roughly 70/30 for analysis tasks)
    const inputTokens = Math.floor(tokens * 0.7)
    const outputTokens = Math.floor(tokens * 0.3)

    const inputCost = (inputTokens / 1000) * this.costModel.inputTokenCost
    const outputCost = (outputTokens / 1000) * this.costModel.outputTokenCost
    const baseCost = this.costModel.baseRequestCost

    // Return cost in cents
    return Math.ceil((inputCost + outputCost + baseCost) * 100)
  }

  private cleanupBuckets(): void {
    const now = Date.now()

    // Reset buckets if their windows have expired
    if (now >= this.minuteBucket.windowStart + this.minuteBucket.windowSizeMs) {
      this.minuteBucket = this.createBucket(now, 60 * 1000)
    }

    if (now >= this.hourBucket.windowStart + this.hourBucket.windowSizeMs) {
      this.hourBucket = this.createBucket(now, 60 * 60 * 1000)
    }

    if (now >= this.dayBucket.windowStart + this.dayBucket.windowSizeMs) {
      this.dayBucket = this.createBucket(now, 24 * 60 * 60 * 1000)
    }
  }

  private startCleanupTimer(): void {
    // Clean up every minute
    setInterval(() => {
      this.cleanupBuckets()
      this.processQueue()
    }, 60 * 1000)
  }

  // Get current rate limit status
  getStatus(): {
    config: RateLimitConfig
    current: {
      minute: {
        requests: string
        tokens: string
        cost: string
        resetTime: string
      }
      hour: {
        requests: string
        tokens: string
        cost: string
        resetTime: string
      }
      day: { requests: string; tokens: string; cost: string; resetTime: string }
    }
    queue: {
      size: number
      maxSize: number
      oldestItem?: { id: string; waitTime: number }
    }
    metrics: {
      totalRequests: number
      blockedRequests: number
      queuedRequests: number
      averageWaitTime: number
      peakQueueSize: number
    }
  } {
    this.cleanupBuckets()

    const oldestItem =
      this.requestQueue.length > 0
        ? {
            id: this.requestQueue[0].id,
            waitTime: Date.now() - this.requestQueue[0].timestamp,
          }
        : undefined

    return {
      config: this.config,
      current: {
        minute: this.getBucketStatus(
          this.minuteBucket,
          this.config.requestsPerMinute,
          this.config.tokensPerMinute,
          this.config.costPerMinute
        ),
        hour: this.getBucketStatus(
          this.hourBucket,
          this.config.requestsPerHour,
          this.config.tokensPerHour,
          this.config.costPerHour
        ),
        day: this.getBucketStatus(
          this.dayBucket,
          this.config.requestsPerDay,
          this.config.tokensPerDay,
          this.config.costPerDay
        ),
      },
      queue: {
        size: this.requestQueue.length,
        maxSize: this.config.maxQueueSize,
        oldestItem,
      },
      metrics: { ...this.metrics },
    }
  }

  // Update configuration (for dynamic adjustments)
  updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.info('🔧 Rate limiter configuration updated', newConfig)
  }

  // Emergency methods
  pauseProcessing(): void {
    console.warn('🛑 Rate limiter processing paused')
    // Implementation would pause queue processing
  }

  resumeProcessing(): void {
    console.info('▶️ Rate limiter processing resumed')
    this.processQueue()
  }

  clearQueue(): void {
    const clearedCount = this.requestQueue.length
    this.requestQueue.forEach(item => {
      item.reject(
        new AIResourceLimitError(
          'requests',
          this.requestQueue.length,
          this.config.maxQueueSize,
          {
            reason: 'Queue cleared by administrator',
          }
        )
      )
    })
    this.requestQueue = []
    console.warn(`🗑️ Cleared ${clearedCount} queued requests`)
  }
}

// Singleton rate limiter instance
let defaultRateLimiter: AIRateLimiter | null = null

export function getAIRateLimiter(
  tier: 'free' | 'paid' = (process.env.AI_TIER as 'free' | 'paid') || 'free',
  config?: Partial<RateLimitConfig>
): AIRateLimiter {
  // In test environment, always create new instance for test isolation
  if (process.env.NODE_ENV === 'test') {
    return new AIRateLimiter(tier, config)
  }

  if (!defaultRateLimiter) {
    defaultRateLimiter = new AIRateLimiter(tier, config)
  }
  return defaultRateLimiter
}

// Test helper function to reset singleton
export function resetAIRateLimiter(): void {
  if (process.env.NODE_ENV === 'test') {
    defaultRateLimiter = null
  }
}

// Helper function to wrap operations with rate limiting
export async function withRateLimit<T>(
  operation: () => Promise<T>,
  analysisType: AnalysisType,
  estimatedTokens: number = 1000,
  priority: 'low' | 'normal' | 'high' = 'normal'
): Promise<T> {
  const rateLimiter = getAIRateLimiter()

  // Check rate limit
  const status = await rateLimiter.checkRateLimit(
    analysisType,
    estimatedTokens,
    priority
  )

  if (!status.allowed) {
    throw new AIServiceRateLimitError('gemini', status.retryAfter || 60000, {
      reason: status.reason,
      current: status.current,
      limits: status.limits,
      resetTime: status.resetTime,
    })
  }

  try {
    // Execute operation
    const result = await operation()

    // Record successful usage
    rateLimiter.recordUsage(estimatedTokens)

    return result
  } catch (error) {
    // Still record usage for failed requests (they consume quota)
    rateLimiter.recordUsage(estimatedTokens * 0.5) // Estimate partial usage
    throw error
  }
}

export default AIRateLimiter
