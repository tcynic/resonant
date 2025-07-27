/**
 * Centralized type exports for the Resonant application
 * Import types from this file throughout the application
 */

// Core Convex types
export * from './convex-types'

// Additional application types
export interface AppConfig {
  isProd: boolean
  isDev: boolean
  convexUrl: string
  clerkPublishableKey: string
}

export interface NavigationItem {
  label: string
  href: string
  icon?: string
  badge?: number
  disabled?: boolean
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
}

export interface ModalState {
  isOpen: boolean
  component?: React.ComponentType<Record<string, unknown>>
  props?: Record<string, unknown>
}

// Form validation types
export interface ValidationError {
  field: string
  message: string
}

export interface FormState<T = unknown> {
  data: T
  errors: ValidationError[]
  isLoading: boolean
  isValid: boolean
}

// Chart and visualization types
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar'
  responsive: boolean
  maintainAspectRatio: boolean
  theme: 'light' | 'dark'
}

export interface ColorPalette {
  primary: string
  secondary: string
  success: string
  warning: string
  error: string
  neutral: string[]
}

// Theme types
export interface ThemeConfig {
  mode: 'light' | 'dark'
  colors: ColorPalette
  fonts: {
    sans: string
    mono: string
  }
  spacing: Record<string, string>
  breakpoints: Record<string, string>
}

// API response wrapper
export interface ApiResult<T = unknown> {
  data?: T
  error?: string
  loading: boolean
  refetch?: () => void
}

// Pagination types
export interface PaginationState {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

// Sorting types
export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

// Filter types
export interface FilterState {
  active: boolean
  filters: Record<string, unknown>
  count: number
}

// Export commonly used utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type NonNullable<T> = T extends null | undefined ? never : T

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>
