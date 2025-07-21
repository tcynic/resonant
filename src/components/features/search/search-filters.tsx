'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Filter, X, Calendar, User, Eye, EyeOff, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
// Select component not needed for current implementation
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

export interface SearchFilters {
  relationshipIds: string[]
  dateRange: {
    start?: number
    end?: number
  }
  includePrivate: boolean
  tags: string[]
  mood?: string
}

export interface Relationship {
  _id: string
  name: string
  type: string
  photo?: string
}

export interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  relationships: Relationship[]
  availableTags: string[]
  availableMoods: string[]
  onClearFilters: () => void
  className?: string
}

export function SearchFiltersComponent({
  filters,
  onFiltersChange,
  relationships,
  availableTags,
  availableMoods,
  onClearFilters,
  className = '',
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [tempDateRange, setTempDateRange] = useState({
    start: '',
    end: '',
  })

  // Initialize temp date range from filters
  useEffect(() => {
    setTempDateRange({
      start: filters.dateRange.start
        ? new Date(filters.dateRange.start).toISOString().split('T')[0]
        : '',
      end: filters.dateRange.end
        ? new Date(filters.dateRange.end).toISOString().split('T')[0]
        : '',
    })
  }, [filters.dateRange])

  const hasActiveFilters = () => {
    return (
      filters.relationshipIds.length > 0 ||
      filters.dateRange.start ||
      filters.dateRange.end ||
      !filters.includePrivate ||
      filters.tags.length > 0 ||
      filters.mood
    )
  }

  const handleRelationshipToggle = (relationshipId: string) => {
    const newRelationshipIds = filters.relationshipIds.includes(relationshipId)
      ? filters.relationshipIds.filter(id => id !== relationshipId)
      : [...filters.relationshipIds, relationshipId]

    onFiltersChange({
      ...filters,
      relationshipIds: newRelationshipIds,
    })
  }

  const handleDateRangeChange = () => {
    const startDate = tempDateRange.start
      ? new Date(tempDateRange.start).getTime()
      : undefined
    const endDate = tempDateRange.end
      ? new Date(tempDateRange.end + 'T23:59:59').getTime()
      : undefined

    onFiltersChange({
      ...filters,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    })
  }

  const handlePrivacyToggle = () => {
    onFiltersChange({
      ...filters,
      includePrivate: !filters.includePrivate,
    })
  }

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]

    onFiltersChange({
      ...filters,
      tags: newTags,
    })
  }

  const handleMoodChange = (mood: string) => {
    onFiltersChange({
      ...filters,
      mood: mood === filters.mood ? undefined : mood,
    })
  }

  const getRelationshipInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  const formatDatePreset = (preset: string) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (preset) {
      case 'today':
        return {
          start: today.getTime(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).getTime(),
        }
      case 'week':
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - 7)
        return {
          start: weekStart.getTime(),
          end: now.getTime(),
        }
      case 'month':
        const monthStart = new Date(today)
        monthStart.setMonth(today.getMonth() - 1)
        return {
          start: monthStart.getTime(),
          end: now.getTime(),
        }
      case 'year':
        const yearStart = new Date(today)
        yearStart.setFullYear(today.getFullYear() - 1)
        return {
          start: yearStart.getTime(),
          end: now.getTime(),
        }
      default:
        return { start: undefined, end: undefined }
    }
  }

  const handleDatePreset = (preset: string) => {
    const dateRange = formatDatePreset(preset)
    onFiltersChange({
      ...filters,
      dateRange,
    })
  }

  return (
    <div className={className}>
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {hasActiveFilters() && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Active
            </span>
          )}
        </Button>

        {hasActiveFilters() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <Card className="p-4 space-y-6">
          {/* Relationships Filter */}
          <div>
            <h4 className="flex items-center text-sm font-medium mb-3">
              <User className="w-4 h-4 mr-2" />
              Relationships
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {relationships.map(relationship => (
                <label
                  key={relationship._id}
                  className="flex items-center space-x-2 p-2 rounded-md border cursor-pointer hover:bg-gray-50"
                >
                  <Checkbox
                    checked={filters.relationshipIds.includes(relationship._id)}
                    onChange={() => handleRelationshipToggle(relationship._id)}
                  />
                  <div className="flex items-center space-x-2 min-w-0">
                    {relationship.photo ? (
                      <Image
                        src={relationship.photo}
                        alt={relationship.name}
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
                        {getRelationshipInitials(relationship.name)}
                      </div>
                    )}
                    <span className="text-sm truncate">
                      {relationship.name}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <h4 className="flex items-center text-sm font-medium mb-3">
              <Calendar className="w-4 h-4 mr-2" />
              Date Range
            </h4>

            {/* Date Presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { label: 'Today', value: 'today' },
                { label: 'Last Week', value: 'week' },
                { label: 'Last Month', value: 'month' },
                { label: 'Last Year', value: 'year' },
              ].map(preset => (
                <Button
                  key={preset.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleDatePreset(preset.value)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">From</label>
                <Input
                  type="date"
                  value={tempDateRange.start}
                  onChange={e =>
                    setTempDateRange({
                      ...tempDateRange,
                      start: e.target.value,
                    })
                  }
                  onBlur={handleDateRangeChange}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">To</label>
                <Input
                  type="date"
                  value={tempDateRange.end}
                  onChange={e =>
                    setTempDateRange({ ...tempDateRange, end: e.target.value })
                  }
                  onBlur={handleDateRangeChange}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Privacy Filter */}
          <div>
            <h4 className="flex items-center text-sm font-medium mb-3">
              <Eye className="w-4 h-4 mr-2" />
              Privacy
            </h4>
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={filters.includePrivate}
                onChange={handlePrivacyToggle}
              />
              <EyeOff className="w-4 h-4 text-gray-400" />
              <span className="text-sm">Include private entries</span>
            </label>
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div>
              <h4 className="flex items-center text-sm font-medium mb-3">
                <Tag className="w-4 h-4 mr-2" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`
                      px-3 py-1 rounded-full text-sm border transition-colors
                      ${
                        filters.tags.includes(tag)
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mood Filter */}
          {availableMoods.length > 0 && (
            <div>
              <h4 className="flex items-center text-sm font-medium mb-3">
                <span className="w-4 h-4 mr-2">😊</span>
                Mood
              </h4>
              <div className="flex flex-wrap gap-2">
                {availableMoods.map(mood => (
                  <button
                    key={mood}
                    onClick={() => handleMoodChange(mood)}
                    className={`
                      px-3 py-1 rounded-full text-sm border transition-colors
                      ${
                        filters.mood === mood
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
