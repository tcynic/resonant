'use client'

import React from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

interface LangExtractPerformanceDashboardProps {
  className?: string
}

interface PerformanceStatsProps {
  hours?: number
}

function PerformanceStats({ hours = 24 }: PerformanceStatsProps) {
  // Note: These would be the correct API calls once Convex functions are deployed
  // For now, return null to avoid API errors during development
  const stats = null // useQuery(api.monitoring.langExtractMetrics.getLangExtractPerformanceStats, { hours })
  const alerts = null // useQuery(api.monitoring.langExtractMetrics.checkLangExtractPerformanceAlerts, {})
  const errorAnalysis = null // useQuery(api.monitoring.langExtractMetrics.getLangExtractErrorAnalysis, { hours })

  // Return placeholder for development - component will be functional once Convex functions are deployed
  return (
    <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <div className="text-center">
        <h4 className="text-lg font-medium text-gray-900 mb-2">
          LangExtract Performance Dashboard
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Performance monitoring dashboard will be available once Convex monitoring functions are deployed.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="p-3 bg-white rounded border">
            <div className="text-xl font-bold text-gray-400">--</div>
            <div className="text-xs text-gray-500">Total Requests</div>
          </div>
          <div className="p-3 bg-white rounded border">
            <div className="text-xl font-bold text-gray-400">--%</div>
            <div className="text-xs text-gray-500">Success Rate</div>
          </div>
          <div className="p-3 bg-white rounded border">
            <div className="text-xl font-bold text-gray-400">--ms</div>
            <div className="text-xs text-gray-500">Avg Processing Time</div>
          </div>
          <div className="p-3 bg-white rounded border">
            <div className="text-xl font-bold text-gray-400">--</div>
            <div className="text-xs text-gray-500">Entities Extracted</div>
          </div>
        </div>
      </div>
    </div>
  )

  // The actual implementation is commented out until Convex functions are deployed
  /*
  // Rest of the function implementation with stats, alerts, and errorAnalysis...
  if (!stats) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    )
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProcessingTimeColor = (timeMs: number) => {
    if (timeMs <= 2000) return 'text-green-600' // Under 2 seconds
    if (timeMs <= 5000) return 'text-yellow-600' // Under 5 seconds
    return 'text-red-600' // Over 5 seconds
  }

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {alerts && Array.isArray(alerts) && alerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">🚨 Active Alerts</h4>
          {alerts.map((alert: any, index: number) => (
            <div
              key={index}
              className={`p-3 rounded-lg border ${
                alert.severity === 'high' 
                  ? 'bg-red-50 border-red-200 text-red-800' 
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{alert.type.replace('_', ' ').toUpperCase()}</span>
                <span className="text-xs">{alert.severity}</span>
              </div>
              <p className="text-sm mt-1">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Core Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalRequests.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Total Requests</div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className={`text-2xl font-bold ${getSuccessRateColor(stats.successRate)}`}>
            {stats.successRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">Success Rate</div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className={`text-2xl font-bold ${getProcessingTimeColor(stats.averageProcessingTime)}`}>
            {stats.averageProcessingTime.toFixed(0)}ms
          </div>
          <div className="text-xs text-gray-600">Avg Processing Time</div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalEntitiesExtracted.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Entities Extracted</div>
        </div>
      </div>

      {/* Fallback Usage Indicator */}
      {stats.fallbackUsageRate > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900">Fallback Usage</h4>
              <p className="text-sm text-blue-700">
                {stats.fallbackUsageRate.toFixed(1)}% of requests used fallback analysis
              </p>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.fallbackUsageRate.toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      {/* Error Analysis */}
      {errorAnalysis && errorAnalysis.totalFailures > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Error Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-lg font-bold text-red-600">
                {errorAnalysis.totalFailures}
              </div>
              <div className="text-xs text-red-700">Total Failures</div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-lg font-bold text-red-600">
                {errorAnalysis.failureRate.toFixed(1)}%
              </div>
              <div className="text-xs text-red-700">Failure Rate</div>
            </div>
          </div>

          {/* Error Types Breakdown */}
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-gray-700">Error Types</h5>
            {Object.entries(errorAnalysis.errorGroups).map(([errorType, count]: [string, unknown]) => (
              <div key={errorType} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700">{errorType}</span>
                <span className="text-sm font-medium text-gray-900">{String(count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly Performance Trend */}
      {stats.hourlyBreakdown.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Hourly Performance Trend</h4>
          <div className="space-y-2">
            {stats.hourlyBreakdown.slice(-12).map((hourData: any, index: number) => {
              const hourLabel = new Date(hourData.timestamp).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })
              
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-xs text-gray-600">{hourLabel}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-700">
                      {hourData.requests} req
                    </span>
                    <span className={`text-xs font-medium ${getSuccessRateColor(hourData.successRate)}`}>
                      {hourData.successRate.toFixed(0)}%
                    </span>
                    <span className={`text-xs ${getProcessingTimeColor(hourData.averageProcessingTime)}`}>
                      {hourData.averageProcessingTime.toFixed(0)}ms
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
  */
}

export default function LangExtractPerformanceDashboard({ 
  className = '' 
}: LangExtractPerformanceDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = React.useState(24)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              LangExtract Performance Monitor
            </h3>
            <p className="text-sm text-gray-600">
              Real-time metrics and alerting for LangExtract integration
            </p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-600">Time Range:</label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded px-2 py-1"
            >
              <option value={1}>1 Hour</option>
              <option value={6}>6 Hours</option>
              <option value={24}>24 Hours</option>
              <option value={168}>7 Days</option>
            </select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <PerformanceStats hours={selectedTimeRange} />
      </CardContent>
    </Card>
  )
}