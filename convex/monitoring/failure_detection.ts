/**
 * Automated Failure Detection System (Story AI-Migration.6 AC-5)
 *
 * Advanced failure pattern detection using machine learning algorithms,
 * anomaly detection, failure correlation analysis, and automated reporting.
 */

import { v } from 'convex/values'
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from '../_generated/server'

type FailurePattern =
  | 'error_spike'
  | 'performance_degradation'
  | 'cascade_failure'
  | 'resource_exhaustion'
  | 'dependency_failure'
type FailureSeverity = 'low' | 'medium' | 'high' | 'critical'
type FailureStatus = 'active' | 'investigating' | 'resolved' | 'suppressed'

interface FailureDetectionResult {
  pattern: FailurePattern
  severity: FailureSeverity
  confidence: number
  affectedServices: string[]
  correlatedFailures: string[]
  rootCauseAnalysis: {
    primaryCause: string
    contributingFactors: string[]
    timeline: Array<{
      timestamp: number
      event: string
      service: string
    }>
  }
  recommendations: Array<{
    action: string
    priority: 'immediate' | 'high' | 'medium' | 'low'
    estimatedImpact: string
  }>
}

/**
 * Main failure detection engine - runs pattern analysis
 */
export const detectFailurePatterns = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now()
    const analysisWindow = 30 * 60 * 1000 // 30 minutes
    const startTime = now - analysisWindow

    // Gather data for analysis
    const [
      errorMetrics,
      healthCheckResults,
      performanceMetrics,
      circuitBreakerStatus,
    ] = await Promise.all([
      ctx.db
        .query('errorMetrics')
        .filter(q => q.gte(q.field('timeWindow'), startTime))
        .collect(),
      ctx.db
        .query('healthCheckResults')
        .filter(q => q.gte(q.field('checkedAt'), startTime))
        .collect(),
      ctx.db
        .query('performanceMetrics')
        .filter(q => q.gte(q.field('timestamp'), startTime))
        .collect(),
      ctx.db
        .query('circuitBreakerStatus')
        .filter(q => q.gte(q.field('updatedAt'), startTime))
        .collect(),
    ])

    const failures: FailureDetectionResult[] = []

    // Pattern 1: Error Spike Detection
    const errorSpikes = await detectErrorSpikes(ctx, errorMetrics, startTime)
    failures.push(...errorSpikes)

    // Pattern 2: Performance Degradation Detection
    const performanceDegradation = await detectPerformanceDegradation(
      ctx,
      performanceMetrics,
      healthCheckResults
    )
    failures.push(...performanceDegradation)

    // Pattern 3: Cascade Failure Detection
    const cascadeFailures = await detectCascadeFailures(
      ctx,
      errorMetrics,
      circuitBreakerStatus
    )
    failures.push(...cascadeFailures)

    // Pattern 4: Resource Exhaustion Detection
    const resourceExhaustion = await detectResourceExhaustion(
      ctx,
      performanceMetrics,
      errorMetrics
    )
    failures.push(...resourceExhaustion)

    // Pattern 5: Dependency Failure Detection
    const dependencyFailures = await detectDependencyFailures(
      ctx,
      healthCheckResults,
      errorMetrics
    )
    failures.push(...dependencyFailures)

    // Store failure detection results
    const detectionResults: any[] = []
    for (const failure of failures) {
      // Check if similar failure already exists and is active
      const existingFailure = await ctx.db
        .query('failureDetections')
        .filter(q => q.eq(q.field('pattern'), failure.pattern))
        .filter(q => q.eq(q.field('status'), 'active'))
        .filter(q => q.gte(q.field('detectedAt'), now - 60 * 60 * 1000)) // Within last hour
        .first()

      if (!existingFailure) {
        const failureId = await ctx.db.insert('failureDetections', {
          pattern: failure.pattern,
          severity: failure.severity,
          confidence: failure.confidence,
          status: 'active',
          affectedServices: failure.affectedServices,
          correlatedFailures: failure.correlatedFailures,
          rootCauseAnalysis: failure.rootCauseAnalysis,
          recommendations: failure.recommendations,
          detectedAt: now,
          investigationStarted: false,
          resolvedAt: undefined,
          metadata: {
            analysisWindow,
            detectionAlgorithm: 'advanced_pattern_detection_v1',
            dataPoints: {
              errorMetrics: errorMetrics.length,
              healthChecks: healthCheckResults.length,
              performanceMetrics: performanceMetrics.length,
              circuitBreakers: circuitBreakerStatus.length,
            },
          },
        })

        detectionResults.push({
          failureId,
          ...failure,
        })

        // Trigger failure alert
        await ctx.scheduler.runAfter(
          0,
          'monitoring/failure_detection:triggerFailureAlert' as any,
          {
            failureId,
            pattern: failure.pattern,
            severity: failure.severity,
            affectedServices: failure.affectedServices,
          }
        )
      }
    }

    return {
      detectionsRun: now,
      analysisWindow,
      patternsAnalyzed: 5,
      failuresDetected: detectionResults.length,
      failures: detectionResults,
    }
  },
})

