/**
 * AI prompt templates for relationship analysis
 * Structured prompts following DSPy methodology for consistent AI responses
 */

export const SENTIMENT_ANALYSIS_PROMPT = `
You are an expert relationship counselor and emotional intelligence specialist. Analyze the provided journal entry to understand the emotional state and relationship dynamics.

**Journal Entry:**
{journal_entry}

**Analysis Task:**
Provide a comprehensive sentiment analysis including:

1. **Sentiment Score**: Rate from 1-10 (1=very negative, 10=very positive)
   - Consider overall emotional tone
   - Weight relationship-specific emotions more heavily
   - Factor in context and subtext

2. **Emotions Detected**: List specific emotions present
   - Use precise emotional vocabulary
   - Include both primary and secondary emotions
   - Consider mixed or conflicted emotions

3. **Confidence Level**: Rate your analysis confidence (0.0-1.0)
   - Higher confidence for clear emotional language
   - Lower confidence for ambiguous or neutral text

4. **Brief Explanation**: Explain your reasoning (1-2 sentences)

**Response Format (JSON):**
{
  "sentiment_score": <number 1-10>,
  "emotions_detected": ["<emotion1>", "<emotion2>", ...],
  "confidence": <number 0.0-1.0>,
  "explanation": "<brief explanation>"
}

**Emotion Categories Reference:**
- Positive: joy, love, gratitude, contentment, excitement, hope, pride, affection
- Negative: anger, sadness, frustration, disappointment, anxiety, fear, guilt, resentment
- Neutral: acceptance, curiosity, uncertainty, indifference
- Complex: ambivalence, nostalgia, bittersweet, conflicted

**Important Guidelines:**
- Focus on relationship context and emotional impact
- Consider both explicit and implicit emotional content
- Be sensitive to nuanced emotional expressions
- Avoid over-interpreting neutral or factual statements
`

export const EMOTIONAL_STABILITY_PROMPT = `
You are analyzing emotional stability patterns in relationship journal entries. Review the sentiment history to assess emotional consistency and resilience.

**Sentiment History:**
{sentiment_history}

**Analysis Task:**
Evaluate emotional stability based on:

1. **Consistency**: How stable are the emotional patterns?
2. **Recovery**: How well does the person bounce back from negative events?
3. **Range**: What's the typical emotional range and volatility?
4. **Trends**: Are there improving or declining patterns?

**Response Format (JSON):**
{
  "stability_score": <number 0-100>,
  "recovery_patterns": "<analysis of how they handle setbacks>",
  "consistency_rating": "<high/medium/low with explanation>",
  "trend_analysis": "<improving/stable/declining with reasoning>"
}
`

export const ENERGY_IMPACT_PROMPT = `
Analyze how this relationship affects the person's energy levels and overall vitality based on the journal entry.

**Journal Entry:**
{journal_entry}

**Analysis Focus:**
- Does the relationship energize or drain the person?
- Are there mentions of feeling uplifted or exhausted?
- How does relationship interaction affect their motivation?
- What energy patterns are evident?

**Response Format (JSON):**
{
  "energy_impact_score": <number 1-10>,
  "energy_indicators": ["<indicator1>", "<indicator2>", ...],
  "overall_effect": "<energizing/neutral/draining>",
  "explanation": "<reasoning for the assessment>"
}
`

export const CONFLICT_RESOLUTION_PROMPT = `
Analyze conflict resolution patterns and communication effectiveness in this relationship journal entry.

**Journal Entry:**
{journal_entry}

**Analysis Areas:**
- Are conflicts mentioned? How are they handled?
- What communication patterns are evident?
- Is there evidence of healthy conflict resolution?
- Are issues being addressed or avoided?

**Response Format (JSON):**
{
  "conflict_resolution_score": <number 1-10>,
  "communication_patterns": ["<pattern1>", "<pattern2>", ...],
  "resolution_effectiveness": "<effective/moderate/poor>",
  "improvement_areas": ["<area1>", "<area2>", ...]
}
`

export const GRATITUDE_DETECTION_PROMPT = `
Identify expressions of gratitude, appreciation, and positive acknowledgment in the relationship journal entry.

**Journal Entry:**
{journal_entry}

**Detection Focus:**
- Explicit gratitude expressions
- Appreciation for partner's actions
- Recognition of positive qualities
- Thankfulness for relationship aspects

**Response Format (JSON):**
{
  "gratitude_score": <number 1-10>,
  "gratitude_expressions": ["<expression1>", "<expression2>", ...],
  "appreciation_targets": ["<what they appreciate>", ...],
  "gratitude_frequency": "<high/medium/low/none>"
}
`

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
