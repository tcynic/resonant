/**
 * Application Configuration Constants
 *
 * Centralized configuration for timeouts, limits, and other app-wide settings.
 * This file consolidates magic numbers to improve maintainability and consistency.
 */

/**
 * Form and UI Configuration
 */
export const FORM_CONFIG = {
  // Form interaction delays
  SUCCESS_DELAY: 1000, // 1 second - time to show success message before callback
  RESET_DELAY: 1500, // 1.5 seconds - time before form resets after success

  // Validation and debouncing
  VALIDATION_DEBOUNCE_DELAY: 500, // 500ms - debounce delay for form validation

  // User feedback timing
  VALIDATION_FEEDBACK_DELAY: 300, // 300ms - delay before showing validation feedback
  LOADING_INDICATOR_DELAY: 200, // 200ms - delay before showing loading spinners
} as const

/**
 * File Upload Configuration
 */
export const FILE_UPLOAD_CONFIG = {
  // File size limits
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB - maximum file size for uploads
  MIN_FILE_SIZE: 100, // 100 bytes - minimum file size to prevent empty files
  MAX_DATA_URL_LENGTH: 3 * 1024 * 1024, // 3MB - reduced from 7MB for better performance

  // Allowed file types
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ] as const,

  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'] as const,

  // File validation magic bytes (first few bytes that identify file types)
  MAGIC_BYTES: {
    JPEG: [0xff, 0xd8, 0xff],
    PNG: [0x89, 0x50, 0x4e, 0x47],
    GIF87A: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    GIF89A: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    WEBP: [0x52, 0x49, 0x46, 0x46], // Note: WEBP also needs "WEBP" at offset 8
  } as const,
} as const

/**
 * Notification Configuration
 */
export const NOTIFICATION_CONFIG = {
  // Timing
  AUTO_CLOSE_DELAY: 8000, // 8 seconds - time before notification auto-closes
  PERMISSION_REQUEST_TIMEOUT: 10000, // 10 seconds - timeout for permission requests

  // Service worker configuration
  SERVICE_WORKER_PATH: '/sw.js',

  // Default notification options
  DEFAULT_ICON: '/icons/icon-192x192.png',
  DEFAULT_BADGE: '/icons/icon-72x72.png',

  // User experience settings
  REQUIRE_INTERACTION_DEFAULT: true, // Whether notifications require user interaction to close
  SILENT_DEFAULT: false, // Whether notifications are silent by default
} as const

/**
 * Performance Configuration
 */
export const PERFORMANCE_CONFIG = {
  // Debouncing and throttling
  SEARCH_DEBOUNCE_DELAY: 300, // 300ms - debounce delay for search inputs
  SCROLL_THROTTLE_DELAY: 100, // 100ms - throttle delay for scroll events
  RESIZE_THROTTLE_DELAY: 250, // 250ms - throttle delay for resize events

  // Retry and timeout settings
  API_TIMEOUT: 30000, // 30 seconds - general API request timeout
  RETRY_ATTEMPTS: 3, // Number of retry attempts for failed requests
  RETRY_DELAY: 1000, // 1 second - base delay between retry attempts

  // Cache and storage
  LOCAL_STORAGE_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours - localStorage expiry time
  SESSION_STORAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB - maximum sessionStorage usage
} as const

/**
 * User Interface Configuration
 */
export const UI_CONFIG = {
  // Animation and transition durations
  ANIMATION_DURATION_FAST: 150, // 150ms - fast animations
  ANIMATION_DURATION_NORMAL: 300, // 300ms - normal animations
  ANIMATION_DURATION_SLOW: 500, // 500ms - slow animations

  // Component sizing
  AVATAR_SIZES: {
    SMALL: 32, // 32px
    MEDIUM: 48, // 48px
    LARGE: 80, // 80px
    EXTRA_LARGE: 120, // 120px
  } as const,

  // Typography
  CHARACTER_LIMITS: {
    NAME: 100, // Maximum characters for names
    DESCRIPTION: 500, // Maximum characters for descriptions
    JOURNAL_ENTRY: 10000, // Maximum characters for journal entries
    TAG: 50, // Maximum characters per tag
    MAX_TAGS: 5, // Maximum number of tags per item
  } as const,
} as const

/**
 * Development and Testing Configuration
 */
export const DEV_CONFIG = {
  // Mock data settings (for development phase)
  MOCK_API_DELAY: 500, // 500ms - simulated API delay for development
  MOCK_USER_ID: 'mock_user_id',
  MOCK_RELATIONSHIP_ID: 'mock_relationship_id',

  // Debug settings
  ENABLE_DEBUG_LOGS: process.env.NODE_ENV === 'development',
  ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === 'development',
} as const

/**
 * Security Configuration
 */
export const SECURITY_CONFIG = {
  // Input sanitization
  MAX_INPUT_LENGTH: 10000, // Maximum length for any text input
  ALLOWED_HTML_TAGS: [], // No HTML tags allowed in user input (strict mode)

  // Rate limiting (client-side indicators)
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_FILE_UPLOADS_PER_HOUR: 10,

  // Content Security Policy helpers
  ALLOWED_IMAGE_DOMAINS: [
    'data:', // Allow data URLs for uploaded images
    'https://images.clerk.dev', // Clerk profile images
  ] as const,
} as const

/**
 * Type exports for configuration objects
 */
export type FormConfigKey = keyof typeof FORM_CONFIG
export type FileUploadConfigKey = keyof typeof FILE_UPLOAD_CONFIG
export type NotificationConfigKey = keyof typeof NOTIFICATION_CONFIG
export type PerformanceConfigKey = keyof typeof PERFORMANCE_CONFIG
export type UIConfigKey = keyof typeof UI_CONFIG
export type DevConfigKey = keyof typeof DEV_CONFIG
export type SecurityConfigKey = keyof typeof SECURITY_CONFIG

/**
 * LangExtract Feature Flag Configuration
 *
 * Centralized, environment-driven configuration for controlling the
 * LangExtract integration rollout. Exposed as constants and helpers
 * so both client and server code can make consistent decisions.
 */
export const LANGEXTRACT_CONFIG = {
  ENABLED:
    process.env.LANGEXTRACT_ENABLED === 'true' ||
    process.env.NEXT_PUBLIC_LANGEXTRACT_ENABLED === 'true',
  ROLLOUT_PERCENT: Number(
    process.env.LANGEXTRACT_ROLLOUT_PERCENT ??
      process.env.NEXT_PUBLIC_LANGEXTRACT_ROLLOUT_PERCENT ??
      '0'
  ),
} as const

/**
 * Produce a stable, non-cryptographic hash bucket for a given string.
 * Used to assign users deterministically to rollout cohorts.
 */
export function hashStringToBucket(input: string): number {
  let hash = 5381
  for (let index = 0; index < input.length; index += 1) {
    // hash * 33 + charCode
    hash = (hash << 5) + hash + input.charCodeAt(index)
    // Ensure 32-bit integer wrap-around to stabilize across runtimes
    hash |= 0
  }
  // Make bucket non-negative
  return Math.abs(hash)
}

/**
 * Determine whether LangExtract should be used for a given user.
 * Respects the global ENABLED toggle and gradual rollout percentage.
 */
export function shouldUseLangExtract(userId: string): boolean {
  if (!LANGEXTRACT_CONFIG.ENABLED) return false
  const bucket = hashStringToBucket(userId) % 100
  return bucket < LANGEXTRACT_CONFIG.ROLLOUT_PERCENT
}
