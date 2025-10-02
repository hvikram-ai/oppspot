/**
 * Generate Embeddings Script
 * Usage: npx tsx scripts/generate-embeddings.ts [limit]
 * Example: npx tsx scripts/generate-embeddings.ts 100
 */

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY!

if (!apiKey) {
  console.error('❌ OPENAI_API_KEY or OPENROUTER_API_KEY required')
  process.exit(1)
}

// Configure OpenAI client (supports OpenRouter too)
const config: any = { apiKey }
if (process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
  config.baseURL = 'https://openrouter.ai/api/v1'
  config.defaultHeaders = {
    'HTTP-Referer': 'https://oppspot.ai',
    'X-Title': 'oppSpot'
  }
}

const supabase = createClient(supabaseUrl, supabaseKey)
const openai = new OpenAI(config)

async function generateEmbeddings(limit?: number) {
  console.log('🚀 Starting embedding generation...\n')

  // Get companies without embeddings
  let query = supabase
    .from('businesses')
    .select('id, name, description, sic_codes, website, categories, address')
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

  const batchSize = 50
  let processed = 0

  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize)

    console.log(`⚙️  Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(companies.length / batchSize)}...`)

    // Build text representations
    const texts = batch.map(c => {
      const parts: string[] = []
      parts.push(`Company: ${c.name}`)
      if (c.description) parts.push(`Description: ${c.description}`)
      if (c.sic_codes) parts.push(`SIC: ${c.sic_codes.join(', ')}`)
      if (c.categories) parts.push(`Categories: ${c.categories.join(', ')}`)
      if (c.website) {
        try {
          const domain = new URL(c.website).hostname.replace('www.', '')
          parts.push(`Domain: ${domain}`)
        } catch {}
      }
      return parts.join(' | ')
    })

    // Generate embeddings
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
      encoding_format: 'float'
    })

    // Save to database
    for (let j = 0; j < batch.length; j++) {
      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          embedding: JSON.stringify(response.data[j].embedding),
          embedding_model: 'text-embedding-3-small',
          embedding_generated_at: new Date().toISOString(),
          embedding_token_count: Math.round(response.usage.total_tokens / batch.length)
        })
        .eq('id', batch[j].id)

      if (updateError) {
        console.error(`   ⚠️  Failed to save embedding for ${batch[j].name}:`, updateError)
      } else {
        processed++
      }
    }

    console.log(`   ✅ Processed ${batch.length} companies (${processed} total)\n`)
  }

  // Get final stats
  const { data: stats } = await supabase
    .from('businesses_with_embeddings')
    .select('has_embedding, embedding_token_count')

  const total = stats?.length || 0
  const withEmbeddings = stats?.filter(s => s.has_embedding).length || 0
  const totalTokens = stats?.reduce((sum, s) => sum + (s.embedding_token_count || 0), 0) || 0
  const cost = (totalTokens / 1_000_000) * 0.02

  console.log('\n📈 Final Stats:')
  console.log(`   Total companies: ${total}`)
  console.log(`   With embeddings: ${withEmbeddings} (${((withEmbeddings / total) * 100).toFixed(1)}%)`)
  console.log(`   Total tokens: ${totalTokens.toLocaleString()}`)
  console.log(`   Estimated cost: $${cost.toFixed(4)}`)
  console.log('\n✅ Done!')
}

// Run
const limit = process.argv[2] ? parseInt(process.argv[2]) : undefined
generateEmbeddings(limit).catch(console.error)
