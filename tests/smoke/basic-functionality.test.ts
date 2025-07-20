/**
 * Basic Smoke Tests for CI/CD Pipeline
 * Quick validation that core functionality is working
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Basic Functionality', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads without errors
    await expect(page).toHaveTitle(/Resonant/);
    
    // Verify basic page structure
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    
    console.log('✅ Homepage smoke test passed');
  });

  test('authentication pages are accessible', async ({ page }) => {
    // Test sign-in page
    await page.goto('/sign-in');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    // Test sign-up page
    await page.goto('/sign-up');
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
    
    console.log('✅ Authentication pages smoke test passed');
  });

  test('protected routes redirect to authentication', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/dashboard');
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);
    
    console.log('✅ Protected route redirection smoke test passed');
  });

  test('static assets load correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check for any network errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push(`Failed to load: ${response.url()} (${response.status()})`);
      }
    });
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check for errors
    expect(errors).toHaveLength(0);
    
    console.log('✅ Static assets smoke test passed');
  });

  test('responsive design basics work', async ({ page }) => {
    await page.goto('/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Verify page is still functional
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(1000);
    
    await expect(heading).toBeVisible();
    
    console.log('✅ Responsive design smoke test passed');
  });

  test('environment configuration is correct', async ({ page }) => {
    // Check that we're in the correct environment
    const isTest = process.env.NODE_ENV === 'test' || process.env.CI === 'true';
    expect(isTest).toBeTruthy();
    
    // Verify test URLs don't contain production domains
    await page.goto('/');
    const url = page.url();
    expect(url).not.toContain('resonant.app');
    expect(url).not.toContain('production');
    
    console.log('✅ Environment configuration smoke test passed');
  });
});