'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { RelationshipWithScore } from '@/lib/types'
import {
  performanceMonitor,
  usePerformanceMonitor,
} from '@/lib/performance-monitor'
import { useConvexUser } from '@/hooks/use-convex-user'
import { useIsClient } from '@/hooks/use-is-client'
import { safeWindow, safeTimeFormatting } from '@/lib/client-utils'
import HealthScoreCard from '@/components/features/dashboard/health-score-card'
import TrendChart from '@/components/features/dashboard/trend-chart'
import RecentActivity from '@/components/features/dashboard/recent-activity'
import EntryHistory from '@/components/features/dashboard/entry-history'
import ConnectionStatus from '@/components/features/dashboard/connection-status'
import RealTimeIndicator from '@/components/features/dashboard/real-time-indicator'
import Card, { CardHeader, CardContent } from '@/components/ui/card'
import ErrorBoundary, {
  DashboardErrorFallback,
  NetworkErrorFallback,
} from '@/components/ui/error-boundary'
import { DashboardStats, TrendDataPoint } from '@/lib/types'

interface DashboardHeaderProps {
  user: { firstName?: string } | null
  stats: DashboardStats | undefined
  isLoading?: boolean
}

interface StatsGridProps {
  stats: DashboardStats | undefined
}

interface EmptyDashboardProps {
  userName: string
}

