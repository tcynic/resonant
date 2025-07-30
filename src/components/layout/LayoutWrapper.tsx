'use client'

import { usePathname } from 'next/navigation'
import AppShell from './AppShell'

interface LayoutWrapperProps {
  children: React.ReactNode
}

// Define routes that should use AppShell (authenticated routes)
const AUTHENTICATED_ROUTES = [
  '/dashboard',
  '/journal',
  '/relationships',
  '/insights',
  '/profile',
  '/settings',
  '/search',
]

// Define routes that should not use AppShell (public routes)
const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/', '/test-journal-demo']

function shouldUseAppShell(pathname: string): boolean {
  // Check if current path starts with any authenticated route
  const isAuthenticatedRoute = AUTHENTICATED_ROUTES.some(route =>
    pathname.startsWith(route)
  )

  // Check if current path is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(
    route => pathname === route || (route !== '/' && pathname.startsWith(route))
  )

  // Use AppShell for authenticated routes, but not for public routes
  return isAuthenticatedRoute && !isPublicRoute
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  const useAppShell = shouldUseAppShell(pathname)

  if (useAppShell) {
    return <AppShell>{children}</AppShell>
  }

  // For public routes, render children directly
  return <>{children}</>
}
