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

// Step 1: Try to generate proper Convex API files, fallback to stubs
console.log('📦 Attempting to generate Convex API files...')
let convexCodegenSuccess = false
try {
  execSync('npx convex codegen --typecheck=disable', {
    stdio: 'inherit',
    env: process.env,
  })
  console.log('✅ Convex API files generated successfully')
  convexCodegenSuccess = true
} catch (error) {
  console.log('⚠️ Convex codegen failed, falling back to stub files...')

  // Fallback: Set up stub files
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
  } catch (stubError) {
    console.error('❌ Error setting up Convex stub files:', stubError.message)
  }
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
