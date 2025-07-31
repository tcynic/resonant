/**
 * Comprehensive Health Check System (Story AI-Migration.6)
 * System health monitoring with detailed status reporting and dependency checks
 */

import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from '../_generated/server'
import { v } from 'convex/values'

// Health status types
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
type ServiceType =
  | 'ai_service'
  | 'database'
  | 'queue'
  | 'external_dependency'
  | 'circuit_breaker'

interface HealthCheckResult {
  service: string
  serviceType: ServiceType
  status: HealthStatus
  responseTime: number
  message: string
  details: Record<string, any>
  checkedAt: number
}

/**
 * Perform comprehensive system health check
 */
export const performSystemHealthCheck = internalMutation({
  args: {},
  handler: async ctx => {
    const startTime = Date.now()
    const results: HealthCheckResult[] = []

    // Parallel health checks for all services
    const [
      aiServiceHealth,
      databaseHealth,
      queueHealth,
      externalServicesHealth,
      circuitBreakerHealth,
    ] = await Promise.allSettled([
      checkAIServicesHealth(ctx),
      checkDatabaseHealth(ctx),
      checkQueueSystemHealth(ctx),
      checkExternalDependenciesHealth(ctx),
      checkCircuitBreakersHealth(ctx),
    ])

    // Process results
    if (aiServiceHealth.status === 'fulfilled') {
      results.push(...aiServiceHealth.value)
    } else {
      results.push({
        service: 'ai_services',
        serviceType: 'ai_service',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'AI services health check failed',
        details: { error: aiServiceHealth.reason },
        checkedAt: Date.now(),
      })
    }

    if (databaseHealth.status === 'fulfilled') {
      results.push(databaseHealth.value)
    } else {
      results.push({
        service: 'database',
        serviceType: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Database health check failed',
        details: { error: databaseHealth.reason },
        checkedAt: Date.now(),
      })
    }

    if (queueHealth.status === 'fulfilled') {
      results.push(queueHealth.value)
    } else {
      results.push({
        service: 'queue',
        serviceType: 'queue',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Queue system health check failed',
        details: { error: queueHealth.reason },
        checkedAt: Date.now(),
      })
    }

    if (externalServicesHealth.status === 'fulfilled') {
      results.push(...externalServicesHealth.value)
    } else {
      results.push({
        service: 'external_services',
        serviceType: 'external_dependency',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'External services health check failed',
        details: { error: externalServicesHealth.reason },
        checkedAt: Date.now(),
      })
    }

    if (circuitBreakerHealth.status === 'fulfilled') {
      results.push(...circuitBreakerHealth.value)
    } else {
      results.push({
        service: 'circuit_breakers',
        serviceType: 'circuit_breaker',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Circuit breaker health check failed',
        details: { error: circuitBreakerHealth.reason },
        checkedAt: Date.now(),
      })
    }

    // Store health check results
    for (const result of results) {
      await ctx.db.insert('healthCheckResults', {
        service: result.service,
        serviceType: result.serviceType,
        status: result.status,
        responseTime: result.responseTime,
        message: result.message,
        details: result.details,
        checkedAt: result.checkedAt,
      })
    }

    // Calculate overall system health
    const overallHealth = calculateOverallHealth(results)

    // Store overall system health
    await ctx.db.insert('systemHealth', {
      overallStatus: overallHealth.status,
      healthScore: overallHealth.score,
      servicesSummary: {
        total: results.length,
        healthy: results.filter(r => r.status === 'healthy').length,
        degraded: results.filter(r => r.status === 'degraded').length,
        unhealthy: results.filter(r => r.status === 'unhealthy').length,
      },
      checkedAt: Date.now(),
      checkDuration: Date.now() - startTime,
    })

    // Process alerts for health check results
    const alertResults = await ctx.runMutation(
      'monitoring/health_checks:processHealthCheckAlerts',
      {
        healthCheckResults: results,
        overallHealth,
      }
    )

    // Check for alert resolutions
    const resolutionResults = await ctx.runMutation(
      'monitoring/health_checks:checkHealthAlertResolution',
      {
        healthCheckResults: results,
        overallHealth,
      }
    )

    // Schedule the next health check if there's an active schedule
    const activeSchedule = await ctx.db
      .query('healthCheckSchedule')
      .filter(q => q.eq(q.field('isActive'), true))
      .order('desc')
      .first()

    if (activeSchedule) {
      const nextCheckTime = activeSchedule.intervalMinutes * 60 * 1000
      await ctx.scheduler.runAfter(
        nextCheckTime,
        'monitoring/health_checks:performSystemHealthCheck',
        {}
      )

      // Update the schedule record
      await ctx.db.patch(activeSchedule._id, {
        nextScheduledAt: Date.now() + nextCheckTime,
      })
    }

    return {
      overallHealth,
      serviceResults: results,
      checkDuration: Date.now() - startTime,
      alertResults,
      resolutionResults,
    }
  },
})

