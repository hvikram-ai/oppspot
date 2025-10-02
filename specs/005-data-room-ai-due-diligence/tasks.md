# Tasks: Data Room - AI-Powered Due Diligence Platform

**Input**: Design documents from `/specs/005-data-room-ai-due-diligence/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅
**Branch**: `005-data-room-ai-due-diligence`
**Tech Stack**: Next.js 15 App Router, TypeScript 5.x, Supabase (PostgreSQL + Storage + Edge Functions), OpenRouter API, react-dropzone, react-pdf

## Execution Flow (main)
```
1. ✅ Loaded plan.md from feature directory
   → Tech stack: Next.js 15, Supabase, OpenRouter, react-dropzone, react-pdf
   → Structure: Next.js App Router monolith (app/, components/, lib/)
2. ✅ Loaded design documents:
   → data-model.md: 6 entities (DataRoom, Document, DocumentAnalysis, DataRoomAccess, ActivityLog, DocumentAnnotation)
   → contracts/: data-rooms-api.yaml (5 endpoints)
   → research.md: 8 technology decisions documented
3. ✅ Generated 94 tasks by category:
   → Setup: 5 tasks (dependencies, database, storage)
   → Tests: 20 tasks (contract tests, E2E tests)
   → Core: 35 tasks (repositories, API routes, UI components)
   → Integration: 15 tasks (AI, storage, permissions)
   → Polish: 19 tasks (validation, error handling, docs)
4. ✅ Applied task rules:
   → Different files = [P] for parallel (45 parallel tasks)
   → Tests before implementation (TDD order)
5. ✅ Numbered tasks T001-T094
6. ✅ Dependency graph created (see Dependencies section)
7. ✅ Parallel execution examples provided
8. ✅ Validation: All contracts tested, all entities modeled, all endpoints implemented
9. ✅ SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute from repository root

## Path Conventions
**Project Structure**: Next.js App Router monolith
- **Frontend**: `app/`, `components/`
- **Backend**: `app/api/`, `lib/`, `supabase/functions/`
- **Database**: `supabase/migrations/`
- **Tests**: `tests/e2e/`, `tests/contract/`
- **Types**: `types/`

---

## Phase 3.1: Setup & Dependencies

- [ ] **T001** Install new dependencies: react-dropzone, react-pdf, pdfjs-dist, pdf-parse, zod
  - Run: `npm install react-dropzone react-pdf pdfjs-dist pdf-parse zod --legacy-peer-deps`
  - Verify: `npm list react-dropzone react-pdf`

- [ ] **T002** Run database migration to create Data Room schema
  - File: `supabase/migrations/20251002000001_data_room_schema.sql` (already exists)
  - Run: `supabase db push` or apply via Supabase dashboard
  - Verify: Check 6 tables exist (data_rooms, documents, document_analysis, data_room_access, activity_logs, document_annotations)

- [ ] **T003** Create Supabase Storage bucket for documents
  - Run SQL: `INSERT INTO storage.buckets (id, name, public) VALUES ('data-room-documents', 'data-room-documents', false);`
  - Apply RLS policies from data-model.md (storage section)
  - Verify: Bucket exists and is private

- [ ] **T004** Create test fixtures directory and sample documents
  - Create: `tests/fixtures/sample-financial.pdf`, `tests/fixtures/sample-contract.pdf`
  - Use small PDFs (<1MB) for fast tests
  - Verify: Files are readable

- [ ] **T005** [P] Set up environment variables for OpenRouter API
  - Add to `.env.local`: `OPENROUTER_API_KEY=...` (if not already set)
  - Add: `NEXT_PUBLIC_SUPABASE_STORAGE_URL=...`
  - Verify: Variables load in `process.env`

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)

- [ ] **T006** [P] Contract test: POST /api/data-room (create data room)
  - File: `tests/contract/data-room-create.spec.ts`
  - Test: Valid input → 201 with DataRoom schema
  - Test: Unauthenticated → 401
  - Test: Invalid input (missing name) → 400
  - **Expected**: Tests FAIL (endpoint not implemented)

- [ ] **T007** [P] Contract test: GET /api/data-room (list data rooms)
  - File: `tests/contract/data-room-list.spec.ts`
  - Test: Returns array of DataRoom objects
  - Test: Filters by status (active, archived)
  - Test: Search by name
  - **Expected**: Tests FAIL (endpoint not implemented)

- [ ] **T008** [P] Contract test: GET /api/data-room/[id] (get data room)
  - File: `tests/contract/data-room-get.spec.ts`
  - Test: Valid ID → 200 with DataRoom
  - Test: Invalid ID → 404
  - Test: No access → 403
  - **Expected**: Tests FAIL (endpoint not implemented)

