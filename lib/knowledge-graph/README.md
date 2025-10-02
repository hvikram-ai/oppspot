# Knowledge Graph™ - Team Intelligence Memory System

## Overview

Knowledge Graph™ is an AI-powered system that automatically captures, connects, and surfaces your team's collective intelligence. It builds a living memory of everything your team learns about companies, stakeholders, buying signals, and opportunities.

## Architecture

### Core Components

```
knowledge-graph/
├── types.ts                      # TypeScript types and interfaces
├── extraction/
│   └── entity-extractor.ts      # AI-powered entity extraction
├── query/
│   └── graph-query-engine.ts    # Natural language queries and graph traversal
├── integrations/
│   ├── teamplay-integration.ts  # TeamPlay™ activity capture
│   └── research-integration.ts  # ResearchGPT™ knowledge extraction
└── README.md                     # This file
```

### Database Schema

**Tables:**
- `knowledge_entities` - All nodes in the graph (companies, people, signals, etc.)
- `entity_relationships` - Edges connecting entities
- `knowledge_facts` - Atomic facts about entities
- `knowledge_queries` - Saved queries and patterns
- `knowledge_insights` - AI-generated insights

**Key Features:**
- **pgvector** for semantic search (1536-dimensional embeddings)
- **Graph indexes** for fast relationship traversal
- **Full-text search** for keyword queries
- **RLS policies** for org-level data isolation

## Features

### 1. Automatic Knowledge Extraction

Extract entities, relationships, and facts from any content:

```typescript
import { EntityExtractor } from '@/lib/knowledge-graph/extraction/entity-extractor'

const result = await EntityExtractor.extractKnowledge({
  content: "Revolut raised £100M Series H. CTO Sarah Chen is interested in AWS...",
  content_type: 'research_report',
  entity_context: {
    entity_id: 'company-123',
    entity_type: 'company',
    entity_name: 'Revolut'
  }
}, userId)

// Result:
// - Entities: Revolut (company), Sarah Chen (person), AWS (technology)
// - Relationships: Sarah Chen works_at Revolut, Revolut uses AWS
// - Facts: Revolut raised £100M, Sarah Chen interested in AWS
```

### 2. Natural Language Queries

Query your knowledge graph using natural language:

```typescript
import { GraphQueryEngine } from '@/lib/knowledge-graph/query/graph-query-engine'

const result = await GraphQueryEngine.query({
  query: "Find fintech companies we researched this quarter",
  filters: {
    entity_types: ['company'],
    date_range: { from: '2025-01-01', to: '2025-03-31' }
  },
  include_facts: true,
  limit: 20
}, userId)

// Returns matching companies with facts and relationships
```

### 3. Semantic Search

Vector-based similarity search:

```typescript
const result = await GraphQueryEngine.semanticSearch({
  query: "companies similar to Stripe",
  entity_type: 'company',
  similarity_threshold: 0.7,
  limit: 10
}, userId)

// Returns companies semantically similar to Stripe
```

### 4. Entity Networks

Visualize relationship networks:

```typescript
const result = await GraphQueryEngine.getEntityNetwork({
  entity_id: 'company-123',
  max_depth: 2,        // 2-hop relationships
  max_nodes: 50,       // Limit to 50 nodes
  include_facts: true
}, userId)

// Returns graph data for visualization
```

## API Routes

### Extract Knowledge
```
POST /api/knowledge-graph/extract
Body: {
  content: string
  content_type: 'research_report' | 'conversation' | 'meeting_notes' | 'email' | 'document'
  entity_context?: { entity_id, entity_type, entity_name }
}
```

### Query Graph
```
POST /api/knowledge-graph/query
Body: {
  query: string
  filters?: { entity_types, relationship_types, confidence_min, date_range }
  include_facts?: boolean
  include_relationships?: boolean
  limit?: number
}
```

### Semantic Search
```
GET /api/knowledge-graph/search?q=query&entity_type=company&threshold=0.7&limit=20
```

### Get Entity Details
```
GET /api/knowledge-graph/entity/[id]
Returns: {
  entity: KnowledgeEntity
  relationships: EntityRelationship[]
  facts: KnowledgeFact[]
}
```

### Get Entity Network
```
GET /api/knowledge-graph/network?entity_id=xxx&max_depth=2&max_nodes=50
Returns: {
  central_entity: KnowledgeEntity
  graph: GraphData
  insights: string[]
}
```

## Integrations

### TeamPlay™ Integration

Automatically capture team activities as knowledge:

```typescript
import { TeamPlayKnowledgeIntegration } from '@/lib/knowledge-graph/integrations/teamplay-integration'

// This is called automatically by TeamPlay™
await TeamPlayKnowledgeIntegration.captureActivity(
  'company_viewed',
  'businesses',
  companyId,
  companyName,
  metadata
)
```

**What it captures:**
- Company views → Creates company entity + "researched" relationship
- Company saves → Creates "interested_in" relationship
- Research generated → Creates insight entity + facts
- Signals detected → Creates buying_signal entity + facts

### ResearchGPT™ Integration

Extract knowledge from research reports:

```typescript
import { ResearchGPTKnowledgeIntegration } from '@/lib/knowledge-graph/integrations/research-integration'

await ResearchGPTKnowledgeIntegration.extractFromResearch(
  companyId,
  companyName,
  researchContent,
  userId
)
```

**What it extracts:**
- Entities: Companies, stakeholders, technologies, competitors
- Relationships: Works_at, uses, competes_with, interested_in
- Facts: Employee count, funding, tech stack, pain points, goals

