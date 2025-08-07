/**
 * Success Rate Tracking Dashboard (Story AI-Migration.6)
 * Specialized dashboard for AI analysis success rate monitoring
 */

'use client'

import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// TODO: Implement button actions for success rate dashboard
// import { Button } from '@/components/ui/button'
import Select from '@/components/ui/select'
import { AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import {
  // TODO: Implement success rate line charts
  // LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type TimeWindow = '1h' | '6h' | '24h' | '7d' | '30d'

interface TrendSummary {
  trend?: 'improving' | 'declining' | 'stable'
  averageSuccessRate?: number
  minSuccessRate?: number
  maxSuccessRate?: number
  totalAnalyses?: unknown
  [key: string]: unknown
}

interface TrendData {
  summary: TrendSummary
  trendData?: unknown[]
  patterns?: PatternData[]
  [key: string]: unknown
}

interface PatternData {
  type?: string
  description?: string
  severity?: 'high' | 'medium' | 'low' | 'critical'
  [key: string]: unknown
}

interface ServiceData {
  service: string
  totalAnalyses: number
  successRate: number
  performance: {
    reliability: string
  }
  avgProcessingTime: number
  avgCost: number
  fallbackRate: number
  [key: string]: unknown
}

interface ServiceComparisonData {
  comparison: ServiceData[]
  insights: {
    bestPerforming: string
    worstPerforming: string
  }
  [key: string]: unknown
}

interface MetricData {
  timeWindow: string
  successRate: number
  alert: {
    level: string
  }
  totalCount: number
  successCount: number
  [key: string]: unknown
}

export function SuccessRateDashboard() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h')
  // TODO: Implement service filtering functionality
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedService] = useState<string>('all')

  // Query success rate data
  const successRateData = useQuery(
    api.monitoring.success_rate_tracking.getRealTimeSuccessRate,
    {}
  )

  const trendData = useQuery(
    api.monitoring.success_rate_tracking.getSuccessRateTrends,
    {
      timeWindow:
        timeWindow === '1h' ? '24h' : (timeWindow as '30d' | '7d' | '24h'),
      granularity:
        timeWindow === '1h' || timeWindow === '24h'
          ? ('hourly' as const)
          : ('daily' as const),
    }
  )

  const serviceComparison = useQuery(
    api.monitoring.success_rate_tracking.compareSuccessRatesAcrossServices,
    {
      timeWindow,
    }
  )

  if (!successRateData || !trendData || !serviceComparison) {
    return <DashboardSkeleton />
  }

  const currentMetric =
    (successRateData as { metrics: MetricData[] })?.metrics?.find(
      (m: MetricData) => m.timeWindow === timeWindow
    ) || (successRateData as { metrics: MetricData[] })?.metrics?.[0]

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Success Rate Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Real-time AI analysis success rate tracking and alerts
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
        </div>
      </div>

      {/* Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Success Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {(currentMetric.successRate * 100).toFixed(1)}%
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2">
              <Badge
                variant={
                  currentMetric.alert.level === 'normal'
                    ? 'default'
                    : 'destructive'
                }
              >
                {currentMetric.alert.level}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Analyses</p>
                <p className="text-3xl font-bold">
                  {currentMetric.totalCount.toLocaleString()}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                {currentMetric.successCount} successful
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Target Achievement</p>
                <p className="text-3xl font-bold text-blue-600">
                  {((currentMetric.successRate / 0.95) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="text-sm text-gray-500">95% target</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Trend</p>
                <p className="text-lg font-semibold">
                  {(trendData as unknown as TrendData).summary.trend ===
                  'improving'
                    ? '↗️ Improving'
                    : (trendData as unknown as TrendData).summary.trend ===
                        'declining'
                      ? '↘️ Declining'
                      : '→ Stable'}
                </p>
              </div>
              {(trendData as unknown as TrendData).summary.trend ===
              'improving' ? (
                <TrendingUp className="w-6 h-6 text-green-500" />
              ) : (trendData as unknown as TrendData).summary.trend ===
                'declining' ? (
                <TrendingDown className="w-6 h-6 text-red-500" />
              ) : (
                <Activity className="w-6 h-6 text-gray-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-semibold text-yellow-600">Warning</div>
                <div className="text-sm text-gray-600">Below 92%</div>
              </div>
              <Badge variant="secondary">92%</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-semibold text-orange-600">Critical</div>
                <div className="text-sm text-gray-600">Below 90%</div>
              </div>
              <Badge variant="destructive">90%</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-semibold text-red-600">Emergency</div>
                <div className="text-sm text-gray-600">Below 85%</div>
              </div>
              <Badge variant="destructive">85%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Rate Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Success Rate Trend - {timeWindow.toUpperCase()}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={(trendData as unknown as TrendData).trendData}>
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
              <YAxis domain={[80, 100]} tickFormatter={value => `${value}%`} />
              <Tooltip
                labelFormatter={value => new Date(value).toLocaleString()}
                formatter={(value: number) => [
                  `${(value * 100).toFixed(1)}%`,
                  'Success Rate',
                ]}
              />

              {/* Threshold lines */}
              <Line
                type="monotone"
                dataKey={() => 95}
                stroke="#10B981"
                strokeDasharray="5 5"
                dot={false}
                strokeWidth={1}
              />
              <Line
                type="monotone"
                dataKey={() => 92}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                dot={false}
                strokeWidth={1}
              />
              <Line
                type="monotone"
                dataKey={() => 90}
                stroke="#EF4444"
                strokeDasharray="5 5"
                dot={false}
                strokeWidth={1}
              />

              <Area
                type="monotone"
                dataKey="successRate"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="#3B82F680"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Service Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Service Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(serviceComparison as ServiceComparisonData).comparison.map(
              (service: ServiceData) => (
                <div key={service.service} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-semibold">{service.service}</h4>
                      <p className="text-sm text-gray-600">
                        {service.totalAnalyses} requests
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {(service.successRate * 100).toFixed(1)}%
                      </div>
                      <Badge
                        variant={
                          service.performance.reliability === 'good'
                            ? 'default'
                            : service.performance.reliability === 'fair'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {service.performance.reliability}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full ${
                        service.successRate >= 0.95
                          ? 'bg-green-500'
                          : service.successRate >= 0.9
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${service.successRate * 100}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Avg Processing:</span>
                      <span className="ml-1 font-semibold">
                        {Math.round(service.avgProcessingTime)}ms
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Cost/Request:</span>
                      <span className="ml-1 font-semibold">
                        ${service.avgCost.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Fallback Rate:</span>
                      <span className="ml-1 font-semibold">
                        {(service.fallbackRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Performance Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Best Performing:</span>
                <span className="ml-1 font-semibold text-green-600">
                  {
                    (serviceComparison as ServiceComparisonData).insights
                      .bestPerforming
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-600">Needs Attention:</span>
                <span className="ml-1 font-semibold text-red-600">
                  {
                    (serviceComparison as ServiceComparisonData).insights
                      .worstPerforming
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Analysis */}
      {(() => {
        const data = trendData as unknown as TrendData
        return (
          data?.patterns &&
          Array.isArray(data.patterns) &&
          data.patterns.length > 0
        )
      })() && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Pattern Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(trendData as unknown as TrendData)?.patterns?.map(
                (pattern: PatternData, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-semibold capitalize">
                        {pattern.type?.replace('_', ' ') || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {pattern.description || 'No description'}
                      </div>
                    </div>
                    <Badge
                      variant={
                        pattern.severity === 'high'
                          ? 'destructive'
                          : pattern.severity === 'medium'
                            ? 'secondary'
                            : 'default'
                      }
                    >
                      {pattern.severity || 'low'}
                    </Badge>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-72 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-96 bg-gray-200 animate-pulse rounded mt-2" />
        </div>
        <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>

      <div className="h-64 bg-gray-200 animate-pulse rounded" />
      <div className="h-64 bg-gray-200 animate-pulse rounded" />
    </div>
  )
}

export default SuccessRateDashboard