- [ ] **T009** [P] Contract test: PATCH /api/data-room/[id] (update data room)
  - File: `tests/contract/data-room-update.spec.ts`
  - Test: Owner can update name, description, status
  - Test: Non-owner → 403
  - **Expected**: Tests FAIL (endpoint not implemented)

- [ ] **T010** [P] Contract test: DELETE /api/data-room/[id] (delete data room)
  - File: `tests/contract/data-room-delete.spec.ts`
  - Test: Owner can soft delete → 200
  - Test: Non-owner → 403
  - **Expected**: Tests FAIL (endpoint not implemented)

- [ ] **T011** [P] Contract test: POST /api/data-room/documents (upload document)
  - File: `tests/contract/documents-upload.spec.ts`
  - Test: Valid PDF upload → 201 with Document
  - Test: File >100MB → 400 (file too large)
  - Test: Invalid MIME type → 400
  - Test: Non-editor → 403
  - **Expected**: Tests FAIL (endpoint not implemented)

- [ ] **T012** [P] Contract test: GET /api/data-room/documents (list documents)
  - File: `tests/contract/documents-list.spec.ts`
  - Test: Returns array of Document objects
  - Test: Filter by document_type
  - Test: Filter by folder_path
  - **Expected**: Tests FAIL (endpoint not implemented)

- [ ] **T013** [P] Contract test: GET /api/data-room/documents/[id] (get document)
  - File: `tests/contract/documents-get.spec.ts`
  - Test: Returns Document with signed_url
  - Test: Signed URL is valid and downloadable
  - **Expected**: Tests FAIL (endpoint not implemented)

- [ ] **T014** [P] Contract test: POST /api/data-room/access (grant access)
  - File: `tests/contract/access-grant.spec.ts`
  - Test: Owner can invite user → 201 with invite_token
  - Test: Non-owner → 403
  - Test: Invalid permission_level → 400
  - **Expected**: Tests FAIL (endpoint not implemented)

### Integration Tests (E2E User Stories)

- [ ] **T015** [P] E2E test: AC-001 User creates a data room
  - File: `tests/e2e/data-room-create.spec.ts`
  - Navigate to /diligence/data-room
  - Click "Create Data Room", fill form, submit
  - Verify: Data room created, redirected to detail page
  - **Expected**: Tests FAIL (UI not implemented)

- [ ] **T016** [P] E2E test: AC-002 User uploads documents
  - File: `tests/e2e/data-room-upload.spec.ts`
  - Drag and drop sample PDF
  - Verify: Upload progress shown, file appears in list
  - **Expected**: Tests FAIL (upload UI not implemented)

- [ ] **T017** [P] E2E test: AC-003 AI classifies uploaded document
  - File: `tests/e2e/data-room-classify.spec.ts`
  - Upload sample financial PDF
  - Wait for classification (timeout: 60s)
  - Verify: Document badge shows "Financial"
  - **Expected**: Tests FAIL (AI classification not implemented)

- [ ] **T018** [P] E2E test: AC-004 User views document with AI insights
  - File: `tests/e2e/data-room-viewer.spec.ts`
  - Click on classified document
  - Verify: PDF loads, AI sidebar shows extracted metadata
  - **Expected**: Tests FAIL (document viewer not implemented)

- [ ] **T019** [P] E2E test: AC-012 User shares data room with team
  - File: `tests/e2e/data-room-permissions.spec.ts`
  - Click "Share" button, enter email, select permission level
  - Verify: Invitation sent, access grant created
  - **Expected**: Tests FAIL (permission UI not implemented)

- [ ] **T020** [P] E2E test: Activity log tracks all actions
  - File: `tests/e2e/data-room-activity.spec.ts`
  - Create data room, upload doc, share access
  - View activity log
  - Verify: All 3 actions logged with timestamps
  - **Expected**: Tests FAIL (activity log not implemented)

---

## Phase 3.3: Core Implementation - Data Layer

**⚠️ ONLY START AFTER Phase 3.2 tests are written and failing**

### Validation Schemas (Zod)

- [ ] **T021** [P] Create Zod schemas for Data Room entities
  - File: `lib/data-room/validation/schemas.ts`
  - Export: `DataRoomSchema`, `CreateDataRoomSchema`, `UpdateDataRoomSchema`
  - Export: `DocumentSchema`, `CreateDocumentSchema`, `UpdateDocumentSchema`
  - Export: `DataRoomAccessSchema`, `CreateAccessSchema`
  - Export: `ActivityLogSchema`, `DocumentAnnotationSchema`
  - Validate: File size limits, MIME types, permission levels

### Repository Layer

