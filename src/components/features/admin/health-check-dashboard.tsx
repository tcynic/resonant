/**
 * Health Check Dashboard (Story AI-Migration.6)
 * System health monitoring with service status visualization
 */

'use client'

import React, { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Select from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Activity,
  Database,
  Server,
  Globe,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  // TODO: Implement trend indicators for health metrics
  // TrendingUp,
  // TrendingDown,
} from 'lucide-react'
import {
  // TODO: Implement health trend line charts
  // LineChart,
  // Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
type ServiceType =
  | 'ai_service'
  | 'database'
  | 'queue'
  | 'external_dependency'
  | 'circuit_breaker'
type TimeWindow = '1h' | '24h' | '7d'

const SERVICE_ICONS = {
  ai_service: Activity,
  database: Database,
  queue: Server,
  external_dependency: Globe,
  circuit_breaker: Zap,
}

const STATUS_COLORS = {
  healthy: 'text-green-600 bg-green-50 border-green-200',
  degraded: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  unhealthy: 'text-red-600 bg-red-50 border-red-200',
  unknown: 'text-gray-600 bg-gray-50 border-gray-200',
}

const STATUS_ICONS = {
  healthy: CheckCircle,
  degraded: AlertTriangle,
  unhealthy: XCircle,
  unknown: Clock,
}

export function HealthCheckDashboard() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h')
  const [selectedService, setSelectedService] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  // Query current system health
  const systemHealth = useQuery(
    api.monitoring.health_checks.getSystemHealthStatus,
    {
      includeDetails: true,
    }
  )

  // Query health check history
  const healthHistory = useQuery(
    api.monitoring.health_checks.getHealthCheckHistory,
    {
      service: selectedService === 'all' ? undefined : selectedService,
      timeWindow,
      limit: 200,
    }
  )

  // Mutation to trigger manual health check
  const triggerHealthCheck = useMutation(
    api.monitoring.health_checks.triggerHealthCheck
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await triggerHealthCheck({})
      // Wait a moment for the health check to complete
      setTimeout(() => setRefreshing(false), 2000)
    } catch (error) {
      console.error('Failed to trigger health check:', error)
      setRefreshing(false)
    }
  }

  if (!systemHealth || !healthHistory) {
    return <DashboardSkeleton />
  }

  const getStatusBadgeVariant = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return 'success'
      case 'degraded':
        return 'warning'
      case 'unhealthy':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const formatLastChecked = (timestamp: number) => {
    const ago = Date.now() - timestamp
    const minutes = Math.floor(ago / (60 * 1000))
    const hours = Math.floor(ago / (60 * 60 * 1000))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  // Group services by type for better organization
  const servicesByType =
    systemHealth.serviceDetails?.reduce(
      (
        acc: Record<string, unknown[]>,
        service: { serviceType: string; [key: string]: unknown }
      ) => {
        if (!acc[service.serviceType]) {
          acc[service.serviceType] = []
        }
        acc[service.serviceType].push(service)
        return acc
      },
      {} as Record<
        ServiceType,
        {
          service: string
          serviceType: ServiceType
          status: HealthStatus
          message: string
          responseTime: number
          checkedAt: number
          details?: Record<string, unknown>
        }[]
      >
    ) || {}

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Health Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Real-time service health checks and dependency monitoring
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={selectedService}
            onChange={e => setSelectedService(e.target.value)}
            options={[
              { value: 'all', label: 'All Services' },
              ...(systemHealth.serviceDetails?.map(
                (service: { service: string; [key: string]: unknown }) => ({
                  value: service.service,
                  label: service.service,
                })
              ) || []),
            ]}
            className="w-40"
          />

          <Select
            value={timeWindow}
            onChange={e => setTimeWindow(e.target.value as TimeWindow)}
            options={[
              { value: '1h', label: '1 Hour' },
              { value: '24h', label: '24 Hours' },
              { value: '7d', label: '7 Days' },
            ]}
            className="w-32"
          />

          <Button onClick={handleRefresh} disabled={refreshing} size="sm">
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            Check Now
          </Button>
        </div>
      </div>

      {/* Overall System Health */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Overall System Health</h2>
              <p className="text-sm text-gray-600">
                Last checked:{' '}
                {systemHealth.lastChecked
                  ? formatLastChecked(systemHealth.lastChecked)
                  : 'Never'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold mb-1">
                {systemHealth.healthScore}%
              </div>
              <Badge variant={getStatusBadgeVariant(systemHealth.status)}>
                {systemHealth.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {/* Health Score Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Health Score</span>
                <span>{systemHealth.healthScore}% healthy</span>
              </div>
              <Progress value={systemHealth.healthScore} className="h-3" />
            </div>

            {/* Services Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {systemHealth.servicesSummary.healthy}
                </div>
                <div className="text-sm text-green-600">Healthy</div>
              </div>

              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {systemHealth.servicesSummary.degraded}
                </div>
                <div className="text-sm text-yellow-600">Degraded</div>
              </div>

              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {systemHealth.servicesSummary.unhealthy}
                </div>
                <div className="text-sm text-red-600">Unhealthy</div>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {systemHealth.servicesSummary.total}
                </div>
                <div className="text-sm text-gray-600">Total Services</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Details Tabs */}
      <Tabs defaultValue="services" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="services">Service Status</TabsTrigger>
          <TabsTrigger value="history">Health History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          {Object.entries(servicesByType).map(
            ([serviceType, services]: [string, unknown[]]) => (
              <Card key={serviceType}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {React.createElement(
                      SERVICE_ICONS[serviceType as ServiceType],
                      {
                        className: 'w-5 h-5',
                      }
                    )}
                    {serviceType.replace('_', ' ').toUpperCase()} Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map(service => {
                      const StatusIcon =
                        STATUS_ICONS[service.status as HealthStatus]
                      return (
                        <div
                          key={service.service}
                          className={`p-4 border rounded-lg ${STATUS_COLORS[service.status as HealthStatus]}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{service.service}</h4>
                            <StatusIcon className="w-5 h-5" />
                          </div>

                          <p className="text-sm mb-2">{service.message}</p>

                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span>Response Time:</span>
                              <span>{service.responseTime}ms</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Last Check:</span>
                              <span>
                                {formatLastChecked(service.checkedAt)}
                              </span>
                            </div>
                          </div>

                          {/* Service-specific details */}
                          {service.details &&
                            Object.keys(service.details).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs cursor-pointer">
                                  Details
                                </summary>
                                <div className="mt-1 text-xs">
                                  {Object.entries(service.details).map(
                                    ([key, value]) => (
                                      <div
                                        key={key}
                                        className="flex justify-between"
                                      >
                                        <span>{key}:</span>
                                        <span>
                                          {typeof value === 'number'
                                            ? key.includes('Rate') ||
                                              key.includes('Percentage')
                                              ? `${(value * 100).toFixed(1)}%`
                                              : value.toFixed(2)
                                            : String(value)}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </details>
                            )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Health Check History</CardTitle>
            </CardHeader>
            <CardContent>
              {healthHistory.results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <div>No health check history available</div>
                  <div className="text-sm">
                    Run a health check to see results here
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Health Trend Chart */}
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={healthHistory.results.map(
                          (result: {
                            checkedAt: string
                            status: string
                            [key: string]: unknown
                          }) => ({
                            timestamp: result.checkedAt,
                            healthScore:
                              result.status === 'healthy'
                                ? 100
                                : result.status === 'degraded'
                                  ? 60
                                  : result.status === 'unhealthy'
                                    ? 20
                                    : 50,
                            responseTime: result.responseTime,
                          })
                        )}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="timestamp"
                          tickFormatter={value =>
                            new Date(value).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          }
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip
                          labelFormatter={value =>
                            new Date(value).toLocaleString()
                          }
                          formatter={(value, name) => [
                            name === 'healthScore' ? `${value}%` : `${value}ms`,
                            name === 'healthScore'
                              ? 'Health Score'
                              : 'Response Time',
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="healthScore"
                          stroke="#3B82F6"
                          fill="#3B82F680"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Recent Health Checks */}
                  <div className="space-y-2">
                    <h4 className="font-semibold">Recent Health Checks</h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {healthHistory.results
                        .slice(-20)
                        .reverse()
                        .map(
                          (
                            result: {
                              status: string
                              checkedAt: string
                              [key: string]: unknown
                            },
                            index: number
                          ) => {
                            const StatusIcon =
                              STATUS_ICONS[result.status as HealthStatus]
                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 border rounded"
                              >
                                <div className="flex items-center gap-3">
                                  <StatusIcon
                                    className={`w-4 h-4 ${
                                      result.status === 'healthy'
                                        ? 'text-green-500'
                                        : result.status === 'degraded'
                                          ? 'text-yellow-500'
                                          : result.status === 'unhealthy'
                                            ? 'text-red-500'
                                            : 'text-gray-500'
                                    }`}
                                  />
                                  <div>
                                    <div className="font-medium">
                                      {result.service}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {result.message}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right text-sm text-gray-500">
                                  <div>
                                    {formatLastChecked(result.checkedAt)}
                                  </div>
                                  <div>{result.responseTime}ms</div>
                                </div>
                              </div>
                            )
                          }
                        )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Health Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Health Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Average Response Time:</span>
                    <span className="font-semibold">
                      {Math.round(healthHistory.statistics.avgResponseTime)}ms
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Healthy Checks:</span>
                    <span className="font-semibold text-green-600">
                      {healthHistory.statistics.healthyPercentage.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Total Checks:</span>
                    <span className="font-semibold">
                      {healthHistory.statistics.total}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      Status Distribution:
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-600">Healthy:</span>
                        <span>{healthHistory.statistics.healthy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-600">Degraded:</span>
                        <span>{healthHistory.statistics.degraded}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-600">Unhealthy:</span>
                        <span>{healthHistory.statistics.unhealthy}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unknown:</span>
                        <span>{healthHistory.statistics.unknown}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Health Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Health Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1">
                      {healthHistory.statistics.healthyPercentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      Overall Health Rate
                    </div>

                    <Progress
                      value={healthHistory.statistics.healthyPercentage}
                      className="h-2 mb-4"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="font-semibold text-green-600">Best</div>
                      <div className="text-green-600">100% Healthy</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded">
                      <div className="font-semibold text-red-600">Issues</div>
                      <div className="text-red-600">
                        {healthHistory.statistics.unhealthy +
                          healthHistory.statistics.degraded}{' '}
                        found
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-80 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-96 bg-gray-200 animate-pulse rounded mt-2" />
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-40 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 w-28 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>

      <div className="h-48 bg-gray-200 animate-pulse rounded" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}

export default HealthCheckDashboard
