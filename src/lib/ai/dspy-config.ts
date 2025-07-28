/**
 * DSPy-inspired framework configuration for TypeScript
 * Provides structured approach to AI prompt optimization and management
 */

import { z } from 'zod'

// Core DSPy-style signature interface
export interface DSPySignature {
  name: string
  description: string
  inputs: Record<string, DSPyField>
  outputs: Record<string, DSPyField>
  examples?: DSPyExample[]
}

export interface DSPyField {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required?: boolean
  validation?: z.ZodSchema
}

export interface DSPyExample {
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  description?: string
}

// DSPy Module base class
export abstract class DSPyModule {
  protected signature: DSPySignature

  constructor(signature: DSPySignature) {
    this.signature = signature
  }

  abstract forward(
    inputs: Record<string, unknown>
  ): Promise<Record<string, unknown>>

  // Public getter for accessing signature in tests
  getSignature(): DSPySignature {
    return this.signature
  }

  validateInputs(inputs: Record<string, unknown>): boolean {
    for (const [key, field] of Object.entries(this.signature.inputs)) {
      if (field.required && !(key in inputs)) {
        throw new Error(`Required input field '${key}' is missing`)
      }

      if (key in inputs && field.validation) {
        const result = field.validation.safeParse(inputs[key])
        if (!result.success) {
          throw new Error(
            `Validation failed for field '${key}': ${result.error.message}`
          )
        }
      }
    }
    return true
  }

  validateOutputs(outputs: Record<string, unknown>): boolean {
    for (const [key, field] of Object.entries(this.signature.outputs)) {
      if (field.required && !(key in outputs)) {
        throw new Error(`Required output field '${key}' is missing`)
      }

      if (key in outputs && field.validation) {
        const result = field.validation.safeParse(outputs[key])
        if (!result.success) {
          throw new Error(
            `Validation failed for output field '${key}': ${result.error.message}`
          )
        }
      }
    }
    return true
  }

  getPrompt(inputs: Record<string, unknown>): string {
    let prompt = `Task: ${this.signature.description}\n\n`

    // Add input fields
    prompt += 'Inputs:\n'
    for (const [key] of Object.entries(this.signature.inputs)) {
      if (key in inputs) {
        prompt += `${key}: ${inputs[key]}\n`
      }
    }

    // Add expected output format
    prompt += '\nExpected Output Format:\n'
    for (const [key, field] of Object.entries(this.signature.outputs)) {
      prompt += `${key}: ${field.description}\n`
    }

    // Add examples if available
    if (this.signature.examples && this.signature.examples.length > 0) {
      prompt += '\nExamples:\n'
      this.signature.examples.forEach((example, index) => {
        prompt += `Example ${index + 1}:\n`
        prompt += `Inputs: ${JSON.stringify(example.inputs)}\n`
        prompt += `Outputs: ${JSON.stringify(example.outputs)}\n`
        if (example.description) {
          prompt += `Note: ${example.description}\n`
        }
        prompt += '\n'
      })
    }

    return prompt
  }
}

// Configuration for AI model settings
export interface AIModelConfig {
  model: string
  temperature: number
  maxTokens: number
  topP?: number
  topK?: number
  apiKey: string
  endpoint?: string
}

export const defaultAIConfig: Omit<AIModelConfig, 'apiKey'> = {
  model: 'gemini-2.5-flash-lite',
  temperature: 0.3,
  maxTokens: 1000,
  topP: 0.95,
  topK: 40,
}

// Sentiment Analysis Signature
export const SentimentAnalysisSignature: DSPySignature = {
  name: 'SentimentAnalysis',
  description:
    'Analyze the sentiment of journal entry text and extract emotional indicators',
  inputs: {
    journal_entry: {
      type: 'string',
      description: "User's journal entry text",
      required: true,
      validation: z.string().min(1, 'Journal entry cannot be empty'),
    },
  },
  outputs: {
    sentiment_score: {
      type: 'number',
      description:
        'Sentiment score 1-10, where 1=very negative, 10=very positive',
      required: true,
      validation: z.number().min(1).max(10),
    },
    emotions_detected: {
      type: 'array',
      description: 'List of emotions found with individual scores',
      required: true,
      validation: z.array(z.string()),
    },
    confidence: {
      type: 'number',
      description: 'AI confidence in analysis 0-1',
      required: true,
      validation: z.number().min(0).max(1),
    },
    explanation: {
      type: 'string',
      description: 'Brief explanation of the sentiment analysis',
      required: false,
      validation: z.string(),
    },
  },
  examples: [
    {
      inputs: {
        journal_entry:
          'I had a wonderful day with my partner. We went for a walk and talked about our future together.',
      },
      outputs: {
        sentiment_score: 8.5,
        emotions_detected: ['joy', 'love', 'contentment', 'optimism'],
        confidence: 0.92,
        explanation:
          "The text contains positive emotional indicators like 'wonderful', future planning suggests optimism, and romantic context indicates love and contentment.",
      },
      description:
        'Positive relationship entry with multiple positive emotions',
    },
    {
      inputs: {
        journal_entry:
          "We had another fight today. I'm feeling really frustrated and don't know if this is working.",
      },
      outputs: {
        sentiment_score: 2.5,
        emotions_detected: [
          'frustration',
          'uncertainty',
          'sadness',
          'disappointment',
        ],
        confidence: 0.88,
        explanation:
          'Conflict is mentioned with negative emotional language. Uncertainty about relationship future indicates distress.',
      },
      description: 'Negative relationship entry showing conflict and doubt',
    },
  ],
}

// Export utilities for creating new signatures
export function createSignature(
  name: string,
  description: string,
  inputs: Record<string, DSPyField>,
  outputs: Record<string, DSPyField>,
  examples?: DSPyExample[]
): DSPySignature {
  return {
    name,
    description,
    inputs,
    outputs,
    examples,
  }
}
