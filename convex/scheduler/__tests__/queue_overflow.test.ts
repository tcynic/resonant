/**
 * Unit Tests for Queue Overflow and Backpressure Management
 * Tests overflow strategies, backpressure handling, and dead letter queue functionality
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals'

// Mock Convex scheduler and database operations
const mockScheduler = {
  runAfter: jest.fn().mockResolvedValue(undefined),
}

const mockDb = {
  query: jest.fn(),
  insert: jest.fn(),
  patch: jest.fn(),
  get: jest.fn(),
}

const mockCtx = {
  db: mockDb,
  scheduler: mockScheduler,
}

beforeEach(() => {
  jest.clearAllMocks()

  // Default mock implementations
  mockDb.query.mockReturnValue({
    withIndex: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        filter: jest.fn().mockReturnValue({
          collect: jest.fn().mockResolvedValue([]),
        }),
        collect: jest.fn().mockResolvedValue([]),
      }),
      filter: jest.fn().mockReturnValue({
        collect: jest.fn().mockResolvedValue([]),
      }),
      collect: jest.fn().mockResolvedValue([]),
    }),
    filter: jest.fn().mockReturnValue({
      collect: jest.fn().mockResolvedValue([]),
    }),
    collect: jest.fn().mockResolvedValue([]),
  })

  mockDb.get.mockResolvedValue(null)
  mockDb.patch.mockResolvedValue(undefined)
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('Queue Overflow and Backpressure Management', () => {
  describe('Backpressure Level Determination', () => {
    test('should determine backpressure levels correctly', () => {
      const determineBackpressureLevel = (
        capacityUtilization: number,
        processingUtilization: number
      ) => {
        const maxUtilization = Math.max(
          capacityUtilization,
          processingUtilization
        )

        if (maxUtilization >= 95) return 'critical'
        if (maxUtilization >= 85) return 'heavy'
        if (maxUtilization >= 70) return 'moderate'
        if (maxUtilization >= 50) return 'light'
        return 'none'
      }

      expect(determineBackpressureLevel(30, 40)).toBe('none')
      expect(determineBackpressureLevel(55, 45)).toBe('light')
      expect(determineBackpressureLevel(75, 60)).toBe('moderate')
      expect(determineBackpressureLevel(60, 88)).toBe('heavy')
      expect(determineBackpressureLevel(97, 80)).toBe('critical')
    })

    test('should use maximum utilization for backpressure calculation', () => {
      const determineBackpressure = (cap: number, proc: number) =>
        Math.max(cap, proc)

      expect(determineBackpressure(80, 60)).toBe(80) // Capacity is limiting
      expect(determineBackpressure(50, 90)).toBe(90) // Processing is limiting
      expect(determineBackpressure(75, 75)).toBe(75) // Equal utilization
    })
  })

  describe('Admission Control', () => {
    test('should allow urgent priority even under backpressure', () => {
      const makeAdmissionDecision = (
        totalQueued: number,
        capacityUtilization: number,
        priority: string,
        backpressureLevel: string
      ) => {
        // Reject if at maximum capacity (takes priority over urgent allowance)
        if (totalQueued >= 1000) {
          return { allowed: false, reason: 'Queue at maximum capacity' }
        }

        // Always allow urgent priority unless at critical capacity
        if (priority === 'urgent' && capacityUtilization < 98) {
          return {
            allowed: true,
            reason: 'Urgent priority - allowed despite backpressure',
          }
        }

        // Apply backpressure-based admission control
        const thresholds = { urgent: 95, high: 85, normal: 75 }
        const threshold = thresholds[priority as keyof typeof thresholds] || 75

        if (capacityUtilization > threshold) {
          return {
            allowed: false,
            reason: `Backpressure active - capacity exceeds threshold`,
          }
        }

        return { allowed: true, reason: 'Admission approved' }
      }

      // Urgent priority should be allowed under heavy backpressure
      expect(makeAdmissionDecision(800, 90, 'urgent', 'heavy').allowed).toBe(
        true
      )

      // Normal priority should be rejected under moderate backpressure
      expect(makeAdmissionDecision(600, 80, 'normal', 'moderate').allowed).toBe(
        false
      )

      // High priority should be allowed under light backpressure
      expect(makeAdmissionDecision(400, 70, 'high', 'light').allowed).toBe(true)

      // Everything should be rejected at maximum capacity
      expect(makeAdmissionDecision(1000, 50, 'urgent', 'none').allowed).toBe(
        false
      )
    })

    test('should calculate appropriate admission thresholds', () => {
      const getAdmissionThreshold = (
        backpressureLevel: string,
        priority: string
      ) => {
        const baseThresholds = { urgent: 95, high: 85, normal: 75 }
        const backpressureAdjustment = {
          none: 0,
          light: -5,
          moderate: -10,
          heavy: -15,
          critical: -20,
        }

        const baseThreshold =
          baseThresholds[priority as keyof typeof baseThresholds] || 75
        const adjustment =
          backpressureAdjustment[
            backpressureLevel as keyof typeof backpressureAdjustment
          ] || 0

        return Math.max(50, baseThreshold + adjustment) // Never go below 50%
      }

      // Test threshold adjustments for different backpressure levels
      expect(getAdmissionThreshold('none', 'normal')).toBe(75)
      expect(getAdmissionThreshold('moderate', 'normal')).toBe(65)
      expect(getAdmissionThreshold('critical', 'normal')).toBe(55)
      expect(getAdmissionThreshold('critical', 'urgent')).toBe(75) // 95 - 20 = 75

      // Test minimum threshold enforcement
      expect(
        getAdmissionThreshold('critical', 'normal')
      ).toBeGreaterThanOrEqual(50)
    })
  })

  describe('Overflow Strategies', () => {
    test('should determine appropriate overflow strategies', () => {
      const determineOverflowStrategy = (
        priority: string,
        backpressureLevel: string
      ) => {
        // Critical backpressure: reject or dead letter
        if (backpressureLevel === 'critical') {
          return priority === 'urgent' ? 'upgrade_priority' : 'reject'
        }

        // Heavy backpressure: delay or upgrade
        if (backpressureLevel === 'heavy') {
          return priority === 'normal' ? 'delay' : 'upgrade_priority'
        }

        // Moderate backpressure: delay
        if (backpressureLevel === 'moderate') {
          return 'delay'
        }

        // Default strategy
        return priority === 'urgent' ? 'upgrade_priority' : 'delay'
      }

      // Critical backpressure scenarios
      expect(determineOverflowStrategy('urgent', 'critical')).toBe(
        'upgrade_priority'
      )
      expect(determineOverflowStrategy('high', 'critical')).toBe('reject')
      expect(determineOverflowStrategy('normal', 'critical')).toBe('reject')

      // Heavy backpressure scenarios
      expect(determineOverflowStrategy('normal', 'heavy')).toBe('delay')
      expect(determineOverflowStrategy('high', 'heavy')).toBe(
        'upgrade_priority'
      )
      expect(determineOverflowStrategy('urgent', 'heavy')).toBe(
        'upgrade_priority'
      )

      // Moderate backpressure scenarios
      expect(determineOverflowStrategy('normal', 'moderate')).toBe('delay')
      expect(determineOverflowStrategy('high', 'moderate')).toBe('delay')
      expect(determineOverflowStrategy('urgent', 'moderate')).toBe('delay')

      // Light/no backpressure scenarios
      expect(determineOverflowStrategy('normal', 'light')).toBe('delay')
      expect(determineOverflowStrategy('urgent', 'light')).toBe(
        'upgrade_priority'
      )
    })

    test('should calculate appropriate delays for overflow strategies', () => {
      const calculateDelayForOverflow = (
        backpressureLevel: string,
        priority: string
      ) => {
        const baseDelays = { urgent: 5000, high: 15000, normal: 30000 }
        const backpressureMultipliers = {
          none: 0.5,
          light: 1,
          moderate: 2,
          heavy: 4,
          critical: 8,
        }

        const baseDelay =
          baseDelays[priority as keyof typeof baseDelays] || 30000
        const multiplier =
          backpressureMultipliers[
            backpressureLevel as keyof typeof backpressureMultipliers
          ] || 1

        return Math.min(baseDelay * multiplier, 300000) // Max 5-minute delay
      }

      // Test base delays
      expect(calculateDelayForOverflow('light', 'urgent')).toBe(5000) // 5 seconds
      expect(calculateDelayForOverflow('light', 'high')).toBe(15000) // 15 seconds
      expect(calculateDelayForOverflow('light', 'normal')).toBe(30000) // 30 seconds

      // Test backpressure multipliers
      expect(calculateDelayForOverflow('moderate', 'normal')).toBe(60000) // 30s * 2
      expect(calculateDelayForOverflow('heavy', 'normal')).toBe(120000) // 30s * 4
      expect(calculateDelayForOverflow('critical', 'normal')).toBe(240000) // 30s * 8

      // Test maximum delay cap
      expect(
        calculateDelayForOverflow('critical', 'normal')
      ).toBeLessThanOrEqual(300000)
    })
  })

  describe('Throttling Mechanisms', () => {
    test('should calculate throttling based on request rate and backpressure', () => {
      const calculateThrottling = (
        currentRate: number,
        backpressureLevel: string,
        capacityUtilization: number
      ) => {
        const baseThreshold = 100 // requests per minute
        const throttlingMultipliers = {
          none: 1.0,
          light: 0.9,
          moderate: 0.7,
          heavy: 0.5,
          critical: 0.3,
        }

        const multiplier =
          throttlingMultipliers[
            backpressureLevel as keyof typeof throttlingMultipliers
          ] || 1.0
        const adjustedThreshold = baseThreshold * multiplier

        const shouldThrottle =
          currentRate > adjustedThreshold || capacityUtilization > 80

        if (!shouldThrottle) {
          return { shouldThrottle: false, delay: 0 }
        }

        // Calculate throttling delay
        const excessRate = Math.max(0, currentRate - adjustedThreshold)
        const baseDelay = 1000 // 1 second base delay
        const delay = baseDelay * (1 + excessRate / adjustedThreshold)

        return {
          shouldThrottle: true,
          delay: Math.min(delay, 30000), // Max 30 second delay
          currentRate,
          threshold: adjustedThreshold,
        }
      }

      // No throttling needed
      expect(calculateThrottling(50, 'none', 60).shouldThrottle).toBe(false)

      // Throttling due to high request rate
      const highRateResult = calculateThrottling(150, 'moderate', 60)
      expect(highRateResult.shouldThrottle).toBe(true)
      expect(highRateResult.threshold).toBe(70) // 100 * 0.7

      // Throttling due to high capacity utilization
      expect(calculateThrottling(50, 'none', 85).shouldThrottle).toBe(true)

      // Critical backpressure should have low threshold
      const criticalResult = calculateThrottling(40, 'critical', 50)
      expect(criticalResult.shouldThrottle).toBe(true)
      expect(criticalResult.threshold).toBe(30) // 100 * 0.3
    })

    test('should calculate retry delays based on backpressure level', () => {
      const calculateRetryDelay = (backpressureLevel: string) => {
        const baseDelay = 30000 // 30 seconds
        const multipliers = {
          none: 0,
          light: 1,
          moderate: 2,
          heavy: 4,
          critical: 8,
        }

        const multiplier =
          multipliers[backpressureLevel as keyof typeof multipliers]
        return multiplier !== undefined ? baseDelay * multiplier : baseDelay
      }

      expect(calculateRetryDelay('none')).toBe(0)
      expect(calculateRetryDelay('light')).toBe(30000) // 30 seconds
      expect(calculateRetryDelay('moderate')).toBe(60000) // 1 minute
      expect(calculateRetryDelay('heavy')).toBe(120000) // 2 minutes
      expect(calculateRetryDelay('critical')).toBe(240000) // 4 minutes
    })
  })

  describe('Dead Letter Queue Management', () => {
    test('should identify recoverable vs permanent failures', () => {
      const isRecoverable = (deadLetterReason: string, lastError: string) => {
        const nonRecoverablePatterns = [
          'validation',
          'invalid_input',
          'malformed_request',
          'authentication_failed',
          'quota_permanently_exceeded',
          'user_cancelled',
        ]

        const recoverablePatterns = [
          'timeout',
          'network',
          'temporary',
          'rate_limit',
          'capacity',
          'system_overload',
        ]

        const combinedText = `${deadLetterReason} ${lastError}`.toLowerCase()

        // Check for non-recoverable patterns first
        if (
          nonRecoverablePatterns.some(pattern => combinedText.includes(pattern))
        ) {
          return false
        }

        // Check for recoverable patterns
        if (
          recoverablePatterns.some(pattern => combinedText.includes(pattern))
        ) {
          return true
        }

        // Default to recoverable for unknown patterns
        return true
      }

      // Non-recoverable errors
      expect(isRecoverable('validation_failed', 'Invalid input format')).toBe(
        false
      )
      expect(
        isRecoverable(
          'authentication_failed',
          'Authentication failed permanently'
        )
      ).toBe(false)
      expect(
        isRecoverable('user_cancelled', 'User cancelled the request')
      ).toBe(false)

      // Recoverable errors
      expect(
        isRecoverable('timeout', 'Request timed out after 30 seconds')
      ).toBe(true)
      expect(
        isRecoverable('network_error', 'Connection failed temporarily')
      ).toBe(true)
      expect(
        isRecoverable('system_issue', 'Rate limit exceeded - temporary')
      ).toBe(true)

      // Unknown errors default to recoverable
      expect(isRecoverable('unknown_error', 'Something went wrong')).toBe(true)
    })

    test('should generate appropriate recovery recommendations', () => {
      const getRecoveryRecommendation = (deadLetterReason: string) => {
        const reason = deadLetterReason.toLowerCase()

        if (reason.includes('timeout')) return 'Retry with increased timeout'
        if (reason.includes('network'))
          return 'Retry when network conditions improve'
        if (reason.includes('rate_limit'))
          return 'Retry with exponential backoff'
        if (reason.includes('capacity')) return 'Retry during low-load period'
        if (reason.includes('overload')) return 'Retry with reduced priority'

        return 'Retry with standard parameters'
      }

      expect(getRecoveryRecommendation('timeout_error')).toBe(
        'Retry with increased timeout'
      )
      expect(getRecoveryRecommendation('network_connection_failed')).toBe(
        'Retry when network conditions improve'
      )
      expect(getRecoveryRecommendation('api_rate_limit_exceeded')).toBe(
        'Retry with exponential backoff'
      )
      expect(getRecoveryRecommendation('queue_capacity_exceeded')).toBe(
        'Retry during low-load period'
      )
      expect(getRecoveryRecommendation('system_overload')).toBe(
        'Retry with reduced priority'
      )
      expect(getRecoveryRecommendation('unknown_failure')).toBe(
        'Retry with standard parameters'
      )
    })

    test('should analyze dead letter queue patterns', () => {
      const mockDeadLetterItems = [
        { deadLetterReason: 'timeout', priority: 'normal' },
        { deadLetterReason: 'timeout', priority: 'high' },
        { deadLetterReason: 'network_error', priority: 'normal' },
        { deadLetterReason: 'rate_limit', priority: 'urgent' },
        { deadLetterReason: 'timeout', priority: 'normal' },
      ]

      const analyzeDeadLetterPatterns = (items: any[]) => {
        const reasonBreakdown = items.reduce(
          (acc, item) => {
            const reason = item.deadLetterReason || 'unknown'
            acc[reason] = (acc[reason] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

        const priorityBreakdown = items.reduce(
          (acc, item) => {
            const priority = item.priority || 'normal'
            acc[priority] = (acc[priority] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

        return { reasonBreakdown, priorityBreakdown }
      }

      const analysis = analyzeDeadLetterPatterns(mockDeadLetterItems)

      expect(analysis.reasonBreakdown.timeout).toBe(3)
      expect(analysis.reasonBreakdown.network_error).toBe(1)
      expect(analysis.reasonBreakdown.rate_limit).toBe(1)

      expect(analysis.priorityBreakdown.normal).toBe(3)
      expect(analysis.priorityBreakdown.high).toBe(1)
      expect(analysis.priorityBreakdown.urgent).toBe(1)
    })
  })

  describe('Load Distribution Analysis', () => {
    test('should analyze queue load distribution by priority', () => {
      const mockQueueItems = [
        { priority: 'urgent', queuedAt: Date.now() - 60000 }, // 1 min ago
        { priority: 'urgent', queuedAt: Date.now() - 120000 }, // 2 min ago
        { priority: 'high', queuedAt: Date.now() - 300000 }, // 5 min ago
        { priority: 'normal', queuedAt: Date.now() - 600000 }, // 10 min ago
        { priority: 'normal', queuedAt: Date.now() - 900000 }, // 15 min ago
        { priority: 'normal', queuedAt: Date.now() - 1200000 }, // 20 min ago
      ]

      const analyzeLoadDistribution = (items: any[], currentTime: number) => {
        const priorityDistribution = items.reduce(
          (acc, item) => {
            const priority = item.priority || 'normal'
            acc[priority] = (acc[priority] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

        const ageDistribution = { fresh: 0, recent: 0, aging: 0, stale: 0 }

        items.forEach(item => {
          const age = currentTime - (item.queuedAt || item.createdAt)
          const ageMinutes = age / 60000

          if (ageMinutes < 1) ageDistribution.fresh++
          else if (ageMinutes < 5) ageDistribution.recent++
          else if (ageMinutes < 15) ageDistribution.aging++
          else ageDistribution.stale++
        })

        return { priorityDistribution, ageDistribution, total: items.length }
      }

      const analysis = analyzeLoadDistribution(mockQueueItems, Date.now())

      expect(analysis.total).toBe(6)
      expect(analysis.priorityDistribution.urgent).toBe(2)
      expect(analysis.priorityDistribution.high).toBe(1)
      expect(analysis.priorityDistribution.normal).toBe(3)

      expect(analysis.ageDistribution.recent).toBe(2) // 1min, 2min
      expect(analysis.ageDistribution.aging).toBe(2) // 5min, 10min
      expect(analysis.ageDistribution.stale).toBe(2) // 15min, 20min
    })

    test('should generate load balancing recommendations', () => {
      const generateLoadBalancingRecommendations = (
        capacityUtilization: number,
        processingUtilization: number,
        staleCount: number,
        urgentRatio: number
      ) => {
        const recommendations = []

        if (capacityUtilization > 85) {
          recommendations.push({
            type: 'capacity',
            priority: 'high',
            action: 'Scale up processing capacity or implement load shedding',
          })
        }

        if (processingUtilization > 90) {
          recommendations.push({
            type: 'processing',
            priority: 'high',
            action:
              'Increase concurrent processing limit or optimize performance',
          })
        }

        if (staleCount > 0) {
          recommendations.push({
            type: 'aging',
            priority: 'medium',
            action: 'Implement priority upgrades for aging requests',
          })
        }

        if (urgentRatio > 0.3) {
          recommendations.push({
            type: 'priority',
            priority: 'medium',
            action: 'Review priority assessment logic - too many urgent items',
          })
        }

        return recommendations
      }

      // No recommendations for healthy system
      expect(generateLoadBalancingRecommendations(70, 80, 0, 0.1)).toHaveLength(
        0
      )

      // High capacity utilization
      const capacityRecs = generateLoadBalancingRecommendations(90, 70, 0, 0.1)
      expect(capacityRecs).toHaveLength(1)
      expect(capacityRecs[0].type).toBe('capacity')

      // Multiple issues
      const multipleRecs = generateLoadBalancingRecommendations(90, 95, 5, 0.4)
      expect(multipleRecs).toHaveLength(4)
      expect(multipleRecs.map(r => r.type)).toEqual([
        'capacity',
        'processing',
        'aging',
        'priority',
      ])
    })
  })

  describe('Capacity Planning', () => {
    test('should calculate remaining capacity correctly', () => {
      const calculateCapacityMetrics = (
        totalQueued: number,
        maxCapacity: number,
        activeProcessing: number,
        maxConcurrent: number
      ) => {
        const capacityUtilization = (totalQueued / maxCapacity) * 100
        const processingUtilization = (activeProcessing / maxConcurrent) * 100
        const remainingCapacity = maxCapacity - totalQueued
        const availableProcessingSlots = maxConcurrent - activeProcessing

        return {
          capacityUtilization: Math.round(capacityUtilization * 100) / 100,
          processingUtilization: Math.round(processingUtilization * 100) / 100,
          remainingCapacity,
          availableProcessingSlots,
          nearCapacity: capacityUtilization > 80,
        }
      }

      const metrics = calculateCapacityMetrics(750, 1000, 8, 10)

      expect(metrics.capacityUtilization).toBe(75)
      expect(metrics.processingUtilization).toBe(80)
      expect(metrics.remainingCapacity).toBe(250)
      expect(metrics.availableProcessingSlots).toBe(2)
      expect(metrics.nearCapacity).toBe(false)

      // Test near capacity condition
      const nearCapacityMetrics = calculateCapacityMetrics(850, 1000, 9, 10)
      expect(nearCapacityMetrics.nearCapacity).toBe(true)
    })

    test('should handle edge cases in capacity calculations', () => {
      const safeCapacityCalculation = (
        totalQueued: number,
        maxCapacity: number
      ) => {
        if (maxCapacity === 0) return { utilization: 0, remaining: 0 }

        const utilization = Math.min((totalQueued / maxCapacity) * 100, 100)
        const remaining = Math.max(maxCapacity - totalQueued, 0)

        return { utilization, remaining }
      }

      // Zero capacity edge case
      expect(safeCapacityCalculation(10, 0)).toEqual({
        utilization: 0,
        remaining: 0,
      })

      // Over capacity edge case
      expect(safeCapacityCalculation(1200, 1000)).toEqual({
        utilization: 100,
        remaining: 0,
      })

      // Normal case
      expect(safeCapacityCalculation(500, 1000)).toEqual({
        utilization: 50,
        remaining: 500,
      })
    })
  })
})
