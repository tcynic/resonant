/**
 * LangExtract Performance Dashboard - Placeholder Version
 *
 * NOTE: The original full implementation with complete monitoring functionality
 * has been moved to .trash/langextract-performance-dashboard-original.tsx
 * due to TypeScript compilation issues with Convex API references that aren't
 * yet deployed. This placeholder version maintains the UI structure and will
 * be replaced with the full version once the Convex monitoring functions are deployed.
 */

'use client'

import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

interface LangExtractPerformanceDashboardProps {
  className?: string
}

export default function LangExtractPerformanceDashboard({
  className = '',
}: LangExtractPerformanceDashboardProps) {
  const [selectedTimeRange, setSelectedTimeRange] = React.useState(24)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              LangExtract Performance Monitor
            </h3>
            <p className="text-sm text-gray-600">
              Real-time metrics and alerting for LangExtract integration
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-xs text-gray-600">Time Range:</label>
            <select
              value={selectedTimeRange}
              onChange={e => setSelectedTimeRange(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded px-2 py-1"
            >
              <option value={1}>1 Hour</option>
              <option value={6}>6 Hours</option>
              <option value={24}>24 Hours</option>
              <option value={168}>7 Days</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Performance Dashboard
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Performance monitoring dashboard will be available once Convex
              monitoring functions are deployed.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="p-3 bg-white rounded border">
                <div className="text-xl font-bold text-gray-400">--</div>
                <div className="text-xs text-gray-500">Total Requests</div>
              </div>
              <div className="p-3 bg-white rounded border">
                <div className="text-xl font-bold text-gray-400">--%</div>
                <div className="text-xs text-gray-500">Success Rate</div>
              </div>
              <div className="p-3 bg-white rounded border">
                <div className="text-xl font-bold text-gray-400">--ms</div>
                <div className="text-xs text-gray-500">Avg Processing Time</div>
              </div>
              <div className="p-3 bg-white rounded border">
                <div className="text-xl font-bold text-gray-400">--</div>
                <div className="text-xs text-gray-500">Entities Extracted</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded border">
              <p className="text-xs text-blue-700">
                📊 Ready for deployment - monitoring functions will activate
                automatically
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
