'use client'

import React from 'react'
import Image from 'next/image'
import { Relationship } from '@/lib/types'
import Button from '@/components/ui/button'
import Card, { CardContent } from '@/components/ui/card'

interface RelationshipCardProps {
  relationship: Relationship
  onEdit?: () => void
  onDelete?: () => void
  showActions?: boolean
}

function RelationshipCard({
  relationship,
  onEdit,
  onDelete,
  showActions = true,
}: RelationshipCardProps) {
  // Format relationship type for display
  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  // Get type-specific styling
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'partner':
        return 'bg-red-100 text-red-800'
      case 'family':
        return 'bg-green-100 text-green-800'
      case 'friend':
        return 'bg-blue-100 text-blue-800'
      case 'colleague':
        return 'bg-purple-100 text-purple-800'
      case 'other':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Format date for display
  const formatDate = (dateString: number) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Profile Photo */}
          <div className="flex-shrink-0">
            {relationship.photo ? (
              <Image
                src={relationship.photo}
                alt={`${relationship.name} photo`}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Relationship Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {relationship.name}
                </h3>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                      relationship.type
                    )}`}
                  >
                    {formatType(relationship.type)}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="mt-3 text-sm text-gray-500">
              <p>Added {formatDate(relationship.createdAt)}</p>
              {relationship.updatedAt !== relationship.createdAt && (
                <p>Updated {formatDate(relationship.updatedAt)}</p>
              )}
            </div>

            {/* Action Buttons */}
            {showActions && (onEdit || onDelete) && (
              <div className="mt-4 flex space-x-2">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span>Edit</span>
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDelete}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Delete</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RelationshipCard
export { RelationshipCard }
