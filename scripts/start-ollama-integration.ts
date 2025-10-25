#!/usr/bin/env tsx

/**
 * Ollama Integration Startup Script
 * 
 * This script initializes the complete Ollama integration system including:
 * - Provider configuration and validation
 * - Model warming and caching
 * - Monitoring and metrics setup
 * - Fallback mechanisms testing
 * - Health checks and status reporting
 */

import { config } from 'dotenv'
import readline from 'readline'
import {
  getLLMProvider,
  warmUpProviders,
  healthCheckProviders,
  getActiveProviderType,
  getProviderConfig
} from '../lib/ai/llm-factory'
import { getGlobalMetrics, createMonitoredProvider } from '../lib/ai/llm-metrics'
import { OllamaClient } from '../lib/ai/ollama'

// Load environment variables
config({ path: '.env.local' })

interface StartupConfig {
  enableOllama: boolean
  enableFallback: boolean
  enableCache: boolean
  enableMonitoring: boolean
  warmupModels: boolean
  runHealthChecks: boolean
}

async function parseStartupConfig(): Promise<StartupConfig> {
  return {
    enableOllama: process.env.ENABLE_OLLAMA === 'true',
    enableFallback: process.env.OPENROUTER_FALLBACK_ENABLED === 'true',
    enableCache: process.env.ENABLE_LLM_CACHE !== 'false',
    enableMonitoring: process.env.ENABLE_LLM_MONITORING !== 'false',
    warmupModels: process.env.OLLAMA_WARMUP_ON_START !== 'false',
    runHealthChecks: true
  }
}

