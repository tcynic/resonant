/**
 * Utility functions for the Resonant application
 */

/**
 * Simple class name utility (simplified version without clsx/twMerge dependencies)
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ')
}

/**
 * Format numbers with appropriate precision
 */
export function formatNumber(
  value: number,
  options?: {
    decimals?: number
    percentage?: boolean
    currency?: boolean
  }
): string {
  const { decimals = 0, percentage = false, currency = false } = options || {}

  let formatted = value.toFixed(decimals)

  if (percentage) {
    formatted += '%'
  }

  if (currency) {
    formatted = '$' + formatted
  }

  return formatted
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Sleep/delay utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if code is running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Safe JSON parse that returns null on error
 */
export function safeJsonParse<T>(str: string): T | null {
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}