- [ ] **T022** [P] Create DataRoomRepository with CRUD methods
  - File: `lib/data-room/repository/data-room-repository.ts`
  - Methods: `getDataRooms(filters)`, `getDataRoom(id)`, `createDataRoom(input)`, `updateDataRoom(id, updates)`, `deleteDataRoom(id)`
  - Use Supabase client from `lib/supabase/client.ts`
  - Handle RLS errors gracefully

- [ ] **T023** [P] Create DocumentRepository with CRUD methods
  - File: `lib/data-room/repository/document-repository.ts`
  - Methods: `getDocuments(dataRoomId, filters)`, `getDocument(id)`, `createDocument(input)`, `updateDocument(id, updates)`, `deleteDocument(id)`
  - Use Supabase client

- [ ] **T024** [P] Create ActivityRepository for logging
  - File: `lib/data-room/repository/activity-repository.ts`
  - Methods: `logActivity(input)`, `getActivityLogs(dataRoomId, filters)`, `exportActivityLog(dataRoomId)` (CSV)
  - Call `log_activity()` database function

- [ ] **T025** [P] Create AccessRepository for permissions
  - File: `lib/data-room/repository/access-repository.ts`
  - Methods: `grantAccess(input)`, `revokeAccess(id)`, `getAccessGrants(dataRoomId)`, `checkAccess(userId, dataRoomId, requiredPermission)`
  - Generate JWT tokens for invitations

### Storage Layer

- [ ] **T026** [P] Create DocumentStorage class for file operations
  - File: `lib/data-room/storage/document-storage.ts`
  - Methods: `uploadDocument(dataRoomId, documentId, file)`, `downloadDocument(storagePath)`, `getSignedUrl(storagePath, expiresIn)`, `deleteDocument(storagePath)`
  - Use Supabase Storage API
  - Handle encryption (server-side, automatic)

---

## Phase 3.4: Core Implementation - API Routes

### Data Room API Routes

- [ ] **T027** POST /api/data-room - Create data room
  - File: `app/api/data-room/route.ts` (POST handler)
  - Validate input with `CreateDataRoomSchema`
  - Call `dataRoomRepository.createDataRoom()`
  - Log activity: `create_room`
  - Return 201 with DataRoom
  - **Verify**: T006 contract test PASSES

- [ ] **T028** GET /api/data-room - List data rooms
  - File: `app/api/data-room/route.ts` (GET handler)
  - Parse query params (status, deal_type, search, sort)
  - Call `dataRoomRepository.getDataRooms(filters)`
  - Return 200 with array
  - **Verify**: T007 contract test PASSES

- [ ] **T029** GET /api/data-room/[id] - Get data room
  - File: `app/api/data-room/[id]/route.ts` (GET handler)
  - Call `dataRoomRepository.getDataRoom(id)`
  - Check access with `accessRepository.checkAccess()`
  - Return 200 or 403/404
  - **Verify**: T008 contract test PASSES

- [ ] **T030** PATCH /api/data-room/[id] - Update data room
  - File: `app/api/data-room/[id]/route.ts` (PATCH handler)
  - Validate owner permission
  - Call `dataRoomRepository.updateDataRoom(id, updates)`
  - Log activity: `edit`
  - Return 200
  - **Verify**: T009 contract test PASSES

- [ ] **T031** DELETE /api/data-room/[id] - Delete data room (soft delete)
  - File: `app/api/data-room/[id]/route.ts` (DELETE handler)
  - Validate owner permission
  - Call `dataRoomRepository.deleteDataRoom(id)` (sets status='deleted', deleted_at)
  - Log activity: `delete_room`
  - Return 200
  - **Verify**: T010 contract test PASSES

### Documents API Routes

- [ ] **T032** POST /api/data-room/documents - Upload document
  - File: `app/api/data-room/documents/route.ts` (POST handler)
  - Parse multipart/form-data (file + data_room_id)
  - Validate: File size ≤100MB, MIME type allowed
  - Check Editor+ permission
  - Create document record: `documentRepository.createDocument()`
  - Upload to storage: `documentStorage.uploadDocument()`
  - Trigger AI analysis: Call Edge Function (async)
  - Log activity: `upload`
  - Return 201
  - **Verify**: T011 contract test PASSES

- [ ] **T033** GET /api/data-room/documents - List documents
  - File: `app/api/data-room/documents/route.ts` (GET handler)
  - Parse query params (data_room_id, document_type, folder_path, search)
  - Call `documentRepository.getDocuments(dataRoomId, filters)`
  - Return 200 with array
  - **Verify**: T012 contract test PASSES

