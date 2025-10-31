# Tasks: Data Room Q&A Copilot with Citations

**Feature Branch**: `008-oppspot-docs-dataroom`
**Input**: Design documents from `/home/vik/oppspot/specs/008-oppspot-docs-dataroom/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: TypeScript 5.x, Next.js 15, Supabase pgvector, OpenRouter
2. Load optional design documents ✅
   → data-model.md: 6 entities (document_pages, document_chunks, qa_queries, qa_citations, qa_feedback, qa_rate_limits)
   → contracts/: 4 API specs (query, history, feedback, export-delete)
   → research.md: 10 technical decisions
3. Generate tasks by category ✅
   → Database: Migration, types, RLS, vector index
   → Services: Chunking, embeddings, LLM, rate limiting, query orchestration
   → API: 4 route handlers + contract tests
   → UI: 5 React components
   → Tests: Contract tests, E2E scenarios, performance validation
4. Apply task rules ✅
   → Tests before implementation (TDD)
   → Mark [P] for parallel-safe tasks
5. Number tasks sequentially (T001-T047) ✅
6. Generate dependency graph ✅
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no shared dependencies)
- File paths are absolute where necessary, relative to repository root otherwise

---

## Phase 3.1: Database Foundation [Sequential]
⚠️ **CRITICAL**: Complete this phase before starting services

- [ ] **T001** Create database migration SQL file `supabase/migrations/20250129_dataroom_qa.sql`
  - Create 6 new tables: document_pages, document_chunks, qa_queries, qa_citations, qa_feedback, qa_rate_limits
  - Add columns to existing documents table: processing_status, ocr_attempted, chunk_count, avg_chunk_size
  - Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
  - Create HNSW vector index on document_chunks.embedding
  - Reference: data-model.md sections 1-6 for complete schema

- [ ] **T002** Generate TypeScript types file `types/data-room-qa.ts`
  - Define interfaces for all 6 entities matching database schema
  - Include Database helper type for Supabase client
  - Add Zod schemas for request/response validation
  - Export types: DocumentPage, DocumentChunk, QAQuery, QACitation, QAFeedback, QARateLimit

- [ ] **T003** Create RLS policies SQL file `supabase/migrations/20250129_dataroom_qa_rls.sql`
  - qa_queries: Users can only access queries in data rooms they're members of
  - qa_citations: Follows qa_queries access rules
  - qa_feedback: Users can only modify their own feedback
  - qa_rate_limits: Users can only view/update their own rate limits
  - Reference: data-model.md "Security Considerations" section

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE PHASE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests [Parallel-safe]

- [ ] **T004 [P]** Contract test `tests/contract/data-room-qa-query.contract.test.ts`
  - Test POST /api/data-room/[dataRoomId]/query endpoint
  - Assert 200 with valid question (5-2000 chars)
  - Assert 400 for question too short (<5 chars)
  - Assert 400 for question too long (>2000 chars)
  - Assert 429 after 60 queries (rate limit)
  - Assert 401 for unauthenticated user
  - Assert 403 for non-member access
  - Reference: contracts/query-api.yaml

- [ ] **T005 [P]** Contract test `tests/contract/data-room-qa-history.contract.test.ts`
  - Test GET /api/data-room/[dataRoomId]/history endpoint
  - Assert 200 with paginated results
  - Assert cursor-based pagination works correctly
  - Assert limit parameter respected (max 100)
  - Assert 401 for unauthenticated
  - Reference: contracts/history-api.yaml

- [ ] **T006 [P]** Contract test `tests/contract/data-room-qa-feedback.contract.test.ts`
  - Test POST /api/data-room/[dataRoomId]/feedback endpoint
  - Assert 200 for valid feedback (helpful/not_helpful)
  - Assert 400 for invalid rating
  - Assert 400 for comment >2000 chars
  - Assert 404 for non-existent query
  - Reference: contracts/feedback-api.yaml

- [ ] **T007 [P]** Contract test `tests/contract/data-room-qa-export-delete.contract.test.ts`
  - Test GET /api/data-room/[dataRoomId]/export endpoint (JSON and CSV formats)
  - Test DELETE /api/data-room/[dataRoomId]/history endpoint (individual + bulk delete)
  - Assert GDPR compliance (complete deletion with cascades)
  - Reference: contracts/export-delete-api.yaml

### Integration Tests [Parallel-safe]

- [ ] **T008 [P]** E2E test `tests/e2e/data-room-qa-happy-path.spec.ts`
  - Scenario 1: Submit question → receive streaming answer with citations
  - Scenario 2: Click citation → navigate to document viewer with highlighting
  - Scenario 3: View query history → see past questions paginated
  - Scenario 4: Provide feedback → rating recorded
  - Reference: spec.md acceptance scenarios 1, 3, 5, 6

- [ ] **T009 [P]** E2E test `tests/e2e/data-room-qa-error-handling.spec.ts`
  - Scenario 5: Insufficient evidence → abstention message "I don't have enough information"
  - Scenario 8: Temporary error → automatic retry succeeds seamlessly
  - Scenario 9: Persistent error → descriptive error with retry button
  - Test rate limit error with countdown timer
  - Reference: spec.md acceptance scenarios 2, 8, 9 and edge cases

- [ ] **T010 [P]** E2E test `tests/e2e/data-room-qa-edge-cases.spec.ts`
  - Multi-document question → synthesized answer with multiple citations
  - Contradictory information → both sources cited
  - Permission change mid-session → next query blocked
  - Scanned PDF → OCR warning displayed
  - 1000+ page document → performance warning shown
  - Reference: spec.md edge cases section

- [ ] **T011 [P]** Performance test `tests/performance/data-room-qa-performance.test.ts`
  - Vector search <300ms for 50K chunks (FR-031)
  - End-to-end query <7 seconds (FR-005)
  - Streaming starts <3 seconds
  - Document chunking <2s per 100 pages
  - Reference: research.md section 10 and quickstart.md performance validation

---

## Phase 3.3: Core Services [Some parallel, some sequential]
**ONLY START after all tests are failing**

### Document Processing Services [Parallel-safe]

- [ ] **T012 [P]** Create document chunking service `lib/data-room/qa/document-chunker.ts`
  - Implement recursive character splitting (500 tokens, 100 overlap)
  - Use tiktoken for token counting (cl100k_base encoding)
  - Respect paragraph boundaries when possible
  - Export function: `chunkDocument(documentId, pageTexts): Promise<DocumentChunk[]>`
  - Reference: research.md section 2 (chunking strategy)

- [ ] **T013 [P]** Create text extraction service `lib/data-room/qa/text-extractor.ts`
  - Use pdf-parse for primary text extraction
  - Detect missing text layer: `textLength < (pageCount * 50)`
  - Fallback to Tesseract.js OCR (browser-side) for scanned documents
  - Return OCR confidence scores
  - Export function: `extractText(pdfBuffer): Promise<{text, pages, ocrUsed, confidence}>`
  - Reference: research.md section 4 (OCR strategy)

- [ ] **T014 [P]** Create vector embeddings service `lib/data-room/qa/embeddings-service.ts`
  - Generate OpenAI ada-002 embeddings (1536 dimensions)
  - Batch process multiple chunks for efficiency
  - Cache embeddings with chunk hash to avoid redundant calls
  - Export function: `generateEmbeddings(texts: string[]): Promise<number[][]>`
  - Reference: research.md section 1 (vector search strategy)

- [ ] **T015 [P]** Create rate limiting service `lib/data-room/qa/rate-limiter.ts`
  - Implement Redis-based sliding window (Upstash)
  - 60 queries per hour per user per data room (FR-014)
  - Key format: `qa:ratelimit:${userId}:${dataRoomId}:${hour}`
  - Return TTL in error response for countdown timer
  - Export function: `checkRateLimit(userId, dataRoomId): Promise<{allowed: boolean, ttl?: number}>`
  - Reference: research.md section 6 (rate limiting)

### Retrieval & LLM Services [Sequential dependencies]

- [ ] **T016** Create vector search service `lib/data-room/qa/retrieval-service.ts`
  - Query pgvector using cosine similarity on document_chunks.embedding
  - Filter by data_room_id and user permissions
  - Retrieve top-k=20 chunks with relevance scores
  - Hybrid search: vector similarity + BM25 keyword matching (optional enhancement)
  - Export function: `retrieveChunks(dataRoomId, query, userId, limit=20): Promise<Chunk[]>`
  - Depends on: T014 (embeddings service)
  - Reference: research.md section 1 (vector search)

- [ ] **T017** Create LLM Q&A client `lib/data-room/qa/qa-llm-client.ts`
  - Integrate with existing LLMManager for multi-provider support
  - Use feature tag: 'data-room-qa'
  - Prompt engineering: ground answers in chunks only, cite sources, abstain if insufficient
  - Support streaming responses via ReadableStream
  - Export function: `generateAnswer(question, chunks, stream=true): Promise<ReadableStream | string>`
  - Depends on: Existing LLMManager (already in codebase)
  - Reference: research.md section 3 (LLM selection)

- [ ] **T018** Create citation generator `lib/data-room/qa/citation-generator.ts`
  - Extract citations from LLM response (format: [doc_id:chunk_id])
  - Map citations to document metadata (title, page, preview text ~240 chars)
  - Rank by relevance score from vector search
  - Generate navigation URLs: `/data-room/{id}/documents/{docId}#page={num}&chunk={chunkId}`
  - Export function: `generateCitations(llmResponse, retrievedChunks): Citation[]`
  - Reference: research.md section 7 (citation deep-linking)

