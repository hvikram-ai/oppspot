/**
 * RAG Query Service
 * Retrieves user context from pgvector (Supabase) and enriches LLM queries
 *
 * Flow:
 * 1. User submits query
 * 2. Generate embedding for query
 * 3. Search user's context vectors for relevant context
 * 4. Build enriched prompt with context
 * 5. Query LLM with full context
 * 6. Return personalized response
 */

import { getPgVectorClient as getPineconeClient, type QueryResult, type PineconeMetadata } from './pgvector-client'
import { embeddingService } from '@/lib/ai/embedding/embedding-service'
import { getLLMProvider } from '@/lib/ai/llm-factory'
import type { LLMMessage } from '@/lib/ai/llm-interface'

export interface RAGQueryOptions {
  query: string
  userId: string
  contextTypes?: Array<'saved_company' | 'won_deal' | 'lost_deal' | 'icp' | 'research' | 'follower'>
  maxContextItems?: number
  similarityThreshold?: number
  includeExplanation?: boolean
  systemPrompt?: string
}

export interface RAGQueryResult {
  response: string
  contextUsed: ContextItem[]
  explanation?: string
  metadata: {
    contextItemsRetrieved: number
    contextItemsUsed: number
    querySimilarityAvg: number
    responseTime_ms: number
  }
}

export interface ContextItem {
  id: string
  type: string
  content: string
  similarity: number
  metadata: PineconeMetadata
}

export class RAGQueryService {
  private pinecone = getPineconeClient()

