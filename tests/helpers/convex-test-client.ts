/**
 * Convex Test Client
 *
 * Provides a client interface for interacting with Convex database during tests
 */

const { ConvexHttpClient } = require('convex/browser')
const { api } = require('../../convex/_generated/api')

// Import types without importing at runtime
type Id<T extends string> = string & { __type: T }

/**
 * Test-specific Convex client for database operations
 */
export class ConvexTestClient {
  private client: any
  private testDomain: string

  constructor(convexUrl?: string, testDomain: string = 'test.resonant.local') {
    this.client = new ConvexHttpClient(
      convexUrl || process.env.NEXT_PUBLIC_CONVEX_URL || ''
    )
    this.testDomain = testDomain
  }

  /**
   * Create a test user in the database
   */
  async createTestUser(
    clerkId: string,
    name: string,
    email: string
  ): Promise<Id<'users'>> {
    try {
      const userId = await this.client.mutation(
        api.test.testDataManager.createTestUser,
        {
          clerkId,
          name,
          email,
        }
      )
      console.log(`✅ Created test user: ${email} (${userId})`)
      return userId
    } catch (error) {
      console.error(`❌ Failed to create test user ${email}:`, error)
      throw error
    }
  }

  /**
   * Create test relationships for a user
   */
  async createTestRelationships(
    userId: Id<'users'>,
    relationships: Array<{
      name: string
      type: 'partner' | 'family' | 'friend' | 'colleague' | 'other'
    }>
  ): Promise<Id<'relationships'>[]> {
    try {
      const relationshipIds = await this.client.mutation(
        api.test.testDataManager.createTestRelationships,
        { userId, relationships }
      )
      console.log(
        `✅ Created ${relationships.length} relationships for user ${userId}`
      )
      return relationshipIds
    } catch (error) {
      console.error(
        `❌ Failed to create relationships for user ${userId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Create test journal entries for a user
   */
  async createTestJournalEntries(
    userId: Id<'users'>,
    entries: Array<{
      relationshipId: Id<'relationships'>
      content: string
      mood?: string
      tags?: string[]
      isPrivate?: boolean
    }>
  ): Promise<Id<'journalEntries'>[]> {
    try {
      const entryIds = await this.client.mutation(
        api.test.testDataManager.createTestJournalEntries,
        { userId, entries }
      )
      console.log(
        `✅ Created ${entries.length} journal entries for user ${userId}`
      )
      return entryIds
    } catch (error) {
      console.error(
        `❌ Failed to create journal entries for user ${userId}:`,
        error
      )
      throw error
    }
  }

  /**
   * Clean up test data for a specific user
   */
  async cleanupTestUser(clerkId: string): Promise<boolean> {
    try {
      const result = await this.client.mutation(
        api.test.testDataManager.cleanupTestUser,
        { clerkId }
      )

      if (result.deleted) {
        console.log(
          `✅ Cleaned up test user ${clerkId} (deleted ${result.deletedCount} records)`
        )
        return true
      } else {
        console.log(
          `ℹ️  Test user ${clerkId} not found for cleanup: ${result.reason}`
        )
        return false
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup test user ${clerkId}:`, error)
      throw error
    }
  }

  /**
   * Clean up all test data
   */
  async cleanupAllTestData(): Promise<boolean> {
    try {
      const result = await this.client.mutation(
        api.test.testDataManager.cleanupAllTestData,
        { testDomain: this.testDomain }
      )

      console.log(
        `✅ Cleaned up all test data (${result.testUsersFound} users, ${result.deletedCount} total records)`
      )
      return true
    } catch (error) {
      console.error(`❌ Failed to cleanup all test data:`, error)
      throw error
    }
  }

  /**
   * Get test data statistics
   */
  async getTestDataStats(): Promise<{
    testUsers: number
    totalRelationships: number
    totalJournalEntries: number
    totalHealthScores: number
    userEmails: string[]
  }> {
    try {
      const stats = await this.client.query(
        api.test.testDataManager.getTestDataStats,
        { testDomain: this.testDomain }
      )
      return stats
    } catch (error) {
      console.error(`❌ Failed to get test data stats:`, error)
      throw error
    }
  }

  /**
   * Verify that a test user exists and get their data counts
   */
  async verifyTestUser(clerkId: string): Promise<{
    exists: boolean
    user: any
    relationshipCount: number
    journalEntryCount: number
  }> {
    try {
      const result = await this.client.query(
        api.test.testDataManager.verifyTestUser,
        { clerkId }
      )
      return result
    } catch (error) {
      console.error(`❌ Failed to verify test user ${clerkId}:`, error)
      throw error
    }
  }

  /**
   * Check if Convex client is properly configured
   */
  async healthCheck(): Promise<boolean> {
    try {
      const stats = await this.getTestDataStats()
      console.log(
        `✅ Convex health check passed - ${stats.testUsers} test users found`
      )
      return true
    } catch (error) {
      console.error(`❌ Convex health check failed:`, error)
      return false
    }
  }
}

/**
 * Factory function to create Convex test client
 */
export function createConvexTestClient(
  convexUrl?: string,
  testDomain?: string
): ConvexTestClient {
  return new ConvexTestClient(convexUrl, testDomain)
}

/**
 * Singleton instance for shared usage
 */
let _sharedClient: ConvexTestClient | null = null

export function getSharedConvexTestClient(): ConvexTestClient {
  if (!_sharedClient) {
    _sharedClient = createConvexTestClient()
  }
  return _sharedClient
}
