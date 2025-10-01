# Implementation Plan: Killer Features
## Production-Grade Technical Specification for oppSpot Modernization

> **Audience**: AI Assistants (Claude Code), Software Architects, Senior Engineers
> **Purpose**: Surgical, step-by-step implementation plan that leverages existing architecture
> **Approach**: Build on current patterns, minimize refactoring, maximize reuse

**Created**: 2025-10-01
**Architecture Review**: ✅ Analyzed existing codebase patterns
**Complexity**: High (Multi-agent AI, Real-time systems, Vector search)
**Estimated Timeline**: 6-12 months (phased approach)

---

## Table of Contents

1. [Architecture Analysis](#architecture-analysis)
2. [Phase 1: Foundation](#phase-1-foundation-months-1-2)
3. [Phase 2: AI Agents](#phase-2-ai-agents-months-3-4)
4. [Phase 3: Predictive Intelligence](#phase-3-predictive-intelligence-months-5-6)
5. [Phase 4: Collaboration](#phase-4-collaboration-months-7-8)
6. [Phase 5: Polish](#phase-5-polish-months-9-12)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Strategy](#deployment-strategy)

---

## Architecture Analysis

### Current Architecture Patterns (DO NOT CHANGE)

#### ✅ Service Layer Pattern
```typescript
// Pattern found in: lib/ai/scoring/lead-scoring-service.ts
export class [Domain]Service {
  private dependencies: Dep[]

  constructor(dependencies) {
    this.dependencies = dependencies
  }

  async execute(input: Input): Promise<Output> {
    // Business logic
  }
}
```

#### ✅ Repository Pattern
```typescript
// Pattern found in: lib/opp-scan/infrastructure/repositories/*.repository.ts
export class [Entity]Repository {
  async save(entity: Entity): Promise<void>
  async findById(id: string): Promise<Entity | null>
  async findBy(criteria: Criteria): Promise<Entity[]>
}
```

#### ✅ Event-Driven Pattern
```typescript
// Pattern found in: lib/events/event-bus.ts
eventBus.emit({
  type: 'domain.event',
  source: 'service-name',
  data: payload
})
```

#### ✅ Interface-First Design
```typescript
// Pattern found in: lib/opp-scan/core/interfaces.ts
export interface IService {
  execute(input: Input): Promise<Output>
}
```

#### ✅ API Route Pattern
```typescript
// Pattern found in: app/api/*/route.ts
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  // Logic
  return NextResponse.json(result)
}
```

### Database Schema (Current)

#### Existing Tables (DO NOT MODIFY):
- `businesses` - Core company data
- `profiles` - User profiles
- `organizations` - Multi-tenant orgs
- `lead_scores` - Lead scoring results
- `stakeholders` - Key contacts
- `notifications` - User notifications

#### New Tables (TO BE CREATED):
- `ai_agents` - Agent configurations
- `agent_executions` - Agent run history
- `company_embeddings` - Vector embeddings
- `buying_signals` - Intent signals
- `research_cache` - AI research results
- `team_activities` - Collaboration tracking
- `knowledge_graph_nodes` - Graph database

---

## Phase 1: Foundation (Months 1-2)

### Objective
Establish infrastructure for AI agents, vector search, and real-time features.

---

### 1.1 Database Migrations

#### Migration 1: Enable pgvector
**File**: `supabase/migrations/20250101000001_enable_pgvector.sql`

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to businesses table
ALTER TABLE businesses
ADD COLUMN embedding vector(1536) DEFAULT NULL;

-- Add embedding metadata
ALTER TABLE businesses
ADD COLUMN embedding_model TEXT DEFAULT 'text-embedding-ada-002',
ADD COLUMN embedding_generated_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN embedding_token_count INTEGER DEFAULT NULL;

-- Create HNSW index for fast similarity search
CREATE INDEX businesses_embedding_idx
ON businesses USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Function to find similar companies
CREATE OR REPLACE FUNCTION find_similar_companies(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 10
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

-- Add comments
COMMENT ON COLUMN businesses.embedding IS 'OpenAI ada-002 embedding (1536 dimensions) for semantic similarity search';
COMMENT ON INDEX businesses_embedding_idx IS 'HNSW index for fast vector similarity using cosine distance';
```

---

#### Migration 2: AI Agents Infrastructure
**File**: `supabase/migrations/20250101000002_ai_agents.sql`

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
  schedule_cron TEXT, -- For scheduled agents
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
  error_stack TEXT,
  metrics JSONB DEFAULT '{}', -- { items_processed, api_calls, tokens_used }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Research Cache (for ResearchGPT)
CREATE TABLE research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  research_type TEXT NOT NULL CHECK (research_type IN ('quick', 'detailed', 'comprehensive')),
  content JSONB NOT NULL,
  sources JSONB[] DEFAULT '{}', -- Array of sources with URLs
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 100),
  generated_by TEXT NOT NULL DEFAULT 'gpt-4',
  token_count INTEGER,
  cache_key TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
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
  detected_by TEXT NOT NULL, -- 'scout_agent', 'manual', 'integration'
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acted_upon', 'expired', 'false_positive')),
  acted_upon_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);
CREATE INDEX idx_agent_executions_created_at ON agent_executions(created_at DESC);
CREATE INDEX idx_research_cache_company_id ON research_cache(company_id);
CREATE INDEX idx_research_cache_expires_at ON research_cache(expires_at);
CREATE INDEX idx_buying_signals_company_id ON buying_signals(company_id);
CREATE INDEX idx_buying_signals_detected_at ON buying_signals(detected_at DESC);
CREATE INDEX idx_buying_signals_status ON buying_signals(status);

-- Row Level Security
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE buying_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their org's data)
CREATE POLICY "Users can view their org's agents"
  ON ai_agents FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their org's executions"
  ON agent_executions FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their org's research cache"
  ON research_cache FOR SELECT
  USING (company_id IN (
    SELECT id FROM businesses -- Assumes businesses table has org filtering
  ));

CREATE POLICY "Users can view their org's signals"
  ON buying_signals FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_ai_agents
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### 1.2 Embedding Service

#### File: `lib/ai/embedding/embedding-service.ts`

```typescript
/**
 * Embedding Service
 * Generates and manages vector embeddings for semantic search
 * Integrates with OpenAI ada-002 model
 */

import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

export interface EmbeddingOptions {
  model?: 'text-embedding-ada-002' | 'text-embedding-3-small' | 'text-embedding-3-large'
  cacheKey?: string
  cacheTTL?: number // seconds
}

export interface EmbeddingResult {
  embedding: number[]
  model: string
  tokenCount: number
  cached: boolean
}

export interface CompanyEmbeddingInput {
  name: string
  description?: string
  industry?: string
  sic_codes?: string[]
  website?: string
  address?: string
  categories?: string[]
}

export class EmbeddingService {
  private openai: OpenAI
  private redisClient: any // TODO: Add Upstash Redis client

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
    const model = options.model || 'text-embedding-ada-002'

    // Build text representation of company
    const companyText = this.buildCompanyText(companyData)

    // Check cache first
    if (options.cacheKey && this.redisClient) {
      const cached = await this.getCachedEmbedding(options.cacheKey)
      if (cached) {
        return { ...cached, cached: true }
      }
    }

    // Generate embedding via OpenAI
    const response = await this.openai.embeddings.create({
      model,
      input: companyText,
      encoding_format: 'float'
    })

    const result: EmbeddingResult = {
      embedding: response.data[0].embedding,
      model,
      tokenCount: response.usage.total_tokens,
      cached: false
    }

    // Cache the result
    if (options.cacheKey && this.redisClient) {
      await this.cacheEmbedding(
        options.cacheKey,
        result,
        options.cacheTTL || 86400 // 24 hours default
      )
    }

    return result
  }

  /**
   * Batch generate embeddings for multiple companies
   */
  async generateBatchEmbeddings(
    companies: CompanyEmbeddingInput[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult[]> {
    const batchSize = 100 // OpenAI limit
    const results: EmbeddingResult[] = []

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize)
      const batchTexts = batch.map(c => this.buildCompanyText(c))

      const response = await this.openai.embeddings.create({
        model: options.model || 'text-embedding-ada-002',
        input: batchTexts,
        encoding_format: 'float'
      })

      const batchResults = response.data.map(item => ({
        embedding: item.embedding,
        model: options.model || 'text-embedding-ada-002',
        tokenCount: response.usage.total_tokens / batch.length, // Approximate
        cached: false
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
        embedding: JSON.stringify(embeddingResult.embedding), // pgvector handles this
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
      filters?: Record<string, any>
    } = {}
  ): Promise<Array<{ id: string; name: string; similarity: number }>> {
    const supabase = await createClient()

    // Get the company's embedding
    const { data: company, error: fetchError } = await supabase
      .from('businesses')
      .select('embedding')
      .eq('id', companyId)
      .single()

    if (fetchError || !company?.embedding) {
      throw new Error('Company embedding not found')
    }

    // Use the database function to find similar companies
    const { data, error } = await supabase
      .rpc('find_similar_companies', {
        query_embedding: company.embedding,
        match_threshold: options.threshold || 0.7,
        match_count: options.limit || 10
      })

    if (error) {
      throw new Error(`Similarity search failed: ${error.message}`)
    }

    return data || []
  }

  /**
   * Search companies by natural language query
   */
  async semanticSearch(
    query: string,
    options: {
      limit?: number
      threshold?: number
      filters?: Record<string, any>
    } = {}
  ): Promise<Array<{ id: string; name: string; similarity: number }>> {
    // Generate embedding for the query
    const queryEmbedding = await this.generateCompanyEmbedding(
      { name: query }, // Treat query as a simple text
      { cacheKey: `query:${query}` }
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

    return data || []
  }

  /**
   * Build text representation of company for embedding
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
      parts.push(`SIC Codes: ${company.sic_codes.join(', ')}`)
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
      const domain = new URL(company.website).hostname.replace('www.', '')
      parts.push(`Domain: ${domain}`)
    }

    return parts.join(' | ')
  }

  private async getCachedEmbedding(cacheKey: string): Promise<EmbeddingResult | null> {
    // TODO: Implement Redis caching
    return null
  }

  private async cacheEmbedding(
    cacheKey: string,
    result: EmbeddingResult,
    ttl: number
  ): Promise<void> {
    // TODO: Implement Redis caching
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService()
```

---

### 1.3 Background Job System (Inngest Integration)

#### File: `lib/inngest/client.ts`

```typescript
/**
 * Inngest Client Configuration
 * Durable workflow engine for background jobs
 */

import { Inngest, EventSchemas } from 'inngest'

// Define event schemas for type safety
type Events = {
  'company/embedding.generate': {
    data: {
      companyId: string
      priority: 'high' | 'normal' | 'low'
    }
  }
  'agent/opportunity_bot.run': {
    data: {
      agentId: string
      orgId: string
      criteria: Record<string, any>
    }
  }
  'agent/research_gpt.research': {
    data: {
      companyId: string
      depth: 'quick' | 'detailed' | 'comprehensive'
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
  'companies_house/filing.new': {
    data: {
      companyNumber: string
      filingType: string
      filedAt: string
    }
  }
}

export const inngest = new Inngest({
  id: 'oppspot',
  name: 'oppSpot',
  schemas: new EventSchemas().fromRecord<Events>()
})
```

#### File: `app/api/inngest/route.ts`

```typescript
/**
 * Inngest HTTP Endpoint
 * Receives and processes background jobs
 */

import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { generateEmbeddingFunction } from '@/lib/inngest/functions/generate-embedding'
import { opportunityBotFunction } from '@/lib/inngest/functions/opportunity-bot'
import { researchGPTFunction } from '@/lib/inngest/functions/research-gpt'
import { buyingSignalProcessorFunction } from '@/lib/inngest/functions/buying-signal-processor'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateEmbeddingFunction,
    opportunityBotFunction,
    researchGPTFunction,
    buyingSignalProcessorFunction
  ],
  streaming: 'allow' // Enable for faster execution
})
```

#### File: `lib/inngest/functions/generate-embedding.ts`

```typescript
/**
 * Generate Embedding Function
 * Background job to generate embeddings for companies
 */

import { inngest } from '@/lib/inngest/client'
import { embeddingService } from '@/lib/ai/embedding/embedding-service'
import { createClient } from '@/lib/supabase/server'

export const generateEmbeddingFunction = inngest.createFunction(
  {
    id: 'generate-embedding',
    name: 'Generate Company Embedding',
    retries: 3,
    rateLimit: {
      limit: 100,
      period: '1m' // 100 requests per minute (OpenAI rate limit)
    }
  },
  { event: 'company/embedding.generate' },
  async ({ event, step }) => {
    const { companyId, priority } = event.data

    // Step 1: Fetch company data
    const company = await step.run('fetch-company', async () => {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', companyId)
        .single()

      if (error || !data) {
        throw new Error(`Company not found: ${companyId}`)
      }

      return data
    })

    // Step 2: Generate embedding
    const embeddingResult = await step.run('generate-embedding', async () => {
      return await embeddingService.generateCompanyEmbedding({
        name: company.name,
        description: company.description,
        industry: company.sic_codes?.[0],
        sic_codes: company.sic_codes || [],
        website: company.website,
        address: company.address?.city,
        categories: company.categories || []
      })
    })

    // Step 3: Save to database
    await step.run('save-embedding', async () => {
      await embeddingService.saveEmbedding(companyId, embeddingResult)
    })

    // Step 4: Emit success event
    await step.sendEvent('embedding-generated', {
      name: 'company/embedding.generated',
      data: {
        companyId,
        tokenCount: embeddingResult.tokenCount,
        model: embeddingResult.model
      }
    })

    return {
      companyId,
      success: true,
      tokenCount: embeddingResult.tokenCount
    }
  }
)
```

---

### 1.4 API Routes Foundation

#### File: `app/api/embeddings/generate/route.ts`

```typescript
/**
 * Generate Embeddings API
 * Triggers embedding generation for companies
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import { z } from 'zod'

const generateEmbeddingsSchema = z.object({
  companyIds: z.array(z.string().uuid()).optional(),
  generateAll: z.boolean().optional(),
  priority: z.enum(['high', 'normal', 'low']).default('normal')
})

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { companyIds, generateAll, priority } = generateEmbeddingsSchema.parse(body)

    let targetCompanyIds: string[] = []

    if (generateAll) {
      // Get all companies without embeddings
      const { data, error } = await supabase
        .from('businesses')
        .select('id')
        .is('embedding', null)
        .limit(1000) // Safety limit

      if (error) {
        throw new Error(`Failed to fetch companies: ${error.message}`)
      }

      targetCompanyIds = data.map(c => c.id)
    } else if (companyIds && companyIds.length > 0) {
      targetCompanyIds = companyIds
    } else {
      return NextResponse.json(
        { error: 'Must provide companyIds or generateAll=true' },
        { status: 400 }
      )
    }

    // Enqueue embedding generation jobs
    const events = targetCompanyIds.map(companyId => ({
      name: 'company/embedding.generate' as const,
      data: {
        companyId,
        priority
      }
    }))

    await inngest.send(events)

    return NextResponse.json({
      success: true,
      jobsQueued: targetCompanyIds.length,
      companyIds: targetCompanyIds
    })
  } catch (error) {
    console.error('[API] Generate embeddings error:', error)
    return NextResponse.json(
      { error: 'Failed to generate embeddings' },
      { status: 500 }
    )
  }
}
```

#### File: `app/api/search/semantic/route.ts`

```typescript
/**
 * Semantic Search API
 * Natural language search using vector embeddings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { embeddingService } from '@/lib/ai/embedding/embedding-service'
import { z } from 'zod'

const semanticSearchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7),
  filters: z.record(z.any()).optional()
})

export async function POST(request: NextRequest) {
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

    // Parse request
    const body = await request.json()
    const { query, limit, threshold, filters } = semanticSearchSchema.parse(body)

    // Perform semantic search
    const results = await embeddingService.semanticSearch(query, {
      limit,
      threshold,
      filters
    })

    // Fetch full company details
    const companyIds = results.map(r => r.id)
    const { data: companies, error } = await supabase
      .from('businesses')
      .select('id, name, description, website, categories, sic_codes, address')
      .in('id', companyIds)

    if (error) {
      throw new Error(`Failed to fetch companies: ${error.message}`)
    }

    // Merge similarity scores with company data
    const enrichedResults = companies.map(company => {
      const result = results.find(r => r.id === company.id)
      return {
        ...company,
        similarity: result?.similarity || 0
      }
    })

    // Sort by similarity
    enrichedResults.sort((a, b) => b.similarity - a.similarity)

    return NextResponse.json({
      success: true,
      query,
      count: enrichedResults.length,
      results: enrichedResults
    })
  } catch (error) {
    console.error('[API] Semantic search error:', error)
    return NextResponse.json(
      { error: 'Semantic search failed' },
      { status: 500 }
    )
  }
}
```

---

## Phase 2: AI Agents (Months 3-4)

### 2.1 Agent Base Architecture

#### File: `lib/ai/agents/base-agent.ts`

```typescript
/**
 * Base Agent Class
 * Abstract base for all AI agents following the existing service pattern
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
   * Execute the agent (to be implemented by subclasses)
   */
  abstract execute(
    context: AgentExecutionContext
  ): Promise<AgentExecutionResult>

  /**
   * Validate agent configuration
   */
  abstract validateConfig(): Promise<boolean>

  /**
   * Run agent with full lifecycle management
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

    // Emit start event
    eventBus.emit({
      type: 'agent.execution.started',
      source: this.config.type,
      data: {
        executionId,
        agentId: this.config.id,
        orgId: this.config.orgId
      }
    })

    try {
      // Execute agent
      const context: AgentExecutionContext = {
        executionId,
        agentId: this.config.id,
        orgId: this.config.orgId,
        input,
        startTime
      }

      const result = await this.execute(context)

      // Update execution record (success)
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

      // Emit completion event
      eventBus.emit({
        type: 'agent.execution.completed',
        source: this.config.type,
        data: {
          executionId,
          agentId: this.config.id,
          result: result.output
        }
      })

      return result
    } catch (error) {
      // Update execution record (failed)
      await supabase
        .from('agent_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime.getTime(),
          error_message: error.message,
          error_stack: error.stack
        })
        .eq('id', executionId)

      // Emit failure event
      eventBus.emit({
        type: 'agent.execution.failed',
        source: this.config.type,
        data: {
          executionId,
          agentId: this.config.id,
          error: error.message
        }
      })

      throw error
    }
  }

  /**
   * Helper to call OpenAI/OpenRouter
   */
  protected async callLLM(
    prompt: string,
    options: {
      model?: string
      temperature?: number
      maxTokens?: number
      responseFormat?: 'text' | 'json'
    } = {}
  ): Promise<{ content: string; tokensUsed: number }> {
    // TODO: Implement LLM calling (reuse existing patterns from lib/ai/llm-factory.ts)
    return {
      content: '',
      tokensUsed: 0
    }
  }

  /**
   * Helper to emit events
   */
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

*This document continues for 100+ pages with detailed implementation for all 14 killer features...*

---

## Document Structure (Remaining Sections)

Due to message length limits, here's what the complete document would contain:

### Phase 2 Continued:
- **ResearchGPT Agent** (30-second company research)
- **OpportunityBot Agent** (24/7 autonomous prospecting)
- **Scout Agent** (signal detection)
- **Multi-Agent Orchestration** (5 agents working together)

### Phase 3: Predictive Intelligence
- **TimeTravel™** prediction engine
- **DealSignals™** real-time dashboard
- **ICP Learning Engine** (auto-refining targeting)

### Phase 4: Collaboration
- **TeamPlay™** multiplayer features
- **Knowledge Graph™** team intelligence
- **SmartSync™** CRM integration

### Phase 5: Polish
- **ChatSpot™** conversational interface
- **Voice Command™** hands-free control
- **Companies House Live™** real-time UK data

### Testing Strategy
- Unit tests
- Integration tests
- E2E tests with Playwright

### Deployment Strategy
- Feature flags
- Gradual rollout
- Monitoring & alerting

Would you like me to:
1. **Continue with full Phase 2 implementation** (ResearchGPT, OpportunityBot details)?
2. **Skip to a specific feature** you want fully detailed (e.g., ChatSpot, TeamPlay)?
3. **Create a separate document** for each feature with 100% completeness?

I can generate the complete 150+ page implementation plan, but need to know which sections to prioritize first given message length constraints.