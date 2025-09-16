/**
 * Chat Orchestrator Service
 * Manages the entire chat flow including tool calling, context management, and citations
 */

import { OllamaClient } from './ollama'
import { WebSearchService } from '../opp-scan/services/web-search-service'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

// Types and Interfaces
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  citations?: Citation[]
  confidence?: number
  metadata?: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}

export interface Citation {
  id: string
  source_type: 'web' | 'platform' | 'document' | 'analysis'
  title: string
  url?: string
  snippet: string
  confidence: number
  relevance: number
  metadata?: Record<string, unknown>
}

export interface ChatContext {
  session_id: string
  user_id?: string
  current_page?: string
  current_context?: Record<string, unknown>
  preferences?: Record<string, unknown>
}

export interface StreamChunk {
  type: 'text' | 'citation' | 'tool_call' | 'thinking' | 'error'
  content: string
  citations?: Citation[]
  tool_call?: ToolCall
  timestamp: Date
}

// Tool definitions
const AVAILABLE_TOOLS = {
  search_web: {
    name: 'search_web',
    description: 'Search the internet for current information',
    parameters: {
      query: 'string',
      num_results: 'number'
    }
  },
  search_platform: {
    name: 'search_platform',
    description: 'Search within the OppSpot platform data',
    parameters: {
      query: 'string',
      type: 'companies | scans | analyses'
    }
  },
  analyze_company: {
    name: 'analyze_company',
    description: 'Analyze a specific company in detail',
    parameters: {
      company_name: 'string',
      analysis_type: 'financial | competitive | market'
    }
  },
  explain_feature: {
    name: 'explain_feature',
    description: 'Explain how a platform feature works',
    parameters: {
      feature_name: 'string'
    }
  },
  generate_report: {
    name: 'generate_report',
    description: 'Generate a detailed report',
    parameters: {
      report_type: 'string',
      data: 'object'
    }
  }
}

export class ChatOrchestrator {
  private ollama: OllamaClient
  private webSearchService: WebSearchService
  private supabase: SupabaseClient | null = null
  private context: ChatContext | null = null
  private conversationHistory: ChatMessage[] = []
  
  constructor() {
    this.ollama = new OllamaClient()
    this.webSearchService = new WebSearchService()
  }
  
  /**
   * Initialize the orchestrator with context
   */
  async initialize(context: ChatContext) {
    this.context = context
    this.supabase = await createClient()
    
    // Load conversation history if session exists
    if (context.session_id) {
      await this.loadConversationHistory(context.session_id)
    }
  }
  
