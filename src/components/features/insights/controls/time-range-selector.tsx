'use client'

import React, { useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { TimeRange, getDateRange } from '@/lib/chart-utils'

/**
 * Time range option interface
 */
interface TimeRangeOption {
  value: TimeRange
  label: string
  description: string
}

/**
 * Time range selector props
 */
export interface TimeRangeSelectorProps {
  value: TimeRange
  customStart?: Date
  customEnd?: Date
  onChange: (timeRange: TimeRange, customStart?: Date, customEnd?: Date) => void
  disabled?: boolean
  className?: string
  showCustomRange?: boolean
  presetOptions?: TimeRangeOption[]
}

/**
 * Default time range options
 */
const defaultTimeRangeOptions: TimeRangeOption[] = [
  {
    value: 'week',
    label: 'Last 7 days',
    description: 'Past week',
  },
  {
    value: 'month',
    label: 'Last 30 days',
    description: 'Past month',
  },
  {
    value: 'quarter',
    label: 'Last 3 months',
    description: 'Past quarter',
  },
  {
    value: 'year',
    label: 'Last 12 months',
    description: 'Past year',
  },
]

/**
 * Time Range Selector Component
 *
 * Provides quick time range selection with:
 * - Preset time range buttons
 * - Custom date range picker
 * - Visual indicators for selected range
 * - Accessibility support
 */
export function TimeRangeSelector({
  value,
  customStart,
  customEnd,
  onChange,
  disabled = false,
  className,
  showCustomRange = true,
  presetOptions = defaultTimeRangeOptions,
}: TimeRangeSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [tempCustomStart, setTempCustomStart] = useState<string>(
    customStart ? format(customStart, 'yyyy-MM-dd') : ''
  )
  const [tempCustomEnd, setTempCustomEnd] = useState<string>(
    customEnd ? format(customEnd, 'yyyy-MM-dd') : ''
  )

  // Handle preset selection
  const handlePresetSelection = (timeRange: TimeRange) => {
    if (disabled) return

    if (timeRange === 'custom') {
      setShowCustomPicker(true)
    } else {
      setShowCustomPicker(false)
      onChange(timeRange)
    }
  }

  // Handle custom range application
  const handleCustomRangeApply = () => {
    if (!tempCustomStart || !tempCustomEnd) return

    const start = new Date(tempCustomStart)
    const end = new Date(tempCustomEnd)

    if (start > end) {
      // Swap dates if start is after end
      onChange('custom', end, start)
    } else {
      onChange('custom', start, end)
    }

    setShowCustomPicker(false)
  }

  // Handle custom range cancel
  const handleCustomRangeCancel = () => {
    setShowCustomPicker(false)
    // Reset to current custom values
    setTempCustomStart(customStart ? format(customStart, 'yyyy-MM-dd') : '')
    setTempCustomEnd(customEnd ? format(customEnd, 'yyyy-MM-dd') : '')
  }

  // Get formatted display text for current selection
  const getDisplayText = () => {
    if (value === 'custom' && customStart && customEnd) {
      return `${format(customStart, 'MMM dd')} - ${format(customEnd, 'MMM dd')}`
    }

    const option = presetOptions.find(opt => opt.value === value)
    return option?.label || 'Select range'
  }

  // Get date range info for current selection
  const dateRange = getDateRange(value, customStart, customEnd)

  return (
    <div className={cn('relative', className)}>
      {/* Main selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Preset buttons */}
        {presetOptions.map(option => (
          <button
            key={option.value}
            onClick={() => handlePresetSelection(option.value)}
            disabled={disabled}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg border transition-all',
              'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              value === option.value
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}

        {/* Custom range button */}
        {showCustomRange && (
          <button
            onClick={() => handlePresetSelection('custom')}
            disabled={disabled}
            className={cn(
              'px-3 py-2 text-sm font-medium rounded-lg border transition-all flex items-center space-x-2',
              'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
              value === 'custom'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-700 border-gray-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-pressed={value === 'custom'}
          >
            <Calendar size={16} />
            <span>Custom</span>
            <ChevronDown size={14} />
          </button>
        )}
      </div>

      {/* Current selection info */}
      <div className="text-sm text-gray-600 mb-2">
        <span className="font-medium">Selected range:</span> {getDisplayText()}
        <span className="ml-2 text-gray-400">
          (
          {Math.ceil(
            (dateRange.end.getTime() - dateRange.start.getTime()) /
              (1000 * 60 * 60 * 24)
          )}{' '}
          days)
        </span>
      </div>

      {/* Custom date picker */}
      {showCustomPicker && (
        <div className="absolute top-full left-0 right-0 z-10 mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-900">
              Custom Date Range
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="start-date"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  Start Date
                </label>
                <input
                  id="start-date"
                  type="date"
                  value={tempCustomStart}
                  onChange={e => setTempCustomStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              <div>
                <label
                  htmlFor="end-date"
                  className="block text-xs font-medium text-gray-700 mb-1"
                >
                  End Date
                </label>
                <input
                  id="end-date"
                  type="date"
                  value={tempCustomEnd}
                  onChange={e => setTempCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  max={format(new Date(), 'yyyy-MM-dd')}
                  min={tempCustomStart}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCustomRangeCancel}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomRangeApply}
                disabled={!tempCustomStart || !tempCustomEnd}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Quick time range buttons component
 * Simplified version for inline use
 */
export interface QuickTimeRangeProps {
  value: TimeRange
  onChange: (timeRange: TimeRange) => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export function QuickTimeRange({
  value,
  onChange,
  disabled = false,
  className,
  size = 'md',
}: QuickTimeRangeProps) {
  const quickOptions: TimeRangeOption[] = [
    { value: 'week', label: '7D', description: 'Last 7 days' },
    { value: 'month', label: '30D', description: 'Last 30 days' },
    { value: 'quarter', label: '3M', description: 'Last 3 months' },
    { value: 'year', label: '1Y', description: 'Last year' },
  ]

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
  }

  return (
    <div className={cn('flex space-x-1', className)}>
      {quickOptions.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          disabled={disabled}
          title={option.description}
          className={cn(
            'font-medium rounded-md border transition-all',
            'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
            sizeClasses[size],
            value === option.value
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-pressed={value === option.value}
          aria-label={option.description}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
