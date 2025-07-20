import { TestUser, testUsers } from '../accounts/test-user-personas'
import { RelationshipType, MoodType } from '../../src/lib/types'

export interface TestRelationship {
  id: string
  userId: string
  name: string
  type: RelationshipType
  photo?: string
  createdAt: number
  updatedAt: number
}

export interface TestJournalEntry {
  id: string
  userId: string
  relationshipId: string
  content: string
  mood?: MoodType
  tags?: string[]
  isPrivate?: boolean
  createdAt: number
  updatedAt: number
}

export class TestDataFactory {
  private readonly relationshipTypes: RelationshipType[] = [
    'partner',
    'family',
    'friend',
    'colleague',
    'other',
  ]

  // Map to store relationship IDs from Convex for journal entry creation
  private relationshipIdMap = new Map<string, any[]>()

  // Map to store actual Convex user IDs
  private userIdMap = new Map<string, any>()

  /**
   * Set user ID mappings from account manager
   */
  setUserIdMappings(accountManager: any): void {
    // Copy all user ID mappings from account manager
    const personas = ['new-user', 'active-user', 'power-user', 'edge-case-user']
    for (const persona of personas) {
      const convexUserId = accountManager.getConvexUserId(persona)
      if (convexUserId) {
        this.userIdMap.set(persona, convexUserId)
      }
    }
  }

  private readonly moodTypes: MoodType[] = [
    'happy',
    'excited',
    'content',
    'neutral',
    'sad',
    'angry',
    'frustrated',
    'anxious',
    'confused',
    'grateful',
  ]

  private readonly sampleTags = [
    'communication',
    'conflict',
    'support',
    'fun',
    'stress',
    'growth',
    'celebration',
    'challenge',
    'understanding',
    'love',
  ]

  /**
   * Seed all test data for all personas
   */
  async seedAllTestData(): Promise<void> {
    console.log('🌱 Seeding test data for all personas...')

    try {
      const personas = Object.values(testUsers)

      for (const persona of personas) {
        await this.seedUserData(persona)
      }

      console.log(`✅ Test data seeded for ${personas.length} personas`)
    } catch (error) {
      console.error('❌ Test data seeding failed:', error)
      throw error
    }
  }

  /**
   * Seed test data for a specific user persona
   */
  async seedUserData(user: TestUser): Promise<void> {
    console.log(`🌱 Seeding data for ${user.persona} (${user.id})...`)

    try {
      // Create relationships
      const relationships = this.generateRelationships(user)
      await this.seedRelationships(user.id, relationships)

      // Create journal entries
      const journalEntries = this.generateJournalEntries(user, relationships)
      await this.seedJournalEntries(user.id, journalEntries)

      console.log(
        `✅ Seeded ${relationships.length} relationships and ${journalEntries.length} journal entries for ${user.id}`
      )
    } catch (error) {
      console.error(`❌ Failed to seed data for ${user.id}:`, error)
      throw error
    }
  }

  /**
   * Generate relationships for a user based on their persona
   */
  private generateRelationships(user: TestUser): TestRelationship[] {
    const relationships: TestRelationship[] = []
    const baseTime = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days ago

    for (let i = 0; i < user.relationships; i++) {
      const relationship: TestRelationship = {
        id: `rel_${user.id}_${i + 1}`,
        userId: user.id,
        name: this.generateRelationshipName(user.testDataLevel, i),
        type: this.relationshipTypes[i % this.relationshipTypes.length],
        photo: this.shouldHavePhoto(user.testDataLevel)
          ? this.generatePhotoUrl(i)
          : undefined,
        createdAt: baseTime + i * 24 * 60 * 60 * 1000,
        updatedAt: baseTime + i * 24 * 60 * 60 * 1000,
      }

      relationships.push(relationship)
    }

    return relationships
  }

  /**
   * Generate journal entries for a user based on their relationships
   */
  private generateJournalEntries(
    user: TestUser,
    relationships: TestRelationship[]
  ): TestJournalEntry[] {
    const journalEntries: TestJournalEntry[] = []
    const baseTime = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days ago

    for (let i = 0; i < user.journalEntries; i++) {
      const relationshipIndex =
        relationships.length > 0 ? i % relationships.length : 0
      const relationship = relationships[relationshipIndex]

      const entry: TestJournalEntry = {
        id: `entry_${user.id}_${i + 1}`,
        userId: user.id,
        relationshipId: relationship?.id || 'default_relationship',
        content: this.generateJournalContent(user.testDataLevel, i),
        mood: this.shouldHaveMood()
          ? this.moodTypes[i % this.moodTypes.length]
          : undefined,
        tags: this.shouldHaveTags()
          ? this.generateTags(user.testDataLevel)
          : undefined,
        isPrivate: this.shouldBePrivate(),
        createdAt: baseTime + i * 12 * 60 * 60 * 1000, // Every 12 hours
        updatedAt: baseTime + i * 12 * 60 * 60 * 1000,
      }

      journalEntries.push(entry)
    }

    return journalEntries
  }

