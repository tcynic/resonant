// Dynamic imports for large admin components to improve webpack caching
import { lazy } from 'react'

// Large dashboard components that are loaded on demand
export const CircuitBreakerDashboard = lazy(() =>
  import('./circuit-breaker-dashboard').then(module => ({
    default: module.CircuitBreakerDashboard,
  }))
)
export const CostMonitoringDashboard = lazy(() =>
  import('./cost-monitoring-dashboard').then(module => ({
    default: module.CostMonitoringDashboard,
  }))
)
export const FailureAnalysisDashboard = lazy(() =>
  import('./failure-analysis-dashboard').then(module => ({
    default: module.FailureAnalysisDashboard,
  }))
)
export const HealthCheckDashboard = lazy(() =>
  import('./health-check-dashboard').then(module => ({
    default: module.HealthCheckDashboard,
  }))
)
export const LangExtractPerformanceDashboard = lazy(() =>
  import('./langextract-performance-dashboard').then(module => ({
    default: module.default,
  }))
)
export const MonitoringDashboard = lazy(() =>
  import('./monitoring-dashboard').then(module => ({
    default: module.MonitoringDashboard,
  }))
)
export const SuccessRateDashboard = lazy(() =>
  import('./success-rate-dashboard').then(module => ({
    default: module.SuccessRateDashboard,
  }))
)

// Type definitions for component props
export type {
  CircuitBreakerDashboardProps,
  CostMonitoringDashboardProps,
  FailureAnalysisDashboardProps,
  HealthCheckDashboardProps,
  LangExtractPerformanceDashboardProps,
  MonitoringDashboardProps,
  SuccessRateDashboardProps,
} from './types'
