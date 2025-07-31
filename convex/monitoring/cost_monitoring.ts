/**
 * Cost Monitoring & Budget Management System (Story AI-Migration.6)
 * Real-time cost tracking with budget alerts and optimization recommendations
 */

import { query, mutation, internalMutation } from '../_generated/server'
import { v } from 'convex/values'

// Budget alert thresholds based on story requirements
export const BUDGET_THRESHOLDS = {
  warning: 0.75, // 75% budget consumption
  critical: 0.9, // 90% budget consumption
  emergency: 1.0, // Budget exceeded
} as const

export const TIME_WINDOWS = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
} as const

/**
 * Calculate real-time cost tracking for AI API usage
 */
export const getCostMetrics = query({
  args: {
    timeWindow: v.optional(
      v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly'))
    ),
    service: v.optional(v.string()), // Filter by specific service
    includeProjections: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || 'daily'
    const windowMs = TIME_WINDOWS[timeWindow]
    const startTime = Date.now() - windowMs

    // Get AI analysis cost data
    let analysisQuery = ctx.db
      .query('aiAnalysis')
      .filter(q => q.gte(q.field('createdAt'), startTime))

    if (args.service) {
      analysisQuery = analysisQuery.filter((q: any) =>
        q.eq(q.field('modelType'), args.service)
      )
    }

    const analyses = await analysisQuery.collect()

    // Calculate cost metrics from AI analyses
    const totalAnalyses = analyses.length
    const totalCost = analyses.reduce((sum, a) => sum + (a.apiCost || 0), 0)
    const totalTokens = analyses.reduce(
      (sum, a) => sum + (a.tokensUsed || 0),
      0
    )
    const avgCostPerAnalysis = totalAnalyses > 0 ? totalCost / totalAnalyses : 0
    const avgCostPerToken = totalTokens > 0 ? totalCost / totalTokens : 0

    // Get API usage data for broader cost tracking
    let apiUsageQuery = ctx.db
      .query('apiUsage')
      .filter(q =>
        q.gte(q.field('timeWindow'), Math.floor(startTime / (60 * 60 * 1000)))
      )

    if (args.service) {
      apiUsageQuery = apiUsageQuery.filter((q: any) =>
        q.eq(q.field('service'), args.service)
      )
    }

    const apiUsage = await apiUsageQuery.collect()
    const totalApiCost = apiUsage.reduce(
      (sum, usage) => sum + (usage.cost || 0),
      0
    )

    // Cost breakdown by service
    const serviceBreakdown = new Map<
      string,
      {
        cost: number
        requests: number
        tokens: number
        avgResponseTime: number
      }
    >()

    for (const analysis of analyses) {
      const service = analysis.modelType || 'unknown'
      const current = serviceBreakdown.get(service) || {
        cost: 0,
        requests: 0,
        tokens: 0,
        avgResponseTime: 0,
      }
      current.cost += analysis.apiCost || 0
      current.requests += 1
      current.tokens += analysis.tokensUsed || 0
      current.avgResponseTime += analysis.processingTime || 0
      serviceBreakdown.set(service, current)
    }

    // Convert to array and calculate averages
    const breakdown = Array.from(serviceBreakdown.entries()).map(
      ([service, data]) => ({
        service,
        cost: data.cost,
        requests: data.requests,
        tokens: data.tokens,
        avgCostPerRequest: data.requests > 0 ? data.cost / data.requests : 0,
        avgCostPerToken: data.tokens > 0 ? data.cost / data.tokens : 0,
        avgResponseTime:
          data.requests > 0 ? data.avgResponseTime / data.requests : 0,
        efficiency: {
          costPerSecond:
            data.avgResponseTime > 0
              ? data.cost / (data.avgResponseTime / 1000)
              : 0,
          requestsPerDollar: data.cost > 0 ? data.requests / data.cost : 0,
        },
      })
    )

    let projections: any = null
    if (args.includeProjections) {
      projections = await calculateCostProjections(
        ctx,
        timeWindow,
        totalCost,
        analyses
      )
    }

    return {
      timeWindow,
      startTime,
      endTime: Date.now(),
      totalCost: totalCost + totalApiCost,
      aiAnalysisCost: totalCost,
      apiUsageCost: totalApiCost,
      metrics: {
        totalAnalyses,
        totalTokens,
        avgCostPerAnalysis,
        avgCostPerToken,
        totalRequests: apiUsage.reduce((sum, u) => sum + u.requestCount, 0),
      },
      breakdown,
      projections,
    }
  },
})

