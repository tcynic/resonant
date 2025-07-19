import { FullConfig } from '@playwright/test'
import { TestEnvironmentManager } from '../helpers/test-environment-manager'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...')

  try {
    // Initialize test environment manager
    const envManager = new TestEnvironmentManager()
    
    // Check test environment configuration
    await envManager.validateEnvironment()
    
    // Set up test database isolation
    await envManager.setupTestDatabase()
    
    // Seed initial test data
    await envManager.seedTestData()
    
    console.log('✅ Global test setup completed successfully')
    console.log('ℹ️  Browser management handled by MCP server - skipping local browser warmup')
    
  } catch (error) {
    console.error('❌ Global test setup failed:', error)
    throw error
  }
}

export default globalSetup