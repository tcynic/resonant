/**
 * Fallback Analysis Comparison and Quality Assessment Module
 * Compares fallback results with AI results and provides upgrade decision logic
 * Tracks performance metrics and quality analytics (Story AI-Migration.4)
 */

import { v } from 'convex/values'
import { internal } from '../_generated/api'
import { Doc, Id } from '../_generated/dataModel'
import { FallbackAnalysisResult } from './sentiment_analysis'
import { IntegratedFallbackResult } from './integration'

/**
 * Comparison result between AI and fallback analysis
 */
export interface AIFallbackComparison {
  // Core comparison metrics
  sentimentAgreement: {
    agreement: boolean
    aiSentiment: 'positive' | 'negative' | 'neutral'
    fallbackSentiment: 'positive' | 'negative' | 'neutral'
    confidenceDelta: number // AI confidence - fallback confidence
    scoreDistance: number // Absolute difference in sentiment scores
  }

  // Quality assessment
  qualityComparison: {
    aiQuality: number // 0-1 scale
    fallbackQuality: number // 0-1 scale
    qualityAdvantage: 'ai' | 'fallback' | 'similar' // Which is higher quality
    confidenceReliability: number // How much we trust the comparison
  }

  // Pattern matching assessment
  patternConsistency: {
    keywordOverlap: number // 0-1 scale of shared emotional keywords
    themeAlignment: number // 0-1 scale of theme consistency
    insightSimilarity: number // 0-1 scale of insight similarity
    contradictions: string[] // Areas where AI and fallback disagree
  }

  // Performance metrics
  performance: {
    aiProcessingTime: number
    fallbackProcessingTime: number
    costComparison: {
      aiCost: number
      fallbackCost: number // Always 0
      costSavings: number
    }
    speedAdvantage: 'ai' | 'fallback' // Which was faster
  }

  // Upgrade recommendation
  upgradeRecommendation: {
    shouldUpgrade: boolean
    confidence: number // How confident we are in the recommendation
    reason: string
    urgency: 'low' | 'medium' | 'high'
    estimatedImprovement: number // Expected quality improvement from upgrade
  }

  // Metadata
  comparisonMetadata: {
    comparisonMethod: string
    processingTime: number
    analysisVersion: string
    timestamp: number
  }
}

/**
 * Quality metrics for fallback analysis performance tracking
 */
export interface FallbackQualityMetrics {
  // Overall performance
  overallQuality: {
    averageConfidence: number
    qualityTrend: 'improving' | 'declining' | 'stable'
    successRate: number // Percentage of results above quality threshold
    totalAnalyses: number
  }

  // Comparison with AI (when available)
  aiComparison: {
    agreementRate: number // How often fallback agrees with AI
    qualityGap: number // Average quality difference (AI - fallback)
    upgradeSuccessRate: number // How often upgrades improve quality
    falsePositiveRate: number // Upgrades that didn't improve quality
  }

  // Category-specific performance
  categoryPerformance: {
    [category: string]: {
      confidence: number
      accuracy: number // When compared to AI
      commonErrors: string[]
    }
  }

  // Performance by conditions
  conditionPerformance: {
    circuitBreakerOpen: { confidence: number; successRate: number }
    retryExhausted: { confidence: number; successRate: number }
    rateLimited: { confidence: number; successRate: number }
    apiUnavailable: { confidence: number; successRate: number }
  }

  // Temporal analysis
  timeAnalysis: {
    hourlyPerformance: Array<{ hour: number; quality: number; count: number }>
    weeklyTrend: Array<{ week: number; quality: number; count: number }>
    seasonalPattern: string
  }
}

/**
 * Compare AI and fallback analysis results
 */
