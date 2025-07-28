import { QueuePriority } from '../scheduler/queue-config'

/**
 * Queue item interface for utility functions
 */
export interface QueueItem {
  _id: string
  entryId: string
  userId: string
  priority?: QueuePriority
  queuedAt?: number
  queuePosition?: number
  processingStartedAt?: number
  status: 'processing' | 'completed' | 'failed'
  createdAt: number
}

/**
 * Calculate queue position based on priority and queue time
 */
export function calculateQueuePosition(
  items: QueueItem[],
  newItemPriority: QueuePriority,
  newItemQueuedAt: number
): number {
  // Sort items by priority (urgent > high > normal) then by queue time
  const sortedItems = items
    .filter(item => item.status === 'processing' && !item.processingStartedAt)
    .sort((a, b) => {
      const aPriority = getPriorityWeight(a.priority || 'normal')
      const bPriority = getPriorityWeight(b.priority || 'normal')

      if (aPriority !== bPriority) {
        return bPriority - aPriority // Higher priority first
      }

      // Same priority, sort by queue time (earlier first)
      return (a.queuedAt || a.createdAt) - (b.queuedAt || b.createdAt)
    })

  // Find position where new item should be inserted
  const newItemWeight = getPriorityWeight(newItemPriority)

  for (let i = 0; i < sortedItems.length; i++) {
    const itemWeight = getPriorityWeight(sortedItems[i].priority || 'normal')
    const itemQueuedAt = sortedItems[i].queuedAt || sortedItems[i].createdAt

    if (
      newItemWeight > itemWeight ||
      (newItemWeight === itemWeight && newItemQueuedAt < itemQueuedAt)
    ) {
      return i + 1
    }
  }

  return sortedItems.length + 1
}

/**
 * Get priority weight for sorting (higher = more important)
 */
function getPriorityWeight(priority: QueuePriority): number {
  const weights = {
    urgent: 3,
    high: 2,
    normal: 1,
  }
  return weights[priority]
}

/**
 * Update queue positions for all items after changes
 */
export function updateQueuePositions(items: QueueItem[]): Partial<QueueItem>[] {
  const processingItems = items
    .filter(item => item.status === 'processing' && !item.processingStartedAt)
    .sort((a, b) => {
      const aPriority = getPriorityWeight(a.priority || 'normal')
      const bPriority = getPriorityWeight(b.priority || 'normal')

      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }

      return (a.queuedAt || a.createdAt) - (b.queuedAt || b.createdAt)
    })

  return processingItems.map((item, index) => ({
    _id: item._id,
    queuePosition: index + 1,
  }))
}

/**
 * Calculate estimated completion time
 */
export function calculateEstimatedCompletion(
  queuePosition: number,
  averageProcessingTime: number = 30000, // 30 seconds default
  currentTime: number = Date.now()
): number {
  const estimatedWaitTime = (queuePosition - 1) * averageProcessingTime
  return currentTime + estimatedWaitTime
}

/**
 * Determine if queue is approaching capacity
 */
export function isQueueNearCapacity(
  currentSize: number,
  maxCapacity: number,
  threshold: number = 0.8
): boolean {
  return currentSize >= maxCapacity * threshold
}

/**
 * Calculate queue health status
 */
export function calculateQueueHealth(
  currentSize: number,
  maxCapacity: number,
  averageWaitTime: number,
  oldestItemAge: number
): {
  status: 'healthy' | 'warning' | 'critical' | 'overloaded'
  score: number
  issues: string[]
} {
  const issues: string[] = []
  let score = 100

  // Capacity utilization impact
  const capacityUtilization = currentSize / maxCapacity
  if (capacityUtilization > 0.95) {
    issues.push('Queue near maximum capacity')
    score -= 40
  } else if (capacityUtilization > 0.8) {
    issues.push('Queue approaching capacity')
    score -= 20
  } else if (capacityUtilization > 0.5) {
    score -= 10
  }

  // Average wait time impact
  if (averageWaitTime > 300000) {
    // 5 minutes
    issues.push('High average wait time')
    score -= 30
  } else if (averageWaitTime > 120000) {
    // 2 minutes
    issues.push('Elevated wait times')
    score -= 15
  }

  // Oldest item age impact
  if (oldestItemAge > 600000) {
    // 10 minutes
    issues.push('Items stuck in queue too long')
    score -= 25
  } else if (oldestItemAge > 300000) {
    // 5 minutes
    issues.push('Some items waiting longer than expected')
    score -= 10
  }

  // Determine status based on score
  let status: 'healthy' | 'warning' | 'critical' | 'overloaded'
  if (score >= 80) {
    status = 'healthy'
  } else if (score >= 60) {
    status = 'warning'
  } else if (score >= 30) {
    status = 'critical'
  } else {
    status = 'overloaded'
  }

  return { status, score: Math.max(0, score), issues }
}

