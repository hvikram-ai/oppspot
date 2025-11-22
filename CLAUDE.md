# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**oppSpot** is a production SaaS B2B business intelligence platform for discovering global acquisition targets and market intelligence for PE/M&A professionals. It's built with Next.js 15, TypeScript, Supabase, and AI-powered features.

## Development Commands

```bash
# Development server (uses Turbopack for faster builds)
npm run dev

# Production build
npm run build
npm run start

# Linting
npm run lint

# Testing (Playwright E2E tests)
npm run test:e2e              # Run all tests
npm run test:e2e:headed       # Run with browser UI
npm run test:e2e:debug        # Debug mode
npm run test:e2e:ui           # Interactive UI mode
npm run test:e2e:auth         # Run auth tests only
npm run test:e2e:search       # Run search tests only
npm run test:e2e:map          # Run map tests only
npm run test:e2e:business     # Run business detail tests only

# Utility scripts
npm run create-account        # Create premium account via script
npm run demo-login            # Demo login script
```

## Critical Installation Note

**Always use `npm install --legacy-peer-deps`** due to react-leaflet-cluster peer dependency conflicts. This is a known issue, not a bug to fix.

The `.npmrc` file is configured with `legacy-peer-deps=true` to handle this automatically in deployment environments like Vercel.

## Build Configuration & Technical Debt

**Current Build Status**: The project has temporary configuration changes to enable deployment while technical debt is being addressed.

### Temporary Build Settings (next.config.ts):
- `eslint.ignoreDuringBuilds: true` - ESLint errors ignored during builds
- `typescript.ignoreBuildErrors: true` - TypeScript errors ignored during builds  
- `output: 'standalone'` - Disables static optimization
- Standard webpack build (Turbopack temporarily disabled)

### Known Technical Debt:
1. **TypeScript Issues**: ~100+ `@typescript-eslint/no-explicit-any` errors across codebase
2. **React Issues**: Multiple `react/no-unescaped-entities` errors in JSX  
3. **Hook Dependencies**: Missing dependencies in useEffect arrays
4. **Unused Variables**: Various unused imports and variables
5. **Next.js 15 Compatibility**: Some route handlers need async params updates

### Priority Technical Debt Cleanup:
1. **High Priority**: Fix async await syntax errors (blocking builds)
2. **Medium Priority**: Replace `any` types with proper TypeScript interfaces
3. **Low Priority**: Clean up unused variables and fix React warnings

**Note**: These configuration changes prioritize deployment stability while maintaining code functionality. Re-enable strict checking after systematic cleanup.

## Architecture Overview

### Next.js App Router Structure
- **`app/`**: Next.js 15 App Router (NOT Pages Router)
  - **`(auth)/`**: Auth route group for login/signup pages
  - **`(dashboard)/`**: Protected dashboard routes
  - **`api/`**: API routes with route.ts files
  - **`business/[id]/`**: Dynamic business detail pages
- **`components/`**: Reusable React components organized by domain
  - **`auth/`**: Authentication components
  - **`ui/`**: shadcn/ui components (DO NOT replace)
  - **`map/`**: Leaflet map components
- **`lib/`**: Core business logic and utilities
  - **`supabase/`**: Database client configurations
  - **`ai/`**: OpenRouter AI integration
  - **`analytics/`**: Predictive analytics engine
  - **`notifications/`**: Real-time notification system

### Key Patterns

#### Supabase Client Usage
```typescript
// Server components/API routes
import { createClient } from '@/lib/supabase/server'

// Client components
import { createClient } from '@/lib/supabase/client'
```

#### API Route Pattern
```typescript
// app/api/*/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ data })
}
```

#### Component Structure
- Use 'use client' directive for interactive components
- Prefer server components when possible
- Import UI components from `@/components/ui/[component]`

## Technology Stack

- **Framework**: Next.js 15 with App Router and Turbopack
- **Database**: Supabase (PostgreSQL + Auth + Realtime subscriptions)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Maps**: Leaflet (NOT Google Maps embedded)
- **AI**: OpenRouter API for LLM capabilities
- **Email**: Resend for transactional emails
- **State**: Zustand for client state management
- **Testing**: Playwright for E2E tests

## Critical Constraints

### DO NOT:
1. Create files in `pages/` directory (use `app/` with App Router)
2. Use regular `npm install` (always use `--legacy-peer-deps`)
3. Install separate UI packages (use existing shadcn/ui components)
4. Use Google Maps JavaScript API (use Leaflet)
5. Ignore TypeScript strict mode
6. Forget 'use client' for interactive components
7. Make database queries in client components

