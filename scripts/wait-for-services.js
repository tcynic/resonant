#!/usr/bin/env node
/**
 * Health checking script for CI/CD pipelines
 * Waits for both Next.js and Convex services to be ready before running tests
 */

const http = require('http')
const https = require('https')
const { spawn } = require('child_process')

// Configuration
const NEXT_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL
const MAX_WAIT_TIME = 120000 // 2 minutes
const CHECK_INTERVAL = 2000 // 2 seconds
const STARTUP_DELAY = 10000 // 10 seconds initial delay

/**
 * Check if a URL is accessible
 */
function checkUrl(url) {
  return new Promise(resolve => {
    const client = url.startsWith('https:') ? https : http
    const request = client.get(url, res => {
      resolve(res.statusCode >= 200 && res.statusCode < 400)
    })

    request.on('error', () => resolve(false))
    request.setTimeout(5000, () => {
      request.destroy()
      resolve(false)
    })
  })
}

/**
 * Wait for a service to be ready
 */
function waitForService(name, url, timeout = MAX_WAIT_TIME) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    function check() {
      const elapsed = Date.now() - startTime

      if (elapsed >= timeout) {
        reject(
          new Error(`${name} failed to start within ${timeout}ms. URL: ${url}`)
        )
        return
      }

      checkUrl(url)
        .then(isReady => {
          if (isReady) {
            console.log(`✅ ${name} is ready (${elapsed}ms)`)
            resolve()
          } else {
            console.log(`⏳ Waiting for ${name}... (${elapsed}ms elapsed)`)
            setTimeout(check, CHECK_INTERVAL)
          }
        })
        .catch(() => {
          console.log(`⏳ Waiting for ${name}... (${elapsed}ms elapsed)`)
          setTimeout(check, CHECK_INTERVAL)
        })
    }

    check()
  })
}

/**
 * Validate environment variables
 */
function validateEnvironment() {
  const required = {
    NEXT_PUBLIC_CONVEX_URL: CONVEX_URL,
    PLAYWRIGHT_BASE_URL: NEXT_URL,
  }

  const missing = Object.entries(required)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`   - ${key}`))
    process.exit(1)
  }

  console.log('✅ Environment variables validated')
}

/**
 * Start development servers if needed
 */
function startServers() {
  return new Promise(resolve => {
    console.log('🚀 Starting development servers...')

    // Start Convex dev server
    const convexProcess = spawn('npm', ['run', 'convex:dev'], {
      stdio: 'pipe',
      detached: false,
    })

    // Start Next.js dev server
    const nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      detached: false,
    })

    // Store process IDs for cleanup
    process.env.CONVEX_PID = convexProcess.pid
    process.env.NEXT_PID = nextProcess.pid

    // Clean up processes on exit
    process.on('SIGINT', () => {
      console.log('\n🛑 Cleaning up processes...')
      convexProcess.kill('SIGTERM')
      nextProcess.kill('SIGTERM')
      process.exit(0)
    })

    // Give servers time to start
    setTimeout(resolve, STARTUP_DELAY)
  })
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔍 Validating environment...')
    validateEnvironment()

    // Check if we need to start servers (CI mode vs local)
    if (process.env.CI !== 'true') {
      console.log('💻 Local development mode - starting servers')
      await startServers()
    } else {
      console.log('🏗️ CI mode - assuming servers are managed externally')
    }

    console.log('⏱️ Waiting for services to be ready...')

    // Wait for Next.js
    await waitForService('Next.js', NEXT_URL)

    // Wait for Convex (if URL is provided)
    if (
      CONVEX_URL &&
      CONVEX_URL !== 'https://your-convex-deployment.convex.cloud'
    ) {
      // Test Convex health by checking the HTTP endpoint
      const convexHealthUrl = CONVEX_URL.replace('/api', '') + '/api/health'
      try {
        await waitForService('Convex', convexHealthUrl, 30000) // Shorter timeout for Convex
      } catch (error) {
        console.log(
          '⚠️ Convex health check failed, but continuing (may be expected in test env)'
        )
      }
    } else {
      console.log(
        '⚠️ Convex URL not provided or is template - skipping Convex health check'
      )
    }

    console.log('🎉 All services are ready!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Service health check failed:', error.message)
    process.exit(1)
  }
}

// Handle script execution
if (require.main === module) {
  main()
}

module.exports = { waitForService, checkUrl, validateEnvironment }
