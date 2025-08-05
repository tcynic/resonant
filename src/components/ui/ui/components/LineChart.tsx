'use client'
/*
 * Documentation:
 * Line Chart — https://app.subframe.com/15c374db6b3f/library?component=Line+Chart_22944dd2-3cdd-42fd-913a-1b11a3c1d16d
 */

import React from 'react'
import * as SubframeUtils from '../utils'
import * as SubframeCore from '@subframe/core'

interface LineChartRootProps
  extends React.ComponentProps<typeof SubframeCore.LineChart> {
  className?: string
}

const LineChartRoot = React.forwardRef<
  React.ElementRef<typeof SubframeCore.LineChart>,
  LineChartRootProps
>(function LineChartRoot(
  { className, ...otherProps }: LineChartRootProps,
  ref
) {
  return (
    <SubframeCore.LineChart
      className={SubframeUtils.twClassNames('h-80 w-full', className)}
      ref={ref}
      colors={[
        '#4a6b5d',
        '#c1d4c9',
        '#3e5a4e',
        '#9bbda7',
        '#334a40',
        '#739485',
      ]}
      {...otherProps}
    />
  )
})

export const LineChart = LineChartRoot
