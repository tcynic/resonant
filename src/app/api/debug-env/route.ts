import { NextResponse } from 'next/server'

export async function GET() {
  // This is a debug endpoint to check if environment variables are available
  // Remove this after debugging
  
  const envCheck = {
    hasConvexUrl: !!process.env.NEXT_PUBLIC_CONVEX_URL,
    convexUrlLength: process.env.NEXT_PUBLIC_CONVEX_URL?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || 'not-vercel',
    // Don't expose the actual values for security
    timestamp: new Date().toISOString()
  }
  
  return NextResponse.json(envCheck)
}