## Entity Types

- `company` - Business organizations
- `person` / `stakeholder` - People (decision makers, champions)
- `buying_signal` - Indicators of buying intent
- `technology` - Tech stack, tools, platforms
- `product` - Products or services
- `industry` - Industry/sector classifications
- `insight` - AI-generated insights
- `event` - Meetings, conferences, launches
- `deal` - Opportunities or deals
- `research_report` - Research documents
- `conversation` - Meetings, calls, emails
- `document` - Files and documents

## Relationship Types

**Professional:**
- `works_at`, `reports_to`, `manages`, `colleagues_with`

**Interest & Engagement:**
- `interested_in`, `researched`, `evaluated`, `uses`, `purchased`

**Influence & Advocacy:**
- `champions`, `opposes`, `influences`, `recommends`

**Technical:**
- `built_with`, `integrates_with`, `competes_with`, `similar_to`

**Informational:**
- `mentioned_in`, `discussed_in`, `related_to`, `tagged_with`

## Fact Types

- `attribute` - Static properties (employee count, revenue)
- `event` - Time-based occurrences (raised funding, hired)
- `opinion` - Preferences or likes (likes AWS)
- `intent` - Buying or action intent (wants to buy CRM)
- `pain_point` - Problems or frustrations
- `goal` - Objectives or targets
- `constraint` - Limitations (budget, timeline)
- `preference` - Choices or inclinations

## Confidence Levels

- `verified` (0.9-1.0) - Human confirmed
- `high` (0.7-0.89) - Multiple sources
- `medium` (0.5-0.69) - Single reliable source
- `low` (0.3-0.49) - Inferred
- `speculative` (0.0-0.29) - AI guess

## Usage Examples

### Example 1: Extract from Research Report

```typescript
// When ResearchGPT™ generates a report
const research = await generateResearch(companyId)

// Automatically extract knowledge
await ResearchGPTKnowledgeIntegration.extractFromResearch(
  companyId,
  companyName,
  research.content,
  userId
)
```

### Example 2: Query for Similar Companies

```typescript
// User asks: "Find companies similar to Stripe"
const result = await GraphQueryEngine.semanticSearch({
  query: "payment processing company with developer-first approach",
  entity_type: 'company',
  similarity_threshold: 0.75,
  limit: 10
}, userId)
```

### Example 3: Get Company Context

```typescript
// Before calling a prospect
const context = await fetch(`/api/knowledge-graph/entity/${companyId}`)
  .then(r => r.json())

// Returns:
// - All facts about the company
// - Relationships (people, technologies, competitors)
// - Team's previous interactions
// - Buying signals detected
```

### Example 4: Find Warm Introductions

```typescript
// Query: "Who knows someone at Revolut?"
const result = await GraphQueryEngine.query({
  query: "Find team members who have relationships with Revolut employees",
  filters: {
    relationship_types: ['colleagues_with', 'knows']
  }
}, userId)
```

## Database Functions

### Find Related Entities

```sql
SELECT * FROM find_related_entities(
  p_entity_id := 'entity-id',
  p_relationship_type := 'works_at', -- optional
  p_limit := 50
);
```

### Get Entity Facts

```sql
SELECT * FROM get_entity_facts(
  p_entity_id := 'entity-id',
  p_include_historical := false
);
```

### Semantic Search

```sql
SELECT * FROM search_knowledge_entities(
  p_org_id := 'org-id',
  p_query_embedding := embedding_vector,
  p_entity_type := 'company', -- optional
  p_similarity_threshold := 0.7,
  p_limit := 20
);
```

## Performance Optimization

### Indexes

- **Vector index (ivfflat)** for fast semantic search
- **GIN index** for full-text search
- **B-tree indexes** on foreign keys and filters
- **Composite indexes** for common query patterns

### Caching Strategy

- Cache frequently accessed entities
- Cache query results for 5 minutes
- Invalidate cache on entity updates

### Scaling

- Partition `knowledge_facts` by date
- Archive old relationships
- Limit graph traversal depth to prevent runaway queries

## Monitoring

Track these metrics:

- **Extraction rate**: Entities/facts created per day
- **Query performance**: Avg query time
- **Cache hit rate**: % of cached queries
- **Graph size**: Total entities and relationships
- **Knowledge coverage**: % of companies with >10 facts

## Security

- **Row Level Security (RLS)** enforced on all tables
- **Org-level isolation** - users only see their org's data
- **Audit trail** - all changes tracked with created_by
- **Verification system** - facts can be verified by users

## Future Enhancements

### Phase 2
- [ ] Real-time graph updates via WebSockets
- [ ] Advanced graph algorithms (PageRank, community detection)
- [ ] Knowledge graph embeddings (TransE, DistMult)
- [ ] Multi-hop reasoning ("Who knows someone who knows...")

### Phase 3
- [ ] Automated insight generation
- [ ] Knowledge gap detection
- [ ] Recommendation engine
- [ ] Time-series analysis of knowledge evolution

### Phase 4
- [ ] Knowledge graph export (GraphML, Cypher)
- [ ] Integration with external knowledge bases
- [ ] Collaborative knowledge curation
- [ ] Knowledge quality scoring

## Contributing

When adding new features:

1. Update types in `types.ts`
2. Add database migration if needed
3. Update extraction prompts for new entity types
4. Add API routes for new operations
5. Update this README

## License

Proprietary - oppSpot.ai
