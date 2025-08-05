'use client'

import React, { useState, useEffect } from 'react'
import { useIsClient } from '@/hooks/use-is-client'
import { safeWindow } from '@/lib/client-utils'

interface ConnectionStatusProps {
  className?: string
}

export default function ConnectionStatus({
  className = '',
}: ConnectionStatusProps) {
  const isClient = useIsClient()
  const [isOnline, setIsOnline] = useState(true) // Default to online for SSR
  const [, setLastUpdateTime] = useState(Date.now())

  useEffect(() => {
    if (!isClient) return

    // Set initial online status from navigator
    setIsOnline(safeWindow.online())

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Listen for online/offline events
    safeWindow.addEventListener('online', handleOnline)
    safeWindow.addEventListener('offline', handleOffline)

    // Update timestamp periodically to show live status
    const interval = setInterval(() => {
      setLastUpdateTime(Date.now())
    }, 30000) // Update every 30 seconds

    return () => {
      safeWindow.removeEventListener('online', handleOnline)
      safeWindow.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [isClient])

  if (!isOnline) {
    return (
      <div
        className={`flex items-center space-x-2 text-red-600 ${className}`}
        data-testid="connection-status"
      >
        <div className="w-2 h-2 bg-red-500 rounded-full" />
        <span className="text-xs font-medium">Offline</span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center space-x-2 text-green-600 ${className}`}
      data-testid="connection-status"
    >
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-xs font-medium">Live</span>
    </div>
  )
}
