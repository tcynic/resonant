import { NextResponse } from 'next/server'

/**
 * Debug endpoint for CI environment verification
 * Only available in test environment
 */
export async function GET() {
  // Allow in development or test environments
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.CI &&
    !process.env.TEST_ENVIRONMENT
  ) {
    return NextResponse.json(
      { error: 'Debug endpoint not available in production' },
      { status: 403 }
    )
  }

  // Return environment status for debugging
  const envStatus = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      TEST_ENVIRONMENT: process.env.TEST_ENVIRONMENT,
      CI: process.env.CI,
    },
    clerk: {
      publishableKeyPresent: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      publishableKeyPrefix:
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 8),
      secretKeyPresent: !!process.env.CLERK_SECRET_KEY,
      signInUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      signUpUrl: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
      afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
      afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    },
    convex: {
      urlPresent: !!process.env.NEXT_PUBLIC_CONVEX_URL,
      urlPrefix: process.env.NEXT_PUBLIC_CONVEX_URL?.substring(0, 20),
    },
    runtime: {
      isClient: typeof window !== 'undefined',
      timestamp: new Date().toISOString(),
    },
  }

  return NextResponse.json(envStatus)
}
