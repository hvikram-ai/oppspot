# AI Infrastructure Layer - Implementation Plan
**Created**: 2025-10-02
**Goal**: Build foundation for all 14 killer features
**Timeline**: 2-3 weeks
**Priority**: CRITICAL PATH

---

## Overview

The AI Infrastructure Layer enables:
- 🔍 **Semantic Search** (vector embeddings)
- 🤖 **AI Agents** (autonomous workers)
- ⚡ **Background Jobs** (Inngest)
- 📊 **Signal Detection** (buying intent)
- 💾 **Caching** (Redis/Upstash)

---

## Phase 1: Vector Search Foundation (Week 1)

### Task 1.1: Enable pgvector Extension
**File**: `supabase/migrations/20251002000002_enable_pgvector.sql`
**Time**: 30 minutes
**Priority**: P0 (blocking everything)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small',
ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS embedding_token_count INTEGER;

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS businesses_embedding_idx
ON businesses USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Function to find similar companies
CREATE OR REPLACE FUNCTION find_similar_companies(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    businesses.id,
    businesses.name,
    1 - (businesses.embedding <=> query_embedding) as similarity
  FROM businesses
  WHERE businesses.embedding IS NOT NULL
    AND 1 - (businesses.embedding <=> query_embedding) > match_threshold
  ORDER BY businesses.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comments
COMMENT ON COLUMN businesses.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions)';
COMMENT ON INDEX businesses_embedding_idx IS 'HNSW index for cosine similarity search';
```

**Action**:
```bash
supabase db push
# Or apply via Supabase dashboard
```

---

### Task 1.2: Embedding Service
**File**: `lib/ai/embedding/embedding-service.ts`
**Time**: 4 hours
**Dependencies**: OpenAI API key

```typescript
/**
 * Embedding Service
 * Generates vector embeddings for semantic search
 * Uses OpenAI text-embedding-3-small (1536 dimensions, $0.02/1M tokens)
 */

import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

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
  description?: string
  industry?: string
  sic_codes?: string[]
  website?: string
  categories?: string[]
}

export class EmbeddingService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  /**
   * Generate embedding for a company
   */
  async generateCompanyEmbedding(
    companyData: CompanyEmbeddingInput,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> {
    const model = options.model || 'text-embedding-3-small'
    const companyText = this.buildCompanyText(companyData)

    const response = await this.openai.embeddings.create({
      model,
      input: companyText,
      encoding_format: 'float'
    })

    return {
      embedding: response.data[0].embedding,
      model,
      tokenCount: response.usage.total_tokens
    }
  }

  /**
   * Batch generate embeddings (up to 100 at once)
   */
  async generateBatchEmbeddings(
    companies: CompanyEmbeddingInput[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    const batchSize = 100
    const results: EmbeddingResult[] = []

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize)
      const batchTexts = batch.map(c => this.buildCompanyText(c))

      const response = await this.openai.embeddings.create({
        model: options.model || 'text-embedding-3-small',
        input: batchTexts,
        encoding_format: 'float'
      })

      const batchResults = response.data.map(item => ({
        embedding: item.embedding,
        model: options.model || 'text-embedding-3-small',
        tokenCount: response.usage.total_tokens / batch.length
      }))

      results.push(...batchResults)
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
      throw new Error(`Failed to save embedding: ${error.message}`)
    }
  }

  /**
   * Find similar companies using vector similarity
   */
  async findSimilarCompanies(
    companyId: string,
    options: {
      limit?: number
      threshold?: number
    } = {}
  ): Promise<Array<{ id: string; name: string; similarity: number }>> {
    const supabase = await createClient()

    const { data: company } = await supabase
      .from('businesses')
      .select('embedding')
      .eq('id', companyId)
      .single()

    if (!company?.embedding) {
      throw new Error('Company embedding not found')
    }

    const { data, error } = await supabase
      .rpc('find_similar_companies', {
        query_embedding: company.embedding,
        match_threshold: options.threshold || 0.7,
        match_count: options.limit || 20
      })

    if (error) throw error
    return data || []
  }

  /**
   * Semantic search by natural language query
   */
  async semanticSearch(
    query: string,
    options: {
      limit?: number
      threshold?: number
    } = {}
  ): Promise<Array<{ id: string; name: string; similarity: number }>> {
    // Generate embedding for query
    const queryEmbedding = await this.generateCompanyEmbedding(
      { name: query }
    )

    const supabase = await createClient()

    const { data, error } = await supabase
      .rpc('find_similar_companies', {
        query_embedding: JSON.stringify(queryEmbedding.embedding),
        match_threshold: options.threshold || 0.7,
        match_count: options.limit || 20
      })

    if (error) throw error
    return data || []
  }

  /**
   * Build text representation for embedding
   */
  private buildCompanyText(company: CompanyEmbeddingInput): string {
    const parts: string[] = []

    parts.push(`Company: ${company.name}`)
    if (company.description) parts.push(`Description: ${company.description}`)
    if (company.industry) parts.push(`Industry: ${company.industry}`)
    if (company.sic_codes?.length) parts.push(`SIC: ${company.sic_codes.join(', ')}`)
    if (company.categories?.length) parts.push(`Categories: ${company.categories.join(', ')}`)
    if (company.website) {
      const domain = new URL(company.website).hostname.replace('www.', '')
      parts.push(`Domain: ${domain}`)
    }

    return parts.join(' | ')
  }
}

