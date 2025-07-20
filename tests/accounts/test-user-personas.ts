/**
 * Test User Personas for E2E Testing
 *
 * These personas represent different user types and data scenarios
 * for comprehensive testing of the Resonant application.
 */

export interface TestUser {
  id: string
  name: string
  persona: string
  description: string
  testDataLevel: 'minimal' | 'moderate' | 'extensive' | 'edge-case'
  relationships: number
  journalEntries: number
  features: readonly string[]
}

export const testUsers = {
  newUser: {
    id: 'new-user',
    name: 'New User Test',
    persona: 'New User',
    description:
      'Empty state user for testing onboarding and first-time experience',
    testDataLevel: 'minimal' as const,
    relationships: 0,
    journalEntries: 0,
    features: [
      'sign-up-flow',
      'onboarding',
      'empty-states',
      'first-relationship-creation',
      'first-journal-entry',
    ],
  },

  activeUser: {
    id: 'active-user',
    name: 'Active User Test',
    persona: 'Active User',
    description: 'User with moderate data for testing typical workflows',
    testDataLevel: 'moderate' as const,
    relationships: 4,
    journalEntries: 12,
    features: [
      'relationship-management',
      'journal-creation',
      'mood-tracking',
      'tag-management',
      'dashboard-navigation',
      'search-filtering',
    ],
  },

  powerUser: {
    id: 'power-user',
    name: 'Power User Test',
    persona: 'Power User',
    description:
      'User with extensive data for testing performance and pagination',
    testDataLevel: 'extensive' as const,
    relationships: 15,
    journalEntries: 50,
    features: [
      'performance-testing',
      'pagination',
      'bulk-operations',
      'advanced-search',
      'data-export',
      'relationship-insights',
    ],
  },

  edgeCaseUser: {
    id: 'edge-case-user',
    name: 'Edge Case Test',
    persona: 'Edge Case User',
    description:
      'User with boundary conditions and unusual data for testing edge cases',
    testDataLevel: 'edge-case' as const,
    relationships: 8,
    journalEntries: 25,
    features: [
      'boundary-testing',
      'unicode-content',
      'maximum-length-fields',
      'special-characters',
      'error-handling',
      'validation-testing',
    ],
  },
} as const

export type TestUserType = keyof typeof testUsers

/**
 * Get test user by ID
 */
export function getTestUser(userId: TestUserType): TestUser {
  return testUsers[userId]
}

/**
 * Get all test users
 */
export function getAllTestUsers(): TestUser[] {
  return Object.values(testUsers)
}

/**
 * Get test users by data level
 */
export function getTestUsersByDataLevel(
  level: TestUser['testDataLevel']
): TestUser[] {
  return Object.values(testUsers).filter(user => user.testDataLevel === level)
}

/**
 * Get test user credentials for authentication
 */
export function getTestUserCredentials(userId: TestUserType): {
  email: string
  password: string
  user: TestUser
} {
  const user = testUsers[userId]
  const domain = process.env.TEST_ACCOUNT_EMAIL_DOMAIN || 'test.resonant.local'
  const password =
    process.env.TEST_ACCOUNT_PASSWORD || 'ResonantTestSecure2025!'

  return {
    email: `${userId}@${domain}`,
    password,
    user,
  }
}
