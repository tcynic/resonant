#!/usr/bin/env node
/**
 * Simple script to test LangExtract integration
 * Run with: LANGEXTRACT_ENABLED=true node scripts/test-langextract.js
 */

const {
  preprocessWithLangExtract,
  fallbackAnalysis,
} = require('../convex/utils/ai_bridge')

async function testLangExtract() {
  console.log('Testing LangExtract Integration...')
  console.log('LANGEXTRACT_ENABLED:', process.env.LANGEXTRACT_ENABLED)

  const testContent =
    "I felt really frustrated when my partner didn't listen during our conversation about finances. We ended up arguing again, which makes me feel disconnected from them."

  console.log('\n1. Testing preprocessWithLangExtract...')
  try {
    const result = await preprocessWithLangExtract(testContent)
    console.log('Processing success:', result.processingSuccess)
    console.log('Extracted entities count:', result.extractedEntities.length)
    console.log('Emotions found:', result.structuredData.emotions.length)
    console.log('Themes found:', result.structuredData.themes.length)
    if (result.errorMessage) {
      console.log('Error message:', result.errorMessage)
    }
  } catch (error) {
    console.error('Preprocessing error:', error.message)
  }

  console.log('\n2. Testing enhanced fallback analysis...')
  try {
    const result = await fallbackAnalysis(testContent)
    console.log('Sentiment score:', result.sentimentScore)
    console.log('Confidence level:', result.confidenceLevel)
    console.log('Emotional keywords:', result.emotionalKeywords)
    console.log('Has LangExtract data:', !!result.langExtractData)
    if (result.langExtractData) {
      console.log(
        'LangExtract processing success:',
        result.langExtractData.processingSuccess
      )
    }
  } catch (error) {
    console.error('Fallback analysis error:', error.message)
  }
}

if (require.main === module) {
  testLangExtract().catch(console.error)
}

module.exports = { testLangExtract }