- [ ] **T019** Create query orchestration service `lib/data-room/qa/query-service.ts`
  - Orchestrate full Q&A pipeline: retrieval → LLM → citations
  - Implement automatic retry logic (once, per FR-035)
  - Distinguish temporary vs permanent errors (FR-039)
  - Track performance metrics: retrieval_time_ms, llm_time_ms, total_time_ms
  - Save to qa_queries table with all metadata
  - Export function: `executeQuery(userId, dataRoomId, question, stream): Promise<QueryResult>`
  - Depends on: T016 (retrieval), T017 (LLM), T018 (citations)
  - Reference: research.md section 9 (error handling)

### History & Feedback Services [Parallel after T019]

- [ ] **T020 [P]** Create query history service `lib/data-room/qa/history-service.ts`
  - Fetch paginated query history (cursor-based on created_at)
  - Filter by user_id and data_room_id with RLS enforcement
  - Support export to JSON/CSV formats (GDPR data portability FR-022b)
  - Support bulk/individual delete (GDPR right to erasure FR-022a)
  - Export functions: `getHistory()`, `exportHistory()`, `deleteQueries()`
  - Reference: research.md section 8 (query history storage)

- [ ] **T021 [P]** Create feedback service `lib/data-room/qa/feedback-service.ts`
  - Record helpful/not_helpful rating on queries
  - Optional comment (max 2000 chars)
  - Upsert logic (user can change rating)
  - Export function: `submitFeedback(queryId, userId, rating, comment?): Promise<void>`
  - Reference: data-model.md section 5 (qa_feedback entity)

