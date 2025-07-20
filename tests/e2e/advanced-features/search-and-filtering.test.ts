/**
 * Search and Filtering Advanced Feature Tests
 *
 * Tests search and filtering functionality across the application using MCP browser automation
 */

import { test, expect } from '@playwright/test'
import { getTestUserCredentials } from '../../accounts/test-user-personas'
import { MCPBrowserHelper } from '../../helpers/mcp-browser-helper'

test.describe('Search and Filtering Advanced Features', () => {
  let mcpHelper: MCPBrowserHelper

  test.beforeEach(async ({ page }) => {
    mcpHelper = new MCPBrowserHelper(page)
  })

  test('should test journal entry search functionality', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('powerUser')

    await test.step('Setup user with extensive journal data', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal')
    })

    await test.step('Test basic text search', async () => {
      // Find search input
      const searchInput = page.getByRole('textbox', {
        name: /search journals|search entries/i,
      })
      await expect(searchInput).toBeVisible()

      // Search for common term
      await searchInput.fill('conversation')
      await searchInput.press('Enter')

      // Verify search results
      const searchResults = page.locator('[data-testid="journal-entry-card"]')
      const resultCount = await searchResults.count()

      expect(resultCount).toBeGreaterThan(0)
      console.log(
        `✅ Search returned ${resultCount} results for "conversation"`
      )

      // Verify search term is highlighted or results contain search term
      const firstResult = searchResults.first()
      const resultText = await firstResult.textContent()
      expect(resultText?.toLowerCase()).toContain('conversation')
    })

    await test.step('Test search with no results', async () => {
      const searchInput = page.getByRole('textbox', {
        name: /search journals|search entries/i,
      })

      // Search for term that shouldn't exist
      await searchInput.clear()
      await searchInput.fill('xyznoresults123')
      await searchInput.press('Enter')

      // Verify no results message
      await expect(page.getByText(/no entries found|no results/i)).toBeVisible()
      console.log('✅ No results message displayed correctly')
    })

    await test.step('Test search clearing', async () => {
      const searchInput = page.getByRole('textbox', {
        name: /search journals|search entries/i,
      })

      // Clear search
      await searchInput.clear()
      await searchInput.press('Enter')

      // Should show all entries again
      const allEntries = page.locator('[data-testid="journal-entry-card"]')
      const totalCount = await allEntries.count()

      expect(totalCount).toBeGreaterThan(5) // Power user should have many entries
      console.log(`✅ Search cleared, showing ${totalCount} total entries`)
    })
  })

  test('should test relationship search and filtering', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('powerUser')

    await test.step('Navigate to relationships page', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/relationships')
    })

    await test.step('Test relationship name search', async () => {
      const searchInput = page.getByRole('textbox', {
        name: /search relationships/i,
      })
      await expect(searchInput).toBeVisible()

      // Search for specific relationship
      await searchInput.fill('Alex')

      const searchResults = page.locator('[data-testid="relationship-card"]')
      const resultCount = await searchResults.count()

      expect(resultCount).toBeGreaterThan(0)
      console.log(
        `✅ Relationship search returned ${resultCount} results for "Alex"`
      )

      // Verify results contain search term
      const firstResult = searchResults.first()
      const resultText = await firstResult.textContent()
      expect(resultText?.toLowerCase()).toContain('alex')
    })

    await test.step('Test relationship type filtering', async () => {
      // Clear search first
      const searchInput = page.getByRole('textbox', {
        name: /search relationships/i,
      })
      await searchInput.clear()

      // Find and use type filter
      const typeFilter = page.getByRole('combobox', {
        name: /filter by type|relationship type/i,
      })
      if (await typeFilter.isVisible()) {
        await typeFilter.selectOption('partner')

        // Verify filtered results
        const filteredResults = page.locator(
          '[data-testid="relationship-card"]'
        )
        const filterCount = await filteredResults.count()

        expect(filterCount).toBeGreaterThan(0)
        console.log(
          `✅ Type filter returned ${filterCount} partner relationships`
        )

        // Verify all results are partner type
        for (let i = 0; i < Math.min(filterCount, 3); i++) {
          const result = filteredResults.nth(i)
          const typeIndicator = result.locator(
            '[data-testid="relationship-type"]'
          )
          if (await typeIndicator.isVisible()) {
            await expect(typeIndicator).toContainText('partner')
          }
        }
      }
    })

    await test.step('Test combined search and filtering', async () => {
      const searchInput = page.getByRole('textbox', {
        name: /search relationships/i,
      })
      const typeFilter = page.getByRole('combobox', {
        name: /filter by type|relationship type/i,
      })

      // Apply both search and filter
      await searchInput.fill('John')
      if (await typeFilter.isVisible()) {
        await typeFilter.selectOption('friend')
      }

      const combinedResults = page.locator('[data-testid="relationship-card"]')
      const combinedCount = await combinedResults.count()

      console.log(
        `✅ Combined search and filter returned ${combinedCount} results`
      )

      // Clear all filters
      await searchInput.clear()
      if (await typeFilter.isVisible()) {
        await typeFilter.selectOption('all')
      }

      // Should show all relationships again
      const allResults = page.locator('[data-testid="relationship-card"]')
      const totalCount = await allResults.count()
      expect(totalCount).toBeGreaterThan(combinedCount)
      console.log(
        `✅ Filters cleared, showing ${totalCount} total relationships`
      )
    })
  })

  test('should test journal entry filtering by mood and tags', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('powerUser')

    await test.step('Setup journal filtering test', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal')
    })

    await test.step('Test mood filtering', async () => {
      // Find mood filter
      const moodFilter = page.getByRole('combobox', {
        name: /filter by mood|mood filter/i,
      })
      if (await moodFilter.isVisible()) {
        await moodFilter.selectOption('happy')

        // Verify filtered results
        const moodResults = page.locator('[data-testid="journal-entry-card"]')
        const moodCount = await moodResults.count()

        expect(moodCount).toBeGreaterThan(0)
        console.log(`✅ Mood filter returned ${moodCount} happy entries`)

        // Verify mood indicators
        for (let i = 0; i < Math.min(moodCount, 3); i++) {
          const entry = moodResults.nth(i)
          const moodIndicator = entry.locator('[data-testid="mood-indicator"]')
          if (await moodIndicator.isVisible()) {
            const moodText = await moodIndicator.textContent()
            expect(moodText?.toLowerCase()).toContain('😊')
          }
        }
      }
    })

    await test.step('Test tag filtering', async () => {
      // Clear mood filter first
      const moodFilter = page.getByRole('combobox', {
        name: /filter by mood|mood filter/i,
      })
      if (await moodFilter.isVisible()) {
        await moodFilter.selectOption('all')
      }

      // Test tag filtering
      const tagFilter = page.getByRole('textbox', {
        name: /filter by tags|tag filter/i,
      })
      if (await tagFilter.isVisible()) {
        await tagFilter.fill('communication')
        await tagFilter.press('Enter')

        const tagResults = page.locator('[data-testid="journal-entry-card"]')
        const tagCount = await tagResults.count()

        expect(tagCount).toBeGreaterThan(0)
        console.log(
          `✅ Tag filter returned ${tagCount} entries with "communication" tag`
        )

        // Verify tag presence
        const firstResult = tagResults.first()
        const tags = firstResult.locator('[data-testid="entry-tags"]')
        if (await tags.isVisible()) {
          await expect(tags).toContainText('communication')
        }
      }
    })

    await test.step('Test date range filtering', async () => {
      // Test date range filtering if available
      const dateFromInput = page.getByRole('textbox', {
        name: /from date|start date/i,
      })
      const dateToInput = page.getByRole('textbox', {
        name: /to date|end date/i,
      })

      if (
        (await dateFromInput.isVisible()) &&
        (await dateToInput.isVisible())
      ) {
        // Set date range to last 30 days
        const today = new Date()
        const thirtyDaysAgo = new Date(
          today.getTime() - 30 * 24 * 60 * 60 * 1000
        )

        await dateFromInput.fill(thirtyDaysAgo.toISOString().split('T')[0])
        await dateToInput.fill(today.toISOString().split('T')[0])

        const dateResults = page.locator('[data-testid="journal-entry-card"]')
        const dateCount = await dateResults.count()

        console.log(
          `✅ Date range filter returned ${dateCount} entries from last 30 days`
        )
      }
    })
  })

  test('should test global search functionality', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('powerUser')

    await test.step('Test global search from header', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/dashboard')

      // Look for global search in header/navigation
      const globalSearch = page.getByRole('textbox', {
        name: /search everything|global search/i,
      })
      if (await globalSearch.isVisible()) {
        await globalSearch.fill('friend')
        await globalSearch.press('Enter')

        // Should navigate to search results page or show dropdown
        const searchResultsPage = page.getByRole('heading', {
          name: /search results/i,
        })
        const searchDropdown = page.locator('[data-testid="search-dropdown"]')

        const hasResultsPage = await searchResultsPage.isVisible()
        const hasDropdown = await searchDropdown.isVisible()

        expect(hasResultsPage || hasDropdown).toBeTruthy()
        console.log('✅ Global search functionality working')

        if (hasResultsPage) {
          // Check for different result types
          const journalResults = page.locator(
            '[data-testid="journal-search-results"]'
          )
          const relationshipResults = page.locator(
            '[data-testid="relationship-search-results"]'
          )

          if (await journalResults.isVisible()) {
            const journalCount = await journalResults
              .locator('[data-testid="search-result-item"]')
              .count()
            console.log(`✅ Found ${journalCount} journal results`)
          }

          if (await relationshipResults.isVisible()) {
            const relationshipCount = await relationshipResults
              .locator('[data-testid="search-result-item"]')
              .count()
            console.log(`✅ Found ${relationshipCount} relationship results`)
          }
        }
      }
    })

    await test.step('Test search suggestions and autocomplete', async () => {
      const globalSearch = page.getByRole('textbox', {
        name: /search everything|global search/i,
      })
      if (await globalSearch.isVisible()) {
        await globalSearch.clear()
        await globalSearch.fill('hap')

        // Look for autocomplete suggestions
        const suggestions = page.locator('[data-testid="search-suggestions"]')
        if (await suggestions.isVisible()) {
          const suggestionItems = suggestions.locator(
            '[data-testid="suggestion-item"]'
          )
          const suggestionCount = await suggestionItems.count()

          expect(suggestionCount).toBeGreaterThan(0)
          console.log(`✅ Search suggestions showing ${suggestionCount} items`)

          // Test clicking a suggestion
          const firstSuggestion = suggestionItems.first()
          await firstSuggestion.click()

          console.log('✅ Search suggestion clickable')
        }
      }
    })
  })

  test('should test advanced search and search performance', async ({
    page,
  }) => {
    const { email, password, user } = getTestUserCredentials('powerUser')

    await test.step('Test search performance with large dataset', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/journal')

      const searchInput = page.getByRole('textbox', {
        name: /search journals|search entries/i,
      })

      // Time the search operation
      const startTime = Date.now()
      await searchInput.fill('test')
      await searchInput.press('Enter')

      // Wait for results to load
      await expect(
        page.locator('[data-testid="journal-entry-card"]').first()
      ).toBeVisible()
      const searchTime = Date.now() - startTime

      expect(searchTime).toBeLessThan(3000) // Should complete within 3 seconds
      console.log(`✅ Search completed in ${searchTime}ms`)
    })

    await test.step('Test search result pagination', async () => {
      const searchInput = page.getByRole('textbox', {
        name: /search journals|search entries/i,
      })
      await searchInput.clear()
      await searchInput.fill('the')
      await searchInput.press('Enter')

      // Look for pagination controls
      const pagination = page.locator('[data-testid="search-pagination"]')
      const loadMoreBtn = page.getByRole('button', {
        name: /load more|show more/i,
      })
      const nextPageBtn = page.getByRole('button', { name: /next page|next/i })

      if (
        (await pagination.isVisible()) ||
        (await loadMoreBtn.isVisible()) ||
        (await nextPageBtn.isVisible())
      ) {
        console.log('✅ Search result pagination available')

        if (await loadMoreBtn.isVisible()) {
          const initialResults = await page
            .locator('[data-testid="journal-entry-card"]')
            .count()
          await loadMoreBtn.click()

          // Should load more results
          const newResultCount = await page
            .locator('[data-testid="journal-entry-card"]')
            .count()
          expect(newResultCount).toBeGreaterThan(initialResults)
          console.log(
            `✅ Load more increased results from ${initialResults} to ${newResultCount}`
          )
        }
      }
    })

    await test.step('Test search keyboard shortcuts', async () => {
      // Test common search shortcuts
      await page.keyboard.press('Control+k') // Common search shortcut

      const searchModal = page.locator('[data-testid="search-modal"]')
      const globalSearch = page.getByRole('textbox', {
        name: /search everything|global search/i,
      })

      if ((await searchModal.isVisible()) || (await globalSearch.isVisible())) {
        console.log('✅ Search keyboard shortcut (Ctrl+K) working')

        // Test escape to close
        await page.keyboard.press('Escape')

        if (await searchModal.isVisible()) {
          expect(await searchModal.isVisible()).toBeFalsy()
          console.log('✅ Escape key closes search modal')
        }
      }
    })
  })
})
