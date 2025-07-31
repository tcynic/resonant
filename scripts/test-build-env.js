#!/usr/bin/env node

/**
 * Test script to simulate build-time environment checking
 * Run this locally to test if your environment variables would be available during Vercel build
 */

console.log('🧪 Testing build environment simulation...\n')

// Simulate the build process environment
const buildEnv = {
  ...process.env,
  NODE_ENV: 'production',
  VERCEL: '1',
  VERCEL_ENV: 'production',
  CI: '1'
}

console.log('📋 Simulated build environment:')
console.log(`  NODE_ENV: ${buildEnv.NODE_ENV}`)
console.log(`  VERCEL: ${buildEnv.VERCEL}`)
console.log(`  VERCEL_ENV: ${buildEnv.VERCEL_ENV}`)
console.log(`  CI: ${buildEnv.CI}\n`)

// Test the exact same logic used in your app
const convexUrl = buildEnv.NEXT_PUBLIC_CONVEX_URL

console.log('🔍 Testing Convex URL availability:')
console.log(`  Raw value: ${convexUrl || 'undefined'}`)
console.log(`  Boolean check: ${!!convexUrl}`)
console.log(`  String length: ${convexUrl ? convexUrl.length : 0}`)

// Test the exact condition from your convex.ts file
if (!convexUrl && typeof window !== 'undefined') {
  console.log('❌ Would throw runtime error (but window is undefined in Node.js)')
} else if (!convexUrl) {
  console.log('⚠️  No Convex URL found - would use placeholder during build')
  console.log('   This means the environment variable is NOT available at build time')
} else {
  console.log('✅ Convex URL is available at build time!')
  console.log(`   Value: ${convexUrl}`)
}

// Suggest next steps
console.log('\n📝 Next steps:')
if (!convexUrl) {
  console.log('1. ❌ Environment variable is NOT set for build time')
  console.log('2. 🔧 Check Vercel Dashboard > Project Settings > Environment Variables')
  console.log('3. 🔄 Ensure NEXT_PUBLIC_CONVEX_URL is set for "Production" environment')
  console.log('4. 🚀 Trigger a new deployment to rebuild with the variable')
} else {
  console.log('1. ✅ Environment variable is correctly configured')
  console.log('2. 🚀 Ready for production build')
}