/**
 * Calculate cost projections and forecasting
 */
async function calculateCostProjections(
  ctx: any,
  timeWindow: string,
  currentCost: number,
  analyses: any[]
) {
  const windowMs = TIME_WINDOWS[timeWindow as keyof typeof TIME_WINDOWS]
  const elapsedTime = Date.now() - (Date.now() - windowMs)
  const remainingTime = windowMs - elapsedTime

  // Calculate burn rate (cost per millisecond)
  const burnRate = elapsedTime > 0 ? currentCost / elapsedTime : 0

  // Project cost for remaining time
  const projectedAdditionalCost = burnRate * remainingTime
  const projectedTotalCost = currentCost + projectedAdditionalCost

  // Calculate trend by comparing with previous period
  const prevStartTime = Date.now() - 2 * windowMs
  const prevEndTime = Date.now() - windowMs

  const prevAnalyses = await ctx.db
    .query('aiAnalysis')
    .filter((q: any) => q.gte(q.field('createdAt'), prevStartTime))
    .filter((q: any) => q.lt(q.field('createdAt'), prevEndTime))
    .collect()

  const prevCost = prevAnalyses.reduce((sum: number, a: any) => sum + (a.apiCost || 0), 0)
  const costTrend =
    prevCost > 0 ? ((currentCost - prevCost) / prevCost) * 100 : 0

  // Identify cost spikes
  const recentAnalyses = analyses.slice(-10) // Last 10 analyses
  const avgRecentCost =
    recentAnalyses.length > 0
      ? recentAnalyses.reduce((sum, a) => sum + (a.apiCost || 0), 0) /
        recentAnalyses.length
      : 0

  const overallAvgCost =
    analyses.length > 0
      ? analyses.reduce((sum, a) => sum + (a.apiCost || 0), 0) / analyses.length
      : 0

  const hasCostSpike = avgRecentCost > overallAvgCost * 1.5 // 50% spike threshold

  return {
    projectedTotalCost,
    projectedAdditionalCost,
    burnRate: burnRate * 1000 * 60 * 60, // Convert to cost per hour
    dailyBurnRate: burnRate * 1000 * 60 * 60 * 24, // Cost per day
    trend: {
      direction:
        costTrend > 5 ? 'increasing' : costTrend < -5 ? 'decreasing' : 'stable',
      percentageChange: costTrend,
      comparedToPrevious: prevCost,
    },
    anomalies: {
      hasCostSpike,
      recentAvgCost: avgRecentCost,
      overallAvgCost,
      spikeMultiplier: overallAvgCost > 0 ? avgRecentCost / overallAvgCost : 1,
    },
  }
}

/**
 * Get budget tracking and utilization
 */
