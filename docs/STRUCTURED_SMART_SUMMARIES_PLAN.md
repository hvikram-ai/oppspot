# Structured Smart Summaries - Implementation Plan

## Overview
Extract structured key points from contracts and corporate documents with quality gates, confidence scoring, and multi-format exports (JSON, Excel, Word).

**Target**: v1 implementation with system templates for MSAs, Order Forms, NDAs, Policies, and Corporate Profiles.

---

## Phase 1: Database Schema & Migrations
**Duration**: 1-2 days | **Complexity**: Medium

### Tasks
- [ ] Create migration file: `supabase/migrations/20251031_structured_summaries.sql`
  - Create `summary_templates` table with org_id scoping
  - Create `summary_fields` table with field types and normalizers
  - Create `summary_runs` table for extraction job tracking
  - Create `document_summaries` table for results
  - Create `summary_field_values` table for extracted data
  - Create `summary_quality_issues` table for validation failures
  - Add indexes on document_id, template_id, started_at
  - Enable RLS policies (inherit from data_room_access via documents)

- [ ] Create seed data for system templates
  - MSA template (parties, term, renewal, termination, fees, SLA, liability, governing law)
  - Order Form template (parties, order date, products, pricing, delivery terms)
  - NDA template (parties, effective date, term, discloser, recipient, return clause)
  - Corporate Profile template (company overview, products, leadership, locations, certifications)

- [ ] Test migration locally and verify RLS policies

**Dependencies**:
- Existing `documents` table from Data Room
- Existing `data_room_access` for RLS

**Files**:
- `supabase/migrations/20251031_structured_summaries.sql`
- `supabase/seeds/summary_templates.sql`

---

## Phase 2: TypeScript Types & Interfaces
**Duration**: 1 day | **Complexity**: Simple

### Tasks
- [ ] Create `lib/data-room/summaries/types.ts`
  - Define `SummaryTemplate`, `SummaryField`, `SummaryRun`, `DocumentSummary`, `FieldValue`, `QualityIssue` interfaces
  - Define field type enums: `FieldType`, `FieldNormalizer`, `RunStatus`, `QualitySeverity`
  - Define extraction strategy types: `ExtractionSource`, `ExtractionResult`
  - Define export format types: `ExportFormat` (json, xlsx, docx)

- [ ] Update `types/database.ts` if using Supabase type generation

**Dependencies**: None

**Files**:
- `lib/data-room/summaries/types.ts`

---

## Phase 3: Core Extraction Services
**Duration**: 3-4 days | **Complexity**: Complex

### Tasks
- [ ] Create `lib/data-room/summaries/extractors/base-extractor.ts`
  - Abstract base class for field extractors
  - Interface for `extract(document, field, chunks)` → `FieldValue`
  - Confidence scoring logic

- [ ] Create `lib/data-room/summaries/extractors/contract-reuse-extractor.ts`
  - Map summary field keys to `contract_extractions.field_id`
  - Pull values from existing extractions
  - Check if `contract_extractions` table exists, gracefully handle absence

- [ ] Create `lib/data-room/summaries/extractors/llm-extractor.ts`
  - Use OpenRouter with Claude Sonnet 3.5
  - Retrieve top-K chunks from `document_chunks` using pgvector similarity
  - Strict JSON schema per field type
  - Extract value, confidence, evidence (page_number, chunk_index, text excerpt)
  - Retry logic for transient failures

- [ ] Create `lib/data-room/summaries/normalizers/field-normalizer.ts`
  - Currency normalization (detect and convert to standard format)
  - Duration normalization (parse "12 months", "1 year" → standardized format)
  - Date normalization (various formats → ISO 8601)
  - Boolean normalization ("yes", "true", "1" → true)
  - Enum validation and normalization

- [ ] Create `lib/data-room/summaries/quality-checker.ts`
  - Calculate coverage: (fields with valid values) / (required fields)
  - Calculate avg_confidence: mean of all field confidences
  - Detect quality issues:
    - Missing required fields
    - Low confidence values (< threshold)
    - Conflicting evidence
    - Invalid normalized values
  - Assign severity levels (low, medium, high)

**Dependencies**:
- `document_chunks` table (from Data Room Q&A)
- OpenRouter API key
- LLM Manager for provider selection

**Files**:
- `lib/data-room/summaries/extractors/base-extractor.ts`
- `lib/data-room/summaries/extractors/contract-reuse-extractor.ts`
- `lib/data-room/summaries/extractors/llm-extractor.ts`
- `lib/data-room/summaries/normalizers/field-normalizer.ts`
- `lib/data-room/summaries/quality-checker.ts`

