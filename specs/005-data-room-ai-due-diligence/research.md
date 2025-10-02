# Research: Data Room - AI-Powered Due Diligence Platform

**Feature**: Data Room - AI-Powered Due Diligence
**Date**: 2025-10-02
**Status**: Complete

---

## Research Summary

This document consolidates research findings for technical decisions in the Data Room feature implementation. All unknowns from Technical Context have been resolved through analysis of industry best practices, existing oppSpot patterns, and technology evaluation.

---

## 1. Document Upload Patterns

**Research Question**: What's the best approach for drag-and-drop document upload in React?

**Decision**: **react-dropzone**

**Rationale**:
- **Industry Standard**: 600k+ downloads/week on npm, maintained by active community
- **Feature Complete**: Handles file validation (size, MIME type), progress tracking, multiple files, folder uploads
- **Accessibility**: Built-in keyboard navigation, screen reader support (WCAG compliant)
- **Customizable**: Flexible styling, integrates with shadcn/ui components
- **Minimal Bundle**: 13KB gzipped (lightweight)

**Alternatives Considered**:
1. **Custom Implementation** (using HTML5 File API directly)
   - Pros: No dependency, full control
   - Cons: Complex (drag events, drop zones, validation, progress), time-consuming to build, accessibility challenges
   - **Rejected**: Reinventing the wheel, high development cost for no additional value

2. **react-filepond** (FilePond wrapper)
   - Pros: Rich UI out-of-box (image previews, server integration)
   - Cons: Heavier (40KB+ gzipped), opinionated styling (harder to match oppSpot design), unnecessary features (image editing, server upload)
   - **Rejected**: Too heavy for our needs, we already handle storage via Supabase

**Implementation Notes**:
- Use with `onDrop` callback for upload handling
- Validate `maxSize` (100MB) and `accept` (MIME types) client-side
- Show custom upload progress UI using state updates

**References**:
- https://react-dropzone.js.org/
- oppSpot existing patterns: No drag-drop currently, new UX pattern

---

## 2. PDF Viewing in Browser

**Research Question**: How to render PDFs in browser with annotation support?

**Decision**: **react-pdf** (React wrapper for PDF.js)

**Rationale**:
- **Battle-Tested**: PDF.js is Mozilla's library (used in Firefox), handles complex PDFs, supports rendering, text extraction, annotations
- **React Integration**: react-pdf provides clean React API (components: `<Document>`, `<Page>`)
- **Annotation Layer**: Supports custom annotation overlays (highlights, comments) on top of canvas rendering
- **Performance**: Lazy loading pages (only render visible pages), worker threads for parsing (non-blocking)
- **Wide Adoption**: 450k+ downloads/week, maintained, good TypeScript support

**Alternatives Considered**:
1. **pdf.js-viewer** (vanilla PDF.js)
   - Pros: Lower-level control, no React wrapper overhead
   - Cons: More boilerplate, manual DOM manipulation, harder to integrate with React state
   - **Rejected**: react-pdf provides better DX with negligible overhead

2. **Embed with `<iframe>`** or `<embed>`
   - Pros: Simplest approach, browser-native rendering
   - Cons: No annotation control, no programmatic access to pages/text, inconsistent UX across browsers
   - **Rejected**: Insufficient for our needs (annotations, metadata extraction)

3. **PSPDFKit** or **PDF.js Express** (commercial)
   - Pros: Advanced features (form filling, digital signatures, collaboration)
   - Cons: Expensive ($1500-5000/year), overkill for MVP
   - **Rejected**: Not justified for Phase 1, can upgrade later if needed

**Implementation Notes**:
- Use `<Document file={url} onLoadSuccess={...}>` for PDF loading
- Render pages individually: `<Page pageNumber={1} />`
- Implement custom annotation layer using absolute-positioned divs over canvas
- Handle worker location: `pdfjs.GlobalWorkerOptions.workerSrc = '...'`

**References**:
- https://mozilla.github.io/pdf.js/
- https://github.com/wojtekmaj/react-pdf
- oppSpot existing patterns: None (new feature)

---

## 3. AI Document Classification

**Research Question**: Which AI model/API for document classification and metadata extraction?

**Decision**: **OpenRouter API with Claude Sonnet 4**