export const getBudgetStatus = query({
  args: {
    timeWindow: v.optional(v.string()),
    service: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || 'monthly'

    // Get budget configuration
    let budgetQuery = ctx.db
      .query('budgetTracking')
      .filter(q => q.eq(q.field('timeWindow'), timeWindow))

    if (args.service) {
      budgetQuery = budgetQuery.filter((q: any) =>
        q.eq(q.field('service'), args.service)
      )
    } else {
      budgetQuery = budgetQuery.filter((q: any) =>
        q.eq(q.field('service'), 'all')
      )
    }

    const budgetRecord = await budgetQuery.first()

    if (!budgetRecord) {
      return {
        error: 'No budget configuration found',
        timeWindow,
        service: args.service || 'all',
      }
    }

    // Calculate current utilization
    const utilizationPercent =
      budgetRecord.budgetLimit > 0
        ? budgetRecord.currentSpend / budgetRecord.budgetLimit
        : 0

    // Determine alert level
    let alertLevel: 'normal' | 'warning' | 'critical' | 'emergency' = 'normal'
    if (utilizationPercent >= BUDGET_THRESHOLDS.emergency) {
      alertLevel = 'emergency'
    } else if (utilizationPercent >= BUDGET_THRESHOLDS.critical) {
      alertLevel = 'critical'
    } else if (utilizationPercent >= BUDGET_THRESHOLDS.warning) {
      alertLevel = 'warning'
    }

    // Calculate remaining budget and time
    const remainingBudget = Math.max(
      0,
      budgetRecord.budgetLimit - budgetRecord.currentSpend
    )
    const remainingTime = Math.max(0, budgetRecord.windowEnd - Date.now())
    const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000))

    // Calculate if on track to exceed budget
    const projectedSpend = budgetRecord.projectedSpend
    const willExceedBudget = projectedSpend > budgetRecord.budgetLimit

    return {
      timeWindow,
      service: args.service || 'all',
      budgetLimit: budgetRecord.budgetLimit,
      currentSpend: budgetRecord.currentSpend,
      remainingBudget,
      utilization: {
        percent: utilizationPercent,
        alertLevel,
        threshold: budgetRecord.alertThreshold,
      },
      projections: {
        projectedSpend,
        willExceedBudget,
        projectedOverage: Math.max(
          0,
          projectedSpend - budgetRecord.budgetLimit
        ),
        burnRate: budgetRecord.burnRate,
      },
      timeRemaining: {
        days: remainingDays,
        milliseconds: remainingTime,
        windowStart: budgetRecord.windowStart,
        windowEnd: budgetRecord.windowEnd,
      },
      costBreakdown: budgetRecord.costBreakdown,
      lastUpdated: budgetRecord.lastUpdated,
    }
  },
})

/**
 * Update budget tracking with current costs
 */
export const updateBudgetTracking = internalMutation({
  args: {
    timeWindow: v.string(),
    service: v.optional(v.string()),
    additionalCost: v.number(),
    costCategory: v.optional(v.string()), // 'aiAnalysis', 'storage', 'bandwidth', 'other'
  },
  handler: async (ctx, args) => {
    const service = args.service || 'all'

    // Find current budget period
    const now = Date.now()
    let budgetRecord = await ctx.db
      .query('budgetTracking')
      .filter(q => q.eq(q.field('timeWindow'), args.timeWindow))
      .filter(q => q.eq(q.field('service'), service))
      .filter(q => q.lte(q.field('windowStart'), now))
      .filter(q => q.gte(q.field('windowEnd'), now))
      .first()

    if (!budgetRecord) {
      // Create new budget period if none exists
      const { windowStart, windowEnd } = calculateTimeWindow(
        args.timeWindow,
        now
      )

      const budgetRecordId = await ctx.db.insert('budgetTracking', {
        timeWindow: args.timeWindow,
        budgetLimit: getDefaultBudgetLimit(args.timeWindow),
        currentSpend: 0,
        projectedSpend: 0,
        alertThreshold: 0.8, // 80% default threshold
        windowStart,
        windowEnd,
        lastUpdated: now,
        service,
        budgetUtilization: 0,
        burnRate: 0,
        costBreakdown: {
          aiAnalysis: 0,
          storage: 0,
          bandwidth: 0,
          other: 0,
        },
      })
      budgetRecord = await ctx.db.get(budgetRecordId)!
    }

    // Update costs
    if (!budgetRecord) {
      throw new Error('Budget record not found after creation')
    }

    const newCurrentSpend = budgetRecord.currentSpend + args.additionalCost
    const newUtilization =
      budgetRecord.budgetLimit > 0
        ? newCurrentSpend / budgetRecord.budgetLimit
        : 0

    // Update cost breakdown
    const costBreakdown = {
      aiAnalysis: budgetRecord.costBreakdown?.aiAnalysis || 0,
      storage: budgetRecord.costBreakdown?.storage || 0,
      bandwidth: budgetRecord.costBreakdown?.bandwidth || 0,
      other: budgetRecord.costBreakdown?.other || 0,
    }
    const category = args.costCategory || 'other'
    if (category in costBreakdown) {
      costBreakdown[category as keyof typeof costBreakdown] +=
        args.additionalCost
    }

    // Calculate new burn rate
    const elapsedTime = now - budgetRecord.windowStart
    const newBurnRate = elapsedTime > 0 ? newCurrentSpend / elapsedTime : 0

    // Calculate projected spending
    const remainingTime = budgetRecord.windowEnd - now
    const projectedAdditionalSpend =
      remainingTime > 0 ? newBurnRate * remainingTime : 0
    const newProjectedSpend = newCurrentSpend + projectedAdditionalSpend

    await ctx.db.patch(budgetRecord._id, {
      currentSpend: newCurrentSpend,
      projectedSpend: newProjectedSpend,
      budgetUtilization: newUtilization,
      burnRate: newBurnRate * 1000 * 60 * 60 * 24, // Convert to cost per day
      costBreakdown,
      lastUpdated: now,
    })

    return {
      success: true,
      newCurrentSpend,
      newUtilization,
      newProjectedSpend,
      alertLevel:
        newUtilization >= BUDGET_THRESHOLDS.emergency
          ? 'emergency'
          : newUtilization >= BUDGET_THRESHOLDS.critical
            ? 'critical'
            : newUtilization >= BUDGET_THRESHOLDS.warning
              ? 'warning'
              : 'normal',
    }
  },
})

