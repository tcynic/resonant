'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, Moon, Sun, Info } from 'lucide-react'
import Card from '@/components/ui/card'

interface TimingControlsProps {
  frequency: 'daily' | 'every2days' | 'weekly'
  preferredTime: string
  timezone: string
  doNotDisturbStart: string
  doNotDisturbEnd: string
  onFrequencyChange: (frequency: 'daily' | 'every2days' | 'weekly') => void
  onTimeChange: (time: string) => void
  onTimezoneChange: (timezone: string) => void
  onDNDStartChange: (time: string) => void
  onDNDEndChange: (time: string) => void
  className?: string
}

export function TimingControls({
  frequency,
  preferredTime,
  timezone,
  doNotDisturbStart,
  doNotDisturbEnd,
  onFrequencyChange,
  onTimeChange,
  onTimezoneChange,
  onDNDStartChange,
  onDNDEndChange,
  className = '',
}: TimingControlsProps) {
  const [detectedTimezone, setDetectedTimezone] = useState<string>('')

  useEffect(() => {
    // Auto-detect user's timezone
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
      setDetectedTimezone(detected)
    } catch (error) {
      console.warn('Could not detect timezone:', error)
    }
  }, [])

  const getTimezoneOptions = () => {
    const timezones = [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Toronto',
      'America/Vancouver',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Rome',
      'Europe/Madrid',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Seoul',
      'Asia/Kolkata',
      'Australia/Sydney',
      'Australia/Melbourne',
    ]

    // Add detected timezone if not in list
    if (detectedTimezone && !timezones.includes(detectedTimezone)) {
      timezones.push(detectedTimezone)
    }

    return timezones.sort()
  }

  const formatTimezoneName = (tz: string) => {
    try {
      const now = new Date()
      const offset =
        new Intl.DateTimeFormat('en', {
          timeZone: tz,
          timeZoneName: 'short',
        })
          .formatToParts(now)
          .find(part => part.type === 'timeZoneName')?.value || ''

      return `${tz.replace('_', ' ')} (${offset})`
    } catch {
      return tz.replace('_', ' ')
    }
  }

  const getFrequencyDescription = (freq: string) => {
    switch (freq) {
      case 'daily':
        return 'Every day at your preferred time'
      case 'every2days':
        return 'Every 2 days, giving you breathing room'
      case 'weekly':
        return 'Once per week for regular check-ins'
      default:
        return ''
    }
  }

  // Calculate if DND spans overnight
  const isDNDOvernight = doNotDisturbStart > doNotDisturbEnd

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Frequency Selection */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">
            Reminder Frequency
          </h3>
        </div>

        <div className="space-y-3">
          {[
            {
              value: 'daily',
              label: 'Daily',
              description: 'Perfect for building consistent habits',
              icon: Sun,
            },
            {
              value: 'every2days',
              label: 'Every 2 Days',
              description: 'Balanced approach with breathing room',
              icon: Calendar,
            },
            {
              value: 'weekly',
              label: 'Weekly',
              description: 'Regular check-ins without pressure',
              icon: Calendar,
            },
          ].map(({ value, label, description, icon: Icon }) => (
            <label
              key={value}
              className={`flex items-start space-x-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                frequency === value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value={value}
                checked={frequency === value}
                onChange={e =>
                  onFrequencyChange(
                    e.target.value as 'daily' | 'every2days' | 'weekly'
                  )
                }
                className="mt-1"
              />
              <Icon
                className={`w-5 h-5 mt-0.5 ${
                  frequency === value ? 'text-blue-600' : 'text-gray-400'
                }`}
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{label}</div>
                <div className="text-sm text-gray-600 mt-1">{description}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>Current setting:</strong>{' '}
            {getFrequencyDescription(frequency)}
          </div>
        </div>
      </Card>

      {/* Preferred Time & Timezone */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Clock className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-medium text-gray-900">Preferred Time</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time of Day
            </label>
            <input
              type="time"
              value={preferredTime}
              onChange={e => onTimeChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              AI will optimize around this time based on your engagement
              patterns
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={e => onTimezoneChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {getTimezoneOptions().map(tz => (
                <option key={tz} value={tz}>
                  {formatTimezoneName(tz)}
                  {tz === detectedTimezone && ' (detected)'}
                </option>
              ))}
            </select>
            {detectedTimezone && timezone !== detectedTimezone && (
              <button
                onClick={() => onTimezoneChange(detectedTimezone)}
                className="text-xs text-green-600 hover:text-green-700 mt-1 underline"
              >
                Use detected timezone ({detectedTimezone})
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Do Not Disturb */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Moon className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-medium text-gray-900">Do Not Disturb</h3>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Set quiet hours when you don&apos;t want to receive reminders.
          Reminders scheduled during these hours will be delayed.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={doNotDisturbStart}
              onChange={e => onDNDStartChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={doNotDisturbEnd}
              onChange={e => onDNDEndChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* DND Preview */}
        <div className="mt-4 p-3 bg-purple-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-purple-600 mt-0.5" />
            <div className="text-sm text-purple-800">
              <div className="font-medium mb-1">Do Not Disturb Schedule:</div>
              <div>
                {isDNDOvernight ? (
                  <>
                    From {doNotDisturbStart} to {doNotDisturbEnd} (next day)
                  </>
                ) : (
                  <>
                    From {doNotDisturbStart} to {doNotDisturbEnd}
                  </>
                )}
              </div>
              {isDNDOvernight && (
                <div className="text-xs mt-1 text-purple-600">
                  Overnight schedule - spans across midnight
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Smart Timing Info */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Smart Timing Features:</div>
            <div className="space-y-1 text-xs">
              <div>
                • AI learns your most responsive times and adjusts accordingly
              </div>
              <div>
                • Reminders are automatically rescheduled if you&apos;re in Do
                Not Disturb
              </div>
              <div>
                • Frequency may increase if you&apos;re behind on your
                journaling goals
              </div>
              <div>• All times are handled in your specified timezone</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
