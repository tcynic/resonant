# Production Monitoring and Performance Tracking

## Overview

This document covers the production monitoring, error tracking, and performance monitoring systems that ensure the Resonant application maintains high availability, performance, and user experience in production environments.

## Application Performance Monitoring

### Web Vitals Integration

#### Core Web Vitals Tracking
```typescript
// src/lib/monitoring/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

interface Metric {
  name: string
  value: number
  id: string
  navigationType: string
}

function sendToAnalytics(metric: Metric) {
  // Send to your analytics service
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metric),
    })
  }
}

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  getCLS(sendToAnalytics)
  getFID(sendToAnalytics)
  getFCP(sendToAnalytics)
  getLCP(sendToAnalytics)
  getTTFB(sendToAnalytics)
}

// Custom performance markers
export function markFeatureUsage(feature: string, duration: number) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    performance.mark(`feature-${feature}-end`)
    performance.measure(`feature-${feature}`, `feature-${feature}-start`, `feature-${feature}-end`)
    
    sendToAnalytics({
      name: `feature-${feature}`,
      value: duration,
      id: `${feature}-${Date.now()}`,
      navigationType: 'navigate',
    })
  }
}
```

#### Performance Budget Monitoring
- **First Contentful Paint**: < 1.5 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.8 seconds

### Real-time Performance Analytics

#### Custom Metrics Dashboard
```typescript
// src/lib/monitoring/custom-metrics.ts
export class PerformanceMetrics {
  private static instance: PerformanceMetrics
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMetrics {
    if (!PerformanceMetrics.instance) {
      PerformanceMetrics.instance = new PerformanceMetrics()
    }
    return PerformanceMetrics.instance
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(value)
    
    // Send to monitoring service
    this.sendMetric(name, value)
  }

  private sendMetric(name: string, value: number) {
    if (typeof window !== 'undefined') {
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value, timestamp: Date.now() })
      }).catch(console.error)
    }
  }

  getMetricSummary(name: string) {
    const values = this.metrics.get(name) || []
    return {
      count: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    }
  }
}

// Usage tracking
export function trackUserAction(action: string, metadata?: Record<string, any>) {
  const startTime = performance.now()
  
  return {
    complete: () => {
      const duration = performance.now() - startTime
      PerformanceMetrics.getInstance().recordMetric(`action-${action}`, duration)
      
      if (metadata) {
        fetch('/api/analytics/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, duration, metadata, timestamp: Date.now() })
        }).catch(console.error)
      }
    }
  }
}
```

## Error Monitoring and Alerting

### Comprehensive Error Tracking

#### Sentry Integration
```typescript
// src/lib/monitoring/errors.ts
import * as Sentry from '@sentry/nextjs'

// Enhanced error reporting
export function reportError(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('error_context', context)
    }
    
    scope.setTag('error_boundary', true)
    Sentry.captureException(error)
  })
}

// User feedback integration
export function captureUserFeedback(feedback: {
  name: string
  email: string
  comments: string
}) {
  const user = Sentry.getCurrentHub().getScope()?.getUser()
  
  Sentry.captureUserFeedback({
    user: {
      id: user?.id || 'anonymous',
      username: user?.username || feedback.name,
      email: user?.email || feedback.email,
    },
    comments: feedback.comments,
  })
}

// Performance issue detection
export function detectPerformanceIssue(timing: PerformanceTiming) {
  const loadTime = timing.loadEventEnd - timing.navigationStart
  
  if (loadTime > 3000) {
    Sentry.addBreadcrumb({
      message: 'Slow page load detected',
      level: 'warning',
      data: {
        loadTime,
        url: window.location.href,
      },
    })
  }
}

// Network error tracking
export function trackNetworkError(
  url: string, 
  status: number, 
  method: string,
  duration: number
) {
  Sentry.addBreadcrumb({
    message: 'Network request failed',
    level: 'error',
    data: { url, status, method, duration },
  })
  
  if (status >= 500) {
    Sentry.captureMessage(`Server Error: ${status} on ${method} ${url}`, 'error')
  }
}
```

