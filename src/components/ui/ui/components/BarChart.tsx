'use client'
/*
 * Documentation:
 * Bar Chart — https://app.subframe.com/15c374db6b3f/library?component=Bar+Chart_4d4f30e7-1869-4980-8b96-617df3b37912
 */

import React from 'react'
import * as SubframeUtils from '../utils'
import * as SubframeCore from '@subframe/core'

interface BarChartRootProps
  extends React.ComponentProps<typeof SubframeCore.BarChart> {
  stacked?: boolean
  className?: string
}

const BarChartRoot = React.forwardRef<
  React.ElementRef<typeof SubframeCore.BarChart>,
  BarChartRootProps
>(function BarChartRoot(
  { stacked = false, className, ...otherProps }: BarChartRootProps,
  ref
) {
  return (
    <SubframeCore.BarChart
      className={SubframeUtils.twClassNames('h-80 w-full', className)}
      ref={ref}
      stacked={stacked}
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

export const BarChart = BarChartRoot
