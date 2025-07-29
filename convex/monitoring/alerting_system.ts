/**
 * Success Rate Alerting and Notification System (Story AI-Migration.6)
 * Multi-level alerting with escalation workflows and acknowledgment tracking
 */

import { query, mutation, internalMutation } from '../_generated/server'
import { v } from 'convex/values'

// Alert severity levels and escalation rules
export const ALERT_SEVERITY_LEVELS = {
  warning: {
    escalateAfter: 30, // minutes
    maxEscalations: 2,
    priority: 1,
  },
  critical: {
    escalateAfter: 15, // minutes
    maxEscalations: 3,
    priority: 2,
  },
  emergency: {
    escalateAfter: 5, // minutes
    maxEscalations: 5,
    priority: 3,
  },
} as const

/**
 * Create or update alert configuration
 */
export const createAlertConfig = mutation({
  args: {
    alertType: v.string(),
    thresholds: v.object({
      warning: v.optional(v.number()),
      critical: v.optional(v.number()),
      emergency: v.optional(v.number()),
    }),
    recipients: v.array(v.string()),
    deliveryChannels: v.object({
      email: v.boolean(),
      dashboard: v.boolean(),
      webhook: v.optional(v.string()),
    }),
    escalationRules: v.optional(
      v.object({
        escalateAfter: v.number(),
        escalationRecipients: v.array(v.string()),
        maxEscalations: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Authentication required to create alert configuration')
    }

    const user = await ctx.db
      .query('users')
      .filter(q => q.eq(q.field('clerkId'), identity.subject))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    // Check if configuration already exists
    const existingConfig = await ctx.db
      .query('alertingConfig')
      .filter(q => q.eq(q.field('alertType'), args.alertType))
      .first()

    if (existingConfig) {
      // Update existing configuration
      return await ctx.db.patch(existingConfig._id, {
        ...args,
        updatedAt: Date.now(),
      })
    } else {
      // Create new configuration
      return await ctx.db.insert('alertingConfig', {
        ...args,
        enabled: true,
        createdBy: user._id,
        updatedAt: Date.now(),
      })
    }
  },
})

/**
 * Get all alert configurations
 */
export const getAlertConfigurations = query({
  args: {
    alertType: v.optional(v.string()),
    enabledOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query('alertingConfig')

    if (args.alertType) {
      query = query.filter(q => q.eq(q.field('alertType'), args.alertType))
    }

    if (args.enabledOnly) {
      query = query.filter(q => q.eq(q.field('enabled'), true))
    }

    const configs = await query.collect()

    return configs.map(config => ({
      ...config,
      createdBy: undefined, // Remove sensitive data
    }))
  },
})

/**
 * Process alert and determine notification actions
 */
export const processAlert = internalMutation({
  args: {
    alertType: v.string(),
    severity: v.union(
      v.literal('warning'),
      v.literal('critical'),
      v.literal('emergency')
    ),
    conditions: v.object({
      threshold: v.number(),
      actualValue: v.number(),
      timeWindow: v.string(),
      service: v.optional(v.string()),
    }),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Get alert configuration
    const config = await ctx.db
      .query('alertingConfig')
      .filter(q => q.eq(q.field('alertType'), args.alertType))
      .filter(q => q.eq(q.field('enabled'), true))
      .first()

    if (!config) {
      return { success: false, reason: 'No alert configuration found' }
    }

    // Check if similar alert already exists and is unresolved
    const existingAlert = await ctx.db
      .query('monitoringAlerts')
      .filter(q => q.eq(q.field('alertType'), args.alertType))
      .filter(q => q.eq(q.field('severity'), args.severity))
      .filter(q => q.eq(q.field('resolvedAt'), undefined))
      .first()

    let alertId: string

    if (existingAlert) {
      // Update existing alert
      await ctx.db.patch(existingAlert._id, {
        conditions: args.conditions,
        metadata: args.metadata,
        triggeredAt: Date.now(),
      })
      alertId = existingAlert._id
    } else {
      // Create new alert
      alertId = await ctx.db.insert('monitoringAlerts', {
        alertType: args.alertType,
        severity: args.severity,
        message: generateAlertMessage(args),
        triggeredAt: Date.now(),
        escalationLevel: 0,
        autoResolved: false,
        notificationsSent: [],
        conditions: args.conditions,
        metadata: args.metadata,
      })
    }

    // Schedule notifications
    const notifications = await scheduleNotifications(ctx, alertId, config)

    return {
      success: true,
      alertId,
      notificationsScheduled: notifications.length,
      deliveryChannels: notifications.map(n => n.channel),
    }
  },
})

/**
 * Schedule notifications for an alert
 */
async function scheduleNotifications(ctx: any, alertId: string, config: any) {
  const notifications = []

  // Email notification
  if (config.deliveryChannels.email) {
    for (const recipient of config.recipients) {
      const notificationId = await ctx.db.insert('notifications', {
        type: 'alert_email',
        title: 'System Alert',
        message: `Alert triggered: ${alertId}`,
        data: {
          alertId,
          recipient,
          deliveryChannel: 'email',
        },
        createdAt: Date.now(),
        read: false,
      })
      notifications.push({ id: notificationId, channel: 'email', recipient })
    }
  }

  // Dashboard notification
  if (config.deliveryChannels.dashboard) {
    const notificationId = await ctx.db.insert('notifications', {
      type: 'alert_dashboard',
      title: 'System Alert',
      message: `Alert triggered: ${alertId}`,
      data: {
        alertId,
        deliveryChannel: 'dashboard',
      },
      createdAt: Date.now(),
      read: false,
    })
    notifications.push({ id: notificationId, channel: 'dashboard' })
  }

  // Webhook notification
  if (config.deliveryChannels.webhook) {
    const notificationId = await ctx.db.insert('notifications', {
      type: 'alert_webhook',
      title: 'System Alert',
      message: `Alert triggered: ${alertId}`,
      data: {
        alertId,
        webhookUrl: config.deliveryChannels.webhook,
        deliveryChannel: 'webhook',
      },
      createdAt: Date.now(),
      read: false,
    })
    notifications.push({ id: notificationId, channel: 'webhook' })
  }

  return notifications
}

/**
 * Generate alert message based on alert data
 */
function generateAlertMessage(args: any): string {
  const { alertType, severity, conditions } = args
  const { threshold, actualValue, timeWindow, service } = conditions

  let message = `${severity.toUpperCase()} Alert: ${alertType}`

  if (alertType === 'success_rate') {
    const actualPercent = (actualValue * 100).toFixed(1)
    const thresholdPercent = (threshold * 100).toFixed(1)
    message += ` - Success rate (${actualPercent}%) below ${thresholdPercent}% threshold`
  } else if (alertType === 'cost_budget') {
    const actualPercent = (actualValue * 100).toFixed(1)
    const thresholdPercent = (threshold * 100).toFixed(1)
    message += ` - Budget utilization (${actualPercent}%) exceeds ${thresholdPercent}% threshold`
  } else if (alertType === 'processing_time') {
    const actualSeconds = (actualValue / 1000).toFixed(1)
    const thresholdSeconds = (threshold / 1000).toFixed(1)
    message += ` - Processing time (${actualSeconds}s) exceeds ${thresholdSeconds}s threshold`
  }

  if (service) {
    message += ` for service: ${service}`
  }

  message += ` (${timeWindow} window)`

  return message
}

/**
 * Acknowledge an alert
 */
export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id('monitoringAlerts'),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Authentication required to acknowledge alert')
    }

    const user = await ctx.db
      .query('users')
      .filter(q => q.eq(q.field('clerkId'), identity.subject))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    const alert = await ctx.db.get(args.alertId)
    if (!alert) {
      throw new Error('Alert not found')
    }

    if (alert.acknowledgedAt) {
      throw new Error('Alert already acknowledged')
    }

    await ctx.db.patch(args.alertId, {
      acknowledgedAt: Date.now(),
      acknowledgedBy: user._id,
      metadata: {
        ...alert.metadata,
        acknowledgmentNotes: args.notes,
      },
    })

    return {
      success: true,
      acknowledgedAt: Date.now(),
      acknowledgedBy: user.name,
    }
  },
})