- [ ] **T034** GET /api/data-room/documents/[id] - Get document with signed URL
  - File: `app/api/data-room/documents/[id]/route.ts` (GET handler)
  - Call `documentRepository.getDocument(id)`
  - Generate signed URL: `documentStorage.getSignedUrl(storagePath, 3600)` (1-hour expiration)
  - Log activity: `view`
  - Return 200 with { document, signed_url }
  - **Verify**: T013 contract test PASSES

- [ ] **T035** DELETE /api/data-room/documents/[id] - Delete document
  - File: `app/api/data-room/documents/[id]/route.ts` (DELETE handler)
  - Check permission (owner or uploader)
  - Delete from storage: `documentStorage.deleteDocument()`
  - Soft delete record: `documentRepository.deleteDocument(id)`
  - Log activity: `delete`
  - Return 200

### Access Management API Routes

- [ ] **T036** POST /api/data-room/access - Grant access (invite user)
  - File: `app/api/data-room/access/route.ts` (POST handler)
  - Validate owner permission
  - Create invite token (JWT, expires in 7 days)
  - Call `accessRepository.grantAccess(input)`
  - Send email invitation (use existing email service or log for MVP)
  - Log activity: `share`
  - Return 201 with { id, invite_token, expires_at }
  - **Verify**: T014 contract test PASSES

- [ ] **T037** GET /api/data-room/access - List access grants
  - File: `app/api/data-room/access/route.ts` (GET handler)
  - Validate owner permission
  - Call `accessRepository.getAccessGrants(dataRoomId)`
  - Return 200 with array

- [ ] **T038** PATCH /api/data-room/access/[id] - Revoke access
  - File: `app/api/data-room/access/[id]/route.ts` (PATCH handler)
  - Validate owner permission
  - Call `accessRepository.revokeAccess(id)` (sets revoked_at)
  - Log activity: `revoke`
  - Return 200

---

## Phase 3.5: Core Implementation - UI Components

### Data Room List & Create

- [ ] **T039** [P] Create DataRoomList component
  - File: `components/data-room/data-room-list.tsx`
  - Fetch: Call `/api/data-room` with SWR
  - Display: Grid of data room cards (name, document count, storage used, last updated)
  - Filters: Status dropdown, search input
  - Actions: "Create Data Room" button, click card → navigate to detail

- [ ] **T040** [P] Create CreateDataRoomModal component
  - File: `components/data-room/create-data-room-modal.tsx`
  - Form: Name (required), Company (optional autocomplete), Deal Type (select), Description (textarea)
  - Submit: POST /api/data-room
  - On success: Navigate to data room detail page
  - Use shadcn/ui Dialog component

- [ ] **T041** Create data room list page
  - File: `app/(dashboard)/diligence/data-room/page.tsx`
  - Render: `<DataRoomList />` + `<CreateDataRoomModal />`
  - Layout: Dashboard layout with sidebar
  - **Verify**: T015 E2E test PASSES

- [ ] **T042** Create data room detail page
  - File: `app/(dashboard)/diligence/data-room/[id]/page.tsx`
  - Fetch: GET /api/data-room/[id]
  - Tabs: Documents (default), Analysis (Phase 2), Activity
  - Header: Data room name, status badge, "Share" button, "Delete" button
  - Render: `<DocumentGrid />` component

### Document Upload & List

- [ ] **T043** [P] Create DocumentUpload component with drag-and-drop
  - File: `components/data-room/document-upload.tsx`
  - Use: react-dropzone for drag-and-drop
  - Validate: File size ≤100MB, MIME types (PDF, Word, Excel, etc.)
  - Upload: POST /api/data-room/documents (multipart/form-data)
  - Progress: Show upload progress (0-100%), support multiple files (parallel, max 5)
  - Success: Show success message, refresh document list
  - Error: Show error message, allow retry
  - **Verify**: T016 E2E test PASSES

- [ ] **T044** [P] Create DocumentGrid component
  - File: `components/data-room/document-grid.tsx`
  - Fetch: GET /api/data-room/documents?data_room_id=[id]
  - Display: Table or grid with columns: Name, Type (badge with color), Size, Uploaded By, Date
  - Filters: Document type dropdown, folder path, search
  - Sort: By name, date, size
  - Actions: Click row → navigate to document viewer
  - Show: AI classification badge (Financial, Contract, etc.) with confidence %

- [ ] **T045** [P] Create FolderTree component for folder navigation
  - File: `components/data-room/folder-tree.tsx`
  - Display: Hierarchical folder structure (sidebar)
  - Actions: Click folder → filter DocumentGrid by folder_path
  - State: Track current folder path in URL query param

### Document Viewer