### Environment Variables
Required for development:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_API_KEY`
- `RESEND_API_KEY`

## Database Schema Overview

Core tables include:
- `businesses`: Main business entities
- `locations`: Geographic data
- `profiles`: User profiles
- `saved_businesses`: User's saved items
- `business_lists`: Curated business lists
- `market_metrics`: Time-series analytics data
- `notifications`: User notifications system
- `research_reports`: ResearchGPT™ intelligence reports
- `research_sections`: ResearchGPT™ report sections with differential TTL
- `research_sources`: Source attributions for GDPR compliance
- `user_research_quotas`: Monthly research quota tracking

## Development Workflow

### Adding New Features
1. Plan database schema changes first
2. Create migration in `supabase/migrations/` with timestamp prefix
3. Build API endpoint in `app/api/`
4. Create UI components following existing patterns
5. Add to navigation if needed
6. Run tests before committing

### Type Safety
- Always define TypeScript interfaces
- Use Zod for runtime validation
- Leverage `types/database.ts` for Supabase types
- Never use 'any' type unless absolutely necessary

### Testing Approach
- E2E tests with Playwright
- Tests run on Chromium, Firefox, WebKit, and mobile viewports
- Base URL: `http://localhost:3001` (configurable via PLAYWRIGHT_BASE_URL)
- Test files in `tests/` directory

## Performance Considerations

- Uses Turbopack for faster development builds
- Leaflet clustering for map performance with 1000+ markers
- React.memo for expensive components
- Supabase RLS for security and performance
- Lazy loading for heavy components

## Key Features Implemented

- **ResearchGPT™**: AI-powered company intelligence in <30 seconds
- AI-powered business search with natural language
- Interactive maps with clustering
- Real-time notifications
- Email notification system
- Demo mode for prospects
- Social media tracking
- Predictive analytics engine
- Competitive analysis tools

### ResearchGPT™ - AI-Powered Company Intelligence

**Location**: `lib/research-gpt/`

ResearchGPT™ generates comprehensive company intelligence reports in under 30 seconds by aggregating data from multiple sources and analyzing with AI.

**Architecture**:
- **Data Sources** (`data-sources/`): Companies House, News API, Reed Jobs, Website Scraper
- **Analyzers** (`analyzers/`): Snapshot, Signals, Decision Makers, Revenue, Recommendations
- **Repository** (`repository/`): Database operations with smart caching
- **Orchestration** (`research-gpt-service.ts`): Main service coordinating the pipeline

**API Endpoints**:
- `POST /api/research/[companyId]` - Initiate research generation
- `GET /api/research/[companyId]` - Retrieve report
- `GET /api/research/[companyId]/status` - Poll generation status
- `GET /api/research/quota` - Check user quota

**Key Features**:
- Parallel data fetching from 4+ sources
- Differential caching (7 days for snapshots, 6 hours for signals)
- GDPR-compliant (source attribution, business emails only, 6-month auto-deletion)
- Smart quota management
- Performance target: 95% of requests complete in <30 seconds

**UI Components** (`components/research/`):
- `research-button.tsx` - Trigger research generation
- `research-progress.tsx` - Real-time progress indicator
- `research-report.tsx` - Full report display
- `quota-display.tsx` - Quota management

**Database Tables**:
- `research_reports` - Main reports
- `research_sections` - 6 section types (snapshot, signals, decision_makers, etc.)
- `research_sources` - Source attributions
- `user_research_quotas` - Monthly quota tracking

This is a production SaaS application with real users - maintain high code quality and test thoroughly before making changes.

### Data Room - AI-Powered Due Diligence Platform

**Location**: `lib/data-room/`, `components/data-room/`, `supabase/functions/analyze-document/`

The Data Room feature provides secure document management with AI-powered classification and metadata extraction for M&A and due diligence workflows.

**Architecture**:
- **Types** (`lib/data-room/types.ts`): TypeScript definitions for all data room entities
- **AI Utilities** (`lib/data-room/ai/`): Document classification, metadata extraction, text processing
- **State Management** (`lib/stores/data-room-store.ts`): Zustand store for client-side state
- **Error Handling** (`lib/data-room/utils/error-handler.ts`): Standardized error handling
- **Components** (`components/data-room/`): UI components including error boundaries, loading states
- **Edge Function** (`supabase/functions/analyze-document/`): AI analysis pipeline