/**
 * Check budget thresholds and trigger alerts
 */
export const checkBudgetAlerts = internalMutation({
  args: {
    timeWindow: v.string(),
    service: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const service = args.service || 'all'

    const budgetRecord = await ctx.db
      .query('budgetTracking')
      .filter(q => q.eq(q.field('timeWindow'), args.timeWindow))
      .filter(q => q.eq(q.field('service'), service))
      .filter(q => q.lte(q.field('windowStart'), Date.now()))
      .filter(q => q.gte(q.field('windowEnd'), Date.now()))
      .first()

    if (!budgetRecord) {
      return { alertTriggered: false, reason: 'No budget record found' }
    }

    const utilization = budgetRecord.budgetUtilization

    // Determine alert level
    let alertLevel: 'normal' | 'warning' | 'critical' | 'emergency' = 'normal'
    if (utilization >= BUDGET_THRESHOLDS.emergency) {
      alertLevel = 'emergency'
    } else if (utilization >= BUDGET_THRESHOLDS.critical) {
      alertLevel = 'critical'
    } else if (utilization >= BUDGET_THRESHOLDS.warning) {
      alertLevel = 'warning'
    }

    if (alertLevel === 'normal') {
      return { alertTriggered: false, utilization, alertLevel }
    }

    // Check if alert already exists
    const existingAlert = await ctx.db
      .query('monitoringAlerts')
      .filter(q => q.eq(q.field('alertType'), 'cost_budget'))
      .filter(q => q.eq(q.field('resolvedAt'), undefined))
      .filter(q => q.eq(q.field('conditions.timeWindow'), args.timeWindow))
      .first()

    if (existingAlert) {
      // Update existing alert
      await ctx.db.patch(existingAlert._id, {
        conditions: {
          ...existingAlert.conditions,
          actualValue: utilization,
        },
        triggeredAt: Date.now(),
        metadata: {
          ...existingAlert.metadata,
          currentSpend: budgetRecord.currentSpend,
          budgetLimit: budgetRecord.budgetLimit,
          projectedSpend: budgetRecord.projectedSpend,
        },
      })
      return {
        alertTriggered: false,
        utilization,
        alertLevel,
        alertId: existingAlert._id,
      }
    }

    // Create new alert
    const threshold =
      BUDGET_THRESHOLDS[alertLevel as keyof typeof BUDGET_THRESHOLDS]
    const alertId = await ctx.db.insert('monitoringAlerts', {
      alertType: 'cost_budget',
      severity: alertLevel as 'warning' | 'critical' | 'emergency',
      message: `Budget utilization (${(utilization * 100).toFixed(1)}%) exceeds ${(threshold * 100).toFixed(1)}% threshold for ${args.timeWindow} budget`,
      triggeredAt: Date.now(),
      escalationLevel: 0,
      autoResolved: false,
      notificationsSent: [],
      conditions: {
        threshold,
        actualValue: utilization,
        timeWindow: args.timeWindow,
        service,
      },
      metadata: {
        currentSpend: budgetRecord.currentSpend,
        budgetLimit: budgetRecord.budgetLimit,
        projectedSpend: budgetRecord.projectedSpend,
        burnRate: budgetRecord.burnRate,
        costBreakdown: budgetRecord.costBreakdown,
      },
    })

    return {
      alertTriggered: true,
      utilization,
      alertLevel,
      alertId,
      message: `Budget alert: ${alertLevel} threshold breached`,
    }
  },
})

