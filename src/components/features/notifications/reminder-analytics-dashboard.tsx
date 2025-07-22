'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  BarChart3,
  TrendingUp,
  Eye,
  MousePointer,
  XCircle,
  Clock,
  Target,
  Award,
  Calendar,
  Download,
} from 'lucide-react'
import Card from '@/components/ui/card'
import Button from '@/components/ui/button'

interface ReminderAnalyticsDashboardProps {
  className?: string
}

interface AnalyticsData {
  totalReminders: number
  deliveredReminders: number
  clickedReminders: number
  dismissedReminders: number
  clickThroughRate: number
  engagementScore: number
  timeSeriesData: Array<{
    date: string
    sent: number
    clicked: number
    dismissed: number
  }>
  reminderTypeBreakdown: Array<{
    type: 'gentle_nudge' | 'relationship_focus' | 'health_alert'
    count: number
    clickRate: number
    engagementScore: number
  }>
  timeOfDayAnalysis: Array<{
    hour: number
    sent: number
    clicked: number
    clickRate: number
  }>
  weeklyPatterns: Array<{
    dayOfWeek: number
    sent: number
    clicked: number
    avgEngagement: number
  }>
}

export function ReminderAnalyticsDashboard({
  className = '',
}: ReminderAnalyticsDashboardProps) {
  const { user } = useUser()
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>(
    '30d'
  )
  // Metric selection feature to be implemented later
  // const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'clickRate' | 'volume'>('engagement')

  // Get user data
  const userData = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  )

  // Get basic analytics
  const basicAnalytics = useQuery(
    api.notifications.getUserReminderAnalytics,
    userData?._id ? { userId: userData._id } : 'skip'
  )

  // Get reminder history for detailed analysis
  const reminderHistory = useQuery(
    api.notifications.getUserReminderHistory,
    userData?._id ? { userId: userData._id, limit: 200 } : 'skip'
  )

  // Process analytics data
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    if (!reminderHistory || !basicAnalytics) return

    // Filter by date range
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const cutoffDate =
      dateRange === 'all' ? 0 : now - parseInt(dateRange) * dayMs

    const filteredReminders = reminderHistory.filter(
      r => r.createdAt >= cutoffDate
    )

    // Process time series data
    const timeSeriesMap = new Map<
      string,
      { sent: number; clicked: number; dismissed: number }
    >()
    filteredReminders.forEach(reminder => {
      const dateKey = new Date(reminder.createdAt).toISOString().split('T')[0]
      const existing = timeSeriesMap.get(dateKey) || {
        sent: 0,
        clicked: 0,
        dismissed: 0,
      }

      existing.sent++
      if (reminder.status === 'clicked') existing.clicked++
      if (reminder.status === 'dismissed') existing.dismissed++

      timeSeriesMap.set(dateKey, existing)
    })

    const timeSeriesData = Array.from(timeSeriesMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Process reminder type breakdown
    const typeBreakdown = new Map<
      string,
      { count: number; clicked: number; dismissed: number }
    >()
    filteredReminders.forEach(reminder => {
      const existing = typeBreakdown.get(reminder.reminderType) || {
        count: 0,
        clicked: 0,
        dismissed: 0,
      }

      existing.count++
      if (reminder.status === 'clicked') existing.clicked++
      if (reminder.status === 'dismissed') existing.dismissed++

      typeBreakdown.set(reminder.reminderType, existing)
    })

    const reminderTypeBreakdown = Array.from(typeBreakdown.entries()).map(
      ([type, data]) => ({
        type: type as 'gentle_nudge' | 'relationship_focus' | 'health_alert',
        count: data.count,
        clickRate: data.count > 0 ? (data.clicked / data.count) * 100 : 0,
        engagementScore:
          data.count > 0
            ? Math.round(
                ((data.clicked - data.dismissed * 0.5) / data.count) * 100
              )
            : 0,
      })
    )

    // Process time of day analysis
    const hourlyData = new Map<number, { sent: number; clicked: number }>()
    filteredReminders.forEach(reminder => {
      if (reminder.deliveredTime) {
        const hour = new Date(reminder.deliveredTime).getHours()
        const existing = hourlyData.get(hour) || { sent: 0, clicked: 0 }

        existing.sent++
        if (reminder.status === 'clicked') existing.clicked++

        hourlyData.set(hour, existing)
      }
    })

    const timeOfDayAnalysis = Array.from(hourlyData.entries())
      .map(([hour, data]) => ({
        hour,
        sent: data.sent,
        clicked: data.clicked,
        clickRate: data.sent > 0 ? (data.clicked / data.sent) * 100 : 0,
      }))
      .sort((a, b) => a.hour - b.hour)

    // Process weekly patterns
    const weeklyData = new Map<
      number,
      { sent: number; clicked: number; dismissed: number }
    >()
    filteredReminders.forEach(reminder => {
      const dayOfWeek = new Date(reminder.createdAt).getDay()
      const existing = weeklyData.get(dayOfWeek) || {
        sent: 0,
        clicked: 0,
        dismissed: 0,
      }

      existing.sent++
      if (reminder.status === 'clicked') existing.clicked++
      if (reminder.status === 'dismissed') existing.dismissed++

      weeklyData.set(dayOfWeek, existing)
    })

    const weeklyPatterns = Array.from(weeklyData.entries())
      .map(([dayOfWeek, data]) => ({
        dayOfWeek,
        sent: data.sent,
        clicked: data.clicked,
        avgEngagement:
          data.sent > 0
            ? ((data.clicked - data.dismissed * 0.5) / data.sent) * 100
            : 0,
      }))
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)

    setAnalyticsData({
      ...basicAnalytics,
      timeSeriesData,
      reminderTypeBreakdown,
      timeOfDayAnalysis,
      weeklyPatterns,
    })
  }, [reminderHistory, basicAnalytics, dateRange])

  const exportAnalytics = () => {
    if (!analyticsData) return

    const csvData = [
      ['Metric', 'Value'],
      ['Total Reminders', analyticsData.totalReminders.toString()],
      ['Click Through Rate', `${analyticsData.clickThroughRate.toFixed(1)}%`],
      ['Engagement Score', analyticsData.engagementScore.toString()],
      [''],
      ['Reminder Type', 'Count', 'Click Rate', 'Engagement'],
      ...analyticsData.reminderTypeBreakdown.map(type => [
        type.type.replace('_', ' '),
        type.count.toString(),
        `${type.clickRate.toFixed(1)}%`,
        type.engagementScore.toString(),
      ]),
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `reminder-analytics-${dateRange}.csv`
    a.click()

    URL.revokeObjectURL(url)
  }

  const getDayName = (dayIndex: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days[dayIndex]
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'gentle_nudge':
        return 'Gentle Nudges'
      case 'relationship_focus':
        return 'Relationship Focus'
      case 'health_alert':
        return 'Health Alerts'
      default:
        return type
    }
  }

  const getBestPerformingTime = () => {
    if (!analyticsData?.timeOfDayAnalysis.length) return null

    return analyticsData.timeOfDayAnalysis
      .filter(t => t.sent >= 3) // Minimum sample size
      .reduce((best, current) =>
        current.clickRate > best.clickRate ? current : best
      )
  }

  const getBestPerformingDay = () => {
    if (!analyticsData?.weeklyPatterns.length) return null

    return analyticsData.weeklyPatterns
      .filter(d => d.sent >= 3) // Minimum sample size
      .reduce((best, current) =>
        current.avgEngagement > best.avgEngagement ? current : best
      )
  }

  if (!userData || !analyticsData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    )
  }

  if (analyticsData.totalReminders === 0) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Analytics Data Yet
        </h3>
        <p className="text-gray-600">
          Analytics will appear here once you start receiving and interacting
          with reminders.
        </p>
      </Card>
    )
  }

  const bestTime = getBestPerformingTime()
  const bestDay = getBestPerformingDay()

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Reminder Analytics
          </h2>
          <p className="text-gray-600">
            Insights into your reminder engagement and effectiveness
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as typeof dateRange)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>

          <Button
            onClick={exportAnalytics}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reminders</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData.totalReminders}
              </p>
            </div>
            <Eye className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Click Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {analyticsData.clickThroughRate.toFixed(1)}%
              </p>
            </div>
            <MousePointer className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Engagement Score</p>
              <p className="text-2xl font-bold text-purple-600">
                {analyticsData.engagementScore}
              </p>
            </div>
            <Award className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Dismissal Rate</p>
              <p className="text-2xl font-bold text-orange-600">
                {analyticsData.deliveredReminders > 0
                  ? (
                      (analyticsData.dismissedReminders /
                        analyticsData.deliveredReminders) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
            <XCircle className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Reminder Type Performance */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Target className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">
            Reminder Type Performance
          </h3>
        </div>

        <div className="space-y-4">
          {analyticsData.reminderTypeBreakdown.map(type => (
            <div key={type.type} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-gray-900">
                  {getTypeLabel(type.type)}
                </div>
                <div className="text-sm text-gray-500">{type.count} sent</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Click Rate</div>
                  <div className="text-lg font-bold text-green-600">
                    {type.clickRate.toFixed(1)}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(type.clickRate, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">Engagement</div>
                  <div className="text-lg font-bold text-purple-600">
                    {type.engagementScore}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.max(0, Math.min(type.engagementScore, 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Optimization Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Times */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Optimal Timing
            </h3>
          </div>

          <div className="space-y-4">
            {bestTime && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-green-900">
                      Best Time: {bestTime.hour}:00
                    </div>
                    <div className="text-sm text-green-700">
                      {bestTime.clickRate.toFixed(1)}% click rate
                    </div>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            )}

            {bestDay && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-blue-900">
                      Best Day: {getDayName(bestDay.dayOfWeek)}
                    </div>
                    <div className="text-sm text-blue-700">
                      {bestDay.avgEngagement.toFixed(1)} avg engagement
                    </div>
                  </div>
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> Your reminder settings will automatically
              optimize based on these insights to improve engagement.
            </div>
          </div>
        </Card>

        {/* Weekly Patterns */}
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Weekly Patterns
            </h3>
          </div>

          <div className="space-y-2">
            {analyticsData.weeklyPatterns.map(day => (
              <div
                key={day.dayOfWeek}
                className="flex items-center justify-between py-2"
              >
                <div className="text-sm font-medium text-gray-900 w-12">
                  {getDayName(day.dayOfWeek)}
                </div>

                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.max(0, Math.min(day.avgEngagement + 50, 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="text-sm text-gray-600 w-16 text-right">
                  {day.sent > 0 ? day.avgEngagement.toFixed(0) : 0}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <TrendingUp className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-medium text-blue-900 mb-3">
              AI Recommendations
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              {analyticsData.engagementScore < 40 && (
                <div>
                  • Consider reducing reminder frequency or trying different
                  message tones
                </div>
              )}
              {analyticsData.clickThroughRate < 20 && (
                <div>
                  • Your click rate is below average - experiment with different
                  reminder times
                </div>
              )}
              {bestTime && (
                <div>
                  • Your optimal time is {bestTime.hour}:00 - consider adjusting
                  your preferred time
                </div>
              )}
              {analyticsData.engagementScore > 70 && (
                <div>
                  • Excellent engagement! You might benefit from
                  relationship-focused reminders
                </div>
              )}
              <div>
                • Based on your patterns,{' '}
                {getTypeLabel(
                  analyticsData.reminderTypeBreakdown.reduce((best, current) =>
                    current.clickRate > best.clickRate ? current : best
                  ).type
                ).toLowerCase()}{' '}
                work best for you
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
