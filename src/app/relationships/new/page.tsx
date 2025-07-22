'use client'

import React from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect, useRouter } from 'next/navigation'
import RelationshipForm from '@/components/features/relationships/relationship-form'
import ErrorBoundary, {
  NetworkErrorFallback,
} from '@/components/ui/error-boundary'

export default function NewRelationshipPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  // Redirect if not authenticated
  if (isLoaded && !user) {
    redirect('/sign-in')
  }

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  const handleSuccess = () => {
    router.push('/relationships')
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Add New Relationship
        </h1>
        <p className="text-gray-600">
          Create a new relationship to start tracking your interactions and
          journal entries.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <ErrorBoundary
          fallback={
            <NetworkErrorFallback onRetry={() => window.location.reload()} />
          }
        >
          <RelationshipForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            isModal={false}
          />
        </ErrorBoundary>
      </div>
    </div>
  )
}
