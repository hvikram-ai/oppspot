import { Database } from '@/lib/supabase/database.types'

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

interface GenerationOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
}

export class OpenRouterClient {
  private apiKey: string
  private baseUrl = 'https://openrouter.ai/api/v1'
  private defaultModel = 'anthropic/claude-3-haiku' // Fast and cost-effective

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
   * Make API call to OpenRouter
   */
  private async complete(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<string> {
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
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
      }

      const data: OpenRouterResponse = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenRouter')
      }

      return data.choices[0].message.content
    } catch (error) {
      console.error('OpenRouter API error:', error)
      throw error
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