/**
 * AI Service Fallback and Graceful Degradation
 * Provides alternative functionality when AI services are unavailable
 */

import { AnalysisType, AIAnalysisResults, HealthScoreComponents } from '../types'
import { SentimentAnalysisResult } from './gemini-client'
import { AIServiceConnectionError, AIServiceAuthError, AIResourceLimitError, AIError } from './errors'

// Fallback sentiment analysis using rule-based approach
class FallbackSentimentAnalyzer {
  private positiveWords = new Set([
    'amazing', 'awesome', 'beautiful', 'best', 'better', 'brilliant', 'celebrate', 'confident',
    'connected', 'content', 'delighted', 'excellent', 'excited', 'fantastic', 'fulfilled',
    'grateful', 'great', 'happy', 'incredible', 'joy', 'joyful', 'love', 'loving', 'marvelous',
    'perfect', 'pleased', 'positive', 'proud', 'satisfied', 'successful', 'super', 'thrilled',
    'wonderful', 'warm', 'caring', 'supportive', 'understanding', 'close', 'intimate',
    'romantic', 'passionate', 'tender', 'affectionate', 'devoted', 'cherish'
  ])

  private negativeWords = new Set([
    'angry', 'annoyed', 'anxious', 'awful', 'bad', 'bitter', 'broken', 'confused', 'cruel',
    'depressed', 'disappointed', 'disgusted', 'distressed', 'dreadful', 'exhausted', 'failed',
    'fearful', 'frustrated', 'furious', 'hate', 'horrible', 'hurt', 'irritated', 'lonely',
    'mad', 'miserable', 'nervous', 'painful', 'rejected', 'sad', 'scared', 'stressed',
    'terrible', 'tired', 'uncomfortable', 'unhappy', 'upset', 'worried', 'worst',
    'distant', 'disconnected', 'argue', 'fight', 'conflict', 'tension', 'cold'
  ])

  private neutralWords = new Set([
    'okay', 'fine', 'normal', 'regular', 'usual', 'typical', 'average', 'standard',
    'calm', 'peaceful', 'quiet', 'stable', 'steady', 'routine', 'ordinary'
  ])

  private relationshipPositive = new Set([
    'together', 'share', 'support', 'listen', 'understand', 'communicate', 'laugh',
    'hug', 'kiss', 'cuddle', 'date', 'surprise', 'gift', 'celebrate', 'vacation',
    'adventure', 'plan', 'future', 'trust', 'respect', 'appreciate', 'admire'
  ])

  private relationshipNegative = new Set([
    'argue', 'fight', 'yell', 'ignore', 'silent', 'distance', 'separate', 'alone',
    'misunderstand', 'disagree', 'blame', 'criticize', 'judge', 'reject', 'abandon',
    'betray', 'lie', 'cheat', 'jealous', 'possessive', 'controlling', 'demanding'
  ])

  analyzeSentiment(text: string): SentimentAnalysisResult {
    const words = this.tokenize(text.toLowerCase())
    const scores = this.scoreWords(words)
    const emotions = this.detectEmotions(words)
    
    // Calculate weighted sentiment score
    let sentimentScore = 5.0 // Start neutral
    
    // Base scoring from word analysis
    const totalWords = words.length
    const positiveImpact = (scores.positive / totalWords) * 3
    const negativeImpact = (scores.negative / totalWords) * -3
    const relationshipPositiveImpact = (scores.relationshipPositive / totalWords) * 2
    const relationshipNegativeImpact = (scores.relationshipNegative / totalWords) * -2
    
    sentimentScore += positiveImpact + negativeImpact + relationshipPositiveImpact + relationshipNegativeImpact
    
    // Apply modifiers based on text patterns
    sentimentScore = this.applyPatternModifiers(text, sentimentScore)
    
    // Clamp to valid range
    sentimentScore = Math.max(1, Math.min(10, sentimentScore))
    
    // Calculate confidence based on word coverage and pattern clarity
    const confidence = this.calculateConfidence(scores, totalWords, text)
    
    return {
      sentiment_score: Math.round(sentimentScore * 10) / 10, // Round to 1 decimal
      emotions_detected: emotions,
      confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
      explanation: `Fallback analysis: ${this.getExplanation(sentimentScore, emotions)}`
    }
  }