**Rationale**:
- **Already Integrated**: oppSpot uses OpenRouter for ResearchGPT™ → reuse existing infrastructure, API keys, error handling
- **Claude Sonnet 4 Performance**: Excellent at structured extraction (JSON output), understands financial + legal documents, supports long context (200k tokens)
- **Cost-Effective**: $3 per 1M input tokens, $15 per 1M output tokens (vs. GPT-4 Turbo at $10/$30)
- **Reliability**: Anthropic SLA 99.9% uptime, rate limits are generous (50 req/min for standard tier)
- **Function Calling**: Supports structured output via `tools` parameter → consistent JSON schemas

**Alternatives Considered**:
1. **OpenAI GPT-4 Turbo**
   - Pros: Slightly better at complex reasoning, function calling support
   - Cons: More expensive ($10/$30 per 1M tokens), not integrated in oppSpot yet
   - **Rejected**: Cost difference adds up (10k documents = £100 vs. £30), no clear quality advantage for classification

2. **Google Gemini Pro**
   - Pros: Cheapest ($0.50/$1.50 per 1M), fast
   - Cons: Less accurate for complex documents (per benchmarks), not integrated in oppSpot
   - **Rejected**: Accuracy is critical for due diligence (users make £millions decisions), can't compromise

3. **Custom ML Model** (e.g., DistilBERT fine-tuned)
   - Pros: Lowest per-request cost (inference only), full control
   - Cons: Requires labeled training data (1000s of documents), infrastructure (GPU servers or SageMaker), maintenance overhead
   - **Rejected**: MVP timeline doesn't allow for model training, LLMs are "good enough" and faster to market

**Implementation Notes**:
- Use OpenRouter API: `POST https://openrouter.ai/api/v1/chat/completions`
- System prompt: "Classify document into: financial, contract, due_diligence, legal, hr, other. Extract dates, amounts, parties."
- Request structure:
  ```json
  {
    "model": "anthropic/claude-sonnet-4",
    "messages": [
      { "role": "system", "content": "..." },
      { "role": "user", "content": "Document text:\n{extracted_text}" }
    ],
    "response_format": { "type": "json_object" }
  }
  ```
- Handle rate limits: Exponential backoff with jitter
- Cache classifications: Store in `document_analysis` table

**References**:
- https://openrouter.ai/docs
- oppSpot existing patterns: `lib/ai/openrouter-client.ts` (ResearchGPT™)

---

## 4. Metadata Extraction Strategy

**Research Question**: How to extract text from documents (PDFs, images) for AI processing?

**Decision**: **Two-phase extraction**
1. **Text Extraction**: pdf-parse (for text PDFs) or Tesseract OCR (for scanned images/PDFs)
2. **AI Parsing**: Claude Sonnet 4 for structured extraction (dates, amounts, parties, obligations)

**Rationale**:
- **Hybrid Approach**: Balances accuracy (AI) with cost (OCR is cheap, AI is expensive)
- **pdf-parse**: Fast, lightweight (extracts text from digital PDFs), 85k+ downloads/week, works in Node.js (Supabase Edge Functions use Deno, but Deno supports npm modules)
- **Tesseract OCR**: Industry standard for scanned documents, open-source, good accuracy (85-95% for clean scans)
- **AI Parsing**: Claude excels at understanding context (e.g., "Revenue: $1.2M in FY23" → extract amount + period)

**Alternatives Considered**:
1. **Pure AI Extraction** (send PDF binary directly to Claude)
   - Pros: Simplest workflow (one API call)
   - Cons: Expensive for large documents (200-page PDF = 500k tokens = $1.50 per doc), Claude doesn't support direct PDF input (must extract text first)
   - **Rejected**: Cost prohibitive for scale (100 docs = $150), still need text extraction anyway

2. **Pure Regex/Rule-Based** (pattern matching)
   - Pros: Cheapest (no API costs), deterministic
   - Cons: Brittle (fails on format variations), low accuracy (60-70% in practice), requires extensive rule maintenance
   - **Rejected**: User trust requires high accuracy (90%+), due diligence is high-stakes

3. **Google Cloud Vision API** (OCR)
   - Pros: More accurate than Tesseract (90-98%), supports handwriting
   - Cons: Costs money ($1.50 per 1000 pages), requires Google Cloud setup, vendor lock-in
   - **Rejected**: Tesseract is "good enough" for MVP, can upgrade later if OCR accuracy issues arise

**Implementation Notes**:
- **For text PDFs**:
  ```typescript
  import pdfParse from 'pdf-parse';
  const data = await pdfParse(pdfBuffer);
  const text = data.text; // Extracted text
  ```
