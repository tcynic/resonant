#!/usr/bin/env node

/**
 * Script to check deployment status and verify environment variables are working
 */

async function checkDeployment() {
  console.log('🔍 Checking deployment status...\n')

  try {
    console.log('1. Testing production site...')
    const response = await fetch('https://becomeresonant.app')
    const text = await response.text()

    if (
      text.includes('Application error: a client-side exception has occurred')
    ) {
      console.log('❌ Site still showing environment variable error')
      console.log('🔧 Possible solutions:')
      console.log(
        '   - Wait for deployment to complete (check Vercel dashboard)'
      )
      console.log(
        '   - Verify NEXT_PUBLIC_CONVEX_URL is set for Production environment'
      )
      console.log('   - Try a hard refresh of the deployment')
      return false
    } else if (
      text.includes('<title>') &&
      !text.includes('Application error')
    ) {
      console.log('✅ Site is loading successfully!')
      console.log('🎉 Environment variables are working correctly')
      return true
    } else {
      console.log('⚠️  Site returned unexpected content')
      console.log('📋 Response preview:', text.substring(0, 200) + '...')
      return false
    }
  } catch (error) {
    console.error('❌ Failed to check deployment:', error.message)
    return false
  }
}

async function main() {
  const isWorking = await checkDeployment()

  console.log('\n📊 Next steps:')
  if (isWorking) {
    console.log('✅ Deployment successful - site is working correctly')
    console.log('🧪 You can now test the full application functionality')
  } else {
    console.log(
      '🔄 If deployment is still in progress, wait 2-3 minutes and run again'
    )
    console.log('🔍 Check Vercel deployment logs if the issue persists')
    console.log('📋 Verify all environment variables in Vercel Dashboard')
  }

  process.exit(isWorking ? 0 : 1)
}

main().catch(console.error)
