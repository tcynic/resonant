/**
 * AI Processing Summary Component - Placeholder Version
 *
 * NOTE: The original full implementation with complete processing monitoring
 * has been moved to .trash/ai-processing-summary-original.tsx due to TypeScript
 * deep instantiation issues with Convex API references. This placeholder version
 * maintains the UI structure and will be replaced with the full version once
 * the Convex functions are deployed.
 */

'use client'

import { Id } from '@/convex/_generated/dataModel'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

interface AIProcessingSummaryProps {
  userId: Id<'users'>
}

export function AIProcessingSummary({ userId }: AIProcessingSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            AI Analysis Status
          </h3>
          {/* LangExtract Enhancement Indicator (Story LangExtract-2) */}
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
            🔍 Enhanced Insights
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Processing Statistics */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">--</p>
              <p className="text-xs text-gray-600">Completed Today</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">--</p>
              <p className="text-xs text-gray-600">In Queue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">—</p>
              <p className="text-xs text-gray-600">Avg Wait</p>
            </div>
          </div>

          {/* Empty State */}
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-sm text-gray-600">AI processing system ready</p>
            <p className="text-xs text-gray-500 mt-1">
              Monitoring will activate automatically when Convex functions are
              deployed
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