---

## Phase 4: Summary Orchestration Service
**Duration**: 2-3 days | **Complexity**: Complex

### Tasks
- [ ] Create `lib/data-room/summaries/summary-service.ts`
  - Main orchestration service
  - `runSummaryExtraction(documentId, templateKey, force?)`
    - Create summary_run record (status: 'queued')
    - Load template and fields
    - Step 1: Reuse from contract_extractions
    - Step 2: Fill gaps with LLM extractor
    - Step 3: Apply normalizers
    - Step 4: Calculate confidence scores
    - Step 5: Run quality checks
    - Create document_summary and summary_field_values
    - Log quality issues to summary_quality_issues
    - Update run status (success/partial/error)
    - Return run_id

- [ ] Create `lib/data-room/summaries/repository/summary-repository.ts`
  - CRUD operations for all summary tables
  - `getSummaryByDocument(documentId, templateId?)`
  - `getLatestSummary(documentId)`
  - `getSummaryFields(summaryId)`
  - `getTemplates(orgId?)`
  - `getQualityIssues(runId)`

- [ ] Add background job support (optional for v1)
  - Queue summary runs if using background workers
  - Or run synchronously with timeout for v1

**Dependencies**:
- Phase 3 extractors and normalizers
- Database schema from Phase 1

**Files**:
- `lib/data-room/summaries/summary-service.ts`
- `lib/data-room/summaries/repository/summary-repository.ts`

---

## Phase 5: Export Services
**Duration**: 2-3 days | **Complexity**: Medium

### Tasks
- [ ] Install export libraries
  ```bash
  npm install xlsx docx --legacy-peer-deps
  npm install -D @types/xlsx
  ```

- [ ] Create `lib/data-room/summaries/exports/json-exporter.ts`
  - Export full summary with metadata, fields, values, quality issues
  - Clean JSON structure for API consumption

- [ ] Create `lib/data-room/summaries/exports/excel-exporter.ts`
  - Use `xlsx` library
  - Create workbook with sheets:
    - Summary sheet: field name, value, confidence, evidence
    - Metadata sheet: template, coverage, avg_confidence, quality status
  - Format confidence as percentage
  - Add conditional formatting for low confidence values

- [ ] Create `lib/data-room/summaries/exports/word-exporter.ts`
  - Use `docx` library (or `docxtemplater` for templates)
  - Create structured document:
    - Header: document title, template, date
    - Coverage and confidence summary table
    - Field sections: name, value, confidence, evidence
    - Footer: quality issues if any
  - Professional formatting with styles

- [ ] Create `lib/data-room/summaries/exports/export-manager.ts`
  - Route to appropriate exporter based on format
  - Handle errors and unsupported formats
  - Add filename generation with timestamp

**Dependencies**:
- Summary data from repository
- npm packages: xlsx, docx

**Files**:
- `lib/data-room/summaries/exports/json-exporter.ts`
- `lib/data-room/summaries/exports/excel-exporter.ts`
- `lib/data-room/summaries/exports/word-exporter.ts`
- `lib/data-room/summaries/exports/export-manager.ts`
- `package.json` (add dependencies)

---

## Phase 6: API Endpoints
**Duration**: 2 days | **Complexity**: Medium

### Tasks
- [ ] Create `app/api/data-rooms/[roomId]/documents/[docId]/summary/run/route.ts`
  - POST: Trigger summary extraction
  - Body: `{ templateKey?: string, force?: boolean }`
  - Returns: `{ runId, status }`
  - Check data room access permissions
  - Validate document exists and user has access
  - Call summary-service to run extraction
  - Handle async execution (immediate or queued)

- [ ] Create `app/api/data-rooms/[roomId]/documents/[docId]/summary/route.ts`
  - GET: Retrieve latest summary
  - Returns: summary + field_values + quality_issues + template metadata
  - Filter by templateKey if provided
  - Check permissions

- [ ] Create `app/api/data-rooms/[roomId]/documents/[docId]/summary/export/route.ts`
  - GET: Export summary
  - Query param: `format=json|xlsx|docx`
  - Stream file download with appropriate content-type
  - Set filename header: `Summary-{docName}-{timestamp}.{ext}`

- [ ] Create `app/api/data-rooms/[roomId]/summary-templates/route.ts`
  - GET: List available templates (system + org-specific)
  - Filter by doc_type if provided
  - Returns template list with field count