/**
 * Resolve an alert
 */
export const resolveAlert = mutation({
  args: {
    alertId: v.id('monitoringAlerts'),
    resolution: v.string(),
    autoResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Authentication required to resolve alert')
    }

    const user = await ctx.db
      .query('users')
      .filter(q => q.eq(q.field('clerkId'), identity.subject))
      .first()

    if (!user) {
      throw new Error('User not found')
    }

    const alert = await ctx.db.get(args.alertId)
    if (!alert) {
      throw new Error('Alert not found')
    }

    if (alert.resolvedAt) {
      throw new Error('Alert already resolved')
    }

    await ctx.db.patch(args.alertId, {
      resolvedAt: Date.now(),
      resolvedBy: user._id,
      autoResolved: args.autoResolved || false,
      metadata: {
        ...alert.metadata,
        resolution: args.resolution,
      },
    })

    // Create recovery notification if needed
    if (!args.autoResolved) {
      await ctx.db.insert('notifications', {
        type: 'alert_resolved',
        title: 'Alert Resolved',
        message: `Alert ${alert.alertType} has been resolved: ${args.resolution}`,
        data: {
          alertId: args.alertId,
          resolvedBy: user.name,
          resolution: args.resolution,
        },
        createdAt: Date.now(),
        read: false,
      })
    }

    return { success: true, resolvedAt: Date.now(), resolvedBy: user.name }
  },
})

