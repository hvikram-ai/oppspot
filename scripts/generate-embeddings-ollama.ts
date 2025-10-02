/**
 * Generate Embeddings with Ollama (FREE!)
 * Usage: npx tsx scripts/generate-embeddings-ollama.ts [limit] [model]
 * Example: npx tsx scripts/generate-embeddings-ollama.ts 100 nomic-embed-text
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'

const supabase = createClient(supabaseUrl, supabaseKey)

interface OllamaEmbeddingResult {
  embedding: number[]
}

async function generateOllamaEmbedding(
  text: string,
  model: string
): Promise<OllamaEmbeddingResult> {
  const response = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text })
  })

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.statusText}`)
  }

  return response.json()
}

function buildCompanyText(company: any): string {
  const parts: string[] = []
  parts.push(`Company: ${company.name}`)
  if (company.description) parts.push(`Description: ${company.description}`)
  if (company.sic_codes) parts.push(`SIC: ${company.sic_codes.join(', ')}`)
  if (company.categories) parts.push(`Categories: ${company.categories.join(', ')}`)
  if (company.website) {
    try {
      const domain = new URL(company.website).hostname.replace('www.', '')
      parts.push(`Domain: ${domain}`)
    } catch {}
  }
  return parts.join(' | ')
}

async function generateEmbeddings(limit?: number, model: string = 'nomic-embed-text') {
  console.log(`🚀 Starting embedding generation with Ollama (${model})...\n`)

  // Check Ollama availability
  try {
    const testResponse = await fetch(`${ollamaUrl}/api/tags`)
    if (!testResponse.ok) {
      throw new Error('Ollama not available')
    }
    console.log(`✅ Ollama is available at ${ollamaUrl}\n`)
  } catch (error) {
    console.error('❌ Ollama is not running. Start it with: ollama serve')
    process.exit(1)
  }

  // Get companies without embeddings
  let query = supabase
    .from('businesses')
    .select('id, name, description, sic_codes, website, categories')
    .is('embedding', null)

  if (limit) {
    query = query.limit(limit)
  } else {
    query = query.limit(1000)
  }

  const { data: companies, error } = await query

  if (error) {
    console.error('❌ Error fetching companies:', error)
    process.exit(1)
  }

  if (!companies || companies.length === 0) {
    console.log('✅ All companies already have embeddings!')
    process.exit(0)
  }

  console.log(`📊 Found ${companies.length} companies without embeddings\n`)

  let processed = 0
  const startTime = Date.now()

  for (const company of companies) {
    try {
      // Build text
      const text = buildCompanyText(company)

      // Generate embedding with Ollama
      const result = await generateOllamaEmbedding(text, model)

      // Pad or truncate to 1536 dimensions (pgvector schema)
      let embedding = result.embedding
      if (embedding.length < 1536) {
        embedding = [...embedding, ...new Array(1536 - embedding.length).fill(0)]
      } else if (embedding.length > 1536) {
        embedding = embedding.slice(0, 1536)
      }

      // Save to database
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          embedding: JSON.stringify(embedding),
          embedding_model: model,
          embedding_generated_at: new Date().toISOString(),
          embedding_token_count: 0
        })
        .eq('id', company.id)

      if (updateError) {
        console.error(`   ⚠️  Failed to save: ${company.name}`)
      } else {
        processed++
        if (processed % 10 === 0) {
          const elapsed = (Date.now() - startTime) / 1000
          const rate = processed / elapsed
          console.log(`   ✅ Processed ${processed}/${companies.length} (${rate.toFixed(1)}/sec)`)
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error with ${company.name}:`, error.message)
    }
  }

  // Final stats
  const duration = (Date.now() - startTime) / 1000
  const { data: stats } = await supabase
    .from('businesses_with_embeddings')
    .select('has_embedding')

  const total = stats?.length || 0
  const withEmbeddings = stats?.filter(s => s.has_embedding).length || 0

  console.log('\n📈 Final Stats:')
  console.log(`   Total companies: ${total}`)
  console.log(`   With embeddings: ${withEmbeddings} (${((withEmbeddings / total) * 100).toFixed(1)}%)`)
  console.log(`   Duration: ${duration.toFixed(1)}s`)
  console.log(`   Rate: ${(processed / duration).toFixed(1)} companies/sec`)
  console.log(`   Model: ${model}`)
  console.log(`   Cost: $0.00 (FREE with Ollama!)`)
  console.log('\n✅ Done!')
}

// Parse arguments
const limit = process.argv[2] ? parseInt(process.argv[2]) : undefined
const model = process.argv[3] || 'nomic-embed-text'

// Run
generateEmbeddings(limit, model).catch(console.error)