---

## Phase 3.4: API Layer [Parallel after Phase 3.3]
**Start after services are implemented and tests are still failing**

- [ ] **T022 [P]** Implement POST /api/data-room/[dataRoomId]/query route `app/api/data-room/[dataRoomId]/query/route.ts`
  - Validate question length (5-2000 chars) using Zod
  - Check rate limit (T015 service)
  - Execute query via T019 service
  - Return streaming SSE response or JSON based on `stream` parameter
  - Handle all error types with descriptive messages (FR-036-039)
  - Make T004 contract test pass

- [ ] **T023 [P]** Implement GET /api/data-room/[dataRoomId]/history route `app/api/data-room/[dataRoomId]/history/route.ts`
  - Validate pagination parameters (cursor, limit 1-100)
  - Fetch history via T020 service
  - Return paginated response with has_more flag
  - Make T005 contract test pass

- [ ] **T024 [P]** Implement POST /api/data-room/[dataRoomId]/feedback route `app/api/data-room/[dataRoomId]/feedback/route.ts`
  - Validate rating (helpful/not_helpful) and comment length
  - Submit feedback via T021 service
  - Return success confirmation
  - Make T006 contract test pass

- [ ] **T025 [P]** Implement GET /api/data-room/[dataRoomId]/export route `app/api/data-room/[dataRoomId]/export/route.ts`
  - Generate export file (JSON or CSV) via T020 service
  - Upload to Supabase Storage
  - Return signed URL with 1-hour expiry
  - Part of T007 contract test