/**
 * Get active alerts
 */
export const getActiveAlerts = query({
  args: {
    severity: v.optional(
      v.union(
        v.literal('warning'),
        v.literal('critical'),
        v.literal('emergency')
      )
    ),
    alertType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query('monitoringAlerts')
      .filter(q => q.eq(q.field('resolvedAt'), undefined))

    if (args.severity) {
      query = query.filter(q => q.eq(q.field('severity'), args.severity))
    }

    if (args.alertType) {
      query = query.filter(q => q.eq(q.field('alertType'), args.alertType))
    }

    query = query.order('desc')

    if (args.limit) {
      query = query.take(args.limit)
    }

    const alerts = await query.collect()

    return alerts.map(alert => ({
      ...alert,
      age: Date.now() - alert.triggeredAt,
      isEscalated: alert.escalationLevel > 0,
      needsAttention:
        !alert.acknowledgedAt &&
        Date.now() - alert.triggeredAt > 10 * 60 * 1000, // 10 minutes
    }))
  },
})

/**
 * Get alert history and statistics
 */
export const getAlertHistory = query({
  args: {
    timeWindow: v.optional(v.string()), // '24h', '7d', '30d'
    alertType: v.optional(v.string()),
    includeResolved: v.optional(v.boolean()),
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

    let query = ctx.db
      .query('monitoringAlerts')
      .filter(q => q.gte(q.field('triggeredAt'), startTime))

    if (args.alertType) {
      query = query.filter(q => q.eq(q.field('alertType'), args.alertType))
    }

    if (!args.includeResolved) {
      query = query.filter(q => q.eq(q.field('resolvedAt'), undefined))
    }

    const alerts = await query.collect()

    // Calculate statistics
    const stats = {
      total: alerts.length,
      bySeverity: {
        warning: alerts.filter(a => a.severity === 'warning').length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        emergency: alerts.filter(a => a.severity === 'emergency').length,
      },
      byType: {} as Record<string, number>,
      resolved: alerts.filter(a => a.resolvedAt).length,
      acknowledged: alerts.filter(a => a.acknowledgedAt).length,
      escalated: alerts.filter(a => a.escalationLevel > 0).length,
      avgResolutionTime: 0,
    }

    // Calculate by type
    for (const alert of alerts) {
      stats.byType[alert.alertType] = (stats.byType[alert.alertType] || 0) + 1
    }

    // Calculate average resolution time
    const resolvedAlerts = alerts.filter(a => a.resolvedAt)
    if (resolvedAlerts.length > 0) {
      const totalResolutionTime = resolvedAlerts.reduce(
        (sum, alert) => sum + (alert.resolvedAt! - alert.triggeredAt),
        0
      )
      stats.avgResolutionTime = totalResolutionTime / resolvedAlerts.length
    }

    return {
      timeWindow,
      startTime,
      endTime: Date.now(),
      alerts: alerts.sort((a, b) => b.triggeredAt - a.triggeredAt),
      statistics: stats,
    }
  },
})

/**
 * Check for alerts that need escalation
 */
