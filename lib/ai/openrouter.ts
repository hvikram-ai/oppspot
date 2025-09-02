import { Database } from '@/lib/supabase/database.types'
import { 
  LLMProvider, 
  LLMService,
  GenerationOptions, 
  ModelCapabilities, 
  ProviderStatus, 
  TestResult,
  LLMError,
  LLMTimeoutError,
  LLMUnavailableError,
  LLMQuotaExceededError
} from './llm-interface'

type Business = Database['public']['Tables']['businesses']['Row']

interface OpenRouterResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenRouterClient implements LLMProvider, LLMService {
  private apiKey: string
  private baseUrl = 'https://openrouter.ai/api/v1'
  private defaultModel = 'anthropic/claude-3-haiku' // Fast and cost-effective
  private fastModel = 'anthropic/claude-3-haiku' // Already fast
  private timeout = 120000 // 2 minutes

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Generate a business description using AI
   */
  async generateBusinessDescription(business: Partial<Business>): Promise<string> {
    const prompt = this.buildDescriptionPrompt(business)
    
    const response = await this.complete(prompt, {
      system_prompt: `You are a professional business copywriter creating compelling, SEO-friendly descriptions for UK and Ireland businesses. 
      Write in British English. Focus on what makes the business unique and valuable to customers. 
      Keep descriptions between 100-200 words. Be factual, engaging, and professional.`,
      temperature: 0.7,
      max_tokens: 300
    })

    return response.trim()
  }