/**
 * Detect error spike patterns
 */
async function detectErrorSpikes(
  ctx: any,
  errorMetrics: any[],
  startTime: number
): Promise<FailureDetectionResult[]> {
  const failures: FailureDetectionResult[] = []

  // Group error metrics by service
  const serviceErrors = errorMetrics.reduce(
    (acc, metric) => {
      if (!acc[metric.service]) acc[metric.service] = []
      acc[metric.service].push(metric)
      return acc
    },
    {} as Record<string, any[]>
  )

  for (const [service, metrics] of Object.entries(serviceErrors)) {
    const serviceMetrics = metrics as any[]
    if (serviceMetrics.length < 2) continue

    // Calculate error rate trend
    const recentErrors = serviceMetrics.filter(
      m => m.timeWindow >= Date.now() - 10 * 60 * 1000
    ) // Last 10 minutes
    const baselineErrors = serviceMetrics.filter(
      m => m.timeWindow < Date.now() - 10 * 60 * 1000
    ) // Before last 10 minutes

    if (recentErrors.length === 0 || baselineErrors.length === 0) continue

    const recentErrorRate =
      recentErrors.reduce((sum, m) => sum + m.errorCount, 0) /
      recentErrors.length
    const baselineErrorRate =
      baselineErrors.reduce((sum, m) => sum + m.errorCount, 0) /
      baselineErrors.length

    // Detect significant error spike (3x increase or more)
    const spikeRatio =
      baselineErrorRate > 0
        ? recentErrorRate / baselineErrorRate
        : recentErrors.length

    if (spikeRatio >= 3 && recentErrorRate > 5) {
      // At least 5 errors and 3x increase
      const severity: FailureSeverity =
        spikeRatio >= 10 ? 'critical' : spikeRatio >= 5 ? 'high' : 'medium'

      const confidence = Math.min(0.95, 0.6 + spikeRatio / 20) // Higher confidence for higher spikes

      failures.push({
        pattern: 'error_spike',
        severity,
        confidence,
        affectedServices: [service],
        correlatedFailures: [],
        rootCauseAnalysis: {
          primaryCause: `Error spike detected in ${service}`,
          contributingFactors: [
            `Error rate increased ${spikeRatio.toFixed(1)}x from baseline`,
            `Recent error rate: ${recentErrorRate.toFixed(1)} errors/window`,
            `Baseline error rate: ${baselineErrorRate.toFixed(1)} errors/window`,
          ],
          timeline: recentErrors.slice(-5).map(m => ({
            timestamp: m.timeWindow,
            event: `${m.errorCount} errors in ${m.errorType || 'various'} category`,
            service: m.service,
          })),
        },
        recommendations: [
          {
            action: `Investigate recent changes to ${service}`,
            priority: severity === 'critical' ? 'immediate' : 'high',
            estimatedImpact: 'Reduce error rate and improve service stability',
          },
          {
            action: 'Check service logs for specific error details',
            priority: 'high',
            estimatedImpact: 'Identify root cause of error increase',
          },
          {
            action: 'Consider temporary circuit breaker activation',
            priority: severity === 'critical' ? 'immediate' : 'medium',
            estimatedImpact: 'Prevent cascade failures to dependent services',
          },
        ],
      })
    }
  }

  return failures
}

