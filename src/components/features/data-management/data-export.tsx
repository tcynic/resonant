'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import {
  Download,
  FileText,
  Database,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  HardDrive,
} from 'lucide-react'
import Button from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Checkbox from '@/components/ui/checkbox'

interface DataExportProps {
  className?: string
}

export function DataExport({ className = '' }: DataExportProps) {
  const { user } = useUser()
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv'>('json')
  const [includeAnalysis, setIncludeAnalysis] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client side before making Convex calls
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Get user data - only run on client side
  const userData = useQuery(
    api.users.getUserByClerkId,
    isClient && user?.id ? { clerkId: user.id } : 'skip'
  )

  // Get export statistics - only run on client side
  const exportStats = useQuery(
    api.dataExport.getExportStatistics,
    isClient && userData?._id ? { userId: userData._id } : 'skip'
  )

  // Create export job mutation
  const createExport = useMutation(api.dataExport.createExportJob)

  const handleExport = async () => {
    if (!userData || !user?.primaryEmailAddress?.emailAddress) {
      setExportError('User data not available')
      return
    }

    setIsExporting(true)
    setExportError(null)
    setExportComplete(false)

    try {
      const result = await createExport({
        userId: userData._id,
        format: selectedFormat,
        includeAnalysis,
        email: user.primaryEmailAddress.emailAddress,
      })

      // Create download blob
      const dataStr = JSON.stringify(result.data, null, 2)
      const blob = new Blob([dataStr], {
        type: selectedFormat === 'json' ? 'application/json' : 'text/csv',
      })
      const url = URL.createObjectURL(blob)

      setDownloadUrl(url)
      setExportComplete(true)

      // Trigger automatic download
      const link = document.createElement('a')
      link.href = url
      link.download = result.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Export failed:', error)
      setExportError('Failed to export data. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Note: formatFileSize function removed as it was unused

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (!isClient || !user || !userData) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-sm text-gray-600">
            {!isClient ? 'Initializing...' : 'Loading user data...'}
          </span>
        </div>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <Database className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Export Your Data
        </h2>
        <p className="text-gray-600">
          Download a complete copy of your Resonant data for backup or migration
        </p>
      </div>

      {/* Export Statistics */}
      {exportStats && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Your Data Overview
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {exportStats.statistics.relationships}
              </div>
              <div className="text-sm text-gray-600">Relationships</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {exportStats.statistics.journalEntries}
              </div>
              <div className="text-sm text-gray-600">Journal Entries</div>
            </div>

            {includeAnalysis && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {exportStats.statistics.healthScores}
                  </div>
                  <div className="text-sm text-gray-600">Health Scores</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {exportStats.statistics.aiAnalysis}
                  </div>
                  <div className="text-sm text-gray-600">AI Analysis</div>
                </div>
              </>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Account created:</span>
                <span className="font-medium">
                  {formatDate(exportStats.accountCreated)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Estimated size:</span>
                <span className="font-medium">
                  {exportStats.estimatedSize.jsonMB} MB
                </span>
              </div>
            </div>

            {exportStats.dateRange.firstEntry &&
              exportStats.dateRange.lastEntry && (
                <div className="mt-2 text-sm text-gray-600">
                  <span>Data range: </span>
                  <span>
                    {formatDate(exportStats.dateRange.firstEntry)} to{' '}
                    {formatDate(exportStats.dateRange.lastEntry)}
                  </span>
                </div>
              )}
          </div>
        </Card>
      )}

      {/* Export Options */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Export Options
        </h3>

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedFormat('json')}
                className={`
                  p-4 border rounded-lg text-left transition-colors
                  ${
                    selectedFormat === 'json'
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <FileText className="w-5 h-5 mb-2" />
                <div className="font-medium">JSON</div>
                <div className="text-xs text-gray-600">
                  Complete data with full structure
                </div>
              </button>

              <button
                onClick={() => setSelectedFormat('csv')}
                className={`
                  p-4 border rounded-lg text-left transition-colors
                  ${
                    selectedFormat === 'csv'
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:bg-gray-50'
                  }
                `}
              >
                <Database className="w-5 h-5 mb-2" />
                <div className="font-medium">CSV</div>
                <div className="text-xs text-gray-600">
                  Spreadsheet-compatible format
                </div>
              </button>
            </div>
          </div>

          {/* Include Analysis Data */}
          <div>
            <label className="flex items-center space-x-3">
              <Checkbox
                checked={includeAnalysis}
                onChange={e => setIncludeAnalysis(e.target.checked)}
              />
              <div>
                <div className="font-medium text-gray-900">
                  Include AI Analysis Data
                </div>
                <div className="text-sm text-gray-600">
                  Health scores, sentiment analysis, and other AI-generated
                  insights
                </div>
              </div>
            </label>
          </div>
        </div>
      </Card>

      {/* Privacy Information */}
      <Card className="p-6 border-amber-200 bg-amber-50">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 mb-1">
              Privacy & Security
            </h4>
            <div className="text-sm text-amber-800 space-y-1">
              <p>
                • Your export will include all personal data associated with
                your account
              </p>
              <p>
                • The download is generated in real-time and not stored on our
                servers
              </p>
              <p>
                • Keep your exported data secure and delete it when no longer
                needed
              </p>
              <p>• This export is for personal use and backup purposes only</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Export Status */}
      {(isExporting || exportComplete || exportError) && (
        <Card className="p-6">
          {isExporting && (
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <div>
                <div className="font-medium text-gray-900">
                  Preparing your export...
                </div>
                <div className="text-sm text-gray-600">
                  This may take a few moments
                </div>
              </div>
            </div>
          )}

          {exportComplete && (
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900">
                  Export completed successfully!
                </div>
                <div className="text-sm text-green-700">
                  Your data has been downloaded to your device
                </div>
              </div>
            </div>
          )}

          {exportError && (
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <div className="font-medium text-red-900">Export failed</div>
                <div className="text-sm text-red-700">{exportError}</div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Export Button */}
      <div className="text-center">
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="px-8 py-3 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Preparing Export...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export My Data
            </>
          )}
        </Button>
      </div>

      {/* Download Link */}
      {downloadUrl && exportComplete && (
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            If your download didn&apos;t start automatically:
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const link = document.createElement('a')
              link.href = downloadUrl
              link.download = `resonant-export-${selectedFormat}-${new Date().toISOString().split('T')[0]}.${selectedFormat}`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download Again
          </Button>
        </Card>
      )}
    </div>
  )
}
