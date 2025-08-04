/**
 * AI prompt templates for relationship analysis
 * Structured prompts following DSPy methodology for consistent AI responses
 */

import promptTemplates from './prompts.json'

// Export individual prompts for backwards compatibility
export const SENTIMENT_ANALYSIS_PROMPT = promptTemplates.SENTIMENT_ANALYSIS
export const EMOTIONAL_STABILITY_PROMPT = promptTemplates.EMOTIONAL_STABILITY
export const ENERGY_IMPACT_PROMPT = promptTemplates.ENERGY_IMPACT
export const CONFLICT_RESOLUTION_PROMPT = promptTemplates.CONFLICT_RESOLUTION
export const GRATITUDE_DETECTION_PROMPT = promptTemplates.GRATITUDE_DETECTION

// Utility function to replace placeholders in prompts
export function formatPrompt(
  template: string,
  variables: Record<string, unknown>
): string {
  let formatted = template

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`
    const replacement =
      typeof value === 'string' ? value : JSON.stringify(value)
    formatted = formatted.replace(new RegExp(placeholder, 'g'), replacement)
  }

  return formatted
}

// Prompt validation to ensure all placeholders are replaced
export function validatePrompt(prompt: string): boolean {
  const placeholderRegex = /{[^}]+}/g
  const unreplacedPlaceholders = prompt.match(placeholderRegex)

  if (unreplacedPlaceholders) {
    throw new Error(
      `Unreplaced placeholders found: ${unreplacedPlaceholders.join(', ')}`
    )
  }

  return true
}

// Helper to create prompts with common metadata
export function createAnalysisPrompt(
  template: string,
  variables: Record<string, unknown>,
  metadata?: {
    userId?: string
    relationshipId?: string
    analysisType?: string
  }
): string {
  const prompt = formatPrompt(template, variables)
  validatePrompt(prompt)

  // Add metadata as comments for debugging
  if (metadata && process.env.NODE_ENV === 'development') {
    const metadataComment = `<!-- Analysis Metadata: ${JSON.stringify(metadata)} -->\n`
    return metadataComment + prompt
  }

  return prompt
}

// Export all prompt templates
export const PROMPT_TEMPLATES = {
  SENTIMENT_ANALYSIS: SENTIMENT_ANALYSIS_PROMPT,
  EMOTIONAL_STABILITY: EMOTIONAL_STABILITY_PROMPT,
  ENERGY_IMPACT: ENERGY_IMPACT_PROMPT,
  CONFLICT_RESOLUTION: CONFLICT_RESOLUTION_PROMPT,
  GRATITUDE_DETECTION: GRATITUDE_DETECTION_PROMPT,
} as const

export type PromptType = keyof typeof PROMPT_TEMPLATES
