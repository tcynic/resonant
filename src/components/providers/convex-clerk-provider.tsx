'use client'

import { ClerkProvider, useAuth } from '@clerk/nextjs'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { convex } from '@/lib/convex'
import { useEffect } from 'react'

export function ConvexClerkProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // Debug logging for CI environment
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || process.env.CI) {
      console.log('🔐 Clerk Provider Debug Info:')
      console.log(
        '- Publishable Key Present:',
        !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      )
      console.log(
        '- Publishable Key Prefix:',
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 8)
      )
      console.log('- Sign In URL:', '/sign-in')
      console.log('- Sign Up URL:', '/sign-up')
      console.log('- Environment:', process.env.NODE_ENV)
      console.log('- CI Mode:', !!process.env.CI)
      console.log('- Window Object Available:', typeof window !== 'undefined')

      // Check if Clerk scripts are loading
      const clerkScripts = document.querySelectorAll('script[src*="clerk"]')
      console.log('- Clerk Scripts Found:', clerkScripts.length)

      // Monitor for Clerk initialization
      const checkClerkInit = () => {
        const clerkElements = document.querySelectorAll('[data-clerk-element]')
        console.log('- Clerk Elements in DOM:', clerkElements.length)
        if (clerkElements.length === 0) {
          setTimeout(checkClerkInit, 1000)
        } else {
          console.log('✅ Clerk elements detected in DOM')
        }
      }

      setTimeout(checkClerkInit, 2000)
    }
  }, [])

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (!publishableKey) {
    console.error('❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing')
    return <div>Authentication configuration error</div>
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