  /**
   * Generate business insights and analysis
   */
  async generateBusinessInsights(business: Partial<Business>): Promise<{
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
      Return your response in JSON format.`,
      temperature: 0.5,
      max_tokens: 500
    })

    try {
      return JSON.parse(response)
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

  /**
   * Generate SEO keywords for a business
   */
  async generateSEOKeywords(business: Partial<Business>): Promise<string[]> {
    const prompt = `Generate 10-15 relevant SEO keywords for this business:
    Name: ${business.name}
    Categories: ${business.categories?.join(', ')}
    Location: ${JSON.stringify(business.address)}
    
    Focus on local SEO terms relevant to UK/Ireland. Include location-based keywords.
    Return as a comma-separated list.`

    const response = await this.complete(prompt, {
      temperature: 0.5,
      max_tokens: 150
    })

    return response.split(',').map(keyword => keyword.trim()).filter(Boolean)
  }

  /**
   * Generate a tagline for a business
   */
  async generateTagline(business: Partial<Business>): Promise<string> {
    const prompt = `Create a memorable tagline (max 10 words) for:
    ${business.name} - ${business.categories?.join(', ')}
    ${business.description ? `Current description: ${business.description}` : ''}`

    const response = await this.complete(prompt, {
      temperature: 0.8,
      max_tokens: 50
    })

    return response.trim().replace(/['"]/g, '')
  }

  /**
   * Categorize a business based on its information
   */
  async suggestCategories(business: Partial<Business>): Promise<string[]> {
    const prompt = `Suggest 3-5 relevant business categories for:
    Name: ${business.name}
    Current categories: ${business.categories?.join(', ') || 'None'}
    Description: ${business.description || 'No description'}
    
    Choose from these categories: Technology, Finance, Healthcare, Retail, Food & Beverage, 
    Professional Services, Real Estate, Construction, Education, Transportation, Manufacturing, 
    Marketing, Consulting, Legal, Environmental, Entertainment, Sports & Recreation, 
    Agriculture, Non-Profit, Government
    
    Return as a comma-separated list.`

    const response = await this.complete(prompt, {
      temperature: 0.3,
      max_tokens: 100
    })

    return response.split(',').map(cat => cat.trim()).filter(Boolean)
  }

  /**
   * Build prompt for description generation
   */
  private buildDescriptionPrompt(business: Partial<Business>): string {
    const parts = [`Generate a compelling business description for ${business.name}.`]
    
    if (business.categories && business.categories.length > 0) {
      parts.push(`Industry/Categories: ${business.categories.join(', ')}`)
    }
    
    if (business.address) {
      const addr = business.address as any
      parts.push(`Location: ${addr.formatted || addr.vicinity || 'UK/Ireland'}`)
    }
    
    if (business.website) {
      parts.push(`Website: ${business.website}`)
    }
    
    if (business.rating) {
      parts.push(`Customer Rating: ${business.rating}/5`)
    }
    
    if (business.metadata) {
      const meta = business.metadata as any
      if (meta.google_data?.types) {
        parts.push(`Business Types: ${meta.google_data.types.join(', ')}`)
      }
      if (meta.google_data?.price_level) {
        const priceLevel = '£'.repeat(meta.google_data.price_level)
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

  /**
   * Build prompt for insights generation
   */
  private buildInsightsPrompt(business: Partial<Business>): string {
    return `Analyze this business and provide strategic insights in JSON format:
    
    Business: ${business.name}
    Categories: ${business.categories?.join(', ')}
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

  /**
   * Generate text completion using OpenRouter (LLMProvider interface)
   */
  async complete(prompt: string, options: GenerationOptions = {}): Promise<string> {
    const {
      model = this.defaultModel,
      temperature = 0.7,
      max_tokens = 500,
      system_prompt
    } = options

    const messages = []
    
    if (system_prompt) {
      messages.push({
        role: 'system',
        content: system_prompt
      })
    }
    
    messages.push({
      role: 'user',
      content: prompt
    })

    try {
      console.log(`[OpenRouter] Generating with model: ${model}`)
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://oppspot.com',
          'X-Title': 'OppSpot Business Platform'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens,
          stream: false
        }),
        signal: AbortSignal.timeout(this.timeout)
      })

      if (!response.ok) {
        const errorText = await response.text()
        
        // Handle specific error types
        if (response.status === 429) {
          throw new LLMQuotaExceededError('openrouter', model)
        }
        if (response.status >= 500) {
          throw new LLMUnavailableError('openrouter', `Server error: ${response.status}`)
        }
        
        throw new LLMError(`OpenRouter API error: ${response.status} - ${errorText}`, 'openrouter', model)
      }

      const data: OpenRouterResponse = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw new LLMError('No response from OpenRouter', 'openrouter', model)
      }

      const tokensGenerated = data.usage?.completion_tokens || 0
      console.log(`[OpenRouter] Generated ${tokensGenerated} tokens`)

      return data.choices[0].message.content
    } catch (error) {
      if (error instanceof LLMError) {
        throw error
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LLMTimeoutError('openrouter', this.timeout, model)
      }
      
      console.error('[OpenRouter] Generation error:', error)
      throw new LLMError(
        error instanceof Error ? error.message : 'Unknown error',
        'openrouter',
        model,
        error instanceof Error ? error : undefined
      )
    }
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
   * Check if OpenRouter service is accessible
   */
  async validateAccess(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/key`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch (error) {
      console.error('[OpenRouter] Service validation failed:', error)
      return false
    }
  }

  /**
   * Get model capabilities and configuration
   */
  getModelCapabilities(): Record<string, ModelCapabilities | any> {
    return {
      'anthropic/claude-3-haiku': {
        name: 'Claude 3 Haiku',
        contextLength: 200000,
        maxTokens: 4096,
        bestFor: ['quick responses', 'simple tasks', 'cost-effective generation'],
        cost: 0.0025, // $2.50 per 1M tokens
        speed: 'fast'
      },
      'anthropic/claude-3.5-sonnet': {
        name: 'Claude 3.5 Sonnet',
        contextLength: 200000,
        maxTokens: 8192,
        bestFor: ['detailed analysis', 'complex reasoning', 'high-quality generation'],
        cost: 0.015, // $15 per 1M tokens
        speed: 'medium'
      },
      features: {
        streaming: false,
        functionCalling: true,
        multimodal: true,
        localExecution: false,
        offline: false
      },
      limits: {
        requestsPerMinute: 200,
        tokensPerRequest: 8192,
        contextWindow: 200000
      }
    }
  }

  /**
   * Estimate tokens in text (rough approximation)
   */
  estimateTokens(text: string): number {
    // More accurate estimation for Claude models
    return Math.ceil(text.length / 3.8)
  }

  /**
   * Calculate cost for given number of tokens
   */
  calculateCost(tokens: number): number {
    // Using Haiku pricing as default
    return (tokens / 1000000) * 2.50
  }

  /**
   * Get current provider status
   */
  async getStatus(): Promise<ProviderStatus> {
    try {
      const usage = await this.checkUsage()
      const available = await this.validateAccess()
      
      return {
        available,
        models: ['anthropic/claude-3-haiku', 'anthropic/claude-3.5-sonnet'],
        version: 'v1',
        uptime: Date.now() // Simplified
      }
    } catch (error) {
      return {
        available: false,
        models: [],
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Test the provider with a simple request
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

  /**
   * Check remaining credits/usage
   */
  async checkUsage(): Promise<{
    credits_remaining?: number
    credits_used?: number
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/key`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Failed to check OpenRouter usage:', error)
    }

    return {}
  }
}

// Create singleton instance
let aiClient: OpenRouterClient | null = null

export function getAIClient(): OpenRouterClient {
  if (!aiClient) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured')
    }
    aiClient = new OpenRouterClient(apiKey)
  }
  return aiClient
}