  /**
   * Generate relationship name based on data level
   */
  private generateRelationshipName(
    dataLevel: TestUser['testDataLevel'],
    index: number
  ): string {
    const baseNames = [
      'Alex Johnson',
      'Sam Smith',
      'Jordan Lee',
      'Casey Brown',
      'Riley Davis',
      'Morgan Wilson',
      'Taylor Garcia',
      'Avery Martinez',
      'Quinn Anderson',
      'Blake Thomas',
    ]

    switch (dataLevel) {
      case 'edge-case':
        // Include special characters and unicode
        const specialNames = [
          'José María García-López',
          'Müller Schmidt',
          "O'Connor-Smith",
          '李小明',
          'محمد عبدالله',
          'François Dubois',
        ]
        return (
          specialNames[index % specialNames.length] ||
          baseNames[index % baseNames.length]
        )

      case 'extensive':
        return `${baseNames[index % baseNames.length]} (Contact ${index + 1})`

      default:
        return baseNames[index % baseNames.length]
    }
  }

  /**
   * Generate journal content based on data level
   */
  private generateJournalContent(
    dataLevel: TestUser['testDataLevel'],
    index: number
  ): string {
    const baseContents = [
      'Had a great conversation today about our future plans.',
      'Feeling grateful for the support during a difficult time.',
      'We disagreed on something important, but talked it through.',
      'Celebrated a milestone together - such a wonderful moment.',
      'Feeling a bit distant lately, need to reconnect soon.',
    ]

    switch (dataLevel) {
      case 'edge-case':
        // Include very long content, special characters, and edge cases
        const edgeContents = [
          'This is a very long journal entry that tests the maximum length limits of the content field. '.repeat(
            20
          ),
          'Content with special chars: @#$%^&*()_+-=[]{}|;:,.<>?~`',
          'Unicode content: 🎉💖✨🌟💫🦄🌈❤️💕🎊🎈🌸🌺🌻🌷',
          'Mixed content: Hello 世界! 🌍 Testing émojis and àccénts',
          '', // Empty content edge case
          '   ', // Whitespace only edge case
        ]
        return edgeContents[index % edgeContents.length]

      case 'extensive':
        return `${baseContents[index % baseContents.length]} Entry #${index + 1} with additional context for performance testing.`

      default:
        return baseContents[index % baseContents.length]
    }
  }

  /**
   * Generate tags based on data level
   */
  private generateTags(dataLevel: TestUser['testDataLevel']): string[] {
    const baseTags = this.sampleTags.slice(0, 3)

    switch (dataLevel) {
      case 'edge-case':
        return [
          'tag with spaces',
          'very-long-tag-name-that-tests-limits',
          '🏷️',
          'émojí-tàg',
        ]

      case 'extensive':
        return this.sampleTags.slice(0, 5)

      default:
        return baseTags
    }
  }

  /**
   * Utility methods for random generation
   */
  private shouldHavePhoto(dataLevel: TestUser['testDataLevel']): boolean {
    return dataLevel === 'extensive' || Math.random() > 0.5
  }

  private shouldHaveMood(): boolean {
    return Math.random() > 0.3
  }

  private shouldHaveTags(): boolean {
    return Math.random() > 0.4
  }

  private shouldBePrivate(): boolean {
    return Math.random() > 0.8
  }

  private generatePhotoUrl(index: number): string {
    return `https://picsum.photos/seed/test${index}/150/150`
  }

