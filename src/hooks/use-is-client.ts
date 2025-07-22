import { useEffect, useState } from 'react'

/**
 * Hook to safely determine if code is running on the client-side.
 * Prevents hydration errors by ensuring server and client render the same content initially.
 *
 * @returns true when running in the browser, false during SSR and initial hydration
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}
