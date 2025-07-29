/**
 * Rule-based sentiment analysis engine for fallback processing
 * Provides AI analysis alternative when external APIs fail (Story AI-Migration.4)
 */

export interface FallbackAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral'
  confidenceScore: number // 0-1 scale
  moodSuggestion: string | null
  insights: string[]
  method: 'keyword_sentiment' | 'rule_based' | 'pattern_matching'
  processingTimeMs: number
  metadata: {
    keywordsMatched: string[]
    rulesFired: string[]
    patternMatches: string[]
    fallbackReason: string
  }
}

export interface SentimentKeywords {
  positive: {
    keywords: string[]
    weights: Record<string, number>
  }
  negative: {
    keywords: string[]
    weights: Record<string, number>
  }
  relationship_positive: {
    keywords: string[]
    weights: Record<string, number>
  }
  relationship_negative: {
    keywords: string[]
    weights: Record<string, number>
  }
  mood_indicators: {
    [mood: string]: {
      keywords: string[]
      weight: number
    }
  }
}

/**
 * Comprehensive sentiment keyword dictionary for relationship journaling
 */
export const SENTIMENT_KEYWORDS: SentimentKeywords = {
  positive: {
    keywords: [
      'happy',
      'joy',
      'love',
      'excited',
      'wonderful',
      'amazing',
      'great',
      'fantastic',
      'grateful',
      'blessed',
      'content',
      'peaceful',
      'fulfilled',
      'delighted',
      'thrilled',
      'overjoyed',
      'ecstatic',
      'blissful',
      'cheerful',
      'optimistic',
      'hopeful',
      'confident',
      'proud',
      'accomplished',
      'successful',
    ],
    weights: {
      love: 2.0,
      amazing: 1.8,
      wonderful: 1.6,
      ecstatic: 1.9,
      blissful: 1.7,
      overjoyed: 1.8,
      thrilled: 1.5,
      grateful: 1.4,
      fulfilled: 1.5,
      default: 1.0,
    },
  },
  negative: {
    keywords: [
      'sad',
      'angry',
      'frustrated',
      'disappointed',
      'terrible',
      'awful',
      'hate',
      'depressed',
      'miserable',
      'devastated',
      'heartbroken',
      'lonely',
      'isolated',
      'anxious',
      'worried',
      'stressed',
      'overwhelmed',
      'exhausted',
      'bitter',
      'resentful',
      'betrayed',
      'hurt',
      'pain',
      'suffering',
      'despair',
    ],
    weights: {
      hate: -2.0,
      terrible: -1.8,
      awful: -1.6,
      devastated: -1.9,
      heartbroken: -1.8,
      despair: -1.7,
      betrayed: -1.6,
      miserable: -1.5,
      suffering: -1.4,
      default: -1.0,
    },
  },
  relationship_positive: {
    keywords: [
      'connection',
      'support',
      'understanding',
      'communication',
      'trust',
      'intimacy',
      'closeness',
      'bond',
      'partnership',
      'teamwork',
      'harmony',
      'respect',
      'appreciation',
      'affection',
      'romance',
      'passion',
      'commitment',
      'loyalty',
      'devotion',
      'caring',
      'nurturing',
      'growth',
      'progress',
      'improvement',
      'breakthrough',
      'resolution',
      'forgiveness',
      'acceptance',
    ],
    weights: {
      trust: 1.5,
      intimacy: 1.4,
      connection: 1.3,
      understanding: 1.3,
      communication: 1.2,
      forgiveness: 1.4,
      breakthrough: 1.3,
      default: 1.1,
    },
  },
  relationship_negative: {
    keywords: [
      'conflict',
      'argument',
      'distance',
      'misunderstanding',
      'tension',
      'disagreement',
      'fight',
      'quarrel',
      'discord',
      'friction',
      'strain',
      'pressure',
      'stress',
      'breakdown',
      'separation',
      'divorce',
      'breakup',
      'rejection',
      'abandonment',
      'neglect',
      'indifference',
      'coldness',
      'hostility',
      'resentment',
      'bitterness',
      'jealousy',
      'insecurity',
      'doubt',
      'mistrust',
      'betrayal',
      'infidelity',
      'deception',
      'lies',
    ],
    weights: {
      betrayal: -1.8,
      infidelity: -1.9,
      divorce: -1.7,
      breakup: -1.6,
      abandonment: -1.5,
      rejection: -1.4,
      conflict: -1.3,
      fight: -1.2,
      default: -1.1,
    },
  },
  mood_indicators: {
    joyful: {
      keywords: [
        'celebration',
        'laughter',
        'smile',
        'giggle',
        'chuckle',
        'beam',
        'grin',
      ],
      weight: 1.3,
    },
    content: {
      keywords: [
        'peaceful',
        'calm',
        'serene',
        'tranquil',
        'relaxed',
        'comfortable',
      ],
      weight: 1.1,
    },
    excited: {
      keywords: [
        'adventure',
        'surprise',
        'spontaneous',
        'energy',
        'enthusiasm',
        'eager',
      ],
      weight: 1.2,
    },
    grateful: {
      keywords: ['thankful', 'blessed', 'appreciate', 'fortunate', 'lucky'],
      weight: 1.1,
    },
    hopeful: {
      keywords: [
        'future',
        'plans',
        'dreams',
        'goals',
        'potential',
        'possibility',
      ],
      weight: 1.0,
    },
    sad: {
      keywords: ['tears', 'cry', 'weep', 'sob', 'mourn', 'grieve'],
      weight: -1.3,
    },
    anxious: {
      keywords: ['worry', 'concern', 'fear', 'nervous', 'uneasy', 'restless'],
      weight: -1.2,
    },
    angry: {
      keywords: ['rage', 'fury', 'mad', 'irritated', 'annoyed', 'livid'],
      weight: -1.4,
    },
    frustrated: {
      keywords: [
        'stuck',
        'blocked',
        'hindered',
        'obstacle',
        'barrier',
        'difficulty',
      ],
      weight: -1.1,
    },
    lonely: {
      keywords: ['alone', 'isolated', 'solitary', 'abandoned', 'disconnected'],
      weight: -1.2,
    },
  },
}

