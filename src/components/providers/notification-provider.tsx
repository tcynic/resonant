'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { ReminderSettings } from '@/lib/types/convex-types'
import { useBrowserNotifications } from '@/hooks/notifications/use-browser-notifications'
import { useIsClient } from '@/hooks/use-is-client'
import { useConvexUser } from '@/hooks/use-convex-user'

interface NotificationContextType {
  browserNotifications: ReturnType<typeof useBrowserNotifications>
  isNotificationEnabled: boolean
  reminderSettings: ReminderSettings | null
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const isClient = useIsClient()
  const browserNotifications = useBrowserNotifications()
  const userHook = useConvexUser()
  const userData = userHook?.convexUser

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reminderSettings = (userData?.preferences as any)?.reminderSettings as
    | ReminderSettings
    | undefined

  const isNotificationEnabled = Boolean(
    isClient &&
      reminderSettings?.enabled &&
      browserNotifications.state.isEnabled
  )

  // Initialize service worker and notifications on mount
  useEffect(() => {
    if (!isClient) return

    const initializeNotifications = async () => {
      try {
        // Register service worker
        await browserNotifications.registerServiceWorker()
        console.log('Notification system initialized')

        // Auto-request permission if reminders are enabled but permission not granted
        if (
          reminderSettings?.enabled &&
          browserNotifications.state.permission === 'default'
        ) {
          await browserNotifications.requestPermission()
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error)
      }
    }

    // Always register the service worker on client to enable notifications
    initializeNotifications()
  }, [isClient, userData, reminderSettings, browserNotifications])

  // Listen for messages from service worker
  useEffect(() => {
    if (!isClient || !('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {}

      switch (type) {
        case 'NOTIFICATION_CLICKED':
          console.log('Notification clicked from service worker:', data)
          // Handle notification click - could trigger analytics, navigation, etc.
          break
        default:
          break
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [isClient])

  // Provide context for notification testing (development only)
  useEffect(() => {
    if (!isClient || process.env.NODE_ENV !== 'development')
      return // Add global notification testing functions for development
    ;(
      window as unknown as {
        testNotification?: (type?: string) => Promise<void>
      }
    ).testNotification = async (type: string = 'gentle_nudge') => {
      const testNotifications = {
        gentle_nudge: {
          title: 'Gentle Reminder 🌸',
          body: "Hi there! It's been a few days since your last journal entry. How are you feeling today?",
          data: { type: 'gentle_nudge', route: '/journal/new' },
        },
        relationship_focus: {
          title: 'Relationship Check-in 💝',
          body: "You haven't reflected on your relationship with Sarah in a while. How have things been lately?",
          data: {
            type: 'relationship_focus',
            route: '/journal/new?focus=relationship',
          },
        },
        health_alert: {
          title: 'Relationship Health Alert ⚠️',
          body: 'Your relationship with Alex may need some attention based on recent patterns.',
          data: { type: 'health_alert', route: '/dashboard' },
        },
      }

      const notification =
        testNotifications[type as keyof typeof testNotifications]
      if (notification && browserNotifications.state.isEnabled) {
        await browserNotifications.showNotification(notification)
      } else {
        console.log('Test notification:', notification)
        console.log(
          'Notifications enabled:',
          browserNotifications.state.isEnabled
        )
      }
    }

    console.log(
      'Development: Use window.testNotification() to test notifications'
    )
  }, [isClient, browserNotifications])

  const contextValue: NotificationContextType = {
    browserNotifications,
    isNotificationEnabled,
    reminderSettings: reminderSettings ?? null,
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext(): NotificationContextType {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error(
      'useNotificationContext must be used within a NotificationProvider'
    )
  }
  return context
}
