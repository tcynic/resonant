/**
 * Circuit Breaker Dashboard Component
 * Story AI-Migration.4: Comprehensive Error Handling & Recovery
 *
 * Provides real-time monitoring and control of circuit breaker status
 * with comprehensive metrics, alerts, and historical trend analysis.
 */

'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  Activity,
  TrendingUp,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'

interface CircuitBreakerStatus {
  service: string
  status: 'open' | 'closed' | 'half-open'
  isHealthy: boolean
  failureCount: number
  lastFailure?: number
  nextAttemptTime?: number
  updatedAt: number
}

interface CircuitBreakerAlert {
  level: 'info' | 'warning' | 'critical'
  message: string
  service: string
  timestamp: number
  details?: unknown
}

interface CircuitBreakerSummary {
  totalServices: number
  healthyServices: number
  openCircuits: number
  recentFailures: number
  avgFailureRate: number
  lastUpdate: number
}

export function CircuitBreakerDashboard() {
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [alertsSince, setAlertsSince] = useState<number>(
    Date.now() - 60 * 60 * 1000
  ) // Last hour

  // Query circuit breaker data
  const statuses = useQuery(api.circuit_breaker_queries.getAllStatuses)
  const alerts = useQuery(api.circuit_breaker_queries.getAlerts, {
    since: alertsSince,
  }) as CircuitBreakerAlert[] | undefined
  const summary = useQuery(api.circuit_breaker_queries.getSummary) as
    | CircuitBreakerSummary
    | undefined
  const healthStatus = useQuery(
    api.circuit_breaker_queries.getHealthStatus,
    selectedService ? { service: selectedService } : 'skip'
  )

  // Mutations for circuit breaker control
  // const forceOpen = useMutation(api.circuit_breaker_queries.forceOpen) // TODO: Implement UI controls
  const forceClose = useMutation(api.circuit_breaker_queries.forceClose)

  // TODO: Implement circuit breaker control handlers
  // const handleForceOpen = async (service: string) => { ... }

  const handleForceClose = async (service: string) => {
    try {
      await forceClose({ service })
      // TODO: Add toast notification for success
    } catch (error) {
      // TODO: Add toast notification for error
      console.error('Failed to force close circuit breaker:', error)
    }
  }

  // Memoized computed values
  const statusesByHealth = useMemo(() => {
    if (!statuses) return { healthy: [], unhealthy: [], open: [] }

    return {
      healthy: statuses.filter(s => s.isHealthy && s.status === 'closed'),
      unhealthy: statuses.filter(s => !s.isHealthy && s.status === 'closed'),
      open: statuses.filter(s => s.status === 'open'),
    }
  }, [statuses])

  const criticalAlerts = useMemo(() => {
    return alerts?.filter(a => a.level === 'critical') || []
  }, [alerts])

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'half-open':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'closed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (!statuses || !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Circuit Breaker Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor and control service circuit breakers
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {formatTimestamp(summary.lastUpdate)}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Services</p>
              <p className="text-2xl font-bold">{summary.totalServices}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Healthy</p>
              <p className="text-2xl font-bold text-green-600">
                {summary.healthyServices}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Open Circuits</p>
              <p className="text-2xl font-bold text-red-600">
                {summary.openCircuits}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recent Failures</p>
              <p className="text-2xl font-bold text-orange-600">
                {summary.recentFailures}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Failure Rate</p>
              <p className="text-2xl font-bold">{summary.avgFailureRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-red-800">
              Critical Alerts
            </h2>
          </div>
          <div className="space-y-2">
            {criticalAlerts.slice(0, 3).map((alert, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white p-3 rounded border"
              >
                <div>
                  <p className="font-medium text-red-800">{alert.message}</p>
                  <p className="text-sm text-red-600">
                    {formatTimestamp(alert.timestamp)}
                  </p>
                </div>
                <Button variant="secondary" size="sm">
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Status List */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Service Status</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {statusesByHealth.open.map(service => (
              <div
                key={service.service}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded cursor-pointer hover:bg-red-100"
                onClick={() => setSelectedService(service.service)}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium text-red-800">
                      {service.service}
                    </p>
                    <p className="text-sm text-red-600">
                      Failures: {service.failureCount}
                      {service.nextAttemptTime && (
                        <span className="ml-2">
                          • Next attempt:{' '}
                          {formatDuration(service.nextAttemptTime - Date.now())}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation()
                    handleForceClose(service.service)
                  }}
                >
                  Force Close
                </Button>
              </div>
            ))}

            {statusesByHealth.unhealthy.map(service => (
              <div
                key={service.service}
                className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded cursor-pointer hover:bg-yellow-100"
                onClick={() => setSelectedService(service.service)}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium text-yellow-800">
                      {service.service}
                    </p>
                    <p className="text-sm text-yellow-600">
                      Failures: {service.failureCount}
                      {service.lastFailure && (
                        <span className="ml-2">
                          • Last failure:{' '}
                          {formatDuration(Date.now() - service.lastFailure)} ago
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {statusesByHealth.healthy.map(service => (
              <div
                key={service.service}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded cursor-pointer hover:bg-green-100"
                onClick={() => setSelectedService(service.service)}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium text-green-800">
                      {service.service}
                    </p>
                    <p className="text-sm text-green-600">
                      Healthy • Failures: {service.failureCount}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Alerts */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Alerts</h2>
            <select
              value={alertsSince}
              onChange={e => setAlertsSince(Number(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value={Date.now() - 60 * 60 * 1000}>Last Hour</option>
              <option value={Date.now() - 6 * 60 * 60 * 1000}>
                Last 6 Hours
              </option>
              <option value={Date.now() - 24 * 60 * 60 * 1000}>
                Last 24 Hours
              </option>
            </select>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts?.map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded border ${getAlertLevelColor(alert.level)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm opacity-75">
                      {alert.service} • {formatTimestamp(alert.timestamp)}
                    </p>
                  </div>
                  <span className="text-xs uppercase font-medium px-2 py-1 rounded bg-white bg-opacity-50">
                    {alert.level}
                  </span>
                </div>
              </div>
            ))}
            {(!alerts || alerts.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No alerts in the selected time range
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Service Detail Panel */}
      {selectedService && healthStatus && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Service Details: {selectedService}
            </h2>
            <Button
              variant="secondary"
              onClick={() => setSelectedService(null)}
            >
              Close
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-2xl font-bold">
                {healthStatus.metrics.failureRate}%
              </p>
              <p className="text-sm text-gray-600">Current Failure Rate</p>
              {healthStatus.metrics.failureRateTrend !== 0 && (
                <p
                  className={`text-xs ${healthStatus.metrics.failureRateTrend > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {healthStatus.metrics.failureRateTrend > 0 ? '↑' : '↓'}{' '}
                  {Math.abs(healthStatus.metrics.failureRateTrend)}% from
                  yesterday
                </p>
              )}
            </div>

            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-2xl font-bold">
                {healthStatus.metrics.avgResponseTime
                  ? `${Math.round(healthStatus.metrics.avgResponseTime)}ms`
                  : 'N/A'}
              </p>
              <p className="text-sm text-gray-600">Avg Response Time</p>
              {healthStatus.metrics.responseTimeTrend !== 0 && (
                <p
                  className={`text-xs ${healthStatus.metrics.responseTimeTrend > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {healthStatus.metrics.responseTimeTrend > 0 ? '↑' : '↓'}{' '}
                  {Math.abs(healthStatus.metrics.responseTimeTrend)}% from
                  yesterday
                </p>
              )}
            </div>

            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-2xl font-bold">
                {healthStatus.metrics.errorCount24h +
                  healthStatus.metrics.successCount24h}
              </p>
              <p className="text-sm text-gray-600">Total Requests (24h)</p>
              <p className="text-xs text-gray-500">
                {healthStatus.metrics.errorCount24h} errors,{' '}
                {healthStatus.metrics.successCount24h} success
              </p>
            </div>
          </div>

          {/* Recommendations */}
          {healthStatus.recommendations.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Recommendations</h3>
              <ul className="space-y-1">
                {healthStatus.recommendations.map(
                  (rec: string, index: number) => (
                    <li
                      key={index}
                      className="text-sm text-gray-700 flex items-start gap-2"
                    >
                      <span className="text-blue-500 mt-1">•</span>
                      {rec}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* Service Alerts */}
          {healthStatus.alerts.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Service Alerts</h3>
              <div className="space-y-2">
                {healthStatus.alerts.map(
                  (
                    alert: {
                      level: 'critical' | 'warning' | 'info'
                      message: string
                      timestamp: number
                    },
                    index: number
                  ) => (
                    <div
                      key={index}
                      className={`p-3 rounded border ${getAlertLevelColor(alert.level)}`}
                    >
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm opacity-75">
                        {formatTimestamp(alert.timestamp)}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
