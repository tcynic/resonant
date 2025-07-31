#!/usr/bin/env node

/**
 * Build-time environment variable verification script
 * Run this during your build process to verify that NEXT_PUBLIC_CONVEX_URL is available
 */

console.log('🔍 Verifying build-time environment variables...\n')

// Check for NEXT_PUBLIC_CONVEX_URL
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
console.log('Environment variables:')
console.log(
  `  NEXT_PUBLIC_CONVEX_URL: ${convexUrl ? '✅ ' + convexUrl : '❌ NOT SET'}`
)

// Check other critical env vars
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const clerkSecretKey = process.env.CLERK_SECRET_KEY
const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY

console.log(
  `  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${clerkPublishableKey ? '✅ ' + clerkPublishableKey.substring(0, 10) + '...' : '❌ NOT SET'}`
)
console.log(
  `  CLERK_SECRET_KEY: ${clerkSecretKey ? '✅ ' + clerkSecretKey.substring(0, 10) + '...' : '❌ NOT SET'}`
)
console.log(
  `  GOOGLE_GEMINI_API_KEY: ${geminiApiKey ? '✅ ' + geminiApiKey.substring(0, 10) + '...' : '❌ NOT SET'}`
)

console.log('\n📊 Build environment info:')
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`)
console.log(`  VERCEL: ${process.env.VERCEL || 'false'}`)
console.log(`  VERCEL_ENV: ${process.env.VERCEL_ENV || 'N/A'}`)
console.log(`  CI: ${process.env.CI || 'false'}`)

// Exit with error if critical variables are missing
if (!convexUrl) {
  console.error('\n❌ CRITICAL ERROR: NEXT_PUBLIC_CONVEX_URL is not set!')
  console.error('This will cause the application to fail at runtime.')
  console.error('\nTo fix this:')
  console.error(
    '1. In Vercel Dashboard: Go to Project Settings > Environment Variables'
  )
  console.error('2. Add NEXT_PUBLIC_CONVEX_URL with your production Convex URL')
  console.error('3. Redeploy to rebuild with the environment variable')
  process.exit(1)
}

if (!clerkPublishableKey || !clerkSecretKey) {
  console.error('\n❌ CRITICAL ERROR: Clerk environment variables are not set!')
  process.exit(1)
}

console.log('\n✅ All critical environment variables are properly configured!')
