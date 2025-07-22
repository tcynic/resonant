'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Bell, BellOff, Dot } from 'lucide-react'
import { useNotificationContext } from '@/components/providers/notification-provider'

interface NotificationBadgeProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'icon' | 'button' | 'minimal'
}

export function NotificationBadge({
  className = '',
  showText = false,
  size = 'md',
  variant = 'icon',
}: NotificationBadgeProps) {
  const { user } = useUser()
  const { isNotificationEnabled, reminderSettings } = useNotificationContext()
  const [pendingCount, setPendingCount] = useState(0)

  // Get user data
  const userData = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  )

  // Get scheduled reminders
  const scheduledReminders = useQuery(
    api.notifications.getScheduledReminders,
    { beforeTime: Date.now() + 60 * 60 * 1000 } // Next hour
  )

  // Calculate pending notifications count
  useEffect(() => {
    if (!userData || !scheduledReminders) {
      setPendingCount(0)
      return
    }

    const userScheduledCount = scheduledReminders.filter(
      reminder =>
        reminder.userId === userData._id &&
        reminder.status === 'scheduled' &&
        reminder.scheduledTime <= Date.now()
    ).length

    setPendingCount(userScheduledCount)
  }, [userData, scheduledReminders])

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4'
      case 'lg':
        return 'w-8 h-8'
      default:
        return 'w-6 h-6'
    }
  }

  const getBadgeSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3 text-xs'
      case 'lg':
        return 'w-5 h-5 text-sm'
      default:
        return 'w-4 h-4 text-xs'
    }
  }

  const getIconColor = () => {
    if (!reminderSettings?.enabled) {
      return 'text-gray-400'
    }
    if (!isNotificationEnabled) {
      return 'text-yellow-500'
    }
    if (pendingCount > 0) {
      return 'text-blue-600'
    }
    return 'text-green-500'
  }

  const getStatusText = () => {
    if (!reminderSettings?.enabled) {
      return 'Reminders disabled'
    }
    if (!isNotificationEnabled) {
      return 'Notifications blocked'
    }
    if (pendingCount > 0) {
      return `${pendingCount} pending reminder${pendingCount > 1 ? 's' : ''}`
    }
    return 'Notifications active'
  }

  const renderIcon = () => {
    const iconClass = `${getSizeClasses()} ${getIconColor()}`

    if (!reminderSettings?.enabled) {
      return <BellOff className={iconClass} />
    }

    return <Bell className={iconClass} />
  }

  const renderBadge = () => {
    if (pendingCount === 0) return null

    return (
      <div
        className={`
        absolute -top-1 -right-1 
        ${getBadgeSizeClasses()}
        bg-red-500 text-white 
        rounded-full flex items-center justify-center
        font-medium border-2 border-white
        animate-pulse
      `}
      >
        {pendingCount > 99 ? '99+' : pendingCount}
      </div>
    )
  }

  const renderStatusDot = () => {
    if (variant === 'minimal') return null

    const dotColor = (() => {
      if (!reminderSettings?.enabled) return 'text-gray-400'
      if (!isNotificationEnabled) return 'text-yellow-500'
      return 'text-green-500'
    })()

    return <Dot className={`w-3 h-3 ${dotColor} absolute -bottom-1 -right-1`} />
  }

  if (variant === 'minimal') {
    return (
      <div className={`relative inline-flex ${className}`}>
        {renderIcon()}
        {renderBadge()}
      </div>
    )
  }

  if (variant === 'button') {
    return (
      <button
        className={`
          relative inline-flex items-center space-x-2 px-3 py-2
          rounded-lg border transition-colors
          ${
            isNotificationEnabled
              ? 'border-green-200 bg-green-50 hover:bg-green-100'
              : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
          }
          ${className}
        `}
        title={getStatusText()}
      >
        {renderIcon()}
        {showText && (
          <span className="text-sm font-medium text-gray-700">
            {getStatusText()}
          </span>
        )}
        {renderBadge()}
      </button>
    )
  }

  // Default icon variant
  return (
    <div
      className={`relative inline-flex ${className}`}
      title={getStatusText()}
    >
      {renderIcon()}
      {renderBadge()}
      {renderStatusDot()}
    </div>
  )
}

// Notification status summary for dashboard use
export function NotificationStatusSummary({
  className = '',
}: {
  className?: string
}) {
  const { user } = useUser()
  const { isNotificationEnabled, reminderSettings } = useNotificationContext()

  // Get reminder analytics
  const userData = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  )

  const analytics = useQuery(
    api.notifications.getUserReminderAnalytics,
    userData?._id ? { userId: userData._id } : 'skip'
  )

  if (!reminderSettings) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-gray-600">
          <BellOff className="w-5 h-5" />
          <span className="text-sm">Reminders not configured</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`p-4 rounded-lg ${
        isNotificationEnabled
          ? 'bg-green-50 border border-green-200'
          : 'bg-yellow-50 border border-yellow-200'
      } ${className}`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <NotificationBadge size="sm" />
            <span className="font-medium text-gray-900">Smart Reminders</span>
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              isNotificationEnabled
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {isNotificationEnabled ? 'Active' : 'Needs Setup'}
          </div>
        </div>

        {analytics && analytics.totalReminders > 0 && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Engagement</div>
              <div className="font-medium">{analytics.engagementScore}/100</div>
            </div>
            <div>
              <div className="text-gray-600">Click Rate</div>
              <div className="font-medium">
                {analytics.clickThroughRate.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-600">Total Sent</div>
              <div className="font-medium">{analytics.totalReminders}</div>
            </div>
          </div>
        )}

        {!isNotificationEnabled && reminderSettings.enabled && (
          <div className="text-sm text-yellow-700">
            Browser notifications are blocked. Click to enable for the best
            experience.
          </div>
        )}
      </div>
    </div>
  )
}
