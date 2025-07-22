/**
 * Utilities for safe client-side operations that prevent hydration errors
 */

/**
 * Safely check if code is running in the browser
 */
export const isClient = (): boolean => typeof window !== 'undefined'

/**
 * Safely access browser APIs with fallback
 */
export const safeWindow = {
  addEventListener: (event: string, handler: EventListener) => {
    if (isClient()) {
      window.addEventListener(event, handler)
    }
  },
  removeEventListener: (event: string, handler: EventListener) => {
    if (isClient()) {
      window.removeEventListener(event, handler)
    }
  },
  reload: () => {
    if (isClient()) {
      window.location.reload()
    }
  },
  online: (): boolean => {
    if (isClient()) {
      return navigator.onLine
    }
    return true // Assume online during SSR
  },
}

/**
 * Safe performance monitoring that works in all environments
 */
export const safePerformance = {
  now: (): number => {
    if (isClient() && typeof performance !== 'undefined' && performance.now) {
      return performance.now()
    }
    return Date.now()
  },
  memory: (): number | undefined => {
    if (
      isClient() &&
      typeof performance !== 'undefined' &&
      'memory' in performance
    ) {
      const perfMemory = (
        performance as { memory?: { usedJSHeapSize: number } }
      ).memory
      return perfMemory ? perfMemory.usedJSHeapSize / 1024 / 1024 : undefined
    }
    return undefined
  },
  observe: (
    callback: (list: PerformanceObserverEntryList) => void,
    options: PerformanceObserverInit
  ) => {
    if (isClient() && typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver(callback)
        observer.observe(options)
        return observer
      } catch {
        // Observer not supported
        return null
      }
    }
    return null
  },
}

/**
 * Client-safe time formatting that prevents hydration mismatches
 */
export const safeTimeFormatting = {
  /**
   * Get greeting based on current hour (client-only)
   * Returns empty string during SSR to prevent hydration mismatch
   */
  getGreeting: (): string => {
    if (!isClient()) return ''

    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  },

  /**
   * Format time difference with client-safe fallback
   */
  formatLastUpdated: (timestamp: number): string => {
    if (!isClient()) return 'Recently'

    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (60 * 1000))
    const hours = Math.floor(diff / (60 * 60 * 1000))
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  },
}

/**
 * Safe state initialization helper
 */
export const safeInitialState = <T>(clientValue: T, serverValue: T): T => {
  return isClient() ? clientValue : serverValue
}
