'use client'

import React, { memo, useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useUser, SignOutButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { useNavigation } from './NavigationProvider'

// Navigation items configuration
const NAVIGATION_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { label: 'Journal', href: '/journal', icon: '📝' },
  { label: 'Relationships', href: '/relationships', icon: '👥' },
  { label: 'Insights', href: '/insights', icon: '📊' },
] as const

interface AppNavBarProps {
  className?: string
}

// User menu dropdown component
function UserMenu() {
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Handle escape key to close menu
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeMenu()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen, closeMenu])

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="user-menu-dropdown"
        className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {user.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={`${user.firstName} ${user.lastName}`}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
            {user.firstName?.[0]}
            {user.lastName?.[0]}
          </div>
        )}
        <span className="hidden md:block">
          {user.firstName} {user.lastName}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div
            id="user-menu-dropdown"
            role="menu"
            aria-hidden={!isOpen}
            className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            <Link
              href="/profile"
              role="menuitem"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={closeMenu}
            >
              Profile
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={closeMenu}
            >
              Settings
            </Link>
            <div className="border-t border-gray-100">
              <SignOutButton>
                <button
                  role="menuitem"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign Out
                </button>
              </SignOutButton>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Global search component placeholder
function GlobalSearch() {
  const [searchQuery, setSearchQuery] = useState('')

  React.useEffect(() => {
    const keydownHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.getElementById('global-search')
        searchInput?.focus()
      }
    }

    document.addEventListener('keydown', keydownHandler)
    return () => {
      document.removeEventListener('keydown', keydownHandler)
    }
  }, [])

  return (
    <div className="relative flex-1 max-w-md mx-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          id="global-search"
          type="search"
          placeholder="Search everything..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-16 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-flex items-center px-2 font-sans text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded">
            ⌘K
          </kbd>
        </div>
      </div>
    </div>
  )
}

// Notification indicator component
function NotificationIndicator() {
  const { state } = useNavigation()
  const { notifications } = state

  return (
    <button
      className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
      aria-label={`Notifications (${notifications.unread} unread)`}
    >
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {notifications.unread > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
          {notifications.unread > 99 ? '99+' : notifications.unread}
        </span>
      )}
    </button>
  )
}

// Mobile menu button
function MobileMenuButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-expanded={isOpen}
      aria-controls="mobile-menu"
      className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      aria-label="Toggle navigation menu"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        {isOpen ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        )}
      </svg>
    </button>
  )
}

// Navigation link component
function NavLink({
  href,
  children,
  className = '',
  onClick,
}: {
  href: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  const pathname = usePathname()
  const { addRecentItem, updateBreadcrumbs } = useNavigation()
  const isActive = pathname === href

  const handleClick = useCallback(() => {
    // Update navigation state
    addRecentItem({
      id: `nav-${Date.now()}`,
      type: 'journal', // This would be dynamic based on the route
      title: children as string,
      href,
      timestamp: Date.now(),
    })

    // Update breadcrumbs
    updateBreadcrumbs([{ label: children as string, href, isActive: true }])

    // Call additional onClick if provided
    onClick?.()
  }, [href, children, addRecentItem, updateBreadcrumbs, onClick])

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-current={isActive ? 'page' : undefined}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'text-blue-700 bg-blue-100'
          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
      } ${className}`}
    >
      {children}
    </Link>
  )
}

// Main AppNavBar component
const AppNavBar = memo(function AppNavBar({ className = '' }: AppNavBarProps) {
  const { user, isLoaded } = useUser()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  // Memoize navigation items
  const navigationItems = useMemo(() => NAVIGATION_ITEMS, [])

  // Don't render until authentication is loaded
  if (!isLoaded) {
    return (
      <nav
        className={`bg-white shadow-sm border-b border-gray-200 ${className}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="animate-pulse flex space-x-4">
              <div className="h-8 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  // Don't render if user is not authenticated (handled by AppShell)
  if (!user) return null

  return (
    <header
      role="banner"
      className={`bg-white shadow-sm border-b border-gray-200 ${className}`}
    >
      <nav role="navigation" aria-label="Top navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side: Logo and main navigation */}
            <div className="flex items-center">
              {/* Brand logo */}
              <Link
                href="/dashboard"
                className="flex-shrink-0 flex items-center"
                aria-label="Resonant - Go to dashboard"
              >
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">R</span>
                </div>
                <span className="ml-2 text-xl font-semibold text-gray-900 hidden sm:block">
                  Resonant
                </span>
              </Link>

              {/* Desktop navigation */}
              <div className="hidden md:ml-8 md:flex md:space-x-1">
                {navigationItems.map(({ label, href, icon }) => (
                  <NavLink key={href} href={href}>
                    <span className="mr-1">{icon}</span>
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Center: Global search (desktop only) */}
            <div className="hidden md:flex md:items-center md:flex-1 md:justify-center">
              <GlobalSearch />
            </div>

            {/* Right side: Notifications and user menu */}
            <div className="flex items-center space-x-2">
              <NotificationIndicator />
              <UserMenu />
              <MobileMenuButton
                isOpen={mobileMenuOpen}
                onClick={toggleMobileMenu}
              />
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden border-t border-gray-200 bg-white"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Mobile search */}
              <div className="px-3 py-2">
                <GlobalSearch />
              </div>

              {/* Mobile navigation */}
              {navigationItems.map(({ label, href, icon }) => (
                <NavLink
                  key={href}
                  href={href}
                  className="block px-3 py-2"
                  onClick={closeMobileMenu}
                >
                  <span className="mr-2">{icon}</span>
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
})

export default AppNavBar
