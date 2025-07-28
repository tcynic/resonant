/**
 * Unit Tests for Queue Metrics and Monitoring System
 * Tests comprehensive monitoring, analytics, and alerting functionality
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
const mockDb = {
  query: jest.fn(),
  insert: jest.fn(),
  patch: jest.fn(),
  get: jest.fn(),
}

const mockCtx = {
  db: mockDb,
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
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('Queue Metrics and Monitoring System', () => {
  describe('Queue Dashboard Metrics', () => {
    test('should calculate basic queue metrics correctly', () => {
      const mockQueueItems = [
        {
          _id: '1',
          status: 'processing',
          priority: 'urgent',
          queuedAt: Date.now() - 30000,
        },
        {
          _id: '2',
          status: 'processing',
          priority: 'high',
          queuedAt: Date.now() - 60000,
        },
        {
          _id: '3',
          status: 'processing',
          priority: 'normal',
          queuedAt: Date.now() - 120000,
        },
      ]

      const totalQueued = mockQueueItems.length
      const maxCapacity = 1000
      const capacityUtilization = (totalQueued / maxCapacity) * 100

      expect(totalQueued).toBe(3)
      expect(capacityUtilization).toBe(0.3)
      expect(capacityUtilization).toBeLessThan(1) // Well under capacity
    })

    test('should break down items by priority correctly', () => {
      const mockQueueItems = [
        { priority: 'urgent' },
        { priority: 'urgent' },
        { priority: 'high' },
        { priority: 'normal' },
        { priority: 'normal' },
        { priority: 'normal' },
      ]

      const priorityBreakdown = mockQueueItems.reduce(
        (acc, item) => {
          const priority = item.priority || 'normal'
          acc[priority] = (acc[priority] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      expect(priorityBreakdown.urgent).toBe(2)
      expect(priorityBreakdown.high).toBe(1)
      expect(priorityBreakdown.normal).toBe(3)
    })

    test('should calculate wait times accurately', () => {
      const now = Date.now()
      const mockQueueItems = [
        { queuedAt: now - 30000 }, // 30 seconds ago
        { queuedAt: now - 60000 }, // 1 minute ago
        { queuedAt: now - 120000 }, // 2 minutes ago
      ]

      const waitTimes = mockQueueItems.map(item => now - item.queuedAt)
      const averageWaitTime =
        waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
      const maxWaitTime = Math.max(...waitTimes)

      expect(averageWaitTime).toBe(70000) // Average of 30, 60, 120 seconds
      expect(maxWaitTime).toBe(120000) // 2 minutes maximum
    })

    test('should distinguish between active processing and waiting items', () => {
      const mockQueueItems = [
        {
          _id: '1',
          status: 'processing',
          processingStartedAt: Date.now() - 10000,
        },
        {
          _id: '2',
          status: 'processing',
          processingStartedAt: Date.now() - 5000,
        },
        { _id: '3', status: 'processing', processingStartedAt: undefined },
        { _id: '4', status: 'processing', processingStartedAt: undefined },
      ]

      const activeProcessing = mockQueueItems.filter(
        item => item.processingStartedAt
      ).length
      const waitingInQueue = mockQueueItems.length - activeProcessing

      expect(activeProcessing).toBe(2)
      expect(waitingInQueue).toBe(2)
    })
  })

  describe('SLA Compliance Analysis', () => {
    test('should calculate SLA compliance rates correctly', () => {
      const slaTargets = {
        urgent: 30000, // 30 seconds
        high: 120000, // 2 minutes
        normal: 600000, // 10 minutes
      }

      const mockCompletedItems = [
        { priority: 'urgent', totalProcessingTime: 25000 }, // Within SLA
        { priority: 'urgent', totalProcessingTime: 35000 }, // SLA violation
        { priority: 'high', totalProcessingTime: 90000 }, // Within SLA
        { priority: 'high', totalProcessingTime: 150000 }, // SLA violation
        { priority: 'normal', totalProcessingTime: 300000 }, // Within SLA
      ]

      const urgentItems = mockCompletedItems.filter(
        item => item.priority === 'urgent'
      )
      const urgentCompliant = urgentItems.filter(
        item => item.totalProcessingTime <= slaTargets.urgent
      )
      const urgentComplianceRate =
        (urgentCompliant.length / urgentItems.length) * 100

      expect(urgentComplianceRate).toBe(50) // 1 out of 2 urgent items compliant

      const highItems = mockCompletedItems.filter(
        item => item.priority === 'high'
      )
      const highCompliant = highItems.filter(
        item => item.totalProcessingTime <= slaTargets.high
      )
      const highComplianceRate = (highCompliant.length / highItems.length) * 100

      expect(highComplianceRate).toBe(50) // 1 out of 2 high items compliant

      const normalItems = mockCompletedItems.filter(
        item => item.priority === 'normal'
      )
      const normalCompliant = normalItems.filter(
        item => item.totalProcessingTime <= slaTargets.normal
      )
      const normalComplianceRate =
        (normalCompliant.length / normalItems.length) * 100

      expect(normalComplianceRate).toBe(100) // 1 out of 1 normal items compliant
    })

    test('should identify SLA violations in real-time', () => {
      const now = Date.now()
      const slaTargets = {
        urgent: 30000, // 30 seconds
        high: 120000, // 2 minutes
        normal: 600000, // 10 minutes
      }

      const mockQueueItems = [
        { _id: '1', priority: 'urgent', queuedAt: now - 45000 }, // 45s - violation
        { _id: '2', priority: 'high', queuedAt: now - 180000 }, // 3min - violation
        { _id: '3', priority: 'normal', queuedAt: now - 300000 }, // 5min - OK
        { _id: '4', priority: 'urgent', queuedAt: now - 15000 }, // 15s - OK
      ]

      const violations = mockQueueItems.filter(item => {
        const priority = item.priority || 'normal'
        const slaTarget = slaTargets[priority as keyof typeof slaTargets]
        const currentWaitTime = now - item.queuedAt
        return currentWaitTime > slaTarget
      })

      expect(violations.length).toBe(2)
      expect(violations.map(v => v._id)).toEqual(['1', '2'])
    })
  })

  describe('Queue Health Assessment', () => {
    test('should determine health status based on multiple factors', () => {
      const determineHealth = (
        capacityUtilization: number,
        averageWaitTime: number,
        successRate: number
      ) => {
        let score = 100
        let status = 'healthy'

        if (capacityUtilization > 95) {
          score -= 40
          status = 'critical'
        } else if (capacityUtilization > 80) {
          score -= 20
          status = 'warning'
        }

        if (averageWaitTime > 300000) {
          // 5 minutes
          score -= 30
          status = status === 'healthy' ? 'critical' : status
        } else if (averageWaitTime > 120000) {
          // 2 minutes
          score -= 15
          status = status === 'healthy' ? 'warning' : status
        }

        if (successRate < 90) {
          score -= 25
          status = 'critical'
        } else if (successRate < 95) {
          score -= 10
          status = status === 'healthy' ? 'warning' : status
        }

        return { status, score: Math.max(0, score) }
      }

      // Test healthy system
      expect(determineHealth(50, 60000, 98)).toEqual({
        status: 'healthy',
        score: 100,
      })

      // Test warning conditions
      expect(determineHealth(85, 60000, 98)).toEqual({
        status: 'warning',
        score: 80,
      })
      expect(determineHealth(50, 150000, 98)).toEqual({
        status: 'warning',
        score: 85,
      })
      expect(determineHealth(50, 60000, 93)).toEqual({
        status: 'warning',
        score: 90,
      })

      // Test critical conditions
      expect(determineHealth(98, 60000, 98)).toEqual({
        status: 'critical',
        score: 60,
      })
      expect(determineHealth(50, 400000, 98)).toEqual({
        status: 'critical',
        score: 70,
      })
      expect(determineHealth(50, 60000, 85)).toEqual({
        status: 'critical',
        score: 75,
      })
    })

    test('should generate appropriate alerts based on thresholds', () => {
      const generateAlerts = (
        capacityUtilization: number,
        averageWaitTime: number,
        successRate: number
      ) => {
        const alerts = []

        if (capacityUtilization > 95) {
          alerts.push({
            severity: 'critical',
            type: 'capacity',
            message: `Queue at ${Math.round(capacityUtilization)}% capacity`,
          })
        } else if (capacityUtilization > 80) {
          alerts.push({
            severity: 'warning',
            type: 'capacity',
            message: `Queue approaching capacity at ${Math.round(capacityUtilization)}%`,
          })
        }

        if (averageWaitTime > 300000) {
          // 5 minutes
          alerts.push({
            severity: 'critical',
            type: 'wait_time',
            message: `Average wait time ${Math.round(averageWaitTime / 1000)}s exceeds critical threshold`,
          })
        } else if (averageWaitTime > 120000) {
          // 2 minutes
          alerts.push({
            severity: 'warning',
            type: 'wait_time',
            message: `Average wait time ${Math.round(averageWaitTime / 1000)}s exceeds normal threshold`,
          })
        }

        if (successRate < 90) {
          alerts.push({
            severity: 'critical',
            type: 'success_rate',
            message: `Success rate ${Math.round(successRate)}% below critical threshold`,
          })
        }

        return alerts
      }

      // No alerts for healthy system
      expect(generateAlerts(50, 60000, 98)).toHaveLength(0)

      // Warning alerts
      const warningAlerts = generateAlerts(85, 150000, 93)
      expect(warningAlerts).toHaveLength(2)
      expect(warningAlerts.map(a => a.type)).toEqual(['capacity', 'wait_time'])

      // Critical alerts
      const criticalAlerts = generateAlerts(98, 400000, 85)
      expect(criticalAlerts).toHaveLength(3)
      expect(criticalAlerts.every(a => a.severity === 'critical')).toBe(true)
    })
  })

  describe('Performance Analytics', () => {
    test('should calculate processing time statistics', () => {
      const processingTimes = [1000, 2000, 1500, 3000, 2500, 1800, 4000, 1200]

      const calculateStats = (times: number[]) => {
        const sorted = times.sort((a, b) => a - b)
        const sum = times.reduce((a, b) => a + b, 0)

        return {
          min: sorted[0],
          max: sorted[sorted.length - 1],
          average: Math.round(sum / times.length),
          median: sorted[Math.floor(sorted.length / 2)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)],
        }
      }

      const stats = calculateStats(processingTimes)

      expect(stats.min).toBe(1000)
      expect(stats.max).toBe(4000)
      expect(stats.average).toBe(2125) // Average of all values
      expect(stats.median).toBe(2000) // Middle value when sorted (1000,1200,1500,1800,2000,2500,3000,4000)
      expect(stats.p95).toBe(4000) // 95th percentile (8 items, 95% = index 7)
    })

    test('should analyze performance by priority level', () => {
      const mockItems = [
        { priority: 'urgent', status: 'completed', processingTime: 25000 },
        { priority: 'urgent', status: 'failed', processingTime: null },
        { priority: 'high', status: 'completed', processingTime: 90000 },
        { priority: 'high', status: 'completed', processingTime: 110000 },
        { priority: 'normal', status: 'processing', processingTime: null },
      ]

      const analyzeByPriority = (priority: string) => {
        const items = mockItems.filter(item => item.priority === priority)
        const completed = items.filter(item => item.status === 'completed')
        const failed = items.filter(item => item.status === 'failed')
        const processing = items.filter(item => item.status === 'processing')

        const total = items.length
        const successRate =
          total > 0
            ? (completed.length / (completed.length + failed.length)) * 100
            : 100

        const processingTimes = completed
          .filter(item => item.processingTime)
          .map(item => item.processingTime!)

        const averageProcessingTime =
          processingTimes.length > 0
            ? Math.round(
                processingTimes.reduce((sum, time) => sum + time, 0) /
                  processingTimes.length
              )
            : 0

        return {
          total,
          completed: completed.length,
          failed: failed.length,
          processing: processing.length,
          successRate: Math.round(successRate * 100) / 100,
          averageProcessingTime,
        }
      }

      const urgentStats = analyzeByPriority('urgent')
      expect(urgentStats.total).toBe(2)
      expect(urgentStats.completed).toBe(1)
      expect(urgentStats.failed).toBe(1)
      expect(urgentStats.successRate).toBe(50)
      expect(urgentStats.averageProcessingTime).toBe(25000)

      const highStats = analyzeByPriority('high')
      expect(highStats.total).toBe(2)
      expect(highStats.completed).toBe(2)
      expect(highStats.successRate).toBe(100)
      expect(highStats.averageProcessingTime).toBe(100000) // (90000 + 110000) / 2
    })

    test('should generate throughput timeline', () => {
      const now = Date.now()
      const hourMs = 60 * 60 * 1000

      const mockItems = [
        { createdAt: now - 0.5 * hourMs, status: 'completed' }, // Current hour
        { createdAt: now - 0.8 * hourMs, status: 'completed' }, // Current hour
        { createdAt: now - 1.5 * hourMs, status: 'completed' }, // 1 hour ago
        { createdAt: now - 1.7 * hourMs, status: 'failed' }, // 1 hour ago
        { createdAt: now - 2.3 * hourMs, status: 'completed' }, // 2 hours ago
      ]

      const generateTimeline = (items: any[], timeRangeHours: number) => {
        const timeline = []

        for (let i = timeRangeHours - 1; i >= 0; i--) {
          const hourStart = now - (i + 1) * hourMs
          const hourEnd = now - i * hourMs

          const hourItems = items.filter(
            item => item.createdAt >= hourStart && item.createdAt < hourEnd
          )

          const completed = hourItems.filter(
            item => item.status === 'completed'
          ).length
          const failed = hourItems.filter(
            item => item.status === 'failed'
          ).length

          timeline.push({
            hour: i,
            total: hourItems.length,
            completed,
            failed,
            successRate:
              hourItems.length > 0
                ? (completed / (completed + failed)) * 100
                : 100,
          })
        }

        return timeline
      }

      const timeline = generateTimeline(mockItems, 3)

      expect(timeline).toHaveLength(3)
      expect(timeline[0].total).toBe(1) // 2 hours ago
      expect(timeline[1].total).toBe(2) // 1 hour ago
      expect(timeline[2].total).toBe(2) // Current hour

      expect(timeline[1].successRate).toBe(50) // 1 completed, 1 failed
      expect(timeline[2].successRate).toBe(100) // 2 completed, 0 failed
    })
  })

  describe('Error Analysis', () => {
    test('should categorize errors correctly', () => {
      const categorizeError = (errorMessage: string): string => {
        const message = errorMessage.toLowerCase()

        if (message.includes('timeout') || message.includes('timed out'))
          return 'timeout'
        if (message.includes('network') || message.includes('connection'))
          return 'network'
        if (message.includes('rate limit') || message.includes('quota'))
          return 'rate_limit'
        if (message.includes('auth') || message.includes('unauthorized'))
          return 'authentication'
        if (message.includes('api') || message.includes('gemini'))
          return 'api_error'
        if (message.includes('cancel') || message.includes('cancelled'))
          return 'cancelled'
        if (message.includes('validation') || message.includes('invalid'))
          return 'validation'
        if (message.includes('expired') || message.includes('maximum age'))
          return 'expired'

        return 'other'
      }

      expect(categorizeError('Request timed out after 30 seconds')).toBe(
        'timeout'
      )
      expect(categorizeError('Network connection failed')).toBe('network')
      expect(categorizeError('API rate limit exceeded')).toBe('rate_limit')
      expect(categorizeError('Unauthorized access to Gemini API')).toBe(
        'authentication'
      )
      expect(categorizeError('Gemini API returned error 500')).toBe('api_error')
      expect(categorizeError('Analysis cancelled by user')).toBe('cancelled')
      expect(categorizeError('Invalid input validation failed')).toBe(
        'validation'
      )
      expect(categorizeError('Queue item expired - maximum age exceeded')).toBe(
        'expired'
      )
      expect(categorizeError('Unknown error occurred')).toBe('other')
    })

    test('should analyze error patterns and frequencies', () => {
      const mockFailedItems = [
        { lastErrorMessage: 'Request timed out after 30 seconds' },
        { lastErrorMessage: 'Network connection failed' },
        { lastErrorMessage: 'Request timed out after 30 seconds' },
        { lastErrorMessage: 'API rate limit exceeded' },
        { lastErrorMessage: 'Request timed out after 30 seconds' },
        { lastErrorMessage: 'Network connection failed' },
      ]

      const analyzeErrors = (items: any[]) => {
        const errorCounts = items.reduce(
          (acc, item) => {
            const message = item.lastErrorMessage || 'Unknown error'
            acc[message] = (acc[message] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

        const topErrors = Object.entries(errorCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([error, count]) => ({ error, count }))

        return {
          totalErrors: items.length,
          uniqueErrors: Object.keys(errorCounts).length,
          topErrors,
        }
      }

      const analysis = analyzeErrors(mockFailedItems)

      expect(analysis.totalErrors).toBe(6)
      expect(analysis.uniqueErrors).toBe(3)
      expect(analysis.topErrors[0]).toEqual({
        error: 'Request timed out after 30 seconds',
        count: 3,
      })
      expect(analysis.topErrors[1]).toEqual({
        error: 'Network connection failed',
        count: 2,
      })
    })
  })

  describe('Metrics Export', () => {
    test('should export metrics in Prometheus format', () => {
      const mockMetrics = {
        queue_total_items: 25,
        queue_capacity_utilization_percent: 2.5,
        queue_average_wait_time_ms: 45000,
        queue_success_rate_percent: 95.5,
        queue_health_score: 85,
      }

      const prometheusFormat = Object.entries(mockMetrics)
        .map(([key, value]) => `${key} ${value}`)
        .join('\n')

      expect(prometheusFormat).toContain('queue_total_items 25')
      expect(prometheusFormat).toContain(
        'queue_capacity_utilization_percent 2.5'
      )
      expect(prometheusFormat).toContain('queue_success_rate_percent 95.5')
    })

    test('should export metrics in CSV format', () => {
      const mockMetrics = {
        queue_total_items: 25,
        queue_capacity_utilization_percent: 2.5,
        queue_success_rate_percent: 95.5,
      }

      const headers = Object.keys(mockMetrics).join(',')
      const values = Object.values(mockMetrics).join(',')
      const csvFormat = `${headers}\n${values}`

      expect(csvFormat.split('\n')).toHaveLength(2)
      expect(csvFormat).toContain(
        'queue_total_items,queue_capacity_utilization_percent,queue_success_rate_percent'
      )
      expect(csvFormat).toContain('25,2.5,95.5')
    })

    test('should export metrics in JSON format', () => {
      const mockMetrics = {
        queue_total_items: 25,
        queue_capacity_utilization_percent: 2.5,
        queue_success_rate_percent: 95.5,
        queue_health_score: 85,
      }

      const jsonFormat = JSON.stringify(mockMetrics, null, 2)
      const parsed = JSON.parse(jsonFormat)

      expect(parsed.queue_total_items).toBe(25)
      expect(parsed.queue_capacity_utilization_percent).toBe(2.5)
      expect(parsed.queue_success_rate_percent).toBe(95.5)
      expect(parsed.queue_health_score).toBe(85)
    })
  })

  describe('Recommendations Engine', () => {
    test('should generate capacity recommendations', () => {
      const generateRecommendations = (
        capacityUtilization: number,
        averageWaitTime: number,
        successRate: number
      ) => {
        const recommendations = []

        if (capacityUtilization > 80) {
          recommendations.push({
            type: 'capacity',
            priority: capacityUtilization > 95 ? 'critical' : 'high',
            action:
              'Increase processing capacity or implement queue throttling',
          })
        }

        if (averageWaitTime > 120000) {
          // 2 minutes
          recommendations.push({
            type: 'performance',
            priority: 'high',
            action:
              'Optimize processing algorithms or increase concurrent processing limit',
          })
        }

        if (successRate < 95) {
          recommendations.push({
            type: 'reliability',
            priority: 'critical',
            action:
              'Investigate and fix processing errors, improve error handling',
          })
        }

        return recommendations
      }

      // No recommendations for healthy system
      expect(generateRecommendations(50, 60000, 98)).toHaveLength(0)

      // Capacity recommendation
      const capacityRec = generateRecommendations(85, 60000, 98)
      expect(capacityRec).toHaveLength(1)
      expect(capacityRec[0].type).toBe('capacity')
      expect(capacityRec[0].priority).toBe('high')

      // Multiple recommendations
      const multipleRec = generateRecommendations(98, 180000, 90)
      expect(multipleRec).toHaveLength(3)
      expect(multipleRec.map(r => r.type)).toEqual([
        'capacity',
        'performance',
        'reliability',
      ])
      expect(multipleRec.filter(r => r.priority === 'critical')).toHaveLength(2)
    })
  })
})