// Singleton instance
export const embeddingService = new EmbeddingService()
```

---

### Task 1.3: Semantic Search API
**File**: `app/api/search/semantic/route.ts`
**Time**: 1 hour

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embeddingService } from '@/lib/ai/embedding/embedding-service'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7)
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, limit, threshold } = searchSchema.parse(body)

    // Semantic search
    const results = await embeddingService.semanticSearch(query, {
      limit,
      threshold
    })

    // Fetch full company details
    const companyIds = results.map(r => r.id)
    const { data: companies } = await supabase
      .from('businesses')
      .select('id, name, description, website, categories, sic_codes')
      .in('id', companyIds)

    // Merge similarity scores
    const enriched = companies?.map(company => ({
      ...company,
      similarity: results.find(r => r.id === company.id)?.similarity || 0
    })) || []

    enriched.sort((a, b) => b.similarity - a.similarity)

    return NextResponse.json({
      success: true,
      query,
      count: enriched.length,
      results: enriched
    })
  } catch (error) {
    console.error('[Semantic Search Error]:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
```

---

### Task 1.4: Generate Embeddings API
**File**: `app/api/embeddings/generate/route.ts`
**Time**: 1 hour

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embeddingService } from '@/lib/ai/embedding/embedding-service'
import { z } from 'zod'

const generateSchema = z.object({
  companyIds: z.array(z.string().uuid()).optional(),
  generateAll: z.boolean().optional(),
  batchSize: z.number().int().min(1).max(100).default(50)
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyIds, generateAll, batchSize } = generateSchema.parse(body)

    let targetIds: string[] = []

    if (generateAll) {
      // Get companies without embeddings
      const { data } = await supabase
        .from('businesses')
        .select('id')
        .is('embedding', null)
        .limit(1000)

      targetIds = data?.map(c => c.id) || []
    } else if (companyIds) {
      targetIds = companyIds
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'No companies to process' }, { status: 400 })
    }

    // Process in batches
    let processed = 0
    for (let i = 0; i < targetIds.length; i += batchSize) {
      const batch = targetIds.slice(i, i + batchSize)

      // Fetch company data
      const { data: companies } = await supabase
        .from('businesses')
        .select('id, name, description, sic_codes, website, categories')
        .in('id', batch)

      if (!companies) continue

      // Generate embeddings
      const embeddings = await embeddingService.generateBatchEmbeddings(
        companies.map(c => ({
          name: c.name,
          description: c.description,
          sic_codes: c.sic_codes,
          website: c.website,
          categories: c.categories
        }))
      )

      // Save to database
      for (let j = 0; j < companies.length; j++) {
        await embeddingService.saveEmbedding(companies[j].id, embeddings[j])
        processed++
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      total: targetIds.length
    })
  } catch (error) {
    console.error('[Generate Embeddings Error]:', error)
    return NextResponse.json(
      { error: 'Generation failed' },
      { status: 500 }
    )
  }
}
```

---

## Phase 2: AI Agents Infrastructure (Week 2)

### Task 2.1: Agent Database Schema
**File**: `supabase/migrations/20251002000003_ai_agents.sql`
**Time**: 1 hour

```sql
-- AI Agents Configuration Table
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN (
    'opportunity_bot',
    'research_gpt',
    'scout_agent',
    'scoring_agent',
    'writer_agent',
    'relationship_agent'
  )),
  name TEXT NOT NULL,
  description TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  schedule_cron TEXT,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent Execution History
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Buying Signals Table
CREATE TABLE buying_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN (
    'funding_round',
    'executive_change',
    'job_posting',
    'technology_adoption',
    'expansion',
    'website_activity',
    'competitor_mention',
    'companies_house_filing'
  )),
  signal_strength TEXT NOT NULL CHECK (signal_strength IN ('very_strong', 'strong', 'moderate', 'weak')),
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  signal_data JSONB NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acted_upon', 'expired', 'false_positive')),
  acted_upon_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);
