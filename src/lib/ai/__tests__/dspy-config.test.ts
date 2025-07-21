/**
 * Tests for DSPy-inspired configuration framework
 */

import { 
  DSPyModule, 
  SentimentAnalysisSignature, 
  createSignature,
  DSPyField,
  DSPyExample
} from '../dspy-config'
import { z } from 'zod'

// Mock DSPy module for testing
class TestModule extends DSPyModule {
  async forward(inputs: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.validateInputs(inputs)
    
    // Simple mock implementation
    const output = {
      test_output: `Processed: ${inputs.test_input}`,
      confidence: 0.95
    }
    
    this.validateOutputs(output)
    return output
  }
}

describe('DSPyModule', () => {
  const testSignature = createSignature(
    'TestSignature',
    'Test signature for validation',
    {
      test_input: {
        type: 'string',
        description: 'Test input field',
        required: true,
        validation: z.string().min(1)
      },
      optional_input: {
        type: 'string',
        description: 'Optional test input',
        required: false
      }
    },
    {
      test_output: {
        type: 'string',
        description: 'Test output field',
        required: true,
        validation: z.string()
      },
      confidence: {
        type: 'number',
        description: 'Confidence score',
        required: true,
        validation: z.number().min(0).max(1)
      }
    }
  )

  let testModule: TestModule

  beforeEach(() => {
    testModule = new TestModule(testSignature)
  })

  describe('input validation', () => {
    it('should validate required inputs successfully', () => {
      const inputs = { test_input: 'valid input' }
      expect(() => testModule.validateInputs(inputs)).not.toThrow()
    })

    it('should throw error for missing required inputs', () => {
      const inputs = { optional_input: 'present' }
      expect(() => testModule.validateInputs(inputs)).toThrow('Required input field \'test_input\' is missing')
    })

    it('should validate input schemas', () => {
      const inputs = { test_input: '' } // Empty string should fail min(1)
      expect(() => testModule.validateInputs(inputs)).toThrow('Validation failed for field \'test_input\'')
    })

    it('should allow optional inputs to be missing', () => {
      const inputs = { test_input: 'valid input' }
      expect(() => testModule.validateInputs(inputs)).not.toThrow()
    })
  })

  describe('output validation', () => {
    it('should validate required outputs successfully', () => {
      const outputs = { 
        test_output: 'valid output',
        confidence: 0.95
      }
      expect(() => testModule.validateOutputs(outputs)).not.toThrow()
    })

    it('should throw error for missing required outputs', () => {
      const outputs = { test_output: 'present' }
      expect(() => testModule.validateOutputs(outputs)).toThrow('Required output field \'confidence\' is missing')
    })

    it('should validate output schemas', () => {
      const outputs = { 
        test_output: 'valid output',
        confidence: 1.5 // Should fail max(1)
      }
      expect(() => testModule.validateOutputs(outputs)).toThrow('Validation failed for output field \'confidence\'')
    })
  })

  describe('prompt generation', () => {
    it('should generate proper prompt format', () => {
      const inputs = { test_input: 'sample input' }
      const prompt = testModule.getPrompt(inputs)
      
      expect(prompt).toContain('Task: Test signature for validation')
      expect(prompt).toContain('test_input: sample input')
      expect(prompt).toContain('Expected Output Format:')
      expect(prompt).toContain('test_output: Test output field')
      expect(prompt).toContain('confidence: Confidence score')
    })

    it('should include examples when available', () => {
      const signatureWithExamples = {
        ...testSignature,
        examples: [{
          inputs: { test_input: 'example input' },
          outputs: { test_output: 'example output', confidence: 0.9 },
          description: 'Sample example'
        }]
      }
      
      const moduleWithExamples = new TestModule(signatureWithExamples)
      const inputs = { test_input: 'sample input' }
      const prompt = moduleWithExamples.getPrompt(inputs)
      
      expect(prompt).toContain('Examples:')
      expect(prompt).toContain('example input')
      expect(prompt).toContain('example output')
      expect(prompt).toContain('Sample example')
    })
  })

  describe('forward method', () => {
    it('should process inputs and return validated outputs', async () => {
      const inputs = { test_input: 'test data' }
      const result = await testModule.forward(inputs)
      
      expect(result).toHaveProperty('test_output')
      expect(result).toHaveProperty('confidence')
      expect(result.test_output).toContain('test data')
      expect(result.confidence).toBe(0.95)
    })

    it('should throw error for invalid inputs', async () => {
      const inputs = { invalid_input: 'test' }
      await expect(testModule.forward(inputs)).rejects.toThrow('Required input field \'test_input\' is missing')
    })
  })
})