- [ ] Add error handling and logging to all endpoints

**Dependencies**:
- Phase 4 summary service
- Phase 5 export services
- Existing data room access middleware

**Files**:
- `app/api/data-rooms/[roomId]/documents/[docId]/summary/run/route.ts`
- `app/api/data-rooms/[roomId]/documents/[docId]/summary/route.ts`
- `app/api/data-rooms/[roomId]/documents/[docId]/summary/export/route.ts`
- `app/api/data-rooms/[roomId]/summary-templates/route.ts`

---

## Phase 7: UI Components
**Duration**: 3-4 days | **Complexity**: Complex

### Tasks
- [ ] Create `components/data-room/summary/summary-tab.tsx`
  - Main tab component in document viewer
  - Shows coverage and confidence badges
  - Quality gate status (pass/fail) with expandable issues
  - Action buttons: Run, Re-run, Export, Choose Template

- [ ] Create `components/data-room/summary/field-grid.tsx`
  - Table/grid view of all fields
  - Columns: Field Name, Value, Confidence (with color coding), Evidence
  - Sortable and filterable
  - Click evidence chip → highlight in document viewer

- [ ] Create `components/data-room/summary/coverage-indicator.tsx`
  - Visual coverage percentage (progress bar or gauge)
  - Color coding: green (>90%), yellow (75-90%), red (<75%)
  - Tooltip with missing fields

- [ ] Create `components/data-room/summary/confidence-badge.tsx`
  - Display average confidence with color coding
  - Breakdown tooltip showing per-field confidences

- [ ] Create `components/data-room/summary/quality-issues-panel.tsx`
  - Expandable panel showing quality issues
  - Group by severity (high, medium, low)
  - Show remediation hints
  - Link to relevant fields

- [ ] Create `components/data-room/summary/export-dialog.tsx`
  - Modal for export options
  - Format selection (JSON, Excel, Word)
  - Include options: confidence scores, evidence, quality issues
  - Download button with progress indicator

- [ ] Create `components/data-room/summary/template-selector.tsx`
  - Dropdown to choose template
  - Show template description and field count
  - Filter by doc_type
  - Trigger re-run on template change

- [ ] Update `app/data-rooms/[id]/documents/[docId]/page.tsx`
  - Add "Summary" tab to document viewer
  - Load and render SummaryTab component
  - Handle loading and error states

**Dependencies**:
- Phase 6 API endpoints
- Existing UI components (Card, Badge, Dialog, Table)
- Document viewer infrastructure

**Files**:
- `components/data-room/summary/summary-tab.tsx`
- `components/data-room/summary/field-grid.tsx`
- `components/data-room/summary/coverage-indicator.tsx`
- `components/data-room/summary/confidence-badge.tsx`
- `components/data-room/summary/quality-issues-panel.tsx`
- `components/data-room/summary/export-dialog.tsx`
- `components/data-room/summary/template-selector.tsx`
- `app/data-rooms/[id]/documents/[docId]/page.tsx` (update)

---

## Phase 8: Testing
**Duration**: 2-3 days | **Complexity**: Medium

### Tasks

#### Unit Tests
- [ ] `lib/data-room/summaries/normalizers/field-normalizer.test.ts`
  - Test currency normalization ($1,000.00, USD 1000, etc.)
  - Test duration parsing (12 months, 1 year, etc.)
  - Test date parsing (various formats)
  - Test boolean normalization
  - Test enum validation

- [ ] `lib/data-room/summaries/quality-checker.test.ts`
  - Test coverage calculation
  - Test confidence averaging
  - Test quality issue detection

#### Integration Tests
- [ ] `lib/data-room/summaries/summary-service.test.ts`
  - Mock document with chunks
  - Mock template with fields
  - Test full extraction pipeline
  - Test quality gate behavior
  - Test error handling

- [ ] `lib/data-room/summaries/exports/*.test.ts`
  - Test JSON export structure
  - Test Excel workbook generation
  - Test Word document generation
  - Verify output file integrity

#### E2E Tests (Playwright)
- [ ] `tests/e2e/data-room-summaries.spec.ts`
  - Upload test document (MSA fixture)
  - Navigate to document viewer
  - Click Summary tab
  - Trigger summary extraction
  - Verify coverage and confidence displayed
  - Export to Excel
  - Export to Word
  - Verify downloads
  - Test quality gate failure scenario

**Dependencies**:
- Test fixtures (sample contracts in `tests/fixtures/`)
- Playwright setup
- Supabase test database