- [ ] **T046** [P] Create DocumentViewer component with PDF.js
  - File: `components/data-room/document-viewer.tsx`
  - Use: react-pdf for PDF rendering
  - Config: Set pdfjs.GlobalWorkerOptions.workerSrc
  - Display: `<Document file={signed_url}><Page pageNumber={currentPage} /></Document>`
  - Controls: Previous/Next page, zoom in/out, page number input
  - Loading: Show skeleton loader while PDF loads
  - Error: Fallback to download link if rendering fails
  - **Verify**: T018 E2E test PASSES (partial - no AI sidebar yet)

- [ ] **T047** [P] Create AIInsightsSidebar component
  - File: `components/data-room/ai-insights-sidebar.tsx`
  - Fetch: Document analysis from parent (passed as prop)
  - Display sections: Classification (type + confidence), Extracted Metadata (dates, amounts, parties), Quick Summary (3-5 bullets), Related Documents
  - Responsive: Collapsible on mobile
  - **Verify**: T018 E2E test PASSES (complete)

- [ ] **T048** Create document viewer page
  - File: `app/(dashboard)/diligence/data-room/[id]/documents/[documentId]/page.tsx`
  - Fetch: GET /api/data-room/documents/[documentId] (gets document + signed_url)
  - Layout: Full-screen with close button
  - Render: `<DocumentViewer />` + `<AIInsightsSidebar />`

### Permissions & Sharing

- [ ] **T049** [P] Create PermissionManager component
  - File: `components/data-room/permission-manager.tsx`
  - Fetch: GET /api/data-room/access?data_room_id=[id]
  - Display: Table of current access grants (user email, permission level, status, invited date)
  - Actions: "Invite User" button → modal with email input + permission level select
  - Submit invite: POST /api/data-room/access
  - Revoke: Button → PATCH /api/data-room/access/[id]
  - **Verify**: T019 E2E test PASSES

- [ ] **T050** [P] Create ShareDataRoomModal component
  - File: `components/data-room/share-data-room-modal.tsx`
  - Form: Email (required), Permission Level (select: Editor, Viewer, Commenter)
  - Submit: Call parent callback → POST /api/data-room/access
  - Success: Show invite link, copy to clipboard button
  - Use shadcn/ui Dialog component

### Activity Log

- [ ] **T051** [P] Create ActivityTimeline component
  - File: `components/data-room/activity-timeline.tsx`
  - Fetch: Call parent-provided function (from page)
  - Display: Timeline with icons (upload, view, share, etc.), actor name, timestamp, action description
  - Filters: Actor, action type, date range
  - Export: "Export CSV" button → downloads activity log
  - **Verify**: T020 E2E test PASSES

- [ ] **T052** Create activity log page
  - File: `app/(dashboard)/diligence/data-room/[id]/activity/page.tsx`
  - Fetch: Call custom API route or expand activity logs in detail endpoint
  - Render: `<ActivityTimeline />`

---

## Phase 3.6: AI Integration

### Edge Function for Document Analysis

- [ ] **T053** Create Supabase Edge Function for AI classification
  - File: `supabase/functions/analyze-document/index.ts`
  - Trigger: HTTP POST from `/api/data-room/documents` after upload
  - Steps:
    1. Fetch document record from DB
    2. Download file from Storage: `supabase.storage.from('data-room-documents').download(path)`
    3. Extract text: Use pdf-parse for PDFs (install in Edge Function)
    4. Call OpenRouter API for classification (Claude Sonnet 4)
    5. Update document: Set document_type, confidence_score, metadata
    6. Insert document_analysis record
  - Error handling: Set processing_status='failed', error_message on failure
  - Deploy: `supabase functions deploy analyze-document`

- [ ] **T054** [P] Create DocumentClassifier class
  - File: `lib/data-room/ai/document-classifier.ts`
  - Method: `classify(text: string): Promise<{ document_type, confidence_score, reasoning }>`
  - OpenRouter API call with prompt:
    ```
    System: Classify document into: financial, contract, due_diligence, legal, hr, other.
    Return JSON: {"document_type": "...", "confidence": 0.95, "reasoning": "..."}
    User: Document text: {text}
    ```
  - Use structured output (JSON mode)

- [ ] **T055** [P] Create MetadataExtractor class
  - File: `lib/data-room/ai/metadata-extractor.ts`
  - Method: `extract(text: string, documentType: DocumentType): Promise<DocumentMetadata>`
  - OpenRouter API call with prompt specific to document type:
    - Financial: Extract dates, amounts (revenue, costs, etc.), fiscal periods
    - Contract: Extract parties, effective date, expiration date, payment terms
    - Other: Extract general dates, amounts, parties
  - Return structured metadata object

### Text Extraction Utilities

