import { ConvexReactClient } from 'convex/react'

// Get the Convex URL from environment variables
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

// During build time, we may not have the Convex URL set
// In that case, we'll use a placeholder that won't be used at runtime
const buildTimeUrl = 'https://placeholder.convex.cloud'

// Validate that the environment variable is properly set for runtime
if (!convexUrl && typeof window !== 'undefined') {
  throw new Error(
    'Missing NEXT_PUBLIC_CONVEX_URL environment variable. Please check your .env.local file.'
  )
}

// Use the actual URL if available, otherwise use placeholder for build time
const convex = new ConvexReactClient(convexUrl || buildTimeUrl)

export { convex }
