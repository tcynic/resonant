'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
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
import { AIProcessingSummary } from '@/components/features/dashboard/ai-processing-summary'
import { RecentAnalysisActivity } from '@/components/features/dashboard/recent-analysis-activity'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import ErrorBoundary, {
  DashboardErrorFallback,
  NetworkErrorFallback,
} from '@/components/ui/error-boundary'
import { DashboardStats, TrendDataPoint } from '@/lib/types'

// Import Subframe components
import {
  DefaultPageLayout,
  Avatar,
  Button,
  ToggleGroup,
  LineChart,
  Table,
  Badge,
  Progress,
  IconButton,
  IconWithBackground,
} from '@/components/ui/ui'
import {
  FeatherEdit2,
  FeatherMoreVertical,
  FeatherUsers,
  FeatherPieChart,
  FeatherTrendingUp,
  FeatherBell,
  FeatherHeart,
} from '@subframe/core'

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
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-4">
        <Avatar
          size="large"
          image="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=3276&ixlib=rb-4.0.3"
        />
        <div className="flex flex-col items-start gap-1">
          <span className="text-heading-2 font-heading-2 text-default-font">
            {isClient ? safeTimeFormatting.getGreeting() : 'Hello'},{' '}
            {user?.firstName || 'there'}!
          </span>
          <span className="text-body font-body text-subtext-color">
            {stats
              ? `Last journal entry: ${safeTimeFormatting.formatLastUpdated(stats.lastUpdated)}`
              : 'Loading...'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="flex items-center justify-end space-x-2">
            <ConnectionStatus />
            <RealTimeIndicator
              isLoading={isLoading}
              lastUpdated={stats?.lastUpdated}
            />
          </div>
        </div>
        <Button
          icon={<FeatherEdit2 />}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          New Journal Entry
        </Button>
      </div>
    </div>
  )
}