/**
 * Get cost optimization recommendations
 */
export const getCostOptimizationRecommendations = query({
  args: {
    timeWindow: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || 'weekly'
    const windowMs = TIME_WINDOWS[timeWindow as keyof typeof TIME_WINDOWS]
    const startTime = Date.now() - windowMs

    // Analyze AI analysis costs
    const analyses = await ctx.db
      .query('aiAnalysis')
      .filter(q => q.gte(q.field('createdAt'), startTime))
      .collect()

    const recommendations: any[] = []

    // Analyze service efficiency
    const serviceStats = new Map<
      string,
      {
        totalCost: number
        totalRequests: number
        avgProcessingTime: number
        failureRate: number
        fallbackUsage: number
      }
    >()

    for (const analysis of analyses) {
      const service = analysis.modelType || 'unknown'
      const stats = serviceStats.get(service) || {
        totalCost: 0,
        totalRequests: 0,
        avgProcessingTime: 0,
        failureRate: 0,
        fallbackUsage: 0,
      }

      stats.totalCost += analysis.apiCost || 0
      stats.totalRequests += 1
      stats.avgProcessingTime += analysis.processingTime || 0

      if (analysis.status === 'failed') {
        stats.failureRate += 1
      }

      if (analysis.fallbackUsed) {
        stats.fallbackUsage += 1
      }

      serviceStats.set(service, stats)
    }

    // Generate recommendations based on analysis
    for (const [service, stats] of serviceStats.entries()) {
      const avgCostPerRequest =
        stats.totalRequests > 0 ? stats.totalCost / stats.totalRequests : 0
      const failureRate =
        stats.totalRequests > 0 ? stats.failureRate / stats.totalRequests : 0
      const fallbackRate =
        stats.totalRequests > 0 ? stats.fallbackUsage / stats.totalRequests : 0
      const avgProcessingTime =
        stats.totalRequests > 0
          ? stats.avgProcessingTime / stats.totalRequests
          : 0

      // High cost per request recommendation
      if (avgCostPerRequest > 0.01) {
        // $0.01 threshold
        recommendations.push({
          type: 'cost_reduction',
          priority: 'high',
          service,
          title: `High cost per request for ${service}`,
          description: `Average cost per request (${avgCostPerRequest.toFixed(4)}) is above recommended threshold`,
          suggestion:
            'Consider optimizing prompts, using more efficient models, or implementing request batching',
          potentialSavings: stats.totalCost * 0.3, // Estimated 30% savings
          impact: 'high',
        })
      }

      // High failure rate recommendation
      if (failureRate > 0.1) {
        // 10% failure rate threshold
        recommendations.push({
          type: 'reliability_improvement',
          priority: 'medium',
          service,
          title: `High failure rate for ${service}`,
          description: `Failure rate (${(failureRate * 100).toFixed(1)}%) increases retry costs`,
          suggestion:
            'Improve error handling, implement better circuit breaker logic, or review API quotas',
          potentialSavings: stats.totalCost * failureRate * 0.5, // Cost of retries
          impact: 'medium',
        })
      }

      // High fallback usage recommendation
      if (fallbackRate > 0.2) {
        // 20% fallback usage threshold
        recommendations.push({
          type: 'service_optimization',
          priority: 'medium',
          service,
          title: `High fallback usage for ${service}`,
          description: `Fallback rate (${(fallbackRate * 100).toFixed(1)}%) indicates service reliability issues`,
          suggestion:
            'Improve primary service reliability, adjust timeout settings, or optimize fallback strategy',
          potentialSavings: 0, // Fallback is usually cheaper but lower quality
          impact: 'quality',
        })
      }

      // Slow processing time recommendation
      if (avgProcessingTime > 30000) {
        // 30 second threshold
        recommendations.push({
          type: 'performance_optimization',
          priority: 'low',
          service,
          title: `Slow processing time for ${service}`,
          description: `Average processing time (${(avgProcessingTime / 1000).toFixed(1)}s) may impact user experience`,
          suggestion:
            'Consider using faster models, optimizing prompts, or implementing caching',
          potentialSavings: 0,
          impact: 'performance',
        })
      }
    }

    // General budget optimization recommendations
    const totalCost = analyses.reduce((sum, a) => sum + (a.apiCost || 0), 0)

    if (totalCost > 100) {
      // $100 threshold for general recommendations
      recommendations.push({
        type: 'budget_management',
        priority: 'high',
        service: 'all',
        title: 'Consider implementing cost controls',
        description: `Total AI costs (${totalCost.toFixed(2)}) are significant for the ${timeWindow} period`,
        suggestion:
          'Implement request rate limiting, usage quotas per user, or tiered service levels',
        potentialSavings: totalCost * 0.15, // Estimated 15% savings
        impact: 'budget',
      })
    }

    // Sort recommendations by priority and potential savings
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff =
        priorityOrder[b.priority as keyof typeof priorityOrder] -
        priorityOrder[a.priority as keyof typeof priorityOrder]

      if (priorityDiff !== 0) return priorityDiff

      return (b.potentialSavings || 0) - (a.potentialSavings || 0)
    })

    const totalPotentialSavings = recommendations.reduce(
      (sum, r) => sum + (r.potentialSavings || 0),
      0
    )

    return {
      timeWindow,
      totalCost,
      totalAnalyses: analyses.length,
      recommendations,
      summary: {
        totalRecommendations: recommendations.length,
        highPriorityCount: recommendations.filter(r => r.priority === 'high')
          .length,
        totalPotentialSavings,
        estimatedSavingsPercent:
          totalCost > 0 ? (totalPotentialSavings / totalCost) * 100 : 0,
      },
    }
  },
})

/**
 * Helper functions
 */
function calculateTimeWindow(timeWindow: string, now: number) {
  let windowStart: number
  let windowEnd: number

  if (timeWindow === 'daily') {
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    windowStart = today.getTime()
    windowEnd = windowStart + 24 * 60 * 60 * 1000
  } else if (timeWindow === 'weekly') {
    const thisWeek = new Date(now)
    const dayOfWeek = thisWeek.getDay()
    thisWeek.setDate(thisWeek.getDate() - dayOfWeek)
    thisWeek.setHours(0, 0, 0, 0)
    windowStart = thisWeek.getTime()
    windowEnd = windowStart + 7 * 24 * 60 * 60 * 1000
  } else {
    // monthly
    const thisMonth = new Date(now)
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)
    windowStart = thisMonth.getTime()
    const nextMonth = new Date(thisMonth)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    windowEnd = nextMonth.getTime()
  }

  return { windowStart, windowEnd }
}

function getDefaultBudgetLimit(timeWindow: string): number {
  switch (timeWindow) {
    case 'daily':
      return 100.0 // $100 daily
    case 'weekly':
      return 500.0 // $500 weekly
    case 'monthly':
      return 2000.0 // $2000 monthly
    default:
      return 500.0
  }
}
