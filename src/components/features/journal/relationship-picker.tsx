'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useRelationships } from '@/hooks/use-relationships'
// import { Relationship } from '@/lib/types'

interface RelationshipPickerProps {
  value: string[]
  onChange: (relationshipIds: string[]) => void
  label?: string
  error?: string
  multiple?: boolean
  required?: boolean
}

export default function RelationshipPicker({
  value = [],
  onChange,
  label = 'Select Relationships',
  error,
  multiple = true,
  required = false,
}: RelationshipPickerProps) {
  const { relationships, isLoading } = useRelationships()
  const [isOpen, setIsOpen] = useState(false)

  const handleRelationshipToggle = (relationshipId: string) => {
    if (multiple) {
      if (value.includes(relationshipId)) {
        onChange(value.filter(id => id !== relationshipId))
      } else {
        onChange([...value, relationshipId])
      }
    } else {
      onChange([relationshipId])
      setIsOpen(false)
    }
  }

  const selectedRelationships = relationships.filter(rel =>
    value.includes(rel._id)
  )

  const getDisplayText = () => {
    if (value.length === 0) {
      return multiple ? 'Select relationships...' : 'Select a relationship...'
    }
    if (multiple && value.length > 1) {
      return `${value.length} relationships selected`
    }
    return selectedRelationships[0]?.name || 'Unknown relationship'
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-md"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full px-3 py-2 text-left border rounded-md shadow-sm text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${error ? 'border-red-300' : 'border-gray-300'}
            ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
            bg-white
          `}
        >
          <div className="flex justify-between items-center">
            <span
              className={value.length === 0 ? 'text-gray-400' : 'text-gray-900'}
            >
              {getDisplayText()}
            </span>
            <svg
              className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {relationships.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No relationships found. Create some relationships first.
              </div>
            ) : (
              relationships.map(relationship => (
                <div
                  key={relationship._id}
                  onClick={() => handleRelationshipToggle(relationship._id)}
                  className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {multiple && (
                    <input
                      type="checkbox"
                      checked={value.includes(relationship._id)}
                      onChange={() => {}} // Handled by parent onClick
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded mr-3"
                    />
                  )}
                  <div className="flex items-center space-x-3 flex-1">
                    {relationship.photo ? (
                      <Image
                        src={relationship.photo}
                        alt={`${relationship.name} photo`}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {relationship.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {relationship.name}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {relationship.type}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected relationships display for multiple selection */}
      {multiple && value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedRelationships.map(relationship => (
            <span
              key={relationship._id}
              className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-blue-100 text-blue-800"
            >
              {relationship.name}
              <button
                type="button"
                onClick={() => handleRelationshipToggle(relationship._id)}
                className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