  private tokenize(text: string): string[] {
    return text
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 1) // Remove single characters
  }

  private scoreWords(words: string[]): {
    positive: number
    negative: number
    neutral: number
    relationshipPositive: number
    relationshipNegative: number
  } {
    let positive = 0, negative = 0, neutral = 0
    let relationshipPositive = 0, relationshipNegative = 0

    for (const word of words) {
      if (this.positiveWords.has(word)) positive++
      else if (this.negativeWords.has(word)) negative++
      else if (this.neutralWords.has(word)) neutral++
      
      if (this.relationshipPositive.has(word)) relationshipPositive++
      else if (this.relationshipNegative.has(word)) relationshipNegative++
    }

    return { positive, negative, neutral, relationshipPositive, relationshipNegative }
  }

  private detectEmotions(words: string[]): string[] {
    const emotions: string[] = []
    
    // Emotion detection based on word patterns
    const emotionPatterns = {
      joy: ['happy', 'joyful', 'excited', 'thrilled', 'delighted', 'celebrate'],
      love: ['love', 'loving', 'adore', 'cherish', 'devoted', 'affectionate'],
      anger: ['angry', 'furious', 'mad', 'irritated', 'frustrated', 'rage'],
      sadness: ['sad', 'depressed', 'miserable', 'hurt', 'disappointed', 'lonely'],
      fear: ['scared', 'fearful', 'anxious', 'worried', 'nervous', 'afraid'],
      surprise: ['surprised', 'amazed', 'shocked', 'unexpected', 'sudden'],
      contentment: ['content', 'satisfied', 'peaceful', 'calm', 'fulfilled'],
      gratitude: ['grateful', 'thankful', 'appreciate', 'blessed', 'fortunate']
    }

    for (const [emotion, patterns] of Object.entries(emotionPatterns)) {
      if (patterns.some(pattern => words.includes(pattern))) {
        emotions.push(emotion)
      }
    }

    // Default emotions if none detected
    if (emotions.length === 0) {
      emotions.push('neutral')
    }

    return emotions
  }

  private applyPatternModifiers(text: string, baseScore: number): number {
    let modifiedScore = baseScore
    
    // Exclamation marks suggest stronger emotion
    const exclamations = (text.match(/!/g) || []).length
    if (exclamations > 0) {
      const modifier = baseScore > 5 ? 0.5 : -0.5 // Amplify existing sentiment
      modifiedScore += Math.min(exclamations * modifier, 1.5)
    }
    
    // Question marks might suggest uncertainty or concern
    const questions = (text.match(/\?/g) || []).length
    if (questions > 0) {
      modifiedScore -= questions * 0.2
    }
    
    // Negation patterns
    const negationWords = ['not', 'no', 'never', 'none', 'nothing', 'nobody', 'nowhere']
    const hasNegation = negationWords.some(word => text.toLowerCase().includes(word))
    if (hasNegation && baseScore !== 5) {
      // Flip sentiment if strong negation is present
      modifiedScore = 10 - modifiedScore + 5 // Invert around neutral point
    }
    
    // Intensity modifiers
    const intensifiers = ['very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely']
    const hasIntensifier = intensifiers.some(word => text.toLowerCase().includes(word))
    if (hasIntensifier) {
      const direction = baseScore > 5 ? 1 : -1
      modifiedScore += direction * 0.8
    }
    
    return modifiedScore
  }

  private calculateConfidence(scores: any, totalWords: number, text: string): number {
    if (totalWords === 0) return 0.3
    
    // Base confidence from word coverage
    const emotionalWords = scores.positive + scores.negative + scores.relationshipPositive + scores.relationshipNegative
    const coverage = emotionalWords / totalWords
    
    let confidence = Math.min(coverage * 2, 0.8) // Max 0.8 for rule-based
    
    // Boost confidence for clear patterns
    if (text.length > 20) confidence += 0.1 // Longer text usually more reliable
    if (emotionalWords >= 3) confidence += 0.1 // Multiple emotional indicators
    
    // Reduce confidence for very short or unclear text
    if (text.length < 10) confidence *= 0.5
    if (totalWords < 3) confidence *= 0.6
    
    return Math.max(0.2, Math.min(0.85, confidence)) // Clamp between 0.2-0.85
  }

  private getExplanation(score: number, emotions: string[]): string {
    const intensity = score >= 8 ? 'very positive' :
                     score >= 6.5 ? 'positive' :
                     score >= 4.5 ? 'neutral' :
                     score >= 3 ? 'negative' : 'very negative'
    
    const emotionList = emotions.length > 0 ? emotions.join(', ') : 'neutral'
    
    return `${intensity} sentiment detected with emotions: ${emotionList}`
  }
}

