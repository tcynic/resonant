'use client'

import React, { useState } from 'react'
import { Download, FileImage, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateExportFilename } from '@/lib/chart-utils'
import { ChartHandle } from './base-chart'

/**
 * Export format options
 */
export type ExportFormat = 'png' | 'pdf'

/**
 * Export options interface
 */
export interface ExportOptions {
  format: ExportFormat
  fileName?: string
  includeData?: boolean
  highResolution?: boolean
  title?: string
  description?: string
}

/**
 * Chart export button props
 */
export interface ChartExportButtonProps {
  chartRef: React.RefObject<ChartHandle | null>
  chartType: string
  timeRange: string
  className?: string
  disabled?: boolean
  defaultOptions?: Partial<ExportOptions>
  onExportStart?: () => void
  onExportComplete?: (fileName: string) => void
  onExportError?: (error: string) => void
}

/**
 * Chart Export Button Component
 *
 * Provides chart export functionality with:
 * - PNG and PDF format options
 * - High resolution export
 * - Custom filename generation
 * - Progress indicators
 * - Error handling
 */
export function ChartExportButton({
  chartRef,
  chartType,
  timeRange,
  className,
  disabled = false,
  defaultOptions = {},
  onExportStart,
  onExportComplete,
  onExportError,
}: ChartExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'png',
    includeData: false,
    highResolution: true,
    ...defaultOptions,
  })

  // Handle export
  const handleExport = async (options: ExportOptions) => {
    if (!chartRef.current || disabled) return

    setIsExporting(true)
    setShowOptions(false)

    try {
      onExportStart?.()

      const chart = chartRef.current.getChart()
      if (!chart) {
        throw new Error('Chart not available for export')
      }

      // Generate filename
      const fileName =
        options.fileName ||
        generateExportFilename(chartType, timeRange, options.format)

      if (options.format === 'png') {
        await exportAsPNG(chart, fileName, options)
      } else if (options.format === 'pdf') {
        await exportAsPDF(chart, fileName, options)
      }

      onExportComplete?.(fileName)
    } catch (error) {
      console.error('Export failed:', error)
      const errorMessage =
        error instanceof Error ? error.message : 'Export failed'
      onExportError?.(errorMessage)
    } finally {
      setIsExporting(false)
    }
  }

  // Export as PNG
  const exportAsPNG = async (
    chart: {
      canvas: HTMLCanvasElement
      ctx: CanvasRenderingContext2D
      resize: () => void
      update: (
        mode?:
          | 'default'
          | 'resize'
          | 'none'
          | 'reset'
          | 'show'
          | 'hide'
          | 'active'
      ) => void
    },
    fileName: string,
    options: ExportOptions
  ) => {
    const canvas = chart.canvas
    const context = chart.ctx

    // Store original dimensions
    const originalWidth = canvas.width
    const originalHeight = canvas.height

    try {
      // Scale for high resolution if requested
      if (options.highResolution) {
        const scale = 2
        canvas.width = originalWidth * scale
        canvas.height = originalHeight * scale
        canvas.style.width = originalWidth + 'px'
        canvas.style.height = originalHeight + 'px'
        context.scale(scale, scale)

        // Re-render chart at high resolution
        chart.resize()
        chart.update('none')
      }

      // Get image data
      const imageData = canvas.toDataURL('image/png', 1.0)

      // Create download link
      const link = document.createElement('a')
      link.download = fileName
      link.href = imageData
      link.click()
    } finally {
      // Restore original dimensions
      if (options.highResolution) {
        canvas.width = originalWidth
        canvas.height = originalHeight
        canvas.style.width = originalWidth + 'px'
        canvas.style.height = originalHeight + 'px'
        context.scale(0.5, 0.5)
        chart.resize()
        chart.update('none')
      }
    }
  }

  // Export as PDF
  const exportAsPDF = async (
    chart: {
      canvas: HTMLCanvasElement
      ctx: CanvasRenderingContext2D
      resize: () => void
      update: (
        mode?:
          | 'default'
          | 'resize'
          | 'none'
          | 'reset'
          | 'show'
          | 'hide'
          | 'active'
      ) => void
    },
    fileName: string,
    options: ExportOptions
  ) => {
    // Dynamic import to reduce bundle size
    const { jsPDF } = await import('jspdf')

    const canvas = chart.canvas
    const imgData = canvas.toDataURL('image/png', 1.0)

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    // Calculate dimensions to fit page
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20

    const imgWidth = pageWidth - margin * 2
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Add title if provided
    if (options.title) {
      pdf.setFontSize(16)
      pdf.text(options.title, margin, margin)
    }

    // Add chart image
    const yPosition = options.title ? margin + 10 : margin
    pdf.addImage(
      imgData,
      'PNG',
      margin,
      yPosition,
      imgWidth,
      Math.min(imgHeight, pageHeight - yPosition - margin)
    )

    // Add description if provided
    if (options.description) {
      const descriptionY = yPosition + imgHeight + 10
      if (descriptionY < pageHeight - margin) {
        pdf.setFontSize(10)
        pdf.text(options.description, margin, descriptionY)
      }
    }

    // Add data if requested - temporarily disabled for build compatibility
    // TODO: Fix chart type definition to include data property
    if (false && options.includeData) {
      pdf.addPage()
      pdf.setFontSize(14)
      pdf.text('Chart Data', margin, margin)
      pdf.setFontSize(10)
      pdf.text('Data export temporarily unavailable', margin, margin + 10)
    }

    // Save PDF
    pdf.save(fileName)
  }

  // Quick export (default options)
  const handleQuickExport = () => {
    handleExport(exportOptions)
  }

  return (
    <div className={cn('relative', className)}>
      {/* Main export button */}
      <div className="flex">
        <button
          onClick={handleQuickExport}
          disabled={disabled || isExporting}
          className={cn(
            'flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-l-md border transition-all',
            'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
            'bg-white text-gray-700 border-gray-300',
            (disabled || isExporting) && 'opacity-50 cursor-not-allowed'
          )}
          title={`Export as ${exportOptions.format.toUpperCase()}`}
        >
          {isExporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : exportOptions.format === 'png' ? (
            <FileImage size={16} />
          ) : (
            <FileText size={16} />
          )}
          <span>Export</span>
        </button>

        {/* Options dropdown button */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          disabled={disabled || isExporting}
          className={cn(
            'px-2 py-2 border-l-0 border border-gray-300 rounded-r-md bg-white hover:bg-gray-50 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
            (disabled || isExporting) && 'opacity-50 cursor-not-allowed'
          )}
          title="Export options"
        >
          <Download size={14} />
        </button>
      </div>

      {/* Export options panel */}
      {showOptions && (
        <div className="absolute top-full right-0 z-10 mt-2 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-900">
              Export Options
            </div>

            {/* Format selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Format
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    setExportOptions(prev => ({ ...prev, format: 'png' }))
                  }
                  className={cn(
                    'flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm border rounded-md transition-all',
                    exportOptions.format === 'png'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <FileImage size={16} />
                  <span>PNG</span>
                </button>
                <button
                  onClick={() =>
                    setExportOptions(prev => ({ ...prev, format: 'pdf' }))
                  }
                  className={cn(
                    'flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm border rounded-md transition-all',
                    exportOptions.format === 'pdf'
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <FileText size={16} />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Quality options */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.highResolution}
                  onChange={e =>
                    setExportOptions(prev => ({
                      ...prev,
                      highResolution: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">High resolution</span>
              </label>
            </div>

            {/* PDF-specific options */}
            {exportOptions.format === 'pdf' && (
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeData}
                    onChange={e =>
                      setExportOptions(prev => ({
                        ...prev,
                        includeData: e.target.checked,
                      }))
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Include data table
                  </span>
                </label>
              </div>
            )}

            {/* Custom filename */}
            <div>
              <label
                htmlFor="export-filename"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Filename (optional)
              </label>
              <input
                id="export-filename"
                type="text"
                placeholder={generateExportFilename(
                  chartType,
                  timeRange,
                  exportOptions.format
                )}
                value={exportOptions.fileName || ''}
                onChange={e =>
                  setExportOptions(prev => ({
                    ...prev,
                    fileName: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                onClick={() => setShowOptions(false)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExport(exportOptions)}
                disabled={isExporting}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
