/**
 * Prompt optimization system for Llama models
 * 
 * Optimizes prompts for better performance and quality with local Llama models
 */

import { GenerationOptions } from './llm-interface'

export interface OptimizedPrompt {
  systemPrompt: string
  userPrompt: string
  temperature: number
  topP: number
  topK: number
  maxTokens: number
}

export class LlamaPromptOptimizer {
  /**
   * Optimize prompts for Llama 3.1 models
   */
  static optimizeForLlama(
    originalPrompt: string, 
    systemPrompt?: string,
    taskType: 'analysis' | 'generation' | 'classification' | 'extraction' | 'summary' = 'generation'
  ): OptimizedPrompt {
    
    // Llama 3.1 specific system prompt formatting
    const optimizedSystemPrompt = this.buildLlamaSystemPrompt(systemPrompt, taskType)
    
    // Clean and optimize user prompt
    const optimizedUserPrompt = this.cleanPromptForLlama(originalPrompt)
    
    // Task-specific parameters
    const params = this.getLlamaParametersForTask(taskType)
    
    return {
      systemPrompt: optimizedSystemPrompt,
      userPrompt: optimizedUserPrompt,
      ...params
    }
  }

  /**
   * Build optimized system prompt for Llama
   */
  private static buildLlamaSystemPrompt(systemPrompt?: string, taskType: string = 'generation'): string {
    const basePrompt = systemPrompt || this.getDefaultSystemPrompt(taskType)
    
    // Llama 3.1 works best with clear, direct instructions
    const optimizedPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

${basePrompt}

Key instructions:
- Be concise and factual
- Use clear, professional language
- Provide specific details when possible
- Stay within the requested scope
- Format output as requested<|eot_id|>`

    return optimizedPrompt
  }

  /**
   * Clean and optimize user prompt
   */
  private static cleanPromptForLlama(prompt: string): string {
    return `<|start_header_id|>user<|end_header_id|>

${prompt.trim()}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`
  }

  /**
   * Get optimized parameters for different task types
   */
  private static getLlamaParametersForTask(taskType: string) {
    const configs = {
      analysis: {
        temperature: 0.2,
        topP: 0.8,
        topK: 20,
        maxTokens: 800
      },
      generation: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxTokens: 500
      },
      classification: {
        temperature: 0.1,
        topP: 0.7,
        topK: 10,
        maxTokens: 100
      },
      extraction: {
        temperature: 0.1,
        topP: 0.8,
        topK: 15,
        maxTokens: 300
      },
      summary: {
        temperature: 0.3,
        topP: 0.8,
        topK: 25,
        maxTokens: 400
      }
    }

    return configs[taskType] || configs.generation
  }

  /**
   * Get default system prompts for different tasks
   */
  private static getDefaultSystemPrompt(taskType: string): string {
    const prompts = {
      analysis: "You are a professional business analyst. Provide accurate, insightful analysis based on the provided data. Focus on actionable insights and clear explanations.",
      
      generation: "You are a professional content creator. Generate high-quality, relevant content that meets the specified requirements. Be creative while maintaining accuracy.",
      
      classification: "You are a classification expert. Analyze the provided content and assign appropriate categories based on the given criteria. Be precise and consistent.",
      
      extraction: "You are a data extraction specialist. Extract specific information from the provided content accurately and completely. Present results in the requested format.",
      
      summary: "You are a professional summarizer. Create concise, comprehensive summaries that capture the key points and essential information. Maintain clarity and readability."
    }

    return prompts[taskType] || prompts.generation
  }

  /**
   * Optimize business description generation for Llama
   */
  static optimizeBusinessDescription(businessData: any): OptimizedPrompt {
    const systemPrompt = `You are a professional business copywriter specializing in UK and Ireland businesses. Create compelling, SEO-friendly descriptions that:
- Highlight unique value propositions
- Appeal to target customers
- Include relevant local keywords
- Maintain professional tone
- Keep within 100-200 words

Write in British English and focus on what makes each business distinctive and valuable to customers.`

    const userPrompt = this.buildBusinessPrompt(businessData)
    
    return this.optimizeForLlama(userPrompt, systemPrompt, 'generation')
  }

  /**
   * Optimize M&A analysis for Llama
   */
  static optimizeMergerAnalysis(targetCompany: any, similarCompany: any, scores: any): OptimizedPrompt {
    const systemPrompt = `You are a senior M&A analyst specializing in business similarity analysis. Provide comprehensive, actionable insights for merger and acquisition decisions.

Your analysis should:
- Focus on strategic alignment and synergy opportunities
- Assess financial compatibility and operational fit
- Identify integration challenges and mitigation strategies
- Provide clear rationale for similarity scores
- Use professional M&A terminology

Return analysis in JSON format with the specified structure.`

    const userPrompt = `Analyze the M&A compatibility between these companies:

TARGET COMPANY:
${JSON.stringify(targetCompany, null, 2)}

SIMILAR COMPANY:
${JSON.stringify(similarCompany, null, 2)}

SIMILARITY SCORES:
${JSON.stringify(scores, null, 2)}

Provide detailed M&A analysis focusing on:
1. Strategic alignment opportunities
2. Financial synergies potential
3. Operational integration challenges
4. Market positioning advantages
5. Risk factors and mitigation strategies

Format as JSON with keys: strategic_alignment, financial_synergies, operational_fit, market_impact, risk_assessment, recommendation.`

    return this.optimizeForLlama(userPrompt, systemPrompt, 'analysis')
  }

  /**
   * Optimize SEO keyword generation for Llama
   */
  static optimizeSEOKeywords(businessData: any): OptimizedPrompt {
    const systemPrompt = `You are an SEO specialist focused on UK and Ireland markets. Generate highly relevant, local SEO keywords that:
- Target local search intent
- Include geographic modifiers
- Cover primary and secondary keywords
- Consider seasonal variations
- Focus on commercial intent

Return ONLY comma-separated keywords, no additional text.`

    const userPrompt = `Generate 10-15 SEO keywords for:
Business: ${businessData.name}
Categories: ${businessData.categories?.join(', ')}
Location: ${JSON.stringify(businessData.address)}
Description: ${businessData.description || 'Not provided'}

Focus on UK/Ireland local SEO terms including city, region, and service-based keywords.`

    return this.optimizeForLlama(userPrompt, systemPrompt, 'extraction')
  }

  /**
   * Build business prompt with structured data
   */
  private static buildBusinessPrompt(business: any): string {
    const sections = [
      `Business Name: ${business.name}`,
      business.categories?.length ? `Categories: ${business.categories.join(', ')}` : null,
      business.address ? `Location: ${typeof business.address === 'string' ? business.address : business.address.formatted || 'UK/Ireland'}` : null,
      business.website ? `Website: ${business.website}` : null,
      business.rating ? `Rating: ${business.rating}/5` : null,
      business.verified ? `Verified Business: Yes` : null,
      business.description ? `Current Description: ${business.description}` : null
    ].filter(Boolean)

    return `Generate a compelling business description for:

${sections.join('\n')}

Requirements:
- 100-200 words
- Professional and engaging tone
- Include relevant keywords naturally
- Highlight unique selling points
- Appeal to local customers
- Use British English`
  }

  /**
   * Convert standard options to Llama-optimized options
   */
  static convertOptionsToLlama(options: GenerationOptions = {}): GenerationOptions {
    // If already optimized, return as-is
    if (options.system_prompt?.includes('<|begin_of_text|>')) {
      return options
    }

    // Apply Llama optimizations
    return {
      ...options,
      temperature: options.temperature ?? 0.7,
      top_p: options.top_p ?? 0.9,
      top_k: options.top_k ?? 40,
      max_tokens: options.max_tokens ?? 500
    }
  }

  /**
   * Post-process Llama responses to clean up artifacts
   */
  static postProcessResponse(response: string): string {
    // Remove Llama-specific tokens that might leak through
    let cleaned = response
      .replace(/<\|end_of_text\|>/g, '')
      .replace(/<\|eot_id\|>/g, '')
      .replace(/<\|start_header_id\|>.*?<\|end_header_id\|>/g, '')
      .trim()

    // Clean up common Llama artifacts
    cleaned = cleaned
      .replace(/^(Assistant:|AI:|Response:)/i, '')
      .replace(/\n\n+/g, '\n\n')
      .trim()

    // Ensure proper JSON formatting if response looks like JSON
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleaned)
        return JSON.stringify(parsed, null, 2)
      } catch {
        // Return as-is if not valid JSON
        return cleaned
      }
    }

    return cleaned
  }

  /**
   * Check if a model is a Llama model
   */
  static isLlamaModel(modelName: string): boolean {
    return /llama/i.test(modelName)
  }

  /**
   * Get model-specific optimizations
   */
  static getModelOptimizations(modelName: string) {
    if (this.isLlamaModel(modelName)) {
      return {
        useSpecialTokens: true,
        maxContextLength: 128000,
        recommendedBatchSize: 1,
        preferredTemperature: 0.7,
        systemPromptTemplate: 'llama3.1'
      }
    }

    return {
      useSpecialTokens: false,
      maxContextLength: 4096,
      recommendedBatchSize: 5,
      preferredTemperature: 0.8,
      systemPromptTemplate: 'standard'
    }
  }
}

/**
 * Llama-specific prompt templates
 */
export const LlamaPromptTemplates = {
  businessAnalysis: `You are a professional business analyst. Analyze the provided business information and provide insights about:
- Market position and competitive advantages
- Target audience and customer segments
- Growth opportunities and potential challenges
- Strategic recommendations

Provide structured, actionable insights based on the available data.`,

  similarityExplanation: `You are a senior M&A analyst explaining company similarity for acquisition decisions. Your explanation should:
- Clearly articulate why companies are similar
- Highlight strategic synergies and opportunities
- Identify potential integration challenges
- Provide confidence reasoning
- Use professional M&A terminology

Focus on actionable insights for investment decisions.`,

  marketAnalysis: `You are a market research specialist analyzing business environments in UK and Ireland. Provide comprehensive analysis covering:
- Market size and growth trends
- Competitive landscape assessment
- Customer behavior insights
- Regional market characteristics
- Strategic positioning opportunities

Use factual, data-driven insights relevant to the specific market context.`
}

/**
 * Helper function to optimize any prompt for Llama models
 */
export function optimizePromptForLlama(
  prompt: string,
  systemPrompt?: string,
  taskType?: 'analysis' | 'generation' | 'classification' | 'extraction' | 'summary'
): { prompt: string, options: GenerationOptions } {
  
  const optimized = LlamaPromptOptimizer.optimizeForLlama(prompt, systemPrompt, taskType)
  
  return {
    prompt: optimized.userPrompt,
    options: {
      system_prompt: optimized.systemPrompt,
      temperature: optimized.temperature,
      top_p: optimized.topP,
      top_k: optimized.topK,
      max_tokens: optimized.maxTokens
    }
  }
}