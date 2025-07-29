/**
 * Failure Detection Scheduler (Story AI-Migration.6 AC-5)
 * Automated scheduling for failure pattern detection and analysis
 */

import { cronJobs } from 'convex/server'
import { internal } from '../_generated/api'

// Schedule failure detection to run every 10 minutes
// This provides a good balance between responsiveness and resource usage
const crons = cronJobs()

crons.interval(
  'failure-detection-scheduler',
  { minutes: 10 }, // Every 10 minutes
  internal.monitoring.failure_detection.detectFailurePatterns,
  {}
)

export default crons
