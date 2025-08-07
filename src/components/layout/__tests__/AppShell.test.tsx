import React from 'react'
import { render, screen } from '../test-helpers/navigation-test-utils'
import { useUser } from '@clerk/nextjs'
import AppShell from '../AppShell'

// Mock Clerk's useUser hook
jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
  RedirectToSignIn: () => (
    <div data-testid="redirect-signin">Redirecting to sign in...</div>
  ),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}))

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>

describe('AppShell', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading spinner when authentication is loading', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: false,
      isSignedIn: false,
    } as any)

    render(
      <AppShell>
        <div>Test Content</div>
      </AppShell>
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading application')).toBeInTheDocument()
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument()
  })

  it('should redirect to sign in when user is not authenticated', () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    })

    render(
      <AppShell>
        <div>Test Content</div>
      </AppShell>
    )

    expect(screen.getByTestId('redirect-signin')).toBeInTheDocument()
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument()
  })

  it('should render children when user is authenticated', () => {
    const mockUser = {
      id: 'user_123',
      firstName: 'Test',
      lastName: 'User',
    } as any

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    })

    render(
      <AppShell>
        <div>Test Content</div>
      </AppShell>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByTestId('redirect-signin')).not.toBeInTheDocument()
  })

  it('should render sidebar and navbar by default', () => {
    const mockUser = {
      id: 'user_123',
      firstName: 'Test',
      lastName: 'User',
    } as any

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    })

    render(
      <AppShell>
        <div>Test Content</div>
      </AppShell>
    )

    expect(screen.getByLabelText('Sidebar navigation')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('Sidebar (placeholder)')).toBeInTheDocument()
    expect(screen.getByLabelText('Top navigation')).toBeInTheDocument()
  })

  it('should hide sidebar when showSidebar is false', () => {
    const mockUser = {
      id: 'user_123',
      firstName: 'Test',
      lastName: 'User',
    } as any

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    })

    render(
      <AppShell showSidebar={false}>
        <div>Test Content</div>
      </AppShell>
    )

    expect(
      screen.queryByLabelText('Sidebar navigation')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Sidebar (placeholder)')).not.toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should hide navbar when showNavbar is false', () => {
    const mockUser = {
      id: 'user_123',
      firstName: 'Test',
      lastName: 'User',
    } as any

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    })

    render(
      <AppShell showNavbar={false}>
        <div>Test Content</div>
      </AppShell>
    )

    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByText('Navbar (placeholder)')).not.toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    const mockUser = {
      id: 'user_123',
      firstName: 'Test',
      lastName: 'User',
    } as any

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    })

    render(
      <AppShell>
        <div>Test Content</div>
      </AppShell>
    )

    // Check ARIA labels
    expect(screen.getByLabelText('Sidebar navigation')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