/**
 * Check AI services health
 */
async function checkAIServicesHealth(ctx: any): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = []
  const startTime = Date.now()

  // Check Gemini AI service
  const geminiHealth = await checkGeminiServiceHealth(ctx)
  results.push({
    service: 'gemini_2_5_flash_lite',
    serviceType: 'ai_service',
    status: geminiHealth.status,
    responseTime: geminiHealth.responseTime,
    message: geminiHealth.message,
    details: geminiHealth.details,
    checkedAt: Date.now(),
  })

  // Check fallback analysis service
  const fallbackHealth = await checkFallbackServiceHealth(ctx)
  results.push({
    service: 'fallback_analysis',
    serviceType: 'ai_service',
    status: fallbackHealth.status,
    responseTime: fallbackHealth.responseTime,
    message: fallbackHealth.message,
    details: fallbackHealth.details,
    checkedAt: Date.now(),
  })

  return results
}

/**
 * Check Gemini AI service health
 */
async function checkGeminiServiceHealth(ctx: any) {
  const startTime = Date.now()

  try {
    // Check recent analysis success rate
    const recentAnalyses = await ctx.db
      .query('aiAnalysis')
      .filter((q: any) =>
        q.gte(q.field('createdAt'), Date.now() - 30 * 60 * 1000)
      ) // Last 30 minutes
      .filter((q: any) => q.eq(q.field('modelType'), 'gemini_2_5_flash_lite'))
      .collect()

    const totalAnalyses = recentAnalyses.length
    const successfulAnalyses = recentAnalyses.filter(
      (a: any) => a.status === 'completed'
    ).length
    const successRate =
      totalAnalyses > 0 ? successfulAnalyses / totalAnalyses : 1.0

    // Calculate average response time
    const completedAnalyses = recentAnalyses.filter(
      (a: any) => a.status === 'completed' && a.processingTime
    )
    const avgResponseTime =
      completedAnalyses.length > 0
        ? completedAnalyses.reduce(
            (sum: number, a: any) => sum + (a.processingTime || 0),
            0
          ) / completedAnalyses.length
        : 0

    // Determine health status
    let status: HealthStatus = 'healthy'
    let message = 'Gemini AI service is operating normally'

    if (successRate < 0.85) {
      status = 'unhealthy'
      message = `Gemini AI service unhealthy: ${(successRate * 100).toFixed(1)}% success rate`
    } else if (successRate < 0.92) {
      status = 'degraded'
      message = `Gemini AI service degraded: ${(successRate * 100).toFixed(1)}% success rate`
    } else if (avgResponseTime > 45000) {
      // 45 seconds
      status = 'degraded'
      message = `Gemini AI service slow: ${Math.round(avgResponseTime / 1000)}s average response time`
    }

    return {
      status,
      responseTime: Date.now() - startTime,
      message,
      details: {
        successRate,
        totalAnalyses,
        successfulAnalyses,
        avgResponseTime,
        recentErrors: recentAnalyses.filter((a: any) => a.status === 'failed')
          .length,
      },
    }
  } catch (error) {
    return {
      status: 'unhealthy' as HealthStatus,
      responseTime: Date.now() - startTime,
      message: 'Gemini AI service health check failed',
      details: { error: String(error) },
    }
  }
}

/**
 * Check fallback analysis service health
 */
