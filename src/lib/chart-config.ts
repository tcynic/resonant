/**
 * Chart configuration utilities for dashboard visualizations
 * Centralized configuration for consistent chart appearance and behavior
 */

// Color palette for different relationships in charts
export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
] as const

export type ChartColor = (typeof CHART_COLORS)[number]

// Time period configuration
export type TimePeriod = 'week' | 'month' | 'quarter'

export interface TimeRangeConfig {
  days: number
  label: string
  granularity: 'day' | 'week' | 'month'
}

export const TIME_PERIOD_CONFIG: Record<TimePeriod, TimeRangeConfig> = {
  week: {
    days: 7,
    label: '7D',
    granularity: 'day',
  },
  month: {
    days: 30,
    label: '30D',
    granularity: 'week',
  },
  quarter: {
    days: 90,
    label: '90D',
    granularity: 'week',
  },
}

// Chart appearance configuration
export interface ChartTheme {
  colors: {
    grid: string
    axis: string
    text: string
    background: string
  }
  fontSize: {
    small: number
    medium: number
    large: number
  }
  spacing: {
    margin: {
      top: number
      right: number
      bottom: number
      left: number
    }
  }
}

export const DEFAULT_CHART_THEME: ChartTheme = {
  colors: {
    grid: '#f0f0f0',
    axis: '#e5e7eb',
    text: '#374151',
    background: '#ffffff',
  },
  fontSize: {
    small: 10,
    medium: 12,
    large: 14,
  },
  spacing: {
    margin: {
      top: 5,
      right: 30,
      bottom: 5,
      left: 20,
    },
  },
}

// Trend chart specific configuration
export interface TrendChartConfig {
  height: number
  strokeWidth: number
  dotRadius: number
  activeDotRadius: number
  animationDuration: number
  yAxisDomain: [number, number]
  showLegend: boolean
  showTooltip: boolean
}

export const DEFAULT_TREND_CHART_CONFIG: TrendChartConfig = {
  height: 300,
  strokeWidth: 2,
  dotRadius: 4,
  activeDotRadius: 6,
  animationDuration: 300,
  yAxisDomain: [0, 100],
  showLegend: true,
  showTooltip: true,
}

// Health score chart configuration
export interface HealthScoreChartConfig {
  size: number
  strokeWidth: number
  colors: {
    excellent: string
    good: string
    fair: string
    poor: string
    background: string
  }
}

export const DEFAULT_HEALTH_SCORE_CHART_CONFIG: HealthScoreChartConfig = {
  size: 120,
  strokeWidth: 8,
  colors: {
    excellent: '#10B981', // Green for 80+
    good: '#3B82F6', // Blue for 60-79
    fair: '#F59E0B', // Yellow for 40-59
    poor: '#EF4444', // Red for <40
    background: '#F3F4F6', // Light gray
  },
}

// Utility functions
export function getChartColor(index: number): ChartColor {
  return CHART_COLORS[index % CHART_COLORS.length]
}

export function getHealthScoreColor(score: number): string {
  const config = DEFAULT_HEALTH_SCORE_CHART_CONFIG.colors
  if (score >= 80) return config.excellent
  if (score >= 60) return config.good
  if (score >= 40) return config.fair
  return config.poor
}

export function formatChartDate(
  dateString: string,
  granularity: 'day' | 'week' | 'month'
): string {
  const date = new Date(dateString)

  switch (granularity) {
    case 'day':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    case 'week':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    case 'month':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      })
    default:
      return date.toLocaleDateString('en-US', { month: 'short' })
  }
}

export function calculateChartDimensions(
  containerWidth: number,
  aspectRatio = 16 / 9
): {
  width: number
  height: number
} {
  const width = Math.min(containerWidth, 800) // Max width
  const height = Math.round(width / aspectRatio)

  return {
    width: Math.max(width, 300), // Min width
    height: Math.max(height, 200), // Min height
  }
}

// Responsive breakpoints for charts
export const CHART_BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
} as const

export function getResponsiveChartConfig(width: number) {
  if (width < CHART_BREAKPOINTS.mobile) {
    return {
      height: 200,
      fontSize: DEFAULT_CHART_THEME.fontSize.small,
      margin: { top: 5, right: 10, bottom: 5, left: 10 },
    }
  }

  if (width < CHART_BREAKPOINTS.tablet) {
    return {
      height: 250,
      fontSize: DEFAULT_CHART_THEME.fontSize.medium,
      margin: DEFAULT_CHART_THEME.spacing.margin,
    }
  }

  return {
    height: DEFAULT_TREND_CHART_CONFIG.height,
    fontSize: DEFAULT_CHART_THEME.fontSize.medium,
    margin: DEFAULT_CHART_THEME.spacing.margin,
  }
}

// Animation configurations
export const CHART_ANIMATIONS = {
  fadeIn: {
    duration: 300,
    easing: 'ease-in-out',
  },
  slideUp: {
    duration: 400,
    easing: 'ease-out',
  },
  bounce: {
    duration: 600,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const

// Tooltip configuration
export interface TooltipConfig {
  backgroundColor: string
  borderColor: string
  borderRadius: number
  padding: string
  fontSize: number
  fontColor: string
  maxWidth: number
}

export const DEFAULT_TOOLTIP_CONFIG: TooltipConfig = {
  backgroundColor: '#ffffff',
  borderColor: '#e5e7eb',
  borderRadius: 8,
  padding: '12px',
  fontSize: 12,
  fontColor: '#374151',
  maxWidth: 200,
}

// Chart accessibility configuration
export interface AccessibilityConfig {
  ariaLabel: string
  ariaDescription: string
  keyboardNavigation: boolean
  colorBlindFriendly: boolean
}

export function generateAccessibilityConfig(
  chartType: 'trend' | 'health-score' | 'activity',
  dataDescription: string
): AccessibilityConfig {
  return {
    ariaLabel: `${chartType} chart showing ${dataDescription}`,
    ariaDescription: `Interactive ${chartType} chart with keyboard navigation support`,
    keyboardNavigation: true,
    colorBlindFriendly: true,
  }
}

// Performance optimization settings
export const CHART_PERFORMANCE = {
  maxDataPoints: 100, // Limit data points for performance
  updateThrottle: 250, // Throttle updates (ms)
  renderThrottle: 16, // Throttle renders to ~60fps
  enableVirtualization: true, // Enable for large datasets
} as const