**Core Features**:
- **Document Upload**: Multi-file drag-and-drop with progress tracking
- **AI Classification**: Automatic document type classification (financial, contract, legal, HR, due diligence, other)
- **Metadata Extraction**: Structured data extraction (dates, amounts, parties, contract terms)
- **Confidence Scoring**: AI confidence levels with human review flagging
- **Secure Storage**: Encrypted document storage via Supabase Storage
- **Access Control**: Role-based permissions (owner, editor, viewer, commenter)
- **Activity Logging**: Comprehensive audit trail of all actions
- **Document Viewer**: PDF viewer with AI insights sidebar

**AI Pipeline**:
1. Document upload → Supabase Storage
2. Trigger Edge Function with document_id
3. Download file from storage
4. Extract text using pdf-parse
5. Classify document type (OpenRouter API + Claude Sonnet 3.5)
6. Extract structured metadata
7. Update document record with results
8. Performance target: <10s for 95% of documents

**Database Tables**:
- `data_rooms` - Main data room entities
- `documents` - Uploaded documents with AI analysis results
- `document_analysis` - Detailed AI analysis records
- `data_room_access` - Permission grants and invitations
- `activity_logs` - Audit trail (immutable)
- `document_annotations` - User comments and highlights

**State Management**:
```typescript
import { useDataRoomStore } from '@/lib/stores/data-room-store';

// Access state
const { currentDataRoomId, documentFilters, uploadProgress } = useDataRoomStore();

// Update state
const { setCurrentDataRoom, updateUploadProgress } = useDataRoomStore();
```

**Error Handling**:
```typescript
import { withErrorHandler, DataRoomError, DataRoomErrorCode } from '@/lib/data-room/utils';

// In API routes
export const POST = withErrorHandler(async (req) => {
  // Your handler code
  throw new DataRoomError('Not found', DataRoomErrorCode.NOT_FOUND, 404);
});

// In components
import { DataRoomErrorBoundary } from '@/components/data-room/error-boundary';

<DataRoomErrorBoundary>
  <YourComponent />
</DataRoomErrorBoundary>
```

**AI Utilities**:
```typescript
import { DocumentClassifier, MetadataExtractor, extractTextFromPDF } from '@/lib/data-room/ai';

// Extract text from PDF
const result = await extractTextFromPDF(buffer);

// Classify document
const classifier = new DocumentClassifier();
const classification = await classifier.classify(result.text, filename);

// Extract metadata
const extractor = new MetadataExtractor();
const metadata = await extractor.extract(result.text, classification.document_type);
```

**Key Files**:
- `lib/data-room/types.ts` - TypeScript types and interfaces
- `lib/data-room/ai/document-classifier.ts` - AI classification logic
- `lib/data-room/ai/metadata-extractor.ts` - AI metadata extraction
- `lib/data-room/ai/text-extractor.ts` - PDF text extraction utilities
- `lib/stores/data-room-store.ts` - Zustand state management
- `lib/data-room/utils/error-handler.ts` - Error handling utilities
- `components/data-room/error-boundary.tsx` - React error boundary
- `components/data-room/loading-states.tsx` - Loading skeletons and indicators
- `supabase/functions/analyze-document/index.ts` - Document analysis Edge Function

**Environment Variables Required**:
- `OPENROUTER_API_KEY` - For AI classification and metadata extraction
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for Edge Functions

### Data Room Q&A Copilot (Feature 008)

**Location**: `lib/data-room/qa/`, `components/data-room/qa-*.tsx`, `app/api/data-room/[dataRoomId]/{query,history,feedback}/`

AI-powered Q&A system for data room documents using Retrieval-Augmented Generation (RAG). Users ask natural language questions about uploaded PDFs and receive grounded answers with verifiable citations.

**Architecture**:
- **Vector Search** (`lib/data-room/qa/retrieval-service.ts`): Semantic search using pgvector
- **Document Processing** (`lib/data-room/qa/document-chunker.ts`, `text-extractor.ts`): PDF chunking and embedding
- **LLM Integration** (`lib/data-room/qa/qa-llm-client.ts`): Multi-provider LLM support via LLMManager
- **Query Orchestration** (`lib/data-room/qa/query-service.ts`): End-to-end Q&A pipeline
- **Rate Limiting** (`lib/data-room/qa/rate-limiter.ts`): 60 queries/hour per user per data room

