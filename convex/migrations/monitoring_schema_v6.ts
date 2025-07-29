/**
 * Schema Migration for Monitoring & Observability (Story AI-Migration.6)
 * Adds monitoring-specific database tables and indexes
 */

import { internalMutation } from '../_generated/server'

/**
 * Migration to add monitoring-specific database schema enhancements
 *
 * This migration creates:
 * - alertingConfig table for threshold and recipient management
 * - Enhanced monitoringAlerts table with severity levels and acknowledgment tracking
 * - budgetTracking table for time-window budget management
 * - Enhanced indexes for efficient monitoring queries
 */
export const addMonitoringTables = internalMutation({
  args: {},
  handler: async ctx => {
    // Create default alerting configurations for common scenarios
    const defaultAlertConfigs = [
      {
        alertType: 'success_rate',
        thresholds: {
          warning: 0.92, // 8% buffer above critical
          critical: 0.9, // 5% buffer above emergency
          emergency: 0.85, // 10% below target (95%)
        },
        recipients: ['admin@resonant.app'],
        enabled: true,
        deliveryChannels: {
          email: true,
          dashboard: true,
        },
        escalationRules: {
          escalateAfter: 30, // 30 minutes
          escalationRecipients: ['ops@resonant.app'],
          maxEscalations: 3,
        },
        updatedAt: Date.now(),
      },
      {
        alertType: 'cost_budget',
        thresholds: {
          warning: 0.75, // 75% budget consumption
          critical: 0.9, // 90% budget consumption
          emergency: 1.0, // Budget exceeded
        },
        recipients: ['admin@resonant.app'],
        enabled: true,
        deliveryChannels: {
          email: true,
          dashboard: true,
        },
        escalationRules: {
          escalateAfter: 15, // 15 minutes
          escalationRecipients: ['finance@resonant.app'],
          maxEscalations: 2,
        },
        updatedAt: Date.now(),
      },
      {
        alertType: 'processing_time',
        thresholds: {
          warning: 25000, // 25 seconds (5s buffer below target)
          critical: 35000, // 35 seconds (5s over target)
          emergency: 60000, // 60 seconds (2x target threshold)
        },
        recipients: ['admin@resonant.app'],
        enabled: true,
        deliveryChannels: {
          email: true,
          dashboard: true,
        },
        escalationRules: {
          escalateAfter: 60, // 60 minutes
          escalationRecipients: ['ops@resonant.app'],
          maxEscalations: 2,
        },
        updatedAt: Date.now(),
      },
      {
        alertType: 'health_check',
        thresholds: {
          warning: 0.95, // 95% health check success rate
          critical: 0.9, // 90% health check success rate
          emergency: 0.8, // 80% health check success rate
        },
        recipients: ['admin@resonant.app'],
        enabled: true,
        deliveryChannels: {
          email: true,
          dashboard: true,
        },
        escalationRules: {
          escalateAfter: 5, // 5 minutes
          escalationRecipients: ['ops@resonant.app'],
          maxEscalations: 3,
        },
        updatedAt: Date.now(),
      },
    ]

    // Create a system user for migration purposes if needed
    let systemUser = await ctx.db
      .query('users')
      .filter(q => q.eq(q.field('email'), 'system@resonant.app'))
      .first()

    let systemUserId
    if (!systemUser) {
      systemUserId = await ctx.db.insert('users', {
        name: 'System Admin',
        email: 'system@resonant.app',
        clerkId: 'system_migration_user',
        createdAt: Date.now(),
      })
    } else {
      systemUserId = systemUser._id
    }

    // Insert default alerting configurations
    for (const config of defaultAlertConfigs) {
      await ctx.db.insert('alertingConfig', {
        ...config,
        createdBy: systemUserId,
      })
    }

    // Create initial budget tracking records for different time windows
    const budgetConfigs = [
      {
        timeWindow: 'daily',
        budgetLimit: 100.0, // $100 daily budget
        alertThreshold: 0.8, // Alert at 80%
        service: 'all',
      },
      {
        timeWindow: 'weekly',
        budgetLimit: 500.0, // $500 weekly budget
        alertThreshold: 0.8, // Alert at 80%
        service: 'all',
      },
      {
        timeWindow: 'monthly',
        budgetLimit: 2000.0, // $2000 monthly budget
        alertThreshold: 0.8, // Alert at 80%
        service: 'all',
      },
    ]

    const now = Date.now()
    for (const budget of budgetConfigs) {
      // Calculate time window boundaries
      let windowStart: number
      let windowEnd: number

      if (budget.timeWindow === 'daily') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        windowStart = today.getTime()
        windowEnd = windowStart + 24 * 60 * 60 * 1000
      } else if (budget.timeWindow === 'weekly') {
        const thisWeek = new Date()
        const dayOfWeek = thisWeek.getDay()
        thisWeek.setDate(thisWeek.getDate() - dayOfWeek)
        thisWeek.setHours(0, 0, 0, 0)
        windowStart = thisWeek.getTime()
        windowEnd = windowStart + 7 * 24 * 60 * 60 * 1000
      } else {
        // monthly
        const thisMonth = new Date()
        thisMonth.setDate(1)
        thisMonth.setHours(0, 0, 0, 0)
        windowStart = thisMonth.getTime()
        const nextMonth = new Date(thisMonth)
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        windowEnd = nextMonth.getTime()
      }

      await ctx.db.insert('budgetTracking', {
        timeWindow: budget.timeWindow,
        budgetLimit: budget.budgetLimit,
        currentSpend: 0.0,
        projectedSpend: 0.0,
        alertThreshold: budget.alertThreshold,
        windowStart,
        windowEnd,
        lastUpdated: now,
        service: budget.service,
        budgetUtilization: 0.0,
        burnRate: 0.0,
        costBreakdown: {
          aiAnalysis: 0.0,
          storage: 0.0,
          bandwidth: 0.0,
          other: 0.0,
        },
      })
    }

    return {
      success: true,
      message: 'Monitoring schema migration completed successfully',
      alertConfigsCreated: defaultAlertConfigs.length,
      budgetTrackingCreated: budgetConfigs.length,
      timestamp: now,
    }
  },
})