// Fallback health score calculator
class FallbackHealthScoreCalculator {
  calculateBasicHealthScore(
    recentSentiments: Array<{ score: number; timestamp: number }>,
    analysisCount: number = 0
  ): HealthScoreComponents {
    if (recentSentiments.length === 0) {
      // Default neutral scores when no data
      return {
        sentiment: 50,
        emotionalStability: 50,
        energyImpact: 50,
        conflictResolution: 50,
        gratitude: 50,
        communicationFrequency: Math.min(analysisCount * 10, 100) // Based on entry frequency
      }
    }

    // Calculate sentiment component (35% weight)
    const avgSentiment = recentSentiments.reduce((sum, s) => sum + s.score, 0) / recentSentiments.length
    const sentimentScore = Math.round((avgSentiment / 10) * 100) // Convert 1-10 to 0-100

    // Calculate stability (20% weight) - based on variance
    const variance = this.calculateVariance(recentSentiments.map(s => s.score))
    const stabilityScore = Math.round(Math.max(0, 100 - (variance * 20))) // Lower variance = higher stability

    // Estimate other components based on sentiment patterns
    const energyScore = Math.round(Math.max(20, sentimentScore * 0.8 + 20)) // Energy correlates with sentiment
    const conflictScore = Math.round(Math.max(30, sentimentScore * 0.7 + 30)) // Positive sentiment suggests less conflict
    const gratitudeScore = Math.round(Math.max(25, sentimentScore * 0.6 + 25)) // Positive sentiment suggests more gratitude
    const communicationScore = Math.min(analysisCount * 8, 100) // Based on entry frequency

    return {
      sentiment: sentimentScore,
      emotionalStability: stabilityScore,
      energyImpact: energyScore,
      conflictResolution: conflictScore,
      gratitude: gratitudeScore,
      communicationFrequency: communicationScore
    }
  }

  private calculateVariance(scores: number[]): number {
    if (scores.length < 2) return 0
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length
  }
}

// Main fallback service
export class AIFallbackService {
  private sentimentAnalyzer = new FallbackSentimentAnalyzer()
  private healthCalculator = new FallbackHealthScoreCalculator()
  private fallbackActive = false
  private lastFallbackReason?: string

  // Check if we should use fallback based on error type
  shouldUseFallback(error: AIError): boolean {
    // Use fallback for service issues, but not for content/auth issues
    return error instanceof AIServiceConnectionError ||
           error instanceof AIResourceLimitError ||
           (error instanceof AIServiceAuthError && error.retryable)
  }

  // Activate fallback mode
  activateFallback(reason: string): void {
    this.fallbackActive = true
    this.lastFallbackReason = reason
    console.warn(`🔄 AI Fallback Mode Activated: ${reason}`)
  }

  // Deactivate fallback mode
  deactivateFallback(): void {
    if (this.fallbackActive) {
      console.info(`✅ AI Fallback Mode Deactivated`)
      this.fallbackActive = false
      this.lastFallbackReason = undefined
    }
  }

  // Check if fallback is currently active
  isFallbackActive(): boolean {
    return this.fallbackActive
  }

  // Get fallback reason
  getFallbackReason(): string | undefined {
    return this.lastFallbackReason
  }

  // Fallback sentiment analysis
  async analyzeSentimentFallback(journalEntry: string): Promise<SentimentAnalysisResult> {
    console.info(`🔄 Using fallback sentiment analysis`)
    
    try {
      const result = this.sentimentAnalyzer.analyzeSentiment(journalEntry)
      
      // Add fallback indicator to explanation
      result.explanation = `${result.explanation} (Using offline analysis due to service unavailability)`
      
      return result
    } catch (error) {
      // Even fallback failed - return minimal response
      return {
        sentiment_score: 5.0,
        emotions_detected: ['neutral'],
        confidence: 0.3,
        explanation: 'Minimal fallback analysis - AI services unavailable'
      }
    }
  }

  // Fallback emotional stability analysis
  async analyzeStabilityFallback(
    sentimentHistory: Array<{ score: number; timestamp: number; emotions?: string[] }>
  ): Promise<{
    stability_score: number
    trend_direction: 'improving' | 'declining' | 'stable'
    volatility_level: 'low' | 'moderate' | 'high'
    recovery_patterns: string
  }> {
    console.info(`🔄 Using fallback stability analysis`)
    
    if (sentimentHistory.length < 2) {
      return {
        stability_score: 50,
        trend_direction: 'stable',
        volatility_level: 'moderate',
        recovery_patterns: 'Insufficient data for pattern analysis (offline mode)'
      }
    }

    const scores = sentimentHistory.map(h => h.score)
    const recent = scores.slice(0, Math.min(10, scores.length))
    const older = scores.slice(10, Math.min(20, scores.length))
    
    // Calculate stability metrics
    const variance = this.calculateVariance(scores)
    const stabilityScore = Math.max(0, Math.min(100, 100 - (variance * 15)))
    
    // Determine trend
    const recentAvg = recent.reduce((sum, s) => sum + s, 0) / recent.length
    const olderAvg = older.length > 0 ? older.reduce((sum, s) => sum + s, 0) / older.length : recentAvg
    
    let trendDirection: 'improving' | 'declining' | 'stable'
    if (recentAvg > olderAvg + 0.5) trendDirection = 'improving'
    else if (recentAvg < olderAvg - 0.5) trendDirection = 'declining'
    else trendDirection = 'stable'
    
    // Determine volatility
    let volatilityLevel: 'low' | 'moderate' | 'high'
    if (variance < 1) volatilityLevel = 'low'
    else if (variance < 3) volatilityLevel = 'moderate'
    else volatilityLevel = 'high'
    
    return {
      stability_score: Math.round(stabilityScore),
      trend_direction: trendDirection,
      volatility_level: volatilityLevel,
      recovery_patterns: `Basic pattern analysis shows ${volatilityLevel} volatility with ${trendDirection} trend (offline mode)`
    }
  }