async function checkFallbackServiceHealth(ctx: any) {
  const startTime = Date.now()

  try {
    // Check recent fallback usage
    const recentAnalyses = await ctx.db
      .query('aiAnalysis')
      .filter((q: any) =>
        q.gte(q.field('createdAt'), Date.now() - 60 * 60 * 1000)
      ) // Last hour
      .filter((q: any) => q.eq(q.field('fallbackUsed'), true))
      .collect()

    const fallbackUsageRate = recentAnalyses.length
    const totalRecentAnalyses = await ctx.db
      .query('aiAnalysis')
      .filter((q: any) =>
        q.gte(q.field('createdAt'), Date.now() - 60 * 60 * 1000)
      )
      .collect()

    const fallbackPercentage =
      totalRecentAnalyses.length > 0
        ? fallbackUsageRate / totalRecentAnalyses.length
        : 0

    let status: HealthStatus = 'healthy'
    let message = 'Fallback analysis service is available'

    if (fallbackPercentage > 0.5) {
      status = 'degraded'
      message = `High fallback usage: ${(fallbackPercentage * 100).toFixed(1)}% of requests`
    } else if (fallbackPercentage > 0.3) {
      status = 'degraded'
      message = `Elevated fallback usage: ${(fallbackPercentage * 100).toFixed(1)}% of requests`
    }

    return {
      status,
      responseTime: Date.now() - startTime,
      message,
      details: {
        fallbackUsageRate,
        fallbackPercentage,
        totalRecentAnalyses: totalRecentAnalyses.length,
      },
    }
  } catch (error) {
    return {
      status: 'unhealthy' as HealthStatus,
      responseTime: Date.now() - startTime,
      message: 'Fallback analysis service health check failed',
      details: { error: String(error) },
    }
  }
}

/**
 * Check database health
 */
async function checkDatabaseHealth(ctx: any): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // Test basic database operations
    const testQueries = [
      // Test simple query
      ctx.db.query('users').take(1),
      // Test recent data access
      ctx.db.query('aiAnalysis').order('desc').take(5),
      // Test aggregate operation
      ctx.db.query('journalEntries').take(10),
    ]

    await Promise.all(testQueries)

    // Check database performance
    const responseTime = Date.now() - startTime
    let status: HealthStatus = 'healthy'
    let message = 'Database is operating normally'

    if (responseTime > 5000) {
      // 5 seconds
      status = 'unhealthy'
      message = `Database unhealthy: ${responseTime}ms response time`
    } else if (responseTime > 2000) {
      // 2 seconds
      status = 'degraded'
      message = `Database degraded: ${responseTime}ms response time`
    }

    return {
      service: 'convex_database',
      serviceType: 'database',
      status,
      responseTime,
      message,
      details: {
        queryResponseTime: responseTime,
        testQueriesCompleted: testQueries.length,
      },
      checkedAt: Date.now(),
    }
  } catch (error) {
    return {
      service: 'convex_database',
      serviceType: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: 'Database health check failed',
      details: { error: String(error) },
      checkedAt: Date.now(),
    }
  }
}

/**
 * Check queue system health
 */
async function checkQueueSystemHealth(ctx: any): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // Check queue metrics from recent analyses
    const recentAnalyses = await ctx.db
      .query('aiAnalysis')
      .filter((q: any) =>
        q.gte(q.field('createdAt'), Date.now() - 15 * 60 * 1000)
      ) // Last 15 minutes
      .collect()

    const queuedAnalyses = recentAnalyses.filter(
      (a: any) => a.status === 'queued'
    ).length
    const processingAnalyses = recentAnalyses.filter(
      (a: any) => a.status === 'processing'
    ).length
    const totalRecent = recentAnalyses.length

    // Calculate queue metrics
    const avgProcessingTime =
      recentAnalyses
        .filter((a: any) => a.processingTime && a.status === 'completed')
        .reduce((sum: number, a: any) => sum + (a.processingTime || 0), 0) /
      Math.max(1, recentAnalyses.filter((a: any) => a.processingTime).length)

    let status: HealthStatus = 'healthy'
    let message = 'Queue system is operating normally'

    if (queuedAnalyses > 50) {
      status = 'unhealthy'
      message = `Queue system overloaded: ${queuedAnalyses} queued requests`
    } else if (queuedAnalyses > 20) {
      status = 'degraded'
      message = `Queue system under high load: ${queuedAnalyses} queued requests`
    } else if (avgProcessingTime > 60000) {
      // 60 seconds
      status = 'degraded'
      message = `Queue processing slow: ${Math.round(avgProcessingTime / 1000)}s average processing time`
    }

    return {
      service: 'analysis_queue',
      serviceType: 'queue',
      status,
      responseTime: Date.now() - startTime,
      message,
      details: {
        queuedCount: queuedAnalyses,
        processingCount: processingAnalyses,
        totalRecentRequests: totalRecent,
        avgProcessingTime,
        throughput: totalRecent / 15, // Requests per minute
      },
      checkedAt: Date.now(),
    }
  } catch (error) {
    return {
      service: 'analysis_queue',
      serviceType: 'queue',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      message: 'Queue system health check failed',
      details: { error: String(error) },
      checkedAt: Date.now(),
    }
  }
}

