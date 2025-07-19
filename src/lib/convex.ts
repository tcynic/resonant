import { ConvexReactClient } from 'convex/react'

// Validate that the environment variable is properly set
if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error(
    'Missing NEXT_PUBLIC_CONVEX_URL environment variable. Please check your .env.local file.'
  )
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL)

export { convex }