export async function compareAIAndFallback(
  ctx: any,
  aiAnalysis: Doc<'aiAnalysis'>,
  fallbackResult: IntegratedFallbackResult
): Promise<AIFallbackComparison> {
  const startTime = Date.now()

  // Extract AI analysis data
  const aiSentiment = determineSentimentFromScore(aiAnalysis.sentimentScore)
  const aiConfidence = aiAnalysis.confidenceLevel
  const aiKeywords = aiAnalysis.emotionalKeywords || []
  const aiProcessingTime = aiAnalysis.processingTime || 0
  const aiCost = aiAnalysis.apiCost || 0

  // Extract fallback analysis data
  const fallbackSentiment = fallbackResult.fallbackAnalysis.sentiment
  const fallbackConfidence = fallbackResult.integration.confidence
  const fallbackKeywords = extractKeywordsFromMetadata(
    fallbackResult.fallbackAnalysis.metadata.keywordsMatched
  )
  const fallbackProcessingTime = fallbackResult.integration.processingTime

  // Calculate sentiment agreement
  const sentimentAgreement = {
    agreement: aiSentiment === fallbackSentiment,
    aiSentiment,
    fallbackSentiment,
    confidenceDelta: aiConfidence - fallbackConfidence,
    scoreDistance: Math.abs(
      aiAnalysis.sentimentScore -
        convertSentimentToScore(fallbackSentiment, fallbackConfidence)
    ),
  }

  // Assess quality comparison
  const aiQuality = calculateAIQuality(aiAnalysis)
  const fallbackQuality =
    fallbackResult.integration.qualityAssessment.qualityScore
  const qualityComparison = {
    aiQuality,
    fallbackQuality,
    qualityAdvantage: determineQualityAdvantage(aiQuality, fallbackQuality),
    confidenceReliability: calculateConfidenceReliability(
      aiConfidence,
      fallbackConfidence,
      sentimentAgreement.agreement
    ),
  }

  // Analyze pattern consistency
  const patternConsistency = {
    keywordOverlap: calculateKeywordOverlap(aiKeywords, fallbackKeywords),
    themeAlignment: calculateThemeAlignment(aiAnalysis, fallbackResult),
    insightSimilarity: calculateInsightSimilarity(aiAnalysis, fallbackResult),
    contradictions: findContradictions(aiAnalysis, fallbackResult),
  }

  // Performance comparison
  const performance = {
    aiProcessingTime,
    fallbackProcessingTime,
    costComparison: {
      aiCost,
      fallbackCost: 0,
      costSavings: aiCost,
    },
    speedAdvantage:
      aiProcessingTime < fallbackProcessingTime
        ? ('ai' as const)
        : ('fallback' as const),
  }

  // Generate upgrade recommendation
  const upgradeRecommendation = generateUpgradeRecommendation(
    sentimentAgreement,
    qualityComparison,
    patternConsistency,
    performance
  )

  const comparisonMetadata = {
    comparisonMethod: 'comprehensive_analysis_v1.0',
    processingTime: Date.now() - startTime,
    analysisVersion: 'fallback-comparison-v1.0',
    timestamp: Date.now(),
  }

  return {
    sentimentAgreement,
    qualityComparison,
    patternConsistency,
    performance,
    upgradeRecommendation,
    comparisonMetadata,
  }
}

/**
 * Generate comprehensive fallback quality metrics
 */