/**
 * Relationship-specific pattern matching rules
 */
export const RELATIONSHIP_PATTERNS = [
  {
    name: 'communication_improvement',
    pattern:
      /\b(talk|discuss|share|express|listen|hear|understand)\b.*\b(better|more|improve|progress)\b/i,
    sentiment: 'positive' as const,
    confidence: 0.7,
    insight: 'Communication patterns show improvement',
  },
  {
    name: 'communication_breakdown',
    pattern:
      /\b(can't talk|won't listen|ignore|silent treatment|shut down|communication.*breakdown|communication.*problems|communication.*issues)\b/i,
    sentiment: 'negative' as const,
    confidence: 0.8,
    insight: 'Communication challenges detected',
  },
  {
    name: 'quality_time',
    pattern:
      /\b(together|date|spend.*time|spent.*time|enjoy|fun|laugh|wonderful.*time)\b/i,
    sentiment: 'positive' as const,
    confidence: 0.6,
    insight: 'Positive quality time activities',
  },
  {
    name: 'physical_affection',
    pattern: /\b(hug|kiss|hold hands|cuddle|intimate|close|touch)\b/i,
    sentiment: 'positive' as const,
    confidence: 0.7,
    insight: 'Physical intimacy and affection present',
  },
  {
    name: 'conflict_resolution',
    pattern: /\b(resolved|worked out|compromised|agreed|forgave|apologized)\b/i,
    sentiment: 'positive' as const,
    confidence: 0.8,
    insight: 'Conflict resolution skills demonstrated',
  },
  {
    name: 'recurring_issues',
    pattern:
      /\b(again|same|always|never|every time|constantly)\b.*\b(problem|issue|fight|argument)\b/i,
    sentiment: 'negative' as const,
    confidence: 0.7,
    insight: 'Recurring relationship patterns identified',
  },
  {
    name: 'growth_mindset',
    pattern:
      /\b(learn|grow|improve|work on|develop|progress|better)\b.*\b(relationship|us|we|together)\b/i,
    sentiment: 'positive' as const,
    confidence: 0.6,
    insight: 'Growth-oriented relationship approach',
  },
  {
    name: 'emotional_distance',
    pattern: /\b(distant|cold|withdrawn|separate|apart|disconnected)\b/i,
    sentiment: 'negative' as const,
    confidence: 0.7,
    insight: 'Emotional distance or disconnection noted',
  },
]

