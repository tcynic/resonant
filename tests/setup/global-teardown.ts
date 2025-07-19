import { FullConfig } from '@playwright/test'
import { TestEnvironmentManager } from '../helpers/test-environment-manager'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...')

  try {
    // Initialize test environment manager
    const envManager = new TestEnvironmentManager()
    
    // Clean up test data if configured to do so
    if (process.env.TEST_DATA_CLEANUP_ON_FAILURE !== 'false') {
      await envManager.cleanupTestData()
    }
    
    // Archive test results for debugging
    await envManager.archiveTestResults()
    
    // Reset test environment state
    await envManager.resetTestEnvironment()
    
    console.log('✅ Global test teardown completed successfully')
    
  } catch (error) {
    console.error('❌ Global test teardown failed:', error)
    // Don't throw here to avoid masking test failures
  }
}

export default globalTeardown