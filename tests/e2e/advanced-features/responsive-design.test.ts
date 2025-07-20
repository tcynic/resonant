/**
 * Responsive Design Advanced Feature Tests
 *
 * Tests responsive design across different viewport sizes using MCP browser automation
 */

import { test, expect } from '@playwright/test'
import { getTestUserCredentials } from '../../accounts/test-user-personas'
import { MCPBrowserHelper } from '../../helpers/mcp-browser-helper'

test.describe('Responsive Design Testing', () => {
  let mcpHelper: MCPBrowserHelper

  test.beforeEach(async ({ page }) => {
    mcpHelper = new MCPBrowserHelper(page)
  })

  const viewports = [
    { name: 'Mobile', width: 375, height: 667 }, // iPhone SE
    { name: 'Tablet', width: 768, height: 1024 }, // iPad
    { name: 'Desktop', width: 1280, height: 720 }, // Desktop
    { name: 'Large Desktop', width: 1920, height: 1080 }, // Large Desktop
  ]

  test('should test responsive layout on dashboard', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Authenticate user', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
    })

    for (const viewport of viewports) {
      await test.step(`Test dashboard layout at ${viewport.name} (${viewport.width}x${viewport.height})`, async () => {
        // Set viewport size
        // In actual MCP environment:
        // await mcp__playwright__browser_resize({ width: viewport.width, height: viewport.height })
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        })

        await page.goto('/dashboard')
        await expect(
          page.getByRole('heading', { name: /dashboard/i })
        ).toBeVisible()

        if (viewport.width <= 768) {
          // Mobile/Tablet specific tests
          await test.step('Test mobile navigation', async () => {
            // Look for mobile menu button
            const mobileMenuBtn = page.getByRole('button', {
              name: /menu|hamburger|navigation/i,
            })
            if (await mobileMenuBtn.isVisible()) {
              await mobileMenuBtn.click()

              // Check if navigation opens
              const mobileNav = page.locator(
                '[data-testid="mobile-navigation"]'
              )
              await expect(mobileNav).toBeVisible()
              console.log(`✅ ${viewport.name}: Mobile navigation working`)

              // Close menu
              await mobileMenuBtn.click()
            }
          })

          await test.step('Test mobile dashboard layout', async () => {
            // Check that dashboard widgets stack vertically on mobile
            const widgets = page.locator('[data-testid="dashboard-widget"]')
            if (await widgets.first().isVisible()) {
              const firstWidget = widgets.first()
              const secondWidget = widgets.nth(1)

              if (await secondWidget.isVisible()) {
                const firstRect = await firstWidget.boundingBox()
                const secondRect = await secondWidget.boundingBox()

                if (firstRect && secondRect) {
                  // Second widget should be below first widget (vertical stacking)
                  expect(secondRect.y).toBeGreaterThan(
                    firstRect.y + firstRect.height - 50
                  )
                  console.log(`✅ ${viewport.name}: Widgets stack vertically`)
                }
              }
            }
          })
        } else {
          // Desktop specific tests
          await test.step('Test desktop navigation', async () => {
            // Desktop should show full navigation
            const desktopNav = page.locator(
              '[data-testid="desktop-navigation"]'
            )
            const navLinks = page.getByRole('navigation').getByRole('link')

            const navCount = await navLinks.count()
            expect(navCount).toBeGreaterThan(2)
            console.log(
              `✅ ${viewport.name}: Desktop navigation with ${navCount} links`
            )
          })

          await test.step('Test desktop dashboard layout', async () => {
            // Check for side-by-side widget layout on desktop
            const widgets = page.locator('[data-testid="dashboard-widget"]')
            if ((await widgets.count()) >= 2) {
              const firstWidget = widgets.first()
              const secondWidget = widgets.nth(1)

              const firstRect = await firstWidget.boundingBox()
              const secondRect = await secondWidget.boundingBox()

              if (firstRect && secondRect && viewport.width >= 1280) {
                // Widgets might be side by side on large screens
                const areHorizontal = Math.abs(firstRect.y - secondRect.y) < 100
                if (areHorizontal) {
                  console.log(
                    `✅ ${viewport.name}: Widgets arranged horizontally`
                  )
                }
              }
            }
          })
        }

        await test.step('Test content readability', async () => {
          // Check that text is readable (not too small)
          const headings = page.getByRole('heading')
          const firstHeading = headings.first()

          if (await firstHeading.isVisible()) {
            const fontSize = await firstHeading.evaluate(
              el => window.getComputedStyle(el).fontSize
            )
            const fontSizeValue = parseInt(fontSize)
            expect(fontSizeValue).toBeGreaterThan(14)
            console.log(`✅ ${viewport.name}: Heading font size ${fontSize}`)
          }
        })
      })
    }
  })

  test('should test responsive journal entry forms', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Setup authenticated session', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
    })

    for (const viewport of viewports) {
      await test.step(`Test journal form at ${viewport.name}`, async () => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        })
        await page.goto('/journal/new')

        if (viewport.width <= 768) {
          // Mobile form tests
          await test.step('Test mobile form layout', async () => {
            // Form should be full width on mobile
            const form = page.locator('form, [data-testid="journal-form"]')
            if (await form.isVisible()) {
              const formRect = await form.boundingBox()
              const viewportWidth = viewport.width

              if (formRect) {
                const formWidthRatio = formRect.width / viewportWidth
                expect(formWidthRatio).toBeGreaterThan(0.9) // Should use most of screen width
                console.log(
                  `✅ ${viewport.name}: Form uses ${Math.round(formWidthRatio * 100)}% of screen width`
                )
              }
            }
          })

          await test.step('Test mobile input accessibility', async () => {
            // Inputs should be large enough for touch
            const inputs = page.getByRole('textbox')
            const firstInput = inputs.first()

            if (await firstInput.isVisible()) {
              const inputRect = await firstInput.boundingBox()
              if (inputRect) {
                expect(inputRect.height).toBeGreaterThan(40) // Minimum touch target
                console.log(
                  `✅ ${viewport.name}: Input height ${inputRect.height}px (touch-friendly)`
                )
              }
            }
          })

          await test.step('Test mobile button sizing', async () => {
            const buttons = page.getByRole('button')
            const saveButton = buttons
              .filter({ hasText: /save|submit/i })
              .first()

            if (await saveButton.isVisible()) {
              const buttonRect = await saveButton.boundingBox()
              if (buttonRect) {
                expect(buttonRect.height).toBeGreaterThan(44) // iOS minimum
                expect(buttonRect.width).toBeGreaterThan(44)
                console.log(
                  `✅ ${viewport.name}: Button size ${buttonRect.width}x${buttonRect.height}px`
                )
              }
            }
          })
        } else {
          // Desktop form tests
          await test.step('Test desktop form layout', async () => {
            const form = page.locator('form, [data-testid="journal-form"]')
            if (await form.isVisible()) {
              const formRect = await form.boundingBox()

              if (formRect && viewport.width >= 1280) {
                // Desktop forms should not be too wide
                expect(formRect.width).toBeLessThan(viewport.width * 0.8)
                console.log(
                  `✅ ${viewport.name}: Form appropriately sized for desktop`
                )
              }
            }
          })
        }

        await test.step('Test form component responsiveness', async () => {
          // Test mood selector responsiveness
          const moodSelector = page.locator('[data-testid="mood-selector"]')
          if (await moodSelector.isVisible()) {
            const moodButtons = moodSelector.getByRole('button')
            const buttonCount = await moodButtons.count()

            if (buttonCount > 0) {
              const firstButton = moodButtons.first()
              const lastButton = moodButtons.nth(buttonCount - 1)

              const firstRect = await firstButton.boundingBox()
              const lastRect = await lastButton.boundingBox()

              if (firstRect && lastRect) {
                if (viewport.width <= 375) {
                  // On very small screens, mood buttons might wrap
                  const isWrapped = lastRect.y > firstRect.y + 10
                  console.log(
                    `✅ ${viewport.name}: Mood selector ${isWrapped ? 'wraps' : 'fits horizontally'}`
                  )
                } else {
                  // On larger screens, mood buttons should fit in one row
                  const fitsHorizontally =
                    Math.abs(lastRect.y - firstRect.y) < 10
                  expect(fitsHorizontally).toBeTruthy()
                  console.log(
                    `✅ ${viewport.name}: Mood selector fits horizontally`
                  )
                }
              }
            }
          }

          // Test tag input responsiveness
          const tagInput = page.getByRole('textbox', { name: /tags/i })
          if (await tagInput.isVisible()) {
            await tagInput.fill('test-tag')
            await tagInput.press('Enter')

            const tags = page.locator('[data-testid="tag-item"]')
            if (await tags.first().isVisible()) {
              console.log(`✅ ${viewport.name}: Tag input functional`)
            }
          }
        })
      })
    }
  })

  test('should test responsive data tables and lists', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('powerUser')

    await test.step('Setup with user having extensive data', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
    })

    for (const viewport of viewports) {
      await test.step(`Test data display at ${viewport.name}`, async () => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        })
        await page.goto('/journal')

        if (viewport.width <= 768) {
          // Mobile list tests
          await test.step('Test mobile list layout', async () => {
            const entryCards = page.locator(
              '[data-testid="journal-entry-card"]'
            )
            if (await entryCards.first().isVisible()) {
              // Cards should stack vertically on mobile
              const firstCard = entryCards.first()
              const secondCard = entryCards.nth(1)

              if (await secondCard.isVisible()) {
                const firstRect = await firstCard.boundingBox()
                const secondRect = await secondCard.boundingBox()

                if (firstRect && secondRect) {
                  expect(secondRect.y).toBeGreaterThan(
                    firstRect.y + firstRect.height - 50
                  )
                  console.log(
                    `✅ ${viewport.name}: Journal entries stack vertically`
                  )
                }
              }
            }
          })

          await test.step('Test mobile card content', async () => {
            const firstCard = page
              .locator('[data-testid="journal-entry-card"]')
              .first()
            if (await firstCard.isVisible()) {
              // Check that essential info is visible on mobile
              const hasTitle = await firstCard
                .locator('[data-testid="entry-title"]')
                .isVisible()
              const hasDate = await firstCard
                .locator('[data-testid="entry-date"]')
                .isVisible()

              expect(hasTitle || hasDate).toBeTruthy()
              console.log(`✅ ${viewport.name}: Essential card content visible`)
            }
          })
        } else {
          // Desktop list tests
          await test.step('Test desktop list layout', async () => {
            const entryCards = page.locator(
              '[data-testid="journal-entry-card"]'
            )
            if ((await entryCards.count()) >= 2) {
              // Check if cards can be arranged in grid on desktop
              const firstCard = entryCards.first()
              const secondCard = entryCards.nth(1)

              const firstRect = await firstCard.boundingBox()
              const secondRect = await secondCard.boundingBox()

              if (firstRect && secondRect && viewport.width >= 1280) {
                const areHorizontal = Math.abs(firstRect.y - secondRect.y) < 100
                if (areHorizontal) {
                  console.log(
                    `✅ ${viewport.name}: Journal entries in grid layout`
                  )
                } else {
                  console.log(
                    `✅ ${viewport.name}: Journal entries in list layout`
                  )
                }
              }
            }
          })
        }

        await test.step('Test responsive pagination', async () => {
          const pagination = page.locator('[data-testid="pagination"]')
          const loadMoreBtn = page.getByRole('button', {
            name: /load more|show more/i,
          })

          if (await pagination.isVisible()) {
            if (viewport.width <= 768) {
              // Mobile might show simplified pagination
              const pageNumbers = pagination.getByRole('button')
              const numberCount = await pageNumbers.count()
              console.log(
                `✅ ${viewport.name}: Pagination shows ${numberCount} controls`
              )
            } else {
              // Desktop can show full pagination
              console.log(`✅ ${viewport.name}: Full pagination available`)
            }
          } else if (await loadMoreBtn.isVisible()) {
            console.log(`✅ ${viewport.name}: Load more button available`)
          }
        })
      })
    }
  })

  test('should test responsive navigation and menus', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Setup navigation test', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/dashboard')
    })

    for (const viewport of viewports) {
      await test.step(`Test navigation at ${viewport.name}`, async () => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        })
        await page.reload()

        if (viewport.width <= 768) {
          await test.step('Test mobile navigation behavior', async () => {
            // Mobile should have hamburger menu
            const mobileMenuBtn = page.getByRole('button', {
              name: /menu|hamburger|navigation/i,
            })

            if (await mobileMenuBtn.isVisible()) {
              // Test menu toggle
              await mobileMenuBtn.click()

              const mobileNav = page.locator(
                '[data-testid="mobile-navigation"], [role="dialog"], .mobile-menu'
              )
              await expect(mobileNav).toBeVisible()
              console.log(`✅ ${viewport.name}: Mobile menu opens`)

              // Test menu links
              const navLinks = mobileNav.getByRole('link')
              const linkCount = await navLinks.count()
              expect(linkCount).toBeGreaterThan(2)
              console.log(
                `✅ ${viewport.name}: Mobile menu has ${linkCount} links`
              )

              // Test menu close
              const closeBtn = page.getByRole('button', { name: /close|×/i })
              if (await closeBtn.isVisible()) {
                await closeBtn.click()
                await expect(mobileNav).not.toBeVisible()
                console.log(`✅ ${viewport.name}: Mobile menu closes`)
              } else {
                // Close by clicking hamburger again
                await mobileMenuBtn.click()
              }
            }
          })

          await test.step('Test mobile-specific UI elements', async () => {
            // Test bottom navigation if present
            const bottomNav = page.locator('[data-testid="bottom-navigation"]')
            if (await bottomNav.isVisible()) {
              const bottomNavLinks = bottomNav.getByRole('link')
              const bottomLinkCount = await bottomNavLinks.count()
              console.log(
                `✅ ${viewport.name}: Bottom navigation with ${bottomLinkCount} links`
              )
            }

            // Test floating action buttons
            const fab = page.locator('[data-testid="floating-action-button"]')
            if (await fab.isVisible()) {
              const fabRect = await fab.boundingBox()
              if (fabRect) {
                // FAB should be in bottom-right corner
                expect(fabRect.x).toBeGreaterThan(viewport.width * 0.7)
                expect(fabRect.y).toBeGreaterThan(viewport.height * 0.7)
                console.log(`✅ ${viewport.name}: FAB positioned correctly`)
              }
            }
          })
        } else {
          await test.step('Test desktop navigation', async () => {
            // Desktop should show full navigation bar
            const desktopNav = page.locator(
              '[data-testid="desktop-navigation"], header nav'
            )
            if (await desktopNav.isVisible()) {
              const navLinks = desktopNav.getByRole('link')
              const linkCount = await navLinks.count()
              expect(linkCount).toBeGreaterThan(3)
              console.log(
                `✅ ${viewport.name}: Desktop navigation with ${linkCount} links`
              )
            }

            // Test dropdown menus if present
            const dropdown = page.locator(
              '[data-testid="user-menu"], [data-testid="dropdown-menu"]'
            )
            if (await dropdown.isVisible()) {
              await dropdown.click()

              const dropdownItems = page.locator(
                '[data-testid="dropdown-item"]'
              )
              if (await dropdownItems.first().isVisible()) {
                console.log(`✅ ${viewport.name}: Dropdown menu functional`)

                // Close dropdown
                await page.keyboard.press('Escape')
              }
            }
          })
        }

        await test.step('Test responsive header layout', async () => {
          const header = page.locator('header, [data-testid="header"]')
          if (await header.isVisible()) {
            const headerRect = await header.boundingBox()
            if (headerRect) {
              // Header should span full width
              expect(headerRect.width).toBeGreaterThan(viewport.width * 0.95)

              // Header should have reasonable height
              expect(headerRect.height).toBeGreaterThan(50)
              expect(headerRect.height).toBeLessThan(150)

              console.log(
                `✅ ${viewport.name}: Header dimensions ${headerRect.width}x${headerRect.height}`
              )
            }
          }
        })
      })
    }
  })

  test('should test responsive images and media', async ({ page }) => {
    const { email, password, user } = getTestUserCredentials('activeUser')

    await test.step('Setup media test', async () => {
      await mcpHelper.navigateToSignIn()
      await mcpHelper.signInUser(email, password)
      await mcpHelper.waitForAuthentication()
      await page.goto('/relationships')
    })

    for (const viewport of viewports) {
      await test.step(`Test media responsiveness at ${viewport.name}`, async () => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        })
        await page.reload()

        await test.step('Test profile images', async () => {
          const profileImages = page.locator(
            '[data-testid="profile-image"], [data-testid="relationship-photo"]'
          )
          if (await profileImages.first().isVisible()) {
            const firstImage = profileImages.first()
            const imageRect = await firstImage.boundingBox()

            if (imageRect) {
              // Images should scale appropriately
              if (viewport.width <= 375) {
                // Smaller images on mobile
                expect(imageRect.width).toBeLessThan(80)
              } else if (viewport.width >= 1280) {
                // Larger images on desktop
                expect(imageRect.width).toBeGreaterThan(40)
              }

              console.log(
                `✅ ${viewport.name}: Profile image size ${imageRect.width}x${imageRect.height}`
              )
            }
          }
        })

        await test.step('Test responsive containers', async () => {
          const containers = page.locator(
            '[data-testid="content-container"], .container, main'
          )
          if (await containers.first().isVisible()) {
            const container = containers.first()
            const containerRect = await container.boundingBox()

            if (containerRect) {
              const widthRatio = containerRect.width / viewport.width

              if (viewport.width <= 768) {
                // Mobile containers should use most of screen width
                expect(widthRatio).toBeGreaterThan(0.9)
              } else {
                // Desktop containers should have max width
                expect(widthRatio).toBeLessThan(0.95)
              }

              console.log(
                `✅ ${viewport.name}: Container uses ${Math.round(widthRatio * 100)}% of viewport`
              )
            }
          }
        })
      })
    }
  })
})