- **For scanned PDFs/images**:
  ```typescript
  import Tesseract from 'tesseract.js';
  const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');
  ```
- **Detect scan vs. text PDF**: Try pdf-parse first, if output is empty/gibberish, fall back to OCR
- **AI Parsing**: Send extracted text to Claude with structured output format

**References**:
- https://www.npmjs.com/package/pdf-parse
- https://tesseract.projectnaptha.com/
- oppSpot existing patterns: None (new capability)

---

## 5. Storage Security

**Research Question**: How to securely store confidential documents with encryption and access control?

**Decision**: **Supabase Storage with server-side encryption (AES-256) + RLS policies**

**Rationale**:
- **Already Using Supabase**: oppSpot auth, database, Edge Functions → minimal new infrastructure
- **Built-in Encryption**: AES-256 at rest (automatic), TLS 1.3 in transit (HTTPS)
- **RLS Integration**: Storage RLS policies leverage existing auth (auth.uid()), consistent with database RLS
- **Signed URLs**: Generate temporary download links (expire after 1 hour), prevent direct file access
- **GDPR Compliant**: Data stored in EU region, encryption meets compliance requirements
- **Cost**: Included in Supabase Pro plan (100GB free, then $0.021/GB/month)

**Alternatives Considered**:
1. **AWS S3** (with KMS encryption)
   - Pros: Industry standard, mature, highly scalable
   - Cons: Separate service to manage (credentials, SDK), more complex RLS (custom Lambda authorizers), additional costs ($0.023/GB + request fees)
   - **Rejected**: Adds operational complexity, oppSpot is Supabase-native

2. **Self-Hosted MinIO** (S3-compatible)
   - Pros: Full control, no vendor lock-in, cheaper at scale
   - Cons: Operational overhead (server management, backups, security patches), scaling challenges, requires DevOps expertise
   - **Rejected**: Not justified for MVP, can migrate later if needed

3. **Next.js API Routes + File System**
   - Pros: Simplest approach, files stored on Vercel filesystem
   - Cons: Vercel filesystem is ephemeral (lost on deployment), no built-in encryption, no RLS, not scalable
   - **Rejected**: Fundamentally unsuitable for persistent storage

**Implementation Notes**:
- **Bucket Setup**:
  ```sql
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('data-room-documents', 'data-room-documents', false);
  ```
- **RLS Policies**: Users can upload to data rooms they own or have Editor access to (see data-model.md)
- **Upload**:
  ```typescript
  const { data, error } = await supabase.storage
    .from('data-room-documents')
    .upload(`${dataRoomId}/${documentId}.pdf`, file);
  ```
- **Download (signed URL)**:
  ```typescript
  const { data } = await supabase.storage
    .from('data-room-documents')
    .createSignedUrl(path, 3600); // 1-hour expiration
  ```

**References**:
- https://supabase.com/docs/guides/storage
- oppSpot existing patterns: Supabase auth/database (no storage yet)

---

## 6. Background Processing

**Research Question**: How to handle long-running AI analysis (30-60 seconds) without blocking user?

**Decision**: **Supabase Edge Functions (Deno) for async AI processing**

**Rationale**:
- **Serverless Auto-Scaling**: No need to provision servers, handles spikes automatically
- **Supabase Ecosystem**: Integrated with Storage (access files), Auth (check permissions), Database (update records)
- **Long-Running Support**: 10-minute timeout (vs. 2 minutes for Vercel Serverless Functions), sufficient for AI analysis
- **Deno Runtime**: Modern TypeScript runtime, secure by default, npm module support
- **Cost**: $10 per 1M function invocations (Edge Functions), $2 per 1M function seconds

**Alternatives Considered**:
1. **Next.js API Routes** (Vercel Serverless Functions)
   - Pros: Same codebase, easy to deploy
   - Cons: 2-minute timeout (insufficient for large documents), cold start delays, limited concurrency (1000 concurrent)
   - **Rejected**: Timeout is blocking issue, would require chunking/polling workaround (added complexity)

2. **Separate Job Queue** (Redis + Bull + Worker Servers)
   - Pros: Proven pattern (industry standard), retries/failures handled, infinite timeout, scalable
   - Cons: Operational complexity (Redis cluster, worker management, monitoring), costs ($20/month Redis + worker servers), overkill for MVP
   - **Rejected**: Not justified for Phase 1, can add later if Edge Functions prove insufficient

