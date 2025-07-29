/**
 * Circuit Breaker Query Functions
 * Story AI-Migration.4: Comprehensive Error Handling & Recovery
 *
 * Convex query functions for circuit breaker monitoring dashboard
 */

import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import {
  getAllCircuitBreakerStatuses,
  getCircuitBreakerAlerts,
  getCircuitBreakerSummary,
  getCircuitBreakerHealthStatus,
  forceCircuitBreakerOpen,
  forceCircuitBreakerClosed,
  recordCircuitBreakerFailure,
  recordCircuitBreakerSuccess,
} from './utils/circuit_breaker'

/**
 * Get all circuit breaker statuses for dashboard overview
 */
export const getAllStatuses = query({
  args: {},
  handler: async ctx => {
    return await getAllCircuitBreakerStatuses(ctx)
  },
})

/**
 * Get circuit breaker alerts for notifications
 */
export const getAlerts = query({
  args: {
    since: v.optional(v.number()),
  },
  handler: async (ctx, { since }) => {
    return await getCircuitBreakerAlerts(ctx, since)
  },
})

/**
 * Get circuit breaker summary statistics
 */
export const getSummary = query({
  args: {},
  handler: async ctx => {
    return await getCircuitBreakerSummary(ctx)
  },
})

/**
 * Get detailed health status for a specific service
 */
export const getHealthStatus = query({
  args: {
    service: v.string(),
  },
  handler: async (ctx, { service }) => {
    return await getCircuitBreakerHealthStatus(ctx, service)
  },
})

/**
 * Force a circuit breaker to open (manual intervention)
 */
export const forceOpen = mutation({
  args: {
    service: v.string(),
  },
  handler: async (ctx, { service }) => {
    await forceCircuitBreakerOpen(ctx, service)
    return {
      success: true,
      message: `Circuit breaker for ${service} has been forced open`,
    }
  },
})

/**
 * Force a circuit breaker to close (manual intervention)
 */
export const forceClose = mutation({
  args: {
    service: v.string(),
  },
  handler: async (ctx, { service }) => {
    await forceCircuitBreakerClosed(ctx, service)
    return {
      success: true,
      message: `Circuit breaker for ${service} has been forced closed`,
    }
  },
})

/**
 * Record circuit breaker failure
 */
export const recordFailure = mutation({
  args: {
    service: v.string(),
    errorMessage: v.string(),
  },
  handler: async (ctx, { service, errorMessage }) => {
    await recordCircuitBreakerFailure(ctx, service, errorMessage)
    return { success: true }
  },
})

/**
 * Record circuit breaker success
 */
export const recordSuccess = mutation({
  args: {
    service: v.string(),
    responseTimeMs: v.number(),
  },
  handler: async (ctx, { service, responseTimeMs }) => {
    await recordCircuitBreakerSuccess(ctx, service, responseTimeMs)
    return { success: true }
  },
})