  // Fallback energy analysis
  async analyzeEnergyFallback(journalEntry: string): Promise<{
    energy_score: number
    energy_indicators: string[]
    overall_effect: 'energizing' | 'neutral' | 'draining'
    explanation: string
  }> {
    console.info(`🔄 Using fallback energy analysis`)
    
    // Use sentiment as proxy for energy
    const sentiment = this.sentimentAnalyzer.analyzeSentiment(journalEntry)
    
    // Convert sentiment to energy scoring
    const energyScore = Math.round(sentiment.sentiment_score)
    const energyIndicators = sentiment.emotions_detected.map(emotion => `${emotion} energy`)
    
    let overallEffect: 'energizing' | 'neutral' | 'draining'
    if (energyScore >= 7) overallEffect = 'energizing'
    else if (energyScore >= 4) overallEffect = 'neutral'
    else overallEffect = 'draining'
    
    return {
      energy_score: energyScore,
      energy_indicators: energyIndicators,
      overall_effect: overallEffect,
      explanation: `Energy analysis based on sentiment patterns: ${overallEffect} effect detected (offline mode)`
    }
  }

  // Fallback health score calculation
  async calculateHealthScoreFallback(
    relationshipData: {
      recentSentiments: Array<{ score: number; timestamp: number }>
      totalAnalyses: number
      daysSinceLastEntry: number
    }
  ): Promise<{
    overallScore: number
    componentScores: HealthScoreComponents
    confidenceLevel: number
    message: string
  }> {
    console.info(`🔄 Using fallback health score calculation`)
    
    const componentScores = this.healthCalculator.calculateBasicHealthScore(
      relationshipData.recentSentiments,
      relationshipData.totalAnalyses
    )
    
    // Calculate overall score (weighted average)
    const weights = { sentiment: 0.35, emotionalStability: 0.20, energyImpact: 0.15, conflictResolution: 0.15, gratitude: 0.10, communicationFrequency: 0.05 }
    const overallScore = Math.round(
      componentScores.sentiment * weights.sentiment +
      componentScores.emotionalStability * weights.emotionalStability +
      componentScores.energyImpact * weights.energyImpact +
      componentScores.conflictResolution * weights.conflictResolution +
      componentScores.gratitude * weights.gratitude +
      componentScores.communicationFrequency * weights.communicationFrequency
    )
    
    // Lower confidence for fallback calculations
    const baseConfidence = Math.min(relationshipData.totalAnalyses / 20, 0.8)
    const recencyPenalty = Math.min(relationshipData.daysSinceLastEntry / 30, 0.3)
    const confidenceLevel = Math.max(0.2, baseConfidence - recencyPenalty - 0.2) // Fallback penalty
    
    return {
      overallScore,
      componentScores,
      confidenceLevel,
      message: `Health score calculated using offline analysis. Results may be less accurate than AI-powered analysis.`
    }
  }

  private calculateVariance(scores: number[]): number {
    if (scores.length < 2) return 0
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length
  }

  // Get fallback status for monitoring
  getStatus(): {
    active: boolean
    reason?: string
    activatedAt?: number
    capabilities: string[]
  } {
    return {
      active: this.fallbackActive,
      reason: this.lastFallbackReason,
      capabilities: [
        'Rule-based sentiment analysis',
        'Basic stability patterns',
        'Energy estimation from sentiment',
        'Health score calculation'
      ]
    }
  }
}

// Singleton fallback service
export const aiFallback = new AIFallbackService()

// Helper function to automatically handle fallback
export async function withFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  errorContext: string = 'AI operation'
): Promise<T> {
  try {
    const result = await primaryFn()
    
    // If we were in fallback mode and this succeeded, deactivate fallback
    if (aiFallback.isFallbackActive()) {
      aiFallback.deactivateFallback()
    }
    
    return result
  } catch (error) {
    if (error instanceof AIError && aiFallback.shouldUseFallback(error)) {
      console.warn(`⚠️ ${errorContext} failed, using fallback:`, error.message)
      
      if (!aiFallback.isFallbackActive()) {
        aiFallback.activateFallback(`${errorContext} failure: ${error.constructor.name}`)
      }
      
      return await fallbackFn()
    }
    
    // For non-fallback-eligible errors, re-throw
    throw error
  }
}

export default aiFallback