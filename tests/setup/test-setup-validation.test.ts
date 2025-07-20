/**
 * Test Setup Validation
 *
 * Validates that the test infrastructure is properly configured
 * This test runs without browser launch to validate the setup
 */

import { test, expect } from '@playwright/test'
import { TestEnvironmentManager } from '../helpers/test-environment-manager'
import {
  getAllTestUsers,
  getTestUserCredentials,
} from '../accounts/test-user-personas'

test.describe('Test Setup Validation', () => {
  test('should validate test environment configuration', async () => {
    const envManager = new TestEnvironmentManager()

    await test.step('Check environment variables', async () => {
      expect(process.env.PLAYWRIGHT_BASE_URL).toBeDefined()
      expect(process.env.TEST_ACCOUNT_EMAIL_DOMAIN).toBeDefined()
      expect(process.env.TEST_ACCOUNT_PASSWORD).toBeDefined()
      console.log('✅ Environment variables configured correctly')
    })

    await test.step('Validate test environment manager', async () => {
      await envManager.validateEnvironment()
      console.log('✅ Test environment manager validation passed')
    })
  })

  test('should validate test user personas', async () => {
    await test.step('Check test user creation', async () => {
      const testUsers = getAllTestUsers()
      expect(testUsers).toHaveLength(4)

      const userTypes = testUsers.map(user => user.id)
      expect(userTypes).toContain('new-user')
      expect(userTypes).toContain('active-user')
      expect(userTypes).toContain('power-user')
      expect(userTypes).toContain('edge-case-user')

      console.log('✅ Test user personas configured correctly')
    })

    await test.step('Check test user credentials', async () => {
      const newUserCreds = getTestUserCredentials('newUser')
      expect(newUserCreds.email).toMatch(/@test\.resonant\.local$/)
      expect(newUserCreds.password).toBeDefined()
      expect(newUserCreds.user.id).toBe('new-user')

      console.log('✅ Test user credentials generated correctly')
    })
  })

  test('should validate test data factory', async () => {
    await test.step('Import test data factory', async () => {
      const { TestDataFactory } = await import('../fixtures/test-data-factory')
      const factory = new TestDataFactory()

      expect(factory).toBeDefined()
      console.log('✅ Test data factory imports correctly')
    })

    await test.step('Generate test data samples', async () => {
      const { TestDataFactory } = await import('../fixtures/test-data-factory')
      const factory = new TestDataFactory()

      const relationship = factory.createRelationship('test-user', 'partner')
      expect(relationship.name).toBeDefined()
      expect(relationship.type).toBe('partner')

      const journalEntry = factory.createJournalEntry('test-user')
      expect(journalEntry.content).toBeDefined()
      expect(journalEntry.userId).toBe('test-user')

      console.log('✅ Test data factory generates data correctly')
    })
  })

  test('should validate MCP integration readiness', async () => {
    await test.step('Check MCP browser helper', async () => {
      const { createMCPBrowser } = await import('../helpers/mcp-browser-helper')
      const browser = createMCPBrowser()

      expect(browser).toBeDefined()
      expect(typeof browser.navigate).toBe('function')
      expect(typeof browser.click).toBe('function')
      expect(typeof browser.type).toBe('function')

      console.log('✅ MCP browser helper interface ready')
    })

    await test.step('Check authentication helpers', async () => {
      // Can't instantiate AuthHelpers without a page object
      // But we can validate the module imports correctly
      const authHelpersModule = await import('../helpers/auth-helpers')
      expect(authHelpersModule.AuthHelpers).toBeDefined()

      console.log('✅ Authentication helpers module ready')
    })
  })

  test('should validate test configuration files', async () => {
    await test.step('Check configuration files exist', async () => {
      const fs = await import('fs/promises')
      const path = await import('path')

      // Check that key configuration files exist
      const configFiles = [
        'playwright.config.ts',
        'playwright.mcp.config.ts',
        '.env.test',
      ]

      for (const file of configFiles) {
        const filePath = path.resolve(process.cwd(), file)
        try {
          await fs.access(filePath)
          console.log(`✅ Found ${file}`)
        } catch (error) {
          throw new Error(`Missing configuration file: ${file}`)
        }
      }
    })
  })
})
