#!/usr/bin/env tsx

/**
 * Test script for Ollama integration with the LLM factory system
 * This script tests the complete integration flow
 */

import { config } from 'dotenv'
import { getLLMProvider, getActiveProviderType } from '../lib/ai/llm-factory'
import { OllamaClient } from '../lib/ai/ollama'

config({ path: '.env.local' })

async function testOllamaIntegration() {
  console.log('🔍 Testing Ollama Integration...\n')

  // Test 1: Check active provider
  console.log('1. Checking active provider type...')
  const activeProvider = getActiveProviderType()
  console.log(`   Active provider: ${activeProvider}\n`)

  // Test 2: Get LLM provider instance
  console.log('2. Getting LLM provider instance...')
  const llmProvider = getLLMProvider()
  console.log(`   Provider instance: ${llmProvider.constructor.name}\n`)

  // Test 3: Validate access
  console.log('3. Validating provider access...')
  const isAccessible = await llmProvider.validateAccess()
  console.log(`   Access validated: ${isAccessible}\n`)

  if (!isAccessible) {
    console.error('❌ Provider is not accessible. Make sure Ollama is running.')
    return
  }

  // Test 4: Get provider status
  console.log('4. Getting provider status...')
  const status = await llmProvider.getStatus()
  console.log(`   Status:`, JSON.stringify(status, null, 2), '\n')

  // Test 5: Test model with simple prompt
  console.log('5. Testing model with simple prompt...')
  const testResult = await llmProvider.testModel()
  console.log(`   Test result:`, JSON.stringify(testResult, null, 2), '\n')

  if (!testResult.success) {
    console.error('❌ Model test failed:', testResult.error)
    return
  }

  // Test 6: Test completion
  console.log('6. Testing text completion...')
  try {
    const response = await llmProvider.complete('What is artificial intelligence? Answer briefly.', {
      max_tokens: 100,
      temperature: 0.7
    })
    console.log(`   Response: "${response}"\n`)
  } catch (error) {
    console.error('❌ Completion failed:', error)
    return
  }

  // Test 7: Test fast completion
  console.log('7. Testing fast completion...')
  try {
    const fastResponse = await llmProvider.fastComplete('Generate a greeting message.', {
      max_tokens: 50,
      temperature: 0.5
    })
    console.log(`   Fast response: "${fastResponse}"\n`)
  } catch (error) {
    console.error('❌ Fast completion failed:', error)
    return
  }

  // Test 8: Test business methods (if available)
  if ('generateBusinessDescription' in llmProvider) {
    console.log('8. Testing business description generation...')
    try {
      const businessData = {
        name: 'Tech Solutions Ltd',
        categories: ['Technology', 'Consulting'],
        address: { formatted: 'London, UK' },
        rating: 4.5,
        verified: true
      }

      const description = await llmProvider.generateBusinessDescription(businessData)
      console.log(`   Business description: "${description.substring(0, 200)}..."\n`)
    } catch (error) {
      console.error('❌ Business description generation failed:', error)
      return
    }
  }

  // Test 9: Model capabilities
  console.log('9. Checking model capabilities...')
  const capabilities = llmProvider.getModelCapabilities()
  console.log(`   Capabilities:`, JSON.stringify(capabilities, null, 2), '\n')

  // Test 10: Token estimation and cost calculation
  console.log('10. Testing token estimation and cost calculation...')
  const testText = 'This is a test message for token estimation.'
  const tokens = llmProvider.estimateTokens(testText)
  const cost = llmProvider.calculateCost(tokens)
  console.log(`   Text: "${testText}"`)
  console.log(`   Estimated tokens: ${tokens}`)
  console.log(`   Estimated cost: $${cost}\n`)

  console.log('✅ All tests completed successfully!')
}

async function testOllamaSpecificFeatures() {
  console.log('\n🔧 Testing Ollama-specific features...\n')

  const ollamaClient = new OllamaClient()

  // Test 1: List models
  console.log('1. Listing available models...')
  const models = await ollamaClient.listModels()
  console.log(`   Found ${models.length} models:`)
  models.forEach(model => console.log(`   - ${model.name} (${model.size})`))
  console.log()

  // Test 2: Check specific model
  console.log('2. Checking for llama3.1:8b model...')
  const hasModel = await ollamaClient.hasModel('llama3.1:8b')
  console.log(`   Model available: ${hasModel}\n`)

  // Test 3: Warm up models
  if (hasModel) {
    console.log('3. Warming up models...')
    try {
      await ollamaClient.warmModels()
      console.log('   Models warmed up successfully\n')
    } catch (error) {
      console.error('❌ Model warm-up failed:', error)
    }
  }

  console.log('✅ Ollama-specific tests completed!')
}

async function main() {
  try {
    await testOllamaIntegration()
    await testOllamaSpecificFeatures()
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  }
}

// Set environment for testing
process.env.ENABLE_OLLAMA = 'true'
process.env.OLLAMA_BASE_URL = 'http://localhost:11434'
process.env.OLLAMA_FAST_MODEL = 'llama3.1:8b'
process.env.OLLAMA_PRIMARY_MODEL = 'llama3.1:8b' // Use same model for testing

main().catch(console.error)