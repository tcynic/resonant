/**
 * AI Service Monitoring and Error Tracking
 * Comprehensive monitoring, logging, and alerting for AI infrastructure
 */

import {
  AIError,
  AIErrorSeverity,
  AIErrorStats,
  getErrorSeverity,
} from './errors'
import { AnalysisType } from '../types'

// Monitoring configuration
interface MonitoringConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  enableMetrics: boolean
  enableAlerting: boolean
  errorRetentionDays: number
  metricsRetentionDays: number
  alertThresholds: {
    errorRate: number // errors per hour
    failureRate: number // percentage of failed requests
    latencyP95: number // 95th percentile latency in ms
    queueDepth: number // maximum queue depth
  }
}

const defaultConfig: MonitoringConfig = {
  logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  enableMetrics: true,
  enableAlerting: process.env.NODE_ENV === 'production',
  errorRetentionDays: 30,
  metricsRetentionDays: 90,
  alertThresholds: {
    errorRate: 10, // 10 errors per hour
    failureRate: 15, // 15% failure rate
    latencyP95: 30000, // 30 second latency
    queueDepth: 100, // 100 items in queue
  },
}

// Metrics interface
interface AIMetrics {
  timestamp: number
  analysisType: AnalysisType
  operation: string
  duration: number
  success: boolean
  error?: AIError
  tokens?: number
  cost?: number
  confidence?: number
  queueDepth?: number
  retryAttempt?: number
  userId?: string
}

// Alert interface
interface AIAlert {
  id: string
  timestamp: number
  severity: AIErrorSeverity
  type:
    | 'error_rate'
    | 'failure_rate'
    | 'latency'
    | 'queue_depth'
    | 'service_down'
  message: string
  threshold: number
  currentValue: number
  affectedServices: string[]
  actionRequired: string[]
}

// Performance tracking
interface PerformanceMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageLatency: number
  p95Latency: number
  p99Latency: number
  totalTokens: number
  totalCost: number
  queueMetrics: {
    averageDepth: number
    maxDepth: number
    averageWaitTime: number
  }
}

