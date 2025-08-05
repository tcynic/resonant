'use client'

import React, { useState, useEffect } from 'react'

interface RealTimeIndicatorProps {
  isLoading?: boolean
  lastUpdated?: number
  className?: string
}

export default function RealTimeIndicator({
  isLoading = false,
  lastUpdated,
  className = '',
}: RealTimeIndicatorProps) {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false)
  const [previousUpdateTime, setPreviousUpdateTime] = useState<
    number | undefined
  >(undefined)

  useEffect(() => {
    if (lastUpdated && previousUpdateTime && lastUpdated > previousUpdateTime) {
      // Data was updated
      setShowUpdateNotification(true)

      // Hide notification after 3 seconds
      const timer = setTimeout(() => {
        setShowUpdateNotification(false)
      }, 3000)

      return () => clearTimeout(timer)
    }

    if (lastUpdated) {
      setPreviousUpdateTime(lastUpdated)
    }
  }, [lastUpdated, previousUpdateTime])

  if (isLoading) {
    return (
      <div
        className={`flex items-center space-x-2 text-blue-600 ${className}`}
        data-testid="real-time-indicator"
      >
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <span className="text-xs">Updating...</span>
      </div>
    )
  }

  if (showUpdateNotification) {
    return (
      <div
        className={`flex items-center space-x-2 text-green-600 animate-pulse ${className}`}
        data-testid="real-time-indicator"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-xs font-medium">Updated</span>
      </div>
    )
  }

  return null
}