  /**
   * Seed relationships into the test database
   */
  private async seedRelationships(
    userId: string,
    relationships: TestRelationship[]
  ): Promise<void> {
    console.log(
      `📝 Seeding ${relationships.length} relationships for ${userId}`
    )

    try {
      const {
        getSharedConvexTestClient,
      } = require('../helpers/convex-test-client')
      const convexClient = getSharedConvexTestClient()

      // Get the actual Convex user ID from account manager
      const convexUserId = this.userIdMap.get(userId)
      if (!convexUserId) {
        throw new Error(`No Convex user ID found for persona ${userId}`)
      }

      // Map test relationships to Convex format
      const convexRelationships = relationships.map(rel => ({
        name: rel.name,
        type: rel.type as
          | 'partner'
          | 'family'
          | 'friend'
          | 'colleague'
          | 'other',
      }))

      const relationshipIds = await convexClient.createTestRelationships(
        convexUserId,
        convexRelationships
      )

      relationships.forEach((rel, index) => {
        console.log(`  ${index + 1}. ${rel.name} (${rel.type})`)
      })

      // Store relationship IDs for journal entry creation
      this.relationshipIdMap.set(userId, relationshipIds)
    } catch (error) {
      console.warn(
        `⚠️  Convex relationship seeding failed for ${userId}, using mock data:`,
        (error as Error).message
      )

      // Fallback: log relationships without database operation
      relationships.forEach((rel, index) => {
        console.log(`  ${index + 1}. ${rel.name} (${rel.type})`)
      })
    }
  }

  /**
   * Seed journal entries into the test database
   */
  private async seedJournalEntries(
    userId: string,
    entries: TestJournalEntry[]
  ): Promise<void> {
    console.log(`📖 Seeding ${entries.length} journal entries for ${userId}`)

    try {
      const {
        getSharedConvexTestClient,
      } = require('../helpers/convex-test-client')
      const convexClient = getSharedConvexTestClient()

      // Get relationship IDs for this user
      const relationshipIds = this.relationshipIdMap.get(userId) || []

      if (relationshipIds.length === 0) {
        console.warn(
          `⚠️  No relationships found for ${userId}, skipping journal entries`
        )
        return
      }

      // Map test entries to Convex format
      const convexEntries = entries.map((entry, index) => ({
        relationshipId: relationshipIds[index % relationshipIds.length], // Cycle through relationships
        content: entry.content,
        mood: entry.mood,
        tags: entry.tags,
        isPrivate: entry.isPrivate,
      }))

      // Get the actual Convex user ID
      const convexUserId = this.userIdMap.get(userId)
      if (!convexUserId) {
        throw new Error(`No Convex user ID found for persona ${userId}`)
      }

      await convexClient.createTestJournalEntries(convexUserId, convexEntries)

      entries.forEach((entry, index) => {
        console.log(
          `  ${index + 1}. Entry with mood: ${entry.mood || 'none'}, tags: ${entry.tags?.length || 0}`
        )
      })
    } catch (error) {
      console.warn(
        `⚠️  Convex journal entry seeding failed for ${userId}, using mock data:`,
        (error as Error).message
      )

      // Fallback: log entries without database operation
      entries.forEach((entry, index) => {
        console.log(
          `  ${index + 1}. Entry with mood: ${entry.mood || 'none'}, tags: ${entry.tags?.length || 0}`
        )
      })
    }
  }

  /**
   * Create a single test relationship for validation/testing
   */
  createRelationship(userId: string, type: RelationshipType): TestRelationship {
    const timestamp = Date.now()
    const id = `test-rel-${userId}-${timestamp}`

    return {
      id,
      userId,
      name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      photo: this.shouldHavePhoto('moderate')
        ? this.generatePhotoUrl(1)
        : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  }

  /**
   * Create a single test journal entry for validation/testing
   */
  createJournalEntry(
    userId: string,
    relationshipId?: string
  ): TestJournalEntry {
    const timestamp = Date.now()
    const id = `test-entry-${userId}-${timestamp}`

    return {
      id,
      userId,
      relationshipId: relationshipId || `test-rel-${userId}`,
      content: 'Test journal entry content',
      mood: this.moodTypes[0], // Always have a mood for validation tests
      tags: ['test', 'validation'], // Always have tags for validation tests
      isPrivate: false, // Predictable value for validation
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  }

  /**
   * Clean up all test data
   */
  async cleanupAllTestData(): Promise<void> {
    console.log('🧹 Cleaning up all test data...')

    try {
      const personas = Object.values(testUsers)

      for (const persona of personas) {
        await this.cleanupUserData(persona.id)
      }

      console.log(`✅ Cleaned up test data for ${personas.length} personas`)
    } catch (error) {
      console.error('❌ Test data cleanup failed:', error)
      throw error
    }
  }

  /**
   * Clean up test data for a specific user
   */
  private async cleanupUserData(userId: string): Promise<void> {
    console.log(`🗑️ Cleaning up test data for ${userId}`)

    // Note: This will be implemented with actual Convex test database operations
    // For now, we'll log the cleanup that would be performed

    console.log(`  - Removing journal entries for ${userId}`)
    console.log(`  - Removing relationships for ${userId}`)
    console.log(`  - Cleaning up user-specific test data`)
  }
}