class AIMonitoringService {
  private config: MonitoringConfig
  private errors: AIError[] = []
  private metrics: AIMetrics[] = []
  private alerts: AIAlert[] = []
  private performanceWindow: AIMetrics[] = []
  private cleanupInterval?: NodeJS.Timeout
  private alertingEnabled: boolean = false

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.startCleanupTimer()
    this.alertingEnabled = this.config.enableAlerting
  }

  // Log and track errors
  logError(error: AIError, context: Record<string, unknown> = {}): void {
    const severity = getErrorSeverity(error)

    // Add to error tracking
    this.errors.push(error)

    // Log based on severity and config
    this.writeLog(severity, error.message, {
      errorCode: error.errorCode,
      errorType: error.constructor.name,
      context: { ...error.context, ...context },
      stack: error.stack,
      recoverable: error.recoverable,
      retryable: error.retryable,
    })

    // Add metric entry for error
    this.recordMetric({
      timestamp: Date.now(),
      analysisType: (context.analysisType as AnalysisType) || 'sentiment',
      operation: (context.operation as string) || 'unknown',
      duration: 0,
      success: false,
      error,
      userId: context.userId as string,
    })

    // Check if alerting is needed
    if (this.alertingEnabled) {
      this.checkAlertThresholds()
    }
  }

  // Record performance metrics
  recordMetric(metric: AIMetrics): void {
    if (!this.config.enableMetrics) return

    this.metrics.push(metric)
    this.performanceWindow.push(metric)

    // Keep performance window at reasonable size (last 1000 requests)
    if (this.performanceWindow.length > 1000) {
      this.performanceWindow = this.performanceWindow.slice(-1000)
    }

    // Log successful operations at debug level
    if (metric.success && this.config.logLevel === 'debug') {
      this.writeLog('debug', `AI operation completed successfully`, {
        operation: metric.operation,
        duration: metric.duration,
        analysisType: metric.analysisType,
        tokens: metric.tokens,
        confidence: metric.confidence,
      })
    }
  }

  // Start performance timing
  startTiming(
    operation: string,
    analysisType: AnalysisType,
    context: Record<string, unknown> = {}
  ): () => void {
    const startTime = Date.now()

    return () => {
      const duration = Date.now() - startTime
      this.recordMetric({
        timestamp: startTime,
        analysisType,
        operation,
        duration,
        success: true,
        ...context,
      })
    }
  }

  // Get error statistics
  getErrorStats(timeRangeMs: number = 3600000): AIErrorStats {
    // Default 1 hour
    const cutoff = Date.now() - timeRangeMs
    const recentErrors = this.errors.filter(e => e.timestamp >= cutoff)

    const byType: Record<string, number> = {}
    const bySeverity: Record<AIErrorSeverity, number> = {
      [AIErrorSeverity.LOW]: 0,
      [AIErrorSeverity.MEDIUM]: 0,
      [AIErrorSeverity.HIGH]: 0,
      [AIErrorSeverity.CRITICAL]: 0,
    }

    recentErrors.forEach(error => {
      const type = error.constructor.name
      byType[type] = (byType[type] || 0) + 1

      const severity = getErrorSeverity(error)
      bySeverity[severity]++
    })

    return {
      total: recentErrors.length,
      byType,
      bySeverity,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
      errorRate: recentErrors.length / (timeRangeMs / 3600000), // Errors per hour
    }
  }

  // Get performance metrics
  getPerformanceMetrics(timeRangeMs: number = 3600000): PerformanceMetrics {
    const cutoff = Date.now() - timeRangeMs
    const recentMetrics = this.performanceWindow.filter(
      m => m.timestamp >= cutoff
    )

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        totalTokens: 0,
        totalCost: 0,
        queueMetrics: {
          averageDepth: 0,
          maxDepth: 0,
          averageWaitTime: 0,
        },
      }
    }

    const successful = recentMetrics.filter(m => m.success)
    const failed = recentMetrics.filter(m => !m.success)
    const latencies = recentMetrics.map(m => m.duration).sort((a, b) => a - b)

    const p95Index = Math.floor(latencies.length * 0.95)
    const p99Index = Math.floor(latencies.length * 0.99)

    return {
      totalRequests: recentMetrics.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      averageLatency:
        latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      p95Latency: latencies[p95Index] || 0,
      p99Latency: latencies[p99Index] || 0,
      totalTokens: recentMetrics.reduce((sum, m) => sum + (m.tokens || 0), 0),
      totalCost: recentMetrics.reduce((sum, m) => sum + (m.cost || 0), 0),
      queueMetrics: {
        averageDepth:
          recentMetrics.reduce((sum, m) => sum + (m.queueDepth || 0), 0) /
          recentMetrics.length,
        maxDepth: Math.max(...recentMetrics.map(m => m.queueDepth || 0)),
        averageWaitTime: 0, // Would need separate queue timing metrics
      },
    }
  }

  // Check alert thresholds and create alerts
  private checkAlertThresholds(): void {
    const stats = this.getErrorStats()
    const performance = this.getPerformanceMetrics()

    // Error rate alert
    if (stats.errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert(
        'error_rate',
        AIErrorSeverity.HIGH,
        `High error rate detected: ${stats.errorRate.toFixed(1)} errors/hour`,
        this.config.alertThresholds.errorRate,
        stats.errorRate,
        ['AI Analysis Service'],
        [
          'Investigate recent errors',
          'Check API service status',
          'Review error logs',
        ]
      )
    }

    // Failure rate alert
    const failureRate =
      (performance.failedRequests / performance.totalRequests) * 100
    if (failureRate > this.config.alertThresholds.failureRate) {
      this.createAlert(
        'failure_rate',
        AIErrorSeverity.HIGH,
        `High failure rate detected: ${failureRate.toFixed(1)}%`,
        this.config.alertThresholds.failureRate,
        failureRate,
        ['AI Analysis Service'],
        ['Check service health', 'Review API quotas', 'Investigate failures']
      )
    }

    // Latency alert
    if (performance.p95Latency > this.config.alertThresholds.latencyP95) {
      this.createAlert(
        'latency',
        AIErrorSeverity.MEDIUM,
        `High latency detected: P95 ${performance.p95Latency}ms`,
        this.config.alertThresholds.latencyP95,
        performance.p95Latency,
        ['AI Analysis Service'],
        ['Check API response times', 'Review queue depth', 'Consider scaling']
      )
    }

    // Queue depth alert
    if (
      performance.queueMetrics.maxDepth > this.config.alertThresholds.queueDepth
    ) {
      this.createAlert(
        'queue_depth',
        AIErrorSeverity.MEDIUM,
        `High queue depth detected: ${performance.queueMetrics.maxDepth} items`,
        this.config.alertThresholds.queueDepth,
        performance.queueMetrics.maxDepth,
        ['AI Analysis Queue'],
        [
          'Increase processing capacity',
          'Review queue configuration',
          'Check for bottlenecks',
        ]
      )
    }
  }

  // Create alert
  private createAlert(
    type: AIAlert['type'],
    severity: AIErrorSeverity,
    message: string,
    threshold: number,
    currentValue: number,
    affectedServices: string[],
    actionRequired: string[]
  ): void {
    const alert: AIAlert = {
      id: `${type}_${Date.now()}`,
      timestamp: Date.now(),
      severity,
      type,
      message,
      threshold,
      currentValue,
      affectedServices,
      actionRequired,
    }

    this.alerts.push(alert)

    // Log alert
    this.writeLog('error', `ALERT: ${message}`, {
      alertId: alert.id,
      severity,
      threshold,
      currentValue,
      affectedServices,
      actionRequired,
    })

    // In production, this would trigger external alerting (Slack, email, etc.)
    if (process.env.NODE_ENV === 'production') {
      this.sendExternalAlert(alert)
    }
  }

  // Send external alert (placeholder for production alerting)
  private sendExternalAlert(alert: AIAlert): void {
    // In production, integrate with:
    // - Slack webhooks
    // - Email notifications
    // - PagerDuty/OpsGenie
    // - Monitoring dashboards

    console.warn(
      `🚨 AI ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`
    )
  }

  // Write log with appropriate level
  private writeLog(
    level: string,
    message: string,
    data: Record<string, unknown> = {}
  ): void {
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 }
    const configLevel = logLevels[this.config.logLevel]
    const messageLevel = logLevels[level as keyof typeof logLevels] ?? 1

    if (messageLevel < configLevel) return

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: 'AI_MONITORING',
      message,
      ...data,
    }

    // In production, send to structured logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to logging service (CloudWatch, DataDog, etc.)
      console.log(JSON.stringify(logEntry))
    } else {
      // Development: pretty print
      const emoji =
        { debug: '🔍', info: 'ℹ️', warn: '⚠️', error: '❌' }[level] || 'ℹ️'
      console.log(`${emoji} [${level.toUpperCase()}] ${message}`, data)
    }
  }

  // Health check
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'down'
    issues: string[]
  } {
    const stats = this.getErrorStats(300000) // Last 5 minutes
    const performance = this.getPerformanceMetrics(300000)
    const issues: string[] = []

    // Check critical error rate
    if (stats.errorRate > this.config.alertThresholds.errorRate * 2) {
      issues.push(`Critical error rate: ${stats.errorRate.toFixed(1)}/hour`)
    }

    // Check failure rate
    const failureRate =
      performance.totalRequests > 0
        ? (performance.failedRequests / performance.totalRequests) * 100
        : 0

    if (failureRate > this.config.alertThresholds.failureRate * 2) {
      issues.push(`High failure rate: ${failureRate.toFixed(1)}%`)
    }

    // Check for critical errors
    const criticalErrors = stats.bySeverity[AIErrorSeverity.CRITICAL]
    if (criticalErrors > 0) {
      issues.push(`${criticalErrors} critical errors detected`)
    }

    // Determine status
    if (issues.length === 0) {
      return { status: 'healthy', issues: [] }
    } else if (issues.length <= 2) {
      return { status: 'degraded', issues }
    } else {
      return { status: 'down', issues }
    }
  }

  // Cleanup old data
  private startCleanupTimer(): void {
    // Skip cleanup timer in Convex environments (mutations/queries can't use setInterval)
    if (typeof process !== 'undefined' && process.env.CONVEX_CLOUD_URL) {
      return
    }

    this.cleanupInterval = setInterval(
      () => {
        const errorCutoff =
          Date.now() - this.config.errorRetentionDays * 24 * 60 * 60 * 1000
        const metricsCutoff =
          Date.now() - this.config.metricsRetentionDays * 24 * 60 * 60 * 1000

        this.errors = this.errors.filter(e => e.timestamp >= errorCutoff)
        this.metrics = this.metrics.filter(m => m.timestamp >= metricsCutoff)
        this.alerts = this.alerts.filter(a => a.timestamp >= errorCutoff)
      },
      60 * 60 * 1000
    ) // Run every hour
  }

  // Cleanup on shutdown
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }

  // Export metrics for external monitoring
  exportMetrics(): {
    errors: AIErrorStats
    performance: PerformanceMetrics
    health: { status: 'healthy' | 'degraded' | 'down'; issues: string[] }
    alerts: AIAlert[]
  } {
    return {
      errors: this.getErrorStats(),
      performance: this.getPerformanceMetrics(),
      health: this.getHealthStatus(),
      alerts: this.alerts.slice(-10), // Last 10 alerts
    }
  }

  // Reset monitoring state (for testing)
  resetState(): void {
    this.errors = []
    this.metrics = []
    this.alerts = []
    this.performanceWindow = []
  }
}