export const checkAlertEscalation = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now()
    const escalationCandidates = []

    // Get unacknowledged alerts
    const unacknowledgedAlerts = await ctx.db
      .query('monitoringAlerts')
      .filter(q => q.eq(q.field('acknowledgedAt'), undefined))
      .filter(q => q.eq(q.field('resolvedAt'), undefined))
      .collect()

    for (const alert of unacknowledgedAlerts) {
      const severityConfig =
        ALERT_SEVERITY_LEVELS[
          alert.severity as keyof typeof ALERT_SEVERITY_LEVELS
        ]
      const escalateAfterMs = severityConfig.escalateAfter * 60 * 1000
      const timeSinceTriggered = now - alert.triggeredAt

      // Check if alert needs escalation
      if (
        timeSinceTriggered > escalateAfterMs &&
        alert.escalationLevel < severityConfig.maxEscalations
      ) {
        // Escalate alert
        await ctx.db.patch(alert._id, {
          escalationLevel: alert.escalationLevel + 1,
          escalatedAt: now,
        })

        // Get alert configuration for escalation recipients
        const config = await ctx.db
          .query('alertingConfig')
          .filter(q => q.eq(q.field('alertType'), alert.alertType))
          .first()

        if (config?.escalationRules?.escalationRecipients) {
          // Send escalation notifications
          for (const recipient of config.escalationRules.escalationRecipients) {
            await ctx.db.insert('notifications', {
              type: 'alert_escalation',
              title: `ESCALATED: ${alert.severity.toUpperCase()} Alert`,
              message: `Alert escalated to level ${alert.escalationLevel + 1}: ${alert.message}`,
              data: {
                alertId: alert._id,
                escalationLevel: alert.escalationLevel + 1,
                recipient,
                originalTriggeredAt: alert.triggeredAt,
              },
              createdAt: now,
              read: false,
            })
          }
        }

        escalationCandidates.push({
          alertId: alert._id,
          alertType: alert.alertType,
          severity: alert.severity,
          escalationLevel: alert.escalationLevel + 1,
          timeSinceTriggered,
        })
      }
    }

    return {
      escalatedCount: escalationCandidates.length,
      escalatedAlerts: escalationCandidates,
      timestamp: now,
    }
  },
})

/**
 * Auto-resolve alerts based on improved conditions
 */
export const checkAutoResolution = internalMutation({
  args: {
    alertType: v.string(),
    currentValue: v.number(),
    threshold: v.number(),
    service: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resolvedAlerts = []

    // Find active alerts of this type that might be resolved
    let query = ctx.db
      .query('monitoringAlerts')
      .filter(q => q.eq(q.field('alertType'), args.alertType))
      .filter(q => q.eq(q.field('resolvedAt'), undefined))

    if (args.service) {
      query = query.filter(q =>
        q.eq(q.field('conditions.service'), args.service)
      )
    }

    const activeAlerts = await query.collect()

    for (const alert of activeAlerts) {
      let shouldResolve = false

      // Check resolution conditions based on alert type
      if (args.alertType === 'success_rate') {
        // Resolve if success rate is back above warning threshold with buffer
        shouldResolve = args.currentValue > args.threshold + 0.02 // 2% buffer
      } else if (args.alertType === 'cost_budget') {
        // Resolve if budget utilization is back below threshold with buffer
        shouldResolve = args.currentValue < args.threshold - 0.05 // 5% buffer
      } else if (args.alertType === 'processing_time') {
        // Resolve if processing time is back below threshold with buffer
        shouldResolve = args.currentValue < args.threshold * 0.9 // 10% buffer
      }

      if (shouldResolve) {
        await ctx.db.patch(alert._id, {
          resolvedAt: Date.now(),
          autoResolved: true,
          metadata: {
            ...alert.metadata,
            autoResolvedValue: args.currentValue,
            resolution: `Auto-resolved: ${args.alertType} returned to normal levels`,
          },
        })

        // Create recovery notification
        await ctx.db.insert('notifications', {
          type: 'alert_recovery',
          title: 'Alert Auto-Resolved',
          message: `${alert.alertType} alert has been automatically resolved - conditions returned to normal`,
          data: {
            alertId: alert._id,
            recoveredValue: args.currentValue,
            threshold: args.threshold,
            alertType: args.alertType,
          },
          createdAt: Date.now(),
          read: false,
        })

        resolvedAlerts.push({
          alertId: alert._id,
          alertType: alert.alertType,
          severity: alert.severity,
          recoveredValue: args.currentValue,
        })
      }
    }

    return {
      resolvedCount: resolvedAlerts.length,
      resolvedAlerts,
      timestamp: Date.now(),
    }
  },
})
