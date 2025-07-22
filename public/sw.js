// Service Worker for Browser Notifications
const CACHE_NAME = 'resonant-notifications-v1'
const APP_URL = self.location.origin

// Install event
self.addEventListener('install', event => {
  console.log('Service worker installing...')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', event => {
  console.log('Service worker activating...')
  event.waitUntil(self.clients.claim())
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event.notification)

  event.notification.close()

  const notificationData = event.notification.data || {}
  const { reminderId, route } = notificationData

  // Determine where to navigate
  let targetUrl = `${APP_URL}/dashboard`
  if (route) {
    targetUrl = `${APP_URL}${route}`
  } else if (reminderId) {
    targetUrl = `${APP_URL}/journal/new?reminder=${reminderId}`
  }

  // Handle action buttons
  if (event.action) {
    switch (event.action) {
      case 'journal':
        targetUrl = `${APP_URL}/journal/new`
        break
      case 'dismiss':
        // Just close the notification, don't navigate
        return
      case 'view':
        targetUrl = `${APP_URL}/dashboard`
        break
      default:
        break
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          // Send message to client about notification click
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: { reminderId, route },
          })
          return client.focus()
        }
      }

      // If no existing window, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl).then(client => {
          // Send message to new client about notification click
          if (client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              data: { reminderId, route },
            })
          }
          return client
        })
      }
    })
  )
})

// Handle notification close
self.addEventListener('notificationclose', event => {
  console.log('Notification closed:', event.notification)

  const notificationData = event.notification.data || {}
  const { reminderId } = notificationData

  // Optionally track notification dismissals
  if (reminderId) {
    // Could send analytics or update reminder status
    console.log('Notification dismissed for reminder:', reminderId)
  }
})

// Handle messages from the main thread
self.addEventListener('message', event => {
  const { type, data } = event.data || {}

  switch (type) {
    case 'CLEAR_NOTIFICATIONS':
      // Clear all notifications or specific tag
      self.registration
        .getNotifications({ tag: data?.tag })
        .then(notifications => {
          notifications.forEach(notification => notification.close())
        })
      break

    case 'SHOW_NOTIFICATION':
      // Show notification from service worker context
      const { title, body, options } = data
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        requireInteraction: true,
        actions: [
          {
            action: 'journal',
            title: 'Start Journaling',
            icon: '/icons/journal-icon.png',
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
            icon: '/icons/dismiss-icon.png',
          },
        ],
        ...options,
      })
      break

    default:
      break
  }
})

// Handle push events (for future server-sent notifications)
self.addEventListener('push', event => {
  console.log('Push event received:', event)

  if (!event.data) {
    console.log('No push data received')
    return
  }

  try {
    const data = event.data.json()
    const { title, body, icon, badge, tag, actions, ...options } = data

    const notificationOptions = {
      body: body || 'You have a new reminder',
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-72x72.png',
      tag: tag || 'reminder',
      requireInteraction: true,
      data: options.data || {},
      actions: actions || [
        {
          action: 'journal',
          title: 'Start Journaling',
          icon: '/icons/journal-icon.png',
        },
        {
          action: 'dismiss',
          title: 'Later',
          icon: '/icons/dismiss-icon.png',
        },
      ],
      ...options,
    }

    event.waitUntil(
      self.registration.showNotification(
        title || 'Resonant Reminder',
        notificationOptions
      )
    )
  } catch (error) {
    console.error('Error handling push event:', error)
  }
})

// Background sync for offline notification queue (for future use)
self.addEventListener('sync', event => {
  if (event.tag === 'notification-sync') {
    console.log('Background sync: notification-sync')

    event.waitUntil(
      // Could sync pending notifications when back online
      syncPendingNotifications()
    )
  }
})

// Helper function for syncing notifications
async function syncPendingNotifications() {
  try {
    // This would fetch pending notifications from IndexedDB
    // and attempt to sync them with the server
    console.log('Syncing pending notifications...')

    // Example implementation:
    // const pendingNotifications = await getFromIndexedDB('pending-notifications')
    // for (const notification of pendingNotifications) {
    //   await sendNotificationToServer(notification)
    // }
    // await clearIndexedDB('pending-notifications')
  } catch (error) {
    console.error('Error syncing notifications:', error)
  }
}

console.log('Service worker loaded and ready')
