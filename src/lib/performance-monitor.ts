/**
 * Performance monitoring utilities for dashboard load times and metrics
 * Tracks and reports on dashboard performance for optimization
 */

import React from 'react'

export interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, any>
}

export interface DashboardPerformanceData {
  pageLoadTime: number
  componentRenderTimes: Record<string, number>
  dataFetchTimes: Record<string, number>
  chartRenderTimes: Record<string, number>
  totalDataPoints: number
  memoryUsage?: number
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private enabled: boolean = true

  constructor() {
    // Disable in production unless explicitly enabled
    this.enabled =
      process.env.NODE_ENV === 'development' ||
      process.env.ENABLE_PERFORMANCE_MONITORING === 'true'
  }

  /**
   * Start timing a performance metric
   */
  startTiming(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    })
  }

  /**
   * End timing a performance metric
   */
  endTiming(name: string): number {
    if (!this.enabled) return 0

    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`Performance metric "${name}" was not started`)
      return 0
    }

    const endTime = performance.now()
    const duration = endTime - metric.startTime

    metric.endTime = endTime
    metric.duration = duration

    return duration
  }

  /**
   * Get timing for a specific metric
   */
  getTiming(name: string): number {
    const metric = this.metrics.get(name)
    return metric?.duration || 0
  }

  /**
   * Get all collected metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(
      m => m.duration !== undefined
    )
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear()
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    if (!this.enabled) return

    const metrics = this.getAllMetrics()
    if (metrics.length === 0) return

    console.group('🚀 Dashboard Performance Summary')

    metrics.forEach(metric => {
      const duration = metric.duration!
      const status = this.getPerformanceStatus(metric.name, duration)

      console.log(
        `${status.emoji} ${metric.name}: ${duration.toFixed(2)}ms ${status.message}`
      )

      if (metric.metadata) {
        console.log('  Metadata:', metric.metadata)
      }
    })

    const totalTime = metrics.reduce((sum, m) => sum + (m.duration || 0), 0)
    console.log(`📊 Total measured time: ${totalTime.toFixed(2)}ms`)

    console.groupEnd()
  }

  /**
   * Get performance status for a metric
   */
  private getPerformanceStatus(
    metricName: string,
    duration: number
  ): {
    emoji: string
    message: string
  } {
    const thresholds = this.getPerformanceThresholds(metricName)

    if (duration <= thresholds.good) {
      return { emoji: '✅', message: '(Excellent)' }
    } else if (duration <= thresholds.acceptable) {
      return { emoji: '⚠️', message: '(Acceptable)' }
    } else {
      return { emoji: '❌', message: '(Needs optimization)' }
    }
  }

  /**
   * Get performance thresholds for different metric types
   */
  private getPerformanceThresholds(metricName: string): {
    good: number
    acceptable: number
  } {
    const thresholds: Record<string, { good: number; acceptable: number }> = {
      'dashboard-page-load': { good: 1000, acceptable: 2000 },
      'dashboard-data-fetch': { good: 300, acceptable: 800 },
      'health-score-render': { good: 100, acceptable: 300 },
      'trend-chart-render': { good: 200, acceptable: 500 },
      'recent-activity-render': { good: 50, acceptable: 150 },
      'entry-history-render': { good: 100, acceptable: 300 },
    }

    return thresholds[metricName] || { good: 200, acceptable: 500 }
  }

  /**
   * Measure memory usage (if available)
   */
  measureMemoryUsage(): number | undefined {
    if (!this.enabled) return undefined

    // @ts-ignore - performance.memory is not in TypeScript types but exists in Chrome
    if (performance.memory) {
      // @ts-ignore
      return performance.memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
    }

    return undefined
  }

  /**
   * Generate performance report
   */
  generateReport(): DashboardPerformanceData {
    const metrics = this.getAllMetrics()
    const report: DashboardPerformanceData = {
      pageLoadTime: this.getTiming('dashboard-page-load'),
      componentRenderTimes: {},
      dataFetchTimes: {},
      chartRenderTimes: {},
      totalDataPoints: 0,
      memoryUsage: this.measureMemoryUsage(),
    }

    metrics.forEach(metric => {
      const duration = metric.duration!

      if (metric.name.includes('render')) {
        report.componentRenderTimes[metric.name] = duration
      } else if (
        metric.name.includes('fetch') ||
        metric.name.includes('data')
      ) {
        report.dataFetchTimes[metric.name] = duration
      } else if (metric.name.includes('chart')) {
        report.chartRenderTimes[metric.name] = duration
      }

      // Extract data points from metadata
      if (metric.metadata?.dataPoints) {
        report.totalDataPoints += metric.metadata.dataPoints
      }
    })

    return report
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * React hook for measuring component render performance
 */
export function usePerformanceMonitor(componentName: string) {
  const startRender = () => {
    performanceMonitor.startTiming(`${componentName}-render`)
  }

  const endRender = () => {
    return performanceMonitor.endTiming(`${componentName}-render`)
  }

  return { startRender, endRender }
}

/**
 * Higher-order component for automatic performance monitoring
 */

export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    React.useEffect(() => {
      performanceMonitor.startTiming(`${componentName}-render`)

      return () => {
        performanceMonitor.endTiming(`${componentName}-render`)
      }
    })

    return React.createElement(WrappedComponent, props)
  }
}

/**
 * Utility to measure async operations
 */
export async function measureAsyncOperation<T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  performanceMonitor.startTiming(name, metadata)

  try {
    const result = await operation()
    performanceMonitor.endTiming(name)
    return result
  } catch (error) {
    performanceMonitor.endTiming(name)
    throw error
  }
}

/**
 * Web Vitals integration (if available)
 */
export function initializeWebVitals() {
  if (!performanceMonitor['enabled']) return

  // Core Web Vitals
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.entryType === 'largest-contentful-paint') {
        performanceMonitor.startTiming('lcp')
        performanceMonitor.endTiming('lcp')
        // @ts-ignore
        performanceMonitor.metrics.get('lcp')!.duration = entry.startTime
      }
    })
  })

  try {
    observer.observe({ entryTypes: ['largest-contentful-paint'] })
  } catch (e) {
    // Observer not supported
  }
}

/**
 * Export performance data for analytics
 */
export function exportPerformanceData(): string {
  const report = performanceMonitor.generateReport()
  return JSON.stringify(report, null, 2)
}

// Initialize Web Vitals monitoring in browser
if (typeof window !== 'undefined') {
  initializeWebVitals()
}