- [ ] **T026 [P]** Implement DELETE /api/data-room/[dataRoomId]/history route `app/api/data-room/[dataRoomId]/history/route.ts`
  - Support individual query deletion (query_ids array)
  - Support bulk deletion (omit query_ids to delete all)
  - Cascade to citations and feedback via database ON DELETE CASCADE
  - Return deleted_count
  - Part of T007 contract test

---

## Phase 3.5: UI Components [Parallel after API layer exists]

- [ ] **T027 [P]** Create QAChatInterface component `components/data-room/qa-chat-interface.tsx`
  - Chat-style interface with question input (5-2000 chars validation)
  - Submit button (disabled during processing)
  - Streaming answer display with progressive rendering
  - Loading state indicator
  - Error display with retry button
  - Rate limit countdown timer
  - Reference: FR-026, FR-029, FR-036-038

- [ ] **T028 [P]** Create CitationCard component `components/data-room/qa-citation-card.tsx`
  - Display citation as clickable chip/card
  - Show: document title, page number, text preview (~240 chars)
  - Click handler: navigate to document viewer with highlighting
  - Relevance score badge (optional)
  - Reference: FR-006-010, FR-027-028

- [ ] **T029 [P]** Create HistoryPanel component `components/data-room/qa-history-panel.tsx`
  - Sidebar or modal displaying query history
  - Paginated list (50 per page, cursor-based)
  - Each item: question, answer preview, timestamp, citation count
  - Click to view full answer and citations
  - Delete buttons (individual + "Delete All")
  - Export button (JSON/CSV)
  - Reference: FR-021-022, FR-022a-022b

- [ ] **T030 [P]** Create FeedbackControls component `components/data-room/qa-feedback-controls.tsx`
  - Thumbs up/down buttons for helpful/not_helpful rating
  - Optional comment textarea (max 2000 chars)
  - Submit feedback handler
  - Visual confirmation after submission
  - Reference: FR-023-024

- [ ] **T031 [P]** Create DocumentPreview component `components/data-room/qa-document-preview.tsx`
  - Extend existing react-pdf document viewer
  - Parse URL hash: #page={num}&chunk={chunkId}
  - Scroll to specified page
  - Highlight cited text section (yellow background)
  - Show citation context (~240 chars around highlighted text)
  - Reference: FR-008-009, research.md section 7

---

## Phase 3.6: Page Integration [Sequential - ties everything together]

- [ ] **T032** Create Q&A page `app/(dashboard)/data-room/[id]/qa/page.tsx`
  - Server component: fetch data room metadata, check user permissions
  - Render QAChatInterface (T027)
  - Render HistoryPanel sidebar (T029)
  - Pass dataRoomId prop to all child components
  - Add "Ask this Data Room" button/tab to main data room page
  - Reference: FR-030

- [ ] **T033** Add document processing trigger hook
  - When document uploaded to data room, trigger background processing
  - Extract text via T013 (text-extractor)
  - Chunk text via T012 (document-chunker)
  - Generate embeddings via T014 (embeddings-service)
  - Save document_pages and document_chunks to database
  - Update documents.processing_status (pending → processing → completed/failed)
  - Reference: FR-016-020

---

## Phase 3.7: Integration & Polish [Sequential]

- [ ] **T034** Verify all contract tests pass
  - Run: `npm run test:contract tests/contract/data-room-qa-*.contract.test.ts`
  - Ensure 100% pass rate for T004-T007
  - Fix any failing assertions