// Singleton monitoring service
export const aiMonitoring = new AIMonitoringService()

// Helper functions for common monitoring patterns
export function withMonitoring<T>(
  operation: string,
  analysisType: AnalysisType,
  fn: () => Promise<T>,
  context: Record<string, unknown> = {}
): Promise<T> {
  const endTiming = aiMonitoring.startTiming(operation, analysisType, context)

  return fn()
    .then(result => {
      endTiming()
      return result
    })
    .catch(error => {
      if (error instanceof AIError) {
        aiMonitoring.logError(error, { operation, analysisType, ...context })
      } else {
        // Convert unknown errors to AI errors
        const aiError = new (class extends AIError {
          getUserMessage() {
            return 'An unexpected error occurred during AI analysis.'
          }
          getRecoveryActions() {
            return ['Try again', 'Contact support if issue persists']
          }
        })(error.message || 'Unknown error', 'UNKNOWN_ERROR', {
          operation,
          analysisType,
          originalError: error.message,
          ...context,
        })
        aiMonitoring.logError(aiError, context)
      }
      throw error
    })
}

// Monitor queue operations
export function monitorQueueOperation<T>(
  operation: string,
  queueDepth: number,
  fn: () => Promise<T>,
  context: Record<string, unknown> = {}
): Promise<T> {
  return withMonitoring(operation, 'sentiment', fn, { ...context, queueDepth })
}

export default aiMonitoring
