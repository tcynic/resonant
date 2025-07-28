import {
  QueuePriority,
  PRIORITY_CRITERIA,
  PRIORITY_LEVELS,
} from '../scheduler/queue_config'

/**
 * User tier type from schema
 */
type UserTier = 'free' | 'premium'

/**
 * Context for priority assessment
 */
interface PriorityAssessmentContext {
  userId: string
  userTier: UserTier
  relationshipId?: string
  entryContent?: string
  recentActivityHours?: number
  retryCount?: number
  isHealthScoreAlert?: boolean
  isCrisisDetection?: boolean
}

/**
 * Assess priority level for analysis request
 */
export function assessPriority(
  context: PriorityAssessmentContext
): QueuePriority {
  const {
    userTier,
    relationshipId,
    recentActivityHours = 0,
    retryCount = 0,
    isHealthScoreAlert = false,
    isCrisisDetection = false,
  } = context

  // Urgent priority conditions
  if (isUrgentPriority(context)) {
    return 'urgent'
  }

  // High priority conditions
  if (isHighPriority(context)) {
    return 'high'
  }

  // Default to normal priority
  return 'normal'
}

/**
 * Check if request qualifies for urgent priority
 */
function isUrgentPriority(context: PriorityAssessmentContext): boolean {
  const { userTier, isHealthScoreAlert, isCrisisDetection } = context

  // Crisis detection always gets urgent priority
  if (isCrisisDetection) {
    return true
  }

  // Health score alerts for premium users
  if (isHealthScoreAlert && userTier === 'premium') {
    return true
  }

  // Premium user's first entry of the day (simulated with recent activity check)
  if (userTier === 'premium' && context.recentActivityHours === 0) {
    return true
  }

  return false
}

/**
 * Check if request qualifies for high priority
 */
function isHighPriority(context: PriorityAssessmentContext): boolean {
  const {
    relationshipId,
    recentActivityHours = 0,
    retryCount = 0,
    userTier,
  } = context

  // Multiple retry attempts get upgraded to high priority
  if (retryCount >= 2) {
    return true
  }

  // Recent active users (within 24 hours)
  if (recentActivityHours <= 24) {
    return true
  }

  // Relationship-specific entries
  if (relationshipId) {
    return true
  }

  // Premium users get higher priority for all requests
  if (userTier === 'premium') {
    return true
  }

  return false
}

/**
 * Get priority explanation for debugging/monitoring
 */
export function getPriorityExplanation(
  priority: QueuePriority,
  context: PriorityAssessmentContext
): string {
  const reasons: string[] = []

  switch (priority) {
    case 'urgent':
      if (context.isCrisisDetection) reasons.push('Crisis detection triggered')
      if (context.isHealthScoreAlert && context.userTier === 'premium') {
        reasons.push('Health score alert for premium user')
      }
      if (context.userTier === 'premium' && context.recentActivityHours === 0) {
        reasons.push('Premium user first daily entry')
      }
      break

    case 'high':
      if ((context.retryCount || 0) >= 2)
        reasons.push('Multiple retry attempts')
      if ((context.recentActivityHours || 0) <= 24)
        reasons.push('Recent active user')
      if (context.relationshipId) reasons.push('Relationship-specific entry')
      if (context.userTier === 'premium') reasons.push('Premium user')
      break

    case 'normal':
      reasons.push('Standard processing criteria')
      break
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Default priority assignment'
}

/**
 * Calculate estimated processing delay based on priority
 */
export function getEstimatedDelay(
  priority: QueuePriority,
  queueLength: number
): number {
  const baseDelay = PRIORITY_CRITERIA[priority].delay
  const queueMultiplier = Math.floor(queueLength / 10) * 1000 // Add 1s per 10 items in queue
  return baseDelay + queueMultiplier
}

/**
 * Determine if priority should be upgraded based on aging
 */
export function shouldUpgradePriority(
  currentPriority: QueuePriority,
  queuedAt: number,
  customMaxWaitTime?: number
): QueuePriority {
  const waitTime = Date.now() - queuedAt
  const maxWaitTime =
    customMaxWaitTime || PRIORITY_CRITERIA[currentPriority].maxWaitTime

  // Upgrade to urgent if waiting beyond SLA
  if (waitTime > maxWaitTime) {
    return 'urgent'
  }

  // Upgrade normal to high after half the max wait time
  if (currentPriority === 'normal' && waitTime > maxWaitTime / 2) {
    return 'high'
  }

  return currentPriority
}

/**
 * Enhanced priority assessment with content analysis
 */
export function assessPriorityWithContent(
  context: PriorityAssessmentContext & {
    entryContent?: string
    sentimentScore?: number
    emotionalKeywords?: string[]
  }
): { priority: QueuePriority; reasoning: string; contentSignals: string[] } {
  const basePriority = assessPriority(context)
  const contentSignals: string[] = []
  let finalPriority = basePriority

  // Analyze content for crisis indicators
  if (context.entryContent) {
    const crisisKeywords = [
      'suicide',
      'self-harm',
      'hurt myself',
      'end it all',
      "can't go on",
      'hopeless',
      'worthless',
      'trapped',
      'burden',
      'better off dead',
    ]

    const hasCrisisIndicators = crisisKeywords.some(keyword =>
      context.entryContent!.toLowerCase().includes(keyword)
    )

    if (hasCrisisIndicators) {
      finalPriority = 'urgent'
      contentSignals.push('Crisis language detected')
    }
  }

  // Analyze sentiment for emotional distress
  if (context.sentimentScore !== undefined && context.sentimentScore < -0.7) {
    if (finalPriority === 'normal') {
      finalPriority = 'high'
    }
    contentSignals.push('Extremely negative sentiment')
  }

  // Check for emotional keywords indicating distress
  if (context.emotionalKeywords) {
    const distressKeywords = [
      'anxiety',
      'depression',
      'panic',
      'overwhelmed',
      'devastated',
    ]
    const hasDistressIndicators = context.emotionalKeywords.some(keyword =>
      distressKeywords.includes(keyword.toLowerCase())
    )

    if (hasDistressIndicators && finalPriority === 'normal') {
      finalPriority = 'high'
      contentSignals.push('Emotional distress indicators')
    }
  }

  const reasoning = getPriorityExplanation(finalPriority, context)
  const enhancedReasoning =
    contentSignals.length > 0
      ? `${reasoning}; Content analysis: ${contentSignals.join(', ')}`
      : reasoning

  return {
    priority: finalPriority,
    reasoning: enhancedReasoning,
    contentSignals,
  }
}

/**
 * Get SLA target for priority level
 */
export function getSlaTarget(priority: QueuePriority): number {
  return PRIORITY_CRITERIA[priority].slaTarget
}

/**
 * Check if processing is within SLA
 */
export function isWithinSla(
  priority: QueuePriority,
  queuedAt: number,
  processedAt?: number
): boolean {
  const slaTarget = getSlaTarget(priority)
  const actualTime = (processedAt || Date.now()) - queuedAt
  return actualTime <= slaTarget
}

/**
 * Validate priority value
 */
export function isValidPriority(priority: string): priority is QueuePriority {
  return ['normal', 'high', 'urgent'].includes(priority)
}

/**
 * Get priority numeric value for sorting (higher number = higher priority)
 */
export function getPriorityValue(priority: QueuePriority): number {
  return PRIORITY_LEVELS[priority]
}

/**
 * Compare priorities for sorting (returns comparison result)
 */
export function comparePriorities(a: QueuePriority, b: QueuePriority): number {
  return getPriorityValue(b) - getPriorityValue(a) // Higher priority first
}