CREATE INDEX idx_buying_signals_company_id ON buying_signals(company_id);
CREATE INDEX idx_buying_signals_detected_at ON buying_signals(detected_at DESC);
CREATE INDEX idx_buying_signals_status ON buying_signals(status);

-- RLS Policies
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE buying_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's agents"
  ON ai_agents FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their org's executions"
  ON agent_executions FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their org's signals"
  ON buying_signals FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));
```

---

### Task 2.2: Base Agent Class
**File**: `lib/ai/agents/base-agent.ts`
**Time**: 3 hours

```typescript
/**
 * Base Agent Class
 * Abstract foundation for all AI agents
 */

import { createClient } from '@/lib/supabase/server'
import { eventBus } from '@/lib/events/event-bus'

export interface AgentConfig {
  id: string
  orgId: string
  name: string
  type: string
  configuration: Record<string, any>
  isActive: boolean
}

export interface AgentExecutionContext {
  executionId: string
  agentId: string
  orgId: string
  input: Record<string, any>
  startTime: Date
}

export interface AgentExecutionResult {
  success: boolean
  output: Record<string, any>
  error?: string
  metrics: {
    durationMs: number
    itemsProcessed: number
    apiCalls: number
    tokensUsed: number
    cost: number
  }
}

export abstract class BaseAgent {
  protected config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
  }

  /**
   * Execute the agent (implemented by subclasses)
   */
  abstract execute(
    context: AgentExecutionContext
  ): Promise<AgentExecutionResult>

  /**
   * Validate agent configuration
   */
  abstract validateConfig(): Promise<boolean>

  /**
   * Run agent with full lifecycle
   */
  async run(input: Record<string, any>): Promise<AgentExecutionResult> {
    const supabase = await createClient()
    const executionId = crypto.randomUUID()
    const startTime = new Date()

    // Create execution record
    await supabase.from('agent_executions').insert({
      id: executionId,
      agent_id: this.config.id,
      org_id: this.config.orgId,
      status: 'running',
      started_at: startTime.toISOString(),
      input_data: input
    })

    try {
      const context: AgentExecutionContext = {
        executionId,
        agentId: this.config.id,
        orgId: this.config.orgId,
        input,
        startTime
      }

      const result = await this.execute(context)

      // Update execution (success)
      await supabase
        .from('agent_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: result.metrics.durationMs,
          output_data: result.output,
          metrics: result.metrics
        })
        .eq('id', executionId)

      return result
    } catch (error: any) {
      // Update execution (failed)
      await supabase
        .from('agent_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime.getTime(),
          error_message: error.message
        })
        .eq('id', executionId)

      throw error
    }
  }

  protected emitEvent(type: string, data: Record<string, any>): void {
    eventBus.emit({
      type,
      source: this.config.type,
      data: {
        agentId: this.config.id,
        orgId: this.config.orgId,
        ...data
      }
    })
  }
}
```

---

## Phase 3: Background Jobs (Week 2-3)

### Task 3.1: Install Inngest
**Time**: 30 minutes

```bash
npm install inngest
```

### Task 3.2: Inngest Client
**File**: `lib/inngest/client.ts`
**Time**: 1 hour

```typescript
import { Inngest, EventSchemas } from 'inngest'

