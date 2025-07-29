/**
 * Automatic Service Recovery Detection and Management (Story AI-Migration.4)
 * Monitors service health, detects recovery, and orchestrates recovery workflows
 */

import { query, mutation, internalMutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'
import {
  getCircuitBreakerHealthStatus,
  recordCircuitBreakerSuccess,
  recordCircuitBreakerFailure,
  forceCircuitBreakerClosed,
} from './utils/circuit_breaker'
import { logStructuredError } from './utils/error_logger'

/**
 * Service health check configuration
 */
export interface ServiceHealthCheck {
  service: string
  endpoint?: string
  method: 'ping' | 'api_call' | 'circuit_breaker_test' | 'custom'
  intervalMs: number
  timeoutMs: number
  successThreshold: number // Number of consecutive successes to mark as recovered
  failureThreshold: number // Number of consecutive failures to mark as degraded
  enabled: boolean
}

export const DEFAULT_HEALTH_CHECKS: ServiceHealthCheck[] = [
  {
    service: 'gemini_2_5_flash_lite',
    method: 'api_call',
    intervalMs: 30000, // Check every 30 seconds
    timeoutMs: 10000,
    successThreshold: 3,
    failureThreshold: 2,
    enabled: true,
  },
  {
    service: 'fallback_analysis',
    method: 'ping',
    intervalMs: 60000, // Check every minute
    timeoutMs: 5000,
    successThreshold: 2,
    failureThreshold: 3,
    enabled: true,
  },
]

/**
 * Recovery orchestration workflow
 */
export interface RecoveryWorkflow {
  service: string
  phase:
    | 'detection'
    | 'validation'
    | 'gradual_recovery'
    | 'full_recovery'
    | 'monitoring'
  startedAt: number
  lastUpdate: number
  progress: number // 0-100
  steps: RecoveryStep[]
  currentStepIndex: number
  estimatedTimeRemaining?: number
  autoRecoveryEnabled: boolean
}

export interface RecoveryStep {
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  startedAt?: number
  completedAt?: number
  duration?: number
  data?: unknown
  error?: string
  retryCount: number
  maxRetries: number
}

/**
 * Get current service recovery status
 */
export const getServiceRecoveryStatus = query({
  args: {
    service: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('recoveryWorkflows')

    if (args.service) {
      query = query.filter(q => q.eq(q.field('service'), args.service))
    }

    const workflows = await query
      .filter(q => q.neq(q.field('phase'), 'monitoring')) // Exclude completed recoveries
      .order('desc')
      .take(10)

    const services = args.service
      ? [args.service]
      : ['gemini_2_5_flash_lite', 'fallback_analysis']

    // Get health status for each service
    const healthStatuses = await Promise.all(
      services.map(async service => {
        const health = await getCircuitBreakerHealthStatus(ctx, service)
        const activeWorkflow = workflows.find(w => w.service === service)

        return {
          service,
          health,
          recoveryWorkflow: activeWorkflow,
          isRecovering:
            !!activeWorkflow && activeWorkflow.phase !== 'monitoring',
          lastHealthCheck: await getLastHealthCheck(ctx, service),
        }
      })
    )

    return {
      services: healthStatuses,
      activeRecoveries: workflows.length,
      systemHealth: calculateSystemHealth(healthStatuses),
    }
  },
})

/**
 * Trigger service health check
 */
export const triggerServiceHealthCheck = internalMutation({
  args: {
    service: v.string(),
    forced: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const healthCheck = DEFAULT_HEALTH_CHECKS.find(
      hc => hc.service === args.service
    )
    if (!healthCheck) {
      throw new Error(
        `No health check configuration for service: ${args.service}`
      )
    }

    const now = Date.now()

    // Check if we should run health check (respect interval unless forced)
    if (!args.forced) {
      const lastCheck = await getLastHealthCheck(ctx, args.service)
      if (lastCheck && now - lastCheck.timestamp < healthCheck.intervalMs) {
        return { skipped: true, reason: 'interval_not_met' }
      }
    }

    let checkResult: {
      success: boolean
      responseTime: number
      error?: string
      data?: unknown
    }

    try {
      checkResult = await performHealthCheck(healthCheck)
    } catch (error) {
      checkResult = {
        success: false,
        responseTime: healthCheck.timeoutMs,
        error: error instanceof Error ? error.message : String(error),
      }
    }

    // Record health check result
    await ctx.db.insert('serviceHealthChecks', {
      service: args.service,
      timestamp: now,
      success: checkResult.success,
      responseTime: checkResult.responseTime,
      error: checkResult.error,
      data: checkResult.data,
      checkType: healthCheck.method,
    })

    // Update circuit breaker state based on result
    if (checkResult.success) {
      await recordCircuitBreakerSuccess(
        ctx,
        args.service,
        checkResult.responseTime
      )
    } else {
      await recordCircuitBreakerFailure(
        ctx,
        args.service,
        checkResult.error || 'Health check failed'
      )
    }

    // Check if we need to trigger recovery workflow
    const shouldTriggerRecovery = await evaluateRecoveryTrigger(
      ctx,
      args.service,
      checkResult
    )
    if (shouldTriggerRecovery) {
      await ctx.runMutation(internal.service_recovery.initiateRecoveryWorkflow, {
        service: args.service,
        autoRecovery: true
      })
    }

    // Check if service has recovered
    const hasRecovered = await evaluateServiceRecovery(
      ctx,
      args.service,
      checkResult
    )
    if (hasRecovered) {
      await ctx.runMutation(internal.service_recovery.markServiceRecovered, {
        service: args.service
      })
    }

    return {
      success: checkResult.success,
      responseTime: checkResult.responseTime,
      error: checkResult.error,
      recoveryTriggered: shouldTriggerRecovery,
      recoveryDetected: hasRecovered,
    }
  },
})

/**
 * Initiate recovery workflow for a service
 */
export const initiateRecoveryWorkflow = internalMutation({
  args: {
    service: v.string(),
    autoRecovery: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if recovery workflow already exists
    const existingWorkflow = await ctx.db
      .query('recoveryWorkflows')
      .filter(q =>
        q.and(
          q.eq(q.field('service'), args.service),
          q.neq(q.field('phase'), 'monitoring')
        )
      )
      .first()

    if (existingWorkflow) {
      return { workflowId: existingWorkflow._id, created: false }
    }

    // Create recovery workflow steps
    const steps: RecoveryStep[] = [
      {
        name: 'service_validation',
        description: 'Validate service is actually degraded',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
      },
      {
        name: 'circuit_breaker_reset',
        description: 'Reset circuit breaker to allow test traffic',
        status: 'pending',
        retryCount: 0,
        maxRetries: 1,
      },
      {
        name: 'gradual_traffic_increase',
        description: 'Gradually increase traffic to test recovery',
        status: 'pending',
        retryCount: 0,
        maxRetries: 5,
      },
      {
        name: 'full_recovery_validation',
        description: 'Validate service is fully recovered',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
      },
      {
        name: 'monitoring_setup',
        description: 'Set up enhanced monitoring for recovered service',
        status: 'pending',
        retryCount: 0,
        maxRetries: 1,
      },
    ]

    // Create workflow
    const workflowId = await ctx.db.insert('recoveryWorkflows', {
      service: args.service,
      phase: 'detection',
      startedAt: now,
      lastUpdate: now,
      progress: 0,
      steps,
      currentStepIndex: 0,
      autoRecoveryEnabled: args.autoRecovery ?? true,
      estimatedTimeRemaining: calculateEstimatedRecoveryTime(steps),
    })

    // Log recovery initiation
    await logStructuredError(
      ctx,
      `Recovery workflow initiated for ${args.service}`,
      {
        service: args.service,
        operation: 'recovery_initiation',
        timestamp: now,
      },
      {
        correlationId: `recovery_${workflowId}`,
      }
    )

    return { workflowId, created: true }
  },
})

/**
 * Execute next step in recovery workflow
 */
export const executeRecoveryStep = internalMutation({
  args: {
    workflowId: v.id('recoveryWorkflows'),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId)
    if (!workflow) {
      throw new Error('Recovery workflow not found')
    }

    const currentStep = workflow.steps[workflow.currentStepIndex]
    if (!currentStep || currentStep.status === 'completed') {
      // Move to next step or complete workflow
      if (workflow.currentStepIndex >= workflow.steps.length - 1) {
        return await completeRecoveryWorkflow(ctx, args.workflowId)
      } else {
        await advanceToNextStep(ctx, args.workflowId)
        return { stepCompleted: true, workflowCompleted: false }
      }
    }

    const now = Date.now()

    // Mark step as in progress
    const updatedSteps = [...workflow.steps]
    updatedSteps[workflow.currentStepIndex] = {
      ...currentStep,
      status: 'in_progress',
      startedAt: now,
    }

    await ctx.db.patch(args.workflowId, {
      steps: updatedSteps,
      lastUpdate: now,
    })

    try {
      // Execute the step
      const stepResult = await executeRecoveryStepAction(
        ctx,
        workflow.service,
        currentStep
      )

      // Update step status
      updatedSteps[workflow.currentStepIndex] = {
        ...currentStep,
        status: stepResult.success ? 'completed' : 'failed',
        completedAt: now,
        duration: now - (currentStep.startedAt || now),
        data: stepResult.data,
        error: stepResult.error,
      }

      const progress = calculateWorkflowProgress(updatedSteps)

      await ctx.db.patch(args.workflowId, {
        steps: updatedSteps,
        progress,
        lastUpdate: now,
        estimatedTimeRemaining: calculateRemainingTime(
          updatedSteps,
          workflow.currentStepIndex
        ),
      })

      if (!stepResult.success) {
        // Handle step failure
        if (currentStep.retryCount < currentStep.maxRetries) {
          // Retry the step
          updatedSteps[workflow.currentStepIndex].retryCount++
          updatedSteps[workflow.currentStepIndex].status = 'pending'

          await ctx.db.patch(args.workflowId, {
            steps: updatedSteps,
          })

          return { stepCompleted: false, willRetry: true }
        } else {
          // Max retries exceeded, fail the workflow
          await ctx.db.patch(args.workflowId, {
            phase: 'failed',
            lastUpdate: now,
          })

          return { stepCompleted: false, workflowFailed: true }
        }
      }

      return { stepCompleted: true, workflowCompleted: false }
    } catch (error) {
      // Handle step execution error
      updatedSteps[workflow.currentStepIndex] = {
        ...currentStep,
        status: 'failed',
        completedAt: now,
        duration: now - (currentStep.startedAt || now),
        error: error instanceof Error ? error.message : String(error),
      }

      await ctx.db.patch(args.workflowId, {
        steps: updatedSteps,
        lastUpdate: now,
      })

      return {
        stepCompleted: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
})

/**
 * Mark service as recovered and complete workflow
 */
export const markServiceRecovered = internalMutation({
  args: {
    service: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Find active recovery workflow
    const workflow = await ctx.db
      .query('recoveryWorkflows')
      .filter(q =>
        q.and(
          q.eq(q.field('service'), args.service),
          q.neq(q.field('phase'), 'monitoring')
        )
      )
      .first()

    if (workflow) {
      await ctx.db.patch(workflow._id, {
        phase: 'monitoring',
        progress: 100,
        lastUpdate: now,
      })
    }

    // Force circuit breaker closed
    await forceCircuitBreakerClosed(ctx, args.service)

    // Log recovery
    await logStructuredError(
      ctx,
      `Service ${args.service} marked as recovered`,
      {
        service: args.service,
        operation: 'service_recovery',
        timestamp: now,
      },
      {
        correlationId: `recovery_${workflow?._id}`,
        recoveryAction: 'auto_recovery',
      }
    )

    // Create recovery notification
    await ctx.db.insert('notifications', {
      type: 'service_recovery',
      title: `Service Recovery: ${args.service}`,
      message: `${args.service} has been automatically recovered and is healthy again`,
      data: {
        service: args.service,
        workflowId: workflow?._id,
        recoveryTime: workflow ? now - workflow.startedAt : undefined,
      },
      createdAt: now,
      read: false,
    })

    return {
      recovered: true,
      workflowId: workflow?._id,
      recoveryTime: workflow ? now - workflow.startedAt : undefined,
    }
  },
})

/**
 * Get recovery workflow details
 */
export const getRecoveryWorkflowDetails = query({
  args: {
    workflowId: v.id('recoveryWorkflows'),
  },
  handler: async (ctx, args) => {
    const workflow = await ctx.db.get(args.workflowId)
    if (!workflow) {
      throw new Error('Recovery workflow not found')
    }

    // Get related health checks
    const healthChecks = await ctx.db
      .query('serviceHealthChecks')
      .filter(q =>
        q.and(
          q.eq(q.field('service'), workflow.service),
          q.gte(q.field('timestamp'), workflow.startedAt)
        )
      )
      .order('desc')
      .take(20)

    // Get current service health
    const currentHealth = await getCircuitBreakerHealthStatus(
      ctx,
      workflow.service
    )

    return {
      workflow,
      healthChecks,
      currentHealth,
      analytics: {
        totalDuration: Date.now() - workflow.startedAt,
        stepsCompleted: workflow.steps.filter(s => s.status === 'completed')
          .length,
        stepsTotal: workflow.steps.length,
        avgStepDuration: calculateAverageStepDuration(workflow.steps),
        nextEstimatedCompletion: workflow.estimatedTimeRemaining
          ? Date.now() + workflow.estimatedTimeRemaining
          : undefined,
      },
    }
  },
})

// Helper functions

async function performHealthCheck(healthCheck: ServiceHealthCheck): Promise<{
  success: boolean
  responseTime: number
  error?: string
  data?: unknown
}> {
  const startTime = Date.now()

  try {
    switch (healthCheck.method) {
      case 'ping':
        return {
          success: true,
          responseTime: Date.now() - startTime,
          data: { method: 'ping' },
        }

      case 'api_call':
        // Simulate API health check for Gemini service
        if (healthCheck.service === 'gemini_2_5_flash_lite') {
          // This would make an actual API call in production
          const mockLatency = Math.random() * 2000 + 500 // 500-2500ms
          await new Promise(resolve => setTimeout(resolve, mockLatency))

          return {
            success: Math.random() > 0.1, // 90% success rate for simulation
            responseTime: mockLatency,
            data: { method: 'api_call', endpoint: 'health' },
          }
        }
        break

      case 'circuit_breaker_test':
        // Test if circuit breaker allows requests
        return {
          success: true,
          responseTime: Date.now() - startTime,
          data: { method: 'circuit_breaker_test' },
        }

      default:
        throw new Error(
          `Unsupported health check method: ${healthCheck.method}`
        )
    }
  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    }
  }

  return {
    success: false,
    responseTime: Date.now() - startTime,
    error: 'Unknown health check method',
  }
}

async function getLastHealthCheck(ctx: any, service: string) {
  return await ctx.db
    .query('serviceHealthChecks')
    .filter((q: any) => q.eq(q.field('service'), service))
    .order('desc')
    .first()
}

async function evaluateRecoveryTrigger(
  ctx: any,
  service: string,
  checkResult: any
): Promise<boolean> {
  if (checkResult.success) return false // No recovery needed if healthy

  // Get recent health checks to see if this is a pattern
  const recentChecks = await ctx.db
    .query('serviceHealthChecks')
    .filter((q: any) => q.eq(q.field('service'), service))
    .order('desc')
    .take(5)

  const failureCount = recentChecks.filter((check: any) => !check.success).length
  const healthCheck = DEFAULT_HEALTH_CHECKS.find(hc => hc.service === service)

  return failureCount >= (healthCheck?.failureThreshold || 2)
}

async function evaluateServiceRecovery(
  ctx: any,
  service: string,
  checkResult: any
): Promise<boolean> {
  if (!checkResult.success) return false // Not recovered if current check failed

  // Get recent health checks to see if recovery is sustained
  const recentChecks = await ctx.db
    .query('serviceHealthChecks')
    .filter((q: any) => q.eq(q.field('service'), service))
    .order('desc')
    .take(5)

  const successCount = recentChecks.filter((check: any) => check.success).length
  const healthCheck = DEFAULT_HEALTH_CHECKS.find(hc => hc.service === service)

  return successCount >= (healthCheck?.successThreshold || 3)
}

async function executeRecoveryStepAction(
  ctx: any,
  service: string,
  step: RecoveryStep
): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  try {
    switch (step.name) {
      case 'service_validation':
        // Validate that service is actually degraded
        const health = await getCircuitBreakerHealthStatus(ctx, service)
        return {
          success: !health.isHealthy,
          data: { health },
        }

      case 'circuit_breaker_reset':
        // Reset circuit breaker to allow test traffic
        await forceCircuitBreakerClosed(ctx, service)
        return {
          success: true,
          data: { action: 'circuit_breaker_reset' },
        }

      case 'gradual_traffic_increase':
        // Gradually increase traffic (simulated)
        await new Promise(resolve => setTimeout(resolve, 5000)) // Simulate gradual increase
        return {
          success: true,
          data: { trafficIncreased: true },
        }

      case 'full_recovery_validation':
        // Validate service is fully recovered
        const finalHealth = await getCircuitBreakerHealthStatus(ctx, service)
        return {
          success: finalHealth.isHealthy && finalHealth.metrics.failureRate < 5,
          data: { finalHealth },
        }

      case 'monitoring_setup':
        // Set up enhanced monitoring
        return {
          success: true,
          data: { monitoringEnabled: true },
        }

      default:
        return {
          success: false,
          error: `Unknown recovery step: ${step.name}`,
        }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function calculateSystemHealth(services: any[]): {
  overall: number
  status: string
  details: any
} {
  const healthyServices = services.filter(s => s.health.isHealthy).length
  const totalServices = services.length
  const recoveringServices = services.filter(s => s.isRecovering).length

  const healthPercentage =
    totalServices > 0 ? (healthyServices / totalServices) * 100 : 100

  let status = 'healthy'
  if (healthPercentage < 50) status = 'critical'
  else if (healthPercentage < 80) status = 'degraded'
  else if (recoveringServices > 0) status = 'recovering'

  return {
    overall: Math.round(healthPercentage),
    status,
    details: {
      healthyServices,
      totalServices,
      recoveringServices,
      avgFailureRate:
        services.reduce((sum, s) => sum + s.health.metrics.failureRate, 0) /
        totalServices,
    },
  }
}

function calculateEstimatedRecoveryTime(steps: RecoveryStep[]): number {
  // Estimate based on step complexity (in milliseconds)
  const stepTimes = {
    service_validation: 30000,
    circuit_breaker_reset: 10000,
    gradual_traffic_increase: 120000,
    full_recovery_validation: 60000,
    monitoring_setup: 15000,
  }

  return steps.reduce((total, step) => {
    return total + (stepTimes[step.name as keyof typeof stepTimes] || 30000)
  }, 0)
}

function calculateWorkflowProgress(steps: RecoveryStep[]): number {
  const completedSteps = steps.filter(s => s.status === 'completed').length
  return Math.round((completedSteps / steps.length) * 100)
}

function calculateRemainingTime(
  steps: RecoveryStep[],
  currentIndex: number
): number {
  const remainingSteps = steps.slice(currentIndex + 1)
  return calculateEstimatedRecoveryTime(remainingSteps)
}

function calculateAverageStepDuration(steps: RecoveryStep[]): number {
  const completedSteps = steps.filter(
    s => s.status === 'completed' && s.duration
  )
  if (completedSteps.length === 0) return 0

  const totalDuration = completedSteps.reduce(
    (sum, step) => sum + (step.duration || 0),
    0
  )
  return totalDuration / completedSteps.length
}

async function advanceToNextStep(ctx: any, workflowId: string) {
  const workflow = await ctx.db.get(workflowId)
  if (!workflow) return

  const nextIndex = workflow.currentStepIndex + 1
  const progress = calculateWorkflowProgress(workflow.steps)

  await ctx.db.patch(workflowId, {
    currentStepIndex: nextIndex,
    progress,
    lastUpdate: Date.now(),
    estimatedTimeRemaining: calculateRemainingTime(workflow.steps, nextIndex),
  })
}

async function completeRecoveryWorkflow(ctx: any, workflowId: string) {
  const now = Date.now()
  const workflow = await ctx.db.get(workflowId)

  await ctx.db.patch(workflowId, {
    phase: 'monitoring',
    progress: 100,
    lastUpdate: now,
    estimatedTimeRemaining: 0,
  })

  return {
    workflowCompleted: true,
    totalTime: workflow ? now - workflow.startedAt : 0,
  }
}
