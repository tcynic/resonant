'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import Card, { CardHeader, CardContent } from '@/components/ui/card'
import { Id } from '../../../../convex/_generated/dataModel'

interface EntryHistoryProps {
  className?: string
  initialLimit?: number
  showHeader?: boolean
}

interface FilterState {
  relationshipIds: Id<'relationships'>[]
  startDate: string
  endDate: string
  searchTerm: string
}

interface RelationshipOption {
  id: Id<'relationships'>
  name: string
  selected: boolean
}

function RelationshipFilter({
  relationships,
  selectedIds,
  onChange,
}: {
  relationships: RelationshipOption[]
  selectedIds: Id<'relationships'>[]
  onChange: (ids: Id<'relationships'>[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = (relationshipId: Id<'relationships'>) => {
    const newSelected = selectedIds.includes(relationshipId)
      ? selectedIds.filter(id => id !== relationshipId)
      : [...selectedIds, relationshipId]
    onChange(newSelected)
  }

  const selectedCount = selectedIds.length
  const totalCount = relationships.length

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="text-gray-700">
          {selectedCount === 0
            ? 'All Relationships'
            : selectedCount === totalCount
              ? 'All Relationships'
              : `${selectedCount} selected`}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            <button
              onClick={() => onChange([])}
              className="w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              Clear all filters
            </button>
            <button
              onClick={() => onChange(relationships.map(r => r.id))}
              className="w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              Select all
            </button>
          </div>
          <div className="border-t border-gray-200">
            {relationships.map(relationship => (
              <label
                key={relationship.id}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(relationship.id)}
                  onChange={() => handleToggle(relationship.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {relationship.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DateRangePicker({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string
  endDate: string
  onChange: (start: string, end: string) => void
}) {
  const handleQuickSelect = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)

    onChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0])
  }

  return (
    <div className="space-y-2">
      <div className="flex space-x-2">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={e => onChange(e.target.value, endDate)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={e => onChange(startDate, e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => handleQuickSelect(7)}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
        >
          Last 7 days
        </button>
        <button
          onClick={() => handleQuickSelect(30)}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
        >
          Last 30 days
        </button>
        <button
          onClick={() => handleQuickSelect(90)}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
        >
          Last 90 days
        </button>
        <button
          onClick={() => onChange('', '')}
          className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
        >
          Clear
        </button>
      </div>
    </div>
  )
}

function EntryCard({
  entry,
  relationshipName,
}: {
  entry: {
    _id: string
    content: string
    createdAt: number
    mood?: string
    tags?: string[]
    analysisStatus?: {
      sentimentScore?: number | null
      emotions?: string[]
    }
  }
  relationshipName: string
}) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getSentimentColor = (score: number | null) => {
    if (!score) return 'bg-gray-100 text-gray-600'
    if (score >= 8) return 'bg-green-100 text-green-800'
    if (score >= 6) return 'bg-blue-100 text-blue-800'
    if (score >= 4) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getSentimentLabel = (score: number | null) => {
    if (!score) return 'No Analysis'
    if (score >= 8) return 'Very Positive'
    if (score >= 6) return 'Positive'
    if (score >= 4) return 'Neutral'
    return 'Negative'
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">
            {relationshipName}
          </span>
          {entry.analysisStatus?.sentimentScore && (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getSentimentColor(entry.analysisStatus.sentimentScore)}`}
            >
              {getSentimentLabel(entry.analysisStatus.sentimentScore)}
            </span>
          )}
        </div>
        <time className="text-xs text-gray-500">
          {formatDate(entry.createdAt)}
        </time>
      </div>

      <p className="text-sm text-gray-700 mb-3 line-clamp-3">
        {entry.content.substring(0, 150) +
          (entry.content.length > 150 ? '...' : '')}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          {entry.mood && (
            <span className="flex items-center space-x-1">
              <span>
                {typeof entry.mood === 'string'
                  ? '😊'
                  : (entry.mood as { emoji?: string }).emoji || '😊'}
              </span>
              <span>
                {typeof entry.mood === 'string'
                  ? entry.mood
                  : (entry.mood as { type?: string }).type || entry.mood}
              </span>
            </span>
          )}
          {entry.tags && entry.tags.length > 0 && (
            <span>{entry.tags.length} tags</span>
          )}
        </div>

        <div className="flex space-x-2">
          <a
            href={`/journal/${entry._id}`}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            View
          </a>
          <a
            href={`/journal/${entry._id}/edit`}
            className="text-xs text-gray-600 hover:text-gray-800 font-medium"
          >
            Edit
          </a>
        </div>
      </div>
    </div>
  )
}

export default function EntryHistory({
  className = '',
  initialLimit = 20,
  showHeader = true,
}: EntryHistoryProps) {
  const { user } = useUser()
  const [filters, setFilters] = useState<FilterState>({
    relationshipIds: [],
    startDate: '',
    endDate: '',
    searchTerm: '',
  })
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(filters.searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [filters.searchTerm])

  // Get user's relationships for filter options
  const relationships = useQuery(
    api.relationships.getRelationshipsByUser as any,
    user?.id ? { userId: user.id as Id<'users'> } : 'skip'
  )

  // Get filtered journal entries
  const entriesData = useQuery(
    api.dashboard.getFilteredJournalEntries,
    user?.id
      ? {
          userId: user.id as Id<'users'>,
          relationshipIds:
            filters.relationshipIds.length > 0
              ? filters.relationshipIds
              : undefined,
          startDate: filters.startDate
            ? new Date(filters.startDate).getTime()
            : undefined,
          endDate: filters.endDate
            ? new Date(filters.endDate).getTime() + 24 * 60 * 60 * 1000 - 1
            : undefined,
          searchTerm: debouncedSearchTerm || undefined,
          limit: initialLimit,
        }
      : 'skip'
  )

  const relationshipOptions: RelationshipOption[] =
    relationships?.map(rel => ({
      id: rel._id,
      name: rel.name,
      selected: filters.relationshipIds.includes(rel._id),
    })) || []

  const handleFilterChange = (key: keyof FilterState, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearAllFilters = () => {
    setFilters({
      relationshipIds: [],
      startDate: '',
      endDate: '',
      searchTerm: '',
    })
  }

  const hasActiveFilters =
    filters.relationshipIds.length > 0 ||
    filters.startDate ||
    filters.endDate ||
    filters.searchTerm

  if (relationships === undefined || entriesData === undefined) {
    return (
      <Card className={className} padding="md">
        {showHeader && (
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">
              Entry History
            </h3>
          </CardHeader>
        )}
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className} padding="md">
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Entry History
            </h3>
            <div className="text-sm text-gray-500">
              {entriesData.entries.length} entries
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Relationship Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relationships
            </label>
            <RelationshipFilter
              relationships={relationshipOptions}
              selectedIds={filters.relationshipIds}
              onChange={ids => handleFilterChange('relationshipIds', ids)}
            />
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <DateRangePicker
              startDate={filters.startDate}
              endDate={filters.endDate}
              onChange={(start, end) => {
                setFilters(prev => ({
                  ...prev,
                  startDate: start,
                  endDate: end,
                }))
              }}
            />
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Content
            </label>
            <input
              type="text"
              placeholder="Search entries..."
              value={filters.searchTerm}
              onChange={e => handleFilterChange('searchTerm', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results */}
        {entriesData.entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl text-gray-400">📝</span>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {hasActiveFilters
                ? 'No entries match your filters'
                : 'No journal entries yet'}
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your search criteria or clearing filters'
                : 'Start journaling to see your entries here'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Clear Filters
              </button>
            ) : (
              <Link
                href="/journal/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Create First Entry
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {entriesData.entries.map(entry => (
              <EntryCard
                key={entry._id}
                entry={entry}
                relationshipName={entry.relationshipName}
              />
            ))}

            {entriesData.hasMore && (
              <div className="text-center pt-4">
                <button className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Load More Entries
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
