'use client'

// Force dynamic rendering to prevent prerender errors with Convex
export const dynamic = 'force-dynamic'

// import { useState } from 'react' // Not currently used
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/button'
import { PrivacySettings } from '@/components/features/data-management/privacy-settings'

export default function PrivacySettingsPage() {
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

      {/* Privacy Settings Component */}
      <PrivacySettings />
    </div>
  )
}