**Core Features**:
- **Natural Language Q&A**: Ask questions about documents in plain English
- **Streaming Responses**: Progressive answer rendering (SSE)
- **Citation Deep-Linking**: Click citations to jump to specific pages/chunks in documents
- **Query History**: Paginated history with export (JSON/CSV) and deletion (GDPR compliant)
- **User Feedback**: Thumbs up/down ratings with optional comments
- **Automatic Retry**: One retry attempt for temporary errors
- **Abstention**: Responds "I don't have enough information" when insufficient evidence

**API Endpoints**:
- `POST /api/data-room/[dataRoomId]/query` - Submit question, receive answer with citations
- `GET /api/data-room/[dataRoomId]/history` - Retrieve query history (paginated, cursor-based)
- `POST /api/data-room/[dataRoomId]/feedback` - Submit helpful/not_helpful rating
- `GET /api/data-room/[dataRoomId]/export` - Export query history (JSON/CSV)
- `DELETE /api/data-room/[dataRoomId]/history` - Delete queries (individual or bulk)

**Database Tables** (see `supabase/migrations/20250129_dataroom_qa.sql`):
- `document_pages` - Page-level text from PDFs
- `document_chunks` - 500-token chunks with vector embeddings (pgvector HNSW index)
- `qa_queries` - User questions, answers, citations, performance metrics
- `qa_citations` - Citations linking answers to source documents
- `qa_feedback` - User ratings (helpful/not_helpful) with comments
- `qa_rate_limits` - Rate limiting state (60/hour enforcement)

**UI Components**:
- `components/data-room/qa-chat-interface.tsx` - Main chat UI
- `components/data-room/qa-citation-card.tsx` - Clickable citation chips
- `components/data-room/qa-history-panel.tsx` - Query history sidebar
- `components/data-room/qa-feedback-controls.tsx` - Rating buttons
- `components/data-room/qa-document-preview.tsx` - PDF viewer with citation highlighting

**Performance Targets**:
- End-to-end query: <7 seconds (95th percentile)
- Vector retrieval: <300ms for 50K chunks
- Streaming start: <3 seconds
- Document processing: <2 seconds per 100 pages

**Monitoring** (see `lib/data-room/qa/analytics.sql`):
- Average & P95 latency metrics
- Abstention rate (target: <30%)
- Average citations per answer
- User feedback helpful rate
- Rate limit violations count
- Query failure rate by error type

**Usage Example**:
```typescript
import { executeQuery } from '@/lib/data-room/qa/query-service';

// Submit query
const result = await executeQuery(
  userId,
  dataRoomId,
  "What are the revenue projections for Q3 2024?",
  { stream: true }
);

// Result includes:
// - query_id
// - answer (streaming or complete)
// - answer_type ('grounded' | 'insufficient_evidence')
// - citations (array of document references)
// - metrics (total_time_ms, retrieval_time_ms, llm_time_ms)
```

**Key Files**:
- `lib/data-room/qa/query-service.ts` - Main orchestration logic
- `lib/data-room/qa/retrieval-service.ts` - Vector search (pgvector + cosine similarity)
- `lib/data-room/qa/document-chunker.ts` - Recursive character splitting (tiktoken)
- `lib/data-room/qa/embeddings-service.ts` - OpenAI ada-002 embeddings (1536 dims)
- `lib/data-room/qa/citation-generator.ts` - Citation extraction and linking
- `lib/data-room/qa/rate-limiter.ts` - Redis-based sliding window (Upstash)
- `lib/data-room/qa/analytics.sql` - Monitoring dashboard queries
- `types/data-room-qa.ts` - TypeScript types for all Q&A entities

**GDPR Compliance** (FR-022):
- Query export: JSON/CSV format with all user data
- Query deletion: Cascading delete (citations + feedback)
- User-specific RLS: Users only access their own queries

**Error Handling**:
- `INVALID_QUERY` - Question length validation (5-2000 chars)
- `RATE_LIMIT_EXCEEDED` - 60 queries/hour exceeded (includes retry_after_seconds)
- `PERMISSION_DENIED` - User not member of data room
- `LLM_TIMEOUT` - Temporary error, automatic retry attempted
- `INSUFFICIENT_EVIDENCE` - Not an error, abstention response