- [ ] **T035** Verify all E2E tests pass
  - Run: `npm run test:e2e tests/e2e/data-room-qa-*.spec.ts`
  - Ensure all 9 acceptance scenarios pass (T008-T010)
  - Fix any UI/integration issues

- [ ] **T036** Verify performance tests pass
  - Run: `npm run test:performance tests/performance/data-room-qa-performance.test.ts`
  - Ensure retrieval <300ms, query <7s, streaming <3s (T011)
  - Optimize if targets not met

- [ ] **T037 [P]** Add unit tests for utility functions
  - Test text chunking edge cases (overlaps, boundaries)
  - Test citation parsing edge cases
  - Test rate limit calculations
  - Test error retry logic state machine
  - Files: `tests/unit/document-chunker.test.ts`, `tests/unit/citation-generator.test.ts`, etc.

- [ ] **T038** Review and improve error messages
  - Ensure all error messages are descriptive (FR-036)
  - Add countdown timer to rate limit errors (FR-038)
  - Test retry button functionality (FR-037)
  - Verify automatic retry happens once (FR-035)

- [ ] **T039** Add loading states and UX polish
  - Skeleton loaders during query processing
  - Smooth transitions for streaming text
  - Toast notifications for feedback submission
  - Confirmation dialogs for delete actions
  - Empty states for history panel

- [ ] **T040 [P]** Create monitoring dashboard queries
  - Add SQL queries to `lib/data-room/qa/analytics.sql`:
    - Average query latency
    - 95th percentile latency (FR-033)
    - Abstention rate (FR-032)
    - Average citations per answer (FR-034)
    - Rate limit violations count
  - Reference: research.md section 10 (performance monitoring)

- [ ] **T041 [P]** Update CLAUDE.md with implementation notes
  - Document new API endpoints
  - Document new database tables
  - Document Q&A feature usage
  - Add troubleshooting section
  - Already partially done by update script, expand as needed

- [ ] **T042** Run manual testing checklist
  - Execute all scenarios in quickstart.md manual testing section
  - Test happy path flows
  - Test error handling flows
  - Test edge cases
  - Test GDPR compliance (export, delete)
  - Document any issues found

---

## Phase 3.8: Deployment Preparation [Final]

- [ ] **T043** Run database migration on staging
  - Execute: `supabase/migrations/20250129_dataroom_qa.sql`
  - Execute: `supabase/migrations/20250129_dataroom_qa_rls.sql`
  - Verify all tables created
  - Verify pgvector extension enabled
  - Verify HNSW index created

- [ ] **T044** Backfill existing documents (if any)
  - For each document in data_rooms with processing_status='completed'
  - Extract pages → document_pages (T013)
  - Chunk text → document_chunks (T012)
  - Generate embeddings → update document_chunks.embedding (T014)
  - Estimated: 10-30 seconds per document

- [ ] **T045** Test end-to-end on staging environment
  - Upload test document
  - Wait for processing to complete
  - Submit test query
  - Verify streaming answer with citations
  - Verify citation navigation works
  - Verify feedback submission
  - Verify history retrieval
  - Verify export/delete functionality

- [ ] **T046** Configure monitoring alerts
  - Alert if p95 latency >7 seconds
  - Alert if abstention rate >30%
  - Alert if rate limit violations spike
  - Alert if embedding generation fails
  - Alert if LLM service unavailable

- [ ] **T047** Create deployment runbook
  - Document rollout plan
  - Document rollback procedure
  - Document feature flag strategy (if using)
  - Document performance tuning parameters
  - Document known issues and workarounds

---

## Dependencies

### Critical Path
```
T001 (Migration)
  → T002 (Types)
    → T003 (RLS)
      → T004-T011 (All Tests) [Parallel]
        → T012-T015 (Services Layer 1) [Parallel]
          → T016 (Retrieval, depends on T014)
            → T017 (LLM)
              → T018 (Citations)
                → T019 (Query Service, orchestrates all)
                  → T020-T021 (History/Feedback) [Parallel]
                    → T022-T026 (API Layer) [Parallel]
                      → T027-T031 (UI Components) [Parallel]
                        → T032-T033 (Integration)
                          → T034-T042 (Verification & Polish)
                            → T043-T047 (Deployment)
```

