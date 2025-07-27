'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Shield,
  Eye,
  EyeOff,
  Database,
  BarChart3,
  Mail,
  Globe,
  Lock,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react'
import Button from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Checkbox from '@/components/ui/checkbox'

interface PrivacySettings {
  dataSharing: boolean
  analyticsOptIn: boolean
  marketingOptIn: boolean
  searchIndexing: boolean
  dataRetention: '1year' | '3years' | 'indefinite'
}

interface PrivacySettingsProps {
  className?: string
}

export function PrivacySettings({ className = '' }: PrivacySettingsProps) {
  const { user } = useUser()
  const [settings, setSettings] = useState<PrivacySettings>({
    dataSharing: false,
    analyticsOptIn: true,
    marketingOptIn: false,
    searchIndexing: true,
    dataRetention: '3years',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  )
  const [hasChanges, setHasChanges] = useState(false)

  // Get user data
  const userData = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  )

  // Update user privacy settings mutation
  const updatePrivacySettings = useMutation(api.users.updatePrivacySettings)

  // Load current settings
  useEffect(() => {
    if (userData?.preferences) {
      const currentSettings = {
        dataSharing: userData.preferences.dataSharing ?? false,
        analyticsOptIn: userData.preferences.analyticsOptIn ?? true,
        marketingOptIn: userData.preferences.marketingOptIn ?? false,
        searchIndexing: userData.preferences.searchIndexing ?? true,
        dataRetention:
          userData.preferences.dataRetention ?? ('3years' as const),
      }
      setSettings(currentSettings)
    }
  }, [userData])

  const handleSettingChange = (
    key: keyof PrivacySettings,
    value: boolean | string
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
    setSaveStatus('idle')
  }

  const handleSave = async () => {
    if (!userData) return

    setIsSaving(true)
    setSaveStatus('idle')

    try {
      await updatePrivacySettings({
        userId: userData._id,
        preferences: {
          ...userData.preferences,
          ...settings,
        },
      })

      setHasChanges(false)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to save privacy settings:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (userData?.preferences) {
      const originalSettings = {
        dataSharing: userData.preferences.dataSharing ?? false,
        analyticsOptIn: userData.preferences.analyticsOptIn ?? true,
        marketingOptIn: userData.preferences.marketingOptIn ?? false,
        searchIndexing: userData.preferences.searchIndexing ?? true,
        dataRetention:
          userData.preferences.dataRetention ?? ('3years' as const),
      }
      setSettings(originalSettings)
      setHasChanges(false)
      setSaveStatus('idle')
    }
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Privacy Settings
        </h2>
        <p className="text-gray-600">
          Control how your data is used and shared within Resonant
        </p>
      </div>

      {/* Data Usage & Sharing */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">
            Data Usage & Sharing
          </h3>
        </div>

        <div className="space-y-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              checked={settings.dataSharing}
              onChange={e =>
                handleSettingChange('dataSharing', e.target.checked)
              }
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 mb-1">
                Allow data for AI analysis improvements
              </div>
              <div className="text-sm text-gray-600">
                Help improve our AI analysis by allowing anonymized data to be
                used for research and model training. Your personal information
                and journal content remain private and are never shared.
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              checked={settings.searchIndexing}
              onChange={e =>
                handleSettingChange('searchIndexing', e.target.checked)
              }
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 mb-1">
                Enable search indexing
              </div>
              <div className="text-sm text-gray-600">
                Allow your journal entries to be indexed for faster search
                results. Disabling this will make search slower but prevents
                indexing of your content.
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Analytics & Marketing */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-medium text-gray-900">
            Analytics & Communications
          </h3>
        </div>

        <div className="space-y-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              checked={settings.analyticsOptIn}
              onChange={e =>
                handleSettingChange('analyticsOptIn', e.target.checked)
              }
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 mb-1">
                Usage analytics
              </div>
              <div className="text-sm text-gray-600">
                Allow collection of anonymous usage statistics to help us
                improve the app. This includes feature usage, performance
                metrics, and error reporting.
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              checked={settings.marketingOptIn}
              onChange={e =>
                handleSettingChange('marketingOptIn', e.target.checked)
              }
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 mb-1">
                Marketing communications
              </div>
              <div className="text-sm text-gray-600">
                Receive occasional emails about new features, tips, and updates.
                You can unsubscribe at any time.
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Retention */}
      <Card className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Lock className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-medium text-gray-900">Data Retention</h3>
        </div>

        <div>
          <div className="font-medium text-gray-900 mb-2">
            How long should we keep your data?
          </div>
          <div className="text-sm text-gray-600 mb-4">
            Choose how long Resonant should retain your data after account
            deletion or inactivity.
          </div>

          <div className="space-y-3">
            {[
              {
                value: '1year' as const,
                label: '1 Year',
                description: 'Data deleted after 1 year of inactivity',
              },
              {
                value: '3years' as const,
                label: '3 Years',
                description:
                  'Data deleted after 3 years of inactivity (recommended)',
              },
              {
                value: 'indefinite' as const,
                label: 'Indefinitely',
                description: 'Keep data until manually deleted',
              },
            ].map(option => (
              <label
                key={option.value}
                className="flex items-start space-x-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="dataRetention"
                  value={option.value}
                  checked={settings.dataRetention === option.value}
                  onChange={() =>
                    handleSettingChange('dataRetention', option.value)
                  }
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    {option.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Privacy Information */}
      <Card className="p-6 border-blue-200 bg-blue-50">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">
              Your Privacy Rights
            </h4>
            <div className="text-sm text-blue-800 space-y-2">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Access and download all your data at any time</span>
              </div>
              <div className="flex items-center space-x-2">
                <EyeOff className="w-4 h-4" />
                <span>Request deletion of your account and data</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4" />
                <span>Data processing compliant with GDPR and CCPA</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>Contact us at privacy@resonant.com for questions</span>
              </div>
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
                Privacy settings saved successfully
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