export async function generateFallbackQualityMetrics(
  ctx: any,
  timeRangeHours: number = 24 * 7 // Default: last week
): Promise<FallbackQualityMetrics> {
  const endTime = Date.now()
  const startTime = endTime - timeRangeHours * 60 * 60 * 1000

  // Get all fallback analyses in time range
  const fallbackAnalyses = await ctx.db
    .query('aiAnalysis')
    .filter((q: any) => q.gte(q.field('createdAt'), startTime))
    .filter((q: any) => q.lte(q.field('createdAt'), endTime))
    .filter((q: any) => q.eq(q.field('analysisVersion'), 'fallback-v1.0'))
    .collect()

  // Get AI analyses for comparison  
  const aiAnalyses = await ctx.db
    .query('aiAnalysis')
    .filter((q: any) => q.gte(q.field('createdAt'), startTime))
    .filter((q: any) => q.lte(q.field('createdAt'), endTime))
    .filter((q: any) => q.neq(q.field('analysisVersion'), 'fallback-v1.0'))
    .filter((q: any) => q.eq(q.field('status'), 'completed'))
    .collect()

  // Calculate overall performance
  const overallQuality = calculateOverallQuality(fallbackAnalyses)

  // Calculate AI comparison metrics
  const aiComparison = await calculateAIComparisonMetrics(
    ctx,
    fallbackAnalyses,
    aiAnalyses
  )

  // Calculate category-specific performance
  const categoryPerformance = calculateCategoryPerformance(
    fallbackAnalyses,
    aiAnalyses
  )

  // Calculate performance by trigger conditions
  const conditionPerformance = calculateConditionPerformance(fallbackAnalyses)

  // Calculate temporal analysis
  const timeAnalysis = calculateTimeAnalysis(fallbackAnalyses)

  return {
    overallQuality,
    aiComparison,
    categoryPerformance,
    conditionPerformance,
    timeAnalysis,
  }
}

/**
 * Determine if a fallback result should be upgraded to AI analysis
 */
export async function shouldUpgradeFallbackResult(
  ctx: any,
  fallbackAnalysisId: Id<'aiAnalysis'>,
  options: {
    forceUpgrade?: boolean
    qualityThreshold?: number
    costThreshold?: number
  } = {}
): Promise<{
  shouldUpgrade: boolean
  reason: string
  confidence: number
  estimatedBenefit: number
  recommendedPriority: 'low' | 'normal' | 'high' | 'urgent'
}> {
  const {
    forceUpgrade = false,
    qualityThreshold = 0.7, // Only upgrade if expected AI quality > 0.7
    costThreshold = 0.1, // Max cost in dollars for upgrade
  } = options

  // Get fallback analysis
  const fallbackAnalysis = await ctx.db.get(fallbackAnalysisId)
  if (!fallbackAnalysis || !fallbackAnalysis.fallbackMetadata) {
    return {
      shouldUpgrade: false,
      reason: 'Fallback analysis not found or missing metadata',
      confidence: 0,
      estimatedBenefit: 0,
      recommendedPriority: 'low',
    }
  }

  // Get recent AI analyses for prediction
  const recentAIAnalyses = await ctx.db
    .query('aiAnalysis')
    .filter((q: any) => q.eq(q.field('userId'), fallbackAnalysis.userId))
    .filter((q: any) => q.neq(q.field('analysisVersion'), 'fallback-v1.0'))
    .filter((q: any) => q.eq(q.field('status'), 'completed'))
    .order('desc')
    .take(10)

  if (forceUpgrade) {
    return {
      shouldUpgrade: true,
      reason: 'Force upgrade requested',
      confidence: 1.0,
      estimatedBenefit: 0.3, // Assume moderate benefit
      recommendedPriority: 'high',
    }
  }

  // Predict AI analysis quality based on historical data
  const predictedAIQuality = predictAIQuality(
    fallbackAnalysis,
    recentAIAnalyses
  )
  const fallbackQuality = fallbackAnalysis.fallbackMetadata.qualityScore

  // Calculate estimated benefit
  const estimatedBenefit = Math.max(0, predictedAIQuality - fallbackQuality)

  // Estimate cost (rough approximation)
  const estimatedCost = estimateCostForUpgrade(fallbackAnalysis)

  // Decision logic
  let shouldUpgrade = false
  let reason = ''
  let confidence = 0
  let priority: 'low' | 'normal' | 'high' | 'urgent' = 'low'

  if (fallbackQuality < 0.3) {
    // Very low quality fallback - likely should upgrade
    shouldUpgrade = true
    reason = 'Fallback quality very low - significant improvement expected'
    confidence = 0.9
    priority = 'high'
  } else if (predictedAIQuality > qualityThreshold && estimatedBenefit > 0.2) {
    // High predicted AI quality with significant benefit
    shouldUpgrade = true
    reason = 'High predicted AI quality with significant improvement potential'
    confidence = 0.8
    priority = 'normal'
  } else if (estimatedCost > costThreshold) {
    // Too expensive to upgrade
    shouldUpgrade = false
    reason = `Estimated cost (${estimatedCost.toFixed(3)}) exceeds threshold (${costThreshold})`
    confidence = 0.7
    priority = 'low'
  } else if (estimatedBenefit < 0.1) {
    // Minimal benefit expected
    shouldUpgrade = false
    reason = 'Minimal quality improvement expected from upgrade'
    confidence = 0.6
    priority = 'low'
  } else {
    // Moderate case - depends on specific factors
    const trigger = fallbackAnalysis.fallbackMetadata.trigger
    if (trigger === 'circuit_breaker_open') {
      shouldUpgrade = false
      reason = 'Circuit breaker still open - wait for recovery'
      confidence = 0.8
      priority = 'low'
    } else {
      shouldUpgrade = estimatedBenefit > 0.15
      reason = shouldUpgrade
        ? 'Moderate improvement expected with acceptable cost'
        : 'Improvement insufficient to justify upgrade cost'
      confidence = 0.5
      priority = shouldUpgrade ? 'normal' : 'low'
    }
  }

  return {
    shouldUpgrade,
    reason,
    confidence,
    estimatedBenefit,
    recommendedPriority: priority,
  }
}