/**
 * Check external dependencies health
 */
async function checkExternalDependenciesHealth(
  ctx: any
): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = []

  // Check Clerk authentication service
  results.push(await checkClerkServiceHealth(ctx))

  // Check Gemini API availability (indirect check through recent usage)
  results.push(await checkGeminiAPIHealth(ctx))

  return results
}

/**
 * Check Clerk authentication service health
 */
async function checkClerkServiceHealth(ctx: any): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // Check recent user activity as proxy for Clerk health
    const recentUsers = await ctx.db
      .query('users')
      .filter((q: any) =>
        q.gte(q.field('createdAt'), Date.now() - 60 * 60 * 1000)
      ) // Last hour
      .collect()

    const recentUserActivity = recentUsers.length

    let status: HealthStatus = 'healthy'
    let message = 'Clerk authentication service appears healthy'

    // This is an indirect check - in a real implementation, you might make actual API calls to Clerk
    // For now, we assume healthy unless we have evidence otherwise

    return {
      service: 'clerk_auth',
      serviceType: 'external_dependency',
      status,
      responseTime: Date.now() - startTime,
      message,
      details: {
        recentUserActivity,
        checkType: 'indirect_activity_check',
      },
      checkedAt: Date.now(),
    }
  } catch (error) {
    return {
      service: 'clerk_auth',
      serviceType: 'external_dependency',
      status: 'unknown',
      responseTime: Date.now() - startTime,
      message: 'Clerk authentication service health check inconclusive',
      details: { error: String(error) },
      checkedAt: Date.now(),
    }
  }
}

/**
 * Check Gemini API health
 */
async function checkGeminiAPIHealth(ctx: any): Promise<HealthCheckResult> {
  const startTime = Date.now()

  try {
    // Check recent API usage and error rates
    const recentAnalyses = await ctx.db
      .query('aiAnalysis')
      .filter((q: any) =>
        q.gte(q.field('createdAt'), Date.now() - 30 * 60 * 1000)
      ) // Last 30 minutes
      .filter((q: any) => q.eq(q.field('modelType'), 'gemini_2_5_flash_lite'))
      .collect()

    const totalRequests = recentAnalyses.length
    const failedRequests = recentAnalyses.filter(
      (a: any) => a.status === 'failed'
    ).length
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0

    let status: HealthStatus = 'healthy'
    let message = 'Gemini API appears healthy'

    if (errorRate > 0.2) {
      // 20% error rate
      status = 'unhealthy'
      message = `Gemini API unhealthy: ${(errorRate * 100).toFixed(1)}% error rate`
    } else if (errorRate > 0.1) {
      // 10% error rate
      status = 'degraded'
      message = `Gemini API degraded: ${(errorRate * 100).toFixed(1)}% error rate`
    } else if (totalRequests === 0) {
      status = 'unknown'
      message = 'Gemini API health unknown: no recent requests'
    }

    return {
      service: 'gemini_api',
      serviceType: 'external_dependency',
      status,
      responseTime: Date.now() - startTime,
      message,
      details: {
        totalRequests,
        failedRequests,
        errorRate,
        successRate: 1 - errorRate,
      },
      checkedAt: Date.now(),
    }
  } catch (error) {
    return {
      service: 'gemini_api',
      serviceType: 'external_dependency',
      status: 'unknown',
      responseTime: Date.now() - startTime,
      message: 'Gemini API health check failed',
      details: { error: String(error) },
      checkedAt: Date.now(),
    }
  }
}

