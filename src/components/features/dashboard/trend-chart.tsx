'use client'

import React, { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { TrendDataPoint } from '@/lib/types'
import {
  getChartColor,
  formatChartDate,
  TIME_PERIOD_CONFIG,
  DEFAULT_TREND_CHART_CONFIG,
  DEFAULT_CHART_THEME,
  type TimePeriod,
} from '@/lib/chart-config'

interface TrendChartProps {
  data: TrendDataPoint[]
  relationshipNames: string[]
  timeRange: {
    start: number
    end: number
    granularity: 'day' | 'week' | 'month'
  }
  className?: string
  height?: number
}

interface TimePeriodSelectorProps {
  selected: TimePeriod
  onChange: (period: TimePeriod) => void
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    name: string
    color: string
    dataKey: string
  }>
  label?: string
}

function TimePeriodSelector({ selected, onChange }: TimePeriodSelectorProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      {(Object.keys(TIME_PERIOD_CONFIG) as TimePeriod[]).map(period => (
        <button
          key={period}
          onClick={() => onChange(period)}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            selected === period
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {TIME_PERIOD_CONFIG[period].label}
        </button>
      ))}
    </div>
  )
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  return (
    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
      <p className="text-sm font-medium text-gray-900 mb-2">
        {formatChartDate(label || '', 'day')}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.name}:</span>
            <span className="text-sm font-semibold text-gray-900">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TrendChart({
  data,
  relationshipNames,
  timeRange,
  className = '',
  height = DEFAULT_TREND_CHART_CONFIG.height,
}: TrendChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month')
  const [hiddenRelationships, setHiddenRelationships] = useState<Set<string>>(
    new Set()
  )

  const formatXAxisLabel = (tickItem: string | undefined) => {
    if (!tickItem) return ''
    return formatChartDate(tickItem, timeRange.granularity)
  }

  const toggleRelationshipVisibility = (relationshipName: string) => {
    const newHidden = new Set(hiddenRelationships)
    if (newHidden.has(relationshipName)) {
      newHidden.delete(relationshipName)
    } else {
      newHidden.add(relationshipName)
    }
    setHiddenRelationships(newHidden)
  }

  const getGranularityLabel = () => {
    switch (timeRange.granularity) {
      case 'day':
        return 'Daily'
      case 'week':
        return 'Weekly'
      case 'month':
        return 'Monthly'
      default:
        return 'Trend'
    }
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className} padding="md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Health Score Trends
            </h3>
            <TimePeriodSelector
              selected={selectedPeriod}
              onChange={setSelectedPeriod}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center bg-gray-50 rounded-lg"
            style={{ height }}
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-2xl text-gray-400">📈</span>
              </div>
              <p className="text-gray-500 text-sm">No trend data available</p>
              <p className="text-xs text-gray-400 mt-1">
                Journal entries needed to generate trends
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className} padding="md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {getGranularityLabel()} Health Score Trends
            </h3>
            <p className="text-sm text-gray-500">
              Tracking{' '}
              {
                relationshipNames.filter(name => !hiddenRelationships.has(name))
                  .length
              }{' '}
              relationships
            </p>
          </div>
          <TimePeriodSelector
            selected={selectedPeriod}
            onChange={setSelectedPeriod}
          />
        </div>
      </CardHeader>

      <CardContent>
        {/* Chart */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={DEFAULT_CHART_THEME.spacing.margin}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={DEFAULT_CHART_THEME.colors.grid}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxisLabel}
                tick={{ fontSize: DEFAULT_CHART_THEME.fontSize.medium }}
                tickLine={{ stroke: DEFAULT_CHART_THEME.colors.axis }}
                axisLine={{ stroke: DEFAULT_CHART_THEME.colors.axis }}
              />
              <YAxis
                domain={DEFAULT_TREND_CHART_CONFIG.yAxisDomain}
                tick={{ fontSize: DEFAULT_CHART_THEME.fontSize.medium }}
                tickLine={{ stroke: DEFAULT_CHART_THEME.colors.axis }}
                axisLine={{ stroke: DEFAULT_CHART_THEME.colors.axis }}
                label={{
                  value: 'Health Score',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' },
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                onClick={(e: { value?: string }) =>
                  toggleRelationshipVisibility(e.value || '')
                }
                iconType="line"
              />

              {relationshipNames.map((name, index) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={getChartColor(index)}
                  strokeWidth={DEFAULT_TREND_CHART_CONFIG.strokeWidth}
                  dot={{
                    r: DEFAULT_TREND_CHART_CONFIG.dotRadius,
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: DEFAULT_TREND_CHART_CONFIG.activeDotRadius,
                    strokeWidth: 0,
                  }}
                  connectNulls={false}
                  hide={hiddenRelationships.has(name)}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with toggle functionality */}
        {relationshipNames.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-2">
              {relationshipNames.map((name, index) => (
                <button
                  key={name}
                  onClick={() => toggleRelationshipVisibility(name)}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    hiddenRelationships.has(name)
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      hiddenRelationships.has(name) ? 'bg-gray-300' : ''
                    }`}
                    style={{
                      backgroundColor: hiddenRelationships.has(name)
                        ? undefined
                        : getChartColor(index),
                    }}
                  />
                  <span>{name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chart Statistics */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.length}</p>
              <p className="text-xs text-gray-500">Data Points</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {relationshipNames.length}
              </p>
              <p className="text-xs text-gray-500">Relationships</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(
                  (timeRange.end - timeRange.start) / (24 * 60 * 60 * 1000)
                )}
              </p>
              <p className="text-xs text-gray-500">Days Tracked</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