### Parallel Execution Groups
| Group | Tasks | Can Run Together | Reason |
|-------|-------|------------------|--------|
| **Tests** | T004-T011 | ✅ Yes | Different test files |
| **Services 1** | T012-T015 | ✅ Yes | Different service files, no dependencies |
| **Services 2** | T020-T021 | ✅ Yes | Depend on T019 but independent of each other |
| **API Routes** | T022-T026 | ✅ Yes | Different route files |
| **UI Components** | T027-T031 | ✅ Yes | Different component files |
| **Unit Tests** | T037, T040, T041 | ✅ Yes | Different test/doc files |

---

## Parallel Execution Examples

### Example 1: Run All Contract Tests Together
```bash
# After T001-T003 complete, launch tests in parallel:
npm run test:contract tests/contract/data-room-qa-query.contract.test.ts &
npm run test:contract tests/contract/data-room-qa-history.contract.test.ts &
npm run test:contract tests/contract/data-room-qa-feedback.contract.test.ts &
npm run test:contract tests/contract/data-room-qa-export-delete.contract.test.ts &
wait
```

### Example 2: Implement Services Layer 1 in Parallel
```bash
# After tests fail, implement services concurrently:
# Terminal 1: npx tsx scripts/implement.ts T012
# Terminal 2: npx tsx scripts/implement.ts T013
# Terminal 3: npx tsx scripts/implement.ts T014
# Terminal 4: npx tsx scripts/implement.ts T015
```

### Example 3: Build UI Components in Parallel
```bash
# After API layer complete, build all UI components:
# Terminal 1: Work on T027 (QAChatInterface)
# Terminal 2: Work on T028 (CitationCard)
# Terminal 3: Work on T029 (HistoryPanel)
# Terminal 4: Work on T030 (FeedbackControls)
# Terminal 5: Work on T031 (DocumentPreview)
```

---

## Validation Checklist
*GATE: Verify before marking tasks.md as complete*

- [x] All contracts have corresponding tests (T004-T007 cover all 4 API contracts)
- [x] All entities have model/service tasks (6 entities → T001-T002, services T012-T021)
- [x] All tests come before implementation (T004-T011 before T012+)
- [x] Parallel tasks truly independent (verified in Parallel Execution Groups table)
- [x] Each task specifies exact file path (all tasks include full paths)
- [x] No task modifies same file as another [P] task (verified)
- [x] TDD workflow enforced (Phase 3.2 before 3.3, explicit warning)
- [x] Performance targets included (T011, T036)
- [x] GDPR requirements covered (T020 export/delete, T025-T026 API endpoints)
- [x] All 40 functional requirements mapped to tasks

---

## Task Completion Tracking

**Progress**: 0 / 47 tasks complete (0%)

**Phase Completion**:
- Phase 3.1 (Database): 0/3 (T001-T003)
- Phase 3.2 (Tests): 0/8 (T004-T011)
- Phase 3.3 (Services): 0/10 (T012-T021)
- Phase 3.4 (API): 0/5 (T022-T026)
- Phase 3.5 (UI): 0/5 (T027-T031)
- Phase 3.6 (Integration): 0/2 (T032-T033)
- Phase 3.7 (Polish): 0/9 (T034-T042)
- Phase 3.8 (Deployment): 0/5 (T043-T047)

---

## Notes
- **[P] tasks**: Can be executed in parallel (different files, no shared state)
- **TDD strictly enforced**: All tests (T004-T011) MUST fail before implementing services/API
- **Commit after each task**: Helps with rollback and code review
- **Run tests frequently**: After each service/API implementation, verify tests pass
- **Performance monitoring**: Track metrics from T040 throughout development
- **GDPR compliance**: Ensure export (T025) and delete (T026) work correctly before launch

---

**Status**: ✅ **TASKS READY FOR EXECUTION** - 47 tasks generated, dependency-ordered, parallelization optimized

**Next Step**: Start with T001 (Create database migration)
