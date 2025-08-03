'use client'

import React, { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { CreateRelationshipSchema } from '@/lib/validations'
import {
  CreateRelationshipData,
  UpdateRelationshipData,
  RelationshipType,
  Relationship,
} from '@/lib/types'
import { useRelationshipMutations } from '@/hooks/use-relationships'
import { useDebounce } from '@/hooks/use-debounce'
import {
  FILE_UPLOAD_ERRORS,
  FORM_ERRORS,
  AUTH_ERRORS,
  API_ERRORS,
} from '@/lib/constants/error-messages'
// Removed Convex Id import for testing compatibility
import Button from '@/components/ui/button'
import Input from '@/components/ui/input'
import Select from '@/components/ui/select'

// Constants
const FORM_SUCCESS_DELAY = 1000 // 1 second
const FORM_RESET_DELAY = 1500 // 1.5 seconds
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MIN_FILE_SIZE = 100 // 100 bytes
const MAX_DATA_URL_LENGTH = 7 * 1024 * 1024 // 7MB base64 limit
const VALIDATION_DEBOUNCE_DELAY = 500 // 500ms

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
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    relationship?.photo || null
  )

  // Debounced form validation
  const debouncedFormData = useDebounce(formData, VALIDATION_DEBOUNCE_DELAY)

  // Debounced validation effect
  useEffect(() => {
    if (debouncedFormData.name.trim() || debouncedFormData.type) {
      // Only validate if user has started typing
      const hasContent = debouncedFormData.name.trim().length > 0
      if (hasContent) {
        try {
          CreateRelationshipSchema.parse(debouncedFormData)
          // Clear errors if validation passes
          setErrors(prev => {
            const newErrors = { ...prev }
            delete newErrors.name
            delete newErrors.type
            delete newErrors.form
            return newErrors
          })
        } catch (error: unknown) {
          // Set validation errors
          if (error && typeof error === 'object' && 'issues' in error) {
            const zodError = error as {
              issues: Array<{ path: Array<string | number>; message: string }>
            }
            const validationErrors: Record<string, string> = {}
            zodError.issues?.forEach(issue => {
              const fieldName = issue.path[0]?.toString() || 'form'
              validationErrors[fieldName] = issue.message
            })
            setErrors(prev => ({ ...prev, ...validationErrors }))
          }
        }
      }
    }
  }, [debouncedFormData])

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
      // Allowed MIME types and extensions for security
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ]
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

      // Validate file type with strict MIME type checking
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          photo: FILE_UPLOAD_ERRORS.INVALID_TYPE,
        }))
        return
      }

      // Validate file extension as additional security layer
      const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf('.'))
      if (!allowedExtensions.includes(fileExtension)) {
        setErrors(prev => ({
          ...prev,
          photo: FILE_UPLOAD_ERRORS.INVALID_EXTENSION,
        }))
        return
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setErrors(prev => ({
          ...prev,
          photo: FILE_UPLOAD_ERRORS.FILE_TOO_LARGE,
        }))
        return
      }

      // Validate minimum file size to prevent empty files
      if (file.size < MIN_FILE_SIZE) {
        setErrors(prev => ({
          ...prev,
          photo: FILE_UPLOAD_ERRORS.FILE_TOO_SMALL,
        }))
        return
      }

      // Create preview with data URL validation
      const reader = new FileReader()
      reader.onload = e => {
        const dataUrl = e.target?.result as string

        // Validate data URL format and prevent excessively large base64 strings
        if (
          !dataUrl.startsWith('data:image/') ||
          dataUrl.length > MAX_DATA_URL_LENGTH
        ) {
          setErrors(prev => ({
            ...prev,
            photo: FILE_UPLOAD_ERRORS.INVALID_FORMAT,
          }))
          return
        }

        setPhotoPreview(dataUrl)
        setFormData(prev => ({ ...prev, photo: dataUrl }))
        setErrors(prev => ({ ...prev, photo: '' }))
      }

      reader.onerror = () => {
        setErrors(prev => ({
          ...prev,
          photo: FILE_UPLOAD_ERRORS.READ_ERROR,
        }))
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

      // Handle ZodError properly
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as {
          issues: Array<{ path: Array<string | number>; message: string }>
        }
        zodError.issues?.forEach(issue => {
          const fieldName = issue.path[0]?.toString() || 'form'
          validationErrors[fieldName] = issue.message
        })
      } else {
        // Fallback for unexpected error types
        validationErrors.form = FORM_ERRORS.VALIDATION_FAILED
      }

      setErrors(validationErrors)
      return false
    }
  }

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!isReady) {
      setErrors({ submit: AUTH_ERRORS.NOT_AUTHENTICATED })
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

      setSubmitSuccess(true)

      // Show success briefly before calling onSuccess
      setTimeout(() => {
        onSuccess?.(relationshipId)
      }, FORM_SUCCESS_DELAY)

      // Reset form if not editing
      if (!isEditing) {
        setTimeout(() => {
          setFormData({ name: '', type: 'friend', photo: '' })
          setPhotoPreview(null)
          setSubmitSuccess(false)
        }, FORM_RESET_DELAY)
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : API_ERRORS.SAVE_FAILED
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

      {/* Success Message */}
      {submitSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-green-600 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-green-600">
              {isEditing
                ? 'Relationship updated successfully!'
                : 'Relationship created successfully!'}
            </p>
          </div>
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
          disabled={!isReady || isSubmitting || submitSuccess}
        >
          {submitSuccess
            ? '✓ Success!'
            : isSubmitting
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
