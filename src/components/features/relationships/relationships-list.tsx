'use client'

import React, { useState, useMemo } from 'react'
import { useRelationships } from '@/hooks/use-relationships'
import { RelationshipType, Relationship } from '@/lib/types'
import Input from '@/components/ui/input'
import Select from '@/components/ui/select'
import Button from '@/components/ui/button'
import RelationshipCard from './relationship-card'

interface RelationshipsListProps {
  onCreateNew?: () => void
  onEdit?: (relationshipId: string) => void
  onDelete?: (relationshipId: string) => void
}

function RelationshipsList({
  onCreateNew,
  onEdit,
  onDelete,
}: RelationshipsListProps) {
  const { relationships, isLoading } = useRelationships()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<RelationshipType | 'all'>('all')

  // Filter and search relationships
  const filteredRelationships = useMemo(() => {
    return relationships.filter((relationship: Relationship) => {
      const matchesSearch = relationship.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesType =
        filterType === 'all' || relationship.type === filterType
      return matchesSearch && matchesType
    })
  }, [relationships, searchTerm, filterType])

  // Relationship type options for filter
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'partner', label: 'Partner' },
    { value: 'family', label: 'Family' },
    { value: 'friend', label: 'Friend' },
    { value: 'colleague', label: 'Colleague' },
    { value: 'other', label: 'Other' },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="loading-skeleton">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Relationships</h2>
          <p className="text-gray-600">
            Manage your relationships ({relationships.length} total)
          </p>
        </div>
        {onCreateNew && (
          <Button onClick={onCreateNew} variant="primary">
            Add Relationship
          </Button>
        )}
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search relationships..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="sm:w-48">
          <Select
            value={filterType}
            onChange={e =>
              setFilterType(e.target.value as RelationshipType | 'all')
            }
            options={typeOptions}
            placeholder="Filter by type"
          />
        </div>
      </div>

      {/* Results Count */}
      {filteredRelationships.length !== relationships.length && (
        <p className="text-sm text-gray-600">
          Showing {filteredRelationships.length} of {relationships.length}{' '}
          relationships
        </p>
      )}

      {/* Relationships Grid */}
      {filteredRelationships.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRelationships.map((relationship: Relationship) => (
            <RelationshipCard
              key={relationship._id}
              relationship={relationship}
              onEdit={onEdit ? () => onEdit(relationship._id) : undefined}
              onDelete={onDelete ? () => onDelete(relationship._id) : undefined}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          {searchTerm || filterType !== 'all' ? (
            /* No Results State */
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No relationships found
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Try adjusting your search terms or filter criteria to find what
                you&apos;re looking for.
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm('')
                  setFilterType('all')
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            /* No Relationships State */
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No relationships yet
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Start building your relationship journal by adding your first
                relationship.
              </p>
              {onCreateNew && (
                <Button onClick={onCreateNew} variant="primary">
                  Add Your First Relationship
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RelationshipsList
export { RelationshipsList }