function StatsGrid({ stats }: StatsGridProps) {
  if (!stats) {
    return (
      <div className="flex w-full flex-wrap items-start gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex grow shrink-0 basis-0 flex-col items-start gap-2 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  const statItems = [
    {
      label: 'Total Relationships',
      value: stats.totals.relationships,
      subtext: `${stats.totals.trackedRelationships} tracked`,
    },
    {
      label: 'Average Health Score',
      value: `${stats.health.averageScore}%`,
      subtext:
        stats.health.averageScore >= 70
          ? 'Excellent'
          : stats.health.averageScore >= 50
            ? 'Good'
            : 'Needs focus',
    },
    {
      label: 'Active Categories',
      value: stats.activity.entriesThisWeek,
      subtext: 'journal entries',
    },
    {
      label: 'Journal Entries',
      value: stats.health.improvingRelationships,
      subtext: `${stats.health.decliningRelationships} declining`,
    },
  ]

  return (
    <div className="flex w-full flex-wrap items-start gap-4">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="flex grow shrink-0 basis-0 flex-col items-start gap-2 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6"
        >
          <span className="text-body-bold font-body-bold text-subtext-color">
            {item.label}
          </span>
          <span className="text-heading-1 font-heading-1 text-default-font">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function EmptyDashboard({ userName }: EmptyDashboardProps) {
  return (
    <DefaultPageLayout>
      <div className="container max-w-none flex h-full w-full flex-col items-start gap-8 bg-default-background py-8">
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
    </DefaultPageLayout>
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
      <DefaultPageLayout>
        <div className="container max-w-none flex h-full w-full flex-col items-start gap-8 bg-default-background py-8">
          <DashboardErrorFallback
            error={new Error(`Failed to sync user: ${userSyncError}`)}
            onRetry={() => safeWindow.reload()}
          />
        </div>
      </DefaultPageLayout>
    )
  }

  // Handle case where user is being created in Convex
  if (isCreating) {
    return (
      <DefaultPageLayout>
        <div className="container max-w-none flex h-full w-full flex-col items-start gap-8 bg-default-background py-8">
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
      </DefaultPageLayout>
    )
  }

  // Handle errors in critical data
  if (hasDataError) {
    return (
      <DefaultPageLayout>
        <div className="container max-w-none flex h-full w-full flex-col items-start gap-8 bg-default-background py-8">
          <DashboardErrorFallback
            error={new Error('Failed to load dashboard data')}
            onRetry={() => safeWindow.reload()}
          />
        </div>
      </DefaultPageLayout>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <DefaultPageLayout>
        <div className="container max-w-none flex h-full w-full flex-col items-start gap-8 bg-default-background py-8">
          <div className="flex w-full items-center justify-between animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex flex-col items-start gap-1">
                <div className="h-6 bg-gray-200 rounded w-32" />
                <div className="h-4 bg-gray-200 rounded w-24" />
              </div>
            </div>
          </div>
          <StatsGrid stats={undefined} />
        </div>
      </DefaultPageLayout>
    )
  }

  // Empty state - no relationships or entries
  if (!dashboardData || dashboardData.relationships.length === 0) {
    return <EmptyDashboard userName={user?.firstName || ''} />
  }

  return (
    <DefaultPageLayout>
      <div className="container max-w-none flex h-full w-full flex-col items-start gap-8 bg-default-background py-8">
        {/* Header */}
        <DashboardHeader
          user={user ? { firstName: user.firstName || undefined } : null}
          stats={dashboardStats}
          isLoading={false}
        />

        {/* Stats Grid */}
        <StatsGrid stats={dashboardStats} />

        {/* Main Content Grid */}
        <div className="flex w-full items-start gap-6">
          <div className="flex grow shrink-0 basis-0 flex-col items-start gap-6">
            {/* Relationship Health Overview */}
            <div className="flex w-full flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6">
              <div className="flex w-full items-center justify-between">
                <span className="text-heading-3 font-heading-3 text-default-font">
                  Relationship Health Overview
                </span>
                <ToggleGroup value="" onValueChange={(value: string) => {}}>
                  <ToggleGroup.Item icon={null} value="3596e315">
                    Week
                  </ToggleGroup.Item>
                  <ToggleGroup.Item icon={null} value="d7624619">
                    Month
                  </ToggleGroup.Item>
                  <ToggleGroup.Item icon={null} value="b829d1ba">
                    Year
                  </ToggleGroup.Item>
                </ToggleGroup>
              </div>
              <LineChart
                categories={['Biology', 'Business', 'Psychology']}
                data={[
                  {
                    Year: '2015',
                    Psychology: 120,
                    Business: 110,
                    Biology: 100,
                  },
                  { Year: '2016', Psychology: 130, Business: 95, Biology: 105 },
                  {
                    Year: '2017',
                    Psychology: 115,
                    Business: 105,
                    Biology: 110,
                  },
                  { Year: '2018', Psychology: 125, Business: 120, Biology: 90 },
                  { Year: '2019', Psychology: 110, Business: 130, Biology: 85 },
                  { Year: '2020', Psychology: 135, Business: 100, Biology: 95 },
                  {
                    Year: '2021',
                    Psychology: 105,
                    Business: 115,
                    Biology: 120,
                  },
                  {
                    Year: '2022',
                    Psychology: 140,
                    Business: 125,
                    Biology: 130,
                  },
                ]}
                index={'Year'}
              />
            </div>

            {/* Recent Journal Entries */}
            <div className="flex w-full flex-col items-start gap-4">
              <span className="text-heading-3 font-heading-3 text-default-font">
                Recent Journal Entries
              </span>
              <Table
                header={
                  <Table.HeaderRow>
                    <Table.HeaderCell>Person</Table.HeaderCell>
                    <Table.HeaderCell>Category</Table.HeaderCell>
                    <Table.HeaderCell>Date</Table.HeaderCell>
                    <Table.HeaderCell>Sentiment</Table.HeaderCell>
                    <Table.HeaderCell />
                  </Table.HeaderRow>
                }
              >
                <Table.Row>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <Avatar size="small" image="">
                        J
                      </Avatar>
                      <span className="text-body-bold font-body-bold text-default-font">
                        John Smith
                      </span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge>Professional</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-body font-body text-subtext-color">
                      Today
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Progress value={85} />
                  </Table.Cell>
                  <Table.Cell>
                    <IconButton
                      icon={<FeatherMoreVertical />}
                      onClick={(
                        event: React.MouseEvent<HTMLButtonElement>
                      ) => {}}
                    />
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <Avatar size="small" image="">
                        M
                      </Avatar>
                      <span className="text-body-bold font-body-bold text-default-font">
                        Mom
                      </span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant="warning">Family</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-body font-body text-subtext-color">
                      Yesterday
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Progress value={92} />
                  </Table.Cell>
                  <Table.Cell>
                    <IconButton
                      icon={<FeatherMoreVertical />}
                      onClick={(
                        event: React.MouseEvent<HTMLButtonElement>
                      ) => {}}
                    />
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <Avatar size="small" image="">
                        E
                      </Avatar>
                      <span className="text-body-bold font-body-bold text-default-font">
                        Emma
                      </span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge variant="error">Romantic</Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-body font-body text-subtext-color">
                      2 days ago
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Progress value={78} />
                  </Table.Cell>
                  <Table.Cell>
                    <IconButton
                      icon={<FeatherMoreVertical />}
                      onClick={(
                        event: React.MouseEvent<HTMLButtonElement>
                      ) => {}}
                    />
                  </Table.Cell>
                </Table.Row>
              </Table>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex w-64 flex-none flex-col items-start gap-6">
            {/* Quick Actions */}
            <div className="flex w-full flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6">
              <span className="text-heading-3 font-heading-3 text-default-font">
                Quick Actions
              </span>
              <div className="flex w-full flex-col items-start gap-2">
                <Button
                  className="h-8 w-full flex-none"
                  icon={<FeatherEdit2 />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                >
                  New Entry
                </Button>
                <Button
                  className="h-8 w-full flex-none"
                  variant="neutral-secondary"
                  icon={<FeatherUsers />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                >
                  View Relationships
                </Button>
                <Button
                  className="h-8 w-full flex-none"
                  variant="neutral-secondary"
                  icon={<FeatherPieChart />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                >
                  View Analytics
                </Button>
              </div>
            </div>

            {/* AI Insights */}
            <div className="flex w-full flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6">
              <span className="text-heading-3 font-heading-3 text-default-font">
                AI Insights
              </span>
              <div className="flex w-full flex-col items-start gap-4">
                <div className="flex w-full items-start gap-2">
                  <IconWithBackground icon={<FeatherTrendingUp />} />
                  <span className="text-body font-body text-default-font">
                    Your professional relationships are showing positive growth
                  </span>
                </div>
                <div className="flex w-full items-start gap-2">
                  <IconWithBackground
                    variant="warning"
                    icon={<FeatherBell />}
                  />
                  <span className="text-body font-body text-default-font">
                    Consider reaching out to family members more frequently
                  </span>
                </div>
                <div className="flex w-full items-start gap-2">
                  <IconWithBackground
                    variant="success"
                    icon={<FeatherHeart />}
                  />
                  <span className="text-body font-body text-default-font">
                    Your romantic relationship is stable and healthy
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  )
}
