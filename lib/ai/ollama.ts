interface OllamaResponse {
  model: string
  created_at: string
  response?: string
  done: boolean
  message?: {
    role: string
    content: string
  }
  context?: number[]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  prompt_eval_duration?: number
  eval_count?: number
  eval_duration?: number
}

interface OllamaStreamResponse {
  model: string
  created_at: string
  response?: string
  done: boolean
  message?: {
    role: string
    content: string
  }
}

import { 
  LLMProvider, 
  LLMService,
  ManagedLLMProvider,
  GenerationOptions, 
  ModelCapabilities, 
  ProviderStatus, 
  TestResult,
  LLMError,
  LLMTimeoutError,
  LLMUnavailableError
} from './llm-interface'
import { LlamaPromptOptimizer } from './llama-prompt-optimizer'

interface OllamaModelInfo {
  name: string
  size: string
  digest: string
  details: {
    format: string
    family: string
    families: string[] | null
    parameter_size: string
    quantization_level: string
  }
  expires_at: string
}

export class OllamaClient implements LLMProvider, LLMService, ManagedLLMProvider {
  private baseUrl: string
  private primaryModel: string
  private fastModel: string
  private timeout: number
  
  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    // Use available models - mistral for primary, tinyllama for fast
    this.primaryModel = process.env.OLLAMA_PRIMARY_MODEL || 'mistral:7b'
    this.fastModel = process.env.OLLAMA_FAST_MODEL || 'tinyllama:1.1b'
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '120000') // 2 minutes default
  }

  /**
   * Generate text completion using Ollama
   */
  async complete(prompt: string, options: GenerationOptions = {}): Promise<string> {
    const {
      model = this.primaryModel,
      temperature = 0.7,
      max_tokens = 500,
      system_prompt,
      top_p = 0.9,
      top_k = 40,
      stream = false
    } = options

    try {
      const finalPrompt = prompt
      const finalSystemPrompt = system_prompt
      let finalOptions = options

      // Apply Llama optimization if using Llama model
      if (LlamaPromptOptimizer.isLlamaModel(model)) {
        const optimizedOptions = LlamaPromptOptimizer.convertOptionsToLlama(options)
        finalOptions = { ...options, ...optimizedOptions }
      }

      const messages = []
      
      if (finalSystemPrompt) {
        messages.push({
          role: 'system',
          content: finalSystemPrompt
        })
      }
      
      messages.push({
        role: 'user',
        content: finalPrompt
      })

      const requestBody = {
        model,
        messages,
        stream,
        options: {
          temperature: finalOptions.temperature || temperature,
          num_predict: finalOptions.max_tokens || max_tokens,
          top_p: finalOptions.top_p || top_p,
          top_k: finalOptions.top_k || top_k
        }
      }

      console.log(`[Ollama] Generating with model: ${model}`)
      
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
      }

      if (stream) {
        return await this.handleStreamResponse(response)
      } else {
        const data: OllamaResponse = await response.json()
        
        const content = data.message?.content || data.response
        if (!content) {
          throw new Error('No response from Ollama')
        }

        console.log(`[Ollama] Generated ${data.eval_count || 0} tokens in ${(data.total_duration || 0) / 1000000}ms`)
        
        // Post-process response if using Llama model
        const finalContent = LlamaPromptOptimizer.isLlamaModel(model) 
          ? LlamaPromptOptimizer.postProcessResponse(content)
          : content
        
        return finalContent
      }
    } catch (error) {
      console.error('[Ollama] Generation error:', error)
      
      // If it's a timeout or connection error, provide more context
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          throw new Error(`Ollama request timed out after ${this.timeout}ms. Model might be loading.`)
        }
        if (error.message.includes('ECONNREFUSED')) {
          throw new Error('Ollama service is not running. Please start it with: ollama serve')
        }
      }
      
      throw error
    }
  }

  /**
   * Handle streaming response
   */
  private async handleStreamResponse(response: Response): Promise<string> {
    let fullResponse = ''
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No response body available')
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())
        
        for (const line of lines) {
          try {
            const data: OllamaStreamResponse = JSON.parse(line)
            
            if (data.message?.content) {
              fullResponse += data.message.content
            } else if (data.response) {
              fullResponse += data.response
            }
            
            if (data.done) {
              return fullResponse
            }
          } catch (parseError) {
            console.warn('[Ollama] Failed to parse streaming chunk:', line)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return fullResponse
  }

  /**
   * Fast completion using the lighter model
   */
  async fastComplete(prompt: string, options: GenerationOptions = {}): Promise<string> {
    return this.complete(prompt, {
      ...options,
      model: options.model || this.fastModel
    })
  }

  /**
   * Check if Ollama service is accessible
   */
  async validateAccess(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      })
      return response.ok
    } catch (error) {
      console.error('[Ollama] Service validation failed:', error)
      return false
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`)
      
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.status}`)
      }
      
      const data = await response.json()
      return data.models || []
    } catch (error) {
      console.error('[Ollama] Failed to list models:', error)
      return []
    }
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(modelName: string): Promise<boolean> {
    try {
      const models = await this.listModels()
      return models.some(model => model.name === modelName)
    } catch (error) {
      console.error('[Ollama] Failed to check model availability:', error)
      return false
    }
  }

  /**
   * Pull a model if not available
   */
  async ensureModel(modelName: string): Promise<boolean> {
    try {
      const hasModel = await this.hasModel(modelName)
      if (hasModel) {
        return true
      }

      console.log(`[Ollama] Pulling model: ${modelName}`)
      
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status}`)
      }

      console.log(`[Ollama] Successfully pulled model: ${modelName}`)
      return true
    } catch (error) {
      console.error(`[Ollama] Failed to ensure model ${modelName}:`, error)
      return false
    }
  }

  /**
   * Warm up models by sending a small request
   */
  async warmModels(): Promise<void> {
    const models = [this.primaryModel, this.fastModel]
    
    for (const model of models) {
      try {
        const hasModel = await this.hasModel(model)
        if (!hasModel) {
          console.warn(`[Ollama] Model ${model} not available, skipping warm-up`)
          continue
        }

        console.log(`[Ollama] Warming up model: ${model}`)
        
        await this.complete('Hello', {
          model,
          max_tokens: 10,
          temperature: 0.1
        })
        
        console.log(`[Ollama] Model ${model} warmed up`)
      } catch (error) {
        console.warn(`[Ollama] Failed to warm up model ${model}:`, error)
      }
    }
  }

  /**
   * Get model capabilities and configuration
   */
  getModelCapabilities(): Record<string, unknown> {
    return {
      primaryModel: {
        name: this.primaryModel,
        contextLength: 128000,
        maxTokens: 4096,
        bestFor: ['detailed analysis', 'complex reasoning', 'long form generation'],
        cost: 0, // Local execution
        speed: 'medium'
      },
      fastModel: {
        name: this.fastModel,
        contextLength: 128000,
        maxTokens: 4096,
        bestFor: ['quick responses', 'simple tasks', 'summaries'],
        cost: 0, // Local execution
        speed: 'fast'
      },
      features: {
        streaming: true,
        functionCalling: false,
        multimodal: false,
        localExecution: true,
        offline: true
      },
      limits: {
        requestsPerMinute: 1000, // Limited by hardware, not API
        tokensPerRequest: 4096,
        contextWindow: 128000
      }
    }
  }

  /**
   * Estimate tokens in text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4)
  }

  /**
   * Calculate cost (always $0 for local execution)
   */
  calculateCost(tokens: number): number {
    return 0 // Local execution has no per-token cost
  }

  /**
   * Get service status and metrics
   */
  async getStatus(): Promise<{
    available: boolean
    models: string[]
    version?: string
    uptime?: number
  }> {
    try {
      const [versionResponse, models] = await Promise.all([
        fetch(`${this.baseUrl}/api/version`),
        this.listModels()
      ])

      const version = versionResponse.ok ? await versionResponse.json() : null

      return {
        available: true,
        models: models.map(m => m.name),
        version: version?.version,
        uptime: Date.now() // Simplified - could track actual service start time
      }
    } catch (error) {
      return {
        available: false,
        models: []
      }
    }
  }

  /**
   * Test model generation with a simple prompt
   */
  async testModel(modelName?: string): Promise<TestResult> {
    const model = modelName || this.fastModel
    const startTime = Date.now()

    try {
      const response = await this.complete('Generate a brief hello message.', {
        model,
        max_tokens: 50,
        temperature: 0.1
      })

      const responseTime = Date.now() - startTime
      const tokensGenerated = this.estimateTokens(response)

      return {
        success: true,
        responseTime,
        tokensGenerated
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // LLMService interface methods
  async generateBusinessDescription(business: Record<string, unknown>): Promise<string> {
    // Use Llama-optimized prompts if available
    const optimized = LlamaPromptOptimizer.optimizeBusinessDescription(business)
    
    const response = await this.complete(optimized.userPrompt, {
      system_prompt: optimized.systemPrompt,
      temperature: optimized.temperature,
      top_p: optimized.topP,
      top_k: optimized.topK,
      max_tokens: optimized.maxTokens
    })

    return response.trim()
  }

  async generateBusinessInsights(business: Record<string, unknown>): Promise<{
    market_position: string
    target_audience: string
    competitive_advantages: string[]
    growth_opportunities: string[]
    challenges: string[]
  }> {
    const prompt = this.buildInsightsPrompt(business)
    
    const response = await this.complete(prompt, {
      system_prompt: `You are a business analyst specializing in UK and Ireland markets. 
      Provide strategic insights about businesses based on available data. 
      Return your response in JSON format only, no additional text.`,
      temperature: 0.5,
      max_tokens: 500
    })

    try {
      // Clean response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : response
      return JSON.parse(jsonStr)
    } catch {
      // Fallback if JSON parsing fails
      return {
        market_position: response,
        target_audience: 'General consumers',
        competitive_advantages: [],
        growth_opportunities: [],
        challenges: []
      }
    }
  }

  async generateSEOKeywords(business: Record<string, unknown>): Promise<string[]> {
    // Use Llama-optimized SEO keyword generation
    const optimized = LlamaPromptOptimizer.optimizeSEOKeywords(business)
    
    const response = await this.complete(optimized.userPrompt, {
      system_prompt: optimized.systemPrompt,
      temperature: optimized.temperature,
      top_p: optimized.topP,
      top_k: optimized.topK,
      max_tokens: optimized.maxTokens
    })

    return response.split(',').map(keyword => keyword.trim()).filter(Boolean)
  }

  async generateTagline(business: Record<string, unknown>): Promise<string> {
    const categories = business.categories as string[] | undefined
    const prompt = `Create a memorable tagline (max 10 words) for:
    ${business.name} - ${categories?.join(', ')}
    ${business.description ? `Current description: ${business.description}` : ''}

    Return only the tagline, no quotes or additional text.`

    const response = await this.complete(prompt, {
      temperature: 0.8,
      max_tokens: 50
    })

    return response.trim().replace(/['"]/g, '')
  }

  async suggestCategories(business: Record<string, unknown>): Promise<string[]> {
    const categories = business.categories as string[] | undefined
    const prompt = `Suggest 3-5 relevant business categories for:
    Name: ${business.name}
    Current categories: ${categories?.join(', ') || 'None'}
    Description: ${business.description || 'No description'}
    
    Choose from these categories: Technology, Finance, Healthcare, Retail, Food & Beverage, 
    Professional Services, Real Estate, Construction, Education, Transportation, Manufacturing, 
    Marketing, Consulting, Legal, Environmental, Entertainment, Sports & Recreation, 
    Agriculture, Non-Profit, Government
    
    Return as a comma-separated list only, no other text.`

    const response = await this.complete(prompt, {
      temperature: 0.3,
      max_tokens: 100
    })

    return response.split(',').map(cat => cat.trim()).filter(Boolean)
  }

  // Helper methods for business prompts
  private buildDescriptionPrompt(business: Record<string, unknown>): string {
    const parts = [`Generate a compelling business description for ${business.name}.`]

    const categories = business.categories as string[] | undefined
    if (categories && categories.length > 0) {
      parts.push(`Industry/Categories: ${categories.join(', ')}`)
    }
    
    if (business.address) {
      const addr = business.address as unknown
      parts.push(`Location: ${(addr as any).formatted || (addr as any).vicinity || 'UK/Ireland'}`)
    }
    
    if (business.website) {
      parts.push(`Website: ${business.website}`)
    }
    
    if (business.rating) {
      parts.push(`Customer Rating: ${business.rating}/5`)
    }
    
    if (business.metadata) {
      const meta = business.metadata as unknown
      if ((meta as any).google_data?.types) {
        parts.push(`Business Types: ${(meta as any).google_data.types.join(', ')}`)
      }
      if ((meta as any).google_data?.price_level) {
        const priceLevel = '£'.repeat((meta as any).google_data.price_level)
        parts.push(`Price Level: ${priceLevel}`)
      }
    }

    parts.push('\nCreate an engaging description that:')
    parts.push('- Highlights what makes this business unique')
    parts.push('- Appeals to potential customers')
    parts.push('- Includes relevant keywords for SEO')
    parts.push('- Maintains a professional tone')
    
    return parts.join('\n')
  }

  private buildInsightsPrompt(business: Record<string, unknown>): string {
    const categories = business.categories as string[] | undefined
    return `Analyze this business and provide strategic insights in JSON format:

    Business: ${business.name}
    Categories: ${categories?.join(', ')}
    Location: ${JSON.stringify(business.address)}
    Rating: ${business.rating || 'Not available'}
    Verified: ${business.verified ? 'Yes' : 'No'}
    
    Provide insights with these exact keys:
    - market_position: Brief analysis of market position (string)
    - target_audience: Primary target customers (string)
    - competitive_advantages: Array of 3-5 advantages (string[])
    - growth_opportunities: Array of 3-5 opportunities (string[])
    - challenges: Array of 2-3 potential challenges (string[])
    
    Focus on UK/Ireland market context.`
  }
}

// Create singleton instance
let ollamaClient: OllamaClient | null = null

export function getOllamaClient(): OllamaClient {
  if (!ollamaClient) {
    ollamaClient = new OllamaClient()
  }
  return ollamaClient
}

// Utility function to check if Ollama is enabled
export function isOllamaEnabled(): boolean {
  return process.env.ENABLE_OLLAMA === 'true'
}

// Utility function to get appropriate model for task type
export function getModelForTask(taskType: 'fast' | 'detailed' | 'primary' = 'primary'): string {
  const client = getOllamaClient()
  
  switch (taskType) {
    case 'fast':
      return client['fastModel']
    case 'detailed':
    case 'primary':
    default:
      return client['primaryModel']
  }
}