/**
 * Helper functions for analysis comparison
 */

function determineSentimentFromScore(
  score: number
): 'positive' | 'negative' | 'neutral' {
  if (score > 0.2) return 'positive'
  if (score < -0.2) return 'negative'
  return 'neutral'
}

function convertSentimentToScore(
  sentiment: string,
  confidence: number
): number {
  switch (sentiment) {
    case 'positive':
      return 0.5 + confidence * 0.5
    case 'negative':
      return -0.5 - confidence * 0.5
    default:
      return 0
  }
}

function extractKeywordsFromMetadata(keywordsMatched: string[]): string[] {
  return keywordsMatched
    .map(keyword => keyword.replace(/^[+-]/, '').replace(/^rel:/, ''))
    .filter((keyword, index, arr) => arr.indexOf(keyword) === index)
}

function calculateAIQuality(aiAnalysis: Doc<'aiAnalysis'>): number {
  let quality = 0.5 // Base quality

  // Confidence boost
  quality += (aiAnalysis.confidenceLevel - 0.5) * 0.3

  // Processing time penalty (slower = lower quality perception)
  const processingTime = aiAnalysis.processingTime || 5000
  if (processingTime > 10000) quality -= 0.1
  if (processingTime < 3000) quality += 0.1

  // Keyword richness
  const keywordCount = (aiAnalysis.emotionalKeywords || []).length
  if (keywordCount > 5) quality += 0.1
  if (keywordCount < 2) quality -= 0.1

  // Pattern analysis bonus
  if (aiAnalysis.patterns) quality += 0.15

  return Math.max(0.1, Math.min(0.95, quality))
}

function determineQualityAdvantage(
  aiQuality: number,
  fallbackQuality: number
): 'ai' | 'fallback' | 'similar' {
  const difference = aiQuality - fallbackQuality
  if (Math.abs(difference) < 0.1) return 'similar'
  return difference > 0 ? 'ai' : 'fallback'
}

function calculateConfidenceReliability(
  aiConfidence: number,
  fallbackConfidence: number,
  agreement: boolean
): number {
  let reliability = 0.5 // Base reliability

  // Agreement increases reliability
  if (agreement) reliability += 0.3

  // High confidence from both increases reliability
  if (aiConfidence > 0.7 && fallbackConfidence > 0.7) reliability += 0.2

  // Low confidence from either decreases reliability
  if (aiConfidence < 0.3 || fallbackConfidence < 0.3) reliability -= 0.2

  return Math.max(0.1, Math.min(0.9, reliability))
}

