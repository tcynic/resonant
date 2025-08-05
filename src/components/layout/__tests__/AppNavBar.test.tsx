import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useUser } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import AppNavBar from '../AppNavBar'
import { NavigationProvider } from '../NavigationProvider'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
  SignOutButton: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sign-out-button">{children}</div>
  ),
}))

// Mock useNavigation hook
const mockNavigationState = {
  currentRoute: '/',
  sidebarCollapsed: false,
  recentItems: [],
  notifications: {
    total: 5,
    unread: 3,
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
  breadcrumbs: [],
}

const mockNavigationActions = {
  dispatch: jest.fn(),
  toggleSidebar: jest.fn(),
  addRecentItem: jest.fn(),
  removeRecentItem: jest.fn(),
  updateBreadcrumbs: jest.fn(),
  updateNotifications: jest.fn(),
  updatePreferences: jest.fn(),
}

const mockUseNavigation = () => ({
  state: mockNavigationState,
  addRecentItem: mockNavigationActions.addRecentItem,
  updateBreadcrumbs: mockNavigationActions.updateBreadcrumbs,
  dispatch: mockNavigationActions.dispatch,
  toggleSidebar: mockNavigationActions.toggleSidebar,
  removeRecentItem: mockNavigationActions.removeRecentItem,
  updateNotifications: mockNavigationActions.updateNotifications,
  updatePreferences: mockNavigationActions.updatePreferences,
})

jest.mock('../NavigationProvider', () => ({
  NavigationProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useNavigation: () => mockUseNavigation(),
}))

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <NavigationProvider>{children}</NavigationProvider>
}

// Mock user data
const mockUser = {
  id: 'user1',
  firstName: 'John',
  lastName: 'Doe',
  imageUrl: 'https://example.com/avatar.jpg',
  emailAddresses: [{ emailAddress: 'john@example.com' }],
}