**Testing**:
- Contract tests: `tests/contract/data-room-qa-*.contract.test.ts` (4 files, 72 tests)
- E2E tests: `tests/e2e/data-room-qa-*.spec.ts` (3 files covering happy path, errors, edge cases)
- Performance tests: Validate <7s latency, <300ms retrieval

### Deal Hypothesis Tracker

**Location**: `lib/data-room/hypothesis/`, `app/api/data-room/hypotheses/`, `components/data-room/hypothesis/`

The Deal Hypothesis Tracker enables investment professionals to create, test, and validate deal hypotheses using AI-powered document analysis.

**Architecture**:
- **Repository** (`lib/data-room/repository/hypothesis-repository.ts`): Database operations for hypotheses, evidence, metrics, validations
- **AI Analyzer** (`lib/data-room/hypothesis/ai-analyzer.ts`): Claude Sonnet 3.5 for hypothesis-document matching
- **Evidence Extractor** (`lib/data-room/hypothesis/evidence-extractor.ts`): Vector search integration with Q&A system
- **State Management** (`lib/stores/hypothesis-store.ts`): Zustand store for client-side state

**Core Features**:
- **Hypothesis Management**: Create and track investment/acquisition hypotheses (revenue growth, cost synergy, market expansion, etc.)
- **AI Evidence Extraction**: Automatically find supporting/contradicting evidence in documents using vector search
- **Confidence Scoring**: Dynamic 0-100 scoring based on evidence strength, relevance, and metrics validation
- **Metrics Tracking**: Define and validate quantitative KPIs against hypothesis targets
- **Manual Validation**: Record formal validation decisions with evidence summaries

**API Endpoints**:
- `POST /api/data-room/hypotheses` - Create hypothesis
- `GET /api/data-room/hypotheses?data_room_id=xxx` - List hypotheses with filters
- `GET /api/data-room/hypotheses/[id]` - Get hypothesis with details
- `PATCH /api/data-room/hypotheses/[id]` - Update hypothesis
- `DELETE /api/data-room/hypotheses/[id]` - Soft delete hypothesis
- `POST /api/data-room/hypotheses/[id]/analyze` - Trigger AI document analysis
- `GET /api/data-room/hypotheses/[id]/evidence` - List evidence
- `POST /api/data-room/hypotheses/[id]/evidence` - Manually link evidence
- `GET /api/data-room/hypotheses/[id]/metrics` - List metrics
- `POST /api/data-room/hypotheses/[id]/metrics` - Add metric
- `POST /api/data-room/hypotheses/[id]/validate` - Record validation

**Database Tables** (see `supabase/migrations/20251031000002_deal_hypothesis_tracker.sql`):
- `hypotheses` - Main hypothesis entities with confidence scores
- `hypothesis_evidence` - Document evidence linking (supporting/contradicting/neutral)
- `hypothesis_metrics` - Quantitative KPIs for validation
- `hypothesis_validations` - Manual validation records with outcomes
- Automatic triggers update evidence counts, metrics counts, and confidence scores

**AI Pipeline**:
1. User creates hypothesis with title, description, and type
2. Trigger AI analysis on data room documents
3. Vector search finds relevant document chunks (reuses Q&A `document_chunks` table)
4. Claude Sonnet 3.5 classifies evidence type and extracts excerpts
5. Evidence automatically linked with relevance scores (0-100)
6. Confidence score calculated: 50% evidence ratio + 30% relevance + 20% metrics
7. User can manually validate with pass/fail/inconclusive status

**Confidence Calculation Formula**:
```
confidence = (
  0.5 * (supporting_evidence / total_evidence) +
  0.3 * (avg_relevance_score / 100) +
  0.2 * (metrics_met / total_metrics)
) * 100
```

**State Management**:
```typescript
import { useHypothesisStore } from '@/lib/stores/hypothesis-store';

// Access state
const { currentHypothesisId, hypothesisFilters, analysisProgress } = useHypothesisStore();

// Update state
const { setCurrentHypothesis, updateAnalysisProgress } = useHypothesisStore();
```

**Key Files**:
- `lib/data-room/types.ts` - TypeScript types (lines 706-963)
- `lib/data-room/repository/hypothesis-repository.ts` - Database operations
- `lib/data-room/hypothesis/ai-analyzer.ts` - AI analysis logic
- `lib/data-room/hypothesis/evidence-extractor.ts` - Vector search integration
- `lib/stores/hypothesis-store.ts` - Zustand state management
- `supabase/migrations/20251031000002_deal_hypothesis_tracker.sql` - Database schema

