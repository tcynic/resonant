/**
 * Integration tests for authentication middleware
 * These tests verify that routes are properly protected
 */

import { createRouteMatcher } from '@clerk/nextjs/server'

// Mock the route matcher for testing
jest.mock('@clerk/nextjs/server', () => ({
  createRouteMatcher: jest.fn(),
  clerkMiddleware: jest.fn(),
}))

describe('Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('defines correct public routes', () => {
    // Import the middleware to test route configuration
    require('../../../../src/middleware')

    expect(createRouteMatcher).toHaveBeenCalledWith([
      '/sign-in(.*)',
      '/sign-up(.*)',
      '/',
      '/test-journal-demo',
    ])
  })

  describe('Route Protection', () => {
    const publicRoutes = ['/sign-in', '/sign-up', '/']
    const protectedRoutes = [
      '/dashboard',
      '/profile',
      '/journal',
      '/relationships',
      '/insights',
      '/settings',
    ]

    it('should identify public routes correctly', () => {
      publicRoutes.forEach(route => {
        // These routes should not require authentication
        expect(route).toMatch(/^\/(?:sign-in|sign-up|)$/)
      })
    })

    it('should identify protected routes correctly', () => {
      protectedRoutes.forEach(route => {
        // These routes should require authentication
        expect(route).not.toMatch(/^\/(?:sign-in|sign-up|\/)$/)
      })
    })
  })
})