describe('SentimentAnalysisSignature', () => {
  it('should have correct structure', () => {
    expect(SentimentAnalysisSignature.name).toBe('SentimentAnalysis')
    expect(SentimentAnalysisSignature.inputs).toHaveProperty('journal_entry')
    expect(SentimentAnalysisSignature.outputs).toHaveProperty('sentiment_score')
    expect(SentimentAnalysisSignature.outputs).toHaveProperty('emotions_detected')
    expect(SentimentAnalysisSignature.outputs).toHaveProperty('confidence')
  })

  it('should have valid examples', () => {
    expect(SentimentAnalysisSignature.examples).toBeDefined()
    expect(SentimentAnalysisSignature.examples!.length).toBeGreaterThan(0)
    
    const example = SentimentAnalysisSignature.examples![0]
    expect(example.inputs).toHaveProperty('journal_entry')
    expect(example.outputs).toHaveProperty('sentiment_score')
    expect(example.outputs).toHaveProperty('emotions_detected')
    expect(example.outputs).toHaveProperty('confidence')
  })

  it('should validate sentiment score range', () => {
    const sentimentValidation = SentimentAnalysisSignature.outputs.sentiment_score.validation!
    
    expect(() => sentimentValidation.parse(5)).not.toThrow()
    expect(() => sentimentValidation.parse(1)).not.toThrow()
    expect(() => sentimentValidation.parse(10)).not.toThrow()
    expect(() => sentimentValidation.parse(0)).toThrow()
    expect(() => sentimentValidation.parse(11)).toThrow()
  })

  it('should validate confidence range', () => {
    const confidenceValidation = SentimentAnalysisSignature.outputs.confidence.validation!
    
    expect(() => confidenceValidation.parse(0.5)).not.toThrow()
    expect(() => confidenceValidation.parse(0)).not.toThrow()
    expect(() => confidenceValidation.parse(1)).not.toThrow()
    expect(() => confidenceValidation.parse(-0.1)).toThrow()
    expect(() => confidenceValidation.parse(1.1)).toThrow()
  })
})

describe('createSignature', () => {
  it('should create valid signature object', () => {
    const inputs: Record<string, DSPyField> = {
      text: {
        type: 'string',
        description: 'Input text',
        required: true
      }
    }
    
    const outputs: Record<string, DSPyField> = {
      result: {
        type: 'string',
        description: 'Output result',
        required: true
      }
    }
    
    const examples: DSPyExample[] = [{
      inputs: { text: 'example' },
      outputs: { result: 'processed' }
    }]
    
    const signature = createSignature('TestSig', 'Test description', inputs, outputs, examples)
    
    expect(signature.name).toBe('TestSig')
    expect(signature.description).toBe('Test description')
    expect(signature.inputs).toEqual(inputs)
    expect(signature.outputs).toEqual(outputs)
    expect(signature.examples).toEqual(examples)
  })

  it('should create signature without examples', () => {
    const signature = createSignature(
      'SimpleTest',
      'Simple test',
      { input: { type: 'string', description: 'test', required: true } },
      { output: { type: 'string', description: 'test', required: true } }
    )
    
    expect(signature.examples).toBeUndefined()
  })
})