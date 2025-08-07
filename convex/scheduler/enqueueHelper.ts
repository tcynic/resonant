// @ts-nocheck
import { internal } from '../_generated/api'

type Ctx = {
  scheduler: {
    runAfter: (ms: number, fn: any, payload: any) => Promise<void>
  }
}

export async function enqueueAnalysis(
  ctx: Ctx,
  payload: {
    entryId: string
    userId: string
    priority: 'normal' | 'high' | 'urgent'
  }
) {
  await ctx.scheduler.runAfter(
    100,
    internal.scheduler.analysis_queue.enqueueAnalysis,
    payload
  )
}