  /**
   * Query with RAG - retrieve user context and generate personalized response
   */
  async queryWithContext(options: RAGQueryOptions): Promise<RAGQueryResult> {
    const startTime = Date.now()

    try {
      // Step 1: Generate embedding for query
      const { embedding: queryEmbedding } = await embeddingService.generateCompanyEmbedding({
        name: options.query
      })

      // Step 2: Retrieve relevant context from user's namespace
      const contextItems = await this.retrieveContext(
        options.userId,
        queryEmbedding,
        options
      )

      console.log(`[RAG Query] Retrieved ${contextItems.length} context items for user ${options.userId}`)

      // Step 3: Build enriched prompt
      const enrichedMessages = this.buildEnrichedPrompt(
        options.query,
        contextItems,
        options.systemPrompt
      )

      // Step 4: Query LLM
      const llm = getLLMProvider()
      const response = await llm.chat(enrichedMessages, {
        temperature: 0.7,
        maxTokens: 1500
      })

      // Step 5: Generate explanation if requested
      let explanation: string | undefined
      if (options.includeExplanation && contextItems.length > 0) {
        explanation = this.generateExplanation(contextItems)
      }

      const duration = Date.now() - startTime

      return {
        response: response.content,
        contextUsed: contextItems,
        explanation,
        metadata: {
          contextItemsRetrieved: contextItems.length,
          contextItemsUsed: contextItems.filter(c => c.similarity > (options.similarityThreshold || 0.7)).length,
          querySimilarityAvg: contextItems.reduce((sum, c) => sum + c.similarity, 0) / (contextItems.length || 1),
          responseTime_ms: duration
        }
      }
    } catch (error) {
      console.error('[RAG Query] Error:', error)
      throw new Error(`RAG query failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Retrieve relevant context from Pinecone
   */
  private async retrieveContext(
    userId: string,
    queryEmbedding: number[],
    options: RAGQueryOptions
  ): Promise<ContextItem[]> {
    const maxItems = options.maxContextItems || 10
    const threshold = options.similarityThreshold || 0.65

    // Build filter if specific types requested
    const filter = options.contextTypes
      ? { type: { $in: options.contextTypes } }
      : undefined

    // Query Pinecone
    const results = await this.pinecone.query(userId, queryEmbedding, {
      topK: maxItems,
      filter,
      includeMetadata: true
    })

    // Filter by similarity threshold and convert to ContextItems
    const contextItems: ContextItem[] = results
      .filter(r => r.score >= threshold)
      .map(r => this.resultToContextItem(r))

    return contextItems
  }

  /**
   * Convert Pinecone result to ContextItem
   */
  private resultToContextItem(result: QueryResult): ContextItem {
    const metadata = result.metadata!

    let content = ''

    switch (metadata.type) {
      case 'saved_company':
        content = `Saved company: ${metadata.company_name}`
        if (metadata.user_notes) content += ` | Notes: ${metadata.user_notes}`
        if (metadata.industry) content += ` | Industry: ${metadata.industry}`
        break

      case 'won_deal':
        content = `Won deal worth $${metadata.deal_value?.toLocaleString()}`
        if (metadata.outcome_reason) content += ` | Win reason: ${metadata.outcome_reason}`
        if (metadata.industry) content += ` | Industry: ${metadata.industry}`
        break

      case 'lost_deal':
        content = `Lost deal worth $${metadata.deal_value?.toLocaleString()}`
        if (metadata.outcome_reason) content += ` | Loss reason: ${metadata.outcome_reason}`
        break

      case 'icp':
        content = `ICP profile v${metadata.icp_version}: Win rate ${(metadata.win_rate! * 100).toFixed(1)}%, Avg deal $${metadata.avg_deal_size?.toLocaleString()}`
        break

      case 'research':
        content = `Research on ${metadata.company_name}`
        if (metadata.key_findings) content += ` | Findings: ${metadata.key_findings}`
        if (metadata.signals) content += ` | Signals: ${metadata.signals.join(', ')}`
        break

      case 'follower':
        content = `Following ${metadata.company_name}`
        if (metadata.industry) content += ` in ${metadata.industry}`
        break

      default:
        content = `Context item: ${metadata.type}`
    }

    return {
      id: result.id,
      type: metadata.type,
      content,
      similarity: result.score,
      metadata
    }
  }

  /**
   * Build enriched prompt with user context
   */
  private buildEnrichedPrompt(
    query: string,
    contextItems: ContextItem[],
    customSystemPrompt?: string
  ): LLMMessage[] {
    const messages: LLMMessage[] = []

    // System prompt
    const systemPrompt = customSystemPrompt || this.getDefaultSystemPrompt()
    messages.push({
      role: 'system',
      content: systemPrompt
    })

    // User context (if available)
    if (contextItems.length > 0) {
      const contextPrompt = this.buildContextPrompt(contextItems)
      messages.push({
        role: 'system',
        content: contextPrompt
      })
    }

    // User query
    messages.push({
      role: 'user',
      content: query
    })

    return messages
  }

  /**
   * Build context section of prompt
   */
  private buildContextPrompt(contextItems: ContextItem): string {
    const lines: string[] = []

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('USER CONTEXT (use this to personalize your response):')
    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('')

    // Group by type
    const grouped = this.groupContextByType(contextItems)

    // Saved companies
    if (grouped.saved_company.length > 0) {
      lines.push('**Saved Companies** (user has shown interest):')
      grouped.saved_company.forEach((item, i) => {
        lines.push(`${i + 1}. ${item.content} (relevance: ${(item.similarity * 100).toFixed(0)}%)`)
      })
      lines.push('')
    }

    // Won deals (pattern learning)
    if (grouped.won_deal.length > 0) {
      lines.push('**Successful Deals** (learn from these patterns):')
      grouped.won_deal.forEach((item, i) => {
        lines.push(`${i + 1}. ${item.content}`)
      })
      lines.push('')
    }

    // Lost deals (what to avoid)
    if (grouped.lost_deal.length > 0) {
      lines.push('**Lost Deals** (patterns to avoid):')
      grouped.lost_deal.forEach((item, i) => {
        lines.push(`${i + 1}. ${item.content}`)
      })
      lines.push('')
    }

    // ICP
    if (grouped.icp.length > 0) {
      lines.push('**Ideal Customer Profile**:')
      grouped.icp.forEach((item) => {
        lines.push(`• ${item.content}`)
      })
      lines.push('')
    }

    // Research
    if (grouped.research.length > 0) {
      lines.push('**Recent Research**:')
      grouped.research.forEach((item, i) => {
        lines.push(`${i + 1}. ${item.content}`)
      })
      lines.push('')
    }

    // Followers
    if (grouped.follower.length > 0) {
      lines.push('**Companies Being Tracked**:')
      grouped.follower.forEach((item, i) => {
        lines.push(`${i + 1}. ${item.content}`)
      })
      lines.push('')
    }

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    lines.push('')
    lines.push('**IMPORTANT**: Use the above context to provide PERSONALIZED recommendations that match this user\'s specific patterns, preferences, and history. Explain WHY each recommendation aligns with their context.')

    return lines.join('\n')
  }

  /**
   * Group context items by type
   */
  private groupContextByType(items: ContextItem[]): Record<string, ContextItem[]> {
    const grouped: Record<string, ContextItem[]> = {
      saved_company: [],
      won_deal: [],
      lost_deal: [],
      icp: [],
      research: [],
      follower: []
    }

    items.forEach(item => {
      if (grouped[item.type]) {
        grouped[item.type].push(item)
      }
    })

    return grouped
  }

  /**
   * Generate explanation of why certain recommendations were made
   */
  private generateExplanation(contextItems: ContextItem[]): string {
    const parts: string[] = []

    const grouped = this.groupContextByType(contextItems)

    if (grouped.saved_company.length > 0) {
      const top3 = grouped.saved_company.slice(0, 3).map(c => c.metadata.company_name).join(', ')
      parts.push(`Based on your saved companies (${top3})`)
    }

    if (grouped.won_deal.length > 0) {
      const avgDeal = grouped.won_deal.reduce((sum, d) => sum + (d.metadata.deal_value || 0), 0) / grouped.won_deal.length
      parts.push(`matching your $${avgDeal.toLocaleString()} deal size pattern`)
    }

    if (grouped.icp.length > 0) {
      const icp = grouped.icp[0]
      parts.push(`and ${(icp.metadata.win_rate! * 100).toFixed(0)}% ICP win rate`)
    }

    return parts.length > 0 ? parts.join(', ') + '.' : 'Based on your activity history.'
  }

  /**
   * Default system prompt for RAG queries
   */
  private getDefaultSystemPrompt(): string {
    return `You are an intelligent B2B sales assistant for oppSpot, helping users find and evaluate potential business opportunities.

Your role is to provide PERSONALIZED recommendations based on the user's specific context, history, and patterns.

Key principles:
1. Always consider the user's past behavior (saved companies, won/lost deals, ICP)
2. Explain WHY each recommendation matches their specific preferences
3. Learn from successful patterns (won deals) and avoid unsuccessful ones (lost deals)
4. Be specific and actionable - reference concrete examples from their history
5. If they have an ICP, prioritize recommendations that match it

When the user has NO context available, provide helpful generic recommendations but note that results would be more personalized with their activity history.`
  }

  /**
   * Simple query without RAG (for comparison / fallback)
   */
  async queryWithoutContext(query: string, systemPrompt?: string): Promise<string> {
    const llm = getLLMProvider()

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: systemPrompt || this.getDefaultSystemPrompt()
      },
      {
        role: 'user',
        content: query
      }
    ]

    const response = await llm.chat(messages, {
      temperature: 0.7,
      maxTokens: 1500
    })

    return response.content
  }
}

// Singleton
let ragQueryService: RAGQueryService | null = null

export function getRAGQueryService(): RAGQueryService {
  if (!ragQueryService) {
    ragQueryService = new RAGQueryService()
  }
  return ragQueryService
}