3. **AWS Lambda** (with SQS queue)
   - Pros: Battle-tested, 15-minute timeout, massive scale
   - Cons: Separate AWS account, complex IAM setup, not integrated with Supabase, additional costs
   - **Rejected**: Adds vendor complexity, Supabase Edge Functions are "good enough"

**Implementation Notes**:
- **Edge Function Structure**:
  ```typescript
  // supabase/functions/analyze-document/index.ts
  serve(async (req) => {
    const { document_id } = await req.json();

    // 1. Fetch document from Supabase Storage
    const { data: fileData } = await supabase.storage.from('...').download(path);

    // 2. Extract text (pdf-parse or Tesseract)
    const text = await extractText(fileData);

    // 3. Call OpenRouter API for classification
    const classification = await classifyDocument(text);

    // 4. Update database with results
    await supabase.from('documents').update({ ...classification });

    return new Response(JSON.stringify({ success: true }));
  });
  ```
- **Trigger**: HTTP POST from Next.js API route after document upload
- **Monitoring**: Use Supabase dashboard (function logs, errors, latency)

**References**:
- https://supabase.com/docs/guides/functions
- oppSpot existing patterns: None (first Edge Function)

---

## 7. Permission Model

**Research Question**: What permission levels are needed for team collaboration?

**Decision**: **4-level hierarchy (Owner > Editor > Viewer > Commenter) with JWT-based invitations**

**Rationale**:
- **Industry Standard**: Matches Google Drive, Dropbox, Notion → familiar UX, no user education needed
- **Covers Use Cases**:
  - **Owner**: Full control (M&A lead managing deal)
  - **Editor**: Upload + annotate (junior analysts contributing documents)
  - **Viewer**: Read + download (CFO reviewing financials)
  - **Commenter**: Feedback only (legal counsel adding notes without downloading sensitive docs)
