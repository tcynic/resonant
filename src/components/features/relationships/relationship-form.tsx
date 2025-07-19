'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { CreateRelationshipSchema } from '@/lib/validations'
import {
  CreateRelationshipData,
  UpdateRelationshipData,
  RelationshipType,
  Relationship,
} from '@/lib/types'
import { useRelationshipMutations } from '@/hooks/use-relationships'
// Removed Convex Id import for testing compatibility
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import Select from '@/components/ui/select'

interface RelationshipFormProps {
  relationship?: Relationship
  onSuccess?: (relationshipId: string) => void
  onCancel?: () => void
  isModal?: boolean
}

const relationshipTypeOptions = [
  { value: 'partner', label: 'Partner' },
  { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'other', label: 'Other' },
]

export default function RelationshipForm({
  relationship,
  onSuccess,
  onCancel,
  isModal = false,
}: RelationshipFormProps) {
  const { createRelationship, updateRelationship, isReady } =
    useRelationshipMutations()
  const isEditing = !!relationship

  // Form state
  const [formData, setFormData] = useState<CreateRelationshipData>({
    name: relationship?.name || '',
    type: relationship?.type || 'friend',
    photo: relationship?.photo || '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    relationship?.photo || null
  )

  // Handle form field changes
  const handleChange = (field: keyof CreateRelationshipData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  // Handle photo upload
  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, photo: 'Please select an image file' }))
        return
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, photo: 'Image must be less than 5MB' }))
        return
      }

      // Create preview
      const reader = new FileReader()
      reader.onload = e => {
        const dataUrl = e.target?.result as string
        setPhotoPreview(dataUrl)
        setFormData(prev => ({ ...prev, photo: dataUrl }))
        setErrors(prev => ({ ...prev, photo: '' }))
      }
      reader.readAsDataURL(file)
    }
  }

  // Remove photo
  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    setFormData(prev => ({ ...prev, photo: '' }))
    // Reset file input
    const fileInput = document.getElementById(
      'photo-upload'
    ) as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    try {
      CreateRelationshipSchema.parse(formData)
      setErrors({})
      return true
    } catch (error: unknown) {
      const validationErrors: Record<string, string> = {}
      if (error && typeof error === 'object' && 'errors' in error) {
        const zodError = error as {
          errors: Array<{ path: Array<string | number>; message: string }>
        }
        zodError.errors?.forEach(err => {
          validationErrors[err.path[0]] = err.message
        })
      }
      setErrors(validationErrors)
      return false
    }
  }

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!isReady) {
      setErrors({ submit: 'Please wait for authentication...' })
      return
    }

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      let relationshipId: string

      if (isEditing && relationship) {
        const updateData: UpdateRelationshipData = {
          name: formData.name !== relationship.name ? formData.name : undefined,
          type: formData.type !== relationship.type ? formData.type : undefined,
          photo:
            formData.photo !== relationship.photo ? formData.photo : undefined,
        }

        await updateRelationship(relationship._id, updateData)
        relationshipId = relationship._id
      } else {
        relationshipId = await createRelationship(formData)
      }

      onSuccess?.(relationshipId)

      // Reset form if not editing
      if (!isEditing) {
        setFormData({ name: '', type: 'friend', photo: '' })
        setPhotoPreview(null)
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save relationship'
      setErrors({ submit: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Field */}
      <Input
        label="Relationship Name"
        type="text"
        value={formData.name}
        onChange={e => handleChange('name', e.target.value)}
        placeholder="Enter name (e.g., John, Mom, Best Friend)"
        error={errors.name}
        required
      />

      {/* Type Field */}
      <Select
        label="Relationship Type"
        value={formData.type}
        onChange={e => handleChange('type', e.target.value as RelationshipType)}
        options={relationshipTypeOptions}
        error={errors.type}
        required
      />

      {/* Photo Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Photo (Optional)
        </label>

        {photoPreview ? (
          <div className="flex items-center space-x-4">
            <Image
              src={photoPreview}
              alt="Relationship photo preview"
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
            />
            <Button
              type="button"
              variant="ghost"
              onClick={handleRemovePhoto}
              className="text-red-600 hover:text-red-700"
            >
              Remove Photo
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <label
              htmlFor="photo-upload"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-gray-600">
                Click to upload a photo
              </span>
              <span className="text-xs text-gray-500">PNG, JPG up to 5MB</span>
            </label>
          </div>
        )}

        {errors.photo && <p className="text-sm text-red-600">{errors.photo}</p>}
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      {/* Form Actions */}
      <div
        className={`flex ${isModal ? 'justify-end' : 'justify-start'} space-x-3`}
      >
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={!isReady || isSubmitting}
        >
          {isSubmitting
            ? isEditing
              ? 'Updating...'
              : 'Creating...'
            : isEditing
              ? 'Update Relationship'
              : 'Create Relationship'}
        </Button>
      </div>
    </form>
  )
}
