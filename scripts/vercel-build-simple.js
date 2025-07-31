#!/usr/bin/env node

/**
 * Simplified build script for Vercel deployments
 * Skips TypeScript validation and focuses on building
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Starting Vercel build process...')

// Step 0: Verify environment variables
console.log('🔍 Verifying environment variables...')
try {
  execSync('node scripts/verify-build-env.js', {
    stdio: 'inherit',
    env: process.env,
  })
} catch (error) {
  console.error('❌ Environment variable verification failed:', error.message)
  process.exit(1)
}

// Step 1: Ensure Convex stub files are in place
console.log('📦 Setting up Convex stub files...')
try {
  const generatedDir = path.join(__dirname, '..', 'convex', '_generated')
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true })
  }

  const stubsDir = path.join(__dirname, '..', 'convex', '_generated_stubs')
  if (fs.existsSync(stubsDir)) {
    const files = fs.readdirSync(stubsDir)
    files.forEach(file => {
      const sourcePath = path.join(stubsDir, file)
      const destPath = path.join(generatedDir, file)
      fs.copyFileSync(sourcePath, destPath)
    })
    console.log('✅ Convex stub files copied successfully')
  }
} catch (error) {
  console.error('❌ Error setting up Convex stub files:', error.message)
}

// Step 2: Run Next.js build directly (skip prebuild)
console.log('🏗️  Building Next.js application...')
try {
  execSync('next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  })
  console.log('✅ Next.js build completed successfully')
} catch (error) {
  console.error('❌ Build failed:', error.message)
  process.exit(1)
}

console.log('🎉 Vercel build completed successfully!')