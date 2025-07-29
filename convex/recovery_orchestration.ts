/**
 * Recovery Orchestration and Management System (Story AI-Migration.4)
 * Coordinates recovery workflows, manages dependencies, and provides centralized recovery control
 */

import { query, mutation, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import {
  triggerServiceHealthCheck,
  initiateRecoveryWorkflow,
  executeRecoveryStep,
  markServiceRecovered,
} from './service_recovery'
import { getCircuitBreakerHealthStatus } from './utils/circuit_breaker'
import { logStructuredError } from './utils/error_logger'

/**
 * Recovery orchestration configuration
 */
export interface RecoveryOrchestrationConfig {
  enabled: boolean
  maxConcurrentRecoveries: number
  serviceDelay: number // Delay between service recoveries in ms
  dependencyAware: boolean
  autoRecovery: boolean
  notificationThreshold: 'all' | 'critical' | 'none'
  recoveryTimeout: number // Max time for recovery workflow in ms
}

export const DEFAULT_ORCHESTRATION_CONFIG: RecoveryOrchestrationConfig = {
  enabled: true,
  maxConcurrentRecoveries: 2,
  serviceDelay: 30000, // 30 seconds between service recoveries
  dependencyAware: true,
  autoRecovery: true,
  notificationThreshold: 'critical',
  recoveryTimeout: 600000, // 10 minutes max per recovery
}

/**
 * Service dependency graph for orchestrated recovery
 */
export interface ServiceDependency {
  service: string
  dependsOn: string[]
  criticality: 'low' | 'medium' | 'high' | 'critical'
  recoveryPriority: number // Lower number = higher priority
  canRecoverIndependently: boolean
}

export const SERVICE_DEPENDENCIES: ServiceDependency[] = [
  {
    service: 'gemini_2_5_flash_lite',
    dependsOn: [],
    criticality: 'critical',
    recoveryPriority: 1,
    canRecoverIndependently: true,
  },
  {
    service: 'fallback_analysis',
    dependsOn: [],
    criticality: 'high',
    recoveryPriority: 2,
    canRecoverIndependently: true,
  },
]

/**
 * Get recovery orchestration status
 */
export const getRecoveryOrchestrationStatus = query({
  args: {},
  handler: async ctx => {
    const now = Date.now()

    // Get active recovery workflows
    const activeWorkflows = await ctx.db
      .query('recoveryWorkflows')
      .filter(q => q.neq(q.field('phase'), 'monitoring'))
      .collect()

    // Get orchestration state
    const orchestrationState = await ctx.db
      .query('recoveryOrchestrationState')
      .order('desc')
      .first()

    // Get recent recovery history
    const recentRecoveries = await ctx.db
      .query('recoveryWorkflows')
      .filter(q => q.gte(q.field('startedAt'), now - 24 * 60 * 60 * 1000)) // Last 24 hours
      .order('desc')
      .take(20)

    // Calculate orchestration metrics
    const metrics = {
      activeRecoveries: activeWorkflows.length,
      totalRecentRecoveries: recentRecoveries.length,
      successfulRecoveries: recentRecoveries.filter(
        w => w.phase === 'monitoring'
      ).length,
      failedRecoveries: recentRecoveries.filter(w => w.phase === 'failed')
        .length,
      averageRecoveryTime: calculateAverageRecoveryTime(
        recentRecoveries.filter(w => w.phase === 'monitoring')
      ),
      currentThroughput:
        activeWorkflows.length /
        DEFAULT_ORCHESTRATION_CONFIG.maxConcurrentRecoveries,
    }

    return {
      config: DEFAULT_ORCHESTRATION_CONFIG,
      state: orchestrationState,
      activeWorkflows,
      recentRecoveries,
      metrics,
      serviceDependencies: SERVICE_DEPENDENCIES,
      recommendations: generateOrchestrationRecommendations(
        metrics,
        activeWorkflows
      ),
    }
  },
})

/**
 * Start orchestrated system recovery
 */
export const startOrchestredSystemRecovery = mutation({
  args: {
    services: v.optional(v.array(v.string())),
    force: v.optional(v.boolean()),
    config: v.optional(
      v.object({
        maxConcurrentRecoveries: v.optional(v.number()),
        serviceDelay: v.optional(v.number()),
        autoRecovery: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if orchestration is enabled
    const currentConfig = { ...DEFAULT_ORCHESTRATION_CONFIG, ...args.config }
    if (!currentConfig.enabled && !args.force) {
      throw new Error('Recovery orchestration is disabled')
    }

    // Determine services to recover
    const servicesToRecover =
      args.services || SERVICE_DEPENDENCIES.map(d => d.service)

    // Check current system health
    const systemHealth = await assessSystemHealth(ctx, servicesToRecover)

    if (systemHealth.overallHealth > 80 && !args.force) {
      return {
        orchestrationId: null,
        message: 'System health is good, recovery not needed',
        systemHealth,
      }
    }

    // Create orchestration session
    const orchestrationId = await ctx.db.insert('recoveryOrchestrationState', {
      sessionId: `recovery_${now}_${Math.random().toString(36).substring(2, 8)}`,
      status: 'planning',
      startedAt: now,
      lastUpdate: now,
      config: currentConfig,
      plannedServices: servicesToRecover,
      completedServices: [],
      failedServices: [],
      currentPhase: 'assessment',
      estimatedCompletion:
        calculateEstimatedOrchestrationTime(servicesToRecover),
      progress: 0,
    })

    // Create recovery plan
    const recoveryPlan = await createRecoveryPlan(
      ctx,
      servicesToRecover,
      systemHealth
    )

    // Update orchestration with plan
    await ctx.db.patch(orchestrationId, {
      status: 'executing',
      currentPhase: 'dependency_analysis',
      recoveryPlan,
      lastUpdate: now,
    })

    // Start execution
    await ctx.scheduler.runAfter(0, internal.recovery_orchestration.executeOrchestrationPlan, {
      orchestrationId,
      recoveryPlan
    })

    return {
      orchestrationId,
      recoveryPlan,
      estimatedCompletion:
        calculateEstimatedOrchestrationTime(servicesToRecover),
      systemHealth,
    }
  },
})

/**
 * Execute orchestration plan step by step
 */
export const executeOrchestrationPlan = internalMutation({
  args: {
    orchestrationId: v.id('recoveryOrchestrationState'),
    recoveryPlan: v.any(),
  },
  handler: async (ctx, args) => {
    const orchestration = await ctx.db.get(args.orchestrationId)
    if (!orchestration) {
      throw new Error('Orchestration session not found')
    }

    const now = Date.now()

    try {
      // Execute recovery plan phases
      for (const phase of args.recoveryPlan.phases) {
        await ctx.db.patch(args.orchestrationId, {
          currentPhase: phase.name,
          lastUpdate: now,
        })

        await executeOrchestrationPhase(ctx, args.orchestrationId, phase)
      }

      // Mark orchestration as completed
      await ctx.db.patch(args.orchestrationId, {
        status: 'completed',
        currentPhase: 'completed',
        progress: 100,
        lastUpdate: now,
        completedAt: now,
      })
    } catch (error) {
      // Mark orchestration as failed
      await ctx.db.patch(args.orchestrationId, {
        status: 'failed',
        currentPhase: 'error',
        lastUpdate: now,
        error: error instanceof Error ? error.message : String(error),
      })

      throw error
    }
  },
})

/**
 * Get recovery plan for services
 */
export const createRecoveryPlan = async (
  ctx: any,
  services: string[],
  systemHealth: any
): Promise<{
  phases: RecoveryPhase[]
  estimatedDuration: number
  riskAssessment: string
  dependencies: ServiceDependency[]
}> => {
  // Sort services by recovery priority and dependencies
  const sortedServices = sortServicesByRecoveryOrder(services)

  // Create phases
  const phases: RecoveryPhase[] = [
    {
      name: 'pre_recovery_validation',
      description: 'Validate system state before recovery',
      services: [],
      estimatedDuration: 30000,
      parallel: false,
      critical: true,
    },
    {
      name: 'critical_service_recovery',
      description: 'Recover critical services first',
      services: sortedServices.filter(s => getCriticality(s) === 'critical'),
      estimatedDuration: 180000,
      parallel: false,
      critical: true,
    },
    {
      name: 'high_priority_recovery',
      description: 'Recover high priority services',
      services: sortedServices.filter(s => getCriticality(s) === 'high'),
      estimatedDuration: 120000,
      parallel: true,
      critical: false,
    },
    {
      name: 'remaining_services_recovery',
      description: 'Recover remaining services',
      services: sortedServices.filter(s =>
        ['medium', 'low'].includes(getCriticality(s))
      ),
      estimatedDuration: 90000,
      parallel: true,
      critical: false,
    },
    {
      name: 'post_recovery_validation',
      description: 'Validate full system recovery',
      services: [],
      estimatedDuration: 60000,
      parallel: false,
      critical: true,
    },
  ].filter(phase => phase.services.length > 0 || phase.critical)

  const totalDuration = phases.reduce(
    (sum, phase) => sum + phase.estimatedDuration,
    0
  )

  // Assess risk
  const highRiskServices = services.filter(
    s => getCriticality(s) === 'critical'
  ).length
  const riskLevel =
    highRiskServices > 1 ? 'high' : highRiskServices === 1 ? 'medium' : 'low'

  return {
    phases,
    estimatedDuration: totalDuration,
    riskAssessment: riskLevel,
    dependencies: SERVICE_DEPENDENCIES.filter(d =>
      services.includes(d.service)
    ),
  }
}

/**
 * Execute a single orchestration phase
 */
async function executeOrchestrationPhase(
  ctx: any,
  orchestrationId: string,
  phase: RecoveryPhase
) {
  const now = Date.now()

  await logStructuredError(
    ctx,
    `Starting orchestration phase: ${phase.name}`,
    {
      service: 'orchestration',
      operation: 'phase_execution',
      timestamp: now,
    },
    {
      orchestrationId,
      phase: phase.name,
    } as any
  )

  switch (phase.name) {
    case 'pre_recovery_validation':
      await validatePreRecoveryState(ctx, orchestrationId)
      break

    case 'critical_service_recovery':
    case 'high_priority_recovery':
    case 'remaining_services_recovery':
      if (phase.parallel) {
        await executeParallelServiceRecovery(
          ctx,
          orchestrationId,
          phase.services
        )
      } else {
        await executeSequentialServiceRecovery(
          ctx,
          orchestrationId,
          phase.services
        )
      }
      break

    case 'post_recovery_validation':
      await validatePostRecoveryState(ctx, orchestrationId)
      break

    default:
      throw new Error(`Unknown orchestration phase: ${phase.name}`)
  }
}

/**
 * Execute service recoveries in parallel
 */
async function executeParallelServiceRecovery(
  ctx: any,
  orchestrationId: string,
  services: string[]
) {
  const recoveryPromises = services.map(async service => {
    try {
      const workflowResult = await ctx.runMutation(internal.service_recovery.initiateRecoveryWorkflow, {
        service,
        autoRecovery: true,
      })

      if (workflowResult.created) {
        // Monitor workflow progress
        await monitorRecoveryWorkflow(
          ctx,
          orchestrationId,
          service,
          workflowResult.workflowId
        )
      }

      return { service, success: true, workflowId: workflowResult.workflowId }
    } catch (error) {
      await recordServiceRecoveryFailure(ctx, orchestrationId, service, error)
      return {
        service,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  const results = await Promise.allSettled(recoveryPromises)
  await updateOrchestrationProgress(ctx, orchestrationId, results)
}

/**
 * Execute service recoveries sequentially
 */
async function executeSequentialServiceRecovery(
  ctx: any,
  orchestrationId: string,
  services: string[]
) {
  for (const service of services) {
    try {
      const workflowResult = await ctx.runMutation(internal.service_recovery.initiateRecoveryWorkflow, {
        service,
        autoRecovery: true,
      })

      if (workflowResult.created) {
        await monitorRecoveryWorkflow(
          ctx,
          orchestrationId,
          service,
          workflowResult.workflowId
        )
      }

      // Wait for service delay before next service
      if (services.indexOf(service) < services.length - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, DEFAULT_ORCHESTRATION_CONFIG.serviceDelay)
        )
      }
    } catch (error) {
      await recordServiceRecoveryFailure(ctx, orchestrationId, service, error)

      // For sequential recovery, decide whether to continue or stop
      const criticality = getCriticality(service)
      if (criticality === 'critical') {
        throw new Error(
          `Critical service ${service} recovery failed, stopping orchestration`
        )
      }
    }
  }
}

/**
 * Monitor individual recovery workflow progress
 */
async function monitorRecoveryWorkflow(
  ctx: any,
  orchestrationId: string,
  service: string,
  workflowId: string
) {
  const maxWaitTime = DEFAULT_ORCHESTRATION_CONFIG.recoveryTimeout
  const checkInterval = 10000 // Check every 10 seconds
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitTime) {
    const workflow = await ctx.db.get(workflowId)
    if (!workflow) break

    if (workflow.phase === 'monitoring') {
      // Recovery completed successfully
      await recordServiceRecoverySuccess(
        ctx,
        orchestrationId,
        service,
        workflowId
      )
      return
    }

    if (workflow.phase === 'failed') {
      throw new Error(`Recovery workflow failed for service ${service}`)
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  throw new Error(`Recovery workflow timeout for service ${service}`)
}

/**
 * Validate pre-recovery system state
 */
async function validatePreRecoveryState(ctx: any, orchestrationId: string) {
  const orchestration = await ctx.db.get(orchestrationId)
  if (!orchestration) throw new Error('Orchestration not found')

  // Check if any services are already recovering
  const activeRecoveries = await ctx.db
    .query('recoveryWorkflows')
    .filter((q: any) =>
      q.and(
        q.neq(q.field('phase'), 'monitoring'),
        q.neq(q.field('phase'), 'failed')
      )
    )
    .collect()

  if (
    activeRecoveries.length >=
    DEFAULT_ORCHESTRATION_CONFIG.maxConcurrentRecoveries
  ) {
    throw new Error('Maximum concurrent recoveries exceeded')
  }

  // Validate that services actually need recovery
  for (const service of orchestration.plannedServices) {
    const health = await getCircuitBreakerHealthStatus(ctx, service)
    if (health.isHealthy) {
      // Remove from planned services if already healthy
      const updatedPlanned = orchestration.plannedServices.filter(
        (s: string) => s !== service
      )
      await ctx.db.patch(orchestrationId, { plannedServices: updatedPlanned })
    }
  }
}

/**
 * Validate post-recovery system state
 */
async function validatePostRecoveryState(ctx: any, orchestrationId: string) {
  const orchestration = await ctx.db.get(orchestrationId)
  if (!orchestration) throw new Error('Orchestration not found')

  // Check health of all recovered services
  const healthChecks = await Promise.all(
    orchestration.completedServices.map(async (service: string) => {
      const health = await getCircuitBreakerHealthStatus(ctx, service)
      return { service, health }
    })
  )

  const unhealthyServices = healthChecks.filter(
    check => !check.health.isHealthy
  )

  if (unhealthyServices.length > 0) {
    await logStructuredError(
      ctx,
      `Post-recovery validation failed: ${unhealthyServices.length} services still unhealthy`,
      {
        service: 'orchestration',
        operation: 'post_recovery_validation',
        timestamp: Date.now(),
      },
      {
        orchestrationId,
        unhealthyServices: unhealthyServices.map(s => s.service),
      } as any
    )

    throw new Error(
      `Post-recovery validation failed: ${unhealthyServices.map(s => s.service).join(', ')} still unhealthy`
    )
  }
}

// Helper functions

async function assessSystemHealth(ctx: any, services: string[]) {
  const healthChecks = await Promise.all(
    services.map(async service => {
      const health = await getCircuitBreakerHealthStatus(ctx, service)
      return {
        service,
        isHealthy: health.isHealthy,
        failureRate: health.metrics.failureRate,
        criticality: getCriticality(service),
      }
    })
  )

  const healthyServices = healthChecks.filter(h => h.isHealthy).length
  const overallHealth = (healthyServices / services.length) * 100

  const criticalUnhealthy = healthChecks.filter(
    h => !h.isHealthy && h.criticality === 'critical'
  ).length
  const highPriorityUnhealthy = healthChecks.filter(
    h => !h.isHealthy && h.criticality === 'high'
  ).length

  return {
    overallHealth: Math.round(overallHealth),
    healthyServices,
    totalServices: services.length,
    criticalUnhealthy,
    highPriorityUnhealthy,
    avgFailureRate:
      healthChecks.reduce((sum, h) => sum + h.failureRate, 0) /
      healthChecks.length,
    services: healthChecks,
  }
}

function sortServicesByRecoveryOrder(services: string[]): string[] {
  const serviceConfigs = services.map(
    service =>
      SERVICE_DEPENDENCIES.find(d => d.service === service) || {
        service,
        dependsOn: [],
        criticality: 'medium' as const,
        recoveryPriority: 999,
        canRecoverIndependently: true,
      }
  )

  // Sort by criticality first, then by recovery priority
  return serviceConfigs
    .sort((a, b) => {
      const criticalityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      const criticalityDiff =
        criticalityOrder[a.criticality] - criticalityOrder[b.criticality]
      if (criticalityDiff !== 0) return criticalityDiff
      return a.recoveryPriority - b.recoveryPriority
    })
    .map(config => config.service)
}

function getCriticality(
  service: string
): 'low' | 'medium' | 'high' | 'critical' {
  const dependency = SERVICE_DEPENDENCIES.find(d => d.service === service)
  return dependency?.criticality || 'medium'
}

function calculateEstimatedOrchestrationTime(services: string[]): number {
  const baseTimePerService = 120000 // 2 minutes per service
  const overheadTime = 60000 // 1 minute overhead
  return services.length * baseTimePerService + overheadTime
}

function calculateAverageRecoveryTime(recoveries: any[]): number {
  if (recoveries.length === 0) return 0

  const completedRecoveries = recoveries.filter(
    r => r.startedAt && r.lastUpdate
  )
  if (completedRecoveries.length === 0) return 0

  const totalTime = completedRecoveries.reduce(
    (sum, r) => sum + (r.lastUpdate - r.startedAt),
    0
  )
  return totalTime / completedRecoveries.length
}

async function recordServiceRecoverySuccess(
  ctx: any,
  orchestrationId: string,
  service: string,
  workflowId: string
) {
  const orchestration = await ctx.db.get(orchestrationId)
  if (!orchestration) return

  const updatedCompleted = [...orchestration.completedServices, service]
  const progress = Math.round(
    (updatedCompleted.length / orchestration.plannedServices.length) * 100
  )

  await ctx.db.patch(orchestrationId, {
    completedServices: updatedCompleted,
    progress,
    lastUpdate: Date.now(),
  })
}

async function recordServiceRecoveryFailure(
  ctx: any,
  orchestrationId: string,
  service: string,
  error: any
) {
  const orchestration = await ctx.db.get(orchestrationId)
  if (!orchestration) return

  const updatedFailed = [...orchestration.failedServices, service]

  await ctx.db.patch(orchestrationId, {
    failedServices: updatedFailed,
    lastUpdate: Date.now(),
  })

  await logStructuredError(
    ctx,
    `Service recovery failed during orchestration: ${service}`,
    {
      service,
      operation: 'orchestrated_recovery',
      timestamp: Date.now(),
    },
    {
      orchestrationId,
      error: error instanceof Error ? error.message : String(error),
    } as any
  )
}

async function updateOrchestrationProgress(
  ctx: any,
  orchestrationId: string,
  results: any[]
) {
  const orchestration = await ctx.db.get(orchestrationId)
  if (!orchestration) return

  // Process results and update orchestration state
  const totalProcessed =
    orchestration.completedServices.length +
    orchestration.failedServices.length +
    results.length
  const progress = Math.round(
    (totalProcessed / orchestration.plannedServices.length) * 100
  )

  await ctx.db.patch(orchestrationId, {
    progress,
    lastUpdate: Date.now(),
  })
}

function generateOrchestrationRecommendations(
  metrics: any,
  activeWorkflows: any[]
): string[] {
  const recommendations = []

  if (metrics.failedRecoveries > metrics.successfulRecoveries) {
    recommendations.push(
      'High failure rate in recoveries - review service health and recovery procedures'
    )
  }

  if (metrics.currentThroughput > 0.8) {
    recommendations.push(
      'Recovery capacity approaching limits - consider increasing max concurrent recoveries'
    )
  }

  if (metrics.averageRecoveryTime > 300000) {
    // 5 minutes
    recommendations.push(
      'Recovery times are high - optimize recovery workflows and dependencies'
    )
  }

  if (activeWorkflows.length === 0 && metrics.totalRecentRecoveries === 0) {
    recommendations.push('No recent recovery activity - system appears stable')
  }

  return recommendations
}

export interface RecoveryPhase {
  name: string
  description: string
  services: string[]
  estimatedDuration: number
  parallel: boolean
  critical: boolean
}
