# oppSpot Modernization Plan

> **Goal:** Transform oppSpot from a traditional SaaS platform into a modern, real-time deal intelligence system with AI-powered capabilities.

---

## Phase 1: Real-Time Infrastructure (Foundation) 🏗️

### 1.1 Supabase Realtime Implementation
- [ ] Enable Supabase Realtime subscriptions on key tables
  - [ ] `notifications` table for live notifications
  - [ ] `deals` table for collaborative deal updates
  - [ ] `stakeholders` table for presence indicators
  - [ ] `lead_scores` table for real-time scoring updates
- [ ] Replace in-memory EventBus with persistent event store
  - [ ] Create `event_log` table in Supabase
  - [ ] Migrate event handlers to use database-backed events
  - [ ] Add event replay capability
- [ ] Add WebSocket connections for multiplayer features
  - [ ] Implement presence system (who's viewing what)
  - [ ] Add live cursors for collaborative editing
  - [ ] Build activity feed with real-time updates

### 1.2 Stream Processing Architecture
- [ ] Set up Upstash Redis for Vercel
  - [ ] Configure Redis connection
  - [ ] Implement caching layer for frequent queries
  - [ ] Add rate limiting with Redis
  - [ ] Session storage migration
- [ ] Implement Inngest for background jobs
  - [ ] Install and configure Inngest
  - [ ] Migrate batch scoring to background workers
  - [ ] Add retry/timeout handling
  - [ ] Create job monitoring dashboard
- [ ] Refactor from batch to stream processing
  - [ ] Lead scoring pipeline as streaming job
  - [ ] BANT calculation as event-driven workflow
  - [ ] Data enrichment as async workers

### 1.3 Enhanced Database Layer
- [ ] Enable pgvector extension
  - [ ] Run migration: `CREATE EXTENSION vector;`
  - [ ] Test vector operations
  - [ ] Set up backup strategy for vector data
- [ ] Enable TimescaleDB for time-series data
  - [ ] Add extension for metrics tables
  - [ ] Convert `market_metrics` to hypertable
  - [ ] Set up retention policies
  - [ ] Create continuous aggregates
- [ ] Optimize existing schema
  - [ ] Add missing indexes identified in slow queries
  - [ ] Review and optimize RLS policies
  - [ ] Add database connection pooling

---

## Phase 2: Modern AI Capabilities with pgvector 🤖

### 2.1 Semantic Search Implementation
- [ ] Database schema updates
  - [ ] Add `embedding vector(1536)` to `companies` table
  - [ ] Add `bio_embedding vector(1536)` to `stakeholders` table
  - [ ] Add `context_embedding vector(1536)` to `deals` table
  - [ ] Add `content_embedding vector(1536)` to `articles/notes` table
- [ ] Create HNSW indexes for fast similarity search
  - [ ] `CREATE INDEX companies_embedding_idx ON companies USING hnsw (embedding vector_cosine_ops);`
  - [ ] Similar indexes for stakeholders, deals, articles
- [ ] Build embedding generation service
  - [ ] Create `/lib/ai/embedding-service.ts`
  - [ ] Integrate OpenAI ada-002 API
  - [ ] Add batch embedding generation
  - [ ] Implement embedding cache in Redis
  - [ ] Background job to backfill existing records
- [ ] Implement semantic search endpoints
  - [ ] `/api/search/semantic-companies` - Find similar companies
  - [ ] `/api/search/semantic-stakeholders` - Search stakeholders by description
  - [ ] `/api/search/semantic-deals` - Find matching deals
- [ ] Build "Find Similar Companies" feature
  - [ ] UI component for similarity search
  - [ ] Display similarity scores
  - [ ] Explain why companies are similar

### 2.2 RAG (Retrieval Augmented Generation)
- [ ] Document chunking and storage
  - [ ] Create `document_chunks` table with embeddings
  - [ ] Implement text splitter for long documents
  - [ ] Store company profiles, articles, case studies
- [ ] Context retrieval system
  - [ ] Build semantic retrieval function
  - [ ] Implement hybrid search (keyword + semantic)
  - [ ] Add relevance ranking
- [ ] Company Intelligence Q&A
  - [ ] Build chat interface for asking questions about companies
  - [ ] Integrate RAG with OpenRouter/OpenAI
  - [ ] Add citation/source tracking

### 2.3 AI Agent Orchestration
- [ ] Integrate Vercel AI SDK
  - [ ] Install `ai` package from Vercel
  - [ ] Set up streaming response handlers
  - [ ] Build chat UI with streaming
- [ ] Implement LangChain.js
  - [ ] Create agent chains for research
  - [ ] Build qualification agent
  - [ ] Create outreach recommendation agent
- [ ] Build autonomous agents
  - [ ] Company research agent (gather intel automatically)
  - [ ] Lead qualification agent (auto-score and route)
  - [ ] Outreach personalization agent (draft emails)
  - [ ] Competitive intel agent (monitor competitors)

### 2.4 Advanced Scoring with Vectors
- [ ] Vector-based lead scoring
  - [ ] Train similarity model on won/lost deals
  - [ ] Use embeddings for predictive scoring
  - [ ] Combine with existing BANT scores
- [ ] ICP Learning System
  - [ ] Embed all won deals
  - [ ] Find patterns in successful customers
  - [ ] Auto-update ICP based on new wins
  - [ ] Score new leads against learned ICP
- [ ] Deal Recommendations
  - [ ] Match prospects to similar won deals
  - [ ] Suggest relevant case studies
  - [ ] Recommend similar products/solutions

---

## Phase 3: Next-Gen UX 🎨

### 3.1 Real-Time Collaboration
- [ ] Choose and integrate multiplayer library
  - [ ] Evaluate PartyKit vs Liveblocks
  - [ ] Set up infrastructure
  - [ ] Configure authentication
- [ ] Implement presence system
  - [ ] Show who's viewing each page
  - [ ] Display active users
  - [ ] Add user avatars and status
- [ ] Live co-editing
  - [ ] Deal notes collaborative editing
  - [ ] Stakeholder profile updates in real-time
  - [ ] Conflict resolution strategy
- [ ] Activity feeds
  - [ ] Real-time activity stream
  - [ ] Live notifications (no polling)
  - [ ] Presence indicators everywhere

### 3.2 Performance & Interactivity
- [ ] Replace DataTable component
  - [ ] Migrate to TanStack Table
  - [ ] Add virtual scrolling with TanStack Virtual
  - [ ] Implement column resizing, reordering
  - [ ] Add column visibility controls
  - [ ] Support 100k+ row rendering
- [ ] Optimistic UI updates
  - [ ] Implement optimistic mutations with TanStack Query
  - [ ] Add rollback on error
  - [ ] Show loading states
- [ ] Command Palette (⌘K)
  - [ ] Install `cmdk` package
  - [ ] Build global command palette
  - [ ] Add fuzzy search for navigation
  - [ ] Include semantic search results
  - [ ] Add keyboard shortcuts
- [ ] Keyboard shortcuts
  - [ ] Document all shortcuts
  - [ ] Add shortcut hints in UI
  - [ ] Implement across all pages

### 3.3 Advanced Visualizations
- [ ] Deal flow Kanban
  - [ ] Install `dnd-kit`
  - [ ] Build drag-and-drop deal board
  - [ ] Add stage transitions
  - [ ] Real-time updates when deals move
- [ ] Network graphs
  - [ ] Install React Flow or Vis.js
  - [ ] Visualize stakeholder relationships
  - [ ] Show influence networks
  - [ ] Interactive exploration
- [ ] Real-time dashboards
  - [ ] Streaming metric charts
  - [ ] Live leaderboards
  - [ ] Animated transitions
- [ ] Vector embedding visualizations
  - [ ] 2D/3D projection of company embeddings (t-SNE/UMAP)
  - [ ] Interactive similarity maps
  - [ ] Cluster visualization

---

## Phase 4: Workflow Automation 🔄

### 4.1 Durable Workflows with Inngest
- [ ] Set up Inngest
  - [ ] Install Inngest SDK
  - [ ] Configure Inngest endpoint
  - [ ] Set up development environment
- [ ] Migrate existing workflows
  - [ ] Lead nurture sequences
  - [ ] Onboarding workflows
  - [ ] Data enrichment pipelines
  - [ ] Scoring recalculation jobs
- [ ] Build visual workflow builder
  - [ ] Design workflow UI
  - [ ] Implement branching logic
  - [ ] Add conditions and triggers
  - [ ] Test and deploy

### 4.2 Smart Notifications
- [ ] Supabase Realtime notifications
  - [ ] Real-time notification delivery
  - [ ] Read/unread status syncing
  - [ ] Notification grouping
- [ ] Notification preferences
  - [ ] User preference settings
  - [ ] Smart batching (don't spam)
  - [ ] Quiet hours support
- [ ] Web Push notifications
  - [ ] Implement Web Push API
  - [ ] Add push subscription management
  - [ ] Send critical alerts via push
- [ ] Email digests
  - [ ] Daily/weekly digest emails (Resend)
  - [ ] Personalized content
  - [ ] Unsubscribe management
- [ ] Slack/Teams integration
  - [ ] Webhook delivery system
  - [ ] Custom notification channels
  - [ ] Two-way integration

### 4.3 Integrations & Sync
- [ ] CRM integrations
  - [ ] Salesforce bi-directional sync
  - [ ] HubSpot integration
  - [ ] Build via Supabase Edge Functions
- [ ] Calendar integration
  - [ ] Google Calendar sync
  - [ ] Outlook Calendar sync
  - [ ] Auto-schedule demo bookings
- [ ] Email tracking
  - [ ] Track email opens
  - [ ] Track link clicks
  - [ ] Engagement scoring
- [ ] Webhook system
  - [ ] Webhook delivery with retry
  - [ ] Webhook configuration UI
  - [ ] Event filtering

---

## Phase 5: Enterprise Features 🏢

### 5.1 Team Collaboration
- [ ] Deal ownership
  - [ ] Assign deals to users
  - [ ] Territory management
  - [ ] Deal handoff workflows
- [ ] Activity scoring
  - [ ] Track user activities
  - [ ] Build leaderboards
  - [ ] Gamification elements
- [ ] Team workspaces
  - [ ] Workspace isolation
  - [ ] Role-based access
  - [ ] Shared resources
- [ ] Shared searches
  - [ ] Save and share searches
  - [ ] Team-wide visibility
  - [ ] Search templates

### 5.2 Advanced Analytics
- [ ] Predictive pipeline analytics
  - [ ] Win probability prediction
  - [ ] Revenue forecasting
  - [ ] Deal velocity analysis
- [ ] Win/loss analysis
  - [ ] AI-powered insights
  - [ ] Pattern recognition
  - [ ] Recommendations
- [ ] Vector-based patterns
  - [ ] Find patterns in won deals
  - [ ] Identify common traits
  - [ ] Auto-detect red flags
- [ ] Custom reporting
  - [ ] Report builder UI
  - [ ] Scheduled reports
  - [ ] Export to Excel/PDF

### 5.3 API & Extensibility
- [ ] tRPC API setup
  - [ ] Install tRPC
  - [ ] Build type-safe API routes
  - [ ] Generate TypeScript client
  - [ ] Add API documentation
- [ ] REST API (Supabase PostgREST)
  - [ ] Expose public API
  - [ ] API key management
  - [ ] Rate limiting
  - [ ] Documentation
- [ ] Webhook delivery
  - [ ] Outbound webhooks
  - [ ] Retry logic
  - [ ] Delivery logs
- [ ] SDK/CLI
  - [ ] Build JavaScript SDK
  - [ ] CLI tool for automation
  - [ ] Code examples

---

## Quick Wins (Start Here) 🚀

### Priority 1: Immediate Impact
- [ ] **Enable pgvector** - Add semantic search to companies
  - [ ] Database migration
  - [ ] Embedding generation service
  - [ ] "Find Similar Companies" feature
  - [ ] Test with 100 companies

- [ ] **Supabase Realtime** - Live notifications
  - [ ] Enable Realtime on notifications table
  - [ ] Update frontend to subscribe
  - [ ] Add notification bell with live count
  - [ ] Test real-time delivery

- [ ] **Command Palette (⌘K)** - Power user navigation
  - [ ] Install cmdk
  - [ ] Build command palette component
  - [ ] Add navigation commands
  - [ ] Add search commands
  - [ ] Global keyboard shortcut

### Priority 2: Foundation
- [ ] **TanStack Table + Virtual** - Better data tables
  - [ ] Replace DataTable component
  - [ ] Add virtual scrolling
  - [ ] Test with 10k rows

- [ ] **Vercel AI SDK** - Streaming AI
  - [ ] Install AI SDK
  - [ ] Build AI chat component
  - [ ] Add to company detail page
  - [ ] "Ask about this company" feature

- [ ] **Inngest Setup** - Background jobs
  - [ ] Set up Inngest account
  - [ ] Install SDK
  - [ ] Migrate first workflow (lead scoring)
  - [ ] Add monitoring

---

## Tech Stack Summary

### Current Stack
- Next.js 15, React 19, TypeScript
- Supabase (PostgreSQL, Auth, Storage)
- Tailwind CSS, shadcn/ui
- Zustand, TanStack Query
- OpenRouter API, Resend

### New Additions
- **Vector Search**: Supabase pgvector (not Pinecone)
- **Real-time**: Supabase Realtime + PartyKit/Liveblocks
- **Workers**: Inngest (serverless, Vercel-native)
- **AI**: Vercel AI SDK + LangChain.js
- **Caching**: Upstash Redis
- **Tables**: TanStack Table + TanStack Virtual
- **API**: tRPC for type-safety
- **Commands**: cmdk for command palette

---

## Cost Estimates

### One-Time Costs
- pgvector embeddings: ~$0.50 for 10K companies
- Development time: Varies by phase

### Monthly Recurring
- Upstash Redis: $0-10 (free tier available)
- Inngest: $0-20 (free tier: 50K steps/month)
- OpenAI embeddings: $5-10 (updates only)
- PartyKit/Liveblocks: $0-25 (depends on users)
- **Total New Monthly Cost: $0-65** (mostly free tiers)

### Savings
- No Pinecone: Save $100-500/month
- No separate vector DB hosting
- Leverage existing Supabase plan

---

## Success Metrics

### Phase 1 Success
- [ ] Real-time notifications working (0 polling)
- [ ] Event bus persisted to database
- [ ] Background jobs running on Inngest

### Phase 2 Success
- [ ] Semantic search live on 3+ tables
- [ ] RAG Q&A responding in <3s
- [ ] 90%+ embedding coverage

### Phase 3 Success
- [ ] Command palette used 10+ times/day/user
- [ ] Tables handle 100k+ rows smoothly
- [ ] Collaborative features working

### Phase 4 Success
- [ ] 5+ workflows automated
- [ ] Push notifications delivered <1s
- [ ] CRM sync working bi-directionally

### Phase 5 Success
- [ ] Team features adopted by 80%+ users
- [ ] API used by external integrations
- [ ] Custom reports created by users

---

## Timeline Estimate

- **Quick Wins**: 1-2 weeks
- **Phase 1**: 3-4 weeks
- **Phase 2**: 4-6 weeks
- **Phase 3**: 3-4 weeks
- **Phase 4**: 4-5 weeks
- **Phase 5**: 4-6 weeks

**Total: ~5-6 months for complete modernization**

---

## Notes

- Start with Quick Wins to build momentum
- Each phase can be worked on incrementally
- Test thoroughly before moving to next phase
- Gather user feedback continuously
- Adjust priorities based on usage data

---

**Last Updated**: 2025-10-01
**Status**: Planning
**Next Review**: After Quick Wins completion