function calculateKeywordOverlap(
  aiKeywords: string[],
  fallbackKeywords: string[]
): number {
  if (aiKeywords.length === 0 && fallbackKeywords.length === 0) return 1.0
  if (aiKeywords.length === 0 || fallbackKeywords.length === 0) return 0.0

  const intersection = aiKeywords.filter(keyword =>
    fallbackKeywords.some(
      fbKeyword =>
        fbKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
        keyword.toLowerCase().includes(fbKeyword.toLowerCase())
    )
  ).length

  const union = new Set([...aiKeywords, ...fallbackKeywords]).size
  return intersection / union
}

function calculateThemeAlignment(
  aiAnalysis: Doc<'aiAnalysis'>,
  fallbackResult: IntegratedFallbackResult
): number {
  // Compare patterns if available
  if (aiAnalysis.patterns && fallbackResult.standardizedResults.patterns) {
    const aiThemes = aiAnalysis.patterns.recurring_themes || []
    const fallbackThemes =
      fallbackResult.standardizedResults.patterns.recurring_themes || []

    if (aiThemes.length === 0 && fallbackThemes.length === 0) return 1.0
    if (aiThemes.length === 0 || fallbackThemes.length === 0) return 0.3

    const overlap = aiThemes.filter(theme =>
      fallbackThemes.some(
        fbTheme =>
          theme.toLowerCase().includes(fbTheme.toLowerCase()) ||
          fbTheme.toLowerCase().includes(theme.toLowerCase())
      )
    ).length

    return overlap / Math.max(aiThemes.length, fallbackThemes.length)
  }

  return 0.5 // Neutral when patterns not available
}

function calculateInsightSimilarity(
  aiAnalysis: Doc<'aiAnalysis'>,
  fallbackResult: IntegratedFallbackResult
): number {
  const aiReasoning = (aiAnalysis.reasoning || '').toLowerCase()
  const fallbackInsights = fallbackResult.fallbackAnalysis.insights
    .join(' ')
    .toLowerCase()

  if (aiReasoning.length === 0 && fallbackInsights.length === 0) return 1.0
  if (aiReasoning.length === 0 || fallbackInsights.length === 0) return 0.2

  // Simple word overlap calculation
  const aiWords = new Set(
    aiReasoning.split(/\s+/).filter(word => word.length > 3)
  )
  const fallbackWords = new Set(
    fallbackInsights.split(/\s+/).filter(word => word.length > 3)
  )

  const intersection = new Set(
    [...aiWords].filter(word => fallbackWords.has(word))
  )
  const union = new Set([...aiWords, ...fallbackWords])

  return intersection.size / union.size
}

function findContradictions(
  aiAnalysis: Doc<'aiAnalysis'>,
  fallbackResult: IntegratedFallbackResult
): string[] {
  const contradictions: string[] = []

  // Sentiment contradiction
  const aiSentiment = determineSentimentFromScore(aiAnalysis.sentimentScore)
  const fallbackSentiment = fallbackResult.fallbackAnalysis.sentiment

  if (
    aiSentiment !== fallbackSentiment &&
    aiSentiment !== 'neutral' &&
    fallbackSentiment !== 'neutral'
  ) {
    contradictions.push(
      `Sentiment mismatch: AI detected ${aiSentiment}, fallback detected ${fallbackSentiment}`
    )
  }

  // Confidence contradiction
  if (
    aiAnalysis.confidenceLevel > 0.8 &&
    fallbackResult.integration.confidence < 0.3
  ) {
    contradictions.push(
      `Confidence mismatch: AI very confident (${Math.round(aiAnalysis.confidenceLevel * 100)}%), fallback uncertain (${Math.round(fallbackResult.integration.confidence * 100)}%)`
    )
  }

  return contradictions
}

