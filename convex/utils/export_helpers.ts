/**
 * Data export utility functions
 */

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf'
  includeAnalysis: boolean
  dateRange?: {
    start: number
    end: number
  }
  relationshipIds?: string[]
}

export interface ExportMetadata {
  exportDate: string
  exportVersion: string
  dataTypes: string[]
  totalRecords: Record<string, number>
  filters?: {
    dateRange?: { start: string; end: string }
    relationships?: string[]
  }
}

/**
 * Creates standardized export metadata
 */
export function createExportMetadata(
  options: ExportOptions,
  recordCounts: Record<string, number>
): ExportMetadata {
  const metadata: ExportMetadata = {
    exportDate: new Date().toISOString(),
    exportVersion: '1.0',
    dataTypes: ['user', 'relationships', 'journalEntries'],
    totalRecords: recordCounts,
  }

  if (options.includeAnalysis) {
    metadata.dataTypes.push('healthScores', 'aiAnalysis')
  }

  if (options.dateRange || options.relationshipIds) {
    metadata.filters = {}

    if (options.dateRange) {
      metadata.filters.dateRange = {
        start: new Date(options.dateRange.start).toISOString(),
        end: new Date(options.dateRange.end).toISOString(),
      }
    }

    if (options.relationshipIds) {
      metadata.filters.relationships = options.relationshipIds
    }
  }

  return metadata
}

/**
 * Validates export request parameters
 */
export function validateExportRequest(options: ExportOptions): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate format
  if (!['json', 'csv', 'pdf'].includes(options.format)) {
    errors.push('Invalid export format')
  }

  // Validate date range
  if (options.dateRange) {
    if (!options.dateRange.start || !options.dateRange.end) {
      errors.push('Date range must include both start and end dates')
    } else if (options.dateRange.start >= options.dateRange.end) {
      errors.push('Start date must be before end date')
    }
  }

  // Validate relationship IDs
  if (options.relationshipIds && options.relationshipIds.length === 0) {
    errors.push('Relationship filter cannot be empty')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Estimates the size of exported data
 */
export function estimateExportSize(recordCounts: Record<string, number>): {
  jsonSizeMB: number
  csvSizeMB: number
  estimatedRecords: number
} {
  const avgSizes = {
    user: 0.5, // KB
    relationships: 0.5, // KB per relationship
    journalEntries: 2.0, // KB per entry
    healthScores: 1.0, // KB per score
    aiAnalysis: 0.8, // KB per analysis
  }

  let totalKB = 0
  let totalRecords = 0

  Object.entries(recordCounts).forEach(([type, count]) => {
    if (avgSizes[type as keyof typeof avgSizes]) {
      totalKB += count * avgSizes[type as keyof typeof avgSizes]
      totalRecords += count
    }
  })

  return {
    jsonSizeMB: Math.round((totalKB / 1024) * 10) / 10,
    csvSizeMB: Math.round(((totalKB * 0.7) / 1024) * 10) / 10, // CSV is typically smaller
    estimatedRecords: totalRecords,
  }
}

/**
 * Generates safe filename for export
 */
export function generateExportFileName(
  userName: string,
  format: string,
  timestamp?: number
): string {
  const safeName = userName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  const date = new Date(timestamp || Date.now()).toISOString().split('T')[0]

  return `resonant-export-${safeName}-${date}.${format}`
}

/**
 * Sanitizes text content for CSV export
 */
export function sanitizeForCSV(text: string): string {
  if (!text) return ''

  // Escape quotes and handle multiline text
  return text
    .replace(/"/g, '""')
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim()
}

/**
 * Formats date for human-readable display
 */
export function formatExportDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

/**
 * Creates CSV header row
 */
export function createCSVHeader(fields: string[]): string {
  return fields.map(field => `"${field}"`).join(',')
}

/**
 * Creates CSV data row
 */
export function createCSVRow(
  values: (string | number | boolean | null | undefined)[]
): string {
  return values
    .map(value => {
      if (value === null || value === undefined) {
        return '""'
      }
      if (typeof value === 'string') {
        return `"${sanitizeForCSV(value)}"`
      }
      return `"${value}"`
    })
    .join(',')
}

/**
 * Validates exported data integrity
 */
export function validateExportData(data: any): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required fields
  if (!data.exportMetadata) {
    errors.push('Missing export metadata')
  }

  if (!data.user) {
    errors.push('Missing user data')
  }

  if (!Array.isArray(data.relationships)) {
    errors.push('Relationships data must be an array')
  }

  if (!Array.isArray(data.journalEntries)) {
    errors.push('Journal entries data must be an array')
  }

  // Check data consistency
  if (data.relationships && data.journalEntries) {
    const relationshipIds = new Set(data.relationships.map((r: any) => r.id))
    const entriesWithMissingRels = data.journalEntries.filter(
      (entry: any) =>
        entry.relationship && !relationshipIds.has(entry.relationship.id)
    )

    if (entriesWithMissingRels.length > 0) {
      warnings.push(
        `${entriesWithMissingRels.length} journal entries reference missing relationships`
      )
    }
  }

  // Check for potentially sensitive data
  if (data.journalEntries) {
    const privateEntries = data.journalEntries.filter(
      (entry: any) => entry.isPrivate
    )
    if (privateEntries.length > 0) {
      warnings.push(`Export includes ${privateEntries.length} private entries`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Compresses exported data (placeholder for future implementation)
 */
export function compressExportData(data: string): {
  compressed: string
  originalSize: number
  compressedSize: number
  compressionRatio: number
} {
  // For now, just return the original data
  // In production, you might use a compression library
  const originalSize = data.length

  return {
    compressed: data,
    originalSize,
    compressedSize: originalSize,
    compressionRatio: 1.0,
  }
}

/**
 * Creates export summary for user display
 */
export function createExportSummary(
  metadata: ExportMetadata,
  size: { jsonSizeMB: number; csvSizeMB: number; estimatedRecords: number }
): {
  summary: string
  details: Array<{ label: string; value: string | number }>
} {
  const totalRecords = Object.values(metadata.totalRecords).reduce(
    (sum, count) => sum + count,
    0
  )

  const details = [
    {
      label: 'Export Date',
      value: formatExportDate(new Date(metadata.exportDate).getTime()),
    },
    { label: 'Total Records', value: totalRecords },
    { label: 'Relationships', value: metadata.totalRecords.relationships || 0 },
    {
      label: 'Journal Entries',
      value: metadata.totalRecords.journalEntries || 0,
    },
    { label: 'Estimated Size (JSON)', value: `${size.jsonSizeMB} MB` },
    { label: 'Estimated Size (CSV)', value: `${size.csvSizeMB} MB` },
  ]

  if (metadata.totalRecords.healthScores) {
    details.push({
      label: 'Health Scores',
      value: metadata.totalRecords.healthScores,
    })
  }

  if (metadata.totalRecords.aiAnalysis) {
    details.push({
      label: 'AI Analysis',
      value: metadata.totalRecords.aiAnalysis,
    })
  }

  const summary = `Your Resonant data export includes ${totalRecords} records across ${metadata.dataTypes.length} data types, with an estimated size of ${size.jsonSizeMB} MB in JSON format.`

  return { summary, details }
}
