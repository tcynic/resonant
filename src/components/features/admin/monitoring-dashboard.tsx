/**
 * Comprehensive AI Analysis Performance Dashboard (Story AI-Migration.6)
 * Real-time monitoring dashboard with key performance indicators
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Select from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  LineChart,
  Line,
  // TODO: Implement detailed monitoring charts
  // AreaChart,
  // Area,
  // BarChart,
  // Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  // TODO: Implement service distribution pie charts
  // PieChart,
  // Pie,
  // Cell,
} from 'recharts'

type TimeWindow = '1h' | '6h' | '24h' | '7d' | '30d'
type ChartType =
  | 'success_rate'
  | 'processing_time'
  | 'cost'
  | 'throughput'
  | 'error_rate'

interface DashboardProps {
  userPermissions?: 'super' | 'operations' | 'readonly'
}

const COLOR_SCHEME = {
  success: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  neutral: '#6B7280',
  primary: '#3B82F6',
}

export function MonitoringDashboard({
  userPermissions: _userPermissions = 'readonly',
}: DashboardProps) {
  // TODO: Implement user permission handling
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const userPermissions = _userPermissions
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h')
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds
  const [, setLastRefresh] = useState(Date.now())
  // TODO: Display last refresh timestamp
  // const [lastRefresh, setLastRefresh] = useState(Date.now())

  // Query system health metrics
  const systemHealth = useQuery(
    api.monitoring.dashboard_queries.getSystemHealthMetrics,
    {
      timeWindow,
    }
  )

  // Query service comparison data
  const serviceComparison = useQuery(
    api.monitoring.dashboard_queries.getServiceComparisonMetrics,
    {
      timeWindow,
    }
  )

  // Auto-refresh logic
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        setLastRefresh(Date.now())
      }, refreshInterval * 1000)

      return () => clearInterval(interval)
    }
  }, [refreshInterval])

  const handleRefresh = () => {
    setLastRefresh(Date.now())
  }

  if (!systemHealth || !serviceComparison) {
    return <DashboardSkeleton />
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Analysis Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Real-time performance metrics and system health
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={timeWindow}
            onChange={e => setTimeWindow(e.target.value as TimeWindow)}
            options={[
              { value: '1h', label: '1 Hour' },
              { value: '6h', label: '6 Hours' },
              { value: '24h', label: '24 Hours' },
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
            ]}
            className="w-32"
          />

          <Select
            value={refreshInterval.toString()}
            onChange={e => setRefreshInterval(parseInt(e.target.value))}
            options={[
              { value: '0', label: 'Manual' },
              { value: '10', label: '10 seconds' },
              { value: '30', label: '30 seconds' },
              { value: '60', label: '1 minute' },
              { value: '300', label: '5 minutes' },
            ]}
            className="w-36"
          />

          <Button onClick={handleRefresh} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <OverviewCard
          title="System Health"
          value={`${systemHealth.overview.healthScore}%`}
          status={systemHealth.overview.status}
          trend={systemHealth.trends.successRate}
        />

        <OverviewCard
          title="Success Rate"
          value={`${systemHealth.overview.successRate}%`}
          status={
            systemHealth.overview.successRate >= 95
              ? 'excellent'
              : systemHealth.overview.successRate >= 90
                ? 'good'
                : 'fair'
          }
          trend={systemHealth.trends.successRate}
        />

        <OverviewCard
          title="Avg Processing"
          value={`${Math.round(systemHealth.overview.avgProcessingTime / 1000)}s`}
          status={
            systemHealth.overview.avgProcessingTime <= 30000
              ? 'excellent'
              : systemHealth.overview.avgProcessingTime <= 60000
                ? 'good'
                : 'fair'
          }
          trend={systemHealth.trends.throughput}
        />

        <OverviewCard
          title="Total Cost"
          value={`$${systemHealth.overview.totalCost.toFixed(2)}`}
          status="good"
          trend={systemHealth.trends.cost}
        />

        <OverviewCard
          title="Throughput"
          value={`${systemHealth.performance.throughput}/hr`}
          status="good"
          trend={systemHealth.trends.throughput}
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Success Rate Chart */}
            <ChartCard
              title="Success Rate Trend"
              chartType="success_rate"
              timeWindow={timeWindow}
            />

            {/* Processing Time Chart */}
            <ChartCard
              title="Processing Time Trend"
              chartType="processing_time"
              timeWindow={timeWindow}
            />

            {/* Cost Chart */}
            <ChartCard
              title="Cost Trend"
              chartType="cost"
              timeWindow={timeWindow}
            />

            {/* Throughput Chart */}
            <ChartCard
              title="Throughput"
              chartType="throughput"
              timeWindow={timeWindow}
            />
          </div>

          {/* Service Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Service Health Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Circuit Breakers */}
                <div>
                  <h4 className="font-semibold mb-3">Circuit Breakers</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Healthy Circuits</span>
                      <Badge
                        variant={
                          systemHealth.serviceHealth.circuitBreakers.status ===
                          'all_healthy'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {systemHealth.serviceHealth.circuitBreakers.healthy} /{' '}
                        {systemHealth.serviceHealth.circuitBreakers.total}
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${(systemHealth.serviceHealth.circuitBreakers.healthy / systemHealth.serviceHealth.circuitBreakers.total) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Active Alerts */}
                <div>
                  <h4 className="font-semibold mb-3">Active Alerts</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-500">
                        {
                          systemHealth.serviceHealth.activeAlerts.bySeverity
                            .emergency
                        }
                      </div>
                      <div className="text-xs text-gray-600">Emergency</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">
                        {
                          systemHealth.serviceHealth.activeAlerts.bySeverity
                            .critical
                        }
                      </div>
                      <div className="text-xs text-gray-600">Critical</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-500">
                        {
                          systemHealth.serviceHealth.activeAlerts.bySeverity
                            .warning
                        }
                      </div>
                      <div className="text-xs text-gray-600">Warning</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Average Latency</span>
                    <span className="font-semibold">
                      {Math.round(systemHealth.performance.averageLatency)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>95th Percentile</span>
                    <span className="font-semibold">
                      {Math.round(systemHealth.performance.p95Latency)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Queue Wait Time</span>
                    <span className="font-semibold">
                      {Math.round(systemHealth.performance.queue.avgWaitTime)}ms
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Queue Size</span>
                    <span className="font-semibold">
                      {systemHealth.performance.queue.currentQueueSize}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <ChartCard
              title="Error Rate"
              chartType="error_rate"
              timeWindow={timeWindow}
            />
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {serviceComparison.services.map(service => (
                  <div key={service.service} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold">{service.service}</h4>
                      <Badge
                        variant={
                          service.health.status === 'excellent'
                            ? 'default'
                            : service.health.status === 'good'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {service.health.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Success Rate</div>
                        <div className="font-semibold">
                          {(service.metrics.successRate * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Avg Time</div>
                        <div className="font-semibold">
                          {Math.round(service.metrics.avgProcessingTime)}ms
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Total Cost</div>
                        <div className="font-semibold">
                          ${service.metrics.totalCost.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Requests</div>
                        <div className="font-semibold">
                          {service.metrics.totalRequests}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-red-500 mb-2">
                    {
                      systemHealth.serviceHealth.activeAlerts.bySeverity
                        .emergency
                    }
                  </div>
                  <div className="text-sm text-gray-600">Emergency Alerts</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Require immediate attention
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-orange-500 mb-2">
                    {
                      systemHealth.serviceHealth.activeAlerts.bySeverity
                        .critical
                    }
                  </div>
                  <div className="text-sm text-gray-600">Critical Alerts</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Service degradation detected
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold text-yellow-500 mb-2">
                    {systemHealth.serviceHealth.activeAlerts.bySeverity.warning}
                  </div>
                  <div className="text-sm text-gray-600">Warning Alerts</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Performance thresholds exceeded
                  </div>
                </div>
              </div>

              {systemHealth.serviceHealth.activeAlerts.total === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-2xl mb-2">🎉</div>
                  <div>No active alerts - All systems healthy!</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OverviewCard({
  title,
  value,
  status,
  trend,
}: {
  title: string
  value: string
  status: string
  trend: {
    direction: string
    percentChange?: number
  }
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600'
      case 'good':
        return 'text-blue-600'
      case 'fair':
        return 'text-yellow-600'
      case 'poor':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className={`text-2xl font-bold ${getStatusColor(status)}`}>
              {value}
            </p>
          </div>
          <div className="flex items-center">
            {getTrendIcon(trend?.direction)}
          </div>
        </div>
        {trend?.percentChange !== undefined && (
          <p className="text-xs text-gray-500 mt-1">
            {trend.percentChange > 0 ? '+' : ''}
            {trend.percentChange.toFixed(1)}% vs prev period
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ChartCard({
  title,
  chartType,
  timeWindow,
}: {
  title: string
  chartType: ChartType
  timeWindow: TimeWindow
}) {
  const chartData = useQuery(api.monitoring.dashboard_queries.getChartData, {
    chartType,
    timeWindow,
    granularity:
      timeWindow === '1h' ? 'minute' : timeWindow === '24h' ? 'hour' : 'day',
  })

  if (!chartData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-100 animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  const formatValue = (value: number) => {
    switch (chartType) {
      case 'success_rate':
      case 'error_rate':
        return `${value.toFixed(1)}%`
      case 'processing_time':
        return `${Math.round(value)}ms`
      case 'cost':
        return `$${value.toFixed(2)}`
      default:
        return value.toString()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {title}
          <div className="text-sm text-gray-600">
            Current: {formatValue(chartData.summary.current)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData.dataPoints}>
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
            <YAxis tickFormatter={formatValue} />
            <Tooltip
              labelFormatter={value => new Date(value).toLocaleString()}
              formatter={(value: number) => [formatValue(value), title]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={COLOR_SCHEME.primary}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-96 bg-gray-200 animate-pulse rounded mt-2" />
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 w-36 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 w-24 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}

export default MonitoringDashboard
