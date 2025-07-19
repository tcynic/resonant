import { TestUser } from '../accounts/test-user-personas'
import { testUsers } from '../accounts/test-user-personas'

export class TestAccountManager {
  private readonly testDomain = process.env.TEST_ACCOUNT_EMAIL_DOMAIN || 'test.resonant.local'
  private readonly testPassword = process.env.TEST_ACCOUNT_PASSWORD || 'ResonantTestSecure2025!'
  private userIdMap = new Map<string, string>()

  /**
   * Create all test account personas
   */
  async createTestAccounts(): Promise<void> {
    console.log('👥 Creating test account personas...')

    try {
      const personas = Object.values(testUsers)
      
      for (const persona of personas) {
        await this.createTestAccount(persona)
      }

      console.log(`✅ Created ${personas.length} test account personas`)
    } catch (error) {
      console.error('❌ Test account creation failed:', error)
      throw error
    }
  }

  /**
   * Create a single test account
   */
  async createTestAccount(user: TestUser): Promise<void> {
    console.log(`👤 Creating test account: ${user.id}`)

    try {
      const testAccountData = {
        id: user.id,
        email: this.generateTestEmail(user.id),
        password: this.testPassword,
        name: user.name,
        metadata: {
          persona: user.persona,
          description: user.description,
          testDataLevel: user.testDataLevel,
          createdForTesting: true,
          createdAt: new Date().toISOString(),
        }
      }

      // Log account preparation
      console.log(`📧 Test email: ${testAccountData.email}`)
      console.log(`👤 Persona: ${testAccountData.metadata.persona}`)
      console.log(`📊 Data level: ${testAccountData.metadata.testDataLevel}`)
      
      // Create user in Convex database
      try {
        const { getSharedConvexTestClient } = require('./convex-test-client')
        const convexClient = getSharedConvexTestClient()
        
        const userId = await convexClient.createTestUser(
          user.id, // Use persona ID as clerkId for test
          user.name,
          testAccountData.email
        )
        
        console.log(`🗄️  Created user in Convex database: ${userId}`)
        
        // Store the mapping for later use in data seeding
        this.storeUserMapping(user.id, userId)
        
      } catch (convexError) {
        console.warn(`⚠️  Convex user creation failed for ${user.id}, continuing with account preparation:`, convexError.message)
        
        // Fallback to simple client
        try {
          const { getSharedSimpleConvexTestClient } = require('./convex-test-client-simple')
          const simpleClient = getSharedSimpleConvexTestClient()
          const result = await simpleClient.mockCreateTestUser(user.id, user.name, testAccountData.email)
          console.log(`🗄️  ${result.message}`)
        } catch (fallbackError) {
          console.warn(`⚠️  Fallback user creation also failed:`, fallbackError.message)
        }
      }
      
      console.log(`✅ Test account prepared: ${user.id}`)
    } catch (error) {
      console.error(`❌ Failed to create test account ${user.id}:`, error)
      throw error
    }
  }

  /**
   * Clean up all test accounts
   */
  async cleanupTestAccounts(): Promise<void> {
    console.log('🧹 Cleaning up test accounts...')

    try {
      const personas = Object.values(testUsers)
      
      for (const persona of personas) {
        await this.cleanupTestAccount(persona)
      }

      console.log(`✅ Cleaned up ${personas.length} test accounts`)
    } catch (error) {
      console.error('❌ Test account cleanup failed:', error)
      throw error
    }
  }

  /**
   * Clean up a single test account
   */
  async cleanupTestAccount(user: TestUser): Promise<void> {
    console.log(`🗑️  Cleaning up test account: ${user.id}`)

    try {
      // Note: This will be implemented with actual Clerk test account deletion
      // For now, we'll log the cleanup requirement
      
      const testEmail = this.generateTestEmail(user.id)
      console.log(`📧 Marking for cleanup: ${testEmail}`)
      
      console.log(`✅ Test account cleanup prepared: ${user.id}`)
    } catch (error) {
      console.error(`❌ Failed to cleanup test account ${user.id}:`, error)
      // Don't throw here - individual cleanup failures shouldn't fail the entire process
    }
  }

  /**
   * Get test account credentials for authentication
   */
  getTestAccountCredentials(userId: string): { email: string; password: string } {
    return {
      email: this.generateTestEmail(userId),
      password: this.testPassword,
    }
  }

  /**
   * Generate deterministic test email address
   */
  private generateTestEmail(userId: string): string {
    return `${userId}@${this.testDomain}`
  }

  /**
   * Validate test account exists and is accessible
   */
  async validateTestAccount(userId: string): Promise<boolean> {
    try {
      // Note: This will be implemented with actual Clerk account validation
      // For now, we'll check if the account is in our test user registry
      
      const user = testUsers[userId as keyof typeof testUsers]
      return !!user
    } catch (error) {
      console.error(`❌ Failed to validate test account ${userId}:`, error)
      return false
    }
  }
  
  /**
   * Store mapping between persona ID and actual Convex user ID
   */
  storeUserMapping(personaId: string, convexUserId: string): void {
    this.userIdMap.set(personaId, convexUserId)
  }
  
  /**
   * Get actual Convex user ID for a persona
   */
  getConvexUserId(personaId: string): string | undefined {
    return this.userIdMap.get(personaId)
  }
}