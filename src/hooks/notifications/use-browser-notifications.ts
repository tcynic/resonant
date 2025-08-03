'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { NOTIFICATION_CONFIG } from '@/lib/constants/app-config'
import {
  handleAsyncOperation,
  logError,
  ErrorCategory,
  createAppError,
  ErrorSeverity,
} from '@/lib/utils/error-handling'

// Import constants from centralized configuration
const {
  AUTO_CLOSE_DELAY: NOTIFICATION_AUTO_CLOSE_DELAY,
  DEFAULT_ICON,
  DEFAULT_BADGE,
  REQUIRE_INTERACTION_DEFAULT,
  SILENT_DEFAULT,
} = NOTIFICATION_CONFIG

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

  // Create stable navigation function to avoid dependency cycles
  const navigateToRoute = useCallback(
    (route: string) => {
      router.push(route)
    },
    [router]
  )

  // Store the handleNotificationClick function in a ref to avoid dependency cycles
  const handleNotificationClickRef = useRef<
    ((reminderId: Id<'reminderLogs'>) => Promise<void>) | null
  >(null)

  // Handle notification click events with standardized error handling
  const handleNotificationClick = useCallback(
    async (reminderId: Id<'reminderLogs'>) => {
      try {
        await markReminderClicked({ reminderId })
        if (process.env.NODE_ENV === 'development') {
          console.log('Marked reminder as clicked:', reminderId)
        }
      } catch (error) {
        // Log error but don't show to user (background operation)
        if (process.env.NODE_ENV === 'development') {
          console.log('Failed to mark reminder as clicked:', reminderId, error)
        }
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
      const isSupported =
        'Notification' in window && typeof Notification !== 'undefined'
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

      const { data: permission } = await handleAsyncOperation(
        () => Notification.requestPermission(),
        {
          category: ErrorCategory.NOTIFICATION,
          fallbackValue: 'denied' as NotificationPermission,
          onError: appError => {
            // Only log in non-test environments
            if (process.env.NODE_ENV !== 'test') {
              logError(appError)
            }
          },
        }
      )

      const finalPermission = permission || 'denied'
      setState(prev => ({
        ...prev,
        permission: finalPermission,
        isEnabled: finalPermission === 'granted',
      }))

      return finalPermission
    }, [state.isSupported])

  // Show a browser notification
  const showNotification = useCallback(
    async (options: NotificationOptions): Promise<Notification | null> => {
      if (!state.isEnabled) {
        console.warn('Browser notifications not enabled')
        return null
      }

      const { data: notification } = await handleAsyncOperation(
        async () => {
          const notif = new Notification(options.title, {
            body: options.body,
            icon: options.icon || DEFAULT_ICON,
            badge: options.badge || DEFAULT_BADGE,
            tag: options.tag,
            data: options.data,
            requireInteraction:
              options.requireInteraction ?? REQUIRE_INTERACTION_DEFAULT,
            silent: options.silent ?? SILENT_DEFAULT,
          })

          // Handle notification click
          notif.onclick = event => {
            event.preventDefault()

            // Try to focus window, but handle gracefully in test environments
            try {
              if (
                process.env.NODE_ENV !== 'test' &&
                typeof window.focus === 'function'
              ) {
                window.focus()
              }
            } catch (focusError) {
              // Log focus errors only in development
              if (process.env.NODE_ENV === 'development') {
                const appError = createAppError(
                  'Could not focus window',
                  ErrorCategory.NOTIFICATION,
                  ErrorSeverity.LOW,
                  { details: { focusError }, userFriendly: false }
                )
                logError(appError)
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
              navigateToRoute(options.data.route)
            } else {
              navigateToRoute('/dashboard')
            }

            notif.close()
          }

          // Auto-close after delay (unless requireInteraction is true)
          if (!options.requireInteraction) {
            setTimeout(() => {
              notif.close()
            }, NOTIFICATION_AUTO_CLOSE_DELAY)
          }

          return notif
        },
        {
          category: ErrorCategory.NOTIFICATION,
          fallbackValue: null,
          onError: appError => {
            // Log notification creation errors
            logError(appError)
          },
        }
      )

      return notification
    },
    [state.isEnabled, handleNotificationClick, navigateToRoute]
  )

  // Clear notifications
  const clearNotifications = useCallback((tag?: string) => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker?.controller) {
        // If service worker is available, use it to clear notifications
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_NOTIFICATIONS',
          tag,
        })
      }
    } catch (error) {
      // Log service worker errors only in development
      if (process.env.NODE_ENV === 'development') {
        const appError = createAppError(
          'Could not clear notifications via service worker',
          ErrorCategory.NOTIFICATION,
          ErrorSeverity.LOW,
          { details: { error }, userFriendly: false }
        )
        logError(appError)
      }
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
      const appError = createAppError(
        'Failed to register service worker',
        ErrorCategory.NOTIFICATION,
        ErrorSeverity.MEDIUM,
        { details: { error }, userFriendly: false }
      )
      logError(appError)
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
