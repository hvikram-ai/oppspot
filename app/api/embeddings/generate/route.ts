/**
 * Generate Embeddings API
 * Triggers embedding generation for companies
 *
 * POST /api/embeddings/generate
 * Body: {
 *   companyIds?: string[]  // Specific companies
 *   generateAll?: boolean  // All companies without embeddings
 *   batchSize?: number     // Batch size (default 50)
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embeddingService } from '@/lib/ai/embedding/embedding-service'
import { z } from 'zod'

const generateSchema = z.object({
  companyIds: z.array(z.string().uuid()).optional(),
  generateAll: z.boolean().optional(),
  batchSize: z.number().int().min(1).max(100).default(50),
  limit: z.number().int().min(1).max(10000).optional() // Max companies to process
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // TODO: Add admin check - only admins should generate embeddings
    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', user.id)
    //   .single()
    //
    // if (profile?.role !== 'admin') {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    // Parse request
    const body = await request.json()
    const { companyIds, generateAll, batchSize, limit } = generateSchema.parse(body)

    let targetIds: string[] = []

    if (generateAll) {
      // Get companies without embeddings
      let query = supabase
        .from('businesses')
        .select('id')
        .is('embedding', null)

      if (limit) {
        query = query.limit(limit)
      } else {
        query = query.limit(1000) // Safety limit
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to fetch companies: ${error.message}`)
      }

      targetIds = data?.map(c => c.id) || []

      console.log(`[Generate Embeddings] Found ${targetIds.length} companies without embeddings`)
    } else if (companyIds && companyIds.length > 0) {
      targetIds = companyIds
      console.log(`[Generate Embeddings] Processing ${targetIds.length} specific companies`)
    } else {
      return NextResponse.json(
        { error: 'Must provide companyIds or generateAll=true' },
        { status: 400 }
      )
    }

    if (targetIds.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No companies to process',
        stats: await embeddingService.getEmbeddingStats()
      })
    }

    // Process in batches
    let processed = 0
    let failed = 0
    const errors: string[] = []

    for (let i = 0; i < targetIds.length; i += batchSize) {
      const batch = targetIds.slice(i, i + batchSize)

      try {
        // Fetch company data
        const { data: companies, error: fetchError } = await supabase
          .from('businesses')
          .select('id, name, description, sic_codes, website, categories, address')
          .in('id', batch)

        if (fetchError || !companies) {
          throw new Error(`Failed to fetch batch: ${fetchError?.message}`)
        }

        // Generate embeddings
        const embeddings = await embeddingService.generateBatchEmbeddings(
          companies.map(c => ({
            name: c.name,
            description: c.description,
            sic_codes: c.sic_codes,
            website: c.website,
            categories: c.categories,
            address: c.address?.city || c.address?.region
          }))
        )

        // Save to database
        const updates = companies.map((company, index) => ({
          companyId: company.id,
          embeddingResult: embeddings[index]
        }))

        await embeddingService.saveBatchEmbeddings(updates)

        processed += companies.length

        console.log(`[Generate Embeddings] Batch ${i / batchSize + 1}: Processed ${companies.length} companies`)
      } catch (error: unknown) {
        failed += batch.length
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`)
        console.error(`[Generate Embeddings] Batch error:`, error)
      }
    }

    const duration = Date.now() - startTime
    const stats = await embeddingService.getEmbeddingStats()

    return NextResponse.json({
      success: true,
      processed,
      failed,
      total: targetIds.length,
      durationMs: duration,
      durationSeconds: Math.round(duration / 1000),
      companiesPerSecond: processed > 0 ? Math.round((processed / duration) * 1000) : 0,
      errors: errors.length > 0 ? errors : undefined,
      stats
    })
  } catch (error: unknown) {
    console.error('[Generate Embeddings] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Embedding generation failed', message: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to check stats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const stats = await embeddingService.getEmbeddingStats()

    return NextResponse.json({
      success: true,
      stats,
      message: `${stats.withEmbeddings} of ${stats.total} companies have embeddings (${stats.percentage.toFixed(1)}%)`
    })
  } catch (error: unknown) {
    console.error('[Embedding Stats] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
