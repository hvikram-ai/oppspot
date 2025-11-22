/**
 * Ollama Embedding Service
 * Free local embeddings using Ollama
 *
 * Supported models:
 * - nomic-embed-text (768 dimensions, fast)
 * - mxbai-embed-large (1024 dimensions, better quality)
 */

import { createClient } from '@/lib/supabase/server'

export interface OllamaEmbeddingOptions {
  model?: 'nomic-embed-text' | 'mxbai-embed-large'
  ollamaUrl?: string
}

export interface OllamaEmbeddingResult {
  embedding: number[]
  model: string
  dimensions: number
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

export class OllamaEmbeddingService {
  private ollamaUrl: string

  constructor(ollamaUrl: string = 'http://localhost:11434') {
    this.ollamaUrl = ollamaUrl
  }

  /**
   * Generate embedding using Ollama
   */
  async generateEmbedding(
    text: string,
    options: OllamaEmbeddingOptions = {}
  ): Promise<OllamaEmbeddingResult> {
    const model = options.model || 'nomic-embed-text'
    const url = options.ollamaUrl || this.ollamaUrl

    try {
      const response = await fetch(`${url}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          prompt: text
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`)
      }

      const data = await response.json()

      return {
        embedding: data.embedding,
        model,
        dimensions: data.embedding.length
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[Ollama Embeddings] Error:', error)
      throw new Error(`Failed to generate embedding: ${errorMessage}`)
    }
  }

  /**
   * Generate company embedding
   */
  async generateCompanyEmbedding(
    companyData: CompanyEmbeddingInput,
    options: OllamaEmbeddingOptions = {}
  ): Promise<OllamaEmbeddingResult> {
    const companyText = this.buildCompanyText(companyData)
    return this.generateEmbedding(companyText, options)
  }

  /**
   * Batch generate embeddings
   */
  async generateBatchEmbeddings(
    companies: CompanyEmbeddingInput[],
    options: OllamaEmbeddingOptions = {}
  ): Promise<OllamaEmbeddingResult[]> {
    const results: OllamaEmbeddingResult[] = []

    // Process sequentially (Ollama works best this way)
    for (const company of companies) {
      const result = await this.generateCompanyEmbedding(company, options)
      results.push(result)
    }

    return results
  }

  /**
   * Save embedding to database
   * Note: Adjusts for different dimensions (768 for nomic, 1024 for mxbai)
   */
  async saveEmbedding(
    companyId: string,
    embeddingResult: OllamaEmbeddingResult
  ): Promise<void> {
    const supabase = await createClient()

    // Pad or truncate to 1536 dimensions to match pgvector schema
    let embedding = embeddingResult.embedding
    if (embedding.length < 1536) {
      // Pad with zeros
      embedding = [...embedding, ...new Array(1536 - embedding.length).fill(0)]
    } else if (embedding.length > 1536) {
      // Truncate
      embedding = embedding.slice(0, 1536)
    }

    const { error } = await supabase
      .from('businesses')
      .update({
        embedding: JSON.stringify(embedding),
        embedding_model: embeddingResult.model,
        embedding_generated_at: new Date().toISOString(),
        embedding_token_count: 0 // Free with Ollama
      })
      .eq('id', companyId)

    if (error) {
      throw new Error(`Failed to save embedding for ${companyId}: ${error.message}`)
    }
  }

  /**
   * Build text representation of company
   */
  private buildCompanyText(company: CompanyEmbeddingInput): string {
    const parts: string[] = []

    parts.push(`Company: ${company.name}`)
    if (company.description) parts.push(`Description: ${company.description}`)
    if (company.industry) parts.push(`Industry: ${company.industry}`)
    if (company.sic_codes?.length) parts.push(`SIC: ${company.sic_codes.join(', ')}`)
    if (company.categories?.length) parts.push(`Categories: ${company.categories.join(', ')}`)
    if (company.website) {
      try {
        const domain = new URL(company.website).hostname.replace('www.', '')
        parts.push(`Domain: ${domain}`)
      } catch {}
    }

    return parts.join(' | ')
  }

  /**
   * Check Ollama availability
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET'
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * List available embedding models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`)
      const data = await response.json()

      // Filter for embedding models
      const embeddingModels = (data.models as Array<{ name: string }> | undefined)
        ?.filter((m) => m.name.includes('embed'))
        .map((m) => m.name) || []

      return embeddingModels
    } catch {
      return []
    }
  }
}

// Singleton instance
export const ollamaEmbeddingService = new OllamaEmbeddingService()
