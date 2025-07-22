'use client'

import React, { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import RelationshipsList from '@/components/features/relationships/relationships-list'
import RelationshipForm from '@/components/features/relationships/relationship-form'
import DeleteRelationshipModal from '@/components/features/relationships/delete-relationship-modal'
import Modal from '@/components/ui/modal'
import ErrorBoundary, {
  NetworkErrorFallback,
} from '@/components/ui/error-boundary'
import { useRelationships } from '@/hooks/use-relationships'
import { Relationship } from '@/lib/types'

export default function RelationshipsPage() {
  const { user, isLoaded } = useUser()
  const { relationships } = useRelationships()

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedRelationship, setSelectedRelationship] =
    useState<Relationship | null>(null)

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Event handlers
  const handleCreateNew = () => {
    setIsCreateModalOpen(true)
  }

  const handleEdit = (relationshipId: string) => {
    const relationship = relationships.find(
      (r: Relationship) => r._id === relationshipId
    )
    if (relationship) {
      setSelectedRelationship(relationship)
      setIsEditModalOpen(true)
    }
  }

  const handleDelete = (relationshipId: string) => {
    const relationship = relationships.find(
      (r: Relationship) => r._id === relationshipId
    )
    if (relationship) {
      setSelectedRelationship(relationship)
      setIsDeleteModalOpen(true)
    }
  }

  const handleFormSuccess = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setSelectedRelationship(null)
  }

  const handleDeleteSuccess = () => {
    setIsDeleteModalOpen(false)
    setSelectedRelationship(null)
  }

  const handleCloseModals = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setIsDeleteModalOpen(false)
    setSelectedRelationship(null)
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Main Content */}
      <ErrorBoundary
        fallback={
          <NetworkErrorFallback onRetry={() => window.location.reload()} />
        }
      >
        <RelationshipsList
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </ErrorBoundary>

      {/* Create Relationship Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModals}
        title="Add New Relationship"
      >
        <ErrorBoundary>
          <RelationshipForm
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModals}
            isModal={true}
          />
        </ErrorBoundary>
      </Modal>

      {/* Edit Relationship Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        title="Edit Relationship"
      >
        <ErrorBoundary>
          <RelationshipForm
            relationship={selectedRelationship || undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleCloseModals}
            isModal={true}
          />
        </ErrorBoundary>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ErrorBoundary>
        <DeleteRelationshipModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseModals}
          relationship={selectedRelationship}
          onSuccess={handleDeleteSuccess}
        />
      </ErrorBoundary>
    </div>
  )
}
