# Research & Technical Decisions: Red Flag Radar

**Feature**: Red Flag Radar (Explainable Risk Detection)
**Date**: 2025-10-29
**Status**: Complete

## Executive Summary

This document consolidates research findings and technical decisions for implementing Red Flag Radar, an AI-powered risk detection system. All major architectural decisions are documented with rationale, alternatives considered, and implementation guidance.

---

## 1. Detector Architecture Pattern

### Decision: Promise.allSettled with Timeout Guards

**Rationale**:
- Simple, maintainable pattern for parallel execution
- Built-in error isolation (one detector failure doesn't affect others)
- Easy to extend with new detectors
- No external dependencies (worker pools, queues)
- Fits oppSpot's serverless deployment model (Vercel Edge Functions)

**Implementation Pattern**:
```typescript
async function runDetectors(entityId: string, entityType: string): Promise<DetectorResult[]> {
  const detectors = [
    financialDetector,
    legalDetector,
    operationalDetector,
    cyberDetector,
    esgDetector
  ];

  const results = await Promise.allSettled(
    detectors.map(d => d.detect(entityId, entityType))
  );

  return results.map((result, idx) => ({
    detector: detectors[idx].name,
    status: result.status === 'fulfilled' ? 'success' : 'error',
    flags: result.status === 'fulfilled' ? result.value : [],
    error: result.status === 'rejected' ? result.reason : null
  }));
}
```

**Alternatives Considered**:
- **Worker Pool**: Too complex for initial implementation; adds operational overhead; not needed given expected load (<100 detection runs/hour)
- **Queue System (BullMQ)**: Overkill for v1; adds Redis dependency; better suited for Phase 2 if scale requires it
- **Sequential Execution**: Too slow; 5 detectors × 2s each = 10s vs 2s parallel

**Performance Characteristics**:
- Expected runtime: 2-5s for all detectors (parallel)
- Timeout per detector: 10s
- Graceful degradation: Partial results returned if some detectors fail

---

## 2. Fingerprinting Algorithm

### Decision: SHA-256 Hash of Normalized Attributes

**Rationale**:
- Stable, deterministic hashing
- Low collision rate
- Fast computation
- Supports incremental updates

**Normalization Strategy**:
```typescript
function generateFingerprint(flag: Partial<RedFlag>): string {
  const normalized = {
    category: flag.category.toLowerCase(),
    title: normalizeText(flag.title),
    entityId: flag.entity_id,
    // Key attributes that define uniqueness
    keyAttributes: sortObject(extractKeyAttributes(flag))
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')
    .substring(0, 16); // 16 chars sufficient for uniqueness
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ''); // Remove punctuation
}
```

**Key Attributes by Category**:
- **Financial**: metric name, threshold, customer/vendor ID
- **Legal**: clause type, contract ID, party names
- **Operational**: SLA ID, metric type, threshold
- **Cyber**: incident type, asset ID, CVE ID
- **ESG**: disclosure topic, metric name, reporting period

**Alternatives Considered**:
- **Fuzzy Matching (Levenshtein)**: Too slow for 1000+ flags; false positives on similar but distinct issues
- **Simple String Concat**: Fragile to formatting changes; no semantic understanding
- **Semantic Embeddings**: Overkill for v1; adds ML model dependency; better for Phase 2 if needed

**Deduplication Logic**:
- Fingerprint match → Update existing flag
- If severity increases → Update + trigger alert
- If severity decreases → Update + log action
- Merge evidence from both instances

---

## 3. LLM Classification Patterns

### Decision: Structured Prompt with Few-Shot Examples + Citation Extraction

**Rationale**:
- OpenRouter with Claude Sonnet 3.5 provides reliable JSON output
- Few-shot examples improve consistency (legal/cyber domain)
- Citation extraction ensures traceability
- Confidence scoring via logprobs (if available) or prompt-based

**Legal Clause Detection Prompt**:
```typescript
const legalPrompt = `You are a legal risk analyst. Review the following contract excerpt and identify high-risk clauses.

EXAMPLES:
1. Input: "Customer may terminate this agreement for convenience with 30 days notice."
   Output: {
     "flag": true,
     "category": "legal",
     "severity": "high",
     "confidence": 0.85,
     "title": "Termination for Convenience Risk",
     "evidence": "Customer may terminate...30 days notice",
     "explanation": "This clause allows unilateral termination without cause, creating revenue risk."
   }

2. Input: "Pricing shall not exceed most favored nation terms."
   Output: {
     "flag": true,
     "category": "legal",
     "severity": "medium",
     "confidence": 0.90,
     "title": "Most Favored Nation Clause Present",
     "evidence": "Pricing shall not exceed...terms",
     "explanation": "MFN clauses limit pricing flexibility and may trigger repricing obligations."
   }

CONTRACT EXCERPT:
{documentChunk}

TASK: Analyze for change-of-control requirements, termination rights, MFN clauses, and assignment restrictions. Return JSON array of findings or empty array if none.`;
```

**Cyber Policy Gap Detection Prompt**:
```typescript
const cyberPrompt = `You are a cybersecurity auditor. Analyze the following policy documentation for gaps.

REQUIRED POLICIES:
- Incident Response Plan
- Data Classification Policy
- Access Control Policy
- Encryption Standards
- Vulnerability Management
- Security Awareness Training

DOCUMENT:
{documentChunk}

TASK: Identify which required policies are missing or inadequately covered. For each gap, return:
{
  "flag": true,
  "category": "cyber",
  "severity": "high" | "medium" | "low",
  "confidence": 0.0-1.0,
  "title": "Missing [Policy Name]",
  "evidence": "Relevant excerpt showing gap",
  "explanation": "Why this gap matters and potential impact"
}`;
```

**Confidence Calibration**:
- High confidence (0.8-1.0): Explicit language match
- Medium confidence (0.5-0.8): Implied or partial match
- Low confidence (0.0-0.5): Ambiguous or context-dependent

**Alternatives Considered**:
- **Fine-tuned Model**: Too expensive/complex for v1; no training data available yet
- **Zero-shot Only**: Less consistent; confidence scores unreliable
- **Rule-based NLP**: Brittle; can't handle contract language variation

**Integration with Research GPT**:
- Reuse existing `lib/research-gpt` infrastructure
- Cache LLM responses by (documentId, chunkIndex, promptVersion)
- 6-hour TTL for dynamic content, 7 days for static docs

---

## 4. Evidence Linking Strategy

### Decision: Hybrid Resolution with Evidence Type Registry

**Rationale**:
- Different evidence types require different retrieval strategies
- Registry pattern allows easy extension
- Optimized queries per evidence type
- Caching at evidence resolver level

**Evidence Type Resolver Pattern**:
```typescript
interface EvidenceResolver {
  type: EvidenceType;
  resolve(sourceId: string): Promise<EvidenceMetadata>;
}

class DocumentEvidenceResolver implements EvidenceResolver {
  type = 'document';

  async resolve(sourceId: string): Promise<EvidenceMetadata> {
    // Query document_chunks via pgvector
    const chunk = await supabase
      .from('document_chunks')
      .select('*, documents(*)')
      .eq('id', sourceId)
      .single();

    return {
      title: chunk.documents.title,
      preview: chunk.content.substring(0, 200),
      citation: {
        documentId: chunk.document_id,
        pageNumber: chunk.metadata.page,
        chunkIndex: chunk.metadata.chunk_index
      },
      url: `/documents/${chunk.document_id}?page=${chunk.metadata.page}`
    };
  }
}

class AlertEvidenceResolver implements EvidenceResolver {
  type = 'alert';

  async resolve(sourceId: string): Promise<EvidenceMetadata> {
    const alert = await supabase
      .from('alerts')
      .select('*')
      .eq('id', sourceId)
      .single();

    return {
      title: alert.title,
      preview: alert.description,
      citation: { alertId: alert.id, severity: alert.severity },
      url: `/alerts/${alert.id}`
    };
  }
}
```

**Cache Strategy**:
- Cache key: `evidence:${type}:${sourceId}`
- TTL: 1 hour (evidence metadata rarely changes)
- Invalidation: On source update/deletion
- Use Redis or Supabase cache table

**pgvector Optimization**:
- Cosine similarity search for related chunks
- Prefilter by document_id for performance
- Limit to top 5 most relevant chunks per flag

**Cross-Table Join Optimization**:
- Use prepared statements for common queries
- Index on (evidence_type, source_id)
- Batch evidence resolution (max 50 per query)

**Alternatives Considered**:
- **Single Resolver with Switch Statement**: Not extensible; hard to test
- **GraphQL DataLoader**: Overkill for current scale; adds complexity
- **Direct Embedding in Flag Record**: Denormalization risks; large payload

---

## 5. Export Generation Performance

### Decision: react-pdf with Streaming for PDF, Fast-CSV for CSV

**Rationale**:
- react-pdf: Pure JS, works in Edge Functions, supports React components
- Streaming approach: Handles large exports (1000+ flags) efficiently
- Fast-CSV: Fastest CSV library for Node.js
- Template-based: Reusable board-ready formats

**PDF Generation Pattern**:
```typescript
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

async function generatePDF(flags: RedFlag[]): Promise<Buffer> {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Summary page */}
        <View style={styles.summary}>
          <Text style={styles.title}>Red Flag Radar Report</Text>
          <Text>Critical: {flags.filter(f => f.severity === 'critical').length}</Text>
          <Text>High: {flags.filter(f => f.severity === 'high').length}</Text>
        </View>

        {/* Category sections */}
        {['financial', 'legal', 'operational', 'cyber', 'esg'].map(category => (
          <View key={category} style={styles.section}>
            <Text style={styles.categoryHeader}>{category.toUpperCase()}</Text>
            {flags.filter(f => f.category === category).map(flag => (
              <View key={flag.id} style={styles.flagCard}>
                <Text style={styles.flagTitle}>{flag.title}</Text>
                <Text style={styles.flagDescription}>{flag.description}</Text>
                <Text style={styles.explanation}>{flag.meta.explainer?.why}</Text>
                <Text style={styles.remediation}>
                  Remediation: {flag.meta.explainer?.suggested_remediation}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );

  const asPdf = pdf(doc);
  return asPdf.toBuffer();
}
```

**CSV Generation Pattern**:
```typescript
import { stringify } from 'csv-stringify/sync';

function generateCSV(flags: RedFlag[]): string {
  const records = flags.map(flag => ({
    id: flag.id,
    category: flag.category,
    severity: flag.severity,
    confidence: flag.confidence,
    title: flag.title,
    status: flag.status,
    first_detected: flag.first_detected_at,
    last_updated: flag.last_updated_at,
    explanation: flag.meta.explainer?.why || '',
    remediation: flag.meta.explainer?.suggested_remediation || '',
    evidence_count: flag.evidence?.length || 0
  }));

  return stringify(records, {
    header: true,
    columns: {
      id: 'ID',
      category: 'Category',
      severity: 'Severity',
      confidence: 'Confidence',
      title: 'Title',
      status: 'Status',
      first_detected: 'First Detected',
      last_updated: 'Last Updated',
      explanation: 'Explanation',
      remediation: 'Remediation',
      evidence_count: 'Evidence Count'
    }
  });
}
```

**Performance Optimizations**:
- Lazy load evidence (don't include full evidence in export query)
- Batch generate PDF sections (stream to response)
- Target: <5s for 500 flags, <15s for 1000+ flags
- Background job for very large exports (>2000 flags)

**Alternatives Considered**:
- **Puppeteer**: Requires Chrome binary; slow; high memory; doesn't work in Edge Functions
- **pdfkit**: Lower-level; more control but more code; no React components
- **Server-side HTML → Gotenberg**: Adds service dependency; network latency

---

## 6. Real-time vs Batch Detection

### Decision: On-Demand + Scheduled Batch with Event Triggers

**Rationale**:
- Hybrid approach balances freshness and performance
- On-demand: User-triggered via "Recompute" button (editor/admin only)
- Scheduled: Daily batch for all entities (off-peak hours)
- Event-driven: Trigger on significant data changes (new documents, KPI updates)

**Trigger Patterns**:

1. **Manual Trigger** (POST /api/.../red-flags/recompute):
   ```typescript
   // Immediate execution, returns 202 Accepted + run_id
   // Client polls /api/.../red-flags/runs/[runId] for status
   ```

2. **Scheduled Batch** (Cron job via Vercel Cron or Supabase Edge Functions):
   ```sql
   -- Run daily at 2 AM UTC
   SELECT entity_type, entity_id
   FROM (
     SELECT DISTINCT entity_type, entity_id FROM companies
     UNION
     SELECT DISTINCT entity_type, entity_id FROM data_rooms
   ) entities
   WHERE NOT EXISTS (
     SELECT 1 FROM red_flag_runs
     WHERE red_flag_runs.entity_id = entities.entity_id
     AND red_flag_runs.started_at > NOW() - INTERVAL '24 hours'
   );
   ```

3. **Event Triggers**:
   - Document upload → Trigger detection after processing
   - KPI update (thresholds crossed) → Trigger financial/operational detectors
   - News item added → Trigger ESG detector
   - Use Supabase Database Webhooks or triggers

**Rate Limiting**:
- Max 1 detection run per entity per 10 minutes
- Max 10 concurrent runs per organization
- Queue overflow → return 429 Too Many Requests

**Alternatives Considered**:
- **Real-time Streaming**: Complex; unnecessary for risk detection use case; alerts handle urgency
- **Batch-only**: Poor UX; users want instant feedback when investigating
- **Event-driven only**: Misses periodic checks for slowly-changing risks

---

## 7. Additional Decisions from Implementation Spec

### 7.1 Alert Severity Mapping

**Decision**: Critical→P1, High→P2, Medium→P3, Low→no alert

**Rationale**:
- Aligns with existing `lib/alerts/alert-service.ts` severity levels
- Prevents alert fatigue (Low flags don't trigger notifications)
- P1 = immediate attention, P2 = same-day, P3 = next sprint

### 7.2 Evidence Types

**Decision**: document, alert, signal, kpi, news

**Rationale**:
- Covers all risk detection sources
- Each type has dedicated resolver (see Section 4)
- Extensible (can add 'email', 'chat', etc. later)

### 7.3 Flag Categories

**Decision**: financial, legal, operational, cyber, esg

**Rationale**:
- Matches common due diligence workstreams
- Each category has dedicated detector
- Aligns with board reporting structure

### 7.4 Status States

**Decision**: open, reviewing, mitigating, resolved, false_positive

**Rationale**:
- Reflects typical risk workflow
- 'false_positive' critical for ML feedback loop
- State transitions logged in red_flag_actions

### 7.5 Explainability Caching

**Decision**: Cache in red_flags.meta.explainer JSONB column

**Rationale**:
- Denormalization acceptable (explanations tied to flag version)
- Fast retrieval (no join required)
- Includes cache metadata: model, timestamp, inputs_hash

**Cache Invalidation**:
- New evidence added → Regenerate explanation
- Evidence updated → Check inputs_hash, regenerate if changed
- Detector version change → Mark all explanations stale

---

## 8. Technology Stack Summary

### Core Dependencies
- **Next.js 15**: App Router for API + UI
- **Supabase**: PostgreSQL + pgvector + Auth + RLS
- **OpenRouter**: Claude Sonnet 3.5 for LLM classification
- **Tailwind CSS**: Styling
- **shadcn/ui**: UI component library
- **Zustand**: Client state management
- **Playwright**: E2E testing

### New Dependencies Required
- **@react-pdf/renderer**: PDF generation (`npm install @react-pdf/renderer`)
- **csv-stringify**: CSV export (`npm install csv-stringify`)
- **zod**: Runtime validation (already in project)

### Integration Points
- **lib/alerts/alert-service.ts**: Emit alerts on flag detection
- **lib/research-gpt**: Generate explanations and remediation suggestions
- **lib/ai/rag**: Citation extraction from document chunks
- **document_chunks table**: pgvector evidence linking

---

## 9. Performance Targets & Validation

### Targets
- Detection runtime: <10s for 12 months data + 5k docs (95th percentile)
- API reads: <300ms cached (99th percentile)
- Export generation: <5s for 500 flags, <15s for 1000+ flags
- List view rendering: <500ms (95th percentile)

### Validation Approach
- Load testing with k6 or Artillery
- Monitor with Vercel Analytics + Supabase Performance Insights
- Alert on P95 > 10s or P99 > 20s

### Optimization Levers (if needed)
1. Parallel detector execution (already planned)
2. Evidence caching (1-hour TTL)
3. Explanation caching (in meta column)
4. Pagination (50 flags per page)
5. Background jobs for large exports

---

## 10. Security & Compliance

### RLS Policies
- All tables: Row-level security enabled
- Policy: User can access flags if they have org membership or data room access
- Policy: Editors can update status/actions, viewers read-only
- Policy: Admins can trigger detection runs

### PII Scrubbing
- Evidence previews: Truncate to 200 chars, remove email/phone via regex
- Explanations: Prompt LLM to avoid PII in generated text
- Audit: Log all PII access via red_flag_actions

### Audit Trail
- All status changes logged in red_flag_actions
- Immutable table (no updates/deletes)
- Actor ID, timestamp, payload (JSON)
- Retention: 7 years (compliance requirement)

---

## 11. Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LLM classification inconsistency | High | Medium | Few-shot examples, confidence thresholds, human review flag |
| Slow detection (>30s) | Medium | Low | Parallel execution, timeouts, partial results |
| False positive rate >20% | High | Medium | Fingerprint tuning, feedback loop via 'false_positive' status |
| Evidence links broken | Medium | Low | Soft deletes, "unavailable" fallback, preserve metadata |
| Export timeout for large datasets | Low | Medium | Background jobs for >1000 flags, streaming |

---

## 12. Open Questions (Deferred to Implementation)

1. **Snooze duration semantics**: Fixed duration (7/30/90 days) vs condition-based (until next data update)?
   - **Recommendation**: Start with fixed durations, add condition-based in Phase 2

2. **Analyst override workflow**: In-line edit or modal form?
   - **Recommendation**: Modal with required justification (audit trail)

3. **Multi-language support**: English-only or translate to user locale?
   - **Recommendation**: English-only for v1, add i18n in Phase 2 if demand exists

4. **Digest frequency**: Daily, weekly, or configurable per user?
   - **Recommendation**: Daily by default, add user preferences in Phase 2

---

## Conclusion

All major technical decisions are documented and ready for implementation. Phase 1 (Design & Contracts) can proceed with confidence. Key architectural patterns:

1. **Parallel detection** with Promise.allSettled
2. **Fingerprint-based deduplication** with SHA-256
3. **Structured LLM prompts** with few-shot examples
4. **Evidence type registry** for flexible linking
5. **react-pdf streaming** for performant exports
6. **Hybrid trigger strategy** (on-demand + scheduled + events)

These decisions align with oppSpot's existing infrastructure and support the functional requirements defined in spec.md.