/**
 * Find items that should be expired/cleaned up
 */
export function findExpiredItems(
  items: QueueItem[],
  maxAge: number = 24 * 60 * 60 * 1000 // 24 hours
): QueueItem[] {
  const cutoffTime = Date.now() - maxAge
  return items.filter(
    item =>
      item.status === 'processing' &&
      (item.queuedAt || item.createdAt) < cutoffTime
  )
}

/**
 * Detect orphaned items (stuck in processing without progress)
 */
export function findOrphanedItems(
  items: QueueItem[],
  maxProcessingTime: number = 300000 // 5 minutes
): QueueItem[] {
  const cutoffTime = Date.now() - maxProcessingTime
  return items.filter(
    item =>
      item.status === 'processing' &&
      item.processingStartedAt &&
      item.processingStartedAt < cutoffTime
  )
}

/**
 * Calculate throughput metrics
 */
export function calculateThroughputMetrics(
  completedItems: QueueItem[],
  timeWindowMs: number = 60 * 60 * 1000 // 1 hour
): {
  itemsPerHour: number
  averageProcessingTime: number
  successRate: number
  totalProcessed: number
} {
  const windowStart = Date.now() - timeWindowMs
  const recentItems = completedItems.filter(
    item => item.createdAt >= windowStart
  )

  const totalProcessed = recentItems.length
  const itemsPerHour = (totalProcessed / timeWindowMs) * (60 * 60 * 1000)

  const processingTimes = recentItems
    .filter(item => item.processingStartedAt && item.queuedAt)
    .map(item => item.processingStartedAt! - item.queuedAt!)

  const averageProcessingTime =
    processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) /
        processingTimes.length
      : 0

  const successfulItems = recentItems.filter(
    item => item.status === 'completed'
  )
  const successRate =
    totalProcessed > 0 ? successfulItems.length / totalProcessed : 0

  return {
    itemsPerHour,
    averageProcessingTime,
    successRate,
    totalProcessed,
  }
}

/**
 * Generate queue performance report
 */
export function generateQueueReport(
  allItems: QueueItem[],
  timeWindowMs: number = 24 * 60 * 60 * 1000 // 24 hours
): {
  queueSize: number
  processingItems: number
  completedItems: number
  failedItems: number
  averageWaitTime: number
  oldestItemAge: number
  throughputMetrics: ReturnType<typeof calculateThroughputMetrics>
  healthStatus: ReturnType<typeof calculateQueueHealth>
} {
  const processingItems = allItems.filter(item => item.status === 'processing')
  const completedItems = allItems.filter(item => item.status === 'completed')
  const failedItems = allItems.filter(item => item.status === 'failed')

  const queuedItems = processingItems.filter(item => !item.processingStartedAt)
  const averageWaitTime =
    queuedItems.length > 0
      ? queuedItems.reduce(
          (sum, item) => sum + (Date.now() - (item.queuedAt || item.createdAt)),
          0
        ) / queuedItems.length
      : 0

  const oldestItemAge =
    queuedItems.length > 0
      ? Math.max(
          ...queuedItems.map(
            item => Date.now() - (item.queuedAt || item.createdAt)
          )
        )
      : 0

  const throughputMetrics = calculateThroughputMetrics(
    [...completedItems, ...failedItems],
    timeWindowMs
  )

  const healthStatus = calculateQueueHealth(
    queuedItems.length,
    1000, // Max capacity from config
    averageWaitTime,
    oldestItemAge
  )

  return {
    queueSize: queuedItems.length,
    processingItems: processingItems.filter(item => item.processingStartedAt)
      .length,
    completedItems: completedItems.length,
    failedItems: failedItems.length,
    averageWaitTime,
    oldestItemAge,
    throughputMetrics,
    healthStatus,
  }
}
