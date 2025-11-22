/**
 * Generate Embedding Function
 * Background job to generate embeddings for companies using Ollama
 */

import { inngest } from '@/lib/inngest/client'
import { ollamaEmbeddingService } from '@/lib/ai/embedding/ollama-embedding-service'
import { createClient } from '@/lib/supabase/server'
import type { Row } from '@/lib/supabase/helpers'

export const generateEmbeddingFunction = inngest.createFunction(
  {
    id: 'generate-embedding',
    name: 'Generate Company Embedding',
    retries: 3,
    rateLimit: {
      limit: 100,
      period: '1m' // 100 per minute
    }
  },
  { event: 'company.embedding.generate' },
  async ({ event, step }) => {
    const { companyId, model = 'nomic-embed-text' } = event.data

    // Step 1: Fetch company data
    const company = await step.run('fetch-company', async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single() as { data: Row<'businesses'> | null; error: unknown }

      if (error || !data) {
        throw new Error(`Company not found: ${companyId}`)
      }

      return data
    })

    // Step 2: Generate embedding
    const embeddingResult = await step.run('generate-embedding', async () => {
      return await ollamaEmbeddingService.generateCompanyEmbedding({
        name: company.name,
        description: company.description,
        industry: company.sic_codes?.[0],
        sic_codes: company.sic_codes || [],
        website: company.website,
        categories: company.categories || []
      }, { model })
    })

    // Step 3: Save to database
    await step.run('save-embedding', async () => {
      await ollamaEmbeddingService.saveEmbedding(companyId, embeddingResult)
    })

    return {
      companyId,
      success: true,
      dimensions: embeddingResult.dimensions,
      model: embeddingResult.model
    }
  }
)
