import { mutation, action } from './_generated/server'
import { v } from 'convex/values'
import { Id } from './_generated/dataModel'
import { internal } from './_generated/api'

// Re-queue analysis with priority upgrade
export const requeueAnalysis = mutation({
  args: {
    analysisId: v.id('aiAnalysis'),
    priority: v.optional(
      v.union(v.literal('normal'), v.literal('high'), v.literal('urgent'))
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId)
    if (!analysis) {
      throw new Error('Analysis not found')
    }

    // Update the analysis record with new priority and reset status
    await ctx.db.patch(args.analysisId, {
      status: 'processing',
      priority: args.priority || 'high', // Default to high priority on retry
      processingAttempts: (analysis.processingAttempts || 0) + 1,
      queuedAt: Date.now(),
      lastErrorMessage: undefined, // Clear previous error
      processingStartedAt: undefined, // Reset processing start time
    })

    // Schedule direct processing for analysis
    await ctx.scheduler.runAfter(
      0,
      internal.aiAnalysis.processAnalysisDirectly,
      {
        entryId: analysis.entryId,
        userId: analysis.userId,
        priority: args.priority || 'high',
      }
    )

    return {
      status: 'requeued',
      analysisId: args.analysisId,
      newPriority: args.priority || 'high',
      attempt: (analysis.processingAttempts || 0) + 1,
    }
  },
})

// Cancel queued analysis
export const cancelAnalysis = mutation({
  args: {
    analysisId: v.id('aiAnalysis'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const analysis = await ctx.db.get(args.analysisId)
    if (!analysis) {
      throw new Error('Analysis not found')
    }

    // Only allow cancellation of processing items
    if (analysis.status !== 'processing') {
      throw new Error(`Cannot cancel analysis with status: ${analysis.status}`)
    }

    await ctx.db.patch(args.analysisId, {
      status: 'failed',
      lastErrorMessage: `Cancelled by user: ${args.reason || 'No reason provided'}`,
    })

    return {
      status: 'cancelled',
      analysisId: args.analysisId,
    }
  },
})

// Bulk retry failed analyses
export const retryFailedAnalyses = mutation({
  args: {
    userId: v.id('users'),
    maxRetries: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxRetries = args.maxRetries || 3

    const failedAnalyses = await ctx.db
      .query('aiAnalysis')
      .withIndex('by_user_status', q =>
        q.eq('userId', args.userId).eq('status', 'failed')
      )
      .filter(q => q.lt(q.field('processingAttempts'), maxRetries))
      .take(10) // Limit to 10 at a time to prevent overload

    const requeued: any[] = []
    for (const analysis of failedAnalyses) {
      try {
        // Update the analysis record with new priority and reset status
        await ctx.db.patch(analysis._id, {
          status: 'processing',
          priority: 'high',
          processingAttempts: (analysis.processingAttempts || 0) + 1,
          queuedAt: Date.now(),
          lastErrorMessage: undefined,
          processingStartedAt: undefined,
        })

        // Schedule the HTTP Action for analysis
        await ctx.scheduler.runAfter(
          0,
          internal.aiAnalysis.processAnalysisDirectly,
          {
            entryId: analysis.entryId,
            userId: analysis.userId,
            priority: 'high',
          }
        )

        const result = {
          status: 'requeued',
          analysisId: analysis._id,
          newPriority: 'high',
          attempt: (analysis.processingAttempts || 0) + 1,
        }
        requeued.push(result)
      } catch (error) {
        console.error(`Failed to requeue analysis ${analysis._id}:`, error)
      }
    }

    return {
      totalFound: failedAnalyses.length,
      requeued: requeued.length,
      results: requeued,
    }
  },
})

// Get queue statistics
export const getQueueStats = mutation({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, args) => {
    const query = args.userId
      ? ctx.db
          .query('aiAnalysis')
          .withIndex('by_user_status', q =>
            q.eq('userId', args.userId!).eq('status', 'processing')
          )
      : ctx.db
          .query('aiAnalysis')
          .withIndex('by_status', q => q.eq('status', 'processing'))

    const queuedItems = await query.collect()

    const stats = {
      totalQueued: queuedItems.length,
      averageWaitTime: 0,
      oldestQueueTime: 0,
      priorityBreakdown: {
        urgent: queuedItems.filter(a => a.priority === 'urgent').length,
        high: queuedItems.filter(a => a.priority === 'high').length,
        normal: queuedItems.filter(a => a.priority === 'normal' || !a.priority)
          .length,
      },
    }

    if (queuedItems.length > 0) {
      const now = Date.now()
      const waitTimes = queuedItems.map(a => now - (a.queuedAt || a.createdAt))
      stats.averageWaitTime =
        waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
      stats.oldestQueueTime = Math.max(...waitTimes)
    }

    return stats
  },
})