/**
 * Rollback migration - removes monitoring-specific tables and data
 * WARNING: This will delete all monitoring configuration data
 */
export const rollbackMonitoringTables = internalMutation({
  args: {},
  handler: async ctx => {
    let deletedConfigs = 0
    let deletedBudgets = 0
    let deletedAlerts = 0

    // Clean up alertingConfig table
    const alertConfigs = await ctx.db.query('alertingConfig').collect()
    for (const config of alertConfigs) {
      await ctx.db.delete(config._id)
      deletedConfigs++
    }

    // Clean up budgetTracking table
    const budgetRecords = await ctx.db.query('budgetTracking').collect()
    for (const budget of budgetRecords) {
      await ctx.db.delete(budget._id)
      deletedBudgets++
    }

    // Clean up new monitoring alerts (keep legacy ones)
    const newAlerts = await ctx.db
      .query('monitoringAlerts')
      .filter(q => q.neq(q.field('alertType'), undefined))
      .collect()

    for (const alert of newAlerts) {
      await ctx.db.delete(alert._id)
      deletedAlerts++
    }

    return {
      success: true,
      message: 'Monitoring schema rollback completed',
      deletedConfigs,
      deletedBudgets,
      deletedAlerts,
      timestamp: Date.now(),
    }
  },
})

/**
 * Validate migration success by checking table existence and sample data
 */
export const validateMonitoringMigration = internalMutation({
  args: {},
  handler: async ctx => {
    const validation = {
      alertingConfig: {
        exists: false,
        count: 0,
        sampleRecord: null,
      },
      budgetTracking: {
        exists: false,
        count: 0,
        sampleRecord: null,
      },
      monitoringAlerts: {
        exists: false,
        count: 0,
        hasNewFields: false,
      },
    }

    try {
      // Check alertingConfig
      const alertConfigs = await ctx.db.query('alertingConfig').collect()
      validation.alertingConfig.exists = true
      validation.alertingConfig.count = alertConfigs.length
      if (alertConfigs.length > 0) {
        validation.alertingConfig.sampleRecord = alertConfigs[0]
      }

      // Check budgetTracking
      const budgetRecords = await ctx.db.query('budgetTracking').collect()
      validation.budgetTracking.exists = true
      validation.budgetTracking.count = budgetRecords.length
      if (budgetRecords.length > 0) {
        validation.budgetTracking.sampleRecord = budgetRecords[0]
      }

      // Check enhanced monitoringAlerts
      const alerts = await ctx.db.query('monitoringAlerts').collect()
      validation.monitoringAlerts.exists = true
      validation.monitoringAlerts.count = alerts.length
      validation.monitoringAlerts.hasNewFields = alerts.some(
        alert => alert.alertType !== undefined
      )
    } catch (error) {
      return {
        success: false,
        error: String(error),
        validation,
      }
    }

    const allTablesExist =
      validation.alertingConfig.exists &&
      validation.budgetTracking.exists &&
      validation.monitoringAlerts.exists

    return {
      success: allTablesExist,
      validation,
      timestamp: Date.now(),
    }
  },
})