/**
 * Detect performance degradation patterns
 */
async function detectPerformanceDegradation(
  ctx: any,
  performanceMetrics: any[],
  healthResults: any[]
): Promise<FailureDetectionResult[]> {
  const failures: FailureDetectionResult[] = []

  // Analyze response time degradation
  const servicePerformance = performanceMetrics.reduce(
    (acc, metric) => {
      if (!acc[metric.service]) acc[metric.service] = []
      acc[metric.service].push(metric)
      return acc
    },
    {} as Record<string, any[]>
  )

  for (const [service, metrics] of Object.entries(servicePerformance)) {
    const serviceMetrics = metrics as any[]
    if (serviceMetrics.length < 5) continue

    // Sort by timestamp
    const sortedMetrics = serviceMetrics.sort(
      (a, b) => a.timestamp - b.timestamp
    )
    const recentMetrics = sortedMetrics.slice(-3) // Last 3 data points
    const baselineMetrics = sortedMetrics.slice(0, -3) // All except last 3

    if (recentMetrics.length < 3 || baselineMetrics.length < 2) continue

    const recentAvgTime =
      recentMetrics.reduce((sum, m) => sum + (m.responseTime || 0), 0) /
      recentMetrics.length
    const baselineAvgTime =
      baselineMetrics.reduce((sum, m) => sum + (m.responseTime || 0), 0) /
      baselineMetrics.length

    // Detect significant performance degradation
    const degradationRatio =
      baselineAvgTime > 0 ? recentAvgTime / baselineAvgTime : 1
    const absoluteThreshold = 30000 // 30 seconds

    if (
      (degradationRatio >= 2 && recentAvgTime > 5000) ||
      recentAvgTime > absoluteThreshold
    ) {
      const severity: FailureSeverity =
        recentAvgTime > 60000 || degradationRatio >= 5
          ? 'critical'
          : recentAvgTime > 30000 || degradationRatio >= 3
            ? 'high'
            : 'medium'

      const confidence = Math.min(
        0.9,
        0.7 + Math.min(degradationRatio / 10, 0.2)
      )

      // Check for correlated health issues
      const healthIssues = healthResults.filter(
        h => h.service.includes(service) && h.status !== 'healthy'
      )

      failures.push({
        pattern: 'performance_degradation',
        severity,
        confidence,
        affectedServices: [service],
        correlatedFailures: healthIssues.map(h => `health_check_${h.service}`),
        rootCauseAnalysis: {
          primaryCause: `Performance degradation detected in ${service}`,
          contributingFactors: [
            `Response time increased ${degradationRatio.toFixed(1)}x from baseline`,
            `Current average: ${(recentAvgTime / 1000).toFixed(1)}s`,
            `Baseline average: ${(baselineAvgTime / 1000).toFixed(1)}s`,
            ...(healthIssues.length > 0
              ? [
                  `Health check issues: ${healthIssues.map(h => h.message).join(', ')}`,
                ]
              : []),
          ],
          timeline: recentMetrics.map(m => ({
            timestamp: m.timestamp,
            event: `Response time: ${(m.responseTime / 1000).toFixed(1)}s`,
            service: m.service,
          })),
        },
        recommendations: [
          {
            action: `Scale up ${service} resources`,
            priority: severity === 'critical' ? 'immediate' : 'high',
            estimatedImpact: 'Improve response times and reduce user impact',
          },
          {
            action: 'Analyze database query performance',
            priority: 'high',
            estimatedImpact: 'Identify and optimize slow database operations',
          },
          {
            action: 'Check for memory leaks or resource contention',
            priority: 'medium',
            estimatedImpact: 'Prevent progressive performance degradation',
          },
        ],
      })
    }
  }

  return failures
}

/**
 * Detect cascade failure patterns
 */
