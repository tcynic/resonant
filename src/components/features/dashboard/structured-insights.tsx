'use client'

import React from 'react'
import {
  LangExtractResult,
  LangExtractEmotion,
  LangExtractTheme,
  LangExtractTrigger,
} from '@/lib/types'

interface StructuredInsightsProps {
  langExtractData: LangExtractResult
  className?: string
  compact?: boolean
}

interface EmotionBadgeProps {
  emotion: LangExtractEmotion
}

interface ThemeBadgeProps {
  theme: LangExtractTheme
}

interface TriggerBadgeProps {
  trigger: LangExtractTrigger
}

function EmotionBadge({ emotion }: EmotionBadgeProps) {
  const getEmotionColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'positive':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'negative':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'neutral':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getIntensityIcon = (intensity?: string) => {
    switch (intensity?.toLowerCase()) {
      case 'high':
        return '●●●'
      case 'medium':
        return '●●○'
      case 'low':
        return '●○○'
      default:
        return ''
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getEmotionColor(emotion.type)}`}
      title={`${emotion.text} (${emotion.type}${emotion.intensity ? `, ${emotion.intensity} intensity` : ''})`}
    >
      <span className="mr-1">{getIntensityIcon(emotion.intensity)}</span>
      {emotion.text}
    </span>
  )
}

function ThemeBadge({ theme }: ThemeBadgeProps) {
  const getThemeColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'relationship':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'communication':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'career':
      case 'work':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'family':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'money':
      case 'financial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getThemeColor(theme.category)}`}
      title={`${theme.text} (${theme.category}${theme.context ? `, ${theme.context}` : ''})`}
    >
      {theme.text}
    </span>
  )
}

function TriggerBadge({ trigger }: TriggerBadgeProps) {
  const getTriggerColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return '⚠️'
      case 'medium':
        return '⚡'
      case 'low':
        return '💭'
      default:
        return '📍'
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTriggerColor(trigger.severity)}`}
      title={`${trigger.text} (${trigger.type}${trigger.severity ? `, ${trigger.severity} severity` : ''})`}
    >
      <span className="mr-1">{getSeverityIcon(trigger.severity)}</span>
      {trigger.text}
    </span>
  )
}

export default function StructuredInsights({
  langExtractData,
  className = '',
  compact = false,
}: StructuredInsightsProps) {
  if (!langExtractData.processingSuccess) {
    return null
  }

  const { structuredData } = langExtractData
  const hasData =
    structuredData.emotions.length > 0 ||
    structuredData.themes.length > 0 ||
    structuredData.triggers.length > 0

  if (!hasData) {
    return null
  }

  if (compact) {
    // Compact view for dashboard cards
    return (
      <div className={`${className}`}>
        <div className="text-xs text-gray-500 mb-2 flex items-center">
          <span className="mr-1">🔍</span>
          <span>Enhanced Insights</span>
          {langExtractData.processingTimeMs && (
            <span className="ml-2 text-gray-400">
              ({langExtractData.processingTimeMs}ms)
            </span>
          )}
        </div>

        {/* Show top 3 most relevant items in compact view */}
        <div className="space-y-2">
          {structuredData.emotions.slice(0, 2).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {structuredData.emotions.slice(0, 2).map((emotion, index) => (
                <EmotionBadge key={index} emotion={emotion} />
              ))}
              {structuredData.emotions.length > 2 && (
                <span className="text-xs text-gray-400 px-2 py-1">
                  +{structuredData.emotions.length - 2} more
                </span>
              )}
            </div>
          )}

          {structuredData.themes.slice(0, 2).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {structuredData.themes.slice(0, 2).map((theme, index) => (
                <ThemeBadge key={index} theme={theme} />
              ))}
              {structuredData.themes.length > 2 && (
                <span className="text-xs text-gray-400 px-2 py-1">
                  +{structuredData.themes.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full view for detailed displays
  return (
    <div className={`${className}`}>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
          <span className="mr-2">🔍</span>
          Structured Insights
          {langExtractData.processingTimeMs && (
            <span className="ml-2 text-xs text-gray-400">
              (processed in {langExtractData.processingTimeMs}ms)
            </span>
          )}
        </h4>

        <div className="space-y-4">
          {structuredData.emotions.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2">
                Emotions Detected
              </h5>
              <div className="flex flex-wrap gap-2">
                {structuredData.emotions.map((emotion, index) => (
                  <EmotionBadge key={index} emotion={emotion} />
                ))}
              </div>
            </div>
          )}

          {structuredData.themes.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2">
                Key Themes
              </h5>
              <div className="flex flex-wrap gap-2">
                {structuredData.themes.map((theme, index) => (
                  <ThemeBadge key={index} theme={theme} />
                ))}
              </div>
            </div>
          )}

          {structuredData.triggers.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2">
                Triggers Identified
              </h5>
              <div className="flex flex-wrap gap-2">
                {structuredData.triggers.map((trigger, index) => (
                  <TriggerBadge key={index} trigger={trigger} />
                ))}
              </div>
            </div>
          )}

          {structuredData.communication.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2">
                Communication Patterns
              </h5>
              <div className="flex flex-wrap gap-2">
                {structuredData.communication.map((comm, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-indigo-100 text-indigo-800 border-indigo-200"
                    title={`${comm.text} (${comm.style}${comm.tone ? `, ${comm.tone} tone` : ''})`}
                  >
                    💬 {comm.text}
                  </span>
                ))}
              </div>
            </div>
          )}

          {structuredData.relationships.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-700 mb-2">
                Relationship Dynamics
              </h5>
              <div className="flex flex-wrap gap-2">
                {structuredData.relationships.map((rel, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-teal-100 text-teal-800 border-teal-200"
                    title={`${rel.text} (${rel.type}${rel.dynamic ? `, ${rel.dynamic}` : ''})`}
                  >
                    👥 {rel.text}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
