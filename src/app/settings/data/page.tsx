'use client'

// Force dynamic rendering to prevent prerender errors with Convex
export const dynamic = 'force-dynamic'

// import { useState } from 'react' // Not currently used
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/button'
import dynamicImport from 'next/dynamic'

// Dynamically import the DataExport component to prevent SSR
const DataExport = dynamicImport(
  () =>
    import('@/components/features/data-management/data-export').then(mod => ({
      default: mod.DataExport,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-sm text-gray-600">Loading...</span>
      </div>
    ),
  }
)

export default function DataExportPage() {
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
        </div>
      </div>

      {/* Data Export Component */}
      <DataExport />
    </div>
  )
}