function generateUpgradeRecommendation(
  sentimentAgreement: any,
  qualityComparison: any,
  patternConsistency: any,
  performance: any
): any {
  let shouldUpgrade = false
  let confidence = 0.5
  let reason = ''
  let urgency: 'low' | 'medium' | 'high' = 'low'
  let estimatedImprovement = 0

  // Strong disagreement suggests potential fallback error
  if (
    !sentimentAgreement.agreement &&
    Math.abs(sentimentAgreement.confidenceDelta) > 0.3
  ) {
    shouldUpgrade = true
    confidence = 0.8
    reason = 'Significant sentiment disagreement with high AI confidence'
    urgency = 'high'
    estimatedImprovement = 0.4
  }
  // AI significantly higher quality
  else if (
    qualityComparison.qualityAdvantage === 'ai' &&
    qualityComparison.aiQuality - qualityComparison.fallbackQuality > 0.2
  ) {
    shouldUpgrade = true
    confidence = 0.7
    reason = 'AI analysis significantly higher quality'
    urgency = 'medium'
    estimatedImprovement =
      qualityComparison.aiQuality - qualityComparison.fallbackQuality
  }
  // Low pattern consistency with low fallback quality
  else if (
    patternConsistency.themeAlignment < 0.3 &&
    qualityComparison.fallbackQuality < 0.4
  ) {
    shouldUpgrade = true
    confidence = 0.6
    reason = 'Poor theme alignment and low fallback quality'
    urgency = 'medium'
    estimatedImprovement = 0.3
  }
  // Fallback quality is sufficient and agrees with AI
  else if (
    sentimentAgreement.agreement &&
    qualityComparison.fallbackQuality > 0.6
  ) {
    shouldUpgrade = false
    confidence = 0.8
    reason = 'Fallback quality sufficient with sentiment agreement'
    urgency = 'low'
    estimatedImprovement = 0.1
  }
  // Default case - minimal benefit
  else {
    shouldUpgrade = false
    confidence = 0.5
    reason = 'Minimal improvement expected from upgrade'
    urgency = 'low'
    estimatedImprovement = 0.05
  }

  return {
    shouldUpgrade,
    confidence,
    reason,
    urgency,
    estimatedImprovement,
  }
}

function calculateOverallQuality(fallbackAnalyses: Doc<'aiAnalysis'>[]): any {
  if (fallbackAnalyses.length === 0) {
    return {
      averageConfidence: 0,
      qualityTrend: 'stable' as const,
      successRate: 0,
      totalAnalyses: 0,
    }
  }

  const confidences = fallbackAnalyses.map(
    a => a.fallbackMetadata?.confidence || 0
  )
  const averageConfidence =
    confidences.reduce((sum, c) => sum + c, 0) / confidences.length

  const successRate =
    fallbackAnalyses.filter(a => (a.fallbackMetadata?.qualityScore || 0) >= 0.3)
      .length / fallbackAnalyses.length

  // Simple trend calculation (compare first half to second half)
  const midpoint = Math.floor(fallbackAnalyses.length / 2)
  const firstHalf = confidences.slice(0, midpoint)
  const secondHalf = confidences.slice(midpoint)

  const firstAvg =
    firstHalf.reduce((sum, c) => sum + c, 0) / firstHalf.length || 0
  const secondAvg =
    secondHalf.reduce((sum, c) => sum + c, 0) / secondHalf.length || 0

  let qualityTrend: 'improving' | 'declining' | 'stable' = 'stable'
  if (secondAvg - firstAvg > 0.1) qualityTrend = 'improving'
  else if (firstAvg - secondAvg > 0.1) qualityTrend = 'declining'

  return {
    averageConfidence,
    qualityTrend,
    successRate,
    totalAnalyses: fallbackAnalyses.length,
  }
}

async function calculateAIComparisonMetrics(
  ctx: any,
  fallbackAnalyses: Doc<'aiAnalysis'>[],
  aiAnalyses: Doc<'aiAnalysis'>[]
): Promise<any> {
  // This would need more sophisticated matching logic in a real implementation
  // For now, return placeholder metrics
  return {
    agreementRate: 0.75, // Placeholder - would calculate actual agreement
    qualityGap: 0.15, // Placeholder - average quality difference
    upgradeSuccessRate: 0.8, // Placeholder - success rate of upgrades
    falsePositiveRate: 0.2, // Placeholder - upgrades that didn't help
  }
}