async function validateOllamaService(): Promise<boolean> {
  console.log('🔍 Validating Ollama service...')
  
  try {
    const response = await fetch('http://localhost:11434/api/version', {
      signal: AbortSignal.timeout(5000)
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Ollama service running (version: ${data.version})`)
      return true
    } else {
      console.log(`❌ Ollama service responded with status: ${response.status}`)
      return false
    }
  } catch (error) {
    console.log('❌ Ollama service not accessible:', error instanceof Error ? error.message : error)
    console.log('   Make sure to start Ollama with: ollama serve')
    return false
  }
}

async function checkRequiredModels(): Promise<string[]> {
  console.log('📋 Checking required models...')
  
  const ollamaClient = new OllamaClient()
  const availableModels = await ollamaClient.listModels()
  const availableNames = availableModels.map(m => m.name)
  
  const requiredModels = [
    process.env.OLLAMA_PRIMARY_MODEL || 'llama3.1:13b',
    process.env.OLLAMA_FAST_MODEL || 'llama3.1:8b'
  ]
  
  const missingModels = requiredModels.filter(model => !availableNames.includes(model))
  
  console.log(`   Available models: ${availableNames.join(', ')}`)
  console.log(`   Required models: ${requiredModels.join(', ')}`)
  
  if (missingModels.length > 0) {
    console.log(`⚠️  Missing models: ${missingModels.join(', ')}`)
  } else {
    console.log('✅ All required models available')
  }
  
  return missingModels
}

async function downloadMissingModels(missingModels: string[]): Promise<void> {
  if (missingModels.length === 0) return
  
  console.log('📥 Downloading missing models...')
  const ollamaClient = new OllamaClient()
  
  for (const model of missingModels) {
    console.log(`   Downloading ${model}...`)
    const success = await ollamaClient.ensureModel(model)
    if (success) {
      console.log(`   ✅ ${model} downloaded successfully`)
    } else {
      console.log(`   ❌ Failed to download ${model}`)
    }
  }
}

async function testProviderSetup(config: StartupConfig): Promise<void> {
  console.log('🧪 Testing provider setup...')
  
  // Test basic provider creation
  console.log('   Creating LLM provider...')
  const provider = getLLMProvider()
  console.log(`   Provider type: ${provider.constructor.name}`)
  
  // Test provider access
  console.log('   Testing provider access...')
  const isAccessible = await provider.validateAccess()
  if (isAccessible) {
    console.log('   ✅ Provider accessible')
  } else {
    console.log('   ❌ Provider not accessible')
    throw new Error('Provider setup failed')
  }
  
  // Test basic completion
  console.log('   Testing basic completion...')
  const testResult = await provider.testModel()
  if (testResult.success) {
    console.log(`   ✅ Test completion successful (${testResult.responseTime}ms)`)
  } else {
    console.log(`   ❌ Test completion failed: ${testResult.error}`)
    throw new Error('Provider completion test failed')
  }
  
  // Test fallback if enabled
  if (config.enableFallback) {
    console.log('   Testing fallback mechanism...')
    // Fallback testing would require simulating provider failure
    console.log('   ℹ️  Fallback mechanism configured (testing requires failure simulation)')
  }
}

async function initializeMonitoring(config: StartupConfig): Promise<void> {
  if (!config.enableMonitoring) {
    console.log('📊 Monitoring disabled')
    return
  }
  
  console.log('📊 Initializing monitoring...')
  
  const metrics = getGlobalMetrics()
  console.log('   ✅ Global metrics collector initialized')
  
  // Set up periodic cleanup
  setInterval(() => {
    metrics.cleanup()
    console.log('[Metrics] Cleaned up old entries')
  }, 3600000) // Every hour
  
  console.log('   ✅ Periodic cleanup scheduled')
}

async function warmUpSystem(config: StartupConfig): Promise<void> {
  if (!config.warmupModels) {
    console.log('🔥 Model warm-up disabled')
    return
  }
  
  console.log('🔥 Warming up models...')
  
  try {
    await warmUpProviders()
    console.log('   ✅ Models warmed up successfully')
  } catch (error) {
    console.log('   ⚠️  Model warm-up failed:', error instanceof Error ? error.message : error)
    console.log('   ℹ️  Models will warm up on first use')
  }
}

async function performHealthChecks(config: StartupConfig): Promise<void> {
  if (!config.runHealthChecks) {
    console.log('🏥 Health checks disabled')
    return
  }
  
  console.log('🏥 Running health checks...')
  
  try {
    const healthResults = await healthCheckProviders()
    
    for (const [provider, isHealthy] of healthResults) {
      if (isHealthy) {
        console.log(`   ✅ ${provider}: Healthy`)
      } else {
        console.log(`   ❌ ${provider}: Unhealthy`)
      }
    }
  } catch (error) {
    console.log('   ⚠️  Health checks failed:', error instanceof Error ? error.message : error)
  }
}

async function displayConfiguration(): Promise<void> {
  console.log('\n📋 Current Configuration:')
  
  const activeProvider = getActiveProviderType()
  const config = getProviderConfig()
  
  console.log(`   Active Provider: ${activeProvider}`)
  console.log(`   Enable Ollama: ${process.env.ENABLE_OLLAMA}`)
  console.log(`   Enable Fallback: ${process.env.OPENROUTER_FALLBACK_ENABLED}`)
  console.log(`   Enable Cache: ${process.env.ENABLE_LLM_CACHE !== 'false'}`)
  console.log(`   Ollama URL: ${config.baseUrl}`)
  console.log(`   Primary Model: ${config.primaryModel}`)
  console.log(`   Fast Model: ${config.fastModel}`)
  
  if (config.fallbackProvider) {
    console.log(`   Fallback Provider: ${config.fallbackProvider}`)
  }
}

async function displayStatus(): Promise<void> {
  console.log('\n📊 System Status:')
  
  try {
    const provider = getLLMProvider()
    const status = await provider.getStatus()
    
    console.log(`   Provider: ${status.available ? '✅ Available' : '❌ Unavailable'}`)
    console.log(`   Models: ${status.models?.join(', ') || 'None'}`)
    
    if (status.version) {
      console.log(`   Version: ${status.version}`)
    }
    
    // Show cache stats if available
    if ('getCacheStats' in provider) {
      const cacheStats = (provider as any).getCacheStats()
      console.log(`   Cache: ${cacheStats.size} entries, ${(cacheStats.hitRate * 100).toFixed(1)}% hit rate`)
    }
    
    // Show metrics if available
    const metrics = getGlobalMetrics()
    const recentStats = await metrics.getStats('1h')
    console.log(`   Recent Activity: ${recentStats.totalRequests} requests, ${(recentStats.successRate * 100).toFixed(1)}% success rate`)
    
  } catch (error) {
    console.log(`   Status check failed: ${error instanceof Error ? error.message : error}`)
  }
}

async function startInteractiveMode(): Promise<void> {
  console.log('\n🎮 Starting interactive test mode...')
  console.log('Type "help" for commands, "exit" to quit\n')

  const provider = getLLMProvider()

  // Simple REPL for testing
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  const prompt = () => rl.question('> ', async (input: any) => {
    const trimmed = input.trim().toLowerCase()
    
    switch (trimmed) {
      case 'help':
        console.log('Commands:')
        console.log('  test <prompt> - Test completion with prompt')
        console.log('  status        - Show system status')
        console.log('  metrics       - Show performance metrics')
        console.log('  health        - Run health check')
        console.log('  models        - List available models')
        console.log('  exit          - Exit interactive mode')
        break
        
      case 'exit':
        rl.close()
        return
        
      case 'status':
        await displayStatus()
        break
        
      case 'metrics':
        const metrics = getGlobalMetrics()
        const stats = await metrics.getStats('1h')
        console.log('Performance Metrics (Last Hour):')
        console.log(`  Requests: ${stats.totalRequests}`)
        console.log(`  Success Rate: ${(stats.successRate * 100).toFixed(1)}%`)
        console.log(`  Avg Response Time: ${stats.averageResponseTime.toFixed(0)}ms`)
        console.log(`  Total Tokens: ${stats.totalTokens}`)
        console.log(`  Total Cost: $${stats.totalCost.toFixed(4)}`)
        break
        
      case 'health':
        await performHealthChecks({ runHealthChecks: true } as StartupConfig)
        break
        
      case 'models':
        if ('listModels' in provider) {
          const models = await (provider as any).listModels()
          console.log('Available models:')
          models.forEach((m: any) => console.log(`  - ${m.name} (${m.size})`))
        } else {
          console.log('Model listing not supported by this provider')
        }
        break
        
      default:
        if (trimmed.startsWith('test ')) {
          const testPrompt = input.slice(5).trim()
          if (testPrompt) {
            try {
              console.log('Testing...')
              const startTime = Date.now()
              const response = await provider.complete(testPrompt, { max_tokens: 100 })
              const duration = Date.now() - startTime
              console.log(`Response (${duration}ms): ${response}`)
            } catch (error) {
              console.log(`Error: ${error instanceof Error ? error.message : error}`)
            }
          } else {
            console.log('Please provide a test prompt')
          }
        } else {
          console.log('Unknown command. Type "help" for available commands.')
        }
    }
    
    prompt()
  })
  
  prompt()
}

async function main() {
  console.log('🚀 Starting Ollama Integration System\n')
  
  try {
    // Parse configuration
    const config = await parseStartupConfig()
    
    if (config.enableOllama) {
      // Validate Ollama service
      const ollamaAvailable = await validateOllamaService()
      if (!ollamaAvailable) {
        console.log('\n⚠️  Ollama not available, falling back to OpenRouter only')
        process.env.ENABLE_OLLAMA = 'false'
      } else {
        // Check and download models
        const missingModels = await checkRequiredModels()
        if (missingModels.length > 0) {
          const shouldDownload = process.argv.includes('--download-models')
          if (shouldDownload) {
            await downloadMissingModels(missingModels)
          } else {
            console.log('   ℹ️  Run with --download-models to download missing models')
          }
        }
      }
    }
    
    // Test provider setup
    await testProviderSetup(config)
    
    // Initialize monitoring
    await initializeMonitoring(config)
    
    // Warm up system
    await warmUpSystem(config)
    
    // Run health checks
    await performHealthChecks(config)
    
    // Display configuration and status
    await displayConfiguration()
    await displayStatus()
    
    console.log('\n✅ Ollama integration system started successfully!')
    
    // Start interactive mode if requested
    if (process.argv.includes('--interactive')) {
      await startInteractiveMode()
    } else {
      console.log('\n💡 Run with --interactive for interactive testing mode')
      console.log('💡 Run with --download-models to auto-download missing models')
    }
    
  } catch (error) {
    console.error('\n❌ Failed to start Ollama integration system:')
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down Ollama integration system...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down Ollama integration system...')
  process.exit(0)
})

main().catch((error) => {
  console.error('Startup script failed:', error)
  process.exit(1)
})