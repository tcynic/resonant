/**
 * Tests for Google Gemini Flash API client
 */

import { 
  GeminiClient, 
  GeminiAPIError, 
  GeminiRateLimitError,
  getGeminiClient 
} from '../gemini-client'

// Mock the Google Generative AI module
const mockGenerateContent = jest.fn()

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent
    })
  }))
}))

describe('GeminiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGenerateContent.mockClear()
    
    // Set up environment variable for tests
    process.env.GOOGLE_GEMINI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY
  })

  describe('constructor', () => {
    it('should initialize with API key from environment', () => {
      expect(() => new GeminiClient()).not.toThrow()
    })

    it('should initialize with provided API key', () => {
      expect(() => new GeminiClient('custom-key')).not.toThrow()
    })

    it('should throw error when no API key is available', () => {
      delete process.env.GOOGLE_GEMINI_API_KEY
      expect(() => new GeminiClient()).toThrow('Google Gemini API key is required')
    })

    it('should accept custom configuration', () => {
      const client = new GeminiClient('test-key', { temperature: 0.8, maxTokens: 2000 })
      const config = client.getConfig()
      
      expect(config.temperature).toBe(0.8)
      expect(config.maxTokens).toBe(2000)
    })
  })

  describe('generateContent', () => {
    let client: GeminiClient

    beforeEach(() => {
      client = new GeminiClient('test-key')
    })

    it('should generate content successfully', async () => {
      const mockResponse = {
        response: {
          text: () => 'Generated response',
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 20,
            totalTokenCount: 30
          },
          candidates: [{ finishReason: 'STOP' }]
        }
      }
      
      mockGenerateContent.mockResolvedValue(mockResponse)
      
      const result = await client.generateContent('test prompt')
      
      expect(result.text).toBe('Generated response')
      expect(result.usageMetadata).toEqual(mockResponse.response.usageMetadata)
      expect(result.finishReason).toBe('STOP')
    })

    it('should handle API errors gracefully', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API Error'))
      
      await expect(client.generateContent('test'))
        .rejects.toThrow(GeminiAPIError)
    })

    it('should handle rate limit errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('quota exceeded'))
      
      await expect(client.generateContent('test'))
        .rejects.toThrow(GeminiRateLimitError)
    })

    it('should handle safety filter errors', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Content blocked by safety filters'))
      
      await expect(client.generateContent('test'))
        .rejects.toThrow('Content blocked by safety filters')
    })

    it('should throw error for empty response', async () => {
      const mockResponse = {
        response: {
          text: () => '',
          usageMetadata: { totalTokenCount: 0 }
        }
      }
      
      mockGenerateContent.mockResolvedValue(mockResponse)
      
      await expect(client.generateContent('test'))
        .rejects.toThrow('Empty response from Gemini API')
    })

    it('should throw error for missing response', async () => {
      mockGenerateContent.mockResolvedValue({})
      
      await expect(client.generateContent('test'))
        .rejects.toThrow('No response received from Gemini API')
    })
  })

  describe('rate limiting', () => {
    let client: GeminiClient

    beforeEach(() => {
      client = new GeminiClient('test-key')
      // Mock successful response
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'response',
          usageMetadata: { totalTokenCount: 10 }
        }
      })
    })

    it('should track request count', async () => {
      await client.generateContent('test1')
      await client.generateContent('test2')
      
      const stats = client.getUsageStats()
      expect(stats.requestCount).toBe(2)
    })

    it('should enforce rate limits', async () => {
      // Make 60 requests to hit the limit
      const promises = Array(60).fill(null).map(() => client.generateContent('test'))
      await Promise.all(promises)
      
      // The 61st request should fail with rate limit error (wrapped in GeminiAPIError)
      await expect(client.generateContent('test'))
        .rejects.toThrow('Rate limit exceeded')
    })
  })

  describe('generateWithRetry', () => {
    let client: GeminiClient

    beforeEach(() => {
      client = new GeminiClient('test-key')
    })

    it('should retry on transient errors', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Another temporary error'))
        .mockResolvedValue({
          response: {
            text: () => 'Success on third try',
            usageMetadata: { totalTokenCount: 10 }
          }
        })
      
      const result = await client.generateWithRetry('test prompt', 'sentiment', undefined, undefined, 3, 100)
      expect(result.text).toBe('Success on third try')
      expect(mockGenerateContent).toHaveBeenCalledTimes(3)
    })

    it('should not retry on authentication errors', async () => {
      const authError = new Error('Invalid API key')
      mockGenerateContent.mockRejectedValue(authError)
      
      // Mock the error to be treated as auth error
      jest.spyOn(client, 'generateContent').mockRejectedValue(
        new GeminiAPIError('Invalid API key', 401, authError)
      )
      
      await expect(client.generateWithRetry('test'))
        .rejects.toThrow('Invalid API key')
      
      // Should not retry auth errors
      expect(client.generateContent).toHaveBeenCalledTimes(1)
    })

    it('should fail after max retries', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Persistent error'))
      
      await expect(client.generateWithRetry('test', 'sentiment', undefined, undefined, 2, 10))
        .rejects.toThrow('Failed after 2 attempts')
    })
  })

  describe('generateStructuredResponse', () => {
    let client: GeminiClient

    beforeEach(() => {
      client = new GeminiClient('test-key')
    })

    it('should parse valid JSON response', async () => {
      const mockData = { score: 8, emotions: ['joy', 'love'], confidence: 0.9 }
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(mockData),
          usageMetadata: { totalTokenCount: 10 }
        }
      })
      
      const schema = {
        score: 'number',
        emotions: 'array',
        confidence: 'number'
      }
      
      const result = await client.generateStructuredResponse(
        'analyze sentiment',
        schema
      )
      
      expect(result).toEqual(mockData)
    })

    it('should throw error for invalid JSON', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'Invalid JSON response',
          usageMetadata: { totalTokenCount: 10 }
        }
      })
      
      const schema = { score: 'number' }
      
      await expect(client.generateStructuredResponse('test', schema))
        .rejects.toThrow('Failed to parse structured response')
    })

    it('should validate required fields', async () => {
      const incompleteData = { score: 8 } // Missing emotions and confidence
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify(incompleteData),
          usageMetadata: { totalTokenCount: 10 }
        }
      })
      
      const schema = {
        score: 'number',
        emotions: 'array',
        confidence: 'number'
      }
      
      await expect(client.generateStructuredResponse('test', schema))
        .rejects.toThrow('Missing required field: emotions')
    })
  })

  describe('configuration management', () => {
    it('should get current configuration', () => {
      const client = new GeminiClient('test-key', { temperature: 0.7 })
      const config = client.getConfig()
      
      expect(config.temperature).toBe(0.7)
      expect(config.apiKey).toBe('test-key')
    })

    it('should update configuration', () => {
      const client = new GeminiClient('test-key')
      client.updateConfig({ temperature: 0.9, maxTokens: 2000 })
      
      const config = client.getConfig()
      expect(config.temperature).toBe(0.9)
      expect(config.maxTokens).toBe(2000)
    })
  })
})

