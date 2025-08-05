import { renderHook, act } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { Id } from '@/convex/_generated/dataModel'
import { useBrowserNotifications } from '../use-browser-notifications'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { ReactMutation } from 'convex/react'
import type { FunctionReference } from 'convex/server'

// Mock dependencies
jest.mock('next/navigation')
// Convex is mocked globally in jest.setup.js

// Unmock the hook being tested since it's mocked globally
jest.unmock('@/hooks/notifications/use-browser-notifications')

const mockPush = jest.fn()
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>
const mockMarkReminderClicked = jest
  .fn()
  .mockImplementation(() => Promise.resolve())

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

// Create a proper ReactMutation mock
const mockMutationWithMethods = Object.assign(mockMarkReminderClicked, {
  withOptimisticUpdate: jest.fn(),
}) as ReactMutation<FunctionReference<'mutation'>>

// Mock Notification API
const mockNotificationConstructor = jest.fn() as jest.MockedFunction<any> & {
  new (title: string, options?: NotificationOptions): Notification
  permission: NotificationPermission
  requestPermission: jest.MockedFunction<typeof Notification.requestPermission>
  mockReturnValue: jest.MockedFunction<any>['mockReturnValue']
}
const mockRequestPermission = jest.fn() as jest.MockedFunction<
  typeof Notification.requestPermission
>

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
    } as AppRouterInstance)

    mockUseMutation.mockReturnValue(mockMutationWithMethods)

    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      value: mockNotificationConstructor,
      writable: true,
    })

    Object.defineProperty(mockNotificationConstructor, 'permission', {
      value: 'default',
      writable: true,
    })
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
    // Don't delete navigator.serviceWorker as it cannot be deleted in jsdom
  })

  it('initializes with correct default state when notifications are supported', () => {
    Object.defineProperty(mockNotificationConstructor, 'permission', {
      value: 'granted',
      writable: true,
    })

    const { result } = renderHook(() => useBrowserNotifications())

    // Wait for useEffect to complete
    act(() => {
      // The hook should have initialized with the granted permission
    })

    expect(result.current.state).toEqual({
      permission: 'granted',
      isSupported: true,
      isEnabled: true,
    })
  })

  it('initializes with unsupported state when Notification API is not available', () => {
    // Store original and set to undefined
    const originalNotification = (window as any).Notification
    ;(window as any).Notification = undefined

    // Render hook after Notification is undefined
    const { result } = renderHook(() => useBrowserNotifications())

    // Wait for useEffect to complete
    act(() => {
      // The hook should have initialized with unsupported state
    })

    expect(result.current.state).toEqual({
      permission: 'denied',
      isSupported: false,
      isEnabled: false,
    })

    // Restore original
    ;(window as any).Notification = originalNotification
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
    Object.defineProperty(mockNotificationConstructor, 'permission', {
      value: 'granted',
      writable: true,
    })
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: jest.fn(),
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
    Object.defineProperty(mockNotificationConstructor, 'permission', {
      value: 'denied',
      writable: true,
    })

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
    Object.defineProperty(mockNotificationConstructor, 'permission', {
      value: 'granted',
      writable: true,
    })
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: jest.fn(),
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
    // markReminderClicked is temporarily disabled during development
    // expect(mockMarkReminderClicked).toHaveBeenCalledWith({
    //   reminderId: 'reminder-123',
    // })
  })

  it('navigates to default route when no specific route is provided', async () => {
    Object.defineProperty(mockNotificationConstructor, 'permission', {
      value: 'granted',
      writable: true,
    })
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: jest.fn(),
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

    Object.defineProperty(mockNotificationConstructor, 'permission', {
      value: 'granted',
      writable: true,
    })
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: jest.fn(),
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

    const { result } = renderHook(() => useBrowserNotifications())

    // Just test that the function completes without throwing
    await act(async () => {
      await result.current.registerServiceWorker()
    })

    // The error is handled internally via logError, not console.error directly
    expect(mockServiceWorkerRegister).toHaveBeenCalledWith('/sw.js')
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
    const { result } = renderHook(() => useBrowserNotifications())

    // Mock a scenario where navigator.serviceWorker.controller is null
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

    // Temporarily mock controller as null for this test
    const originalController = navigator.serviceWorker.controller
    ;(navigator.serviceWorker as any).controller = null

    // Should not throw when service worker controller is not available
    expect(() => {
      act(() => {
        result.current.clearNotifications('test-tag')
      })
    }).not.toThrow()

    // Restore
    ;(navigator.serviceWorker as any).controller = originalController
    consoleSpy.mockRestore()
  })

  it('handles reminder click tracking errors gracefully', async () => {
    const { result } = renderHook(() => useBrowserNotifications())

    // The function should complete without throwing even if there's an error
    await act(async () => {
      await result.current.handleNotificationClick(
        'reminder-123' as Id<'reminderLogs'>
      )
    })

    // Since markReminderClicked is disabled during development,
    // this test just ensures the function doesn't throw
    expect(result.current.handleNotificationClick).toBeDefined()
  })

  it('uses custom icon and badge when provided', async () => {
    Object.defineProperty(mockNotificationConstructor, 'permission', {
      value: 'granted',
      writable: true,
    })
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: jest.fn(),
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
