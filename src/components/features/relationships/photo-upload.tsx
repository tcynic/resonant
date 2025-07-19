'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import Button from '@/components/ui/button'

interface PhotoUploadProps {
  value?: string
  onChange: (photo: string | null) => void
  error?: string
  label?: string
  disabled?: boolean
  className?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export default function PhotoUpload({
  value,
  onChange,
  error,
  label = 'Photo',
  disabled = false,
  className = '',
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please select a valid image file (JPEG, PNG, or WebP)'
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'Image must be less than 5MB'
    }

    return null
  }

  const processFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      onChange(null)
      return
    }

    setIsProcessing(true)

    try {
      // Convert to data URL for preview and storage
      const reader = new FileReader()
      reader.onload = e => {
        const dataUrl = e.target?.result as string
        onChange(dataUrl)
        setIsProcessing(false)
      }
      reader.onerror = () => {
        onChange(null)
        setIsProcessing(false)
      }
      reader.readAsDataURL(file)
    } catch {
      onChange(null)
      setIsProcessing(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const file = event.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }

  const handleRemovePhoto = () => {
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {value ? (
        // Photo Preview
        <div className="space-y-3">
          <div className="relative inline-block">
            <Image
              src={value}
              alt="Relationship photo"
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 shadow-sm"
            />
            {!disabled && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label="Remove photo"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {!disabled && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleUploadClick}
            >
              Change Photo
            </Button>
          )}
        </div>
      ) : (
        // Upload Area
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-all
            ${
              isDragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!disabled ? handleUploadClick : undefined}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="text-sm text-gray-600">Processing image...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
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
              <div className="text-sm text-gray-600">
                <span className="font-medium">Click to upload</span> or drag and
                drop
              </div>
              <div className="text-xs text-gray-500">
                PNG, JPG, WebP up to {formatFileSize(MAX_FILE_SIZE)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
