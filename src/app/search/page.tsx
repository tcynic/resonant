'use client'

// Force dynamic rendering to prevent prerender errors with Convex
export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/button'
import ErrorBoundary, {
  NetworkErrorFallback,
} from '@/components/ui/error-boundary'
import dynamicImport from 'next/dynamic'

// Dynamically import the SearchContent component to prevent SSR
const SearchContent = dynamicImport(
  () =>
    import('./search-content').then(mod => ({ default: mod.SearchContent })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-sm text-gray-600">Loading search...</span>
      </div>
    ),
  }
)

export default function SearchPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Search Journal Entries
            </h1>
            <p className="text-gray-600">
              Find specific entries, memories, and insights
            </p>
          </div>
        </div>
      </div>

      {/* Search Content */}
      <ErrorBoundary
        fallback={
          <NetworkErrorFallback onRetry={() => window.location.reload()} />
        }
      >
        <SearchContent />
      </ErrorBoundary>
    </div>
  )
}