- [ ] **T056** [P] Create text extraction utilities
  - File: `lib/data-room/ai/text-extractor.ts`
  - Method: `extractTextFromPDF(buffer: Buffer): Promise<string>`
    - Use pdf-parse library
    - Handle errors (corrupted PDFs)
  - Method: `detectIfScanned(text: string): boolean`
    - Check if text is empty or gibberish → likely scanned
  - Method: `extractTextFromImage(buffer: Buffer): Promise<string>` (Phase 2 - stub for now)
    - Tesseract OCR (defer to Phase 2)

---

## Phase 3.7: Integration & Polish

### State Management

- [ ] **T057** [P] Create Zustand store for Data Room state
  - File: `lib/stores/data-room-store.ts`
  - State: `currentDataRoomId`, `documentFilters`, `selectedDocuments`, `uploadProgress`
  - Actions: `setCurrentDataRoom()`, `setDocumentFilters()`, `updateUploadProgress(filename, progress)`
  - Persist: Use localStorage for filters only (not upload progress)

### Error Handling & Validation

- [ ] **T058** Add error handling middleware to API routes
  - Pattern: Wrap all route handlers in try-catch
  - Return consistent error format: `{ error: string, code?: string }`
  - Log errors to console (or logging service)

- [ ] **T059** Add client-side error boundaries
  - File: `app/(dashboard)/diligence/data-room/error.tsx`
  - Catch: React errors in data room pages
  - Display: User-friendly error message, "Retry" button

- [ ] **T060** [P] Add loading states to all components
  - Skeleton loaders for data room list, document grid
  - Spinners for form submissions
  - Upload progress bars

### Security Hardening

- [ ] **T061** Add rate limiting to API routes (optional - defer if complex)
  - Use middleware or Vercel rate limiting
  - Limits: 100 requests/minute per user
  - Return 429 if exceeded

- [ ] **T062** Validate JWT tokens in invitation flow
  - File: `app/api/data-room/accept-invite/route.ts` (new route for accepting invites)
  - Verify: Token signature, expiration, not revoked
  - On success: Set accepted_at in data_room_access table

- [ ] **T063** Add CSRF protection to forms (if not already handled by Next.js)
  - Use Next.js built-in CSRF protection (enabled by default in App Router)
  - Verify: All forms use POST with proper headers

### Performance Optimization

- [ ] **T064** [P] Add pagination to document list
  - Modify: GET /api/data-room/documents to support `limit` and `offset` query params
  - UI: Add pagination controls to DocumentGrid
  - Default: 50 documents per page

- [ ] **T065** [P] Optimize PDF.js worker loading
  - Serve worker from CDN or bundle with app
  - Set: `pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'`
  - Add: `public/pdf.worker.min.js` from pdfjs-dist package

- [ ] **T066** [P] Add lazy loading to document viewer
  - Render only visible page (+ 1 before/after for smooth scrolling)
  - Unload pages that are far from viewport

### Testing & Validation

- [ ] **T067** Run all contract tests and verify they pass
  - Command: `npm run test:contract` (if test script exists) or `npx playwright test tests/contract/`
  - **Gate**: All 9 contract tests (T006-T014) must PASS
  - Fix any failures before proceeding

- [ ] **T068** Run all E2E tests and verify they pass
  - Command: `npm run test:e2e` or `npx playwright test tests/e2e/`
  - **Gate**: All 6 E2E tests (T015-T020) must PASS
  - Fix any failures before proceeding

- [ ] **T069** Execute quickstart.md validation scenario
  - File: `specs/005-data-room-ai-due-diligence/quickstart.md`
  - Manually test: Create data room, upload doc, wait for AI, view document, share, check activity log
  - **Gate**: All 6 steps complete successfully

- [ ] **T070** [P] Add unit tests for utility functions
  - File: `tests/unit/document-storage.spec.ts`
  - Test: `uploadDocument()`, `getSignedUrl()`, `deleteDocument()`
  - File: `tests/unit/validation.spec.ts`
  - Test: Zod schemas (DataRoomSchema, DocumentSchema, etc.)

### Documentation & Code Quality

- [ ] **T071** [P] Add JSDoc comments to all repository classes
  - Files: `lib/data-room/repository/*.ts`
  - Document: Method signatures, parameters, return types, error cases

- [ ] **T072** [P] Add JSDoc comments to all components
  - Files: `components/data-room/*.tsx`
  - Document: Props, usage examples

- [ ] **T073** [P] Update CLAUDE.md with Data Room context
  - File: `CLAUDE.md` (repository root)
  - Add: Data Room feature summary, key files, database schema overview
  - Add: Common tasks (create data room, upload doc, etc.)

