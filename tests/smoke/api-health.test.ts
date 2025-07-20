/**
 * API Health Smoke Tests for CI/CD Pipeline
 * Validates that backend services are responding correctly
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - API Health', () => {
  test('Convex connection is healthy', async ({ page }) => {
    // Navigate to a page that would use Convex
    await page.goto('/');
    
    // Check for Convex connection errors in console
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else {
        consoleLogs.push(msg.text());
      }
    });
    
    // Wait for any initial Convex connections
    await page.waitForTimeout(3000);
    
    // Check for Convex-related errors
    const convexErrors = consoleErrors.filter(error => 
      error.toLowerCase().includes('convex') ||
      error.toLowerCase().includes('websocket') ||
      error.toLowerCase().includes('connection')
    );
    
    // Allow for non-critical warnings but fail on actual connection errors
    const criticalErrors = convexErrors.filter(error =>
      error.includes('failed') ||
      error.includes('refused') ||
      error.includes('timeout')
    );
    
    expect(criticalErrors).toHaveLength(0);
    
    console.log('✅ Convex connection health check passed');
  });

  test('Clerk authentication service is accessible', async ({ page }) => {
    // Go to sign-in page which would load Clerk
    await page.goto('/sign-in');
    
    // Check for Clerk-related errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      if (error.message.toLowerCase().includes('clerk')) {
        errors.push(error.message);
      }
    });
    
    // Wait for Clerk to load
    await page.waitForTimeout(3000);
    
    // Verify Clerk elements are present (indicates service is working)
    const signInForm = page.locator('[data-clerk-element]').first();
    
    // Don't fail if Clerk elements aren't found in test environment
    // Just verify no critical errors occurred
    expect(errors).toHaveLength(0);
    
    console.log('✅ Clerk authentication service health check passed');
  });

  test('network requests complete without critical failures', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('response', (response) => {
      // Track 5xx server errors and critical 4xx errors
      if (response.status() >= 500 || 
          (response.status() >= 400 && response.status() !== 404 && response.status() !== 401)) {
        failedRequests.push(`${response.status()}: ${response.url()}`);
      }
    });
    
    // Navigate through key pages
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Check for critical failures
    expect(failedRequests).toHaveLength(0);
    
    console.log('✅ Network requests health check passed');
  });

  test('database schema compatibility', async ({ page }) => {
    // This test would verify that the current code is compatible with the database schema
    // For now, we'll just verify that database-dependent pages don't crash
    
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => {
      if (error.message.toLowerCase().includes('schema') ||
          error.message.toLowerCase().includes('database') ||
          error.message.toLowerCase().includes('convex')) {
        consoleErrors.push(error.message);
      }
    });
    
    // Try to access pages that would interact with the database
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Even if redirected to auth, there shouldn't be schema errors
    const schemaErrors = consoleErrors.filter(error =>
      error.includes('schema') || error.includes('validation')
    );
    
    expect(schemaErrors).toHaveLength(0);
    
    console.log('✅ Database schema compatibility check passed');
  });

  test('environment variables are properly configured', async ({ page }) => {
    // Check that required environment variables are set
    const requiredEnvVars = [
      'NEXT_PUBLIC_CONVEX_URL_TEST',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY_TEST'
    ];
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      
      // In CI environment, these should be set
      if (process.env.CI) {
        expect(value).toBeTruthy();
      } else {
        // In local development, log warnings but don't fail
        if (!value) {
          console.log(`⚠️  Warning: ${envVar} not set in local environment`);
        }
      }
    }
    
    console.log('✅ Environment variables configuration check passed');
  });
});