**Hypothesis Types**:
- `revenue_growth` - Revenue expansion potential
- `cost_synergy` - Cost reduction opportunities
- `market_expansion` - Market entry or expansion
- `tech_advantage` - Technology/IP value
- `team_quality` - Management/team strength
- `competitive_position` - Market positioning
- `operational_efficiency` - Process improvements
- `customer_acquisition` - Growth engine potential
- `custom` - User-defined

**Performance Targets**:
- Document analysis: <5s per document (95th percentile)
- Bulk analysis: 500ms delay between documents to avoid rate limits
- Confidence recalculation: <1s using database function
- Vector search: <300ms (inherits from Q&A system)

**Integration Points**:
- **Q&A Copilot**: Shares `document_chunks` table for vector search
- **Document Classifier**: Uses document types to prioritize analysis
- **Activity Logs**: Uses existing logging infrastructure
- **Access Control**: Inherits Data Room RLS policies

**Environment Variables**:
- `OPENROUTER_API_KEY` - Required for AI analysis (Claude Sonnet 3.5)

**Future Enhancements**:
- Hypothesis templates for common deal types
- Comparative analysis (compare multiple hypotheses)
- Time-series confidence tracking
- Collaborative validation with voting
- PDF export of validation reports

## Testing & Demo Access

### Demo Mode (Recommended for Testing)
**One-Click Demo Access:**
- Visit `/login` page 
- Click "Try Demo (No Registration)" button
- Instantly access full application with sample data
- Demo banner will appear indicating test mode
- No authentication required

### Manual Test Credentials (Alternative)
If you prefer manual login testing:
```
Email: demo@oppspot.com
Password: Demo123456!
```
- Creates actual test user in database
- Use command: `npm run demo-login` (CLI method)
- Or use credentials manually in login form

### Demo Features
- ✅ Full application access with sample business data
- ✅ Interactive dashboard with metrics and insights  
- ✅ Search functionality with demo results
- ✅ Map visualization with sample locations
- ✅ Business detail views and analytics
- ✅ Visual demo mode indicators
- ✅ Safe testing environment (no real data affected)

**Note**: Demo mode uses static sample data and disables certain destructive actions to protect the testing environment.

## Git & GitHub Configuration

### Git User Configuration
Current git configuration for this repository:
- **Name**: vik
- **Email**: hirendra.vikram@boardguru.ai

### GitHub Account
- **Account**: hvikram-ai
- **Repository**: https://github.com/hvikram-ai/oppspot

**Note**: GitHub CLI authentication may be required for operations like creating pull requests. Use `gh auth login` if needed.

## Deployment Information

### Production URLs
- **Vercel Project**: h-viks-projects/oppspot
- **Vercel Dashboard**: https://vercel.com/h-viks-projects/oppspot
- **Deployments**: https://vercel.com/h-viks-projects/oppspot/deployments
- **Custom Domain**: oppspot.ai (if configured)
- **Note**: OAuth uses `window.location.origin` dynamically - works with any deployment URL

### Deployment Platform
- **Hosting**: Vercel (automatic deployment on push to main branch)
- **Repository**: https://github.com/hvikram-ai/oppspot
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install --legacy-peer-deps`

### Authentication Configuration

#### Supabase Project
- **Project URL**: https://fuqdbewftdthbjfcecrz.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/fuqdbewftdthbjfcecrz

#### Google OAuth Setup
- **Google Cloud Project**: oppspot-auth
- **Client ID**: `263810366717-fq7h33gqehburgsmujusuudqfqkk67ch.apps.googleusercontent.com`
- **OAuth Callback**: `https://fuqdbewftdthbjfcecrz.supabase.co/auth/v1/callback`
- **Setup Guide**: See `GOOGLE_OAUTH_SETUP.md` for complete configuration

### Important URLs for OAuth Configuration
When configuring OAuth providers, use these URLs:

**Authorized JavaScript Origins:**
```
http://localhost:3000
http://localhost:3001
https://oppspot.ai
https://*.vercel.app
```

**Authorized Redirect URIs:**
```
https://fuqdbewftdthbjfcecrz.supabase.co/auth/v1/callback
http://localhost:3000/auth/callback
http://localhost:3001/auth/callback
https://oppspot.ai/auth/callback
https://*.vercel.app/auth/callback
```
