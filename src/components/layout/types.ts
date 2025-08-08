import { ReactNode } from 'react'

// Navigation State Interfaces
export interface NavigationState {
  currentRoute: string
  sidebarCollapsed: boolean
  recentItems: RecentItem[]
  notifications: NotificationCount
  userPreferences: NavigationPreferences
  breadcrumbs: BreadcrumbItem[]
}

export interface BreadcrumbItem {
  label: string
  href: string
  isActive: boolean
}

export interface RecentItem {
  id: string
  type: 'journal' | 'relationship' | 'insight'
  title: string
  href: string
  timestamp: number
  photoUrl?: string
}

export interface NavigationPreferences {
  sidebarDefaultCollapsed: boolean
  showRecentItems: boolean
  maxRecentItems: number
}

export interface NotificationCount {
  total: number
  unread: number
  types: {
    reminders: number
    insights: number
    system: number
  }
}

// Navigation Actions for Reducer
export type NavigationAction =
  | { type: 'SET_CURRENT_ROUTE'; payload: string }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_COLLAPSED'; payload: boolean }
  | { type: 'ADD_RECENT_ITEM'; payload: RecentItem }
  | { type: 'REMOVE_RECENT_ITEM'; payload: string }
  | { type: 'UPDATE_NOTIFICATIONS'; payload: NotificationCount }
  | { type: 'SET_BREADCRUMBS'; payload: BreadcrumbItem[] }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<NavigationPreferences> }

// Component Props
export interface AppShellProps {
  children: ReactNode
  showSidebar?: boolean
  showNavbar?: boolean
}

// Context Type
export interface NavigationContextType {
  state: NavigationState
  dispatch: React.Dispatch<NavigationAction>
  toggleSidebar: () => void
  setSidebarCollapsed?: (collapsed: boolean) => void
  addRecentItem: (item: RecentItem) => void
  removeRecentItem: (id: string) => void
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void
  updateNotifications: (notifications: NotificationCount) => void
  updatePreferences: (preferences: Partial<NavigationPreferences>) => void
  setCurrentRoute?: (route: string) => void
}