/**
 * Core fallback sentiment analysis function
 */
export function analyzeSentimentFallback(
  journalContent: string,
  fallbackReason: string = 'API unavailable'
): FallbackAnalysisResult {
  const startTime = Date.now()

  // Normalize text for analysis
  const normalizedContent = journalContent.toLowerCase().trim()
  const words = normalizedContent.split(/\s+/)

  // Initialize tracking variables
  let sentimentScore = 0
  let totalWeight = 0
  const keywordsMatched: string[] = []
  const rulesFired: string[] = []
  const patternMatches: string[] = []
  const insights: string[] = []

  // Keyword-based sentiment analysis
  const keywordResults = analyzeKeywords(normalizedContent, words)
  sentimentScore += keywordResults.score
  totalWeight += keywordResults.weight
  keywordsMatched.push(...keywordResults.matched)

  // Pattern-based analysis
  const patternResults = analyzePatterns(journalContent)
  sentimentScore += patternResults.score
  totalWeight += patternResults.weight
  patternMatches.push(...patternResults.patterns)
  insights.push(...patternResults.insights)

  // Rule-based analysis
  const ruleResults = analyzeRules(normalizedContent, words)
  sentimentScore += ruleResults.score
  totalWeight += ruleResults.weight
  rulesFired.push(...ruleResults.rules)
  insights.push(...ruleResults.insights)

  // Calculate final sentiment and confidence
  const normalizedScore = totalWeight > 0 ? sentimentScore / totalWeight : 0
  const sentiment = determineSentiment(normalizedScore)
  const confidenceScore = calculateConfidence(
    totalWeight,
    keywordsMatched.length,
    patternMatches.length,
    rulesFired.length,
    words.length
  )

  // Suggest mood based on analysis
  const moodSuggestion = suggestMood(
    keywordsMatched,
    sentiment,
    normalizedScore
  )

  const processingTimeMs = Date.now() - startTime

  return {
    sentiment,
    confidenceScore,
    moodSuggestion,
    insights,
    method: 'keyword_sentiment',
    processingTimeMs,
    metadata: {
      keywordsMatched,
      rulesFired,
      patternMatches,
      fallbackReason,
    },
  }
}

/**
 * Analyze keywords in the content
 */
function analyzeKeywords(content: string, words: string[]) {
  let score = 0
  let weight = 0
  const matched: string[] = []

  // Check positive keywords
  for (const keyword of SENTIMENT_KEYWORDS.positive.keywords) {
    if (content.includes(keyword)) {
      const keywordWeight =
        SENTIMENT_KEYWORDS.positive.weights[keyword] ||
        SENTIMENT_KEYWORDS.positive.weights.default
      score += keywordWeight
      weight += Math.abs(keywordWeight)
      matched.push(`+${keyword}`)
    }
  }

  // Check negative keywords
  for (const keyword of SENTIMENT_KEYWORDS.negative.keywords) {
    if (content.includes(keyword)) {
      const keywordWeight =
        SENTIMENT_KEYWORDS.negative.weights[keyword] ||
        SENTIMENT_KEYWORDS.negative.weights.default
      score += keywordWeight
      weight += Math.abs(keywordWeight)
      matched.push(`${keyword}`)
    }
  }

  // Check relationship-specific keywords
  for (const keyword of SENTIMENT_KEYWORDS.relationship_positive.keywords) {
    if (content.includes(keyword)) {
      const keywordWeight =
        SENTIMENT_KEYWORDS.relationship_positive.weights[keyword] ||
        SENTIMENT_KEYWORDS.relationship_positive.weights.default
      score += keywordWeight
      weight += Math.abs(keywordWeight)
      matched.push(`+rel:${keyword}`)
    }
  }

  for (const keyword of SENTIMENT_KEYWORDS.relationship_negative.keywords) {
    if (content.includes(keyword)) {
      const keywordWeight =
        SENTIMENT_KEYWORDS.relationship_negative.weights[keyword] ||
        SENTIMENT_KEYWORDS.relationship_negative.weights.default
      score += keywordWeight
      weight += Math.abs(keywordWeight)
      matched.push(`-rel:${keyword}`)
    }
  }

  return { score, weight, matched }
}

