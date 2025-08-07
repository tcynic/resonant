/**
 * File Validation Utilities
 *
 * Comprehensive file validation including magic byte verification,
 * MIME type checking, and security validation for file uploads.
 */

import { FILE_UPLOAD_CONFIG } from '@/lib/constants/app-config'

/**
 * Validates file type using magic bytes (file signatures)
 * This provides more secure validation than relying solely on MIME types or extensions
 */
export function validateFileSignature(file: File): Promise<boolean> {
  return new Promise(resolve => {
    const reader = new FileReader()

    reader.onload = event => {
      const arrayBuffer = event.target?.result as ArrayBuffer
      if (!arrayBuffer) {
        resolve(false)
        return
      }

      const bytes = new Uint8Array(arrayBuffer)
      const isValid = isValidImageSignature(bytes, file.type)
      resolve(isValid)
    }

    reader.onerror = () => resolve(false)

    // Read only the first 12 bytes for signature validation
    const blob = file.slice(0, 12)
    reader.readAsArrayBuffer(blob)
  })
}

/**
 * Checks if the file signature matches the expected magic bytes for the given MIME type
 */
function isValidImageSignature(bytes: Uint8Array, mimeType: string): boolean {
  const { MAGIC_BYTES } = FILE_UPLOAD_CONFIG

  switch (mimeType) {
    case 'image/jpeg':
      return matchesSignature(bytes, MAGIC_BYTES.JPEG)

    case 'image/png':
      return matchesSignature(bytes, MAGIC_BYTES.PNG)

    case 'image/gif':
      return (
        matchesSignature(bytes, MAGIC_BYTES.GIF87A) ||
        matchesSignature(bytes, MAGIC_BYTES.GIF89A)
      )

    case 'image/webp':
      // WEBP files start with 'RIFF' and have 'WEBP' at offset 8
      return (
        matchesSignature(bytes, MAGIC_BYTES.WEBP) &&
        bytes.length >= 12 &&
        bytes[8] === 0x57 && // 'W'
        bytes[9] === 0x45 && // 'E'
        bytes[10] === 0x42 && // 'B'
        bytes[11] === 0x50
      ) // 'P'

    default:
      return false
  }
}

/**
 * Compares file bytes with expected magic byte signature
 */
function matchesSignature(
  bytes: Uint8Array,
  signature: readonly number[]
): boolean {
  if (bytes.length < signature.length) {
    return false
  }

  return signature.every((expectedByte, index) => bytes[index] === expectedByte)
}

/**
 * Comprehensive file validation combining all security checks
 */
export async function validateUploadedFile(file: File): Promise<{
  isValid: boolean
  errors: string[]
}> {
  const errors: string[] = []

  // 1. Check file size
  if (file.size > FILE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
    errors.push(
      `File size exceeds ${FILE_UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB limit`
    )
  }

  if (file.size < FILE_UPLOAD_CONFIG.MIN_FILE_SIZE) {
    errors.push('File appears to be empty or corrupted')
  }

  // 2. Check MIME type
  if (
    !FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES.includes(
      file.type as (typeof FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES)[number]
    )
  ) {
    errors.push(`File type ${file.type} is not allowed`)
  }

  // 3. Check file extension
  const extension = getFileExtension(file.name)
  if (
    !FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_EXTENSIONS.includes(
      extension as (typeof FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_EXTENSIONS)[number]
    )
  ) {
    errors.push(`File extension ${extension} is not allowed`)
  }

  // 4. Validate file signature (magic bytes)
  try {
    const hasValidSignature = await validateFileSignature(file)
    if (!hasValidSignature) {
      errors.push('File signature does not match the declared file type')
    }
  } catch {
    errors.push('Unable to validate file signature')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Extracts file extension from filename
 */
function getFileExtension(filename: string): string {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'))
}

/**
 * Validates data URL format and content
 */
export function validateDataURL(dataUrl: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check data URL format
  if (!dataUrl.startsWith('data:image/')) {
    errors.push('Invalid data URL format')
  }

  // Check data URL size
  if (dataUrl.length > FILE_UPLOAD_CONFIG.MAX_DATA_URL_LENGTH) {
    errors.push(
      `Data URL exceeds ${FILE_UPLOAD_CONFIG.MAX_DATA_URL_LENGTH / (1024 * 1024)}MB limit`
    )
  }

  // Validate base64 content
  try {
    const base64Part = dataUrl.split(',')[1]
    if (!base64Part) {
      errors.push('Invalid base64 data in data URL')
    } else {
      // Basic base64 validation
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
      if (!base64Regex.test(base64Part)) {
        errors.push('Malformed base64 data in data URL')
      }
    }
  } catch {
    errors.push('Unable to parse data URL')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Sanitizes filename for safe storage and display
 */
export function sanitizeFilename(filename: string): string {
  // Remove or replace unsafe characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace unsafe characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .toLowerCase()
    .substring(0, 100) // Limit length
}

/**
 * Estimates the original file size from a data URL
 */
export function estimateFileSizeFromDataURL(dataUrl: string): number {
  // Base64 encoding increases size by ~33%, plus metadata
  const base64Part = dataUrl.split(',')[1] || ''
  return Math.floor((base64Part.length * 3) / 4)
}

/**
 * Type guard for checking if a file is an image
 */
export function isImageFile(file: File): boolean {
  return FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES.includes(
    file.type as (typeof FILE_UPLOAD_CONFIG.ALLOWED_IMAGE_TYPES)[number]
  )
}

/**
 * Gets human-readable file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
