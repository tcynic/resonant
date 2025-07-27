'use client'

import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react'
import {
  Chart as ChartJS,
  ChartConfiguration,
  ChartType,
  ChartEvent,
  ActiveElement,
} from 'chart.js'
import { cn } from '@/lib/utils'

/**
 * Base chart props interface
 */
export interface BaseChartProps {
  type: ChartType
  data: ChartJS['data']
  options?: Partial<ChartJS['options']>
  className?: string
  height?: number
  width?: number
  onDataPointClick?: (
    datasetIndex: number,
    pointIndex: number,
    value: unknown
  ) => void
  onChartReady?: (chart: ChartJS) => void
  'aria-label'?: string
}

/**
 * Chart instance methods exposed via ref
 */
export interface ChartHandle {
  getChart: () => ChartJS | null
  updateChart: (
    data?: ChartJS['data'],
    options?: Partial<ChartJS['options']>
  ) => void
  destroyChart: () => void
  exportChart: (format: 'png' | 'jpeg') => string | null
}

/**
 * Base Chart Component
 *
 * Provides a foundation for all chart types with:
 * - Responsive canvas setup
 * - Error boundary handling
 * - Loading states
 * - Accessibility support
 * - Export functionality
 */
export const BaseChart = forwardRef<ChartHandle, BaseChartProps>(
  (
    {
      type,
      data,
      options = {},
      className,
      height = 400,
      width,
      onDataPointClick,
      onChartReady,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const chartRef = useRef<ChartJS | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Expose chart methods via ref
    useImperativeHandle(ref, () => ({
      getChart: () => chartRef.current,
      updateChart: (
        newData?: ChartJS['data'],
        newOptions?: Partial<ChartJS['options']>
      ) => {
        if (chartRef.current) {
          if (newData) {
            chartRef.current.data = newData
          }
          if (newOptions) {
            chartRef.current.options = {
              ...chartRef.current.options,
              ...newOptions,
            }
          }
          chartRef.current.update('resize')
        }
      },
      destroyChart: () => {
        if (chartRef.current) {
          chartRef.current.destroy()
          chartRef.current = null
        }
      },
      exportChart: (format: 'png' | 'jpeg') => {
        if (chartRef.current && canvasRef.current) {
          return canvasRef.current.toDataURL(`image/${format}`, 1.0)
        }
        return null
      },
    }))

    // Initialize chart
    useEffect(() => {
      if (!canvasRef.current || !data) return

      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.destroy()
      }

      // Merge default options with provided options
      const chartOptions = {
        ...options,
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event: ChartEvent, elements: ActiveElement[]) => {
          if (elements.length > 0 && onDataPointClick) {
            const element = elements[0]
            const datasetIndex = element.datasetIndex
            const pointIndex = element.index
            const value = data.datasets[datasetIndex]?.data[pointIndex]
            onDataPointClick(datasetIndex, pointIndex, value)
          }
          // Call original onClick if provided
          if (options.onClick) {
            options.onClick(event, elements, chartRef.current!)
          }
        },
      }

      // Create chart configuration
      const config: ChartConfiguration = {
        type,
        data,
        options: chartOptions,
      }

      try {
        // Create new chart instance
        chartRef.current = new ChartJS(canvasRef.current, config)

        // Notify parent component that chart is ready
        if (onChartReady) {
          onChartReady(chartRef.current)
        }
      } catch (error) {
        console.error('Failed to create chart:', error)
      }

      // Cleanup function
      return () => {
        if (chartRef.current) {
          chartRef.current.destroy()
          chartRef.current = null
        }
      }
    }, [type, data, options, onDataPointClick, onChartReady])

    // Handle resize
    useEffect(() => {
      const handleResize = () => {
        if (chartRef.current) {
          chartRef.current.resize()
        }
      }

      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Validate data
    if (!data || !data.datasets || data.datasets.length === 0) {
      return (
        <div
          className={cn(
            'flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200',
            className
          )}
          style={{ height, width }}
          role="img"
          aria-label={ariaLabel || 'Empty chart'}
        >
          <div className="text-center text-gray-500">
            <div className="text-sm font-medium mb-1">No data available</div>
            <div className="text-xs">
              Chart will display when data is loaded
            </div>
          </div>
        </div>
      )
    }

    return (
      <div
        ref={containerRef}
        className={cn('relative', className)}
        style={{ height, width }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel || `${type} chart`}
          className="max-w-full max-h-full"
        />
      </div>
    )
  }
)

BaseChart.displayName = 'BaseChart'

/**
 * Chart loading skeleton component
 */
export function ChartSkeleton({
  height = 400,
  className,
}: {
  height?: number
  className?: string
}) {
  return (
    <div
      className={cn('animate-pulse bg-gray-200 rounded-lg', className)}
      style={{ height }}
      role="img"
      aria-label="Loading chart..."
    >
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 text-sm">Loading chart...</div>
      </div>
    </div>
  )
}

/**
 * Chart error boundary component
 */
export function ChartError({
  error,
  retry,
  height = 400,
  className,
}: {
  error: string
  retry?: () => void
  height?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-lg',
        className
      )}
      style={{ height }}
      role="alert"
      aria-label="Chart error"
    >
      <div className="text-center text-red-600 p-4">
        <div className="text-sm font-medium mb-2">Failed to load chart</div>
        <div className="text-xs mb-3">{error}</div>
        {retry && (
          <button
            onClick={retry}
            className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 rounded border border-red-300 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