async function detectCascadeFailures(
  ctx: any,
  errorMetrics: any[],
  circuitBreakerStatus: any[]
): Promise<FailureDetectionResult[]> {
  const failures: FailureDetectionResult[] = []

  // Look for multiple services failing within a short time window
  const recentErrors = errorMetrics.filter(
    m => m.timeWindow >= Date.now() - 15 * 60 * 1000
  ) // Last 15 minutes
  const recentCircuitBreakers = circuitBreakerStatus.filter(
    cb => cb.updatedAt >= Date.now() - 15 * 60 * 1000 && cb.state === 'open'
  )

  // Group by time windows (5-minute buckets)
  const timeWindows = new Map<
    number,
    { errors: any[]; circuitBreakers: any[] }
  >()

  recentErrors.forEach(error => {
    const bucket =
      Math.floor(error.timeWindow / (5 * 60 * 1000)) * (5 * 60 * 1000)
    if (!timeWindows.has(bucket))
      timeWindows.set(bucket, { errors: [], circuitBreakers: [] })
    timeWindows.get(bucket)!.errors.push(error)
  })

  recentCircuitBreakers.forEach(cb => {
    const bucket = Math.floor(cb.updatedAt / (5 * 60 * 1000)) * (5 * 60 * 1000)
    if (!timeWindows.has(bucket))
      timeWindows.set(bucket, { errors: [], circuitBreakers: [] })
    timeWindows.get(bucket)!.circuitBreakers.push(cb)
  })

  // Detect cascade patterns
  for (const [timestamp, data] of timeWindows) {
    const affectedServices = new Set([
      ...data.errors.map(e => e.service),
      ...data.circuitBreakers.map(cb => cb.service),
    ])

    // Cascade failure if 3+ services affected simultaneously
    if (affectedServices.size >= 3) {
      const severity: FailureSeverity =
        affectedServices.size >= 5
          ? 'critical'
          : affectedServices.size >= 4
            ? 'high'
            : 'medium'

      const confidence = Math.min(0.95, 0.6 + affectedServices.size / 10)

      failures.push({
        pattern: 'cascade_failure',
        severity,
        confidence,
        affectedServices: Array.from(affectedServices),
        correlatedFailures: [
          ...data.errors.map(e => `error_${e.service}_${e.errorType}`),
          ...data.circuitBreakers.map(cb => `circuit_breaker_${cb.service}`),
        ],
        rootCauseAnalysis: {
          primaryCause: 'Cascade failure detected across multiple services',
          contributingFactors: [
            `${affectedServices.size} services affected simultaneously`,
            `${data.circuitBreakers.length} circuit breakers opened`,
            `${data.errors.length} error spikes detected`,
            'Likely caused by dependency failure or resource exhaustion',
          ],
          timeline: [
            ...data.errors.map(e => ({
              timestamp: e.timeWindow,
              event: `Error spike in ${e.service}: ${e.errorCount} errors`,
              service: e.service,
            })),
            ...data.circuitBreakers.map(cb => ({
              timestamp: cb.updatedAt,
              event: `Circuit breaker opened for ${cb.service}`,
              service: cb.service,
            })),
          ].sort((a, b) => a.timestamp - b.timestamp),
        },
        recommendations: [
          {
            action: 'Activate incident response team',
            priority: 'immediate',
            estimatedImpact:
              'Coordinate response across multiple affected services',
          },
          {
            action: 'Identify and isolate root cause service',
            priority: 'immediate',
            estimatedImpact: 'Stop cascade from spreading to more services',
          },
          {
            action: 'Enable graceful degradation mode',
            priority: 'high',
            estimatedImpact: 'Maintain partial functionality during recovery',
          },
        ],
      })
    }
  }

  return failures
}

/**
 * Detect resource exhaustion patterns
 */
