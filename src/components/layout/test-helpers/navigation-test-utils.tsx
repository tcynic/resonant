import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ClerkProvider } from '@clerk/nextjs'
import { NavigationProvider } from '../NavigationProvider'
import { NavigationState } from '../types'

// Mock Clerk provider for testing
const MockClerkProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider
      publishableKey="pk_test_mock"
      appearance={{
        elements: {
          formButtonPrimary: 'bg-blue-600',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}

// Custom render function that includes NavigationProvider
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withClerk?: boolean
}

function customRender(
  ui: React.ReactElement,
  { withClerk = false, ...renderOptions }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    const content = withClerk ? (
      <MockClerkProvider>
        <NavigationProvider>{children}</NavigationProvider>
      </MockClerkProvider>
    ) : (
      <NavigationProvider>{children}</NavigationProvider>
    )

    return content
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock user data for testing
export const mockUser = {
  id: 'user_123',
  firstName: 'Test',
  lastName: 'User',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
  imageUrl: 'https://example.com/avatar.jpg',
}

// Mock Clerk hook implementations
export const mockUseUser = {
  user: mockUser,
  isLoaded: true,
  isSignedIn: true,
}

// Navigation test data
export const mockNavigationState: NavigationState = {
  currentRoute: '/dashboard',
  sidebarCollapsed: false,
  recentItems: [
    {
      id: 'item1',
      type: 'journal',
      title: 'Test Journal Entry',
      href: '/journal/1',
      timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    },
    {
      id: 'item2',
      type: 'relationship',
      title: 'Test Relationship',
      href: '/relationships/1',
      timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
      photoUrl: 'https://example.com/photo.jpg',
    },
  ],
  notifications: {
    total: 3,
    unread: 2,
    types: {
      reminders: 1,
      insights: 1,
      system: 1,
    },
  },
  userPreferences: {
    sidebarDefaultCollapsed: false,
    showRecentItems: true,
    maxRecentItems: 10,
  },
  breadcrumbs: [
    {
      label: 'Dashboard',
      href: '/dashboard',
      isActive: false,
    },
    {
      label: 'Current Page',
      href: '/dashboard/current',
      isActive: true,
    },
  ],
}

// Export everything
export * from '@testing-library/react'
export { customRender as render }
export { MockClerkProvider }