#### Error Classification and Routing
```typescript
// src/lib/monitoring/error-classification.ts
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  DATA_INTEGRITY = 'data_integrity'
}

export function classifyError(error: Error): {
  severity: ErrorSeverity
  category: ErrorCategory
  shouldAlert: boolean
} {
  const message = error.message.toLowerCase()
  
  // Critical errors requiring immediate attention
  if (message.includes('security') || message.includes('unauthorized')) {
    return {
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.SECURITY,
      shouldAlert: true
    }
  }
  
  // Authentication errors
  if (message.includes('auth') || message.includes('login')) {
    return {
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.AUTHENTICATION,
      shouldAlert: true
    }
  }
  
  // Network errors
  if (message.includes('network') || message.includes('fetch')) {
    return {
      severity: ErrorSeverity.MEDIUM,
      category: ErrorCategory.NETWORK,
      shouldAlert: false
    }
  }
  
  // Default classification
  return {
    severity: ErrorSeverity.LOW,
    category: ErrorCategory.VALIDATION,
    shouldAlert: false
  }
}
```

### Health Check Implementation

#### Comprehensive Health Monitoring
```typescript
// src/pages/api/health.ts
import { NextApiRequest, NextApiResponse } from 'next'

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  checks: {
    database: boolean
    auth: boolean
    external_apis: boolean
  }
  metrics: {
    uptime: number
    memory_usage: number
    response_time: number
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResult>
) {
  const startTime = Date.now()
  
  try {
    // Check database connectivity
    const dbHealthy = await checkDatabase()
    
    // Check authentication service
    const authHealthy = await checkAuthService()
    
    // Check external APIs
    const externalApisHealthy = await checkExternalAPIs()
    
    const checks = {
      database: dbHealthy,
      auth: authHealthy,
      external_apis: externalApisHealthy,
    }
    
    const allHealthy = Object.values(checks).every(Boolean)
    const responseTime = Date.now() - startTime
    
    const result: HealthCheckResult = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
      metrics: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        response_time: responseTime,
      },
    }
    
    res.status(allHealthy ? 200 : 503).json(result)
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: false,
        auth: false,
        external_apis: false,
      },
      metrics: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage().heapUsed / 1024 / 1024,
        response_time: Date.now() - startTime,
      },
    })
  }
}

async function checkDatabase(): Promise<boolean> {
  // Implement database health check
  try {
    // Example: Simple query to check connectivity
    return true
  } catch {
    return false
  }
}

async function checkAuthService(): Promise<boolean> {
  // Implement auth service health check
  try {
    // Example: Verify Clerk service connectivity
    return true
  } catch {
    return false
  }
}

async function checkExternalAPIs(): Promise<boolean> {
  // Implement external API health checks
  try {
    // Example: Check Convex backend
    return true
  } catch {
    return false
  }
}
```

### Uptime and Availability Monitoring

#### Synthetic Monitoring
```javascript
// monitoring/synthetic-tests.js
const { chromium } = require('playwright')

async function runSyntheticTests() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // Test critical user journey
    await page.goto(process.env.PRODUCTION_URL)
    
    // Check page load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 5000 })
    
    // Test authentication
    await page.click('[data-testid="sign-in-button"]')
    await page.waitForSelector('[data-testid="auth-form"]', { timeout: 3000 })
    
    // Test journal creation
    await page.goto(`${process.env.PRODUCTION_URL}/journal/new`)
    await page.waitForSelector('[data-testid="journal-editor"]', { timeout: 3000 })
    
    return { success: true, timestamp: new Date().toISOString() }
  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      timestamp: new Date().toISOString() 
    }
  } finally {
    await browser.close()
  }
}

// Run every 5 minutes
setInterval(async () => {
  const result = await runSyntheticTests()
  
  // Send results to monitoring service
  await fetch(process.env.MONITORING_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  })
}, 5 * 60 * 1000)
```

### Security Monitoring

