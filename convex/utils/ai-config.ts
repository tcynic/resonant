/**
 * AI Configuration and Environment Validation
 */

/**
 * Validate that required environment variables are available
 */
export function validateAIEnvironment(): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for Gemini API key
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!geminiKey) {
    errors.push('GOOGLE_GEMINI_API_KEY environment variable is required')
  } else if (geminiKey.length < 20) {
    warnings.push('GOOGLE_GEMINI_API_KEY appears to be invalid (too short)')
  }

  // Check for other AI-related config
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv === 'production') {
    if (!process.env.AI_RATE_LIMIT_ENABLED) {
      warnings.push('AI_RATE_LIMIT_ENABLED not set in production')
    }
    if (!process.env.AI_COST_TRACKING_ENABLED) {
      warnings.push('AI_COST_TRACKING_ENABLED not set in production')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get AI configuration settings
 */
export function getAIConfig() {
  return {
    geminiApiKey: process.env.GOOGLE_GEMINI_API_KEY,
    rateLimitEnabled: process.env.AI_RATE_LIMIT_ENABLED === 'true',
    costTrackingEnabled: process.env.AI_COST_TRACKING_ENABLED === 'true',
    environment: process.env.NODE_ENV || 'development',
    maxTokensPerRequest: parseInt(
      process.env.AI_MAX_TOKENS_PER_REQUEST || '1000'
    ),
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '30000'),
  }
}

/**
 * Log AI configuration status (without exposing sensitive values)
 */
export function logAIConfigStatus() {
  const validation = validateAIEnvironment()
  const config = getAIConfig()

  console.log('AI Configuration Status:', {
    isValid: validation.isValid,
    environment: config.environment,
    hasGeminiKey: !!config.geminiApiKey,
    rateLimitEnabled: config.rateLimitEnabled,
    costTrackingEnabled: config.costTrackingEnabled,
    errors: validation.errors,
    warnings: validation.warnings,
  })

  return validation
}
