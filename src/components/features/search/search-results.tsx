'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Clock, User, Tag, EyeOff, ChevronDown, ChevronUp } from 'lucide-react'
import Button from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HighlightedText } from './highlighted-text'

export interface SearchResult {
  _id: string
  content: string
  mood?: string
  tags: string[]
  isPrivate: boolean
  createdAt: number
  updatedAt: number
  relationship: {
    _id: string
    name: string
    type: string
    photo?: string
  } | null
  snippet: string
}

export interface SearchResultsProps {
  results: SearchResult[]
  searchQuery: string
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onResultClick?: (result: SearchResult) => void
  totalResults?: number
  className?: string
}

export function SearchResults({
  results,
  searchQuery,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onResultClick,
  totalResults,
  className = '',
}: SearchResultsProps) {
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())

  const toggleExpanded = (resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(resultId)) {
        newSet.delete(resultId)
      } else {
        newSet.add(resultId)
      }
      return newSet
    })
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays <= 7) {
      return `${diffDays} days ago`
    } else if (diffDays <= 30) {
      return `${Math.ceil(diffDays / 7)} weeks ago`
    } else if (diffDays <= 365) {
      return `${Math.ceil(diffDays / 30)} months ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getRelationshipInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  if (isLoading && results.length === 0) {
    return (
      <div
        className={`space-y-4 ${className}`}
        role="status"
        aria-label="Loading search results"
      >
        {[...Array(3)].map((_, i) => (
          <Card
            key={i}
            className="p-4 animate-pulse"
            data-testid={`loading-card-${i}`}
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (results.length === 0 && !isLoading) {
    return (
      <div className={`text-center py-12 ${className}`} role="status">
        <div className="text-gray-500">
          <p className="text-lg font-medium">No entries found</p>
          <p className="mt-1">
            Try adjusting your search terms or{' '}
            <button className="text-blue-600 hover:underline">
              browse all entries
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Results Header */}
      {totalResults !== undefined && (
        <div className="flex justify-between items-center text-sm text-gray-600 pb-2 border-b">
          <span>
            {totalResults} result{totalResults === 1 ? '' : 's'} for &ldquo;
            {searchQuery}&rdquo;
          </span>
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3" role="list" aria-label="Search results">
        {results.map(result => {
          const isExpanded = expandedResults.has(result._id)
          const shouldShowExpand = result.content.length > 200

          return (
            <Card
              key={result._id}
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              role="listitem"
              onClick={() => onResultClick?.(result)}
            >
              <div className="flex items-start space-x-3">
                {/* Relationship Avatar */}
                <div className="flex-shrink-0">
                  {result.relationship?.photo ? (
                    <Image
                      src={result.relationship.photo}
                      alt={result.relationship.name}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                      {result.relationship
                        ? getRelationshipInitials(result.relationship.name)
                        : '?'}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <User className="w-3 h-3" />
                      <span className="font-medium">
                        {result.relationship?.name || 'Unknown'}
                      </span>
                      <span className="text-gray-400">•</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(result.createdAt)}</span>
                      {result.isPrivate && (
                        <>
                          <span className="text-gray-400">•</span>
                          <EyeOff className="w-3 h-3" />
                          <span>Private</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content Snippet or Full Text */}
                  <div className="prose prose-sm max-w-none">
                    {isExpanded ? (
                      <HighlightedText
                        text={result.content}
                        searchTerm={searchQuery}
                        className="leading-relaxed"
                      />
                    ) : (
                      <HighlightedText
                        text={result.snippet}
                        searchTerm={searchQuery}
                        className="leading-relaxed"
                      />
                    )}
                  </div>

                  {/* Expand/Collapse Button */}
                  {shouldShowExpand && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation()
                        toggleExpanded(result._id)
                      }}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700 p-0 h-auto"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Show more
                        </>
                      )}
                    </Button>
                  )}

                  {/* Tags and Mood */}
                  {(result.tags.length > 0 || result.mood) && (
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {result.mood && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          {result.mood}
                        </span>
                      )}
                      {result.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          <HighlightedText
                            text={tag}
                            searchTerm={searchQuery}
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={onLoadMore}
            disabled={isLoading}
            variant="secondary"
            className="px-8"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Load more results'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
