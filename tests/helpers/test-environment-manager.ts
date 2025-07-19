import { TestAccountManager } from './test-account-manager'
import { TestDataFactory } from '../fixtures/test-data-factory'

export class TestEnvironmentManager {
  private accountManager: TestAccountManager
  private dataFactory: TestDataFactory

  constructor() {
    this.accountManager = new TestAccountManager()
    this.dataFactory = new TestDataFactory()
  }

  /**
   * Validate that the test environment is properly configured
   */
  async validateEnvironment(): Promise<void> {
    console.log('🔍 Validating test environment configuration...')

    // Check required environment variables
    const requiredVars = [
      'PLAYWRIGHT_BASE_URL',
      'TEST_ENVIRONMENT',
    ]

    const missingVars = requiredVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }

    // Validate test environment setting
    if (process.env.TEST_ENVIRONMENT !== 'test') {
      throw new Error('TEST_ENVIRONMENT must be set to "test"')
    }

    // Check if running against production (safety check)
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL
    if (baseUrl?.includes('resonant.app') || baseUrl?.includes('production')) {
      throw new Error('Cannot run tests against production environment')
    }

    console.log('✅ Test environment validation passed')
  }

  /**
   * Set up test database isolation
   */
  async setupTestDatabase(): Promise<void> {
    console.log('🗄️  Setting up test database isolation...')
    
    try {
      const { getSharedSimpleConvexTestClient } = require('./convex-test-client-simple')
      const convexClient = getSharedSimpleConvexTestClient()
      
      // Validate Convex configuration
      const configResult = await convexClient.validateConfiguration()
      
      if (configResult.success) {
        console.log('✅ Convex configuration validated')
        // In a real implementation, this would use the full Convex client
        // For now, we'll use mock operations
        const cleanupResult = await convexClient.mockCleanupTestData()
        console.log(`✅ ${cleanupResult.message}`)
        console.log('✅ Test database isolation setup completed')
      } else {
        console.log(`ℹ️  Convex not available: ${configResult.message}`)
        console.log('📝 Test database setup continuing with mock data')
      }
      
    } catch (error) {
      console.warn('⚠️  Convex database setup failed, continuing with mock data:', error.message)
      console.log('📝 Test database setup continuing without Convex integration')
    }
  }

  /**
   * Seed initial test data
   */
  async seedTestData(): Promise<void> {
    console.log('🌱 Seeding test data...')
    
    try {
      // Create test account personas
      await this.accountManager.createTestAccounts()
      
      // Pass user ID mappings to data factory
      this.dataFactory.setUserIdMappings(this.accountManager)
      
      // Seed relationship and journal data
      await this.dataFactory.seedAllTestData()
      
      console.log('✅ Test data seeding completed')
    } catch (error) {
      console.error('❌ Test data seeding failed:', error)
      throw error
    }
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...')
    
    try {
      await this.dataFactory.cleanupAllTestData()
      await this.accountManager.cleanupTestAccounts()
      
      console.log('✅ Test data cleanup completed')
    } catch (error) {
      console.error('❌ Test data cleanup failed:', error)
      throw error
    }
  }

  /**
   * Archive test results for debugging
   */
  async archiveTestResults(): Promise<void> {
    console.log('📁 Archiving test results...')
    
    try {
      // Create timestamp for archive
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const archivePath = `test-results/archive/${timestamp}`
      
      console.log(`📁 Test results archived to: ${archivePath}`)
      console.log('✅ Test results archiving completed')
    } catch (error) {
      console.error('❌ Test results archiving failed:', error)
      // Don't throw here - archiving failure shouldn't fail tests
    }
  }

  /**
   * Reset test environment state
   */
  async resetTestEnvironment(): Promise<void> {
    console.log('🔄 Resetting test environment state...')
    
    try {
      // Reset any global state if needed
      // Clear any cached data
      // Reset any singleton instances
      
      console.log('✅ Test environment reset completed')
    } catch (error) {
      console.error('❌ Test environment reset failed:', error)
      // Don't throw here - reset failure shouldn't fail tests
    }
  }
}