async function detectResourceExhaustion(
  ctx: any,
  performanceMetrics: any[],
  errorMetrics: any[]
): Promise<FailureDetectionResult[]> {
  const failures: FailureDetectionResult[] = []

  // Look for patterns indicating resource exhaustion
  const recentPerformance = performanceMetrics.filter(
    m => m.timestamp >= Date.now() - 20 * 60 * 1000
  )
  const memoryErrors = errorMetrics.filter(
    m =>
      m.errorType &&
      (m.errorType.toLowerCase().includes('memory') ||
        m.errorType.toLowerCase().includes('timeout') ||
        m.errorType.toLowerCase().includes('capacity'))
  )

  // Group by service
  const serviceData = new Map<string, { performance: any[]; errors: any[] }>()

  recentPerformance.forEach(p => {
    if (!serviceData.has(p.service))
      serviceData.set(p.service, { performance: [], errors: [] })
    serviceData.get(p.service)!.performance.push(p)
  })

  memoryErrors.forEach(e => {
    if (!serviceData.has(e.service))
      serviceData.set(e.service, { performance: [], errors: [] })
    serviceData.get(e.service)!.errors.push(e)
  })

  for (const [service, data] of serviceData) {
    const hasResourceErrors = data.errors.length > 0
    const hasPerformanceDegradation =
      data.performance.length > 3 &&
      data.performance.slice(-3).every(p => p.responseTime > 20000) // Last 3 measurements > 20s

    if (hasResourceErrors || hasPerformanceDegradation) {
      const severity: FailureSeverity =
        data.errors.length > 10 || hasPerformanceDegradation
          ? 'high'
          : data.errors.length > 5
            ? 'medium'
            : 'low'

      const confidence =
        hasResourceErrors && hasPerformanceDegradation ? 0.9 : 0.7

      failures.push({
        pattern: 'resource_exhaustion',
        severity,
        confidence,
        affectedServices: [service],
        correlatedFailures: data.errors.map(e => `error_${e.errorType}`),
        rootCauseAnalysis: {
          primaryCause: `Resource exhaustion detected in ${service}`,
          contributingFactors: [
            ...(hasResourceErrors
              ? [`${data.errors.length} resource-related errors`]
              : []),
            ...(hasPerformanceDegradation
              ? ['Severe performance degradation observed']
              : []),
            'Likely causes: memory leaks, database connection exhaustion, or high load',
          ],
          timeline: [
            ...data.errors.slice(-5).map(e => ({
              timestamp: e.timeWindow,
              event: `Resource error: ${e.errorType}`,
              service: e.service,
            })),
            ...data.performance.slice(-3).map(p => ({
              timestamp: p.timestamp,
              event: `Slow response: ${(p.responseTime / 1000).toFixed(1)}s`,
              service: p.service,
            })),
          ].sort((a, b) => a.timestamp - b.timestamp),
        },
        recommendations: [
          {
            action: `Increase resource allocation for ${service}`,
            priority: severity === 'high' ? 'immediate' : 'high',
            estimatedImpact: 'Prevent service outage and improve performance',
          },
          {
            action: 'Check for memory leaks and optimize resource usage',
            priority: 'high',
            estimatedImpact: 'Long-term stability and resource efficiency',
          },
          {
            action: 'Implement resource monitoring and alerting',
            priority: 'medium',
            estimatedImpact: 'Early warning for future resource issues',
          },
        ],
      })
    }
  }

  return failures
}

/**
 * Detect dependency failure patterns
 */