describe('AppNavBar', () => {
  const mockUseUser = useUser as jest.MockedFunction<typeof useUser>
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    } as any)
    mockUsePathname.mockReturnValue('/')

    // Restore the useNavigation mock
    const navModule = jest.requireMock('../NavigationProvider')
    navModule.useNavigation = mockUseNavigation
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading skeleton when authentication is not loaded', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: false,
        isSignedIn: false,
      } as any)

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByRole('navigation')).toHaveClass(
        'bg-white',
        'shadow-sm'
      )
    })

    it('should not render when user is not authenticated', () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      } as any)

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Items', () => {
    it('should render all main navigation items', () => {
      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Journal')).toBeInTheDocument()
      expect(screen.getByText('Relationships')).toBeInTheDocument()
      expect(screen.getByText('Insights')).toBeInTheDocument()
    })

    it('should have correct href attributes for navigation links', () => {
      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute(
        'href',
        '/dashboard'
      )
      expect(screen.getByText('Journal').closest('a')).toHaveAttribute(
        'href',
        '/journal'
      )
      expect(screen.getByText('Relationships').closest('a')).toHaveAttribute(
        'href',
        '/relationships'
      )
      expect(screen.getByText('Insights').closest('a')).toHaveAttribute(
        'href',
        '/insights'
      )
    })

    it('should highlight active navigation item', () => {
      mockUsePathname.mockReturnValue('/dashboard')

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink).toHaveAttribute('aria-current', 'page')
      expect(dashboardLink).toHaveClass('text-blue-700', 'bg-blue-100')
    })

    it('should call navigation actions when clicking links', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const journalLink = screen.getByText('Journal')
      await user.click(journalLink)

      // Check that navigation actions were called
      expect(mockNavigationActions.addRecentItem).toHaveBeenCalled()
      expect(mockNavigationActions.updateBreadcrumbs).toHaveBeenCalled()

      // Verify the calls were made with journal data
      expect(mockNavigationActions.addRecentItem).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'journal',
          href: '/journal',
          // Note: title contains React elements, not just text
        })
      )

      expect(mockNavigationActions.updateBreadcrumbs).toHaveBeenCalledWith([
        { label: 'Journal', href: '/journal', isActive: true },
      ])
    })
  })

  describe('Brand Logo', () => {
    it('should render brand logo with correct link', () => {
      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const logoLink = screen.getByLabelText('Resonant - Go to dashboard')
      expect(logoLink).toHaveAttribute('href', '/dashboard')
      expect(screen.getByText('R')).toBeInTheDocument()
      expect(screen.getByText('Resonant')).toBeInTheDocument()
    })
  })

  describe('User Menu', () => {
    it('should display user information when authenticated', () => {
      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /john doe/i })
      ).toBeInTheDocument()
    })

    it('should display user initials when no image is provided', () => {
      mockUseUser.mockReturnValue({
        user: { ...mockUser, imageUrl: null },
        isLoaded: true,
        isSignedIn: true,
      } as any)

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('should show user menu options on click', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const userMenuButton = screen.getByRole('button', { name: /john doe/i })
      await user.click(userMenuButton)

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
        expect(screen.getByText('Sign Out')).toBeInTheDocument()
      })
    })

    it('should close user menu when clicking outside', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      // Open menu
      const userMenuButton = screen.getByRole('button', { name: /john doe/i })
      await user.click(userMenuButton)

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument()
      })

      // Click the overlay to close menu
      const overlay = document.querySelector('[aria-hidden="true"]')
      if (overlay) {
        fireEvent.click(overlay)
      }

      await waitFor(() => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument()
      })
    })

    it('should have proper ARIA attributes', () => {
      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const userMenuButton = screen.getByRole('button', { name: /john doe/i })
      expect(userMenuButton).toHaveAttribute('aria-expanded', 'false')
      expect(userMenuButton).toHaveAttribute('aria-haspopup', 'menu')
      expect(userMenuButton).toHaveAttribute(
        'aria-controls',
        'user-menu-dropdown'
      )
    })
  })

  describe('Global Search', () => {
    it('should render search input with keyboard shortcut hint', () => {
      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText(/search everything/i)
      expect(searchInput).toBeInTheDocument()
      expect(screen.getByText('⌘K')).toBeInTheDocument()
    })

    it('should focus search input on Ctrl+K', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      await user.keyboard('{Control>}k{/Control}')

      const searchInput = screen.getByPlaceholderText(/search everything/i)
      expect(searchInput).toHaveFocus()
    })

    it('should focus search input on Cmd+K', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      await user.keyboard('{Meta>}k{/Meta}')

      const searchInput = screen.getByPlaceholderText(/search everything/i)
      expect(searchInput).toHaveFocus()
    })

    it('should update search query on input change', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText(/search everything/i)
      await user.type(searchInput, 'test query')

      expect(searchInput).toHaveValue('test query')
    })
  })

  describe('Notifications', () => {
    it('should display notification badge with unread count', () => {
      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      expect(screen.getByText('3')).toBeInTheDocument()
      expect(
        screen.getByLabelText(/notifications.*3 unread/i)
      ).toBeInTheDocument()
    })

    it('should display 99+ for counts over 99', () => {
      // Override the mock for this specific test
      const navModule = jest.requireMock('../NavigationProvider')
      navModule.useNavigation = jest.fn(() => ({
        state: {
          ...mockNavigationState,
          notifications: {
            ...mockNavigationState.notifications,
            unread: 150,
          },
        },
        ...mockNavigationActions,
      }))

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      expect(screen.getByText('99+')).toBeInTheDocument()
    })

    it('should not display badge when no unread notifications', () => {
      // Override the mock for this specific test
      const navModule = jest.requireMock('../NavigationProvider')
      navModule.useNavigation = jest.fn(() => ({
        state: {
          ...mockNavigationState,
          notifications: {
            ...mockNavigationState.notifications,
            unread: 0,
          },
        },
        ...mockNavigationActions,
      }))

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      expect(screen.queryByText('0')).not.toBeInTheDocument()
      expect(
        screen.getByLabelText(/notifications.*0 unread/i)
      ).toBeInTheDocument()
    })
  })

  describe('Mobile Responsive', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      })
    })

    it('should show hamburger menu button on mobile', () => {
      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      expect(
        screen.getByLabelText(/toggle navigation menu/i)
      ).toBeInTheDocument()
    })

    it('should open mobile menu on hamburger click', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const hamburgerButton = screen.getByLabelText(/toggle navigation menu/i)
      await user.click(hamburgerButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { expanded: true })
        ).toBeInTheDocument()
      })
    })

    it('should show navigation items in mobile menu', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const hamburgerButton = screen.getByLabelText(/toggle navigation menu/i)
      await user.click(hamburgerButton)

      await waitFor(() => {
        const mobileMenu = screen
          .getByRole('button', { expanded: true })
          .closest('nav')
          ?.querySelector('#mobile-menu')
        expect(mobileMenu).toBeInTheDocument()
      })
    })

    it('should close mobile menu when clicking navigation link', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      // Open mobile menu
      const hamburgerButton = screen.getByLabelText(/toggle navigation menu/i)
      await user.click(hamburgerButton)

      await waitFor(() => {
        expect(hamburgerButton).toHaveAttribute('aria-expanded', 'true')
      })

      // Find mobile menu and click a link in it
      const mobileMenu = screen
        .getByRole('navigation')
        .querySelector('#mobile-menu')
      expect(mobileMenu).toBeInTheDocument()

      // Click a navigation link in mobile menu
      const journalLinks = screen.getAllByText(/journal/i)
      const mobileJournalLink = journalLinks.find(link =>
        link.closest('#mobile-menu')
      )

      if (mobileJournalLink) {
        await user.click(mobileJournalLink)
      }

      await waitFor(() => {
        expect(hamburgerButton).toHaveAttribute('aria-expanded', 'false')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      expect(screen.getByRole('navigation')).toHaveAttribute(
        'aria-label',
        'Top navigation'
      )

      const userMenuButton = screen.getByRole('button', { name: /john doe/i })
      expect(userMenuButton).toHaveAttribute('aria-haspopup', 'menu')
      expect(userMenuButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      // Tab through navigation items
      await user.keyboard('{Tab}')
      expect(screen.getByLabelText('Resonant - Go to dashboard')).toHaveFocus()

      await user.keyboard('{Tab}')
      expect(screen.getByText('Dashboard').closest('a')).toHaveFocus()

      await user.keyboard('{Tab}')
      expect(screen.getByText('Journal').closest('a')).toHaveFocus()
    })

    it('should handle Enter key for user menu', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const userMenuButton = screen.getByRole('button', { name: /john doe/i })
      userMenuButton.focus()

      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument()
      })
    })

    it('should handle Escape key to close user menu', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      // Open menu
      const userMenuButton = screen.getByRole('button', { name: /john doe/i })
      await user.click(userMenuButton)

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument()
      })

      // Press Escape
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByText('Profile')).not.toBeInTheDocument()
      })
    })
  })

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(
        <TestWrapper>
          <AppNavBar className="custom-nav-class" />
        </TestWrapper>
      )

      expect(screen.getByRole('banner')).toHaveClass('custom-nav-class')
    })
  })

  describe('Performance', () => {
    it('should memoize navigation items', () => {
      const { rerender } = render(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const initialNavItems = screen.getAllByRole('link')

      // Re-render with same props
      rerender(
        <TestWrapper>
          <AppNavBar />
        </TestWrapper>
      )

      const rerenderNavItems = screen.getAllByRole('link')
      expect(rerenderNavItems).toHaveLength(initialNavItems.length)
    })
  })
})
