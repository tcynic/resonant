import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Process daily reminders - check every 30 minutes for due reminders
crons.interval(
  'process-daily-reminders',
  { minutes: 30 }, // Check every 30 minutes
  internal.notifications.processScheduledReminders
)

// Update user patterns weekly on Sundays at 2 AM UTC
crons.weekly(
  'update-user-patterns',
  { dayOfWeek: 'sunday', hourUTC: 2, minuteUTC: 0 },
  internal.userPatterns.recalculateAllUserPatterns
)

// Generate smart reminders for all users daily at 6 AM UTC
crons.daily(
  'generate-smart-reminders',
  { hourUTC: 6, minuteUTC: 0 },
  internal.notifications.generateDailyReminders
)

export default crons
