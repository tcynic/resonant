/**
 * Chart theme configuration for Resonant
 * Matches the application's design system and Tailwind CSS colors
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
)

/**
 * Resonant color palette for charts
 */
export const chartColors = {
  // Primary colors
  primary: '#3B82F6', // Blue-500
  primaryLight: '#93C5FD', // Blue-300
  primaryDark: '#1D4ED8', // Blue-700

  // Status colors
  success: '#10B981', // Emerald-500
  successLight: '#6EE7B7', // Emerald-300
  warning: '#F59E0B', // Amber-500
  warningLight: '#FCD34D', // Amber-300
  danger: '#EF4444', // Red-500
  dangerLight: '#FCA5A5', // Red-300

  // Neutral colors
  neutral: '#6B7280', // Gray-500
  neutralLight: '#9CA3AF', // Gray-400
  neutralDark: '#374151', // Gray-700

  // Background colors
  background: 'rgba(59, 130, 246, 0.1)', // Primary with opacity
  backgroundLight: 'rgba(59, 130, 246, 0.05)',

  // Grid and border colors
  gridColor: '#E5E7EB', // Gray-200
  borderColor: '#D1D5DB', // Gray-300

  // Text colors
  textPrimary: '#111827', // Gray-900
  textSecondary: '#6B7280', // Gray-500
  textLight: '#F9FAFB', // Gray-50
}

/**
 * Relationship type colors for multi-relationship charts
 */
export const relationshipColors = [
  chartColors.primary,
  chartColors.success,
  chartColors.warning,
  chartColors.danger,
  '#8B5CF6', // Purple-500
  '#06B6D4', // Cyan-500
  '#84CC16', // Lime-500
  '#F97316', // Orange-500
]

/**
 * Health score color mapping based on score ranges
 */
export const healthScoreColors = {
  excellent: chartColors.success, // 80-100
  good: chartColors.primaryLight, // 60-79
  fair: chartColors.warning, // 40-59
  poor: chartColors.danger, // 0-39
}

/**
 * Get health score color based on score value
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 80) return healthScoreColors.excellent
  if (score >= 60) return healthScoreColors.good
  if (score >= 40) return healthScoreColors.fair
  return healthScoreColors.poor
}

/**
 * Default chart options with Resonant theme
 */
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 12,
        },
        color: chartColors.textSecondary,
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)', // Gray-900 with opacity
      titleColor: chartColors.textLight,
      bodyColor: chartColors.textLight,
      borderColor: chartColors.borderColor,
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      font: {
        family: 'Inter, system-ui, sans-serif',
      },
      displayColors: true,
      titleFont: {
        size: 13,
        weight: '600',
      },
      bodyFont: {
        size: 12,
      },
    },
  },
  scales: {
    x: {
      grid: {
        color: chartColors.gridColor,
        lineWidth: 1,
      },
      ticks: {
        color: chartColors.textSecondary,
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 11,
        },
        maxTicksLimit: 8,
      },
      border: {
        color: chartColors.borderColor,
      },
    },
    y: {
      grid: {
        color: chartColors.gridColor,
        lineWidth: 1,
      },
      ticks: {
        color: chartColors.textSecondary,
        font: {
          family: 'Inter, system-ui, sans-serif',
          size: 11,
        },
      },
      border: {
        color: chartColors.borderColor,
      },
    },
  },
  elements: {
    point: {
      radius: 4,
      hoverRadius: 6,
      borderWidth: 2,
    },
    line: {
      tension: 0.3, // Smooth curves
      borderWidth: 2,
    },
    bar: {
      borderRadius: 4,
      borderSkipped: false,
    },
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart' as const,
  },
}

/**
 * Chart options for time-based charts
 */
export const timeChartOptions = {
  ...defaultChartOptions,
  scales: {
    ...defaultChartOptions.scales,
    x: {
      ...defaultChartOptions.scales.x,
      type: 'time' as const,
      time: {
        unit: 'day' as const,
        displayFormats: {
          day: 'MMM dd',
          week: 'MMM dd',
          month: 'MMM yyyy',
        },
      },
      adapters: {
        date: {
          locale: 'en-US',
        },
      },
    },
  },
}

/**
 * Chart options for health score charts (0-100 scale)
 */
export const healthScoreChartOptions = {
  ...timeChartOptions,
  scales: {
    ...timeChartOptions.scales,
    y: {
      ...timeChartOptions.scales.y,
      min: 0,
      max: 100,
      ticks: {
        ...timeChartOptions.scales.y.ticks,
        callback: function (value: number) {
          return value + '%'
        },
      },
    },
  },
}

/**
 * Chart options for comparison charts with multiple datasets
 */
export const comparisonChartOptions = {
  ...timeChartOptions,
  plugins: {
    ...timeChartOptions.plugins,
    legend: {
      ...timeChartOptions.plugins.legend,
      position: 'bottom' as const,
      labels: {
        ...timeChartOptions.plugins.legend.labels,
        generateLabels: function (chart: ChartJS) {
          const datasets = chart.data.datasets
          return datasets.map((dataset, index) => ({
            text: dataset.label || `Dataset ${index + 1}`,
            fillStyle: dataset.backgroundColor as string,
            strokeStyle: dataset.borderColor as string,
            lineWidth: dataset.borderWidth as number,
            hidden: !chart.isDatasetVisible(index),
            datasetIndex: index,
          }))
        },
      },
    },
  },
}

/**
 * Export chart configurations
 */
export const chartConfigs = {
  default: defaultChartOptions,
  time: timeChartOptions,
  healthScore: healthScoreChartOptions,
  comparison: comparisonChartOptions,
}