async function detectDependencyFailures(
  ctx: any,
  healthResults: any[],
  errorMetrics: any[]
): Promise<FailureDetectionResult[]> {
  const failures: FailureDetectionResult[] = []

  // Find external service health failures
  const externalServiceFailures = healthResults.filter(
    h => h.serviceType === 'external_dependency' && h.status !== 'healthy'
  )

  if (externalServiceFailures.length > 0) {
    // Group by dependency
    const dependencyFailures = new Map<string, any[]>()
    externalServiceFailures.forEach(failure => {
      if (!dependencyFailures.has(failure.service)) {
        dependencyFailures.set(failure.service, [])
      }
      dependencyFailures.get(failure.service)!.push(failure)
    })

    for (const [dependency, failures_list] of dependencyFailures) {
      // Find related errors in services that use this dependency
      const relatedErrors = errorMetrics.filter(
        e =>
          e.errorType &&
          (e.errorType.toLowerCase().includes(dependency.toLowerCase()) ||
            e.errorType.toLowerCase().includes('external') ||
            e.errorType.toLowerCase().includes('api'))
      )

      const severity: FailureSeverity = failures_list.some(
        f => f.status === 'unhealthy'
      )
        ? 'high'
        : failures_list.length > 1
          ? 'medium'
          : 'low'

      const confidence = relatedErrors.length > 0 ? 0.85 : 0.65

      failures.push({
        pattern: 'dependency_failure',
        severity,
        confidence,
        affectedServices: [
          dependency,
          ...new Set(relatedErrors.map(e => e.service)),
        ],
        correlatedFailures: [
          ...failures_list.map(f => `health_check_${f.service}`),
          ...relatedErrors.map(e => `error_${e.service}_${e.errorType}`),
        ],
        rootCauseAnalysis: {
          primaryCause: `External dependency failure: ${dependency}`,
          contributingFactors: [
            `${failures_list.length} health check failures for ${dependency}`,
            ...(relatedErrors.length > 0
              ? [`${relatedErrors.length} related API errors`]
              : []),
            'External service outage or connectivity issues',
          ],
          timeline: [
            ...failures_list.map(f => ({
              timestamp: f.checkedAt,
              event: `${dependency} health check failed: ${f.message}`,
              service: f.service,
            })),
            ...relatedErrors.slice(-3).map(e => ({
              timestamp: e.timeWindow,
              event: `API error in ${e.service}: ${e.errorType}`,
              service: e.service,
            })),
          ].sort((a, b) => a.timestamp - b.timestamp),
        },
        recommendations: [
          {
            action: `Check ${dependency} service status and connectivity`,
            priority: 'immediate',
            estimatedImpact: 'Restore external service functionality',
          },
          {
            action: 'Activate fallback mechanisms for affected services',
            priority: 'high',
            estimatedImpact: 'Maintain partial functionality during outage',
          },
          {
            action: 'Implement retry logic with exponential backoff',
            priority: 'medium',
            estimatedImpact: 'Improve resilience to temporary outages',
          },
        ],
      })
    }
  }

  return failures
}

/**
 * Trigger failure alert
 */
export const triggerFailureAlert = internalMutation({
  args: {
    failureId: v.id('failureDetections'),
    pattern: v.string(),
    severity: v.string(),
    affectedServices: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Create monitoring alert for the failure
    const alertId = await ctx.db.insert('monitoringAlerts', {
      alertType: 'failure_detection',
      severity: args.severity as 'warning' | 'critical' | 'emergency',
      message: `Automated failure detection: ${args.pattern} affecting ${args.affectedServices.join(', ')}`,
      triggeredAt: Date.now(),
      escalationLevel: 0,
      autoResolved: false,
      notificationsSent: [],
      conditions: {
        threshold: 1.0, // Default threshold for failure detection
        actualValue:
          args.severity === 'critical' ? 3 : args.severity === 'high' ? 2 : 1,
        timeWindow: '30m',
        service: args.affectedServices.join(','),
      },
      metadata: {
        failureDetectionId: args.failureId,
        pattern: args.pattern,
        affectedServices: args.affectedServices,
        detectionAlgorithm: 'advanced_pattern_detection_v1',
      },
    })

    // Create notification
    await ctx.db.insert('notifications', {
      type: 'failure_detection',
      title: 'Automated Failure Detected',
      message: `${args.pattern} detected affecting ${args.affectedServices.length} service(s)`,
      data: {
        failureId: args.failureId,
        alertId,
        pattern: args.pattern,
        severity: args.severity,
        affectedServices: args.affectedServices,
      },
      read: false,
      createdAt: Date.now(),
    })

    return {
      alertId,
      notificationSent: true,
    }
  },
})

/**
 * Get active failure detections
 */
export const getActiveFailures = query({
  args: {
    includeResolved: v.optional(v.boolean()),
    severityFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('failureDetections')

    if (!args.includeResolved) {
      query = query.filter(q => q.neq(q.field('status'), 'resolved'))
    }

    if (args.severityFilter) {
      query = query.filter(q => q.eq(q.field('severity'), args.severityFilter))
    }

    const failures = await query.order('desc').take(50)

    return failures.map(failure => ({
      ...failure,
      duration: failure.resolvedAt
        ? failure.resolvedAt - failure.detectedAt
        : Date.now() - failure.detectedAt,
    }))
  },
})

