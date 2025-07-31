/**
 * Cost Monitoring Dashboard (Story AI-Migration.6)
 * Specialized dashboard for AI API cost tracking and budget management
 */

'use client'

import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// TODO: Implement button actions for cost monitoring dashboard
// import { Button } from '@/components/ui/button'
import Select from '@/components/ui/select'
import {
  DollarSign,
  TrendingUp,
  // TODO: Implement trend indicators for cost metrics
  // TrendingDown,
  AlertTriangle,
  Target,
} from 'lucide-react'
import {
  // TODO: Implement detailed cost trend charts
  // LineChart,
  // Line,
  // AreaChart,
  // Area,
  // BarChart,
  // Bar,
  // XAxis,
  // YAxis,
  // CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

type TimeWindow = 'daily' | 'weekly' | 'monthly'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export function CostMonitoringDashboard() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('monthly')
  const [includeProjections] = useState(true)
  // TODO: Implement projection toggle functionality
  // const [, setIncludeProjections] = useState(true)

  // Query cost metrics
  const costMetrics = useQuery(api.monitoring.cost_monitoring.getCostMetrics, {
    timeWindow,
    includeProjections,
  })

  // Query budget status
  const budgetStatus = useQuery(
    api.monitoring.cost_monitoring.getBudgetStatus,
    {
      timeWindow,
    }
  )

  // Query cost optimization recommendations
  const recommendations = useQuery(
    api.monitoring.cost_monitoring.getCostOptimizationRecommendations,
    {
      timeWindow,
    }
  )

  if (!costMetrics || !budgetStatus || !recommendations) {
    return <DashboardSkeleton />
  }

  const utilizationPercent = budgetStatus.utilization.percent * 100
  const projectedOverage = budgetStatus.projections.projectedOverage

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cost Monitoring</h1>
          <p className="text-gray-600 mt-1">
            AI API cost tracking and budget management
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={timeWindow}
            onChange={e => setTimeWindow(e.target.value as TimeWindow)}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            className="w-32"
          />
        </div>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Spend</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${budgetStatus.currentSpend.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                of ${budgetStatus.budgetLimit.toFixed(2)} budget
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Budget Utilization</p>
                <p className="text-3xl font-bold">
                  {utilizationPercent.toFixed(1)}%
                </p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2">
              <Badge
                variant={
                  budgetStatus.utilization.alertLevel === 'normal'
                    ? 'default'
                    : budgetStatus.utilization.alertLevel === 'warning'
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {budgetStatus.utilization.alertLevel}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Projected Spend</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${budgetStatus.projections.projectedSpend.toFixed(2)}
                </p>
              </div>
              <div className="text-right">
                {budgetStatus.projections.willExceedBudget ? (
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                ) : (
                  <TrendingUp className="w-8 h-8 text-green-500" />
                )}
              </div>
            </div>
            {projectedOverage > 0 && (
              <div className="mt-2">
                <p className="text-sm text-red-600">
                  ${projectedOverage.toFixed(2)} over budget
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Burn Rate</p>
                <p className="text-3xl font-bold text-orange-600">
                  ${budgetStatus.projections.burnRate.toFixed(2)}
                </p>
              </div>
              <div className="text-sm text-gray-500">per day</div>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {budgetStatus.timeRemaining.days} days remaining
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Utilization Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Usage</span>
              <span className="text-sm text-gray-600">
                ${budgetStatus.currentSpend.toFixed(2)} / $
                {budgetStatus.budgetLimit.toFixed(2)}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-300 ${
                  utilizationPercent >= 100
                    ? 'bg-red-500'
                    : utilizationPercent >= 90
                      ? 'bg-orange-500'
                      : utilizationPercent >= 75
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
              />
            </div>

            {/* Threshold markers */}
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>75%</span>
              <span>90%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Service</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costMetrics.breakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ service, cost }) =>
                    `${service}: $${cost.toFixed(2)}`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cost"
                >
                  {costMetrics.breakdown.map(
                    (
                      entry: {
                        service: string
                        cost: number
                        percentage: number
                        efficiency?: number
                        avgCostPerRequest?: number
                        avgCostPerToken?: number
                      },
                      index: number
                    ) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Tooltip
                  formatter={(value: number | string) => [
                    `$${(value as number).toFixed(2)}`,
                    'Cost',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Efficiency Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {costMetrics.breakdown.map(
                (service: {
                  service: string
                  cost: number
                  percentage: number
                  efficiency?: number
                  avgCostPerRequest?: number
                  avgCostPerToken?: number
                }) => (
                  <div key={service.service} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold">{service.service}</h4>
                      <Badge variant="secondary">
                        {service.efficiency?.toFixed(1) || 0} req/$
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Cost/Request:</span>
                        <span className="ml-1 font-semibold">
                          ${service.avgCostPerRequest?.toFixed(4) || '0.0000'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Cost/Token:</span>
                        <span className="ml-1 font-semibold">
                          ${service.avgCostPerToken?.toFixed(6) || '0.000000'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Projections */}
      {costMetrics.projections && (
        <Card>
          <CardHeader>
            <CardTitle>Cost Projections & Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  ${costMetrics.projections.projectedTotalCost.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Projected Total</div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${costMetrics.projections.dailyBurnRate.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Daily Burn Rate</div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div
                  className={`text-2xl font-bold ${
                    costMetrics.projections.trend.direction === 'increasing'
                      ? 'text-red-600'
                      : costMetrics.projections.trend.direction === 'decreasing'
                        ? 'text-green-600'
                        : 'text-gray-600'
                  }`}
                >
                  {costMetrics.projections.trend.percentageChange > 0
                    ? '+'
                    : ''}
                  {costMetrics.projections.trend.percentageChange.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  Trend vs Previous Period
                </div>
              </div>
            </div>

            {/* Anomaly Detection */}
            {costMetrics.projections.anomalies.hasCostSpike && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-semibold text-yellow-800">
                    Cost Spike Detected
                  </h4>
                </div>
                <p className="text-sm text-yellow-700">
                  Recent average cost ($
                  {costMetrics.projections.anomalies.recentAvgCost.toFixed(2)})
                  is{' '}
                  {costMetrics.projections.anomalies.spikeMultiplier.toFixed(1)}
                  x higher than overall average ($
                  {costMetrics.projections.anomalies.overallAvgCost.toFixed(2)}
                  ).
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Optimization Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Cost Optimization Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recommendations.recommendations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-2xl mb-2">✅</div>
              <div>No optimization recommendations at this time</div>
              <div className="text-sm">
                Your costs are within expected ranges
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {recommendations.recommendations.length}
                  </div>
                  <div className="text-sm text-blue-600">
                    Total Recommendations
                  </div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ${recommendations.summary.totalPotentialSavings.toFixed(2)}
                  </div>
                  <div className="text-sm text-green-600">
                    Potential Savings
                  </div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {recommendations.summary.estimatedSavingsPercent.toFixed(1)}
                    %
                  </div>
                  <div className="text-sm text-purple-600">
                    Estimated Savings
                  </div>
                </div>
              </div>

              {recommendations.recommendations.map(
                (
                  rec: {
                    title: string
                    description?: string
                    priority: string
                    savings?: number
                    potentialSavings?: number
                    suggestion?: string
                    service?: string
                  },
                  index: number
                ) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{rec.title}</h4>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            rec.priority === 'high'
                              ? 'destructive'
                              : rec.priority === 'medium'
                                ? 'secondary'
                                : 'default'
                          }
                        >
                          {rec.priority} priority
                        </Badge>
                        {rec.potentialSavings && rec.potentialSavings > 0 && (
                          <Badge variant="secondary">
                            ${rec.potentialSavings?.toFixed(2) || '0.00'}{' '}
                            savings
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {rec.description}
                    </p>
                    <p className="text-sm font-medium">{rec.suggestion}</p>

                    {rec.service !== 'all' && (
                      <div className="mt-2">
                        <Badge variant="secondary">
                          Service: {rec.service}
                        </Badge>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
        <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_: unknown, i: number) => (
          <div key={i} className="h-24 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>

      <div className="h-32 bg-gray-200 animate-pulse rounded" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded" />
      </div>

      <div className="h-64 bg-gray-200 animate-pulse rounded" />
    </div>
  )
}

export default CostMonitoringDashboard
