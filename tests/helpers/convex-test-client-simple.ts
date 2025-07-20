/**
 * Simple Convex Test Client
 *
 * Provides a simplified interface for Convex testing that gracefully handles
 * missing generated files and falls back to mock operations
 */

export interface ConvexTestResult {
  success: boolean
  message: string
  data?: any
}

/**
 * Simple test client that validates Convex configuration
 */
export class SimpleConvexTestClient {
  private convexUrl: string
  private testDomain: string

  constructor(convexUrl?: string, testDomain: string = 'test.resonant.local') {
    this.convexUrl = convexUrl || process.env.NEXT_PUBLIC_CONVEX_URL || ''
    this.testDomain = testDomain
  }

  /**
   * Validate Convex environment configuration
   */
  async validateConfiguration(): Promise<ConvexTestResult> {
    try {
      // Check if Convex URL is configured
      if (!this.convexUrl) {
        return {
          success: false,
          message: 'NEXT_PUBLIC_CONVEX_URL not configured',
        }
      }

      // Check if URL is reachable (simple validation)
      if (
        !this.convexUrl.startsWith('https://') ||
        !this.convexUrl.includes('.convex.cloud')
      ) {
        return {
          success: false,
          message: 'Invalid Convex URL format',
        }
      }

      // Check if generated API files exist
      const fs = require('fs')
      const path = require('path')

      const apiPath = path.resolve(process.cwd(), 'convex/_generated/api.d.ts')
      const serverPath = path.resolve(
        process.cwd(),
        'convex/_generated/server.d.ts'
      )

      if (!fs.existsSync(apiPath) || !fs.existsSync(serverPath)) {
        return {
          success: false,
          message:
            'Convex generated files not found. Run "npx convex dev" to generate them.',
        }
      }

      return {
        success: true,
        message: 'Convex configuration valid',
        data: {
          convexUrl: this.convexUrl,
          testDomain: this.testDomain,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: `Convex validation error: ${(error as Error).message}`,
      }
    }
  }

  /**
   * Mock test user creation (for when Convex is not available)
   */
  async mockCreateTestUser(
    clerkId: string,
    name: string,
    email: string
  ): Promise<ConvexTestResult> {
    console.log(`🧪 Mock: Creating test user ${email} with clerkId ${clerkId}`)

    return {
      success: true,
      message: `Mock user created: ${email}`,
      data: {
        userId: `mock_user_${clerkId}`,
        email,
        name,
        clerkId,
      },
    }
  }

  /**
   * Mock test data cleanup
   */
  async mockCleanupTestData(): Promise<ConvexTestResult> {
    console.log(`🧪 Mock: Cleaning up test data for domain ${this.testDomain}`)

    return {
      success: true,
      message: 'Mock cleanup completed',
      data: {
        deletedCount: 0,
        testDomain: this.testDomain,
      },
    }
  }

  /**
   * Get test data statistics (mock)
   */
  async getMockTestDataStats(): Promise<ConvexTestResult> {
    return {
      success: true,
      message: 'Mock test data statistics',
      data: {
        testUsers: 0,
        totalRelationships: 0,
        totalJournalEntries: 0,
        totalHealthScores: 0,
        userEmails: [],
        note: 'Mock data - no actual database operations performed',
      },
    }
  }

  /**
   * Check if Convex is properly configured and available
   */
  async isConvexAvailable(): Promise<boolean> {
    const result = await this.validateConfiguration()
    return result.success
  }
}

/**
 * Factory function to create simple Convex test client
 */
export function createSimpleConvexTestClient(
  convexUrl?: string,
  testDomain?: string
): SimpleConvexTestClient {
  return new SimpleConvexTestClient(convexUrl, testDomain)
}

/**
 * Singleton instance for shared usage
 */
let _sharedSimpleClient: SimpleConvexTestClient | null = null

export function getSharedSimpleConvexTestClient(): SimpleConvexTestClient {
  if (!_sharedSimpleClient) {
    _sharedSimpleClient = createSimpleConvexTestClient()
  }
  return _sharedSimpleClient
}
