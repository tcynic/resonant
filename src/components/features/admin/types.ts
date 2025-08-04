// Type definitions for admin dashboard components

export interface CircuitBreakerDashboardProps {
  className?: string
}

export interface CostMonitoringDashboardProps {
  timeRange?: '24h' | '7d' | '30d'
  className?: string
}

export interface FailureAnalysisDashboardProps {
  showDetailed?: boolean
  className?: string
}

export interface HealthCheckDashboardProps {
  autoRefresh?: boolean
  refreshInterval?: number
  className?: string
}

export interface LangExtractPerformanceDashboardProps {
  timeRange?: number
  className?: string
}

export interface MonitoringDashboardProps {
  services?: string[]
  className?: string
}

export interface SuccessRateDashboardProps {
  timeWindow?: '1h' | '24h' | '7d'
  className?: string
}
