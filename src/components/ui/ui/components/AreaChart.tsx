'use client'
/*
 * Documentation:
 * Area Chart — https://app.subframe.com/15c374db6b3f/library?component=Area+Chart_8aa1e7b3-5db6-4a62-aa49-137ced21a231
 */

import React from 'react'
import * as SubframeUtils from '../utils'
import * as SubframeCore from '@subframe/core'

interface AreaChartRootProps
  extends React.ComponentProps<typeof SubframeCore.AreaChart> {
  stacked?: boolean
  className?: string
}

const AreaChartRoot = React.forwardRef<
  React.ElementRef<typeof SubframeCore.AreaChart>,
  AreaChartRootProps
>(function AreaChartRoot(
  { stacked = false, className, ...otherProps }: AreaChartRootProps,
  ref
) {
  return (
    <SubframeCore.AreaChart
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

export const AreaChart = AreaChartRoot