/**
 * Check circuit breakers health
 */
async function checkCircuitBreakersHealth(
  ctx: any
): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = []
  const startTime = Date.now()

  try {
    const circuitBreakers = await ctx.db.query('circuitBreakerStatus').collect()

    for (const cb of circuitBreakers) {
      let status: HealthStatus = 'healthy'
      let message = `Circuit breaker for ${cb.service} is closed (healthy)`

      if (cb.state === 'open') {
        status = 'unhealthy'
        message = `Circuit breaker for ${cb.service} is open (failing)`
      } else if (cb.state === 'half_open') {
        status = 'degraded'
        message = `Circuit breaker for ${cb.service} is half-open (recovering)`
      }

      results.push({
        service: `circuit_breaker_${cb.service}`,
        serviceType: 'circuit_breaker',
        status,
        responseTime: Date.now() - startTime,
        message,
        details: {
          service: cb.service,
          state: cb.state,
          failureCount: cb.failureCount,
          lastFailure: cb.lastFailure,
          nextRetry: cb.nextRetry,
        },
        checkedAt: Date.now(),
      })
    }

    return results
  } catch (error) {
    return [
      {
        service: 'circuit_breakers',
        serviceType: 'circuit_breaker',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: 'Circuit breaker health check failed',
        details: { error: String(error) },
        checkedAt: Date.now(),
      },
    ]
  }
}

/**
 * Calculate overall system health
 */
function calculateOverallHealth(results: HealthCheckResult[]) {
  if (results.length === 0) {
    return { status: 'unknown' as HealthStatus, score: 0 }
  }

  const weights = {
    ai_service: 30,
    database: 25,
    queue: 20,
    external_dependency: 15,
    circuit_breaker: 10,
  }

  const statusScores = {
    healthy: 100,
    degraded: 60,
    unhealthy: 20,
    unknown: 50,
  }

  let totalScore = 0
  let totalWeight = 0

  for (const result of results) {
    const weight = weights[result.serviceType] || 10
    const score = statusScores[result.status]

    totalScore += score * weight
    totalWeight += weight
  }

  const overallScore =
    totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0

  let overallStatus: HealthStatus = 'healthy'
  if (overallScore < 40) {
    overallStatus = 'unhealthy'
  } else if (overallScore < 70) {
    overallStatus = 'degraded'
  } else if (overallScore < 90) {
    overallStatus = 'degraded'
  }

  return { status: overallStatus, score: overallScore }
}

/**
 * Get latest system health status
 */
export const getSystemHealthStatus = query({
  args: {
    includeDetails: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get latest overall system health
    const latestSystemHealth = await ctx.db
      .query('systemHealth')
      .order('desc')
      .first()

    if (!latestSystemHealth) {
      return {
        status: 'unknown' as HealthStatus,
        message: 'No health check data available',
        lastChecked: null,
      }
    }

    let serviceDetails = null
    if (args.includeDetails) {
      // Get latest results for each service
      const latestResults = await ctx.db
        .query('healthCheckResults')
        .filter(q =>
          q.gte(q.field('checkedAt'), latestSystemHealth.checkedAt - 60000)
        ) // Within 1 minute of system check
        .collect()

      serviceDetails = latestResults.map(result => ({
        service: result.service,
        serviceType: result.serviceType,
        status: result.status,
        message: result.message,
        responseTime: result.responseTime,
        details: result.details,
        checkedAt: result.checkedAt,
      }))
    }

    return {
      status: latestSystemHealth.overallStatus,
      healthScore: latestSystemHealth.healthScore,
      servicesSummary: latestSystemHealth.servicesSummary,
      lastChecked: latestSystemHealth.checkedAt,
      checkDuration: latestSystemHealth.checkDuration,
      serviceDetails,
    }
  },
})

/**
 * Get health check history
 */
