/**
 * ChatSpot™ - Chat Service
 * Main conversational AI service with action execution
 */

import { createClient } from '@/lib/supabase/server'
import { IntentRecognizer } from './intent-recognizer'
import type { Row } from '@/lib/supabase/helpers'
import type {
  ChatMessage,
  ChatResponse,
  Intent,
  ChatResult,
  ChatContext,
  IntentParameters,
  ActionType
} from './types'

export class ChatService {
  /**
   * Process user message and generate response
   */
  static async processMessage(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<ChatResponse> {
    try {
      const supabase = await createClient()

      // Get or create conversation
      const conversation = conversationId
        ? await this.getConversation(conversationId, userId)
        : await this.createConversation(userId, message)

      if (!conversation) {
        throw new Error('Failed to get conversation')
      }

      // Get conversation history for context
      const history = await this.getRecentMessages(conversation.id, 10)

      // Recognize intent
      const intent = await IntentRecognizer.recognizeIntent(
        message,
        history.map(m => `${m.role}: ${m.content}`)
      )

      // Save user message
      const userMessage = await this.saveMessage(conversation.id, {
        role: 'user',
        content: message,
        intent: intent.type,
        confidence: intent.confidence
      })

      // Execute intent and generate response
      const context: ChatContext = {
        conversation,
        recent_messages: history,
      }

      const responseContent = await this.generateResponse(intent, context)
      const results = await this.executeIntent(intent, context)

      // Save assistant response
      const assistantMessage = await this.saveMessage(conversation.id, {
        role: 'assistant',
        content: responseContent,
        results
      })

      return {
        message: assistantMessage,
        intent,
        results,
        suggested_actions: intent.suggested_actions
      }
    } catch (error) {
      console.error('[ChatService] Error:', error)
      throw error
    }
  }

  /**
   * Generate natural language response based on intent
   */
  private static async generateResponse(intent: Intent, context: ChatContext): Promise<string> {
    try {
      const prompt = this.buildResponsePrompt(intent, context)

      // Use local Ollama for response generation
      const ollamaUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434'
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral:7b',
          messages: [
            {
              role: 'system',
              content: `You are ChatSpot, oppSpot's conversational AI assistant for B2B intelligence.
Be helpful, concise, and action-oriented.
When presenting results, use bullet points and clear formatting.
Always suggest relevant next actions.
Keep responses under 200 words unless detailed explanation needed.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 500
          }
        })
      })

      if (!response.ok) {
        console.error('[ChatService] Ollama response not ok:', response.status, response.statusText)
        return this.fallbackResponse(intent)
      }

      const data = await response.json()
      return data.message?.content || this.fallbackResponse(intent)
    } catch (error) {
      console.error('[ChatService] Response generation error:', error)
      return this.fallbackResponse(intent)
    }
  }

  /**
   * Build prompt for response generation
   */
  private static buildResponsePrompt(intent: Intent, context: ChatContext): string {
    const params = intent.parameters

    let prompt = `User intent: ${intent.type}\n`

    if (Object.keys(params).length > 0) {
      prompt += `Parameters: ${JSON.stringify(params, null, 2)}\n`
    }

    prompt += `\nGenerate a helpful response that:\n`
    prompt += `1. Confirms what the user is looking for\n`
    prompt += `2. Explains what action will be taken\n`
    prompt += `3. Suggests relevant next steps\n`

    return prompt
  }

  /**
   * Execute intent and return results
   */
  private static async executeIntent(intent: Intent, context: ChatContext): Promise<ChatResult[]> {
    const results: ChatResult[] = []

    switch (intent.type) {
      case 'search_companies':
        results.push(await this.searchCompanies(intent.parameters))
        break

      case 'research_company':
        if (intent.parameters.company_names?.length) {
          for (const companyName of intent.parameters.company_names) {
            results.push(await this.researchCompany(companyName))
          }
        }
        break

      case 'find_similar':
        if (intent.parameters.company_names?.length) {
          results.push(await this.findSimilarCompanies(intent.parameters.company_names[0], intent.parameters.limit))
        }
        break

      case 'check_signals':
        results.push(await this.checkBuyingSignals())
        break

      default:
        // For other intents, return a summary result
        results.push({
          type: 'summary',
          data: { intent: intent.type, parameters: intent.parameters },
          preview: 'I can help with that. Please provide more details.'
        })
    }

    return results
  }

  /**
   * Search for companies
   */
  private static async searchCompanies(params: IntentParameters): Promise<ChatResult> {
    try {
      const supabase = await createClient()

      // Build search query with proper filtering
      let query = supabase.from('businesses').select('*')

      // Apply industry filter - search in categories array and industry text field
      if (params.industries?.length) {
        const industryConditions = params.industries.flatMap(industry => {
          const industryLower = industry.toLowerCase()
          return [
            `categories.cs.{${industry}}`,
            `categories.cs.{${industryLower}}`,
            `industry.ilike.%${industry}%`,
            `description.ilike.%${industry}%`,
            `name.ilike.%${industry}%`
          ]
        })
        query = query.or(industryConditions.join(','))
      }

      // Apply location filter - search in multiple location fields
      if (params.locations?.length) {
        const locationConditions = params.locations.flatMap(location => [
          `city.ilike.%${location}%`,
          `address->>city.ilike.%${location}%`,
          `address->>state.ilike.%${location}%`
        ])
        query = query.or(locationConditions.join(','))
      }

      // Apply keyword search - search across name, description, categories
      if (params.keywords?.length) {
        const keywordConditions = params.keywords.flatMap(keyword => [
          `name.ilike.%${keyword}%`,
          `description.ilike.%${keyword}%`,
          `categories.cs.{${keyword}}`
        ])
        query = query.or(keywordConditions.join(','))
      }

      // Apply company size filter
      if (params.company_size) {
        if (params.company_size.min) {
          query = query.gte('employee_count', params.company_size.min)
        }
        if (params.company_size.max) {
          query = query.lte('employee_count', params.company_size.max)
        }
      }

      // Limit results
      query = query.limit(params.limit || 20)

      const { data: companies, error } = await query

      if (error) {
        console.error('[ChatService] Search query error:', error)
        throw error
      }

      return {
        type: 'companies',
        data: companies || [],
        count: companies?.length || 0,
        preview: `Found ${companies?.length || 0} companies matching your criteria`
      }
    } catch (error) {
      console.error('[ChatService] Search error:', error)
      return {
        type: 'error',
        data: { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
        preview: 'Sorry, the search encountered an error'
      }
    }
  }

  /**
   * Research a company
   */
  private static async researchCompany(companyName: string): Promise<ChatResult> {
    try {
      const supabase = await createClient()

      // Find company
      const { data: company } = await supabase
        .from('businesses')
        .select('*')
        .ilike('name', `%${companyName}%`)
        .limit(1)
        .single() as { data: Row<'businesses'> | null; error: any }

      if (!company) {
        return {
          type: 'error',
          data: { error: 'Company not found' },
          preview: `Could not find "${companyName}"`
        }
      }

      // Get company knowledge from Knowledge Graph
      const knowledgeResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/knowledge-graph/entity/${company.id}`)
      const knowledge = knowledgeResponse.ok ? await knowledgeResponse.json() : null

      return {
        type: 'research',
        data: {
          company,
          facts: knowledge?.facts || [],
          relationships: knowledge?.relationships || []
        },
        preview: `Research report for ${company.name}`
      }
    } catch (error) {
      console.error('[ChatService] Research error:', error)
      return {
        type: 'error',
        data: { error: 'Research failed' },
        preview: 'Sorry, research generation failed'
      }
    }
  }

  /**
   * Find similar companies
   */
  private static async findSimilarCompanies(companyName: string, limit: number = 10): Promise<ChatResult> {
    try {
      // Use Knowledge Graph semantic search
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/knowledge-graph/search?q=${encodeURIComponent(companyName)}&entity_type=company&limit=${limit}`
      )

      if (!response.ok) {
        throw new Error('Semantic search failed')
      }

      const data = await response.json()

      return {
        type: 'companies',
        data: data.results || [],
        count: data.total_count || 0,
        preview: `Found ${data.total_count || 0} companies similar to ${companyName}`
      }
    } catch (error) {
      console.error('[ChatService] Similar companies error:', error)
      return {
        type: 'error',
        data: { error: 'Similarity search failed' },
        preview: 'Sorry, could not find similar companies'
      }
    }
  }

  /**
   * Check buying signals
   */
  private static async checkBuyingSignals(): Promise<ChatResult> {
    try {
      const supabase = await createClient()

      // Get recent buying signals
      const { data: signals } = await supabase
        .from('buying_signals')
        .select('*, businesses(*)')
        .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('signal_strength', { ascending: false })
        .limit(20)

      return {
        type: 'summary',
        data: signals || [],
        count: signals?.length || 0,
        preview: `Found ${signals?.length || 0} active buying signals this week`
      }
    } catch (error) {
      console.error('[ChatService] Signals check error:', error)
      return {
        type: 'error',
        data: { error: 'Signal check failed' },
        preview: 'Sorry, could not fetch buying signals'
      }
    }
  }

  /**
   * Fallback response when AI is unavailable
   */
  private static fallbackResponse(intent: Intent): string {
    const responses: Record<string, string> = {
      search_companies: "I'll search for companies matching your criteria. Please wait...",
      research_company: "I'll generate a research report. This will take about 30 seconds...",
      find_similar: "I'll find similar companies using AI similarity matching...",
      check_signals: "I'll check for recent buying signals across your target accounts...",
      unknown: "I can help you with that. Could you provide more details?"
    }

    return responses[intent.type] || responses.unknown
  }

  /**
   * Helper: Get or create conversation
   */
  private static async getConversation(conversationId: string, userId: string) {
    const supabase = await createClient()

    const { data } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single() as { data: Row<'chat_conversations'> | null; error: any }

    return data
  }

  /**
   * Helper: Create new conversation
   */
  private static async createConversation(userId: string, firstMessage: string) {
    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single() as { data: Row<'profiles'> | null; error: any }

    if (!profile) return null

    const { data } = await supabase
      .from('chat_conversations')
      .insert({
        org_id: profile.org_id,
        user_id: userId,
        title: firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : ''),
        is_active: true
      })
      .select()
      .single()

    return data
  }

  /**
   * Helper: Get recent messages
   */
  private static async getRecentMessages(conversationId: string, limit: number = 10): Promise<ChatMessage[]> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit) as { data: Row<'chat_messages'>[] | null; error: any }

    return (data || []).reverse()
  }

  /**
   * Helper: Save message
   */
  private static async saveMessage(conversationId: string, message: Partial<ChatMessage>): Promise<ChatMessage> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        intent: message.intent,
        confidence: message.confidence,
        results: message.results
      })
      .select()
      .single()

    return data as ChatMessage
  }
}
