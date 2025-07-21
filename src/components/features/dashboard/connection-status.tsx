'use client'

import React, { useState, useEffect } from 'react'

interface ConnectionStatusProps {
  className?: string
}

export default function ConnectionStatus({
  className = '',
}: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Update timestamp periodically to show live status
    const interval = setInterval(() => {
      setLastUpdateTime(Date.now())
    }, 30000) // Update every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  if (!isOnline) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <div className="w-2 h-2 bg-red-500 rounded-full" />
        <span className="text-xs font-medium">Offline</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 text-green-600 ${className}`}>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-xs font-medium">Live</span>
    </div>
  )
}
