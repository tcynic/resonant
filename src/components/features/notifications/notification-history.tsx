'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import {
  MessageSquare,
  Heart,
  AlertTriangle,
  Clock,
  XCircle,
  Eye,
  MousePointer,
  History,
  Filter,
} from 'lucide-react'
import Card from '@/components/ui/card'
import Button from '@/components/ui/button'

interface NotificationHistoryProps {
  userId: Id<'users'>
  className?: string
}

type ReminderStatus =
  | 'scheduled'
  | 'delivered'
  | 'clicked'
  | 'dismissed'
  | 'failed'
type ReminderType = 'gentle_nudge' | 'relationship_focus' | 'health_alert'

export function NotificationHistory({
  userId,
  className = '',
}: NotificationHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<ReminderStatus | 'all'>(
    'all'
  )
  const [typeFilter, setTypeFilter] = useState<ReminderType | 'all'>('all')
  const [showDetails, setShowDetails] = useState<Id<'reminderLogs'> | null>(
    null
  )

  // Get reminder history
  const reminderHistory = useQuery(api.notifications.getUserReminderHistory, {
    userId,
    limit: 50,
  })

  const getStatusIcon = (status: ReminderStatus) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'delivered':
        return <Eye className="w-4 h-4 text-green-500" />
      case 'clicked':
        return <MousePointer className="w-4 h-4 text-purple-500" />
      case 'dismissed':
        return <XCircle className="w-4 h-4 text-gray-500" />
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: ReminderStatus) => {
    switch (status) {
      case 'scheduled':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'delivered':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'clicked':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'dismissed':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type: ReminderType) => {
    switch (type) {
      case 'gentle_nudge':
        return <MessageSquare className="w-4 h-4 text-blue-500" />
      case 'relationship_focus':
        return <Heart className="w-4 h-4 text-pink-500" />
      case 'health_alert':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
    }
  }

  const getTypeLabel = (type: ReminderType) => {
    switch (type) {
      case 'gentle_nudge':
        return 'Gentle Nudge'
      case 'relationship_focus':
        return 'Relationship Focus'
      case 'health_alert':
        return 'Health Alert'
    }
  }

  const getStatusLabel = (status: ReminderStatus) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled'
      case 'delivered':
        return 'Delivered'
      case 'clicked':
        return 'Clicked'
      case 'dismissed':
        return 'Dismissed'
      case 'failed':
        return 'Failed'
    }
  }

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getFilteredReminders = () => {
    if (!reminderHistory) return []

    return reminderHistory.filter(reminder => {
      const statusMatch =
        statusFilter === 'all' || reminder.status === statusFilter
      const typeMatch =
        typeFilter === 'all' || reminder.reminderType === typeFilter
      return statusMatch && typeMatch
    })
  }

  const getStatusCounts = () => {
    if (!reminderHistory) return {}

    const counts: Record<string, number> = {
      all: reminderHistory.length,
      scheduled: 0,
      delivered: 0,
      clicked: 0,
      dismissed: 0,
      failed: 0,
    }

    reminderHistory.forEach(reminder => {
      counts[reminder.status] = (counts[reminder.status] || 0) + 1
    })

    return counts
  }

  const filteredReminders = getFilteredReminders()
  const statusCounts = getStatusCounts()

  if (!reminderHistory) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </Card>
    )
  }

  if (reminderHistory.length === 0) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Reminder History
        </h3>
        <p className="text-gray-600">
          Your reminder history will appear here once you start receiving
          notifications.
        </p>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">
            Notification History
          </h3>
        </div>
        <div className="text-sm text-gray-600">
          {filteredReminders.length} of {reminderHistory.length} reminders
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e =>
              setStatusFilter(e.target.value as ReminderStatus | 'all')
            }
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Status ({statusCounts.all})</option>
            <option value="delivered">
              Delivered ({statusCounts.delivered})
            </option>
            <option value="clicked">Clicked ({statusCounts.clicked})</option>
            <option value="dismissed">
              Dismissed ({statusCounts.dismissed})
            </option>
            <option value="scheduled">
              Scheduled ({statusCounts.scheduled})
            </option>
            <option value="failed">Failed ({statusCounts.failed})</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e =>
              setTypeFilter(e.target.value as ReminderType | 'all')
            }
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">All Types</option>
            <option value="gentle_nudge">Gentle Nudges</option>
            <option value="relationship_focus">Relationship Focus</option>
            <option value="health_alert">Health Alerts</option>
          </select>

          {(statusFilter !== 'all' || typeFilter !== 'all') && (
            <Button
              onClick={() => {
                setStatusFilter('all')
                setTypeFilter('all')
              }}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Reminder List */}
      <div className="space-y-3">
        {filteredReminders.map(reminder => (
          <Card
            key={reminder._id}
            className={`p-4 transition-all ${
              showDetails === reminder._id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="space-y-3">
              {/* Main Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex flex-col items-center space-y-1">
                    {getTypeIcon(reminder.reminderType)}
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(reminder.status)}`}
                    >
                      {getStatusIcon(reminder.status)}
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {getTypeLabel(reminder.reminderType)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDateTime(reminder.scheduledTime)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-700 mb-2">
                      &quot;{reminder.content}&quot;
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Status: {getStatusLabel(reminder.status)}</span>
                      {reminder.deliveredTime && (
                        <span>
                          Delivered: {formatDateTime(reminder.deliveredTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() =>
                    setShowDetails(
                      showDetails === reminder._id ? null : reminder._id
                    )
                  }
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  {showDetails === reminder._id ? 'Hide' : 'Details'}
                </Button>
              </div>

              {/* Detailed Info */}
              {showDetails === reminder._id && (
                <div className="pt-3 border-t bg-gray-50 -mx-4 px-4 pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Timing</h5>
                      <div className="space-y-1 text-gray-600">
                        <div>
                          Scheduled:{' '}
                          {new Date(reminder.scheduledTime).toLocaleString()}
                        </div>
                        {reminder.deliveredTime && (
                          <div>
                            Delivered:{' '}
                            {new Date(reminder.deliveredTime).toLocaleString()}
                          </div>
                        )}
                        <div>
                          Created:{' '}
                          {new Date(reminder.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">
                        Context
                      </h5>
                      <div className="space-y-1 text-gray-600">
                        <div>Reason: {reminder.metadata.triggerReason}</div>
                        {reminder.metadata.daysSinceLastEntry && (
                          <div>
                            Days since entry:{' '}
                            {reminder.metadata.daysSinceLastEntry}
                          </div>
                        )}
                        {reminder.metadata.healthScoreAtTime && (
                          <div>
                            Health score: {reminder.metadata.healthScoreAtTime}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredReminders.length === 0 && (
        <Card className="p-6 text-center">
          <div className="text-gray-500">
            No reminders match the selected filters.
          </div>
        </Card>
      )}
    </div>
  )
}
