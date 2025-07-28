/**
 * Queue Configuration and Constants
 * Centralized configuration for the AI analysis queue system
 */

export const QUEUE_CONFIG = {
  // Queue Size Limits
  MAX_QUEUE_SIZE: 1000,
  MAX_CONCURRENT_PROCESSING: 10,
  NEAR_CAPACITY_THRESHOLD: 0.8, // 80% of max capacity

  // Priority-based Delays (milliseconds)
  PRIORITY_DELAYS: {
    urgent: 0, // Process immediately
    high: 1000, // 1 second delay
    normal: 5000, // 5 second delay
  } as const,

  // Retry Configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BACKOFF_BASE: 2, // Exponential backoff base
  MAX_RETRY_DELAY: 60000, // 60 seconds maximum delay

  // Queue Maintenance
  MAX_ITEM_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
  MAINTENANCE_INTERVAL_MS: 60 * 60 * 1000, // 1 hour

  // Processing Timeouts
  DEFAULT_PROCESSING_TIMEOUT: 30000, // 30 seconds
  ESTIMATED_PROCESSING_TIME: 30000, // 30 seconds average

  // Monitoring Thresholds
  HIGH_WAIT_TIME_THRESHOLD: 120000, // 2 minutes
  CRITICAL_WAIT_TIME_THRESHOLD: 300000, // 5 minutes

  // Queue Position Management
  POSITION_UPDATE_BATCH_SIZE: 50,
} as const

export type QueuePriority = 'normal' | 'high' | 'urgent'
export type QueueStatus = 'processing' | 'completed' | 'failed'

/**
 * Priority level definitions with numeric values for sorting and comparison
 */
export const PRIORITY_LEVELS = {
  normal: 1, // Standard processing for regular users
  high: 2, // Elevated processing for active users, premium features, retries
  urgent: 3, // Immediate processing for crisis detection, health alerts
} as const

/**
 * Detailed priority criteria and service level agreements
 */
export const PRIORITY_CRITERIA = {
  urgent: {
    value: 3,
    delay: 0, // Process immediately
    description: 'Critical processing requiring immediate attention',
    userTiers: ['premium'],
    conditions: [
      'Crisis detection or mental health alerts',
      'Premium user health score alerts',
      'Premium user first daily entry',
      'System-critical processing',
    ],
    slaTarget: 30000, // 30 seconds processing target
    maxWaitTime: 60000, // 1 minute maximum wait
  },
  high: {
    value: 2,
    delay: 1000, // 1 second delay
    description: 'Elevated priority with minimal processing delay',
    userTiers: ['premium', 'free'],
    conditions: [
      'Multiple retry attempts (2+)',
      'Recent active users (within 24 hours)',
      'Relationship-specific entries',
      'Premium user requests',
      'Aging normal priority requests',
    ],
    slaTarget: 120000, // 2 minutes processing target
    maxWaitTime: 300000, // 5 minutes maximum wait
  },
  normal: {
    value: 1,
    delay: 5000, // 5 seconds delay
    description: 'Standard processing queue for regular requests',
    userTiers: ['free'],
    conditions: [
      'Free tier users',
      'Non-critical entries',
      'Batch processing',
      'Background analysis',
    ],
    slaTarget: 600000, // 10 minutes processing target
    maxWaitTime: 1800000, // 30 minutes maximum wait
  },
} as const

/**
 * Advanced retry configuration with circuit breaker awareness
 */
export const RETRY_CONFIG = {
  // Base retry settings
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BACKOFF_BASE: 2, // Exponential base (2^attempt * 1000ms)
  MAX_RETRY_DELAY: 300000, // Maximum 5 minutes delay
  JITTER_MAX_MS: 1000, // Random jitter up to 1 second

  // Circuit breaker aware retry settings
  SERVICE_ERROR_BACKOFF_MULTIPLIER: 2, // Double delay for service errors
  CLIENT_ERROR_BACKOFF_MULTIPLIER: 1, // Normal delay for client errors

  // Priority-based retry limits
  PRIORITY_RETRY_LIMITS: {
    urgent: 5, // More retries for urgent items
    high: 4, // Standard retries for high priority
    normal: 3, // Standard retries for normal priority
  },

  // Error type specific retry behavior
  ERROR_TYPE_CONFIG: {
    timeout: {
      maxRetries: 5,
      backoffMultiplier: 1.5,
      upgradeAfterAttempts: 2,
    },
    network: {
      maxRetries: 4,
      backoffMultiplier: 2,
      upgradeAfterAttempts: 1,
    },
    rate_limit: {
      maxRetries: 3,
      backoffMultiplier: 3,
      upgradeAfterAttempts: 1,
    },
    service_error: {
      maxRetries: 4,
      backoffMultiplier: 2,
      upgradeAfterAttempts: 2,
    },
    validation: {
      maxRetries: 0, // Don't retry validation errors
      backoffMultiplier: 1,
      upgradeAfterAttempts: 0,
    },
  },
} as const

/**
 * Queue Health Status Levels
 */
export const QUEUE_HEALTH_LEVELS = {
  HEALTHY: {
    capacityThreshold: 0.5, // Below 50% capacity
    waitTimeThreshold: 60000, // Under 1 minute
    status: 'healthy',
    color: 'green',
  },
  WARNING: {
    capacityThreshold: 0.8, // 50-80% capacity
    waitTimeThreshold: 120000, // 1-2 minutes
    status: 'warning',
    color: 'yellow',
  },
  CRITICAL: {
    capacityThreshold: 0.95, // 80-95% capacity
    waitTimeThreshold: 300000, // 2-5 minutes
    status: 'critical',
    color: 'orange',
  },
  OVERLOADED: {
    capacityThreshold: 1.0, // Above 95% capacity
    waitTimeThreshold: Infinity, // Over 5 minutes
    status: 'overloaded',
    color: 'red',
  },
} as const

/**
 * Error Classification for Queue Management
 */
export const ERROR_TYPES = {
  TRANSIENT: {
    description: 'Temporary failures that should be retried',
    patterns: [
      'network_timeout',
      'api_rate_limit',
      'temporary_service_unavailable',
    ],
    action: 'requeue',
  },
  PERMANENT: {
    description: 'Permanent failures that should not be retried',
    patterns: ['invalid_api_key', 'malformed_request', 'quota_exceeded'],
    action: 'dead_letter_queue',
  },
  CAPACITY: {
    description: 'System capacity issues',
    patterns: ['queue_full', 'system_overload', 'resource_exhaustion'],
    action: 'backpressure',
  },
} as const
