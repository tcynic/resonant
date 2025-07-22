'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Bell,
  Clock,
  Moon,
  Sun,
  Heart,
  AlertTriangle,
  Volume2,
  VolumeX,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
  MessageSquare,
} from 'lucide-react'
import Button from '@/components/ui/button'
import Card from '@/components/ui/card'
import Checkbox from '@/components/ui/checkbox'

interface ReminderSettings {
  enabled: boolean
  frequency: 'daily' | 'every2days' | 'weekly'
  preferredTime: string // "HH:MM" format
  timezone: string // IANA timezone
  doNotDisturbStart: string // "HH:MM"
  doNotDisturbEnd: string // "HH:MM"
  reminderTypes: {
    gentleNudge: boolean
    relationshipFocus: boolean
    healthScoreAlerts: boolean
  }
}

interface ReminderSettingsProps {
  className?: string
}

export function ReminderSettings({ className = '' }: ReminderSettingsProps) {
  const { user } = useUser()
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: false,
    frequency: 'daily',
    preferredTime: '09:00',
    timezone: 'UTC',
    doNotDisturbStart: '22:00',
    doNotDisturbEnd: '07:00',
    reminderTypes: {
      gentleNudge: true,
      relationshipFocus: true,
      healthScoreAlerts: false,
    },
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  )
  const [hasChanges, setHasChanges] = useState(false)
  const [browserNotificationPermission, setBrowserNotificationPermission] =
    useState<NotificationPermission>('default')

  // Get user data
  const userData = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  )

  // Update reminder settings mutation
  const updateReminderSettings = useMutation(
    api.notifications.updateReminderSettings
  )

  // Get reminder analytics
  const reminderAnalytics = useQuery(
    api.notifications.getUserReminderAnalytics,
    userData?._id ? { userId: userData._id } : 'skip'
  )

  // Check browser notification support and permission
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserNotificationPermission(Notification.permission)
    }
  }, [])

  // Load current settings
  useEffect(() => {
    if (userData?.preferences?.reminderSettings) {
      setSettings(userData.preferences.reminderSettings)
    }
  }, [userData])

  const handleSettingChange = (key: keyof ReminderSettings, value: unknown) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  const handleReminderTypeChange = (
    type: keyof ReminderSettings['reminderTypes'],
    value: boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      reminderTypes: {
        ...prev.reminderTypes,
        [type]: value,
      },
    }))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setBrowserNotificationPermission(permission)
      if (permission === 'granted' && !settings.enabled) {
        handleSettingChange('enabled', true)
      }
    }
  }

  const handleSave = async () => {
    if (!userData) return

    setIsSaving(true)
    setSaveStatus('idle')

    try {
      await updateReminderSettings({
        userId: userData._id,
        settings,
      })

      setHasChanges(false)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to save reminder settings:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (userData?.preferences?.reminderSettings) {
      setSettings(userData.preferences.reminderSettings)
      setHasChanges(false)
      setSaveStatus('idle')
    }
  }

  const getTimezoneOptions = () => {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Toronto',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
    ]
  }

  if (!user || !userData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    )
  }

  const isNotificationSupported = 'Notification' in window

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <Bell className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Smart Reminders
        </h2>
        <p className="text-gray-600">
          Get personalized reminders to maintain consistent journaling and
          relationship reflection
        </p>
      </div>

      {/* Analytics Summary */}
      {reminderAnalytics && reminderAnalytics.totalReminders > 0 && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-2 mb-4">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Your Reminder Stats
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reminderAnalytics.totalReminders}
              </div>
              <div className="text-sm text-gray-600">Total Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reminderAnalytics.clickedReminders}
              </div>
              <div className="text-sm text-gray-600">Clicked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {reminderAnalytics.clickThroughRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Click Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {reminderAnalytics.engagementScore}
              </div>
              <div className="text-sm text-gray-600">Engagement</div>
            </div>
          </div>
        </Card>
      )}

      {/* Browser Notification Permission */}
      {isNotificationSupported && (
        <Card
          className={`p-6 ${
            browserNotificationPermission === 'denied'
              ? 'border-red-200 bg-red-50'
              : browserNotificationPermission === 'granted'
                ? 'border-green-200 bg-green-50'
                : 'border-yellow-200 bg-yellow-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-start space-x-3">
              {browserNotificationPermission === 'granted' ? (
                <Volume2 className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <VolumeX className="w-5 h-5 text-yellow-600 mt-0.5" />
              )}
              <div>
                <h3 className="font-medium text-gray-900 mb-1">
                  Browser Notifications
                </h3>
                <div className="text-sm text-gray-600">
                  {browserNotificationPermission === 'granted' &&
                    "Browser notifications are enabled. You'll receive reminders even when the app is closed."}
                  {browserNotificationPermission === 'denied' &&
                    "Browser notifications are blocked. You won't receive reminders outside the app."}
                  {browserNotificationPermission === 'default' &&
                    'Enable browser notifications to receive reminders even when the app is closed.'}
                </div>
              </div>
            </div>

            {browserNotificationPermission !== 'granted' && (
              <Button
                onClick={requestNotificationPermission}
                variant="secondary"
                size="sm"
              >
                Enable Notifications
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Master Toggle */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell
              className={`w-5 h-5 ${settings.enabled ? 'text-green-600' : 'text-gray-400'}`}
            />
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Enable Smart Reminders
              </h3>
              <p className="text-sm text-gray-600">
                Receive AI-powered reminders based on your journaling patterns
              </p>
            </div>
          </div>
          <Checkbox
            checked={settings.enabled}
            onChange={e => handleSettingChange('enabled', e.target.checked)}
          />
        </div>
      </Card>

      {/* Reminder Frequency & Timing */}
      {settings.enabled && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Timing & Frequency
            </h3>
          </div>

          <div className="space-y-6">
            {/* Frequency Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Reminder Frequency
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: 'daily', label: 'Daily', icon: Sun },
                  {
                    value: 'every2days',
                    label: 'Every 2 Days',
                    icon: Calendar,
                  },
                  { value: 'weekly', label: 'Weekly', icon: Calendar },
                ].map(({ value, label, icon: Icon }) => (
                  <label
                    key={value}
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      settings.frequency === value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      value={value}
                      checked={settings.frequency === value}
                      onChange={e =>
                        handleSettingChange('frequency', e.target.value)
                      }
                      className="sr-only"
                    />
                    <Icon
                      className={`w-4 h-4 ${
                        settings.frequency === value
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}
                    />
                    <span className="font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preferred Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Time
                </label>
                <input
                  type="time"
                  value={settings.preferredTime}
                  onChange={e =>
                    handleSettingChange('preferredTime', e.target.value)
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={e =>
                    handleSettingChange('timezone', e.target.value)
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getTimezoneOptions().map(tz => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Do Not Disturb */}
      {settings.enabled && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Moon className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Do Not Disturb
            </h3>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            Set quiet hours when you don&apos;t want to receive reminders
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={settings.doNotDisturbStart}
                onChange={e =>
                  handleSettingChange('doNotDisturbStart', e.target.value)
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={settings.doNotDisturbEnd}
                onChange={e =>
                  handleSettingChange('doNotDisturbEnd', e.target.value)
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Reminder Types */}
      {settings.enabled && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Heart className="w-5 h-5 text-pink-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Reminder Types
            </h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-3">
              <Checkbox
                checked={settings.reminderTypes.gentleNudge}
                onChange={e =>
                  handleReminderTypeChange('gentleNudge', e.target.checked)
                }
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1 flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span>Gentle Nudges</span>
                </div>
                <div className="text-sm text-gray-600">
                  Soft reminders to journal when you haven&apos;t written in a
                  while. Perfect for maintaining consistent habits without
                  pressure.
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                checked={settings.reminderTypes.relationshipFocus}
                onChange={e =>
                  handleReminderTypeChange(
                    'relationshipFocus',
                    e.target.checked
                  )
                }
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1 flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span>Relationship Focus</span>
                </div>
                <div className="text-sm text-gray-600">
                  Smart prompts about specific relationships that haven&apos;t
                  been reflected on recently. Helps maintain connection
                  awareness.
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                checked={settings.reminderTypes.healthScoreAlerts}
                onChange={e =>
                  handleReminderTypeChange(
                    'healthScoreAlerts',
                    e.target.checked
                  )
                }
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span>Health Score Alerts</span>
                </div>
                <div className="text-sm text-gray-600">
                  Important notifications when relationship health scores
                  indicate attention is needed. Only for significant changes.
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Smart Reminders Info */}
      <Card className="p-6 border-blue-200 bg-blue-50">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">
              How Smart Reminders Work
            </h4>
            <div className="text-sm text-blue-800 space-y-2">
              <div>
                • AI analyzes your journaling patterns to find optimal reminder
                times
              </div>
              <div>
                • Reminders adapt based on your engagement and response history
              </div>
              <div>
                • Content is personalized for each relationship and situation
              </div>
              <div>
                • Frequency automatically adjusts when you&apos;re behind on
                journaling
              </div>
              <div>• All reminders respect your Do Not Disturb preferences</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <Card className="p-4">
          {saveStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Reminder settings saved successfully
              </span>
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Failed to save settings. Please try again.
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="ghost"
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
        >
          Reset Changes
        </Button>

        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={`
            px-6 py-2 text-white
            ${
              hasChanges
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-400 cursor-not-allowed'
            }
          `}
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  )
}
