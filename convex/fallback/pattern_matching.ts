/**
 * Advanced pattern matching for fallback analysis
 * Provides sophisticated relationship insights when AI is unavailable (Story AI-Migration.4)
 */

import { FallbackAnalysisResult } from './sentiment_analysis'

export interface PatternMatch {
  name: string
  pattern: RegExp
  category:
    | 'communication'
    | 'intimacy'
    | 'conflict'
    | 'growth'
    | 'stress'
    | 'celebration'
  sentiment: 'positive' | 'negative' | 'neutral'
  confidence: number
  insight: string
  weight: number
}

export interface PatternAnalysisResult {
  matches: PatternMatch[]
  categoryScores: Record<string, number>
  dominantCategory: string | null
  overallSentiment: 'positive' | 'negative' | 'neutral'
  confidenceScore: number
  relationshipInsights: string[]
}

/**
 * Comprehensive relationship pattern library
 */
export const RELATIONSHIP_PATTERNS: PatternMatch[] = [
  // Communication Patterns
  {
    name: 'active_listening',
    pattern:
      /\b(listen|heard|understand|acknowledge|validate)\b.*\b(feelings|thoughts|perspective|point of view)\b/i,
    category: 'communication',
    sentiment: 'positive',
    confidence: 0.8,
    insight: 'Active listening and validation in communication',
    weight: 1.5,
  },
  {
    name: 'open_dialogue',
    pattern:
      /\b(talked|discussed|shared|opened up|communicated)\b.*\b(openly|honestly|deeply|freely)\b/i,
    category: 'communication',
    sentiment: 'positive',
    confidence: 0.7,
    insight: 'Open and honest communication',
    weight: 1.3,
  },
  {
    name: 'communication_breakdown',
    pattern:
      /\b(can't talk|won't listen|shut down|silent treatment|avoiding|ignoring)\b/i,
    category: 'communication',
    sentiment: 'negative',
    confidence: 0.8,
    insight: 'Communication barriers or breakdown',
    weight: -1.4,
  },
  {
    name: 'misunderstanding',
    pattern: /\b(misunderstood|confused|mixed signals|unclear|assumption)\b/i,
    category: 'communication',
    sentiment: 'negative',
    confidence: 0.6,
    insight: 'Misunderstandings affecting communication',
    weight: -1.0,
  },

  // Intimacy Patterns
  {
    name: 'emotional_intimacy',
    pattern:
      /\b(vulnerable|intimate|close|connected|bonded|deep)\b.*\b(conversation|moment|sharing|experience)\b/i,
    category: 'intimacy',
    sentiment: 'positive',
    confidence: 0.8,
    insight: 'Emotional intimacy and connection',
    weight: 1.6,
  },
  {
    name: 'physical_affection',
    pattern: /\b(hug|kiss|cuddle|hold hands|touch|caress|embrace)\b/i,
    category: 'intimacy',
    sentiment: 'positive',
    confidence: 0.7,
    insight: 'Physical affection and intimacy',
    weight: 1.2,
  },
  {
    name: 'quality_time',
    pattern:
      /\b(spent time|enjoyed|together|date|adventure|memory|experience)\b.*\b(partner|spouse|loved one)\b/i,
    category: 'intimacy',
    sentiment: 'positive',
    confidence: 0.6,
    insight: 'Quality time and shared experiences',
    weight: 1.1,
  },
  {
    name: 'emotional_distance',
    pattern: /\b(distant|cold|withdrawn|detached|unavailable|disconnected)\b/i,
    category: 'intimacy',
    sentiment: 'negative',
    confidence: 0.7,
    insight: 'Emotional distance or disconnection',
    weight: -1.3,
  },
  {
    name: 'intimacy_concerns',
    pattern:
      /\b(lack of|missing|no|little)\b.*\b(intimacy|closeness|connection|affection)\b/i,
    category: 'intimacy',
    sentiment: 'negative',
    confidence: 0.6,
    insight: 'Concerns about intimacy levels',
    weight: -1.1,
  },

  // Conflict Patterns
  {
    name: 'constructive_conflict',
    pattern:
      /\b(disagreed|different views)\b.*\b(respectfully|calmly|worked through|resolved)\b/i,
    category: 'conflict',
    sentiment: 'positive',
    confidence: 0.7,
    insight: 'Constructive conflict resolution',
    weight: 1.4,
  },
  {
    name: 'compromise',
    pattern:
      /\b(compromise|middle ground|meet halfway|both|agreed|solution)\b/i,
    category: 'conflict',
    sentiment: 'positive',
    confidence: 0.8,
    insight: 'Successful compromise and problem-solving',
    weight: 1.5,
  },
  {
    name: 'heated_argument',
    pattern: /\b(fight|argue|yell|scream|shouting|heated|explosive)\b/i,
    category: 'conflict',
    sentiment: 'negative',
    confidence: 0.8,
    insight: 'Intense conflict or heated argument',
    weight: -1.5,
  },
  {
    name: 'recurring_issues',
    pattern:
      /\b(again|same|always|never|every time|constantly|repeatedly)\b.*\b(problem|issue|fight|argument)\b/i,
    category: 'conflict',
    sentiment: 'negative',
    confidence: 0.7,
    insight: 'Recurring relationship issues',
    weight: -1.3,
  },
  {
    name: 'unresolved_tension',
    pattern: /\b(tension|awkward|uncomfortable|unresolved|hanging|avoiding)\b/i,
    category: 'conflict',
    sentiment: 'negative',
    confidence: 0.6,
    insight: 'Unresolved tension or avoidance',
    weight: -1.1,
  },

  // Growth Patterns
  {
    name: 'relationship_growth',
    pattern:
      /\b(growing|improving|progress|development|stronger|better)\b.*\b(relationship|us|we|together)\b/i,
    category: 'growth',
    sentiment: 'positive',
    confidence: 0.7,
    insight: 'Relationship growth and improvement',
    weight: 1.3,
  },
  {
    name: 'learning_together',
    pattern:
      /\b(learned|discovered|realized|understood)\b.*\b(about each other|together|as a couple)\b/i,
    category: 'growth',
    sentiment: 'positive',
    confidence: 0.6,
    insight: 'Learning and discovery in relationship',
    weight: 1.2,
  },
  {
    name: 'personal_growth',
    pattern:
      /\b(growing|changing|developing|improving|becoming)\b.*\b(person|individual|better|stronger)\b/i,
    category: 'growth',
    sentiment: 'positive',
    confidence: 0.5,
    insight: 'Personal growth affecting relationship',
    weight: 1.0,
  },
  {
    name: 'stagnation',
    pattern: /\b(stuck|same|routine|boring|monotonous|stagnant|unchanging)\b/i,
    category: 'growth',
    sentiment: 'negative',
    confidence: 0.6,
    insight: 'Feeling of stagnation or lack of growth',
    weight: -1.0,
  },

  // Stress Patterns
  {
    name: 'external_stress',
    pattern:
      /\b(work|job|family|money|health|stress|pressure)\b.*\b(affecting|impacting|difficult|challenging)\b.*\b(relationship|us)\b/i,
    category: 'stress',
    sentiment: 'negative',
    confidence: 0.6,
    insight: 'External stressors affecting relationship',
    weight: -1.1,
  },
  {
    name: 'stress_support',
    pattern:
      /\b(support|helped|there for|comfort|understanding)\b.*\b(stress|difficult|challenge|problem)\b/i,
    category: 'stress',
    sentiment: 'positive',
    confidence: 0.7,
    insight: 'Mutual support during stressful times',
    weight: 1.2,
  },
  {
    name: 'overwhelmed',
    pattern: /\b(overwhelmed|exhausted|tired|drained|can't cope|too much)\b/i,
    category: 'stress',
    sentiment: 'negative',
    confidence: 0.6,
    insight: 'Feeling overwhelmed or exhausted',
    weight: -1.0,
  },

  // Celebration Patterns
  {
    name: 'milestone_celebration',
    pattern:
      /\b(anniversary|birthday|achievement|success|celebration|milestone|special)\b/i,
    category: 'celebration',
    sentiment: 'positive',
    confidence: 0.8,
    insight: 'Celebrating milestones or achievements',
    weight: 1.4,
  },
  {
    name: 'gratitude_expression',
    pattern:
      /\b(grateful|thankful|appreciate|blessed|fortunate|lucky)\b.*\b(partner|relationship|love|support)\b/i,
    category: 'celebration',
    sentiment: 'positive',
    confidence: 0.7,
    insight: 'Expressing gratitude for relationship',
    weight: 1.3,
  },
  {
    name: 'shared_joy',
    pattern:
      /\b(happy|joy|delight|excitement|fun|laughter)\b.*\b(together|shared|both|we)\b/i,
    category: 'celebration',
    sentiment: 'positive',
    confidence: 0.6,
    insight: 'Shared joy and positive experiences',
    weight: 1.1,
  },
]

/**
 * Analyze patterns in journal content
 */
export function analyzePatterns(content: string): PatternAnalysisResult {
  const matches: PatternMatch[] = []
  const categoryScores: Record<string, number> = {}

  // Test each pattern against the content
  for (const pattern of RELATIONSHIP_PATTERNS) {
    if (pattern.pattern.test(content)) {
      matches.push(pattern)

      // Accumulate category scores
      if (!categoryScores[pattern.category]) {
        categoryScores[pattern.category] = 0
      }
      categoryScores[pattern.category] += pattern.weight
    }
  }

  // Determine dominant category
  let dominantCategory: string | null = null
  let maxScore = 0
  for (const [category, score] of Object.entries(categoryScores)) {
    if (Math.abs(score) > Math.abs(maxScore)) {
      maxScore = score
      dominantCategory = category
    }
  }

  // Calculate overall sentiment from matches
  const totalWeight = matches.reduce(
    (sum, match) => sum + Math.abs(match.weight),
    0
  )
  const sentimentScore = matches.reduce((sum, match) => sum + match.weight, 0)
  const normalizedSentiment = totalWeight > 0 ? sentimentScore / totalWeight : 0

  let overallSentiment: 'positive' | 'negative' | 'neutral'
  if (normalizedSentiment > 0.2) {
    overallSentiment = 'positive'
  } else if (normalizedSentiment < -0.2) {
    overallSentiment = 'negative'
  } else {
    overallSentiment = 'neutral'
  }

  // Calculate confidence based on number and strength of matches
  const confidenceScore = Math.min(
    matches.length * 0.15 + (totalWeight / matches.length || 0) * 0.1,
    0.9
  )

  // Generate relationship insights
  const relationshipInsights = generateRelationshipInsights(
    matches,
    categoryScores,
    dominantCategory
  )

  return {
    matches,
    categoryScores,
    dominantCategory,
    overallSentiment,
    confidenceScore,
    relationshipInsights,
  }
}

/**
 * Generate contextual relationship insights from pattern analysis
 */
function generateRelationshipInsights(
  matches: PatternMatch[],
  categoryScores: Record<string, number>,
  dominantCategory: string | null
): string[] {
  const insights: string[] = []

  if (matches.length === 0) {
    insights.push('No specific relationship patterns detected')
    return insights
  }

  // Category-specific insights
  if (dominantCategory) {
    const score = categoryScores[dominantCategory]
    if (score > 0) {
      insights.push(`Strong positive patterns in ${dominantCategory} detected`)
    } else {
      insights.push(`Challenges in ${dominantCategory} area identified`)
    }
  }

  // Multi-category insights
  const positiveCategories = Object.entries(categoryScores)
    .filter(([_, score]) => score > 0)
    .map(([category, _]) => category)

  const negativeCategories = Object.entries(categoryScores)
    .filter(([_, score]) => score < 0)
    .map(([category, _]) => category)

  if (positiveCategories.length >= 2) {
    insights.push(
      `Multiple relationship strengths identified: ${positiveCategories.join(', ')}`
    )
  }

  if (negativeCategories.length >= 2) {
    insights.push(
      `Several areas may need attention: ${negativeCategories.join(', ')}`
    )
  }

  // Specific pattern combinations
  const matchNames = matches.map(m => m.name)

  if (
    matchNames.includes('active_listening') &&
    matchNames.includes('emotional_intimacy')
  ) {
    insights.push(
      'Strong communication foundation supporting emotional connection'
    )
  }

  if (
    matchNames.includes('heated_argument') &&
    matchNames.includes('compromise')
  ) {
    insights.push(
      'Conflict resolution skills evident despite intense disagreements'
    )
  }

  if (
    matchNames.includes('external_stress') &&
    matchNames.includes('stress_support')
  ) {
    insights.push('Relationship showing resilience under external pressure')
  }

  if (
    matchNames.includes('recurring_issues') &&
    !matchNames.includes('compromise')
  ) {
    insights.push(
      'Recurring issues may benefit from new conflict resolution approaches'
    )
  }

  // Growth trajectory insights
  if (
    matchNames.includes('relationship_growth') ||
    matchNames.includes('learning_together')
  ) {
    insights.push('Positive growth trajectory in relationship development')
  }

  if (matchNames.includes('stagnation') && positiveCategories.length === 0) {
    insights.push(
      'Consider exploring new activities or approaches to break routine patterns'
    )
  }

  return insights
}

/**
 * Enhanced pattern matching with contextual analysis
 */
export function performAdvancedPatternAnalysis(
  content: string,
  previousEntries?: string[]
): PatternAnalysisResult & {
  trendAnalysis?: {
    improving: string[]
    declining: string[]
    stable: string[]
  }
  contextualInsights: string[]
} {
  const currentAnalysis = analyzePatterns(content)

  // If no previous entries, return basic analysis
  if (!previousEntries || previousEntries.length === 0) {
    return {
      ...currentAnalysis,
      contextualInsights: [
        'Analysis based on current entry only',
        'Consider multiple entries for trend analysis',
      ],
    }
  }

  // Analyze trends across entries
  const previousAnalyses = previousEntries.map(entry => analyzePatterns(entry))
  const trendAnalysis = analyzeTrends(currentAnalysis, previousAnalyses)

  // Generate contextual insights
  const contextualInsights = generateContextualInsights(
    currentAnalysis,
    previousAnalyses,
    trendAnalysis
  )

  return {
    ...currentAnalysis,
    trendAnalysis,
    contextualInsights,
  }
}

/**
 * Analyze trends across multiple entries
 */
function analyzeTrends(
  current: PatternAnalysisResult,
  previous: PatternAnalysisResult[]
): {
  improving: string[]
  declining: string[]
  stable: string[]
} {
  const improving: string[] = []
  const declining: string[] = []
  const stable: string[] = []

  // Compare category scores over time
  const categories = [
    'communication',
    'intimacy',
    'conflict',
    'growth',
    'stress',
    'celebration',
  ]

  for (const category of categories) {
    const currentScore = current.categoryScores[category] || 0
    const previousScores = previous
      .map(p => p.categoryScores[category] || 0)
      .filter(score => score !== 0)

    if (previousScores.length === 0) continue

    const avgPreviousScore =
      previousScores.reduce((sum, score) => sum + score, 0) /
      previousScores.length
    const change = currentScore - avgPreviousScore

    if (change > 0.5) {
      improving.push(category)
    } else if (change < -0.5) {
      declining.push(category)
    } else {
      stable.push(category)
    }
  }

  return { improving, declining, stable }
}

/**
 * Generate contextual insights from trend analysis
 */
function generateContextualInsights(
  current: PatternAnalysisResult,
  previous: PatternAnalysisResult[],
  trends: { improving: string[]; declining: string[]; stable: string[] }
): string[] {
  const insights: string[] = []

  if (trends.improving.length > 0) {
    insights.push(`Positive trends observed in: ${trends.improving.join(', ')}`)
  }

  if (trends.declining.length > 0) {
    insights.push(
      `Areas showing decline: ${trends.declining.join(', ')} - may need attention`
    )
  }

  if (trends.stable.length > 0) {
    insights.push(`Consistent patterns in: ${trends.stable.join(', ')}`)
  }

  // Overall trajectory
  const overallTrend = trends.improving.length - trends.declining.length
  if (overallTrend > 1) {
    insights.push('Overall relationship trajectory appears positive')
  } else if (overallTrend < -1) {
    insights.push(
      'Multiple areas showing challenges - consider focusing on core relationship strengths'
    )
  } else {
    insights.push(
      'Relationship showing mixed patterns - normal variation in relationship dynamics'
    )
  }

  // Frequency insights
  const recentEntriesCount = previous.length + 1
  if (recentEntriesCount >= 5) {
    insights.push(
      `Analysis based on ${recentEntriesCount} recent entries - high confidence in patterns`
    )
  } else {
    insights.push(
      `Analysis based on ${recentEntriesCount} entries - consider more data points for deeper insights`
    )
  }

  return insights
}

/**
 * Generate fallback-specific pattern recommendations
 */
export function generatePatternRecommendations(
  analysis: PatternAnalysisResult
): {
  actionableInsights: string[]
  focusAreas: string[]
  strengthsToLeverage: string[]
} {
  const actionableInsights: string[] = []
  const focusAreas: string[] = []
  const strengthsToLeverage: string[] = []

  // Identify strengths
  const positiveCategories = Object.entries(analysis.categoryScores)
    .filter(([_, score]) => score > 0.5)
    .map(([category, _]) => category)

  const challengeCategories = Object.entries(analysis.categoryScores)
    .filter(([_, score]) => score < -0.5)
    .map(([category, _]) => category)

  // Generate recommendations based on patterns
  if (positiveCategories.includes('communication')) {
    strengthsToLeverage.push(
      'Strong communication skills - use this foundation to address other areas'
    )
  }

  if (challengeCategories.includes('communication')) {
    focusAreas.push('communication')
    actionableInsights.push(
      'Consider setting aside dedicated time for open, uninterrupted conversation'
    )
  }

  if (challengeCategories.includes('conflict')) {
    focusAreas.push('conflict resolution')
    actionableInsights.push(
      'Explore conflict resolution techniques like active listening and "I" statements'
    )
  }

  if (challengeCategories.includes('intimacy')) {
    focusAreas.push('emotional/physical intimacy')
    actionableInsights.push(
      'Schedule regular one-on-one time without distractions'
    )
  }

  if (positiveCategories.includes('growth')) {
    strengthsToLeverage.push(
      'Growth mindset - continue learning and developing together'
    )
  }

  if (challengeCategories.includes('stress')) {
    focusAreas.push('stress management')
    actionableInsights.push(
      'Develop strategies to support each other during stressful periods'
    )
  }

  // Generic recommendations if no specific patterns
  if (actionableInsights.length === 0) {
    actionableInsights.push(
      'Consider regular relationship check-ins to maintain connection'
    )
    actionableInsights.push(
      'Focus on expressing appreciation and gratitude daily'
    )
  }

  return {
    actionableInsights,
    focusAreas,
    strengthsToLeverage,
  }
}
