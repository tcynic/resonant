'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  TestTube,
  Play,
  Pause,
  BarChart3,
  Target,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Eye,
  MousePointer,
  Plus,
} from 'lucide-react'
import Card from '@/components/ui/card'
import Button from '@/components/ui/button'

interface ABTestingManagerProps {
  className?: string
}

interface ABTest {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'paused' | 'completed'
  reminderType: 'gentle_nudge' | 'relationship_focus' | 'health_alert'
  variants: Array<{
    id: string
    name: string
    template: string
    weight: number // 0-100, percentage of traffic
    impressions: number
    clicks: number
    conversions: number
  }>
  targetCriteria: {
    engagementScore?: { min: number; max: number }
    relationshipTypes?: string[]
    timeOfDay?: string[]
    minSampleSize: number
  }
  startDate?: number
  endDate?: number
  statisticalSignificance?: number
  createdAt: number
  updatedAt: number
}

// Mock A/B test data - in real implementation, this would come from Convex
const MOCK_AB_TESTS: ABTest[] = [
  {
    id: 'test-1',
    name: 'Gentle Nudge Tone Test',
    description: 'Testing formal vs casual tone in gentle nudge reminders',
    status: 'running',
    reminderType: 'gentle_nudge',
    variants: [
      {
        id: 'variant-a',
        name: 'Casual Tone',
        template:
          "Hey {{userFirstName}}! It's been a while since your last journal entry. How are you feeling today?",
        weight: 50,
        impressions: 245,
        clicks: 67,
        conversions: 23,
      },
      {
        id: 'variant-b',
        name: 'Formal Tone',
        template:
          'Hello {{userFirstName}}. It has been some time since your last journal entry. Would you like to reflect on your recent experiences?',
        weight: 50,
        impressions: 238,
        clicks: 52,
        conversions: 18,
      },
    ],
    targetCriteria: {
      engagementScore: { min: 30, max: 80 },
      minSampleSize: 100,
    },
    startDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    statisticalSignificance: 0.95,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'test-2',
    name: 'Relationship Focus Urgency',
    description:
      'Testing different urgency levels in relationship-focused reminders',
    status: 'completed',
    reminderType: 'relationship_focus',
    variants: [
      {
        id: 'variant-c',
        name: 'Low Urgency',
        template:
          'When you have a moment, consider reflecting on your relationship with {{relationshipName}}.',
        weight: 33,
        impressions: 156,
        clicks: 42,
        conversions: 19,
      },
      {
        id: 'variant-d',
        name: 'Medium Urgency',
        template:
          "It's been {{daysSinceLastEntry}} days since you've thought about {{relationshipName}}. How are things?",
        weight: 34,
        impressions: 162,
        clicks: 51,
        conversions: 24,
      },
      {
        id: 'variant-e',
        name: 'High Urgency',
        template:
          'Important: Your relationship with {{relationshipName}} needs attention. Please take time to reflect.',
        weight: 33,
        impressions: 159,
        clicks: 38,
        conversions: 12,
      },
    ],
    targetCriteria: {
      relationshipTypes: ['partner', 'family'],
      minSampleSize: 150,
    },
    startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
    endDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    statisticalSignificance: 0.99,
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'test-3',
    name: 'Time-Sensitive Health Alerts',
    description: 'Testing immediate vs scheduled health alert delivery',
    status: 'draft',
    reminderType: 'health_alert',
    variants: [
      {
        id: 'variant-f',
        name: 'Immediate Alert',
        template:
          'Your relationship with {{relationshipName}} shows concerning patterns. Address this now.',
        weight: 50,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
      {
        id: 'variant-g',
        name: 'Scheduled Alert',
        template:
          "We've noticed some patterns with {{relationshipName}}. When you're ready, let's explore this together.",
        weight: 50,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
    ],
    targetCriteria: {
      engagementScore: { min: 60, max: 100 },
      minSampleSize: 50,
    },
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
]

export function ABTestingManager({ className = '' }: ABTestingManagerProps) {
  const { user } = useUser()
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'details' | 'create'>(
    'overview'
  )
  const [abTests] = useState<ABTest[]>(MOCK_AB_TESTS) // Would come from Convex query

  // Get user data
  const userData = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  )

  const calculateClickRate = (impressions: number, clicks: number): number => {
    return impressions > 0 ? (clicks / impressions) * 100 : 0
  }

  const calculateConversionRate = (
    clicks: number,
    conversions: number
  ): number => {
    return clicks > 0 ? (conversions / clicks) * 100 : 0
  }

  const calculateStatisticalSignificance = (
    variantA: ABTest['variants'][0],
    variantB: ABTest['variants'][0]
  ): number => {
    // Simplified chi-square test calculation
    const rateA = calculateClickRate(variantA.impressions, variantA.clicks)
    const rateB = calculateClickRate(variantB.impressions, variantB.clicks)

    if (variantA.impressions < 30 || variantB.impressions < 30) return 0

    // Mock calculation for demo - in real implementation would use proper statistical test
    const difference = Math.abs(rateA - rateB)
    const totalSample = variantA.impressions + variantB.impressions

    if (totalSample > 200 && difference > 5) return 0.95
    if (totalSample > 100 && difference > 8) return 0.9
    if (totalSample > 50 && difference > 12) return 0.85

    return Math.min(0.8, (totalSample / 300) * (difference / 20))
  }

  const getWinningVariant = (test: ABTest) => {
    if (test.variants.length < 2) return null

    return test.variants.reduce((best, current) => {
      const bestRate = calculateClickRate(best.impressions, best.clicks)
      const currentRate = calculateClickRate(
        current.impressions,
        current.clicks
      )
      return currentRate > bestRate ? current : best
    })
  }

  const getStatusIcon = (status: ABTest['status']) => {
    switch (status) {
      case 'running':
        return <Play className="w-4 h-4 text-green-500" />
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      case 'draft':
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: ABTest['status']) => {
    switch (status) {
      case 'running':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'paused':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'completed':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'draft':
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const selectedTestData = selectedTest
    ? abTests.find(t => t.id === selectedTest)
    : null

  if (!userData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    )
  }

  if (viewMode === 'details' && selectedTestData) {
    const winningVariant = getWinningVariant(selectedTestData)
    const significance =
      selectedTestData.variants.length >= 2
        ? calculateStatisticalSignificance(
            selectedTestData.variants[0],
            selectedTestData.variants[1]
          )
        : 0

    return (
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setViewMode('overview')}
              variant="ghost"
              size="sm"
            >
              ← Back
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {selectedTestData.name}
              </h2>
              <p className="text-gray-600">{selectedTestData.description}</p>
            </div>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(selectedTestData.status)}`}
          >
            {getStatusIcon(selectedTestData.status)}
            <span className="ml-2 capitalize">{selectedTestData.status}</span>
          </div>
        </div>

        {/* Test Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm text-gray-600">Total Participants</div>
                <div className="text-xl font-bold text-gray-900">
                  {selectedTestData.variants.reduce(
                    (sum, v) => sum + v.impressions,
                    0
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-sm text-gray-600">
                  Statistical Significance
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {(significance * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-sm text-gray-600">Duration</div>
                <div className="text-xl font-bold text-gray-900">
                  {selectedTestData.startDate
                    ? Math.ceil(
                        (Date.now() - selectedTestData.startDate) /
                          (24 * 60 * 60 * 1000)
                      )
                    : 0}{' '}
                  days
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Variant Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Variant Performance
          </h3>

          <div className="space-y-4">
            {selectedTestData.variants.map(variant => {
              const clickRate = calculateClickRate(
                variant.impressions,
                variant.clicks
              )
              const conversionRate = calculateConversionRate(
                variant.clicks,
                variant.conversions
              )
              const isWinner = winningVariant?.id === variant.id

              return (
                <div
                  key={variant.id}
                  className={`border rounded-lg p-4 ${
                    isWinner
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">
                        {variant.name}
                      </h4>
                      {isWinner && significance > 0.9 && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Winner
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {variant.weight}% traffic
                    </div>
                  </div>

                  <div className="text-sm text-gray-700 mb-4 p-3 bg-gray-50 rounded border-l-4 border-gray-300 italic">
                    &quot;{variant.template}&quot;
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Impressions</div>
                      <div className="text-lg font-bold text-gray-900">
                        {variant.impressions}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Clicks</div>
                      <div className="text-lg font-bold text-blue-600">
                        {variant.clicks}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Click Rate</div>
                      <div className="text-lg font-bold text-green-600">
                        {clickRate.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">
                        Conversion Rate
                      </div>
                      <div className="text-lg font-bold text-purple-600">
                        {conversionRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Progress bars */}
                  <div className="mt-4 space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Click Rate</span>
                        <span>{clickRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(clickRate * 2, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Recommendations */}
        {significance > 0.9 && winningVariant && (
          <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600 mt-1" />
              <div>
                <h3 className="font-medium text-green-900 mb-2">
                  Test Results: Statistical Significance Achieved
                </h3>
                <div className="text-sm text-green-800">
                  <div className="mb-2">
                    <strong>{winningVariant.name}</strong> is the clear winner
                    with {significance > 0.95 ? 'high' : 'moderate'} confidence
                    ({(significance * 100).toFixed(1)}% statistical
                    significance).
                  </div>
                  <div>
                    <strong>Recommendation:</strong> Deploy this variant to all
                    users and discontinue the test. Expected improvement:{' '}
                    {(
                      calculateClickRate(
                        winningVariant.impressions,
                        winningVariant.clicks
                      ) -
                      calculateClickRate(
                        selectedTestData.variants.find(
                          v => v.id !== winningVariant.id
                        )?.impressions || 0,
                        selectedTestData.variants.find(
                          v => v.id !== winningVariant.id
                        )?.clicks || 0
                      )
                    ).toFixed(1)}
                    % increase in click rate.
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    )
  }

  // Overview mode
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            A/B Testing Dashboard
          </h2>
          <p className="text-gray-600">
            Optimize reminder effectiveness through controlled experiments
          </p>
        </div>

        <Button
          onClick={() => setViewMode('create')}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Test</span>
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <TestTube className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-sm text-gray-600">Active Tests</div>
              <div className="text-xl font-bold text-gray-900">
                {abTests.filter(t => t.status === 'running').length}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-xl font-bold text-gray-900">
                {abTests.filter(t => t.status === 'completed').length}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-500" />
            <div>
              <div className="text-sm text-gray-600">Total Participants</div>
              <div className="text-xl font-bold text-gray-900">
                {abTests.reduce(
                  (sum, test) =>
                    sum +
                    test.variants.reduce(
                      (vSum, variant) => vSum + variant.impressions,
                      0
                    ),
                  0
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <div>
              <div className="text-sm text-gray-600">Avg Improvement</div>
              <div className="text-xl font-bold text-gray-900">+12.3%</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Test List */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Active & Recent Tests
        </h3>

        <div className="space-y-4">
          {abTests.map(test => {
            const totalImpressions = test.variants.reduce(
              (sum, v) => sum + v.impressions,
              0
            )
            const totalClicks = test.variants.reduce(
              (sum, v) => sum + v.clicks,
              0
            )
            const overallClickRate =
              totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
            const winningVariant = getWinningVariant(test)

            return (
              <div
                key={test.id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedTest(test.id)
                  setViewMode('details')
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{test.name}</h4>
                      <div
                        className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(test.status)}`}
                      >
                        {getStatusIcon(test.status)}
                        <span className="ml-1 capitalize">{test.status}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {test.description}
                    </p>

                    <div className="flex items-center space-x-6 text-sm">
                      <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-600">
                          {totalImpressions} views
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <MousePointer className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600">
                          {overallClickRate.toFixed(1)}% CTR
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <BarChart3 className="w-4 h-4 text-purple-500" />
                        <span className="text-gray-600">
                          {test.variants.length} variants
                        </span>
                      </div>

                      {winningVariant && test.status === 'running' && (
                        <div className="text-green-600 font-medium">
                          {winningVariant.name} leading
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {test.startDate
                        ? `${Math.ceil((Date.now() - test.startDate) / (24 * 60 * 60 * 1000))}d ago`
                        : 'Draft'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Best Practices */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <TestTube className="w-6 h-6 text-blue-600 mt-1" />
          <div>
            <h3 className="font-medium text-blue-900 mb-3">
              A/B Testing Best Practices
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <div>
                • Test one element at a time (message tone, timing, or content)
              </div>
              <div>
                • Ensure adequate sample size (minimum 100 participants per
                variant)
              </div>
              <div>
                • Run tests for at least 7 days to account for weekly patterns
              </div>
              <div>
                • Achieve 95% statistical significance before making decisions
              </div>
              <div>
                • Consider practical significance alongside statistical
                significance
              </div>
              <div>• Document and share learnings to improve future tests</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