function DashboardHeader({
  user,
  stats,
  isLoading = false,
}: DashboardHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const isClient = useIsClient()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Force a page refresh to get latest data
    safeWindow.reload()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isClient ? safeTimeFormatting.getGreeting() : 'Hello'},{' '}
            {user?.firstName || 'there'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here&apos;s how your relationships are doing today
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {stats
                ? `Updated ${safeTimeFormatting.formatLastUpdated(stats.lastUpdated)}`
                : 'Loading...'}
            </p>
            <div className="flex items-center justify-end space-x-2 mt-1">
              <ConnectionStatus />
              <RealTimeIndicator
                isLoading={isLoading}
                lastUpdated={stats?.lastUpdated}
              />
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function StatsGrid({ stats }: StatsGridProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse" padding="md">
            <div className="h-16 bg-gray-200 rounded" />
          </Card>
        ))}
      </div>
    )
  }

  const statItems = [
    {
      label: 'Relationships',
      value: stats.totals.relationships,
      subtext: `${stats.totals.trackedRelationships} tracked`,
      icon: '💝',
      color: 'text-pink-600',
    },
    {
      label: 'Avg Health Score',
      value: stats.health.averageScore,
      subtext:
        stats.health.averageScore >= 70
          ? 'Excellent'
          : stats.health.averageScore >= 50
            ? 'Good'
            : 'Needs focus',
      icon: '📊',
      color:
        stats.health.averageScore >= 70
          ? 'text-green-600'
          : stats.health.averageScore >= 50
            ? 'text-blue-600'
            : 'text-yellow-600',
    },
    {
      label: 'This Week',
      value: stats.activity.entriesThisWeek,
      subtext: 'journal entries',
      icon: '📝',
      color: 'text-blue-600',
    },
    {
      label: 'Improving',
      value: stats.health.improvingRelationships,
      subtext: `${stats.health.decliningRelationships} declining`,
      icon: '📈',
      color:
        stats.health.improvingRelationships >
        stats.health.decliningRelationships
          ? 'text-green-600'
          : 'text-orange-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {statItems.map((item, index) => (
        <Card key={index} padding="md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">{item.icon}</span>
            </div>
            <div className="ml-4">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-xs text-gray-400">{item.subtext}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function EmptyDashboard({ userName }: EmptyDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <DashboardHeader user={{ firstName: userName }} stats={undefined} />

        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">💝</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to your Relationship Health Journal!
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Start by adding your relationships and creating journal entries. Our
            AI will analyze your entries to provide insights into your
            relationship health.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card padding="md" className="text-left">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Add Relationships
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Start by adding the important relationships in your life -
                    family, friends, colleagues, or partners.
                  </p>
                  <Link
                    href="/relationships"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add Relationship
                  </Link>
                </div>
              </div>
            </Card>

            <Card padding="md" className="text-left">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Create Journal Entries
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Write about your interactions, thoughts, and feelings about
                    your relationships.
                  </p>
                  <Link
                    href="/journal/new"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                  >
                    Create First Entry
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardContent() {
  const { user } = useUser()
  const [selectedTimeRange] = useState<'week' | 'month' | 'quarter'>('month')

  // Use the custom hook to handle user sync
  const {
    convexUser,
    isLoading: userSyncLoading,
    isCreating,
    error: userSyncError,
  } = useConvexUser()

  const { startRender, endRender } = usePerformanceMonitor('dashboard-content')

  // Performance monitoring for dashboard load
  useEffect(() => {
    performanceMonitor.startTiming('dashboard-page-load')

    return () => {
      performanceMonitor.endTiming('dashboard-page-load')
      performanceMonitor.logSummary()
    }
  }, [])

  // Performance monitoring for component render
  useEffect(() => {
    startRender()
    const timer = setTimeout(() => {
      endRender()
    }, 0)

    return () => clearTimeout(timer)
  }, [startRender, endRender])

  // Get dashboard data with performance monitoring
  useEffect(() => {
    if (convexUser?._id) {
      performanceMonitor.startTiming('dashboard-data-fetch', {
        userId: convexUser._id,
        timeRange: selectedTimeRange,
      })
    }
  }, [convexUser?._id, selectedTimeRange])

  const dashboardData = useQuery(
    api.dashboard.getDashboardData,
    convexUser?._id ? { userId: convexUser._id as Id<'users'> } : 'skip'
  )

  const dashboardStats = useQuery(
    api.dashboard.getDashboardStats,
    convexUser?._id ? { userId: convexUser._id as Id<'users'> } : 'skip'
  )

  const recentActivity = useQuery(
    api.dashboard.getRecentActivity,
    convexUser?._id
      ? { userId: convexUser._id as Id<'users'>, limit: 10 }
      : 'skip'
  )

  const trendData = useQuery(
    api.dashboard.getDashboardTrends,
    convexUser?._id
      ? {
          userId: convexUser._id as Id<'users'>,
          timeRangeDays:
            selectedTimeRange === 'week'
              ? 7
              : selectedTimeRange === 'month'
                ? 30
                : 90,
          granularity:
            selectedTimeRange === 'week' ? ('day' as const) : ('week' as const),
        }
      : 'skip'
  )

  // End data fetch timing when data is loaded
  useEffect(() => {
    if (dashboardData && dashboardStats && recentActivity) {
      performanceMonitor.endTiming('dashboard-data-fetch')
    }
  }, [dashboardData, dashboardStats, recentActivity])

  // Check for errors in critical data
  const hasDataError =
    userSyncError !== null ||
    dashboardData === null ||
    dashboardStats === null ||
    recentActivity === null
  const isLoading =
    userSyncLoading ||
    dashboardData === undefined ||
    dashboardStats === undefined ||
    recentActivity === undefined

  // Handle user sync error
  if (userSyncError) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <DashboardErrorFallback
            error={new Error(`Failed to sync user: ${userSyncError}`)}
            onRetry={() => safeWindow.reload()}
          />
        </div>
      </div>
    )
  }

  // Handle case where user is being created in Convex
  if (isCreating) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-sm text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Setting up your account...
            </h2>
            <p className="text-gray-600 mb-4">
              We&apos;re creating your profile in our database. This should only
              take a moment.
            </p>
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-500">Please wait...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Handle errors in critical data
  if (hasDataError) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <DashboardErrorFallback
            error={new Error('Failed to load dashboard data')}
            onRetry={() => safeWindow.reload()}
          />
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
          <StatsGrid stats={undefined} />
        </div>
      </div>
    )
  }

  // Empty state - no relationships or entries
  if (!dashboardData || dashboardData.relationships.length === 0) {
    return <EmptyDashboard userName={user?.firstName || ''} />
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <DashboardHeader
          user={user ? { firstName: user.firstName || undefined } : null}
          stats={dashboardStats}
          isLoading={false}
        />

        {/* Stats Grid */}
        <StatsGrid stats={dashboardStats} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Health Score Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Relationship Health Scores
              </h2>
              <p className="text-sm text-gray-500">
                {dashboardData.relationships.length} relationships tracked
              </p>
            </div>

            <ErrorBoundary
              fallback={
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <NetworkErrorFallback onRetry={() => safeWindow.reload()} />
                </div>
              }
            >
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {dashboardData.relationships.map(
                  (relationship: RelationshipWithScore) => (
                    <HealthScoreCard
                      key={relationship._id}
                      relationship={relationship}
                      healthScore={relationship.healthScore}
                      showDetails={false}
                    />
                  )
                )}
              </div>
            </ErrorBoundary>
          </div>

          {/* Recent Activity */}
          <div>
            <ErrorBoundary
              fallback={
                <NetworkErrorFallback onRetry={() => safeWindow.reload()} />
              }
            >
              <RecentActivity
                activities={recentActivity?.activities || []}
                totalCount={recentActivity?.totalCount || 0}
                analysisRate={recentActivity?.analysisRate || 0}
                showViewAll={true}
              />
            </ErrorBoundary>
          </div>
        </div>

        {/* Trend Chart */}
        {trendData && trendData.trends.length > 0 && (
          <ErrorBoundary
            fallback={
              <NetworkErrorFallback onRetry={() => safeWindow.reload()} />
            }
          >
            <TrendChart
              data={trendData.trends as TrendDataPoint[]}
              relationshipNames={trendData.relationshipNames}
              timeRange={trendData.timeRange}
              height={400}
            />
          </ErrorBoundary>
        )}

        {/* Quick Actions */}
        <Card padding="md">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">
              Quick Actions
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/journal/new"
                className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <span className="text-2xl mr-3">📝</span>
                <div>
                  <h4 className="font-medium text-gray-900">
                    New Journal Entry
                  </h4>
                  <p className="text-sm text-gray-600">
                    Reflect on your relationships
                  </p>
                </div>
              </Link>

              <Link
                href="/relationships/new"
                className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <span className="text-2xl mr-3">💝</span>
                <div>
                  <h4 className="font-medium text-gray-900">
                    Add Relationship
                  </h4>
                  <p className="text-sm text-gray-600">
                    Track a new relationship
                  </p>
                </div>
              </Link>

              <Link
                href="/journal"
                className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <h4 className="font-medium text-gray-900">View History</h4>
                  <p className="text-sm text-gray-600">Browse past entries</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Entry History with Filtering */}
        <ErrorBoundary
          fallback={
            <NetworkErrorFallback onRetry={() => safeWindow.reload()} />
          }
        >
          <EntryHistory initialLimit={10} />
        </ErrorBoundary>
      </div>
    </div>
  )
}