type Events = {
  'company/embedding.generate': {
    data: {
      companyId: string
      priority: 'high' | 'normal' | 'low'
    }
  }
  'agent/research_gpt.run': {
    data: {
      companyId: string
      depth: 'quick' | 'detailed'
      requestedBy: string
    }
  }
  'signals/buying_signal.detected': {
    data: {
      companyId: string
      signalType: string
      signalData: Record<string, any>
    }
  }
}

export const inngest = new Inngest({
  id: 'oppspot',
  name: 'oppSpot',
  schemas: new EventSchemas().fromRecord<Events>()
})
```

### Task 3.3: Inngest HTTP Endpoint
**File**: `app/api/inngest/route.ts`

```typescript
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { generateEmbeddingFunction } from '@/lib/inngest/functions/generate-embedding'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateEmbeddingFunction
  ]
})
```

### Task 3.4: Embedding Background Function
**File**: `lib/inngest/functions/generate-embedding.ts`

```typescript
import { inngest } from '@/lib/inngest/client'
import { embeddingService } from '@/lib/ai/embedding/embedding-service'
import { createClient } from '@/lib/supabase/server'

export const generateEmbeddingFunction = inngest.createFunction(
  {
    id: 'generate-embedding',
    name: 'Generate Company Embedding'
  },
  { event: 'company/embedding.generate' },
  async ({ event, step }) => {
    const { companyId } = event.data

    const company = await step.run('fetch-company', async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single()
      return data
    })

    if (!company) throw new Error('Company not found')

    const embedding = await step.run('generate-embedding', async () => {
      return await embeddingService.generateCompanyEmbedding({
        name: company.name,
        description: company.description,
        sic_codes: company.sic_codes,
        website: company.website,
        categories: company.categories
      })
    })

    await step.run('save-embedding', async () => {
      await embeddingService.saveEmbedding(companyId, embedding)
    })

    return { success: true, companyId }
  }
)
```

---

## Implementation Checklist

### Week 1: Vector Search
- [ ] Run pgvector migration
- [ ] Create `lib/ai/embedding/embedding-service.ts`
- [ ] Create `app/api/search/semantic/route.ts`
- [ ] Create `app/api/embeddings/generate/route.ts`
- [ ] Test semantic search with sample queries
- [ ] Generate embeddings for top 1000 companies

### Week 2: AI Agents
- [ ] Run agent infrastructure migration
- [ ] Create `lib/ai/agents/base-agent.ts`
- [ ] Create first agent (Scout or Research)
- [ ] Test agent execution

### Week 3: Background Jobs
- [ ] Install Inngest
- [ ] Create `lib/inngest/client.ts`
- [ ] Create `app/api/inngest/route.ts`
- [ ] Create first Inngest function
- [ ] Configure Inngest webhook in Vercel
- [ ] Test background job execution

---

## Testing Strategy

### Unit Tests
```typescript
// tests/unit/embedding-service.spec.ts
describe('EmbeddingService', () => {
  it('should generate embeddings', async () => {
    const result = await embeddingService.generateCompanyEmbedding({
      name: 'Test Company',
      description: 'Test description'
    })
    expect(result.embedding).toHaveLength(1536)
  })
})
```

### Integration Tests
```typescript
// tests/integration/semantic-search.spec.ts
describe('Semantic Search', () => {
  it('should find similar companies', async () => {
    const results = await embeddingService.semanticSearch('fintech companies')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].similarity).toBeGreaterThan(0.7)
  })
})
```

---

## Success Metrics

### Week 1
- [ ] Semantic search response time < 500ms
- [ ] Embedding generation: 1000 companies/hour
- [ ] Vector similarity accuracy > 80%

### Week 2
- [ ] Agent execution success rate > 95%
- [ ] Agent metrics properly tracked
- [ ] Event system working

### Week 3
- [ ] Background jobs processing
- [ ] Inngest dashboard monitoring
- [ ] Job retry logic working

---

## Next Steps After Infrastructure

Once infrastructure is complete, we can build:
1. **ChatSpot** (conversational interface)
2. **OpportunityBot** (autonomous prospecting)
3. **Scout Agent** (signal detection)
4. **Multi-Agent Orchestration**

**Ready to start? Let's begin with Task 1.1 (pgvector migration)!**
