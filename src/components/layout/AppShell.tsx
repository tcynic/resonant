'use client'

import React from 'react'
import { useUser, RedirectToSignIn } from '@clerk/nextjs'
import { NavigationProvider } from './NavigationProvider'
import { AppShellProps } from './types'
import AppNavBar from './AppNavBar'

// Loading spinner component
function LoadingSpinner() {
  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gray-50"
      role="status"
      aria-label="Loading application"
    >
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Main layout content
function AppShellContent({
  children,
  showSidebar = true,
  showNavbar = true,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar placeholder - will be implemented in future stories */}
      {showSidebar && (
        <aside
          className="w-64 bg-white shadow-sm border-r border-gray-200"
          aria-label="Sidebar navigation"
        >
          <div className="p-4">
            <div className="text-sm text-gray-500">Sidebar (placeholder)</div>
          </div>
        </aside>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Navigation bar */}
        {showNavbar && <AppNavBar />}

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

// AppShell component with authentication
export default function AppShell({
  children,
  showSidebar = true,
  showNavbar = true,
}: AppShellProps) {
  const { user, isLoaded } = useUser()

  // Show loading spinner while authentication is loading
  if (!isLoaded) {
    return <LoadingSpinner />
  }

  // Redirect to sign-in if user is not authenticated
  if (!user) {
    return <RedirectToSignIn />
  }

  // Render authenticated layout with navigation provider
  return (
    <NavigationProvider>
      <AppShellContent showSidebar={showSidebar} showNavbar={showNavbar}>
        {children}
      </AppShellContent>
    </NavigationProvider>
  )
}