/**
 * Analyze patterns in the content
 */
function analyzePatterns(content: string) {
  let score = 0
  let weight = 0
  const patterns: string[] = []
  const insights: string[] = []

  for (const pattern of RELATIONSHIP_PATTERNS) {
    if (pattern.pattern.test(content)) {
      const patternScore =
        pattern.sentiment === 'positive'
          ? pattern.confidence
          : -pattern.confidence
      score += patternScore
      weight += pattern.confidence
      patterns.push(pattern.name)
      insights.push(pattern.insight)
    }
  }

  return { score, weight, patterns, insights }
}

/**
 * Apply rule-based analysis
 */
function analyzeRules(content: string, words: string[]) {
  let score = 0
  let weight = 0
  const rules: string[] = []
  const insights: string[] = []

  // Rule 1: Negation handling
  const negationWords = [
    'not',
    'never',
    'no',
    'nothing',
    'nobody',
    'nowhere',
    'none',
  ]
  let hasNegation = false
  for (const negWord of negationWords) {
    if (content.includes(negWord)) {
      hasNegation = true
      break
    }
  }

  if (hasNegation) {
    // Reduce positive sentiment when negation is present - more aggressive
    score = score > 0 ? -Math.abs(score) * 0.5 : score // Flip positive to negative
    score -= 0.5 // Additional penalty
    weight += 0.5
    rules.push('negation_adjustment')
  }

  // Rule 2: Intensity modifiers
  const intensifiers = [
    'very',
    'extremely',
    'incredibly',
    'absolutely',
    'completely',
    'totally',
  ]
  const diminishers = ['slightly', 'somewhat', 'a bit', 'kind of', 'sort of']

  let intensityMultiplier = 1.0
  for (const intensifier of intensifiers) {
    if (content.includes(intensifier)) {
      intensityMultiplier = 1.3
      rules.push('intensity_boost')
      break
    }
  }

  for (const diminisher of diminishers) {
    if (content.includes(diminisher)) {
      intensityMultiplier = 0.7
      rules.push('intensity_reduction')
      break
    }
  }

  score *= intensityMultiplier

  // Rule 3: Question marks indicate uncertainty or concern
  const questionCount = (content.match(/\?/g) || []).length
  if (questionCount > 0) {
    score -= questionCount * 0.1
    weight += questionCount * 0.1
    rules.push('question_uncertainty')
    insights.push('Questions indicate reflection or uncertainty')
  }

  // Rule 4: Exclamation marks indicate strong emotion
  const exclamationCount = (content.match(/!/g) || []).length
  if (exclamationCount > 0) {
    // Boost the existing sentiment direction
    const boost = Math.min(exclamationCount * 0.2, 0.6)
    if (score > 0) {
      score += boost
    } else if (score < 0) {
      score -= boost
    }
    weight += boost
    rules.push('exclamation_emphasis')
    insights.push('Strong emotional expression detected')
  }

  // Rule 5: Length-based confidence adjustment
  if (words.length < 10) {
    weight *= 0.7 // Lower confidence for very short entries
    rules.push('short_entry_adjustment')
  } else if (words.length > 50) {
    weight *= 1.2 // Higher confidence for detailed entries
    rules.push('detailed_entry_boost')
  }

  return { score, weight, rules, insights }
}