#### Runtime Security Detection
```typescript
// src/lib/monitoring/security.ts
export class SecurityMonitor {
  private static instance: SecurityMonitor
  private suspiciousActivityCount = new Map<string, number>()

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }

  detectAnomalousRequest(request: {
    ip: string
    userAgent: string
    endpoint: string
    userId?: string
  }) {
    const key = `${request.ip}-${request.endpoint}`
    const count = this.suspiciousActivityCount.get(key) || 0
    
    // Rate limiting detection
    if (count > 100) { // 100 requests per minute threshold
      this.reportSecurityEvent('Rate Limit Exceeded', {
        ip: request.ip,
        endpoint: request.endpoint,
        count,
        userAgent: request.userAgent
      })
      return true
    }
    
    this.suspiciousActivityCount.set(key, count + 1)
    
    // Clear counts every minute
    setTimeout(() => {
      this.suspiciousActivityCount.delete(key)
    }, 60000)
    
    return false
  }

  detectSQLInjectionAttempt(input: string): boolean {
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
      /(--|;|\/\*|\*\/)/,
      /(\b(or|and)\s+\d+\s*=\s*\d+)/i
    ]
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        this.reportSecurityEvent('SQL Injection Attempt', { input })
        return true
      }
    }
    
    return false
  }

  detectXSSAttempt(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi
    ]
    
    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        this.reportSecurityEvent('XSS Attempt', { input })
        return true
      }
    }
    
    return false
  }

  private reportSecurityEvent(event: string, data: any) {
    // Log to security monitoring service
    fetch('/api/security/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
        severity: 'high'
      })
    }).catch(console.error)
    
    // Also log to Sentry
    Sentry.captureMessage(`Security Event: ${event}`, {
      level: 'warning',
      extra: data
    })
  }
}
```

### Performance Alerting

#### Alert Configuration
```typescript
// src/lib/monitoring/alerts.ts
export interface AlertRule {
  metric: string
  threshold: number
  operator: 'gt' | 'lt' | 'eq'
  duration: number // minutes
  severity: 'low' | 'medium' | 'high' | 'critical'
  channels: string[]
}

export const alertRules: AlertRule[] = [
  {
    metric: 'error_rate',
    threshold: 0.05, // 5%
    operator: 'gt',
    duration: 5,
    severity: 'high',
    channels: ['#alerts', '#dev-team']
  },
  {
    metric: 'response_time_p95',
    threshold: 2000, // 2 seconds
    operator: 'gt',
    duration: 10,
    severity: 'medium',
    channels: ['#performance']
  },
  {
    metric: 'memory_usage',
    threshold: 0.85, // 85%
    operator: 'gt',
    duration: 15,
    severity: 'medium',
    channels: ['#infrastructure']
  },
  {
    metric: 'database_connections',
    threshold: 0.9, // 90% of pool
    operator: 'gt',
    duration: 5,
    severity: 'critical',
    channels: ['#alerts', '#database-team']
  }
]

export async function evaluateAlerts(metrics: Record<string, number>) {
  for (const rule of alertRules) {
    const value = metrics[rule.metric]
    if (value === undefined) continue
    
    const shouldAlert = 
      (rule.operator === 'gt' && value > rule.threshold) ||
      (rule.operator === 'lt' && value < rule.threshold) ||
      (rule.operator === 'eq' && value === rule.threshold)
    
    if (shouldAlert) {
      await sendAlert(rule, value)
    }
  }
}

async function sendAlert(rule: AlertRule, value: number) {
  const alert = {
    metric: rule.metric,
    value,
    threshold: rule.threshold,
    severity: rule.severity,
    timestamp: new Date().toISOString(),
    message: `${rule.metric} is ${value} (threshold: ${rule.threshold})`
  }
  
  for (const channel of rule.channels) {
    await fetch('/api/alerts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...alert, channel })
    })
  }
}
```

---

**Related Documentation:**
- [Quality Metrics and Reporting](quality-metrics-and-reporting.md) - Performance metrics
- [Static Analysis and Security](static-analysis-and-security.md) - Security monitoring
- [Dependency and Build Validation](dependency-and-build-validation.md) - Build monitoring

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Next Review**: February 2025