**Files**:
- `lib/data-room/summaries/normalizers/field-normalizer.test.ts`
- `lib/data-room/summaries/quality-checker.test.ts`
- `lib/data-room/summaries/summary-service.test.ts`
- `lib/data-room/summaries/exports/json-exporter.test.ts`
- `lib/data-room/summaries/exports/excel-exporter.test.ts`
- `lib/data-room/summaries/exports/word-exporter.test.ts`
- `tests/e2e/data-room-summaries.spec.ts`
- `tests/fixtures/sample-msa.pdf`

---

## Phase 9: Documentation & Monitoring
**Duration**: 1 day | **Complexity**: Simple

### Tasks
- [ ] Update `CLAUDE.md` with Structured Summaries feature
  - Add section describing the feature
  - Document API endpoints
  - List key files and components
  - Explain integration with Data Room

- [ ] Create analytics queries: `lib/data-room/summaries/analytics.sql`
  - Summary run success rate
  - Average extraction time by doc type
  - Coverage and confidence distributions
  - Quality issue frequency by template
  - Export format usage

- [ ] Add logging and monitoring
  - Log extraction start/end times
  - Log quality gate failures
  - Track export downloads
  - Monitor LLM API usage for summaries

**Files**:
- `CLAUDE.md` (update)
- `lib/data-room/summaries/analytics.sql`

---

## Technical Decisions

### 1. LLM Provider
**Decision**: Use OpenRouter with Claude Sonnet 3.5 (via existing LLM Manager)
**Rationale**:
- Already integrated in oppSpot
- Excellent for structured extraction with JSON schemas
- Good balance of speed and accuracy
- Fallback to other providers via LLM Manager

### 2. Template System
**Decision**: System templates for v1, custom templates in v2
**Rationale**:
- Reduce complexity for initial release
- Gather feedback on system templates first
- 4 templates cover 80% of use cases

### 3. Export Libraries
**Decision**:
- `xlsx` for Excel (battle-tested, widely used)
- `docx` for Word (modern, TypeScript-friendly)
**Rationale**:
- Avoid `docxtemplater` complexity for v1
- Direct library control for customization
- Good documentation and community support

### 4. Extraction Strategy
**Decision**: Hybrid (deterministic + LLM)
**Rationale**:
- Reuse existing extractions for speed and cost
- LLM fills gaps for completeness
- Best of both approaches

### 5. Quality Gates
**Decision**: Configurable per template, defaults to 85% coverage, 75% confidence
**Rationale**:
- Flexible enough for different doc types
- Strict enough to ensure quality
- Can be adjusted based on user feedback

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Extraction time (30-50 pg contract, reuse) | < 5s | Using cached extractions |
| Extraction time (30-50 pg contract, LLM) | < 10s | Full LLM extraction |
| Coverage for MSA | > 90% | With good quality documents |
| Average confidence | > 80% | Across all field types |
| Export generation | < 2s | All formats |
| API response time | < 500ms | For summary retrieval |

---

## Quality Gates

### Gate A: Coverage
- **Threshold**: 85% of required fields
- **Action**: Mark as `partial` if failed, show missing fields

### Gate B: Confidence
- **Threshold**: 75% average confidence
- **Action**: Mark as `partial` if failed, highlight low-confidence fields

### Gate C: Quality Issues
- **Threshold**: No high-severity issues
- **Action**: Block export if failed, require manual review

---

## Integration Points

### With Data Room Q&A
- **Reuse**: `document_chunks` table for vector retrieval
- **Reuse**: `document_pages` for page-level text
- **Reuse**: Existing chunk embedding infrastructure
- **Benefit**: No duplicate document processing

### With Contract Extractions (if exists)
- **Check**: Query for `contract_extractions` table
- **Map**: Summary field keys → extraction field_ids
- **Fallback**: Use LLM if table doesn't exist

### With Document Viewer
- **Integration**: Add Summary tab alongside existing tabs
- **Deep Link**: Evidence chips link to specific page/chunk
- **State**: Share document loading state

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM extraction is slow/expensive | High | Use hybrid approach, cache results, batch processing |
| Quality gates too strict | Medium | Make thresholds configurable, gather user feedback |
| Export libraries have bugs | Low | Thorough testing, handle errors gracefully |
| Template design doesn't fit all contracts | Medium | Start with common types, iterate based on feedback |
| RLS policies too complex | Medium | Test thoroughly, use existing data room access patterns |
| Large documents timeout | High | Add pagination, background jobs for large docs |

