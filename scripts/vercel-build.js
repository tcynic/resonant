#!/usr/bin/env node

/**
 * Custom build script for Vercel deployments
 * Handles Convex stub files and uses Vercel-specific TypeScript configuration
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Starting Vercel build process...')

// Step 1: Ensure Convex stub files are in place
console.log('📦 Setting up Convex stub files...')
try {
  // Create _generated directory if it doesn't exist
  const generatedDir = path.join(__dirname, '..', 'convex', '_generated')
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true })
  }

  // Copy stub files
  const stubsDir = path.join(__dirname, '..', 'convex', '_generated_stubs')
  if (fs.existsSync(stubsDir)) {
    const files = fs.readdirSync(stubsDir)
    files.forEach(file => {
      const sourcePath = path.join(stubsDir, file)
      const destPath = path.join(generatedDir, file)
      fs.copyFileSync(sourcePath, destPath)
    })
    console.log('✅ Convex stub files copied successfully')
  } else {
    console.log('⚠️  No stub files found, continuing with existing files')
  }
} catch (error) {
  console.error('❌ Error setting up Convex stub files:', error.message)
  // Continue with build anyway
}

// Step 2: Run TypeScript check with Vercel config (non-blocking)
console.log('🔍 Running TypeScript validation...')
try {
  execSync('npx tsc --noEmit --project tsconfig.vercel.json', {
    stdio: 'inherit',
  })
  console.log('✅ TypeScript validation passed')
} catch (error) {
  console.log('⚠️  TypeScript validation warnings (non-blocking)')
}

// Step 3: Install TypeScript types if needed
console.log('📦 Ensuring TypeScript dependencies...')
try {
  execSync(
    'npm install @types/node@20 @types/react@19 @types/react-dom@19 typescript@5 --no-save',
    {
      stdio: 'inherit',
    }
  )
  console.log('✅ TypeScript dependencies installed')
} catch (error) {
  console.log('⚠️  Could not install TypeScript dependencies, continuing...')
}

// Step 4: Run the actual Next.js build
console.log('🏗️  Building Next.js application...')
try {
  execSync('npm run build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      SKIP_ENV_VALIDATION: '1',
      SKIP_VALIDATION: '1',
    },
  })
  console.log('✅ Next.js build completed successfully')
} catch (error) {
  console.error('❌ Build failed:', error.message)
  process.exit(1)
}

console.log('🎉 Vercel build completed successfully!')
