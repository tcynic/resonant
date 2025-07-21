'use client'

import { useMemo } from 'react'

export interface HighlightedTextProps {
  text: string
  searchTerm: string
  className?: string
  highlightClassName?: string
  caseSensitive?: boolean
}

export function HighlightedText({
  text,
  searchTerm,
  className = '',
  highlightClassName = 'bg-yellow-200 font-medium px-1 rounded',
  caseSensitive = false,
}: HighlightedTextProps) {
  const highlightedText = useMemo(() => {
    if (!text || !searchTerm) {
      return <span className={className}>{text}</span>
    }

    // Escape special regex characters in search term
    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    const escapedSearchTerm = escapeRegExp(searchTerm.trim())
    const flags = caseSensitive ? 'g' : 'gi'
    const regex = new RegExp(`(${escapedSearchTerm})`, flags)

    const parts = text.split(regex)

    if (parts.length === 1) {
      // No matches found
      return <span className={className}>{text}</span>
    }

    return (
      <span className={className}>
        {parts.map((part, index) => {
          // Check if this part matches the search term
          const isMatch = regex.test(part)

          // Reset regex lastIndex for consistent testing
          regex.lastIndex = 0

          if (isMatch && part.trim().length > 0) {
            return (
              <mark key={index} className={highlightClassName}>
                {part}
              </mark>
            )
          }

          return part
        })}
      </span>
    )
  }, [text, searchTerm, className, highlightClassName, caseSensitive])

  return highlightedText
}

// Alternative component for more complex highlighting needs
export interface MultiHighlightTextProps {
  text: string
  searchTerms: string[]
  className?: string
  highlightClassName?: string
  caseSensitive?: boolean
}

export function MultiHighlightText({
  text,
  searchTerms,
  className = '',
  highlightClassName = 'bg-yellow-200 font-medium px-1 rounded',
  caseSensitive = false,
}: MultiHighlightTextProps) {
  const highlightedText = useMemo(() => {
    if (!text || !searchTerms.length) {
      return <span className={className}>{text}</span>
    }

    // Filter out empty terms and escape special regex characters
    const validTerms = searchTerms
      .filter(term => term.trim().length > 0)
      .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

    if (validTerms.length === 0) {
      return <span className={className}>{text}</span>
    }

    const flags = caseSensitive ? 'g' : 'gi'
    const regex = new RegExp(`(${validTerms.join('|')})`, flags)

    const parts = text.split(regex)

    if (parts.length === 1) {
      // No matches found
      return <span className={className}>{text}</span>
    }

    return (
      <span className={className}>
        {parts.map((part, index) => {
          // Check if this part matches any search term
          const isMatch = validTerms.some(term => {
            const termRegex = new RegExp(`^${term}$`, caseSensitive ? '' : 'i')
            return termRegex.test(part)
          })

          if (isMatch && part.trim().length > 0) {
            return (
              <mark key={index} className={highlightClassName}>
                {part}
              </mark>
            )
          }

          return part
        })}
      </span>
    )
  }, [text, searchTerms, className, highlightClassName, caseSensitive])

  return highlightedText
}

// Utility function to extract highlighted segments for external use
export function getHighlightedSegments(
  text: string,
  searchTerm: string,
  caseSensitive: boolean = false
): Array<{ text: string; isHighlighted: boolean }> {
  if (!text || !searchTerm) {
    return [{ text, isHighlighted: false }]
  }

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  const escapedSearchTerm = escapeRegExp(searchTerm.trim())
  const flags = caseSensitive ? 'g' : 'gi'
  const regex = new RegExp(`(${escapedSearchTerm})`, flags)

  const parts = text.split(regex)

  if (parts.length === 1) {
    return [{ text, isHighlighted: false }]
  }

  return parts
    .filter(part => part.length > 0)
    .map(part => {
      regex.lastIndex = 0 // Reset for consistent testing
      const isMatch = regex.test(part)
      return {
        text: part,
        isHighlighted: isMatch,
      }
    })
}
