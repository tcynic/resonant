import { renderHook, act } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { Id } from '@/convex/_generated/dataModel'
import { useBrowserNotifications } from '../use-browser-notifications'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('convex/react')

const mockPush = jest.fn()
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>
const mockMarkReminderClicked = jest.fn()

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

// Mock Notification API
const mockNotificationConstructor = jest.fn()
const mockRequestPermission = jest.fn()

// Mock Service Worker API
const mockServiceWorkerRegister = jest.fn()
const mockServiceWorkerController = {
  postMessage: jest.fn(),
}

describe('useBrowserNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    })

    mockUseMutation.mockReturnValue(mockMarkReminderClicked)

    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      value: mockNotificationConstructor,
      writable: true,
    })

    mockNotificationConstructor.permission = 'default'
    mockNotificationConstructor.requestPermission = mockRequestPermission

    // Mock Service Worker API
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockServiceWorkerRegister,
        controller: mockServiceWorkerController,
        addEventListener: jest.fn(),
      },
      writable: true,
    })
  })

  afterEach(() => {
    // Clean up window properties
    delete (window as unknown as { Notification?: unknown }).Notification
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker
  })

  it('initializes with correct default state when notifications are supported', () => {
    mockNotificationConstructor.permission = 'granted'

    const { result } = renderHook(() => useBrowserNotifications())

    expect(result.current.state).toEqual({
      permission: 'granted',
      isSupported: true,
      isEnabled: true,
    })
  })

  it('initializes with unsupported state when Notification API is not available', () => {
    delete (window as unknown as { Notification?: unknown }).Notification

    const { result } = renderHook(() => useBrowserNotifications())

    expect(result.current.state).toEqual({
      permission: 'denied',
      isSupported: false,
      isEnabled: false,
    })
  })

  it('requests notification permission successfully', async () => {
    mockRequestPermission.mockResolvedValue('granted')

    const { result } = renderHook(() => useBrowserNotifications())

    let permissionResult
    await act(async () => {
      permissionResult = await result.current.requestPermission()
    })

    expect(mockRequestPermission).toHaveBeenCalled()
    expect(permissionResult).toBe('granted')
    expect(result.current.state.permission).toBe('granted')
    expect(result.current.state.isEnabled).toBe(true)
  })

  it('handles permission request failure gracefully', async () => {
    mockRequestPermission.mockRejectedValue(new Error('Permission denied'))

    const { result } = renderHook(() => useBrowserNotifications())

    let permissionResult
    await act(async () => {
      permissionResult = await result.current.requestPermission()
    })

    expect(permissionResult).toBe('denied')
  })

  it('shows notification when permissions are granted', async () => {
    mockNotificationConstructor.permission = 'granted'
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: null,
    }
    mockNotificationConstructor.mockReturnValue(mockNotificationInstance)

    const { result } = renderHook(() => useBrowserNotifications())

    const notificationOptions = {
      title: 'Test Notification',
      body: 'This is a test',
      data: { reminderId: 'reminder-123' },
    }

    let notification
    await act(async () => {
      notification = await result.current.showNotification(notificationOptions)
    })

    expect(mockNotificationConstructor).toHaveBeenCalledWith(
      'Test Notification',
      {
        body: 'This is a test',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: undefined,
        data: { reminderId: 'reminder-123' },
        requireInteraction: true,
        silent: false,
      }
    )

    expect(notification).toBe(mockNotificationInstance)
  })

  it('does not show notification when permissions are denied', async () => {
    mockNotificationConstructor.permission = 'denied'

    const { result } = renderHook(() => useBrowserNotifications())

    const notificationOptions = {
      title: 'Test Notification',
      body: 'This is a test',
    }

    let notification
    await act(async () => {
      notification = await result.current.showNotification(notificationOptions)
    })

    expect(mockNotificationConstructor).not.toHaveBeenCalled()
    expect(notification).toBeNull()
  })

  it('handles notification click events correctly', async () => {
    mockNotificationConstructor.permission = 'granted'
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: null,
    }
    mockNotificationConstructor.mockReturnValue(mockNotificationInstance)
    mockMarkReminderClicked.mockResolvedValue(undefined)

    const { result } = renderHook(() => useBrowserNotifications())

    const notificationOptions = {
      title: 'Test Notification',
      body: 'This is a test',
      data: { reminderId: 'reminder-123', route: '/dashboard' },
    }

    await act(async () => {
      await result.current.showNotification(notificationOptions)
    })

    // Simulate notification click
    const clickEvent = { preventDefault: jest.fn() }
    await act(async () => {
      mockNotificationInstance.onclick(clickEvent)
    })

    expect(clickEvent.preventDefault).toHaveBeenCalled()
    expect(mockNotificationInstance.close).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
    expect(mockMarkReminderClicked).toHaveBeenCalledWith({
      reminderId: 'reminder-123',
    })
  })

  it('navigates to default route when no specific route is provided', async () => {
    mockNotificationConstructor.permission = 'granted'
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: null,
    }
    mockNotificationConstructor.mockReturnValue(mockNotificationInstance)

    const { result } = renderHook(() => useBrowserNotifications())

    const notificationOptions = {
      title: 'Test Notification',
      body: 'This is a test',
      data: { reminderId: 'reminder-123' },
    }

    await act(async () => {
      await result.current.showNotification(notificationOptions)
    })

    // Simulate notification click
    const clickEvent = { preventDefault: jest.fn() }
    await act(async () => {
      mockNotificationInstance.onclick(clickEvent)
    })

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('auto-closes notifications when requireInteraction is false', async () => {
    jest.useFakeTimers()

    mockNotificationConstructor.permission = 'granted'
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: null,
    }
    mockNotificationConstructor.mockReturnValue(mockNotificationInstance)

    const { result } = renderHook(() => useBrowserNotifications())

    const notificationOptions = {
      title: 'Test Notification',
      body: 'This is a test',
      requireInteraction: false,
    }

    await act(async () => {
      await result.current.showNotification(notificationOptions)
    })

    // Fast-forward 8 seconds
    act(() => {
      jest.advanceTimersByTime(8000)
    })

    expect(mockNotificationInstance.close).toHaveBeenCalled()

    jest.useRealTimers()
  })

  it('registers service worker successfully', async () => {
    mockServiceWorkerRegister.mockResolvedValue({ scope: '/sw.js' })

    const { result } = renderHook(() => useBrowserNotifications())

    await act(async () => {
      await result.current.registerServiceWorker()
    })

    expect(mockServiceWorkerRegister).toHaveBeenCalledWith('/sw.js')
  })

  it('handles service worker registration failure', async () => {
    mockServiceWorkerRegister.mockRejectedValue(
      new Error('Registration failed')
    )
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result } = renderHook(() => useBrowserNotifications())

    await act(async () => {
      await result.current.registerServiceWorker()
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      'Service worker registration failed:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('clears notifications through service worker', () => {
    const { result } = renderHook(() => useBrowserNotifications())

    act(() => {
      result.current.clearNotifications('test-tag')
    })

    expect(mockServiceWorkerController.postMessage).toHaveBeenCalledWith({
      type: 'CLEAR_NOTIFICATIONS',
      tag: 'test-tag',
    })
  })

  it('handles service worker unavailability gracefully', () => {
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker

    const { result } = renderHook(() => useBrowserNotifications())

    // Should not throw when service worker is not available
    act(() => {
      result.current.clearNotifications('test-tag')
    })

    // Re-add for cleanup
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: mockServiceWorkerRegister,
        controller: mockServiceWorkerController,
        addEventListener: jest.fn(),
      },
      writable: true,
    })
  })

  it('handles reminder click tracking errors gracefully', async () => {
    mockMarkReminderClicked.mockRejectedValue(new Error('Network error'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const { result } = renderHook(() => useBrowserNotifications())

    await act(async () => {
      await result.current.handleNotificationClick(
        'reminder-123' as Id<'reminderLogs'>
      )
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to mark reminder as clicked:',
      expect.any(Error)
    )

    consoleSpy.mockRestore()
  })

  it('uses custom icon and badge when provided', async () => {
    mockNotificationConstructor.permission = 'granted'
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: null,
    }
    mockNotificationConstructor.mockReturnValue(mockNotificationInstance)

    const { result } = renderHook(() => useBrowserNotifications())

    const notificationOptions = {
      title: 'Test Notification',
      body: 'This is a test',
      icon: '/custom-icon.png',
      badge: '/custom-badge.png',
      tag: 'custom-tag',
      silent: true,
    }

    await act(async () => {
      await result.current.showNotification(notificationOptions)
    })

    expect(mockNotificationConstructor).toHaveBeenCalledWith(
      'Test Notification',
      {
        body: 'This is a test',
        icon: '/custom-icon.png',
        badge: '/custom-badge.png',
        tag: 'custom-tag',
        data: undefined,
        requireInteraction: true,
        silent: true,
      }
    )
  })
})
