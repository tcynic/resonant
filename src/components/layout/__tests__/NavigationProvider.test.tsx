import { renderHook, act } from '@testing-library/react'
import { NavigationProvider, useNavigation } from '../NavigationProvider'
import {
  RecentItem,
  BreadcrumbItem,
  NotificationCount,
  NavigationPreferences,
} from '../types'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('NavigationProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should provide initial navigation state', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    })

    expect(result.current.state).toEqual({
      currentRoute: '/',
      sidebarCollapsed: false,
      recentItems: [],
      notifications: {
        total: 0,
        unread: 0,
        types: {
          reminders: 0,
          insights: 0,
          system: 0,
        },
      },
      userPreferences: {
        sidebarDefaultCollapsed: false,
        showRecentItems: true,
        maxRecentItems: 10,
      },
      breadcrumbs: [],
    })
  })

  it('should toggle sidebar collapse state', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    })

    expect(result.current.state.sidebarCollapsed).toBe(false)

    act(() => {
      result.current.toggleSidebar()
    })

    expect(result.current.state.sidebarCollapsed).toBe(true)

    act(() => {
      result.current.toggleSidebar()
    })

    expect(result.current.state.sidebarCollapsed).toBe(false)
  })

  it('should add recent items and limit to max items', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    })

    const recentItem1: RecentItem = {
      id: 'item1',
      type: 'journal',
      title: 'Test Entry 1',
      href: '/journal/1',
      timestamp: Date.now(),
    }

    const recentItem2: RecentItem = {
      id: 'item2',
      type: 'relationship',
      title: 'Test Relationship',
      href: '/relationships/1',
      timestamp: Date.now() + 1000,
    }

    act(() => {
      result.current.addRecentItem(recentItem1)
    })

    expect(result.current.state.recentItems).toHaveLength(1)
    expect(result.current.state.recentItems[0]).toEqual(recentItem1)

    act(() => {
      result.current.addRecentItem(recentItem2)
    })

    expect(result.current.state.recentItems).toHaveLength(2)
    expect(result.current.state.recentItems[0]).toEqual(recentItem2) // Most recent first
  })

  it('should remove recent items', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    })

    const recentItem: RecentItem = {
      id: 'item1',
      type: 'journal',
      title: 'Test Entry',
      href: '/journal/1',
      timestamp: Date.now(),
    }

    act(() => {
      result.current.addRecentItem(recentItem)
    })

    expect(result.current.state.recentItems).toHaveLength(1)

    act(() => {
      result.current.removeRecentItem('item1')
    })

    expect(result.current.state.recentItems).toHaveLength(0)
  })

  it('should update breadcrumbs', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    })

    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/dashboard', isActive: false },
      { label: 'Journal', href: '/journal', isActive: true },
    ]

    act(() => {
      result.current.updateBreadcrumbs(breadcrumbs)
    })

    expect(result.current.state.breadcrumbs).toEqual(breadcrumbs)
  })

  it('should update notifications', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    })

    const notifications: NotificationCount = {
      total: 5,
      unread: 3,
      types: {
        reminders: 2,
        insights: 2,
        system: 1,
      },
    }

    act(() => {
      result.current.updateNotifications(notifications)
    })

    expect(result.current.state.notifications).toEqual(notifications)
  })

  it('should update user preferences', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    })

    const preferences: Partial<NavigationPreferences> = {
      sidebarDefaultCollapsed: true,
      maxRecentItems: 5,
    }

    act(() => {
      result.current.updatePreferences(preferences)
    })

    expect(result.current.state.userPreferences).toEqual({
      sidebarDefaultCollapsed: true,
      showRecentItems: true, // unchanged
      maxRecentItems: 5,
    })
  })

  it('should save sidebar state to localStorage', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    })

    act(() => {
      result.current.toggleSidebar()
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'navigation_sidebar_collapsed',
      'true'
    )
  })

  it('should load state from localStorage on mount', () => {
    localStorageMock.getItem.mockImplementation(key => {
      switch (key) {
        case 'navigation_sidebar_collapsed':
          return 'true'
        case 'navigation_recent_items':
          return JSON.stringify([
            {
              id: 'saved_item',
              type: 'journal',
              title: 'Saved Entry',
              href: '/journal/saved',
              timestamp: Date.now(),
            },
          ])
        case 'navigation_user_preferences':
          return JSON.stringify({
            sidebarDefaultCollapsed: true,
            maxRecentItems: 5,
          })
        default:
          return null
      }
    })

    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    })

    // Check that state was loaded from localStorage
    expect(result.current.state.sidebarCollapsed).toBe(true)
    expect(result.current.state.recentItems).toHaveLength(1)
    expect(result.current.state.recentItems[0].id).toBe('saved_item')
    expect(result.current.state.userPreferences.sidebarDefaultCollapsed).toBe(
      true
    )
    expect(result.current.state.userPreferences.maxRecentItems).toBe(5)
  })

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error
    console.error = jest.fn()

    expect(() => {
      renderHook(() => useNavigation())
    }).toThrow('useNavigation must be used within a NavigationProvider')

    console.error = originalError
  })

  it('should handle localStorage errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    // Should not throw, just log error
    const { result } = renderHook(() => useNavigation(), {
      wrapper: NavigationProvider,
    })

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error loading navigation state from localStorage:',
      expect.any(Error)
    )

    // Should still have initial state
    expect(result.current.state.sidebarCollapsed).toBe(false)

    consoleSpy.mockRestore()
  })
})