---

## Rollout Plan

### Internal Testing (Week 1-2)
- Use on sample contracts from test data
- Validate quality gates with real documents
- Test all export formats
- Gather feedback from internal team

### Beta Release (Week 3-4)
- Enable for select customers
- Monitor extraction accuracy
- Track usage metrics
- Collect feedback

### General Availability (Week 5+)
- Full rollout to all users
- Documentation and training materials
- Marketing announcement

---

## Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Feature adoption rate | 40% of active data rooms | 3 months |
| Average extraction accuracy | > 85% | Ongoing |
| Export usage | 60% of summaries exported | 3 months |
| User satisfaction (NPS) | > 8/10 | 3 months |
| Time saved vs manual review | > 70% | 3 months |

---

## Future Enhancements (v2)

1. **Custom Templates**
   - Allow orgs to create custom templates
   - Field editor UI
   - Template versioning

2. **OCR Support**
   - Extract from image-based PDFs
   - Integrate OCR service (Textract, Google Vision)

3. **Reconciliation Workflow**
   - Review and approve extracted values
   - Override incorrect extractions
   - Approval workflow

4. **Batch Processing**
   - Extract summaries for multiple documents
   - Bulk export to single Excel file
   - Comparative analysis across documents

5. **Advanced Analytics**
   - Contract comparison dashboard
   - Trend analysis (terms, pricing)
   - Risk assessment based on extracted clauses

6. **PDF Export**
   - Use `@react-pdf/renderer`
   - Professional PDF reports
   - Custom branding

---

## File Structure Summary

```
oppspot/
├── supabase/
│   └── migrations/
│       └── 20251031_structured_summaries.sql
│   └── seeds/
│       └── summary_templates.sql
├── lib/
│   └── data-room/
│       └── summaries/
│           ├── types.ts
│           ├── summary-service.ts
│           ├── quality-checker.ts
│           ├── analytics.sql
│           ├── extractors/
│           │   ├── base-extractor.ts
│           │   ├── contract-reuse-extractor.ts
│           │   └── llm-extractor.ts
│           ├── normalizers/
│           │   ├── field-normalizer.ts
│           │   └── field-normalizer.test.ts
│           ├── repository/
│           │   └── summary-repository.ts
│           └── exports/
│               ├── export-manager.ts
│               ├── json-exporter.ts
│               ├── excel-exporter.ts
│               ├── word-exporter.ts
│               └── *.test.ts
├── app/
│   └── api/
│       └── data-rooms/
│           └── [roomId]/
│               ├── summary-templates/
│               │   └── route.ts
│               └── documents/
│                   └── [docId]/
│                       └── summary/
│                           ├── route.ts
│                           ├── run/
│                           │   └── route.ts
│                           └── export/
│                               └── route.ts
│   └── data-rooms/
│       └── [id]/
│           └── documents/
│               └── [docId]/
│                   └── page.tsx (update)
├── components/
│   └── data-room/
│       └── summary/
│           ├── summary-tab.tsx
│           ├── field-grid.tsx
│           ├── coverage-indicator.tsx
│           ├── confidence-badge.tsx
│           ├── quality-issues-panel.tsx
│           ├── export-dialog.tsx
│           └── template-selector.tsx
└── tests/
    ├── e2e/
    │   └── data-room-summaries.spec.ts
    └── fixtures/
        └── sample-msa.pdf
```

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Database | 1-2 days | None |
| Phase 2: Types | 1 day | Phase 1 |
| Phase 3: Extractors | 3-4 days | Phase 2 |
| Phase 4: Orchestration | 2-3 days | Phase 3 |
| Phase 5: Exports | 2-3 days | Phase 4 |
| Phase 6: APIs | 2 days | Phase 4, 5 |
| Phase 7: UI | 3-4 days | Phase 6 |
| Phase 8: Testing | 2-3 days | All phases |
| Phase 9: Documentation | 1 day | All phases |
| **Total** | **17-25 days** | **~3-5 weeks** |

---

## Next Steps

1. ✅ Review and approve this plan
2. ⬜ Set up project tracking (GitHub Issues/Project Board)
3. ⬜ Create feature branch: `feature/structured-summaries`
4. ⬜ Start with Phase 1 (Database Schema)
5. ⬜ Weekly check-ins on progress
6. ⬜ Demo after Phase 7 (UI) completion

---

*Last Updated: 2025-10-31*
*Version: 1.0*
*Status: Planning Complete - Ready for Implementation*
