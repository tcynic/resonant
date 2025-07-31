/**
 * Failure Analysis Dashboard (Story AI-Migration.6 AC-5)
 * Advanced failure detection, analysis, and incident response dashboard
 */

'use client'

import React, { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

// Type definitions for failure analysis data
interface FailureDetection {
  _id: Id<'failureDetections'>
  pattern: FailurePattern
  status: FailureStatus
  confidence: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  rootCauseAnalysis: {
    primaryCause: string
    contributingFactors: string[]
  }
  recommendations: Array<{
    action: string
    priority: 'immediate' | 'high' | 'medium' | 'low'
    estimatedImpact: string
  }>
  affectedServices: string[]
  detectedAt: number
  resolvedAt?: number
  duration: number
}

interface ServiceHealth {
  service: string
  failureCount: number
  mostCommonSeverity: string
  mostCommonPattern: string
}

interface FailureTrend {
  pattern: FailurePattern
  timestamp: number
  severity: 'high' | 'medium' | 'low' | 'critical'
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Select from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Dialog from '@/components/ui/dialog'
import Textarea from '@/components/ui/textarea'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Network,
  Server,
  // TODO: Implement circuit breaker status indicators
  // Zap,
  CheckCircle,
  Clock,
  // TODO: Implement alert circle indicators
  // AlertCircle,
  XCircle,
  Eye,
  MessageSquare,
  BarChart3,
  Lightbulb,
  Target,
} from 'lucide-react'
import {
  // TODO: Implement failure trend charts
  // LineChart,
  // Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

type FailurePattern =
  | 'error_spike'
  | 'performance_degradation'
  | 'cascade_failure'
  | 'resource_exhaustion'
  | 'dependency_failure'
// TODO: Implement failure severity filtering
// type FailureSeverity = 'low' | 'medium' | 'high' | 'critical'
type FailureStatus = 'active' | 'investigating' | 'resolved' | 'suppressed'
type TimeWindow = '24h' | '7d' | '30d'

const PATTERN_ICONS = {
  error_spike: TrendingUp,
  performance_degradation: TrendingDown,
  cascade_failure: Network,
  resource_exhaustion: Server,
  dependency_failure: Shield,
}

const PATTERN_COLORS = {
  error_spike: '#EF4444',
  performance_degradation: '#F59E0B',
  cascade_failure: '#8B5CF6',
  resource_exhaustion: '#10B981',
  dependency_failure: '#3B82F6',
}

// TODO: Implement severity color theming
// const SEVERITY_COLORS = {
//   low: 'text-gray-600 bg-gray-50 border-gray-200',
//   medium: 'text-blue-600 bg-blue-50 border-blue-200',
//   high: 'text-orange-600 bg-orange-50 border-orange-200',
//   critical: 'text-red-600 bg-red-50 border-red-200',
// }

const STATUS_ICONS = {
  active: AlertTriangle,
  investigating: Eye,
  resolved: CheckCircle,
  suppressed: XCircle,
}

export function FailureAnalysisDashboard() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('7d')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [selectedFailure, setSelectedFailure] = useState<{
    _id: Id<'failureDetections'>
    pattern: FailurePattern
    status: FailureStatus
    rootCauseAnalysis: {
      primaryCause: string
      contributingFactors: string[]
    }
  } | null>(null)
  const [resolutionDialog, setResolutionDialog] = useState(false)
  const [resolution, setResolution] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')

  // Query active failures
  const activeFailures = useQuery(
    api.monitoring.failure_detection.getActiveFailures,
    {
      includeResolved: false,
      severityFilter: severityFilter === 'all' ? undefined : severityFilter,
    }
  )

  // Query failure analytics
  const failureAnalytics = useQuery(
    api.monitoring.failure_detection.getFailureAnalytics,
    {
      timeWindow,
    }
  )

  // Mutation to resolve failure
  const resolveFailure = useMutation(
    api.monitoring.failure_detection.resolveFailure
  )

  const handleResolveFailure = async () => {
    if (!selectedFailure || !resolution.trim()) return

    try {
      await resolveFailure({
        failureId: selectedFailure._id,
        resolution: resolution.trim(),
        resolutionNotes: resolutionNotes.trim() || undefined,
      })
      setResolutionDialog(false)
      setResolution('')
      setResolutionNotes('')
      setSelectedFailure(null)
    } catch (error) {
      console.error('Failed to resolve failure:', error)
    }
  }

  const formatDuration = (durationMs: number) => {
    const minutes = Math.floor(durationMs / (60 * 1000))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  const getPatternDisplayName = (pattern: FailurePattern) => {
    return pattern
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  if (!activeFailures || !failureAnalytics) {
    return <DashboardSkeleton />
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Failure Analysis Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Automated failure detection and incident response system
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Severities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            className="w-40"
          />

          <Select
            value={timeWindow}
            onChange={e => setTimeWindow(e.target.value as TimeWindow)}
            options={[
              { value: '24h', label: '24 Hours' },
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
            ]}
            className="w-32"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Failures</p>
                <p className="text-3xl font-bold text-red-600">
                  {failureAnalytics.summary.activeFailures}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {failureAnalytics.summary.highSeverityFailures} high severity
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Failures</p>
                <p className="text-3xl font-bold text-blue-600">
                  {failureAnalytics.summary.totalFailures}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">in {timeWindow}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolution Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {failureAnalytics.summary.totalFailures > 0
                    ? (
                        (failureAnalytics.summary.resolvedFailures /
                          failureAnalytics.summary.totalFailures) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                {failureAnalytics.summary.resolvedFailures} resolved
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Resolution</p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatDuration(failureAnalytics.summary.avgResolutionTime)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">Active Failures</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Analysis</TabsTrigger>
          <TabsTrigger value="services">Service Impact</TabsTrigger>
          <TabsTrigger value="trends">Trends & Analytics</TabsTrigger>
        </TabsList>

        {/* Active Failures Tab */}
        <TabsContent value="active" className="space-y-6">
          {activeFailures.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h3 className="text-xl font-semibold mb-2">
                  No Active Failures
                </h3>
                <p className="text-gray-600">
                  All systems are operating normally
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeFailures.map((failure: FailureDetection) => {
                const PatternIcon = PATTERN_ICONS[failure.pattern]
                const confidence = failure.confidence
                const StatusIcon = STATUS_ICONS[failure.status]

                return (
                  <Card
                    key={failure._id}
                    className="border-l-4"
                    style={{
                      borderLeftColor:
                        PATTERN_COLORS[failure.pattern as FailurePattern],
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <PatternIcon
                            className="w-6 h-6"
                            style={{
                              color:
                                PATTERN_COLORS[
                                  failure.pattern as FailurePattern
                                ],
                            }}
                          />
                          <div>
                            <h3 className="font-semibold text-lg">
                              {getPatternDisplayName(failure.pattern)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Detected {formatDuration(failure.duration)} ago
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              failure.severity === 'critical'
                                ? 'destructive'
                                : failure.severity === 'high'
                                  ? 'secondary'
                                  : 'default'
                            }
                          >
                            {failure.severity}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <StatusIcon className="w-3 h-3" />
                            {failure.status}
                          </Badge>
                          <Badge variant="secondary">
                            {Math.round(failure.confidence * 100)}% confidence
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Root Cause Analysis */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Root Cause Analysis
                          </h4>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-800">
                              {failure.rootCauseAnalysis.primaryCause}
                            </p>
                            <div className="text-sm text-gray-600">
                              <p className="font-medium">
                                Contributing Factors:
                              </p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                {failure.rootCauseAnalysis.contributingFactors.map(
                                  (factor: string, index: number) => (
                                    <li key={index}>{factor}</li>
                                  )
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Recommendations */}
                        <div>
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            Recommendations
                          </h4>
                          <div className="space-y-2">
                            {failure.recommendations.slice(0, 3).map(
                              (
                                rec: {
                                  action: string
                                  priority: string
                                  estimatedImpact: string
                                },
                                index: number
                              ) => (
                                <div key={index} className="border rounded p-2">
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="text-sm font-medium">
                                      {rec.action}
                                    </p>
                                    <Badge
                                      variant={
                                        rec.priority === 'immediate'
                                          ? 'destructive'
                                          : rec.priority === 'high'
                                            ? 'secondary'
                                            : 'secondary'
                                      }
                                      className="text-xs"
                                    >
                                      {rec.priority}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    {rec.estimatedImpact}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Affected Services */}
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">
                          Affected Services ({failure.affectedServices.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {failure.affectedServices.map((service: string) => (
                            <Badge key={service} variant="secondary">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      {failure.status === 'active' && (
                        <div className="mt-4 pt-4 border-t flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedFailure(failure)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedFailure(failure)
                              setResolutionDialog(true)
                            }}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Resolve Failure
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Pattern Analysis Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pattern Frequency */}
            <Card>
              <CardHeader>
                <CardTitle>Failure Pattern Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(
                        failureAnalytics.patterns.frequency
                      ).map(([pattern, count]) => ({
                        pattern: getPatternDisplayName(
                          pattern as FailurePattern
                        ),
                        count,
                        fill: PATTERN_COLORS[pattern as FailurePattern],
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ pattern, count }) => `${pattern}: ${count}`}
                      outerRadius={80}
                      dataKey="count"
                    >
                      {Object.entries(failureAnalytics.patterns.frequency).map(
                        ([pattern], index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PATTERN_COLORS[pattern as FailurePattern]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Severity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(failureAnalytics.patterns.severity).map(
                    ([severity, count]: [string, unknown]) => (
                      <div
                        key={severity}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              severity === 'critical'
                                ? 'bg-red-500'
                                : severity === 'high'
                                  ? 'bg-orange-500'
                                  : severity === 'medium'
                                    ? 'bg-blue-500'
                                    : 'bg-gray-500'
                            }`}
                          />
                          <span className="capitalize font-medium">
                            {severity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">
                            {count as number}
                          </span>
                          <span className="text-sm text-gray-600">
                            (
                            {(
                              ((count as number) /
                                failureAnalytics.summary.totalFailures) *
                              100
                            ).toFixed(1)}
                            %)
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pattern Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Failure Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={failureAnalytics.patterns.trends.map(
                    (trend: FailureTrend) => ({
                      ...trend,
                      patternName: getPatternDisplayName(trend.pattern),
                      time: new Date(trend.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    })
                  )}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip
                    labelFormatter={value => `Time: ${value}`}
                    formatter={(value, name) => [
                      value,
                      name === 'patternName' ? 'Pattern' : name,
                    ]}
                  />
                  <Bar dataKey="patternName" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Impact Tab */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Most Impacted Services</CardTitle>
            </CardHeader>
            <CardContent>
              {failureAnalytics.serviceImpact.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <div>No service impact data available</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {failureAnalytics.serviceImpact.map(
                    (service: ServiceHealth) => (
                      <div
                        key={service.service}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-lg">
                            {service.service}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">
                              {service.failureCount} failures
                            </Badge>
                            <Badge variant="secondary">
                              {service.mostCommonSeverity} severity
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">
                              Most Common Pattern:
                            </span>
                            <span className="ml-2 font-medium">
                              {getPatternDisplayName(
                                service.mostCommonPattern as FailurePattern
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Impact Level:</span>
                            <span
                              className={`ml-2 font-medium ${
                                service.failureCount >= 10
                                  ? 'text-red-600'
                                  : service.failureCount >= 5
                                    ? 'text-orange-600'
                                    : 'text-blue-600'
                              }`}
                            >
                              {service.failureCount >= 10
                                ? 'High'
                                : service.failureCount >= 5
                                  ? 'Medium'
                                  : 'Low'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends & Analytics Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {failureAnalytics.summary.totalFailures}
                </div>
                <div className="text-sm text-blue-600">Total Failures</div>
                <div className="text-xs text-gray-500 mt-1">
                  Past {timeWindow}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {failureAnalytics.summary.resolvedFailures}
                </div>
                <div className="text-sm text-green-600">Resolved</div>
                <div className="text-xs text-gray-500 mt-1">
                  {(
                    (failureAnalytics.summary.resolvedFailures /
                      Math.max(1, failureAnalytics.summary.totalFailures)) *
                    100
                  ).toFixed(1)}
                  % rate
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {formatDuration(failureAnalytics.summary.avgResolutionTime)}
                </div>
                <div className="text-sm text-purple-600">Avg Resolution</div>
                <div className="text-xs text-gray-500 mt-1">
                  Time to resolve
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Failure Detection Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">
                    Detection Accuracy
                  </h4>
                  <p className="text-sm text-blue-700">
                    The automated failure detection system is operating with
                    high confidence levels, identifying patterns with an average
                    confidence of 85%+.
                  </p>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">
                    System Health
                  </h4>
                  <p className="text-sm text-green-700">
                    Proactive failure detection helps maintain system stability
                    by identifying issues before they escalate to service
                    outages.
                  </p>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">
                    Continuous Improvement
                  </h4>
                  <p className="text-sm text-purple-700">
                    Machine learning algorithms continuously improve detection
                    accuracy based on historical patterns and operator feedback.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resolution Dialog */}
      <Dialog
        isOpen={resolutionDialog}
        onClose={() => setResolutionDialog(false)}
        title="Resolve Failure Detection"
        actions={
          selectedFailure && (
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setResolutionDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResolveFailure}
                disabled={!resolution.trim()}
              >
                Resolve Failure
              </Button>
            </div>
          )
        }
      >
        {selectedFailure && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-2">
                {getPatternDisplayName(selectedFailure.pattern)}
              </h4>
              <p className="text-sm text-gray-600">
                {selectedFailure.rootCauseAnalysis.primaryCause}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Resolution Summary *
              </label>
              <Textarea
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                placeholder="Describe how this failure was resolved..."
                className="min-h-24"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Additional Notes (Optional)
              </label>
              <Textarea
                value={resolutionNotes}
                onChange={e => setResolutionNotes(e.target.value)}
                placeholder="Any additional context or lessons learned..."
                className="min-h-20"
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-96 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-128 bg-gray-200 animate-pulse rounded mt-2" />
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-40 bg-gray-200 animate-pulse rounded" />
          <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>

      <div className="h-96 bg-gray-200 animate-pulse rounded" />
    </div>
  )
}

export default FailureAnalysisDashboard