  /**
   * Process a user message and generate a response
   */
  async processMessage(
    userMessage: string,
    onStream?: (chunk: StreamChunk) => void
  ): Promise<ChatMessage> {
    try {
      // Add user message to history
      const userMsg: ChatMessage = {
        role: 'user',
        content: userMessage,
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
      this.conversationHistory.push(userMsg)
      
      // Save user message to database
      if (this.context?.session_id) {
        await this.saveMessage(userMsg)
      }
      
      // Analyze intent and determine if tools are needed
      const toolsNeeded = await this.analyzeIntent(userMessage)
      
      // Execute tools if needed
      const toolResults: ToolCall[] = []
      const citations: Citation[] = []
      
      if (toolsNeeded.length > 0) {
        onStream?.({
          type: 'thinking',
          content: 'Analyzing your request and gathering information...',
          timestamp: new Date()
        })
        
        for (const tool of toolsNeeded) {
          const result = await this.executeTool(tool, onStream)
          toolResults.push(result)
          
          // Extract citations from tool results
          if (result.result?.citations) {
            citations.push(...result.result.citations)
          }
        }
      }
      
      // Generate response with context
      const response = await this.generateResponse(
        userMessage,
        toolResults,
        citations,
        onStream
      )
      
      // Add assistant message to history
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.content,
        tool_calls: toolResults.length > 0 ? toolResults : undefined,
        citations: citations.length > 0 ? citations : undefined,
        confidence: response.confidence,
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'mistral:7b',
          tokens_used: response.tokens_used
        }
      }
      this.conversationHistory.push(assistantMsg)
      
      // Save assistant message to database
      if (this.context?.session_id) {
        await this.saveMessage(assistantMsg)
        
        // Save citations separately
        if (citations.length > 0) {
          await this.saveCitations(assistantMsg, citations)
        }
      }
      
      return assistantMsg
      
    } catch (error) {
      console.error('[ChatOrchestrator] Error processing message:', error)
      
      onStream?.({
        type: 'error',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      })
      
      throw error
    }
  }
  
  /**
   * Analyze user intent and determine which tools to use
   */
  private async analyzeIntent(message: string): Promise<ToolCall[]> {
    try {
      const prompt = `Analyze this user message and determine which tools (if any) are needed to answer it properly.

User Message: "${message}"

Available Tools:
${Object.entries(AVAILABLE_TOOLS).map(([name, tool]) => 
  `- ${name}: ${tool.description}`
).join('\n')}

Current Context:
- Page: ${this.context?.current_page || 'Unknown'}
- Has conversation history: ${this.conversationHistory.length > 1}

Return a JSON array of tool calls needed. If no tools are needed, return an empty array.
Each tool call should have:
{
  "id": "unique_id",
  "name": "tool_name",
  "arguments": { ... }
}

Examples:
- "What is Apple's revenue?" -> [{"id": "1", "name": "search_web", "arguments": {"query": "Apple revenue latest", "num_results": 5}}]
- "How does the similarity analysis work?" -> [{"id": "1", "name": "explain_feature", "arguments": {"feature_name": "similarity_analysis"}}]
- "Hello" -> []

Response (JSON only):`;

      const response = await this.ollama.complete(prompt, {
        temperature: 0.3,
        max_tokens: 500,
        model: 'tinyllama:1.1b' // Use fast model for intent analysis
      })
      
      // Parse JSON response
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      return []
    } catch (error) {
      console.warn('[ChatOrchestrator] Intent analysis failed, using rule-based fallback:', error)
      
      // Rule-based fallback for common intents
      const lowerMessage = message.toLowerCase()
      const toolCalls: ToolCall[] = []
      
      // Check for feature explanations
      if (lowerMessage.includes('how') || lowerMessage.includes('what') || lowerMessage.includes('explain')) {
        if (lowerMessage.includes('similarity') || lowerMessage.includes('similar')) {
          toolCalls.push({
            id: 'fallback_1',
            name: 'explain_feature',
            arguments: { feature_name: 'similarity_analysis' }
          })
        } else if (lowerMessage.includes('opp') && lowerMessage.includes('scan')) {
          toolCalls.push({
            id: 'fallback_2',
            name: 'explain_feature',
            arguments: { feature_name: 'opp_scan' }
          })
        }
      }
      
      // Check for search requests
      if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('show')) {
        if (lowerMessage.includes('compan')) {
          toolCalls.push({
            id: 'fallback_3',
            name: 'search_platform',
            arguments: { query: message, type: 'companies' }
          })
        }
      }
      
      return toolCalls
    }
  }
  
  /**
   * Execute a tool call
   */
  private async executeTool(
    toolCall: ToolCall,
    onStream?: (chunk: StreamChunk) => void
  ): Promise<ToolCall> {
    onStream?.({
      type: 'tool_call',
      content: `Using tool: ${toolCall.name}`,
      tool_call: toolCall,
      timestamp: new Date()
    })
    
    try {
      switch (toolCall.name) {
        case 'search_web':
          toolCall.result = await this.executeWebSearch(toolCall.arguments)
          break
          
        case 'search_platform':
          toolCall.result = await this.executePlatformSearch(toolCall.arguments)
          break
          
        case 'analyze_company':
          toolCall.result = await this.executeCompanyAnalysis(toolCall.arguments)
          break
          
        case 'explain_feature':
          toolCall.result = await this.executeFeatureExplanation(toolCall.arguments)
          break
          
        case 'generate_report':
          toolCall.result = await this.executeReportGeneration(toolCall.arguments)
          break
          
        default:
          toolCall.result = { error: 'Unknown tool' }
      }
    } catch (error) {
      toolCall.result = { 
        error: error instanceof Error ? error.message : 'Tool execution failed' 
      }
    }
    
    return toolCall
  }
  
  /**
   * Execute web search
   */
  private async executeWebSearch(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const results = await this.webSearchService.searchCompanies({
      query: args.query,
      filters: {},
      limit: args.num_results || 5
    })
    
    // Convert to citations
    const citations: Citation[] = results.companies.map((company, index) => ({
      id: `web_${index}`,
      source_type: 'web' as const,
      title: company.name,
      url: company.website,
      snippet: company.description || '',
      confidence: company.confidence || 0.7,
      relevance: 0.8,
      metadata: {
        source: company.source,
        location: company.location
      }
    }))
    
    return {
      results: results.companies,
      citations,
      total: results.total
    }
  }
  
  /**
   * Execute platform search
   */
  private async executePlatformSearch(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.supabase) {
      return { error: 'Database not initialized' }
    }
    
    let query = this.supabase
      .from(args.type === 'companies' ? 'businesses' : 
            args.type === 'scans' ? 'acquisition_scans' : 
            'similar_company_analyses')
      .select('*')
    
    // Add search filter
    if (args.query) {
      query = query.textSearch('name', args.query)
    }
    
    const { data, error } = await query.limit(10)
    
    if (error) {
      return { error: error.message }
    }
    
    return {
      results: data,
      total: data?.length || 0
    }
  }
  
  /**
   * Execute company analysis
   */
  private async executeCompanyAnalysis(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    // This would integrate with your existing company analysis services
    return {
      company: args.company_name,
      analysis_type: args.analysis_type,
      summary: `Analysis of ${args.company_name} would be performed here`,
      data: {}
    }
  }
  
  /**
   * Execute feature explanation
   */
  private async executeFeatureExplanation(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const featureExplanations: Record<string, string> = {
      similarity_analysis: "The Similarity Analysis feature uses AI to find companies similar to your target based on multiple dimensions including financial, strategic, operational, market, and risk factors.",
      opp_scan: "OppScan is our comprehensive M&A opportunity scanner that searches across multiple data sources to identify potential acquisition targets.",
      target_intelligence: "Target Intelligence provides deep AI-powered analysis of potential acquisition targets, including financial estimates, market position, and strategic fit assessment."
    }
    
    return {
      feature: args.feature_name,
      explanation: featureExplanations[args.feature_name] || 'Feature explanation not found',
      related_features: Object.keys(featureExplanations).filter(f => f !== args.feature_name)
    }
  }
  
  /**
   * Execute report generation
   */
  private async executeReportGeneration(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      report_type: args.report_type,
      status: 'Report generation would be implemented here',
      data: args.data
    }
  }
  
  /**
   * Generate final response using LLM
   */
  private async generateResponse(
    userMessage: string,
    toolResults: ToolCall[],
    citations: Citation[],
    onStream?: (chunk: StreamChunk) => void
  ): Promise<any> {
    try {
    // Build context from conversation history
    const conversationContext = this.conversationHistory
      .slice(-5) // Last 5 messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n')
    
    // Build tool results context
    const toolContext = toolResults.length > 0 
      ? `\nTool Results:\n${toolResults.map(t => 
          `${t.name}: ${JSON.stringify(t.result, null, 2)}`
        ).join('\n\n')}`
      : ''
    
    const prompt = `You are OppSpot AI Assistant, a helpful AI chatbot that assists users with business intelligence, M&A analysis, and platform navigation.

Conversation History:
${conversationContext}

Current User Message: ${userMessage}
${toolContext}

Instructions:
1. Provide a helpful, accurate response based on the information available
2. If tool results are provided, use them to give specific, detailed answers
3. Reference sources when available using [1], [2], etc. format
4. Be conversational but professional
5. If you're not sure about something, say so
6. Suggest follow-up questions or actions when appropriate

Response:`;

    onStream?.({
      type: 'text',
      content: '',
      timestamp: new Date()
    })

    const response = await this.ollama.complete(prompt, {
      temperature: 0.7,
      max_tokens: 1000,
      model: 'mistral:7b',
      stream: false
    })
    
    // Calculate confidence based on tool results and citations
    const confidence = this.calculateConfidence(toolResults, citations)
    
    return {
      content: response,
      confidence,
      tokens_used: response.length // Approximate
    }
    } catch (error) {
      console.error('[ChatOrchestrator] Error generating response:', error)
      
      // Fallback response when Ollama is not available
      const fallbackResponse = this.generateFallbackResponse(userMessage, toolResults)
      
      return {
        content: fallbackResponse,
        confidence: 0.3,
        tokens_used: fallbackResponse.length
      }
    }
  }
  
  /**
   * Generate fallback response when LLM is unavailable
   */
  private generateFallbackResponse(userMessage: string, toolResults: ToolCall[]): string {
    const lowerMessage = userMessage.toLowerCase()
    
    // Handle common greetings
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! I'm your OppSpot AI assistant. I can help you with business intelligence, M&A analysis, and navigating the platform. What would you like to know?"
    }
    
    // Handle help requests
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return "I can help you with:\n\n• Finding and analyzing companies\n• Understanding similarity analysis\n• Exploring M&A opportunities\n• Navigating OppSpot features\n• Answering questions about business intelligence\n\nWhat would you like to explore?"
    }
    
    // Handle feature questions
    if (lowerMessage.includes('similarity') || lowerMessage.includes('similar')) {
      return "The Similarity Analysis feature uses AI to find companies similar to your target based on multiple dimensions including financial, strategic, operational, market, and risk factors. You can access it from the main dashboard or company profile pages."
    }
    
    if (lowerMessage.includes('opp scan') || lowerMessage.includes('oppscan')) {
      return "OppScan is our comprehensive M&A opportunity scanner that searches across multiple data sources to identify potential acquisition targets. It analyzes companies based on your specified criteria and provides detailed intelligence reports."
    }
    
    // If we have tool results, try to provide a basic response
    if (toolResults.length > 0) {
      const toolResult = toolResults[0]
      if (toolResult.result && !toolResult.result.error) {
        return `Based on the search results, I found relevant information. ${JSON.stringify(toolResult.result).substring(0, 500)}...`
      }
    }
    
    // Default fallback
    return "I'm here to help you with OppSpot's features and business intelligence. Could you please rephrase your question or let me know what specific information you're looking for?"
  }
  
  /**
   * Calculate response confidence
   */
  private calculateConfidence(toolResults: ToolCall[], citations: Citation[]): number {
    let confidence = 0.5 // Base confidence
    
    // Increase confidence if we have tool results
    if (toolResults.length > 0) {
      confidence += 0.2
    }
    
    // Increase confidence based on citations
    if (citations.length > 0) {
      const avgCitationConfidence = citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length
      confidence += avgCitationConfidence * 0.3
    }
    
    return Math.min(confidence, 1.0)
  }
  
  /**
   * Load conversation history from database
   */
  private async loadConversationHistory(sessionId: string) {
    if (!this.supabase) return
    
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50)
    
    if (!error && data) {
      this.conversationHistory = data.map(msg => ({
        role: msg.role as ChatMessage['role'],
        content: msg.content,
        tool_calls: msg.tool_calls,
        citations: msg.citations,
        confidence: msg.confidence_score,
        metadata: msg.metadata
      }))
    }
  }
  
  /**
   * Save message to database
   */
  private async saveMessage(message: ChatMessage) {
    if (!this.supabase || !this.context?.session_id) return
    
    await this.supabase
      .from('chat_messages')
      .insert({
        session_id: this.context.session_id,
        role: message.role,
        content: message.content,
        tool_calls: message.tool_calls || [],
        citations: message.citations || [],
        confidence_score: message.confidence,
        metadata: message.metadata || {}
      })
  }
  
  /**
   * Save citations to database
   */
  private async saveCitations(message: ChatMessage, citations: Citation[]) {
    if (!this.supabase) return
    
    // Get the message ID from database
    const { data: messageData } = await this.supabase
      .from('chat_messages')
      .select('id')
      .eq('session_id', this.context?.session_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (messageData) {
      const citationRecords = citations.map(citation => ({
        message_id: messageData.id,
        source_type: citation.source_type,
        title: citation.title,
        url: citation.url,
        snippet: citation.snippet,
        confidence_score: citation.confidence,
        relevance_score: citation.relevance,
        metadata: citation.metadata || {}
      }))
      
      await this.supabase
        .from('chat_citations')
        .insert(citationRecords)
    }
  }
  
  /**
   * Get or create a chat session
   */
  async getOrCreateSession(userId?: string, context?: Record<string, unknown>): Promise<string> {
    try {
      if (!this.supabase) {
        this.supabase = await createClient()
      }
      
      const { data, error } = await this.supabase
        .rpc('get_or_create_chat_session', {
          p_user_id: userId,
          p_title: 'New Chat',
          p_context: context || {}
        })
      
      if (error) {
        console.warn('[ChatOrchestrator] Session creation failed:', error)
        // Return a temporary session ID as fallback
        return `temp_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
      
      return data
    } catch (error) {
      console.warn('[ChatOrchestrator] Could not connect to database:', error)
      // Return a temporary session ID as fallback
      return `temp_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }
  
  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = []
  }
}