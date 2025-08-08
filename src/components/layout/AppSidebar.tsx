'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useNavigation } from './NavigationProvider'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

export default function AppSidebar() {
  const { state, toggleSidebar, setCurrentRoute, setSidebarCollapsed } = useNavigation()
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname?.() as string | undefined

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Sync current route from Next.js router if available
  useEffect(() => {
    if (pathname) {
      setCurrentRoute?.(pathname)
    }
  }, [pathname, setCurrentRoute])

  const primaryNavItems: NavItem[] = useMemo(
    () => [
      { label: 'Dashboard', href: '/dashboard', icon: (props) => (
        <svg {...props} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 3h4v6H3V3zm5 0h9v4H8V3zM3 10h4v7H3v-7zm5 5h9v2H8v-2z"/></svg>
      ) },
      { label: 'Journal', href: '/journal', icon: (props) => (
        <svg {...props} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M4 3h10a2 2 0 012 2v12H4a2 2 0 01-2-2V5a2 2 0 012-2zm2 3h8v2H6V6z"/></svg>
      ) },
      { label: 'Relationships', href: '/relationships', icon: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0v1H5v-1z"/></svg>
      ) },
      { label: 'Insights', href: '/insights', icon: (props) => (
        <svg {...props} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2 11h4v7H2v-7zm6-4h4v11H8V7zm6-6h4v17h-4V1z"/></svg>
      ) },
      { label: 'Search', href: '/search', icon: (props) => (
        <svg {...props} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387-1.414 1.414-4.387-4.387zM8 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd"/></svg>
      ) },
    ],
    []
  )

  const secondaryNavItems: NavItem[] = useMemo(
    () => [
      { label: 'Settings', href: '/settings', icon: (props) => (
        <svg {...props} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M11.3 1.046l.84 1.68 1.86.27-.9 1.75.43 1.84-1.7-.83-1.7.83.43-1.84-.9-1.75 1.86-.27.84-1.68zM10 7a3 3 0 110 6 3 3 0 010-6z"/></svg>
      ) },
      { label: 'Profile', href: '/profile', icon: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0v1H5v-1z"/></svg>
      ) },
      { label: 'Help/Support', href: '/help', icon: (props) => (
        <svg {...props} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9 13h2v2H9v-2zm1-9a3 3 0 00-3 3h2a1 1 0 112 0c0 .552-.448 1-1 1a2 2 0 00-2 2v1h2v-.382a1 1 0 01.553-.894C11.243 9.474 12 8.608 12 7a3 3 0 00-2-3z"/></svg>
      ) },
    ],
    []
  )

  const quickActions: NavItem[] = useMemo(
    () => [
      { label: 'New Journal Entry', href: '/journal/new', icon: (props) => (
        <svg {...props} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 3v14m7-7H3" stroke="currentColor" strokeWidth="2"/></svg>
      ) },
      { label: 'Add Relationship', href: '/relationships/new', icon: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0v1H5v-1zM19 10h2v2h-2v2h-2v-2h-2v-2h2V8h2v2z"/></svg>
      ) },
      { label: 'View Latest Insights', href: '/insights', icon: (props) => (
        <svg {...props} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2 11h4v7H2v-7zm6-4h4v11H8V7zm6-6h4v17h-4V1z"/></svg>
      ) },
      { label: 'Search Everything', href: '/search', icon: (props) => (
        <svg {...props} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.387-1.414 1.414-4.387-4.387zM8 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd"/></svg>
      ) },
    ],
    []
  )

  const handleToggle = useCallback(() => {
    toggleSidebar()
  }, [toggleSidebar])

  const handleNavigate = useCallback(
    (href: string) => {
      setCurrentRoute?.(href)
    },
    [setCurrentRoute]
  )

  return (
    <aside
      role="complementary"
      aria-label="Main sidebar navigation"
      aria-expanded={!state.sidebarCollapsed}
      className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 shadow-lg transition-transform transition-all duration-300 ease-in-out ${state.sidebarCollapsed ? 'w-16' : 'w-64'} md:relative md:z-auto ${isMobile && state.sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}`}
    >
      <div className="flex items-center justify-between p-4">
        <h2 className={`text-lg font-semibold text-gray-900 ${state.sidebarCollapsed ? 'hidden' : 'block'}`}>Navigation</h2>
        <button
          onClick={handleToggle}
          className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={state.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!state.sidebarCollapsed}
        >
          <span className="sr-only">Toggle sidebar</span>
          <svg className={`h-5 w-5 transition-transform duration-200 ${state.sidebarCollapsed ? 'rotate-180' : 'rotate-0'}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.293 15.707a1 1 0 010-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <nav className="mt-4" aria-label="Primary sidebar navigation">
        {primaryNavItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => handleNavigate(item.href)}
            className={`group flex items-center gap-3 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${state.currentRoute === item.href ? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-600' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
            aria-current={state.currentRoute === item.href ? 'page' : undefined}
          >
            {item.icon && (
              <item.icon className={`h-5 w-5 ${state.currentRoute === item.href ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
            )}
            <span className={`${state.sidebarCollapsed ? 'hidden' : 'block'}`}>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Quick Actions */}
      <div className="px-4 py-6 border-t border-gray-200">
        <h3
          className={`text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 ${state.sidebarCollapsed ? 'hidden' : 'block'}`}
        >
          Quick Actions
        </h3>
        <div className="space-y-2">
          {quickActions.map(action => (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              onClick={() => handleNavigate(action.href)}
              aria-label={action.label}
              title={action.label}
            >
              {action.icon && (
                <action.icon className={`h-5 w-5 text-gray-400 group-hover:text-gray-600`} />
              )}
              <span className={`${state.sidebarCollapsed ? 'hidden' : 'block'}`}>
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Items */}
      {state.userPreferences.showRecentItems && (
        <div className="px-4 py-6 border-t border-gray-200">
          <h3
            className={`text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 ${state.sidebarCollapsed ? 'hidden' : 'block'}`}
          >
            Recent Items
          </h3>
          <div className="space-y-2">
            {state.recentItems.slice(0, 5).map(item => (
              <Link
                key={item.id}
                href={item.href}
                className="group flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onClick={() => handleNavigate(item.href)}
              >
                {item.photoUrl && !state.sidebarCollapsed && (
                  <img src={item.photoUrl} alt="" className="h-6 w-6 rounded-full object-cover" aria-hidden="true" />
                )}
                <div className={`${state.sidebarCollapsed ? 'hidden' : 'block'}`}>
                  <div className="text-sm font-medium truncate max-w-[160px]">
                    {item.title}
                  </div>
                </div>
              </Link>
            ))}
            {state.recentItems.length > 5 && (
              <Link
                href="/recent"
                className={`text-xs text-indigo-600 hover:text-indigo-500 px-3 py-1 ${state.sidebarCollapsed ? 'hidden' : 'block'}`}
              >
                View all recent items
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-gray-200" />

      <nav className="mt-4" aria-label="Secondary sidebar navigation">
        {secondaryNavItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => handleNavigate(item.href)}
            className={`flex items-center px-4 py-3 text-sm font-medium ${state.currentRoute === item.href ? 'bg-indigo-50 text-indigo-600 border-r-2 border-indigo-600' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <span className={`${state.sidebarCollapsed ? 'hidden' : 'block'}`}>{item.label}</span>
          </Link>
        ))}
      </nav>
      {/* Mobile overlay */}
      {isMobile && !state.sidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black opacity-20 md:hidden"
          data-testid="mobile-overlay"
          aria-hidden="true"
          onClick={() => setSidebarCollapsed?.(true)}
        />
      )}
    </aside>
  )
}