export const getHealthCheckHistory = query({
  args: {
    service: v.optional(v.string()),
    timeWindow: v.optional(v.string()), // '1h', '24h', '7d'
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || '24h'
    const limit = args.limit || 100

    const windowMs =
      {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      }[timeWindow] || 24 * 60 * 60 * 1000

    const startTime = Date.now() - windowMs

    let query = ctx.db
      .query('healthCheckResults')
      .filter(q => q.gte(q.field('checkedAt'), startTime))

    if (args.service) {
      query = query.filter(q => q.eq(q.field('service'), args.service))
    }

    const results = await query.order('desc').take(limit)

    // Calculate health statistics
    const total = results.length
    const healthy = results.filter(r => r.status === 'healthy').length
    const degraded = results.filter(r => r.status === 'degraded').length
    const unhealthy = results.filter(r => r.status === 'unhealthy').length
    const unknown = results.filter(r => r.status === 'unknown').length

    const avgResponseTime =
      results.length > 0
        ? results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
        : 0

    return {
      timeWindow,
      results: results.reverse(), // Return in chronological order
      statistics: {
        total,
        healthy,
        degraded,
        unhealthy,
        unknown,
        healthyPercentage: total > 0 ? (healthy / total) * 100 : 0,
        avgResponseTime,
      },
    }
  },
})

/**
 * Trigger manual health check
 */
export const triggerHealthCheck = mutation({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Authentication required to trigger health check')
    }

    // Schedule the health check to run
    await ctx.scheduler.runAfter(
      0,
      'monitoring/health_checks:performSystemHealthCheck',
      {}
    )

    return {
      success: true,
      message: 'Health check triggered successfully',
      triggeredAt: Date.now(),
      triggeredBy: identity.subject,
    }
  },
})

/**
 * Schedule automated health checks
 */
export const scheduleHealthChecks = internalMutation({
  args: {
    interval: v.number(), // Minutes between health checks
  },
  handler: async (ctx, args) => {
    const intervalMs = args.interval * 60 * 1000

    // Schedule the next health check
    await ctx.scheduler.runAfter(
      intervalMs,
      'monitoring/health_checks:performSystemHealthCheck',
      {}
    )

    // Store the scheduling configuration
    await ctx.db.insert('healthCheckSchedule', {
      intervalMinutes: args.interval,
      nextScheduledAt: Date.now() + intervalMs,
      isActive: true,
      createdAt: Date.now(),
    })

    return {
      success: true,
      nextHealthCheck: Date.now() + intervalMs,
      intervalMinutes: args.interval,
    }
  },
})

/**
 * Process health check results and trigger alerts
 */
