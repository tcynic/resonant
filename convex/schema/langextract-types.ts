/**
 * LangExtract Schema Types - Extracted for better maintainability
 *
 * This file contains the schema definitions for LangExtract data structures
 * to reduce complexity in the main schema.ts file.
 */

import { v } from 'convex/values'

// Base extraction entity schema (reusable pattern)
export const extractionEntitySchema = v.object({
  text: v.string(),
  type: v.string(),
  confidence: v.optional(v.number()), // Add confidence scoring
})

// Specific extraction schemas with their unique fields
export const emotionExtractionSchema = v.object({
  text: v.string(),
  type: v.string(),
  intensity: v.optional(v.string()),
  confidence: v.optional(v.number()),
})

export const themeExtractionSchema = v.object({
  text: v.string(),
  category: v.string(),
  context: v.optional(v.string()),
  confidence: v.optional(v.number()),
})

export const triggerExtractionSchema = v.object({
  text: v.string(),
  type: v.string(),
  severity: v.optional(v.string()),
  confidence: v.optional(v.number()),
})

export const communicationExtractionSchema = v.object({
  text: v.string(),
  style: v.string(),
  tone: v.optional(v.string()),
  confidence: v.optional(v.number()),
})

export const relationshipExtractionSchema = v.object({
  text: v.string(),
  type: v.string(),
  dynamic: v.optional(v.string()),
  confidence: v.optional(v.number()),
})

// Main structured data schema
export const langExtractStructuredDataSchema = v.object({
  emotions: v.array(emotionExtractionSchema),
  themes: v.array(themeExtractionSchema),
  triggers: v.array(triggerExtractionSchema),
  communication: v.array(communicationExtractionSchema),
  relationships: v.array(relationshipExtractionSchema),
})

// Complete LangExtract data schema
export const langExtractDataSchema = v.object({
  structuredData: langExtractStructuredDataSchema,
  extractedEntities: v.array(v.string()),
  processingSuccess: v.boolean(),
  errorMessage: v.optional(v.string()),
  processingTimeMs: v.optional(v.number()),
  langExtractVersion: v.optional(v.string()),
  // Add metadata for better debugging
  processedAt: v.optional(v.number()),
  retryCount: v.optional(v.number()),
})