/**
 * Determine sentiment category from normalized score
 */
function determineSentiment(
  normalizedScore: number
): 'positive' | 'negative' | 'neutral' {
  if (normalizedScore > 0.2) return 'positive'
  if (normalizedScore < -0.2) return 'negative'
  return 'neutral'
}

/**
 * Calculate confidence score based on analysis factors
 */
function calculateConfidence(
  totalWeight: number,
  keywordCount: number,
  patternCount: number,
  ruleCount: number,
  wordCount: number
): number {
  // Base confidence from signal strength
  let confidence = Math.min(totalWeight / 3, 0.6) // Cap at 60% from weight alone

  // Boost from multiple signal types
  if (keywordCount > 0) confidence += 0.1
  if (patternCount > 0) confidence += 0.15
  if (ruleCount > 0) confidence += 0.1

  // Adjustment based on content length
  if (wordCount >= 20) {
    confidence += 0.05
  } else if (wordCount < 10) {
    confidence -= 0.1
  }

  // Cap confidence between 0.1 and 0.9 for fallback analysis
  return Math.max(0.1, Math.min(0.9, confidence))
}

/**
 * Suggest mood based on keyword analysis
 */
function suggestMood(
  keywordsMatched: string[],
  sentiment: 'positive' | 'negative' | 'neutral',
  score: number
): string | null {
  // Check for specific mood indicators
  for (const [mood, config] of Object.entries(
    SENTIMENT_KEYWORDS.mood_indicators
  )) {
    for (const keyword of config.keywords) {
      if (keywordsMatched.some(match => match.includes(keyword))) {
        return mood
      }
    }
  }

  // Fallback to general sentiment-based mood
  if (sentiment === 'positive') {
    if (score > 1.0) return 'joyful'
    if (score > 0.5) return 'content'
    return 'hopeful'
  } else if (sentiment === 'negative') {
    if (score < -1.0) return 'sad'
    if (score < -0.5) return 'frustrated'
    return 'anxious'
  }

  // Return a neutral mood for neutral sentiment instead of null
  return 'content'
}

/**
 * Validate fallback analysis result quality
 */
export function validateFallbackResult(result: FallbackAnalysisResult): {
  isValid: boolean
  qualityScore: number
  issues: string[]
} {
  const issues: string[] = []
  let qualityScore = 0.5 // Base quality for fallback

  // Check confidence threshold
  if (result.confidenceScore < 0.2) {
    issues.push('Very low confidence score')
    qualityScore -= 0.2
  } else if (result.confidenceScore > 0.6) {
    qualityScore += 0.1
  }

  // Check signal diversity
  const signalTypes = [
    result.metadata.keywordsMatched.length > 0,
    result.metadata.rulesFired.length > 0,
    result.metadata.patternMatches.length > 0,
  ].filter(Boolean).length

  if (signalTypes >= 2) {
    qualityScore += 0.2
  } else if (signalTypes === 0) {
    issues.push('No clear sentiment signals detected')
    qualityScore -= 0.3
  }

  // Check processing time (should be fast)
  if (result.processingTimeMs > 5000) {
    issues.push('Slow processing time for fallback analysis')
    qualityScore -= 0.1
  } else if (result.processingTimeMs < 100) {
    qualityScore += 0.1
  }

  // Check insights quality
  if (result.insights.length === 0) {
    issues.push('No insights generated')
    qualityScore -= 0.1
  } else if (result.insights.length >= 2) {
    qualityScore += 0.1
  }

  const isValid = qualityScore >= 0.3 && issues.length < 3

  return {
    isValid,
    qualityScore: Math.max(0, Math.min(1, qualityScore)),
    issues,
  }
}