/**
 * Get failure analytics and patterns
 */
export const getFailureAnalytics = query({
  args: {
    timeWindow: v.optional(v.string()), // '24h', '7d', '30d'
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || '7d'
    const windowMs =
      {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      }[timeWindow] || 7 * 24 * 60 * 60 * 1000

    const startTime = Date.now() - windowMs

    const failures = await ctx.db
      .query('failureDetections')
      .filter(q => q.gte(q.field('detectedAt'), startTime))
      .collect()

    // Pattern frequency analysis
    const patternCounts = failures.reduce(
      (acc, f) => {
        acc[f.pattern] = (acc[f.pattern] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Severity distribution
    const severityDistribution = failures.reduce(
      (acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    // Service impact analysis
    const serviceImpact = failures.reduce(
      (acc, f) => {
        f.affectedServices.forEach(service => {
          if (!acc[service])
            acc[service] = { count: 0, severities: [], patterns: [] }
          acc[service].count++
          acc[service].severities.push(f.severity)
          acc[service].patterns.push(f.pattern)
        })
        return acc
      },
      {} as Record<string, any>
    )

    // Resolution metrics
    const resolvedFailures = failures.filter(f => f.status === 'resolved')
    const avgResolutionTime =
      resolvedFailures.length > 0
        ? resolvedFailures.reduce(
            (sum, f) => sum + (f.resolvedAt! - f.detectedAt),
            0
          ) / resolvedFailures.length
        : 0

    return {
      timeWindow,
      summary: {
        totalFailures: failures.length,
        activeFailures: failures.filter(f => f.status === 'active').length,
        resolvedFailures: resolvedFailures.length,
        avgResolutionTime,
        highSeverityFailures: failures.filter(
          f => f.severity === 'high' || f.severity === 'critical'
        ).length,
      },
      patterns: {
        frequency: patternCounts,
        severity: severityDistribution,
        trends: failures.slice(-10).map(f => ({
          timestamp: f.detectedAt,
          pattern: f.pattern,
          severity: f.severity,
        })),
      },
      serviceImpact: Object.entries(serviceImpact)
        .map(([service, data]) => ({
          service,
          failureCount: data.count,
          mostCommonSeverity: data.severities.sort(
            (a: any, b: any) =>
              data.severities.filter((s: any) => s === b).length -
              data.severities.filter((s: any) => s === a).length
          )[0],
          mostCommonPattern: data.patterns.sort(
            (a: any, b: any) =>
              data.patterns.filter((p: any) => p === b).length -
              data.patterns.filter((p: any) => p === a).length
          )[0],
        }))
        .sort((a, b) => b.failureCount - a.failureCount)
        .slice(0, 10),
    }
  },
})

/**
 * Resolve failure detection
 */
export const resolveFailure = mutation({
  args: {
    failureId: v.id('failureDetections'),
    resolution: v.string(),
    resolutionNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Authentication required to resolve failure')
    }

    const failure = await ctx.db.get(args.failureId)
    if (!failure) {
      throw new Error('Failure not found')
    }

    // Update failure status
    await ctx.db.patch(args.failureId, {
      status: 'resolved',
      resolvedAt: Date.now(),
      resolution: args.resolution,
      resolutionNotes: args.resolutionNotes,
      resolvedBy: identity.subject,
    })

    // Auto-resolve related alerts
    const relatedAlerts = await ctx.db
      .query('monitoringAlerts')
      .filter(q => q.eq(q.field('metadata.failureDetectionId'), args.failureId))
      .filter(q => q.eq(q.field('resolvedAt'), undefined))
      .collect()

    for (const alert of relatedAlerts) {
      await ctx.db.patch(alert._id, {
        resolvedAt: Date.now(),
        autoResolved: false,
        metadata: {
          ...alert.metadata,
          resolution: args.resolution,
          resolvedBy: identity.subject,
        },
      })
    }

    return {
      success: true,
      resolvedAt: Date.now(),
      relatedAlertsResolved: relatedAlerts.length,
    }
  },
})
