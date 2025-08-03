/**
 * Standardized error messages for consistent user experience
 */

// Authentication errors
export const AUTH_ERRORS = {
  NOT_AUTHENTICATED: 'Please wait for authentication...',
  PERMISSION_DENIED: 'You do not have permission to perform this action',
} as const

// File upload errors
export const FILE_UPLOAD_ERRORS = {
  INVALID_TYPE: 'Only JPEG, PNG, GIF, and WebP images are allowed',
  INVALID_EXTENSION:
    'Invalid file extension. Only .jpg, .jpeg, .png, .gif, .webp are allowed',
  FILE_TOO_LARGE: 'Image must be less than 5MB',
  FILE_TOO_SMALL: 'Invalid image file',
  INVALID_FORMAT: 'Invalid image format or file too large',
  READ_ERROR: 'Unable to read image file',
} as const

// Form validation errors
export const FORM_ERRORS = {
  VALIDATION_FAILED: 'Please check your input and try again',
  REQUIRED_FIELD: 'This field is required',
  INVALID_INPUT: 'Please enter a valid value',
} as const

// Network/API errors
export const API_ERRORS = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again',
  SERVER_ERROR: 'Something went wrong. Please try again later',
  SAVE_FAILED: 'Unable to save changes. Please try again',
  LOAD_FAILED: 'Unable to load data. Please refresh the page',
} as const

// Notification errors
export const NOTIFICATION_ERRORS = {
  PERMISSION_REQUEST_FAILED: 'Unable to request notification permission',
  SHOW_FAILED: 'Unable to show notification',
  SERVICE_WORKER_REGISTRATION_FAILED:
    'Unable to register service worker for notifications',
  REMINDER_CLICK_FAILED: 'Unable to process reminder click',
} as const

// Generic user-friendly messages
export const GENERIC_ERRORS = {
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again',
  TRY_AGAIN: 'Please try again',
  CONTACT_SUPPORT: 'If this problem persists, please contact support',
} as const
