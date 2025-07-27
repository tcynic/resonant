'use client'

import {
  MessageSquare,
  Heart,
  AlertTriangle,
  Info,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import Checkbox from '@/components/ui/checkbox'

interface ReminderTypes {
  gentleNudge: boolean
  relationshipFocus: boolean
  healthScoreAlerts: boolean
}

interface ReminderTypeTogglesProps {
  reminderTypes: ReminderTypes
  onReminderTypeChange: (type: keyof ReminderTypes, enabled: boolean) => void
  engagementScore?: number
  className?: string
}

export function ReminderTypeToggles({
  reminderTypes,
  onReminderTypeChange,
  engagementScore = 50,
  className = '',
}: ReminderTypeTogglesProps) {
  const reminderTypeConfigs = [
    {
      key: 'gentleNudge' as const,
      icon: MessageSquare,
      iconColor: 'text-blue-500',
      title: 'Gentle Nudges',
      description:
        "Soft reminders to journal when you haven't written in a while",
      features: [
        'Non-intrusive, encouraging tone',
        'Adapts to your journaling frequency',
        'Perfect for maintaining consistent habits',
        'Increases gradually if you fall behind',
      ],
      recommended: true,
      exampleContent:
        '"Hi there! It\'s been a few days since your last journal entry. How are you feeling today?"',
    },
    {
      key: 'relationshipFocus' as const,
      icon: Heart,
      iconColor: 'text-pink-500',
      title: 'Relationship Focus',
      description:
        'Smart prompts about specific relationships that need attention',
      features: [
        'AI identifies relationships needing reflection',
        'Personalized for each relationship type',
        'Based on recent entry patterns and health scores',
        'Helps maintain connection awareness',
      ],
      recommended: true,
      exampleContent:
        '"You haven\'t reflected on your relationship with Sarah in a while. How have things been lately?"',
    },
    {
      key: 'healthScoreAlerts' as const,
      icon: AlertTriangle,
      iconColor: 'text-orange-500',
      title: 'Health Score Alerts',
      description:
        'Important notifications when relationships may need attention',
      features: [
        'Only for significant health score changes',
        'Triggered by declining relationship trends',
        'Urgent but respectful tone',
        'Helps catch issues early',
      ],
      recommended: false,
      exampleContent:
        '"Your relationship with Alex may need some attention based on recent patterns. Consider reflecting on recent interactions."',
    },
  ]

  const getEngagementRecommendation = (type: keyof ReminderTypes) => {
    if (engagementScore < 30) {
      // Low engagement users
      if (type === 'gentleNudge')
        return 'Recommended - start with gentle reminders'
      if (type === 'relationshipFocus')
        return "Consider once you're more consistent"
      if (type === 'healthScoreAlerts') return 'Not recommended yet'
    } else if (engagementScore >= 30 && engagementScore < 70) {
      // Medium engagement users
      if (type === 'gentleNudge') return 'Recommended'
      if (type === 'relationshipFocus')
        return "Recommended - you're ready for focused prompts"
      if (type === 'healthScoreAlerts')
        return 'Optional - only if you want proactive alerts'
    } else {
      // High engagement users
      if (type === 'gentleNudge') return 'Recommended'
      if (type === 'relationshipFocus') return 'Highly recommended'
      if (type === 'healthScoreAlerts')
        return 'Recommended - you can handle important alerts'
    }
    return ''
  }

  const getEnabledCount = () => {
    return Object.values(reminderTypes).filter(Boolean).length
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Summary */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Reminder Types
            </h3>
            <div className="text-sm text-gray-600">
              Choose which types of reminders you&apos;d like to receive
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600">
              {getEnabledCount()}/3
            </div>
            <div className="text-sm text-gray-600">active</div>
          </div>
        </div>

        {engagementScore && (
          <div className="mt-4 p-3 bg-white/60 rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span className="text-gray-700">
                Your engagement score: <strong>{engagementScore}/100</strong>
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Reminder Type Options */}
      {reminderTypeConfigs.map(
        ({
          key,
          icon: Icon,
          iconColor,
          title,
          description,
          features,
          recommended,
          exampleContent,
        }) => (
          <Card
            key={key}
            className={`p-6 ${
              reminderTypes[key]
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200'
            }`}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div
                    className={`p-2 rounded-lg ${
                      reminderTypes[key] ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        reminderTypes[key] ? 'text-green-600' : iconColor
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {title}
                      </h4>
                      {recommended && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mt-1">{description}</p>
                  </div>
                </div>

                <Checkbox
                  checked={reminderTypes[key]}
                  onChange={e => onReminderTypeChange(key, e.target.checked)}
                />
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-14">
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    Features:
                  </h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    Example:
                  </h5>
                  <div className="text-sm text-gray-600 italic p-3 bg-gray-50 rounded border-l-4 border-gray-300">
                    &quot;{exampleContent}&quot;
                  </div>
                </div>
              </div>

              {/* Engagement-based Recommendation */}
              {engagementScore && (
                <div className="ml-14 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <strong>For your engagement level:</strong>{' '}
                      {getEngagementRecommendation(key)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )
      )}

      {/* Overall Recommendations */}
      <Card className="p-6 border-amber-200 bg-amber-50">
        <div className="flex items-start space-x-3">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 mb-2">
              Smart Recommendations
            </h4>
            <div className="text-sm text-amber-800 space-y-2">
              {engagementScore < 30 && (
                <div>
                  Since you&apos;re building your journaling habit, start with{' '}
                  <strong>Gentle Nudges</strong> only. Add other types once
                  you&apos;re more consistent.
                </div>
              )}
              {engagementScore >= 30 && engagementScore < 70 && (
                <div>
                  You&apos;re developing good habits!{' '}
                  <strong>Gentle Nudges</strong> and{' '}
                  <strong>Relationship Focus</strong>
                  work well together. Consider Health Alerts if you want
                  proactive notifications.
                </div>
              )}
              {engagementScore >= 70 && (
                <div>
                  Excellent engagement! You can benefit from all reminder types.
                  The system will intelligently balance frequency to avoid
                  overwhelming you.
                </div>
              )}
              <div className="text-xs text-amber-700">
                • Reminder frequency automatically adjusts based on your
                responses • All reminders respect your Do Not Disturb settings •
                You can change these settings anytime
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
