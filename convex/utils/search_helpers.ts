/**
 * Search utility functions for journal entry search and text processing
 */

export interface SearchHighlight {
  text: string
  isHighlighted: boolean
}

/**
 * Highlights search terms in text content
 * @param text - The text to highlight
 * @param searchTerm - The term to highlight
 * @param caseSensitive - Whether to perform case-sensitive matching
 * @returns Array of text segments with highlight information
 */
export function highlightSearchTerms(
  text: string,
  searchTerm: string,
  caseSensitive: boolean = false
): SearchHighlight[] {
  if (!text || !searchTerm) {
    return [{ text, isHighlighted: false }]
  }

  const searchPattern = new RegExp(
    `(${escapeRegExp(searchTerm)})`,
    caseSensitive ? 'g' : 'gi'
  )

  const parts = text.split(searchPattern)
  const highlights: SearchHighlight[] = []

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (part) {
      const isMatch = searchPattern.test(part)
      highlights.push({
        text: part,
        isHighlighted: isMatch,
      })
    }
  }

  return highlights.length > 0 ? highlights : [{ text, isHighlighted: false }]
}

/**
 * Creates a search snippet around the search term
 * @param content - Full text content
 * @param searchTerm - Term to center the snippet around
 * @param maxLength - Maximum length of the snippet
 * @param contextPadding - Characters to show before/after the match
 * @returns Snippet with ellipsis if truncated
 */
export function createSearchSnippet(
  content: string,
  searchTerm: string,
  maxLength: number = 200,
  contextPadding: number = 50
): string {
  if (!content || !searchTerm) {
    return content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content
  }

  const lowerContent = content.toLowerCase()
  const lowerTerm = searchTerm.toLowerCase()
  const matchIndex = lowerContent.indexOf(lowerTerm)

  // If no match found, return beginning of content
  if (matchIndex === -1) {
    return content.length > maxLength
      ? content.substring(0, maxLength) + '...'
      : content
  }

  // Calculate snippet bounds
  const termLength = searchTerm.length
  const beforePadding = Math.min(contextPadding, matchIndex)
  const afterPadding = Math.min(
    contextPadding,
    content.length - (matchIndex + termLength)
  )

  const start = Math.max(0, matchIndex - beforePadding)
  const end = Math.min(content.length, matchIndex + termLength + afterPadding)

  let snippet = content.substring(start, end)

  // Adjust if snippet is still too long
  if (snippet.length > maxLength) {
    const overflow = snippet.length - maxLength
    const trimFromEnd = Math.ceil(overflow / 2)
    const trimFromStart = overflow - trimFromEnd

    snippet = snippet.substring(trimFromStart, snippet.length - trimFromEnd)
  }

  // Add ellipsis
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'

  return snippet
}

/**
 * Calculates search relevance score for ranking results
 * @param content - Text content to score
 * @param searchTerm - Search term
 * @param title - Optional title field for boosting
 * @param tags - Optional tags for additional relevance
 * @returns Relevance score (0-100)
 */
export function calculateRelevanceScore(
  content: string,
  searchTerm: string,
  title?: string,
  tags?: string[]
): number {
  let score = 0
  const lowerContent = content.toLowerCase()
  const lowerTerm = searchTerm.toLowerCase()

  // Exact phrase match in content (highest score)
  if (lowerContent.includes(lowerTerm)) {
    score += 50

    // Bonus for early occurrence
    const firstIndex = lowerContent.indexOf(lowerTerm)
    const positionBonus = Math.max(0, 10 - Math.floor(firstIndex / 100))
    score += positionBonus
  }

  // Word frequency scoring
  const words = lowerTerm.split(' ')
  words.forEach(word => {
    const wordCount = (lowerContent.match(new RegExp(word, 'g')) || []).length
    score += Math.min(wordCount * 5, 20) // Cap at 20 points per word
  })

  // Title match bonus
  if (title && title.toLowerCase().includes(lowerTerm)) {
    score += 25
  }

  // Tags match bonus
  if (tags) {
    const tagMatches = tags.filter(tag =>
      tag.toLowerCase().includes(lowerTerm)
    ).length
    score += tagMatches * 10
  }

  // Length penalty for very long content (diluted relevance)
  if (content.length > 2000) {
    score *= 0.9
  }

  return Math.min(100, Math.max(0, score))
}

/**
 * Extracts keywords from text for search suggestions
 * @param text - Text to extract keywords from
 * @param minLength - Minimum keyword length
 * @param maxKeywords - Maximum number of keywords to return
 * @returns Array of unique keywords
 */
export function extractKeywords(
  text: string,
  minLength: number = 3,
  maxKeywords: number = 20
): string[] {
  if (!text) return []

  // Common stop words to exclude
  const stopWords = new Set([
    'the',
    'be',
    'to',
    'of',
    'and',
    'a',
    'in',
    'that',
    'have',
    'i',
    'it',
    'for',
    'not',
    'on',
    'with',
    'he',
    'as',
    'you',
    'do',
    'at',
    'this',
    'but',
    'his',
    'by',
    'from',
    'they',
    'we',
    'say',
    'her',
    'she',
    'or',
    'an',
    'will',
    'my',
    'one',
    'all',
    'would',
    'there',
    'their',
    'what',
    'so',
    'up',
    'out',
    'if',
    'about',
    'who',
    'get',
    'which',
    'go',
    'me',
    'when',
    'make',
    'can',
    'like',
    'time',
    'no',
    'just',
    'him',
    'know',
    'take',
    'people',
    'into',
    'year',
    'your',
    'good',
    'some',
    'could',
    'them',
    'see',
    'other',
    'than',
    'then',
    'now',
    'look',
    'only',
    'come',
    'its',
    'over',
    'think',
    'also',
    'back',
    'after',
    'use',
    'two',
    'how',
    'our',
    'work',
    'first',
    'well',
    'way',
    'even',
    'new',
    'want',
    'because',
    'any',
    'these',
    'give',
    'day',
    'most',
    'us',
    'is',
    'was',
    'are',
    'been',
    'has',
    'had',
    'were',
  ])

  // Extract words and count frequency
  const wordFreq = new Map<string, number>()
  const words = text.toLowerCase().match(/\b\w+\b/g) || []

  words.forEach(word => {
    if (word.length >= minLength && !stopWords.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1)
    }
  })

  // Sort by frequency and return top keywords
  return Array.from(wordFreq.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, maxKeywords)
    .map(([word]) => word)
}

/**
 * Validates search query format and content
 * @param query - Search query to validate
 * @returns Object with validation result and error message
 */
export function validateSearchQuery(query: string): {
  isValid: boolean
  error?: string
  cleanedQuery?: string
} {
  if (!query || typeof query !== 'string') {
    return { isValid: false, error: 'Search query is required' }
  }

  const cleaned = query.trim()

  if (cleaned.length === 0) {
    return { isValid: false, error: 'Search query cannot be empty' }
  }

  if (cleaned.length < 2) {
    return {
      isValid: false,
      error: 'Search query must be at least 2 characters long',
    }
  }

  if (cleaned.length > 200) {
    return {
      isValid: false,
      error: 'Search query too long (maximum 200 characters)',
    }
  }

  // Check for SQL injection patterns (basic)
  const sqlInjectionPatterns =
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\s)/i
  if (sqlInjectionPatterns.test(cleaned)) {
    return {
      isValid: false,
      error: 'Invalid characters in search query',
    }
  }

  return { isValid: true, cleanedQuery: cleaned }
}

/**
 * Escapes special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Debounces search function calls
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounceSearch<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}
