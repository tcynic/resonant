'use client'

import React from 'react'
import { RelationshipType } from '@/lib/types'
import Select from '@/components/ui/select'

interface RelationshipTypeSelectorProps {
  value: RelationshipType
  onChange: (type: RelationshipType) => void
  label?: string
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

const relationshipTypeOptions = [
  {
    value: 'partner',
    label: 'Partner',
    description: 'Romantic partner, spouse, significant other',
  },
  {
    value: 'family',
    label: 'Family',
    description: 'Parents, siblings, children, relatives',
  },
  {
    value: 'friend',
    label: 'Friend',
    description: 'Close friends, acquaintances',
  },
  {
    value: 'colleague',
    label: 'Colleague',
    description: 'Work relationships, professional contacts',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Any other type of relationship',
  },
]

export default function RelationshipTypeSelector({
  value,
  onChange,
  label = 'Relationship Type',
  error,
  required = false,
  disabled = false,
  className = '',
}: RelationshipTypeSelectorProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as RelationshipType)
  }

  const selectOptions = relationshipTypeOptions.map(option => ({
    value: option.value,
    label: option.label,
  }))

  return (
    <div className={className}>
      <Select
        label={label}
        value={value}
        onChange={handleChange}
        options={selectOptions}
        error={error}
        required={required}
        disabled={disabled}
        placeholder="Select a relationship type"
      />

      {/* Type Description */}
      {value && !error && (
        <div className="mt-1">
          <p className="text-xs text-gray-500">
            {
              relationshipTypeOptions.find(option => option.value === value)
                ?.description
            }
          </p>
        </div>
      )}
    </div>
  )
}

// Export the options for use in other components
export { relationshipTypeOptions }