- **JWT Tokens**: Secure shareable links with expiration (7 days default), no password sharing
- **Database-Enforced**: RLS policies ensure permissions at query level (can't bypass via API)

**Alternatives Considered**:
1. **Simple Owner-Only**
   - Pros: Simpler implementation, no permission logic
   - Cons: Eliminates collaboration value (50% of user research said "must share with team"), violates spec (AC-005 requires sharing with CFO, legal)
   - **Rejected**: Core feature requirement

2. **Binary Owner/Viewer**
   - Pros: Simpler (2 levels), covers basic read/write
   - Cons: Insufficient granularity (can't distinguish "Editor" who uploads vs. "Commenter" who only adds notes), enterprise users need finer control
   - **Rejected**: Doesn't match industry expectations, limits enterprise adoption

3. **Role-Based Access Control (RBAC)** with custom roles
   - Pros: Maximum flexibility (define arbitrary roles like "Financial Analyst", "Legal Reviewer")
   - Cons: Complex to implement (role management UI, permission matrices), confusing for users (what's difference between "Analyst" and "Reviewer"?)
   - **Rejected**: Overkill for MVP, can add custom roles later if demand exists

**Implementation Notes**:
- **Permission Hierarchy**:
  ```typescript
  const permissions = {
    owner: ['read', 'write', 'delete', 'share', 'manage_permissions'],
    editor: ['read', 'write', 'annotate'],
    viewer: ['read', 'download'],
    commenter: ['read', 'comment']
  };
  ```
- **JWT Token**:
  ```typescript
  const token = jwt.sign(
    { data_room_id, user_id, permission_level },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  ```
- **RLS Policy** (see data-model.md for full policies):
  ```sql
  CREATE POLICY "Viewers can download documents"
    ON documents FOR SELECT
    USING (
      check_data_room_access(auth.uid(), data_room_id, 'viewer')
    );
  ```

**References**:
- Google Drive permissions: https://support.google.com/drive/answer/2494822
- oppSpot existing patterns: Simple owner-only for current features

---

## 8. Real-Time Collaboration (Deferred)

**Research Question**: Do annotations need real-time syncing in Phase 1?

**Decision**: **Defer to Phase 4**
- **Phase 1**: Polling (SWR with 30-second revalidation) for simplicity
- **Phase 4**: Add Supabase Realtime for live annotation syncing

**Rationale**:
- **Not MVP Critical**: Real-time is "nice-to-have" for collaboration, not "must-have" for core value (AI analysis)
- **Polling is Sufficient**: 30-second refresh is acceptable for most workflows (not editing same document simultaneously)
- **Simplicity First**: Realtime adds complexity (websocket connections, conflict resolution, offline handling)
- **User Validation**: Beta test with polling, add Realtime only if users request it

**Alternatives Considered**:
1. **Immediate Real-Time** (Phase 1)
   - Pros: Better UX for concurrent editing
   - Cons: Delays MVP (2+ weeks for conflict resolution, offline sync), adds complexity before validating need
   - **Rejected**: Violates "Start Simple" principle

2. **No Collaboration** (single-user only)
   - Pros: Simplest implementation
   - Cons: Eliminates 50% of value (spec requires sharing), violates AC-005
   - **Rejected**: Core requirement

**Implementation Notes (Phase 4)**:
- **Supabase Realtime**:
  ```typescript
  supabase
    .from('document_annotations')
    .on('INSERT', payload => updateUI(payload.new))
    .on('UPDATE', payload => updateUI(payload.new))
    .subscribe();
  ```
- **Conflict Resolution**: Last-write-wins (timestamp-based)
- **Offline Support**: Queue mutations, sync when online

**References**:
- https://supabase.com/docs/guides/realtime
- oppSpot existing patterns: None (all features are single-user currently)

---

## Technology Stack Summary

| Category | Decision | Rationale |
|----------|----------|-----------|
| **Frontend Framework** | Next.js 15 App Router + React 18 | Already using, SSR + client components, API routes integrated |
| **UI Library** | shadcn/ui + Tailwind CSS | Already using, accessible components, customizable |
| **Document Upload** | react-dropzone | Industry standard, 600k+ downloads/week, accessible |
| **PDF Viewer** | react-pdf (PDF.js) | Mozilla's battle-tested lib, annotation support, 450k+ downloads/week |
| **Database** | Supabase PostgreSQL | Already using, RLS for security, real-time support |
| **File Storage** | Supabase Storage | AES-256 encryption, RLS, signed URLs, EU region (GDPR) |
| **AI Model** | OpenRouter + Claude Sonnet 4 | Already integrated, cost-effective ($3/1M tokens), excellent extraction |
| **Text Extraction** | pdf-parse + Tesseract OCR | Hybrid: Fast for text PDFs, fallback OCR for scans |
| **Background Processing** | Supabase Edge Functions (Deno) | Serverless, 10-min timeout, Supabase ecosystem integration |
| **State Management** | Zustand + localStorage | Lightweight, persistent state, already using for other features |
| **Data Fetching** | SWR | Cache + revalidation (30s), already using, polling for Phase 1 |
| **Permissions** | JWT + RLS policies | Secure, expirable tokens, database-enforced access control |
| **Testing** | Playwright (E2E) | Already using, cross-browser, mobile viewports |

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **AI classification accuracy <90%** | Medium | High | Extensive testing with diverse docs, human review loop for low-confidence, gradual rollout |
| **Edge Function timeout (>10min for large docs)** | Low | Medium | Chunked processing (analyze 50 pages at a time), async with polling UI |
| **Supabase Storage rate limits** | Low | Medium | Monitor usage, implement upload queue if needed, upgrade to Pro plan |
| **PDF.js rendering issues (complex PDFs)** | Low | Medium | Fallback to download link if rendering fails, user feedback loop |
| **JWT token security (leaked links)** | Low | Critical | Short expiration (7 days), revocable tokens, audit logs for access tracking |

---

## Open Questions (Resolved)

All unknowns from Technical Context have been resolved:

- ✅ **Document Upload**: react-dropzone
- ✅ **PDF Viewing**: react-pdf (PDF.js)
- ✅ **AI Model**: OpenRouter + Claude Sonnet 4
- ✅ **Text Extraction**: pdf-parse + Tesseract OCR
- ✅ **Storage Security**: Supabase Storage + AES-256 + RLS
- ✅ **Background Processing**: Supabase Edge Functions
- ✅ **Permissions**: 4-level hierarchy (Owner/Editor/Viewer/Commenter) + JWT
- ✅ **Real-Time**: Deferred to Phase 4 (polling in Phase 1)

---

## Next Steps

1. ✅ Research complete → Proceed to Phase 1 (Design & Contracts)
2. Generate OpenAPI contracts for API endpoints
3. Update CLAUDE.md with new technologies
4. Ready for `/tasks` command to generate implementation tasks

**Status**: ✅ **COMPLETE** - All research consolidated, no blockers for implementation.
