'use client'

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react'
import {
  NavigationState,
  NavigationAction,
  NavigationContextType,
  RecentItem,
  BreadcrumbItem,
  NotificationCount,
  NavigationPreferences,
} from './types'

// Initial state
const initialState: NavigationState = {
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
}

// Navigation reducer
function navigationReducer(
  state: NavigationState,
  action: NavigationAction
): NavigationState {
  switch (action.type) {
    case 'SET_CURRENT_ROUTE':
      return {
        ...state,
        currentRoute: action.payload,
      }

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      }

    case 'SET_SIDEBAR_COLLAPSED':
      return {
        ...state,
        sidebarCollapsed: action.payload,
      }

    case 'ADD_RECENT_ITEM':
      const newRecentItems = [
        action.payload,
        ...state.recentItems.filter(item => item.id !== action.payload.id),
      ].slice(0, state.userPreferences.maxRecentItems)

      return {
        ...state,
        recentItems: newRecentItems,
      }

    case 'REMOVE_RECENT_ITEM':
      return {
        ...state,
        recentItems: state.recentItems.filter(
          item => item.id !== action.payload
        ),
      }

    case 'UPDATE_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload,
      }

    case 'SET_BREADCRUMBS':
      return {
        ...state,
        breadcrumbs: action.payload,
      }

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          ...action.payload,
        },
      }

    default:
      return state
  }
}

// Create context
const NavigationContext = createContext<NavigationContextType | null>(null)

// LocalStorage keys
const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: 'navigation_sidebar_collapsed',
  RECENT_ITEMS: 'navigation_recent_items',
  USER_PREFERENCES: 'navigation_user_preferences',
} as const

// Provider component
export function NavigationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [state, dispatch] = useReducer(navigationReducer, initialState)

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      // Load sidebar state
      const savedSidebarState = localStorage.getItem(
        STORAGE_KEYS.SIDEBAR_COLLAPSED
      )
      if (savedSidebarState !== null) {
        dispatch({
          type: 'SET_SIDEBAR_COLLAPSED',
          payload: JSON.parse(savedSidebarState),
        })
      }

      // Load recent items
      const savedRecentItems = localStorage.getItem(STORAGE_KEYS.RECENT_ITEMS)
      if (savedRecentItems) {
        const recentItems: RecentItem[] = JSON.parse(savedRecentItems)
        recentItems.forEach(item => {
          dispatch({ type: 'ADD_RECENT_ITEM', payload: item })
        })
      }

      // Load user preferences
      const savedPreferences = localStorage.getItem(
        STORAGE_KEYS.USER_PREFERENCES
      )
      if (savedPreferences) {
        const preferences: Partial<NavigationPreferences> =
          JSON.parse(savedPreferences)
        dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences })
      }
    } catch (error) {
      console.error('Error loading navigation state from localStorage:', error)
    }
  }, [])

  // Save sidebar state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(
        STORAGE_KEYS.SIDEBAR_COLLAPSED,
        JSON.stringify(state.sidebarCollapsed)
      )
    } catch (error) {
      console.error('Error saving sidebar state to localStorage:', error)
    }
  }, [state.sidebarCollapsed])

  // Save recent items to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(
        STORAGE_KEYS.RECENT_ITEMS,
        JSON.stringify(state.recentItems)
      )
    } catch (error) {
      console.error('Error saving recent items to localStorage:', error)
    }
  }, [state.recentItems])

  // Save user preferences to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(
        STORAGE_KEYS.USER_PREFERENCES,
        JSON.stringify(state.userPreferences)
      )
    } catch (error) {
      console.error('Error saving user preferences to localStorage:', error)
    }
  }, [state.userPreferences])

  // Action creators
  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' })
  }, [])

  const addRecentItem = useCallback((item: RecentItem) => {
    dispatch({ type: 'ADD_RECENT_ITEM', payload: item })
  }, [])

  const removeRecentItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_RECENT_ITEM', payload: id })
  }, [])

  const updateBreadcrumbs = useCallback((breadcrumbs: BreadcrumbItem[]) => {
    dispatch({ type: 'SET_BREADCRUMBS', payload: breadcrumbs })
  }, [])

  const updateNotifications = useCallback(
    (notifications: NotificationCount) => {
      dispatch({ type: 'UPDATE_NOTIFICATIONS', payload: notifications })
    },
    []
  )

  const updatePreferences = useCallback(
    (preferences: Partial<NavigationPreferences>) => {
      dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences })
    },
    []
  )

  const contextValue: NavigationContextType = {
    state,
    dispatch,
    toggleSidebar,
    addRecentItem,
    removeRecentItem,
    updateBreadcrumbs,
    updateNotifications,
    updatePreferences,
  }

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  )
}

// Custom hook to use navigation context
export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext)

  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }

  return context
}