describe('getGeminiClient', () => {
  beforeEach(() => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key'
  })

  afterEach(() => {
    delete process.env.GOOGLE_GEMINI_API_KEY
  })

  it('should return singleton instance', () => {
    const client1 = getGeminiClient()
    const client2 = getGeminiClient()
    
    expect(client1).toBe(client2)
  })

  it('should create new instance with custom parameters', () => {
    const client1 = getGeminiClient()
    const client2 = getGeminiClient('custom-key')
    
    expect(client1).not.toBe(client2)
  })
})

describe('Error classes', () => {
  describe('GeminiAPIError', () => {
    it('should create error with message and status code', () => {
      const error = new GeminiAPIError('Test error', 400)
      
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(400)
      expect(error.name).toBe('GeminiAPIError')
    })

    it('should include original error', () => {
      const originalError = new Error('Original')
      const error = new GeminiAPIError('Wrapped', 500, originalError)
      
      expect(error.originalError).toBe(originalError)
    })
  })

  describe('GeminiRateLimitError', () => {
    it('should create rate limit error', () => {
      const error = new GeminiRateLimitError()
      
      expect(error.message).toBe('Rate limit exceeded')
      expect(error.statusCode).toBe(429)
      expect(error.name).toBe('GeminiRateLimitError')
    })

    it('should accept custom message', () => {
      const error = new GeminiRateLimitError('Custom rate limit message')
      expect(error.message).toBe('Custom rate limit message')
    })
  })
})