function calculateCategoryPerformance(
  fallbackAnalyses: Doc<'aiAnalysis'>[],
  aiAnalyses: Doc<'aiAnalysis'>[]
): any {
  // Placeholder implementation - would analyze by relationship patterns, etc.
  return {
    communication: {
      confidence: 0.7,
      accuracy: 0.8,
      commonErrors: ['Misses subtle nuances'],
    },
    intimacy: {
      confidence: 0.6,
      accuracy: 0.75,
      commonErrors: ['Conservative scoring'],
    },
    conflict: {
      confidence: 0.8,
      accuracy: 0.85,
      commonErrors: ['Over-detects tension'],
    },
  }
}

function calculateConditionPerformance(
  fallbackAnalyses: Doc<'aiAnalysis'>[]
): any {
  const byTrigger = fallbackAnalyses.reduce(
    (acc, analysis) => {
      const trigger = analysis.fallbackMetadata?.trigger || 'unknown'
      if (!acc[trigger]) acc[trigger] = []
      acc[trigger].push(analysis)
      return acc
    },
    {} as Record<string, Doc<'aiAnalysis'>[]>
  )

  const calculateMetrics = (analyses: Doc<'aiAnalysis'>[]) => {
    const confidences = analyses.map(a => a.fallbackMetadata?.confidence || 0)
    const successes = analyses.filter(
      a => (a.fallbackMetadata?.qualityScore || 0) >= 0.3
    )
    return {
      confidence:
        confidences.reduce((sum, c) => sum + c, 0) / confidences.length || 0,
      successRate: successes.length / analyses.length || 0,
    }
  }

  return {
    circuitBreakerOpen: calculateMetrics(
      byTrigger['circuit_breaker_open'] || []
    ),
    retryExhausted: calculateMetrics(byTrigger['retry_exhausted'] || []),
    rateLimited: calculateMetrics(byTrigger['rate_limit'] || []),
    apiUnavailable: calculateMetrics(byTrigger['api_unavailable'] || []),
  }
}

function calculateTimeAnalysis(fallbackAnalyses: Doc<'aiAnalysis'>[]): any {
  // Placeholder implementation - would do proper temporal analysis
  return {
    hourlyPerformance: [],
    weeklyTrend: [],
    seasonalPattern: 'Consistent performance across time periods',
  }
}

function predictAIQuality(
  fallbackAnalysis: Doc<'aiAnalysis'>,
  recentAIAnalyses: Doc<'aiAnalysis'>[]
): number {
  if (recentAIAnalyses.length === 0) return 0.7 // Default prediction

  // Calculate average AI quality from recent analyses
  const avgQuality =
    recentAIAnalyses.reduce((sum, analysis) => {
      return sum + calculateAIQuality(analysis)
    }, 0) / recentAIAnalyses.length

  // Adjust based on fallback analysis characteristics
  let adjustment = 0
  const fallbackKeywords = fallbackAnalysis.emotionalKeywords?.length || 0
  if (fallbackKeywords > 5) adjustment += 0.1 // Rich content likely to benefit from AI
  if (fallbackKeywords < 2) adjustment -= 0.1 // Simple content may not benefit much

  return Math.max(0.1, Math.min(0.95, avgQuality + adjustment))
}

function estimateCostForUpgrade(fallbackAnalysis: Doc<'aiAnalysis'>): number {
  // Estimate cost based on content length and complexity
  const contentLength = (fallbackAnalysis.emotionalKeywords?.length || 0) * 10 // Rough estimate
  const baseCost = 0.02 // Base cost for analysis
  const lengthCost = (contentLength / 1000) * 0.01 // Cost per 1k characters

  return baseCost + lengthCost
}
