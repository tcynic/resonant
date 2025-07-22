'use client'

import { useState, useCallback, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { SearchBar } from '@/components/features/search/search-bar'
import {
  SearchResults,
  SearchResult,
} from '@/components/features/search/search-results'
import {
  SearchFiltersComponent,
  SearchFilters,
} from '@/components/features/search/search-filters'
import Card from '@/components/ui/card'
import Button from '@/components/ui/button'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SearchPage() {
  const router = useRouter()
  const { user } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Search filters state
  const [filters, setFilters] = useState<SearchFilters>({
    relationshipIds: [],
    dateRange: {},
    includePrivate: true,
    tags: [],
    mood: undefined,
  })

  // Get user data
  const userData = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : 'skip'
  )

  // Get relationships for filters
  const relationships = useQuery(
    api.relationships.getRelationshipsByUser,
    userData?._id ? { userId: userData._id } : 'skip'
  )

  // Get available tags and moods for filters (simplified for now)
  const availableTags: string[] = []
  const availableMoods: string[] = []

  // Get search suggestions
  const searchSuggestionsQuery = useQuery(
    api.search.getSearchSuggestions,
    userData?._id && searchQuery.length >= 2
      ? { userId: userData._id, partialQuery: searchQuery, limit: 5 }
      : 'skip'
  )

  // Update suggestions when query changes
  useEffect(() => {
    if (searchSuggestionsQuery) {
      setSuggestions(searchSuggestionsQuery)
    } else {
      setSuggestions([])
    }
  }, [searchSuggestionsQuery])

  // Perform search using Convex query
  const searchData = useQuery(
    api.search.searchJournalEntries,
    userData?._id && searchQuery.trim().length >= 2
      ? {
          userId: userData._id,
          searchQuery: searchQuery.trim(),
          relationshipIds:
            filters.relationshipIds.length > 0
              ? filters.relationshipIds.map(id => id as Id<'relationships'>)
              : undefined,
          includePrivate: filters.includePrivate,
          cursor: nextCursor,
        }
      : 'skip'
  )

  // Update search results when query data changes
  useEffect(() => {
    if (searchData && searchQuery.trim().length >= 2) {
      if (nextCursor && searchResults.length > 0) {
        // This is a load more operation
        setSearchResults(prev => [...prev, ...searchData.results])
      } else {
        // This is a new search
        setSearchResults(searchData.results)
      }
      setHasMore(searchData.hasMore)
      setNextCursor(searchData.nextCursor)
      setHasSearched(true)
      setIsSearching(false)
    }
  }, [searchData, searchQuery, nextCursor, searchResults.length])

  // Trigger search loading state
  // Handle search clear
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
    setHasMore(false)
    setNextCursor(undefined)
    setIsSearching(false)
  }, [])

  const performSearch = useCallback(
    (query: string, loadMore: boolean = false) => {
      if (query.trim().length >= 2) {
        setIsSearching(true)
        if (!loadMore) {
          setSearchResults([])
          setNextCursor(undefined)
        }
      }
    },
    []
  )

  // Handle search input
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      if (query.trim().length >= 2) {
        performSearch(query, false)
      } else if (query.trim().length === 0) {
        handleClearSearch()
      }
    },
    [performSearch, handleClearSearch]
  )

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (hasMore && searchQuery) {
      // For load more, we'll need to implement pagination differently
      // For now, this is a placeholder
      setIsSearching(true)
    }
  }, [hasMore, searchQuery])

  // Handle result click
  const handleResultClick = useCallback(
    (result: SearchResult) => {
      router.push(`/journal/${result._id}`)
    },
    [router]
  )

  // Handle suggestion select
  const handleSuggestionSelect = useCallback(
    (suggestion: string) => {
      setSearchQuery(suggestion)
      performSearch(suggestion, false)
    },
    [performSearch]
  )

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters)
    // Reset results and cursor when filters change
    setSearchResults([])
    setNextCursor(undefined)
    setHasSearched(false)
    // The search will re-trigger via the useEffect when searchData updates
  }, [])

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    const defaultFilters: SearchFilters = {
      relationshipIds: [],
      dateRange: {},
      includePrivate: true,
      tags: [],
      mood: undefined,
    }
    setFilters(defaultFilters)
    // Reset results and cursor
    setSearchResults([])
    setNextCursor(undefined)
    setHasSearched(false)
    // The search will re-trigger via the useEffect when searchData updates
  }, [])

  if (!user || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Search Journal Entries
            </h1>
            <p className="text-gray-600">
              Find specific entries, memories, and insights
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <SearchBar
          onSearch={handleSearch}
          onClear={handleClearSearch}
          initialValue={searchQuery}
          isLoading={isSearching}
          suggestions={suggestions}
          onSuggestionSelect={handleSuggestionSelect}
          className="mb-4"
        />

        {/* Search Filters */}
        <SearchFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          relationships={relationships || []}
          availableTags={availableTags}
          availableMoods={availableMoods}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Search Results */}
      <div className="space-y-6">
        {!hasSearched && !isSearching && (
          <Card className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Search Your Journal Entries
            </h3>
            <p className="text-gray-600 mb-4">
              Enter at least 2 characters to search through your entries
            </p>
            <div className="text-sm text-gray-500">
              <p>You can search by:</p>
              <ul className="mt-2 space-y-1">
                <li>• Entry content and keywords</li>
                <li>• Relationship names and types</li>
                <li>• Tags and moods</li>
                <li>• Specific date ranges</li>
              </ul>
            </div>
          </Card>
        )}

        {hasSearched && (
          <SearchResults
            results={searchResults}
            searchQuery={searchQuery}
            isLoading={isSearching}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onResultClick={handleResultClick}
            totalResults={searchResults.length}
          />
        )}
      </div>
    </div>
  )
}
