'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import Input from '@/components/ui/input'
import Button from '@/components/ui/button'

export interface SearchBarProps {
  onSearch: (query: string) => void
  onClear: () => void
  placeholder?: string
  initialValue?: string
  isLoading?: boolean
  suggestions?: string[]
  onSuggestionSelect?: (suggestion: string) => void
  debounceMs?: number
  className?: string
}

export function SearchBar({
  onSearch,
  onClear,
  placeholder = 'Search journal entries...',
  initialValue = '',
  isLoading = false,
  suggestions = [],
  onSuggestionSelect,
  debounceMs = 300,
  className = '',
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  // const [isFocused, setIsFocused] = useState(false) // Commented out as not used

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search function
  const debouncedSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      const trimmedQuery = query.trim()
      if (trimmedQuery.length >= 2) {
        onSearch(trimmedQuery)
      } else if (trimmedQuery.length === 0) {
        onClear()
      }
    }, debounceMs)
  }, [query, onSearch, onClear, debounceMs])

  // Effect to trigger debounced search when query changes
  useEffect(() => {
    debouncedSearch()

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [debouncedSearch])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedSuggestionIndex(-1)
    setShowSuggestions(value.length >= 2 && suggestions.length > 0)
  }

  // Handle clear button
  const handleClear = () => {
    setQuery('')
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    onClear()
    inputRef.current?.focus()
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    setSelectedSuggestionIndex(-1)
    onSuggestionSelect?.(suggestion)
    inputRef.current?.focus()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        const trimmedQuery = query.trim()
        if (trimmedQuery.length >= 2) {
          onSearch(trimmedQuery)
        }
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break

      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break

      case 'Enter':
        e.preventDefault()
        if (
          selectedSuggestionIndex >= 0 &&
          selectedSuggestionIndex < suggestions.length
        ) {
          handleSuggestionSelect(suggestions[selectedSuggestionIndex])
        } else {
          const trimmedQuery = query.trim()
          if (trimmedQuery.length >= 2) {
            onSearch(trimmedQuery)
            setShowSuggestions(false)
          }
        }
        break

      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        inputRef.current?.blur()
        break

      case 'Tab':
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault()
          handleSuggestionSelect(suggestions[selectedSuggestionIndex])
        }
        break
    }
  }

  // Handle focus
  const handleFocus = () => {
    // setIsFocused(true) // Commented out as variable not used
    if (query.length >= 2 && suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  // Handle blur
  const handleBlur = () => {
    // setIsFocused(false) // Commented out as variable not used
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false)
      setSelectedSuggestionIndex(-1)
    }, 150)
  }

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className={`relative ${className}`} role="search">
      <div className="relative flex items-center">
        {/* Search Icon */}
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none"
          aria-hidden="true"
        />

        {/* Search Input */}
        <Input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="pl-10 pr-20"
          autoComplete="off"
          role="searchbox"
          aria-label="Search journal entries"
          // aria-expanded={showSuggestions} // Not supported by searchbox role
          aria-haspopup="listbox"
          aria-activedescendant={
            selectedSuggestionIndex >= 0
              ? `suggestion-${selectedSuggestionIndex}`
              : undefined
          }
        />

        {/* Loading Indicator */}
        {isLoading && (
          <Loader2
            className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin"
            aria-label="Searching..."
          />
        )}

        {/* Clear Button */}
        {query.length > 0 && !isLoading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-auto hover:bg-gray-100"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
          role="listbox"
          aria-label="Search suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion}-${index}`}
              id={`suggestion-${index}`}
              className={`
                w-full px-4 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none
                ${selectedSuggestionIndex === index ? 'bg-gray-50' : ''}
              `}
              role="option"
              aria-selected={selectedSuggestionIndex === index}
              onClick={() => handleSuggestionSelect(suggestion)}
              onMouseEnter={() => setSelectedSuggestionIndex(index)}
            >
              <Search className="inline w-3 h-3 mr-2 text-gray-400" />
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Screen Reader Status */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {isLoading && 'Searching...'}
        {showSuggestions &&
          suggestions.length > 0 &&
          `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'} available`}
        {query.length > 0 &&
          query.length < 2 &&
          'Enter at least 2 characters to search'}
      </div>
    </div>
  )
}
