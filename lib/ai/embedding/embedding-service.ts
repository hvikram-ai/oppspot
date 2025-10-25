/**
 * Embedding Service
 * Generates vector embeddings for semantic search using OpenAI
 *
 * Features:
 * - Generate embeddings for companies (1536 dimensions)
 * - Batch processing (up to 100 companies at once)
 * - Save embeddings to database
 * - Find similar companies using vector similarity
 * - Semantic search by natural language
 *
 * Cost: $0.02 per 1M tokens (text-embedding-3-small)
 */

import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import type { Row } from '@/lib/supabase/helpers'

export interface EmbeddingOptions {
  model?: 'text-embedding-3-small' | 'text-embedding-3-large'
  cacheKey?: string
}

export interface EmbeddingResult {
  embedding: number[]
  model: string
  tokenCount: number
}

export interface CompanyEmbeddingInput {
  name: string
  description?: string | null
  industry?: string | null
  sic_codes?: string[] | null
  website?: string | null
  categories?: string[] | null
  address?: string | null
}

export interface SimilarCompany {
  id: string
  name: string
  similarity: number
}

export class EmbeddingService {
  private openai: OpenAI | null = null

  constructor() {
    // Lazy initialization - don't throw during module load/build time
  }

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      // Support both OpenAI and OpenRouter
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY or OPENROUTER_API_KEY environment variable is required')
      }

      // If using OpenRouter, configure base URL
      const config: any = { apiKey }
      if (process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
        config.baseURL = 'https://openrouter.ai/api/v1'
        config.defaultHeaders = {
          'HTTP-Referer': 'https://oppspot.ai',
          'X-Title': 'oppSpot'
        }
      }

      this.openai = new OpenAI(config)
    }
    return this.openai
  }

  /**
   * Generate embedding for a single company
   */
  async generateCompanyEmbedding(
    companyData: CompanyEmbeddingInput,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> {
    const model = options.model || 'text-embedding-3-small'
    const companyText = this.buildCompanyText(companyData)

    try {
      const response = await this.getOpenAI().embeddings.create({
        model,
        input: companyText,
        encoding_format: 'float'
      })

      return {
        embedding: response.data[0].embedding,
        model,
        tokenCount: response.usage.total_tokens
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[Embedding Service] Error generating embedding:', error)
      throw new Error(`Failed to generate embedding: ${errorMessage}`)
    }
  }

  /**
   * Batch generate embeddings for multiple companies
   * Processes up to 100 companies at once (OpenAI limit)
   */
  async generateBatchEmbeddings(
    companies: CompanyEmbeddingInput[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    const batchSize = 100
    const results: EmbeddingResult[] = []
    const model = options.model || 'text-embedding-3-small'

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize)
      const batchTexts = batch.map(c => this.buildCompanyText(c))

      try {
        const response = await this.getOpenAI().embeddings.create({
          model,
          input: batchTexts,
          encoding_format: 'float'
        })

        const batchResults = response.data.map((item, index) => ({
          embedding: item.embedding,
          model,
          tokenCount: Math.round(response.usage.total_tokens / batch.length) // Approximate per company
        }))

        results.push(...batchResults)

        // Log progress for large batches
        if (companies.length > batchSize) {
          console.log(`[Embedding Service] Processed ${Math.min(i + batchSize, companies.length)}/${companies.length} companies`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[Embedding Service] Error in batch ${i}-${i + batchSize}:`, error)
        throw new Error(`Batch embedding failed: ${errorMessage}`)
      }
    }

    return results
  }

  /**
   * Save embedding to database
   */
  async saveEmbedding(
    companyId: string,
    embeddingResult: EmbeddingResult
  ): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('businesses')
      .update({
        embedding: JSON.stringify(embeddingResult.embedding),
        embedding_model: embeddingResult.model,
        embedding_generated_at: new Date().toISOString(),
        embedding_token_count: embeddingResult.tokenCount
      })
      .eq('id', companyId)

    if (error) {
      throw new Error(`Failed to save embedding for ${companyId}: ${error.message}`)
    }
  }

  /**
   * Save batch embeddings to database
   * More efficient than calling saveEmbedding() individually
   */
  async saveBatchEmbeddings(
    updates: Array<{ companyId: string; embeddingResult: EmbeddingResult }>
  ): Promise<void> {
    const supabase = await createClient()

    const promises = updates.map(({ companyId, embeddingResult }) =>
      supabase
        .from('businesses')
        .update({
          embedding: JSON.stringify(embeddingResult.embedding),
          embedding_model: embeddingResult.model,
          embedding_generated_at: new Date().toISOString(),
          embedding_token_count: embeddingResult.tokenCount
        })
        .eq('id', companyId)
    )

    const results = await Promise.allSettled(promises)

    const failed = results.filter(r => r.status === 'rejected')
    if (failed.length > 0) {
      console.error(`[Embedding Service] Failed to save ${failed.length} embeddings`)
    }
  }

  /**
   * Find similar companies using vector similarity
   * Uses cosine distance (0 = identical, 2 = opposite)
   */
  async findSimilarCompanies(
    companyId: string,
    options: {
      limit?: number
      threshold?: number
    } = {}
  ): Promise<SimilarCompany[]> {
    const supabase = await createClient()

    // Get the company's embedding
    const { data: company, error: fetchError } = await supabase
      .from('businesses')
      .select('embedding')
      .eq('id', companyId)
      .single() as { data: (Row<'businesses'> & { embedding?: number[] }) | null; error: any }

    if (fetchError || !company?.embedding) {
      throw new Error(`Company embedding not found for ${companyId}`)
    }

    // Use the database function to find similar companies
    const { data, error } = await supabase
      .rpc('find_similar_companies', {
        query_embedding: company.embedding,
        match_threshold: options.threshold || 0.7,
        match_count: options.limit || 20
      })

    if (error) {
      throw new Error(`Similarity search failed: ${error.message}`)
    }

    return (data || []) as SimilarCompany[]
  }

  /**
   * Semantic search by natural language query
   * Example: "fintech companies in London"
   */
  async semanticSearch(
    query: string,
    options: {
      limit?: number
      threshold?: number
    } = {}
  ): Promise<SimilarCompany[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.generateCompanyEmbedding(
      { name: query }
    )

    const supabase = await createClient()

    // Search using the query embedding
    const { data, error } = await supabase
      .rpc('find_similar_companies', {
        query_embedding: JSON.stringify(queryEmbedding.embedding),
        match_threshold: options.threshold || 0.7,
        match_count: options.limit || 20
      })

    if (error) {
      throw new Error(`Semantic search failed: ${error.message}`)
    }

    return (data || []) as SimilarCompany[]
  }

  /**
   * Check if a company has an embedding
   */
  async hasEmbedding(companyId: string): Promise<boolean> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('businesses')
      .select('embedding')
      .eq('id', companyId)
      .single() as { data: (Row<'businesses'> & { embedding?: number[] }) | null; error: any }

    return !!data?.embedding
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(): Promise<{
    total: number
    withEmbeddings: number
    withoutEmbeddings: number
    percentage: number
    totalTokens: number
    estimatedCost: number
  }> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('businesses_with_embeddings')
      .select('has_embedding, embedding_token_count') as {
        data: Array<{ has_embedding?: boolean; embedding_token_count?: number }> | null
        error: any
      }

    if (!data) {
      return {
        total: 0,
        withEmbeddings: 0,
        withoutEmbeddings: 0,
        percentage: 0,
        totalTokens: 0,
        estimatedCost: 0
      }
    }

    const total = data.length
    const withEmbeddings = data.filter(d => d.has_embedding).length
    const withoutEmbeddings = total - withEmbeddings
    const totalTokens = data.reduce((sum, d) => sum + (d.embedding_token_count || 0), 0)
    const estimatedCost = (totalTokens / 1_000_000) * 0.02 // $0.02 per 1M tokens

    return {
      total,
      withEmbeddings,
      withoutEmbeddings,
      percentage: total > 0 ? (withEmbeddings / total) * 100 : 0,
      totalTokens,
      estimatedCost
    }
  }

  /**
   * Build text representation of company for embedding
   * Format: "Company: X | Description: Y | Industry: Z | ..."
   */
  private buildCompanyText(company: CompanyEmbeddingInput): string {
    const parts: string[] = []

    // Company name (most important)
    parts.push(`Company: ${company.name}`)

    // Description
    if (company.description) {
      parts.push(`Description: ${company.description}`)
    }

    // Industry/SIC codes
    if (company.industry) {
      parts.push(`Industry: ${company.industry}`)
    }
    if (company.sic_codes && company.sic_codes.length > 0) {
      parts.push(`SIC: ${company.sic_codes.join(', ')}`)
    }

    // Categories
    if (company.categories && company.categories.length > 0) {
      parts.push(`Categories: ${company.categories.join(', ')}`)
    }

    // Location
    if (company.address) {
      parts.push(`Location: ${company.address}`)
    }

    // Website domain (for tech stack inference)
    if (company.website) {
      try {
        const domain = new URL(company.website).hostname.replace('www.', '')
        parts.push(`Domain: ${domain}`)
      } catch {
        // Invalid URL, skip
      }
    }

    return parts.join(' | ')
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService()
