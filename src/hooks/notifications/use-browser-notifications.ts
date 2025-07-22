'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

interface NotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  requireInteraction?: boolean
  silent?: boolean
  // Note: actions only work in service worker notifications, not regular browser notifications
}

// Remove actions from the interface since they don't work in regular Notification constructor

interface BrowserNotificationState {
  permission: NotificationPermission
  isSupported: boolean
  isEnabled: boolean
}

interface UseBrowserNotificationsReturn {
  state: BrowserNotificationState
  requestPermission: () => Promise<NotificationPermission>
  showNotification: (
    options: NotificationOptions
  ) => Promise<Notification | null>
  clearNotifications: (tag?: string) => void
  registerServiceWorker: () => Promise<void>
  handleNotificationClick: (reminderId: Id<'reminderLogs'>) => Promise<void>
}

export function useBrowserNotifications(): UseBrowserNotificationsReturn {
  const [state, setState] = useState<BrowserNotificationState>({
    permission: 'default',
    isSupported: false,
    isEnabled: false,
  })

  const router = useRouter()
  const markReminderClicked = useMutation(api.notifications.markReminderClicked)

  // Store the handleNotificationClick function in a ref to avoid dependency cycles
  const handleNotificationClickRef =
    useRef<(reminderId: Id<'reminderLogs'>) => Promise<void>>()

  // Handle notification click events
  const handleNotificationClick = useCallback(
    async (reminderId: Id<'reminderLogs'>) => {
      try {
        await markReminderClicked({ reminderId })
        console.log('Marked reminder as clicked:', reminderId)
      } catch (error) {
        console.error('Failed to mark reminder as clicked:', error)
      }
    },
    [markReminderClicked]
  )

  // Update the ref when the function changes
  useEffect(() => {
    handleNotificationClickRef.current = handleNotificationClick
  }, [handleNotificationClick])

  // Initialize browser notification state
  useEffect(() => {
    const checkSupport = () => {
      const isSupported = 'Notification' in window
      const permission = isSupported ? Notification.permission : 'denied'
      const isEnabled = permission === 'granted'

      setState({
        permission: permission as NotificationPermission,
        isSupported,
        isEnabled,
      })
    }

    checkSupport()

    // Listen for permission changes (some browsers support this)
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'notifications' })
        .then(result => {
          result.addEventListener('change', checkSupport)
          return () => result.removeEventListener('change', checkSupport)
        })
        .catch(() => {
          // Permissions API not supported or permission query failed
        })
    }
  }, [])

  // Request notification permission
  const requestPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (!state.isSupported) {
        console.warn('Browser notifications not supported')
        return 'denied'
      }

      try {
        const permission = await Notification.requestPermission()

        setState(prev => ({
          ...prev,
          permission,
          isEnabled: permission === 'granted',
        }))

        return permission
      } catch (error) {
        console.error('Error requesting notification permission:', error)
        return 'denied'
      }
    }, [state.isSupported])

  // Show a browser notification
  const showNotification = useCallback(
    async (options: NotificationOptions): Promise<Notification | null> => {
      if (!state.isEnabled) {
        console.warn('Browser notifications not enabled')
        return null
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          badge: options.badge || '/icons/icon-72x72.png',
          tag: options.tag,
          data: options.data,
          requireInteraction: options.requireInteraction ?? true,
          silent: options.silent ?? false,
        })

        // Handle notification click
        notification.onclick = event => {
          event.preventDefault()

          // Try to focus window, but handle gracefully in test environments
          try {
            window.focus()
          } catch (error) {
            // Ignore focus errors in test environments
            if (process.env.NODE_ENV !== 'test') {
              console.warn('Could not focus window:', error)
            }
          }

          // Handle reminder-specific clicks
          if (
            options.data?.reminderId &&
            typeof options.data.reminderId === 'string'
          ) {
            handleNotificationClick(
              options.data.reminderId as Id<'reminderLogs'>
            )
          }

          // Navigate to relevant page
          if (options.data?.route && typeof options.data.route === 'string') {
            router.push(options.data.route)
          } else {
            router.push('/dashboard')
          }

          notification.close()
        }

        // Auto-close after delay (unless requireInteraction is true)
        if (!options.requireInteraction) {
          setTimeout(() => {
            notification.close()
          }, 8000) // 8 seconds
        }

        return notification
      } catch (error) {
        console.error('Error showing notification:', error)
        return null
      }
    },
    [state.isEnabled, router, handleNotificationClick]
  )

  // Clear notifications
  const clearNotifications = useCallback((tag?: string) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // If service worker is available, use it to clear notifications
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_NOTIFICATIONS',
        tag,
      })
    }
  }, [])

  // Register service worker for background notifications
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported')
      return
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service worker registered:', registration)

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', event => {
        const { type, data } = event.data

        switch (type) {
          case 'NOTIFICATION_CLICKED':
            if (
              data.reminderId &&
              typeof data.reminderId === 'string' &&
              handleNotificationClickRef.current
            ) {
              handleNotificationClickRef.current(
                data.reminderId as Id<'reminderLogs'>
              )
            }
            break
          default:
            break
        }
      })
    } catch (error) {
      console.error('Service worker registration failed:', error)
    }
  }, [])

  return {
    state,
    requestPermission,
    showNotification,
    clearNotifications,
    registerServiceWorker,
    handleNotificationClick,
  }
}
