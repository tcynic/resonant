import { httpRouter } from 'convex/server'
import { analyzeJournalEntry, retryAnalysis } from './ai_processing'

const http = httpRouter()

// AI Processing HTTP Actions
http.route({
  path: '/ai/analyze',
  method: 'POST',
  handler: analyzeJournalEntry,
})

http.route({
  path: '/ai/retry',
  method: 'POST',
  handler: retryAnalysis,
})

// Note: LangExtract processing is now handled via internal actions, not HTTP routes

// Clerk webhooks will be configured in a future story

export default http