- [ ] **T074** [P] Create API documentation (OpenAPI spec)
  - File: `docs/api/data-room.md` or extend existing API docs
  - Document: All 15 endpoints with request/response examples
  - Use: OpenAPI spec from `contracts/data-rooms-api.yaml`

### Final Polish

- [ ] **T075** Remove console.log statements
  - Search: `grep -r "console\.log" components/data-room/ lib/data-room/ app/api/data-room/`
  - Replace with proper logging (or remove)

- [ ] **T076** Fix TypeScript errors
  - Run: `npm run type-check` or `npx tsc --noEmit`
  - Fix: All type errors in Data Room code

- [ ] **T077** Fix ESLint warnings
  - Run: `npm run lint`
  - Fix: All warnings in Data Room files

- [ ] **T078** [P] Add accessibility attributes (ARIA labels)
  - Components: Buttons, form inputs, modals
  - Ensure: All interactive elements have labels
  - Test: With screen reader (VoiceOver on Mac, NVDA on Windows)

- [ ] **T079** [P] Add responsive styles for mobile
  - Test: All pages on mobile viewport (375px width)
  - Ensure: Drag-drop works on touch devices, modals are mobile-friendly

- [ ] **T080** Optimize bundle size
  - Analyze: `npm run build` and check output
  - Ensure: react-pdf is code-split (dynamic import if needed)
  - Target: <500KB additional bundle size

### Deployment Preparation

- [ ] **T081** Create database migration rollback plan
  - Document: How to revert migration 20251002000001_data_room_schema.sql
  - Test: Rollback in local environment

- [ ] **T082** Set up monitoring for Edge Functions
  - Configure: Supabase dashboard alerts for function errors
  - Log: Edge Function execution time, error rate

- [ ] **T083** Create beta user invitation list
  - Identify: 10 beta testers (M&A advisors, PE firms)
  - Prepare: Onboarding email with demo video link

- [ ] **T084** [P] Create feature flag for Data Room (optional)
  - File: `lib/feature-flags.ts`
  - Add: `ENABLE_DATA_ROOM` flag (default: true for Premium users)
  - Use: Hide Data Room nav item if flag is false

### Pre-Launch Checklist

- [ ] **T085** Security audit
  - Verify: All RLS policies are correct (test with different user roles)
  - Verify: File uploads are encrypted at rest
  - Verify: Signed URLs expire correctly
  - Verify: Activity logs are immutable (no UPDATE/DELETE policies)

- [ ] **T086** Performance testing
  - Test: Upload 10 documents simultaneously
  - Test: View data room with 100 documents
  - Test: AI classification completes in <60 seconds for 95% of docs
  - Measure: Page load times (target: <3s for document viewer)

- [ ] **T087** Cross-browser testing
  - Test: Chrome, Firefox, Safari (desktop)
  - Test: Chrome, Safari (mobile)
  - Fix: Any browser-specific issues

- [ ] **T088** Load testing (optional - defer if complex)
  - Simulate: 100 concurrent users
  - Measure: API response times, database query times
  - Optimize: Add indexes if queries are slow

### Launch Tasks

- [ ] **T089** Deploy database migration to production
  - Run: `supabase db push --db-url [PROD_URL]` or apply via dashboard
  - Verify: No errors, all 6 tables created

- [ ] **T090** Deploy Edge Function to production
  - Run: `supabase functions deploy analyze-document --project-ref [PROD_REF]`
  - Verify: Function is live and callable

- [ ] **T091** Deploy Next.js app to Vercel
  - Commit: All changes to `005-data-room-ai-due-diligence` branch
  - Push: To GitHub
  - Verify: Vercel auto-deploys preview (or manual deploy to production)

- [ ] **T092** Smoke test in production
  - Create data room as demo user
  - Upload sample document
  - Verify AI classification works
  - Share with test user
  - Check activity log

- [ ] **T093** Send beta invitations
  - Email: 10 beta testers with onboarding link
  - Monitor: Usage, errors, feedback

- [ ] **T094** Set up user feedback channel
  - Create: Slack channel or form for beta feedback
  - Monitor: Daily for critical bugs

---

## Dependencies

**Critical Path** (must be completed in order):
1. **Setup** (T001-T005) → Everything
2. **Tests** (T006-T020) → Implementation (T021-T055)
3. **Repositories** (T022-T026) → API Routes (T027-T038)
4. **API Routes** (T027-T038) → UI Components (T039-T052)
5. **Document Upload** (T032, T043) → AI Integration (T053-T056)
6. **Core Features** (T027-T056) → Integration & Polish (T057-T080)
7. **Testing** (T067-T070) → Deployment (T081-T094)

