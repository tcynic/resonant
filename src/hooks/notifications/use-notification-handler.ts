'use client'

import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useBrowserNotifications } from './use-browser-notifications'
import { useIsClient } from '@/hooks/use-is-client'

interface ReminderNotification {
  _id: string
  reminderType: 'gentle_nudge' | 'relationship_focus' | 'health_alert'
  content: string
  scheduledTime: number
  targetRelationshipId?: string
  metadata: {
    triggerReason: string
    healthScoreAtTime?: number
    daysSinceLastEntry?: number
  }
}

export function useNotificationHandler() {
  const { user } = useUser()
  const isClient = useIsClient()
  const { showNotification, state } = useBrowserNotifications()
  const processedNotifications = useRef(new Set<string>())

  // Get user data
  const userData = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  )

  // Get scheduled reminders that are due
  const dueReminders = useQuery(
    api.notifications.getScheduledReminders,
    isClient ? { beforeTime: Date.now() } : 'skip'
  )

  // Process due reminders and show notifications
  useEffect(() => {
    if (!isClient || !state.isEnabled || !dueReminders || !userData) {
      return
    }

    const processReminders = async () => {
      // Filter reminders for this user that haven't been processed
      const userReminders = dueReminders.filter(
        reminder =>
          reminder.userId === userData._id &&
          !processedNotifications.current.has(reminder._id) &&
          reminder.status === 'scheduled'
      )

      for (const reminder of userReminders) {
        try {
          const notificationOptions = createNotificationFromReminder(reminder)
          await showNotification(notificationOptions)

          // Mark as processed to avoid duplicates
          processedNotifications.current.add(reminder._id)

          console.log('Showed notification for reminder:', reminder._id)
        } catch (error) {
          console.error(
            'Failed to show notification for reminder:',
            reminder._id,
            error
          )
        }
      }
    }

    processReminders()
  }, [isClient, state.isEnabled, dueReminders, userData, showNotification])

  // Clean up processed notifications periodically
  useEffect(() => {
    const cleanup = () => {
      // Keep only recent IDs to prevent memory leak
      const recentCutoff = Date.now() - 24 * 60 * 60 * 1000 // 24 hours
      const recentIds = new Set<string>()

      if (dueReminders) {
        dueReminders
          .filter(r => r.createdAt > recentCutoff)
          .forEach(r => recentIds.add(r._id))
      }

      processedNotifications.current = recentIds
    }

    const interval = setInterval(cleanup, 60 * 60 * 1000) // Clean up every hour
    return () => clearInterval(interval)
  }, [dueReminders])
}

// Helper function to create notification options from reminder data
function createNotificationFromReminder(reminder: ReminderNotification) {
  const baseOptions = {
    requireInteraction: true,
    data: {
      reminderId: reminder._id,
      reminderType: reminder.reminderType,
      route: getRouteFromReminderType(
        reminder.reminderType,
        reminder.targetRelationshipId
      ),
    },
  }

  switch (reminder.reminderType) {
    case 'gentle_nudge':
      return {
        title: '🌸 Gentle Reminder',
        body: reminder.content,
        icon: '/icons/gentle-nudge.png',
        tag: 'gentle-nudge',
        actions: [
          {
            action: 'journal',
            title: 'Start Journaling',
            icon: '/icons/journal-action.png',
          },
          {
            action: 'dismiss',
            title: 'Maybe Later',
            icon: '/icons/dismiss-action.png',
          },
        ],
        ...baseOptions,
      }

    case 'relationship_focus':
      return {
        title: '💝 Relationship Check-in',
        body: reminder.content,
        icon: '/icons/relationship-focus.png',
        tag: 'relationship-focus',
        actions: [
          {
            action: 'journal',
            title: 'Reflect Now',
            icon: '/icons/journal-action.png',
          },
          {
            action: 'view',
            title: 'View Relationship',
            icon: '/icons/view-action.png',
          },
          {
            action: 'dismiss',
            title: 'Later',
            icon: '/icons/dismiss-action.png',
          },
        ],
        ...baseOptions,
      }

    case 'health_alert':
      return {
        title: '⚠️ Relationship Health Alert',
        body: reminder.content,
        icon: '/icons/health-alert.png',
        tag: 'health-alert',
        actions: [
          {
            action: 'journal',
            title: 'Address This',
            icon: '/icons/journal-action.png',
          },
          {
            action: 'view',
            title: 'View Dashboard',
            icon: '/icons/dashboard-action.png',
          },
        ],
        ...baseOptions,
      }

    default:
      return {
        title: '🔔 Resonant Reminder',
        body: reminder.content,
        icon: '/icons/default-notification.png',
        tag: 'default',
        actions: [
          {
            action: 'journal',
            title: 'Start Journaling',
            icon: '/icons/journal-action.png',
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/dismiss-action.png',
          },
        ],
        ...baseOptions,
      }
  }
}

// Helper function to determine navigation route based on reminder type
function getRouteFromReminderType(
  reminderType: string,
  targetRelationshipId?: string
): string {
  switch (reminderType) {
    case 'gentle_nudge':
      return '/journal/new'
    case 'relationship_focus':
      return targetRelationshipId
        ? `/journal/new?relationship=${targetRelationshipId}`
        : '/journal/new'
    case 'health_alert':
      return targetRelationshipId
        ? `/dashboard?focus=relationship&id=${targetRelationshipId}`
        : '/dashboard'
    default:
      return '/dashboard'
  }
}