export const processHealthCheckAlerts = internalMutation({
  args: {
    healthCheckResults: v.array(v.any()),
    overallHealth: v.object({
      status: v.string(),
      score: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const alertsTriggered: any[] = []

    // Check for service-specific alerts
    for (const result of args.healthCheckResults) {
      if (result.status === 'unhealthy' || result.status === 'degraded') {
        const alertLevel =
          result.status === 'unhealthy' ? 'critical' : 'warning'

        // Check if alert already exists
        const existingAlert = await ctx.db
          .query('monitoringAlerts')
          .filter(q => q.eq(q.field('alertType'), 'health_check'))
          .filter(q => q.eq(q.field('resolvedAt'), undefined))
          .filter(q => q.eq(q.field('conditions.service'), result.service))
          .first()

        if (!existingAlert) {
          // Create new health check alert
          const alertId = await ctx.db.insert('monitoringAlerts', {
            alertType: 'health_check',
            severity: alertLevel as 'warning' | 'critical' | 'emergency',
            message: `Health check failed for ${result.service}: ${result.message}`,
            triggeredAt: Date.now(),
            escalationLevel: 0,
            autoResolved: false,
            notificationsSent: [],
            conditions: {
              threshold:
                result.status === 'unhealthy' ? 'unhealthy' : 'degraded',
              actualValue: result.status,
              timeWindow: 'current',
              service: result.service,
            },
            metadata: {
              serviceType: result.serviceType,
              responseTime: result.responseTime,
              details: result.details,
              checkedAt: result.checkedAt,
            },
          })

          alertsTriggered.push({
            alertId,
            service: result.service,
            status: result.status,
            message: result.message,
          })
        }
      }
    }

    // Check for overall system health alert
    if (args.overallHealth.score < 70) {
      // Below 70% health score
      const alertLevel =
        args.overallHealth.score < 50
          ? 'emergency'
          : args.overallHealth.score < 60
            ? 'critical'
            : 'warning'

      const existingSystemAlert = await ctx.db
        .query('monitoringAlerts')
        .filter(q => q.eq(q.field('alertType'), 'system_health'))
        .filter(q => q.eq(q.field('resolvedAt'), undefined))
        .first()

      if (!existingSystemAlert) {
        const alertId = await ctx.db.insert('monitoringAlerts', {
          alertType: 'system_health',
          severity: alertLevel as 'warning' | 'critical' | 'emergency',
          message: `System health degraded: ${args.overallHealth.score}% health score`,
          triggeredAt: Date.now(),
          escalationLevel: 0,
          autoResolved: false,
          notificationsSent: [],
          conditions: {
            threshold: 70,
            actualValue: args.overallHealth.score,
            timeWindow: 'current',
            service: 'system',
          },
          metadata: {
            overallStatus: args.overallHealth.status,
            healthScore: args.overallHealth.score,
            servicesAffected: args.healthCheckResults.filter(
              r => r.status !== 'healthy'
            ).length,
          },
        })

        alertsTriggered.push({
          alertId,
          service: 'system',
          status: args.overallHealth.status,
          message: `System health at ${args.overallHealth.score}%`,
        })
      }
    }

    return {
      alertsTriggered: alertsTriggered.length,
      alerts: alertsTriggered,
    }
  },
})

/**
 * Auto-resolve health check alerts when services recover
 */
export const checkHealthAlertResolution = internalMutation({
  args: {
    healthCheckResults: v.array(v.any()),
    overallHealth: v.object({
      status: v.string(),
      score: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const resolvedAlerts: any[] = []

    // Check service-specific alerts for resolution
    const activeHealthAlerts = await ctx.db
      .query('monitoringAlerts')
      .filter(q => q.eq(q.field('alertType'), 'health_check'))
      .filter(q => q.eq(q.field('resolvedAt'), undefined))
      .collect()

    for (const alert of activeHealthAlerts) {
      const service = alert.conditions.service
      const currentResult = args.healthCheckResults.find(
        r => r.service === service
      )

      if (currentResult && currentResult.status === 'healthy') {
        // Auto-resolve the alert
        await ctx.db.patch(alert._id, {
          resolvedAt: Date.now(),
          autoResolved: true,
          metadata: {
            ...alert.metadata,
            resolution: `Service ${service} recovered to healthy status`,
            recoveredValue: currentResult.status,
          },
        })

        // Create recovery notification
        await ctx.db.insert('notifications', {
          type: 'health_check_recovery',
          title: 'Service Recovered',
          message: `${service} health check recovered - service is now healthy`,
          data: {
            alertId: alert._id,
            service,
            recoveredStatus: currentResult.status,
            recoveredAt: Date.now(),
          },
          createdAt: Date.now(),
          read: false,
        })

        resolvedAlerts.push({
          alertId: alert._id,
          service,
          recoveredStatus: currentResult.status,
        })
      }
    }

    // Check system health alert for resolution
    const activeSystemAlert = await ctx.db
      .query('monitoringAlerts')
      .filter(q => q.eq(q.field('alertType'), 'system_health'))
      .filter(q => q.eq(q.field('resolvedAt'), undefined))
      .first()

    if (activeSystemAlert && args.overallHealth.score >= 75) {
      // 5% buffer above threshold
      await ctx.db.patch(activeSystemAlert._id, {
        resolvedAt: Date.now(),
        autoResolved: true,
        metadata: {
          ...activeSystemAlert.metadata,
          resolution: `System health recovered to ${args.overallHealth.score}%`,
          recoveredValue: args.overallHealth.score,
        },
      })

      await ctx.db.insert('notifications', {
        type: 'system_health_recovery',
        title: 'System Health Recovered',
        message: `System health recovered to ${args.overallHealth.score}% - all services operational`,
        data: {
          alertId: activeSystemAlert._id,
          recoveredScore: args.overallHealth.score,
          recoveredStatus: args.overallHealth.status,
          recoveredAt: Date.now(),
        },
        createdAt: Date.now(),
        read: false,
      })

      resolvedAlerts.push({
        alertId: activeSystemAlert._id,
        service: 'system',
        recoveredScore: args.overallHealth.score,
      })
    }

    return {
      resolvedCount: resolvedAlerts.length,
      resolvedAlerts,
    }
  },
})

/**
 * Get health check configuration
 */
export const getHealthCheckConfig = query({
  args: {},
  handler: async ctx => {
    const schedule = await ctx.db
      .query('healthCheckSchedule')
      .filter(q => q.eq(q.field('isActive'), true))
      .order('desc')
      .first()

    const alertConfigs = await ctx.db
      .query('alertingConfig')
      .filter(q => q.eq(q.field('alertType'), 'health_check'))
      .collect()

    return {
      schedule: schedule
        ? {
            intervalMinutes: schedule.intervalMinutes,
            nextScheduledAt: schedule.nextScheduledAt,
            isActive: schedule.isActive,
          }
        : null,
      alertConfigurations: alertConfigs,
      defaultThresholds: {
        systemHealthWarning: 70,
        systemHealthCritical: 60,
        systemHealthEmergency: 50,
        serviceResponseTimeWarning: 2000, // 2 seconds
        serviceResponseTimeCritical: 5000, // 5 seconds
      },
    }
  },
})

/**
 * Update health check configuration
 */
export const updateHealthCheckConfig = mutation({
  args: {
    intervalMinutes: v.optional(v.number()),
    enableAlerts: v.optional(v.boolean()),
    alertThresholds: v.optional(
      v.object({
        systemHealthWarning: v.number(),
        systemHealthCritical: v.number(),
        systemHealthEmergency: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error(
        'Authentication required to update health check configuration'
      )
    }

    const user = await ctx.db
      .query('users')
      .filter(q => q.eq(q.field('clerkId'), identity.subject))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    const updates: any[] = []

    // Update schedule if provided
    if (args.intervalMinutes) {
      // Disable current schedule
      const currentSchedule = await ctx.db
        .query('healthCheckSchedule')
        .filter(q => q.eq(q.field('isActive'), true))
        .first()

      if (currentSchedule) {
        await ctx.db.patch(currentSchedule._id, { isActive: false })
      }

      // Create new schedule
      const nextScheduledAt = Date.now() + args.intervalMinutes * 60 * 1000
      await ctx.db.insert('healthCheckSchedule', {
        intervalMinutes: args.intervalMinutes,
        nextScheduledAt,
        isActive: true,
        createdAt: Date.now(),
      })

      // Schedule the next health check
      await ctx.scheduler.runAfter(
        args.intervalMinutes * 60 * 1000,
        'monitoring/health_checks:performSystemHealthCheck',
        {}
      )

      updates.push(
        `Health check interval updated to ${args.intervalMinutes} minutes`
      )
    }

    // Update alert configuration if provided
    if (args.alertThresholds) {
      const alertConfig = await ctx.db
        .query('alertingConfig')
        .filter(q => q.eq(q.field('alertType'), 'health_check'))
        .first()

      if (alertConfig) {
        await ctx.db.patch(alertConfig._id, {
          thresholds: {
            warning: args.alertThresholds.systemHealthWarning,
            critical: args.alertThresholds.systemHealthCritical,
            emergency: args.alertThresholds.systemHealthEmergency,
          },
          updatedAt: Date.now(),
        })
      } else {
        await ctx.db.insert('alertingConfig', {
          alertType: 'health_check',
          thresholds: {
            warning: args.alertThresholds.systemHealthWarning,
            critical: args.alertThresholds.systemHealthCritical,
            emergency: args.alertThresholds.systemHealthEmergency,
          },
          recipients: [], // Can be configured separately
          deliveryChannels: {
            email: false,
            dashboard: true,
            webhook: undefined,
          },
          enabled: args.enableAlerts !== false,
          createdBy: user._id,
          updatedAt: Date.now(),
        })
      }

      updates.push('Health check alert thresholds updated')
    }

    return {
      success: true,
      message: 'Health check configuration updated successfully',
      updates,
      updatedAt: Date.now(),
    }
  },
})