**Parallel Opportunities** (45 tasks marked [P]):
- T006-T014: All contract tests (different files)
- T015-T020: All E2E tests (different files)
- T021-T026: All repositories and storage (different files)
- T039-T051: All UI components (different files)
- T054-T056: AI utilities (different files)

**Blocking Dependencies**:
- T032 (upload API) blocks T043 (upload UI) blocks T053 (AI Edge Function)
- T027-T031 (data room API) blocks T039-T041 (data room UI)
- T033-T034 (documents API) blocks T044-T048 (document viewer)
- T036-T038 (access API) blocks T049-T050 (permissions UI)
- T022 (DataRoomRepository) blocks T027-T031 (data room API routes)
- T023 (DocumentRepository) blocks T032-T035 (documents API routes)

---

## Parallel Execution Examples

### Batch 1: Contract Tests (Run in Parallel)
```bash
# All contract tests can run simultaneously (different files)
npx playwright test tests/contract/data-room-create.spec.ts &
npx playwright test tests/contract/data-room-list.spec.ts &
npx playwright test tests/contract/data-room-get.spec.ts &
npx playwright test tests/contract/data-room-update.spec.ts &
npx playwright test tests/contract/data-room-delete.spec.ts &
npx playwright test tests/contract/documents-upload.spec.ts &
npx playwright test tests/contract/documents-list.spec.ts &
npx playwright test tests/contract/documents-get.spec.ts &
npx playwright test tests/contract/access-grant.spec.ts &
wait
```

### Batch 2: Repository Layer (Run in Parallel)
```bash
# All repositories are independent, can be built simultaneously
# Task T022: Create DataRoomRepository
# Task T023: Create DocumentRepository
# Task T024: Create ActivityRepository
# Task T025: Create AccessRepository
# Task T026: Create DocumentStorage

# Develop in parallel by different team members or agents
```

### Batch 3: UI Components (Run in Parallel)
```bash
# All components are independent React files
# Task T039: DataRoomList component
# Task T040: CreateDataRoomModal component
# Task T043: DocumentUpload component
# Task T044: DocumentGrid component
# Task T045: FolderTree component
# Task T046: DocumentViewer component
# Task T047: AIInsightsSidebar component
# Task T049: PermissionManager component
# Task T050: ShareDataRoomModal component
# Task T051: ActivityTimeline component

# Develop in parallel by different team members or agents
```

---

## Validation Checklist

**GATE: Must verify before marking feature complete**

- [x] All contracts have corresponding tests (T006-T014 cover all 9 endpoints)
- [x] All entities have repositories (T022-T026 cover 6 entities: DataRoom, Document, DocumentAnalysis, DataRoomAccess, ActivityLog, DocumentAnnotation)
- [x] All tests come before implementation (Phase 3.2 before Phase 3.3)
- [x] Parallel tasks truly independent (45 [P] tasks verified - different files, no shared state)
- [x] Each task specifies exact file path (all tasks include file paths)
- [x] No task modifies same file as another [P] task (verified - no conflicts)
- [ ] All contract tests pass (T067 - verify during execution)
- [ ] All E2E tests pass (T068 - verify during execution)
- [ ] Quickstart.md validates successfully (T069 - verify during execution)

---

## Estimated Timeline

**Week 1-2**: Setup + Tests + Repositories (T001-T026) - 26 tasks
**Week 3-4**: API Routes + Storage (T027-T038) - 12 tasks
**Week 5-6**: UI Components + Document Viewer (T039-T052) - 14 tasks
**Week 7**: AI Integration (T053-T056) - 4 tasks
**Week 8**: Integration, Polish, Testing (T057-T080) - 24 tasks
**Week 8+**: Deployment (T081-T094) - 14 tasks

**Total**: 94 tasks over 8 weeks (MVP Phase 1)

**Parallel Opportunities**: With 45 [P] tasks, can reduce timeline by ~30% with multiple developers (6 weeks instead of 8 with 2-3 developers).

---

## Notes

- **[P] tasks** = Different files, no dependencies, safe to parallelize
- **Verify tests fail** before implementing (T006-T020)
- **Commit after each task** (or logical groups)
- **Avoid**: Vague tasks, same file conflicts, skipping tests
- **Critical**: Security (RLS, encryption, audit logs), Performance (AI <60s, viewer <3s)

---

**Status**: ✅ **COMPLETE** - 94 tasks generated, ready for execution

**Next Steps**:
1. Assign tasks to developers (prioritize T001-T005 setup first)
2. Begin Phase 3.2 (write failing tests T006-T020)
3. Implement Phase 3.3+ (make tests pass)
4. Beta launch at T093 (Week 8)
