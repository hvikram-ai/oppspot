# Structured Smart Summaries - User Guide

## What is Smart Summary?

**Structured Smart Summaries** is an AI-powered feature that automatically extracts structured key points from contracts and corporate documents. Instead of manually reading through pages of text, get organized, machine-readable data with confidence scores and evidence citations.

---

## Quick Start (3 Steps)

### 1. Upload a Document
- Navigate to your Data Room
- Upload a contract (MSA, NDA, Order Form) or corporate document
- Wait for initial AI analysis to complete

### 2. Run Smart Summary
- Open the document viewer
- Click the **"Smart Summary"** tab in the AI Insights sidebar
- Click **"Run Summary"** button
- Select a template (MSA, NDA, Order Form, etc.)
- Wait 15-45 seconds for extraction

### 3. Review & Export
- View extracted fields with confidence scores
- Click evidence citations to jump to source text
- Export to JSON, Excel, or Word format

---

## Supported Document Types

### Contracts
- **Master Service Agreements (MSAs)**: 20 fields including parties, terms, fees, SLA, liability
- **Non-Disclosure Agreements (NDAs)**: 10 fields including parties, term, confidentiality obligations
- **Order Forms / SOWs**: 10 fields including products, pricing, delivery terms

### Corporate Documents
- **Corporate Profiles**: 13 fields including overview, products, leadership, locations
- **Policies** (HR, IT, Security): 11 fields including scope, requirements, enforcement

---

## Using the Smart Summary Feature

### Step 1: Navigate to Document Viewer

1. Open your Data Room
2. Click on any document in the list
3. The document viewer will open with PDF on the left, AI Insights sidebar on the right

### Step 2: Access Smart Summary Tab

1. In the AI Insights sidebar header, you'll see two tabs:
   - **Insights**: Traditional AI analysis (classification, metadata)
   - **Smart Summary**: Structured field extraction ← Click this

### Step 3: Run Extraction

**If No Summary Exists:**
1. You'll see a "No Smart Summary Yet" message
2. Click the **"Run Summary"** button
3. A dialog will open with template options

**Select Template:**
- Choose the template that matches your document type:
  - **MSA** for Master Service Agreements
  - **NDA** for Non-Disclosure Agreements
  - **Order Form** for purchase orders or SOWs
  - **Corporate Profile** for company overview documents
  - **Policy** for HR/IT/Security policies

**Force Re-run (Optional):**
- Check "Force re-run" to extract even if a summary already exists
- Useful if the document was updated or previous extraction was incomplete

**Click "Run Summary":**
- Extraction will start immediately
- You'll see a toast notification: "Summary extraction started"
- The process takes 15-45 seconds depending on document length

### Step 4: Monitor Progress

**Status Indicators:**
- **Running**: AI is extracting fields (progress updates every 3 seconds)
- **Success**: Extraction completed, quality gates passed
- **Partial**: Extraction completed, but some required fields missing
- **Error**: Extraction failed (retry or contact support)

**Progress Display:**
- Coverage: Percentage of required fields filled
- Confidence: Average confidence across all fields
- Quality Pass: Whether quality gates (85% coverage, 75% confidence) were met

### Step 5: Review Extracted Data

**Summary View Sections:**

**1. Quality Metrics (Top Card)**
- **Coverage**: XX% of required fields filled
- **Avg. Confidence**: XX% average confidence
- **Quality Pass**: ✅ Pass or ❌ Fail
- **Extraction Time**: Duration in milliseconds
- **Extraction Method**: Reuse (fast) vs LLM (AI-powered)

**2. Field Values Table**
Displays all extracted fields with:
- **Field Name**: What was extracted (e.g., "Parties - Provider")
- **Value**: The extracted data
- **Confidence**: 0-100% confidence score
  - 🟢 Green (80-100%): High confidence
  - 🟡 Yellow (60-79%): Medium confidence
  - 🔴 Red (0-59%): Low confidence, requires manual review
- **Method**: How it was extracted
  - **Reuse**: From existing contract extractions (fastest, most reliable)
  - **LLM**: AI-powered extraction via Claude 3.5 Sonnet
  - **Manual**: User-entered data
- **Evidence**: Click to view source citation

**3. Evidence Viewer**
- Click any evidence badge to expand citation details
- Shows:
  - Page number
  - Chunk index
  - Text excerpt (the actual source text)
  - Reasoning (why the AI chose this value)

**4. Quality Issues**
If quality gates failed, this section shows:
- **Missing Fields**: Required fields not extracted
- **Low Confidence**: Fields below confidence threshold
- **Validation Errors**: Values that don't meet validation rules
- **Severity**: High/Medium/Low
- **Remediation**: Suggestions for fixing

### Step 6: Export Summary

**Click "Export" Button:**
- Located at the bottom of the summary view
- Select export format:
  - **JSON**: Machine-readable, includes all data
  - **Excel**: Multi-sheet workbook with formatting
  - **Word**: Professional document with color-coded indicators

**Export Options:**
- **Include Evidence**: Adds citation details to export
- **Include Quality Issues**: Adds quality problem details
- **Compact Format** (JSON only): Minified for smaller file size

**Download:**
- File downloads immediately
- Filename format: `{DocType}_Summary_{Date}.{ext}`
- Example: `MSA_Summary_2025-11-07.xlsx`

---

## Understanding Quality Gates

### What Are Quality Gates?

Quality gates ensure extraction results meet minimum standards before marking as "success". They prevent low-quality extractions from being treated as complete.

### Quality Gate Thresholds

**Coverage: ≥85%**
- Percentage of required fields successfully filled
- Formula: (Fields with values) / (Total required fields)
- Example: If template has 20 required fields, need at least 17 filled

**Confidence: ≥75%**
- Average confidence score across all extracted fields
- Formula: Sum(field confidences) / Count(fields)
- Example: If 20 fields average 78% confidence, passes gate

### Quality Pass vs. Partial

**✅ Success (Quality Pass = True)**
- Coverage ≥ 85%
- Confidence ≥ 75%
- No high-severity validation errors
- Ready for use, minimal manual review needed

**⚠️ Partial (Quality Pass = False)**
- Coverage < 85% OR Confidence < 75%
- Some required fields missing
- Requires manual review and data entry
- Still useful, but incomplete

**❌ Error**
- Extraction failed completely
- Technical error (timeout, API failure, etc.)
- Retry or contact support

---

## Field Types & Normalization

### Supported Field Types

**1. String**
- Plain text values
- Example: Company name, address, description
- Validation: Length, pattern matching

**2. Number**
- Numeric values
- Example: Revenue, employee count, percentage
- Validation: Min/max range, precision

**3. Boolean**
- Yes/No, True/False
- Example: Auto-renewal, termination for cause allowed
- Accepts: "yes", "true", "1" → true | "no", "false", "0" → false

**4. Date**
- Calendar dates
- Example: Effective date, termination date
- Output: ISO8601 format (YYYY-MM-DD)
- Accepts: Various formats (MM/DD/YYYY, DD-MM-YYYY, "January 1, 2025")

**5. Enum**
- Allowed values from predefined list
- Example: Dispute resolution (litigation, arbitration, mediation)
- Validation: Case-insensitive matching

**6. Currency**
- Monetary amounts
- Example: Liability cap, total amount
- Format: 2 decimal places, currency symbol removed
- Example: "$1,000,000.00" → 1000000.00

**7. Duration**
- Time periods
- Example: Term length, notice period
- Output: Standardized unit (months by default)
- Accepts: "12 months", "1 year", "90 days"

**8. RichText**
- Markdown-formatted text
- Example: Long descriptions, clauses
- Preserves formatting

**9. JSON**
- Complex objects/arrays
- Example: Product lists, hierarchical data
- Validation: Valid JSON structure

---

## Confidence Scoring

### How Confidence is Calculated

**Reuse Extractor (0.85-0.95)**
- High confidence because data comes from existing verified extractions
- Confidence adjusted based on value quality:
  - -0.05 if contains "unknown", "n/a", "tbd"
  - -0.05 if value looks incomplete

**LLM Extractor (0.60-0.95)**
- Dynamic confidence based on:
  - **Evidence strength**: How clear the source text is
  - **Value consistency**: Whether multiple sources agree
  - **Field complexity**: Simple fields (dates) higher than complex (clauses)
- Claude 3.5 Sonnet provides initial confidence
- Adjusted based on validation rules

**Manual Entry (1.00)**
- User-entered values have 100% confidence
- Assumes human verification

### Interpreting Confidence Scores

- **90-100%**: Very high confidence, use as-is
- **80-89%**: High confidence, spot check recommended
- **70-79%**: Medium confidence, review recommended
- **60-69%**: Low-medium confidence, manual review required
- **0-59%**: Low confidence, verify and correct

---

## Extraction Methods

### Hybrid Extraction Strategy

Smart Summary uses a **3-tier approach** to maximize speed and accuracy:

**Tier 1: Reuse (Priority 0.95)**
- Checks if document already has `contract_extractions` data
- Reuses existing verified extractions
- **Fastest**: <1 second per field
- **Most reliable**: Human-verified data
- **Example**: If MSA was previously processed, reuse party names, dates, amounts

**Tier 2: LLM Extraction (Priority 0.60)**
- Uses Claude 3.5 Sonnet for missing fields
- Searches document chunks using vector similarity
- Extracts value, confidence, and evidence
- **Accurate**: 85-95% accuracy
- **Slower**: 3-8 seconds per field
- **Example**: Extracts "Governing Law" clause from contract text

**Tier 3: Manual (Priority 1.00)**
- User fills in missing or low-confidence fields
- 100% confidence (human verification)
- **Future enhancement**: Not yet implemented in UI

### Parallel vs. Sequential Extraction

**Parallel Extraction (Default)**
- Extracts multiple fields simultaneously
- Faster total extraction time (15-30 seconds)
- Uses API concurrency limits

**Sequential Extraction (Fallback)**
- Extracts one field at a time
- Slower but more reliable for rate-limited APIs
- Automatic fallback if parallel fails

---

## Export Formats

### JSON Export

**Full Export:**
```json
{
  "template": {
    "key": "msa_standard",
    "title": "Master Service Agreement",
    "version": "1.0"
  },
  "summary": {
    "coverage": 0.87,
    "avg_confidence": 0.78,
    "quality_pass": true
  },
  "fields": [
    {
      "key": "parties_provider",
      "title": "Service Provider",
      "value": "Acme Corp",
      "confidence": 0.92,
      "evidence": {
        "page_number": 1,
        "text": "This Agreement is entered into by Acme Corp..."
      }
    }
  ],
  "quality_issues": []
}
```

**Compact Export:**
```json
{
  "parties_provider": "Acme Corp",
  "parties_customer": "Example Inc",
  "effective_date": "2025-01-01",
  "term_length": 12
}
```

### Excel Export (.xlsx)

**Sheet 1: Summary**
| Metric | Value |
|--------|-------|
| Document | MSA_Contract.pdf |
| Template | Master Service Agreement |
| Coverage | 87% |
| Avg. Confidence | 78% |
| Quality Pass | ✅ Pass |
| Extraction Time | 25.4s |

**Sheet 2: Field Values**
| Field | Value | Confidence | Method | Evidence |
|-------|-------|------------|--------|----------|
| Service Provider | Acme Corp | 92% | Reuse | Page 1: "This Agreement..." |
| Customer | Example Inc | 92% | Reuse | Page 1: "entered into by..." |

**Sheet 3: Quality Issues**
| Field | Issue | Severity | Remediation |
|-------|-------|----------|-------------|
| SLA Uptime | Missing required field | High | Add value manually |

**Features:**
- Professional formatting with bold headers
- Auto-filter on all tables
- Color-coded severity (🔴 Red, 🟡 Orange, 🟢 Green)
- Frozen header rows

### Word Export (.docx)

**Structure:**
1. **Cover Page**: Title, template info, date
2. **Summary Section**: Quality metrics with color indicators
3. **Field Values Table**: All fields with confidence bars
4. **Quality Issues Section**: Grouped by severity

**Features:**
- Heading styles (Title, H1, H2)
- Color-coded text (red/orange/green for severity)
- Table formatting with borders
- Professional spacing and alignment

---

## Troubleshooting

### "Run Summary" Button Disabled

**Cause**: Templates not loaded yet
**Solution**: Wait a few seconds for templates to load from API

### Extraction Takes >60 Seconds

**Cause**: Large document (>50 pages) or API rate limiting
**Solution**:
- Wait for completion (timeout is 2 minutes per field)
- If fails, try again later when API rate limits reset

### Low Coverage (<85%)

**Causes**:
- Document doesn't match template (e.g., NDA template on MSA document)
- Document is poorly formatted (scanned images, handwritten)
- Required data not present in document

**Solutions**:
- Select correct template for document type
- Use OCR-processed documents (not scanned images)
- Accept "Partial" status and manually fill missing fields

### Low Confidence (<75%)

**Causes**:
- Ambiguous language in document
- Multiple conflicting values (e.g., two different effective dates)
- Non-standard formatting

**Solutions**:
- Review evidence citations to understand AI reasoning
- Manually verify low-confidence fields
- Correct incorrect values via manual entry

### Export Download Fails

**Cause**: Summary too large (>10MB)
**Solution**:
- Export to JSON first (smaller file size)
- Uncheck "Include Evidence" option
- Contact support for custom export limits

### Polling Never Completes

**Cause**: Run status stuck at "running"
**Solution**:
- Refresh the page
- Check browser console for errors
- If persists >5 minutes, contact support

---

## Best Practices

### Document Preparation

**1. Use Clean PDFs**
- Upload native PDFs (not scanned images)
- Ensure text is selectable
- Avoid password-protected files

**2. Match Template to Document**
- MSA template for Master Service Agreements
- NDA template for Non-Disclosure Agreements
- Order Form for purchase orders or SOWs

**3. Standard Formatting**
- Use well-structured documents with clear sections
- Standard legal language works best
- Avoid heavily customized or non-standard contracts

### Review Process

**1. Check Quality Metrics First**
- If Coverage ≥ 85% AND Confidence ≥ 75%, spot check only
- If Partial, focus on missing/low-confidence fields

**2. Review High-Impact Fields**
- Parties (who is involved)
- Dates (when does it start/end)
- Amounts (financial obligations)
- Liability caps (risk exposure)

**3. Verify Low-Confidence Fields**
- Any field <75% confidence should be manually verified
- Click evidence to see source text
- Correct if AI misinterpreted

**4. Export for Records**
- Always export to Excel or Word for offline review
- Include evidence for audit trail
- Store exports with original documents

### Bulk Processing

**For Multiple Documents:**
1. Upload all documents to Data Room first
2. Run summaries on high-priority contracts first (MSAs, key NDAs)
3. Review and correct extractions before moving to next batch
4. Export all summaries at once for comparative analysis

---

## FAQ

**Q: Can I customize templates?**
A: Yes! Org admins can create custom templates with org-specific fields. System templates (MSA, NDA, etc.) cannot be modified but can be cloned and customized.

**Q: What languages are supported?**
A: Currently English only. Multi-language support planned for future release.

**Q: How is my data secured?**
A: All extractions are encrypted at rest and in transit. Row Level Security (RLS) ensures you only access your org's data. AI processing uses enterprise-grade APIs with no data retention.

**Q: Can I edit extracted values?**
A: Manual editing UI is planned for future release. Currently, you can export to Excel, edit there, and re-import if needed.

**Q: How accurate is the extraction?**
A: 85-95% accuracy for well-formatted contracts. Accuracy varies by document quality, template match, and field complexity. Always review low-confidence fields.

**Q: What happens if quality gates fail?**
A: Summary is marked "Partial" but still usable. You can review missing fields in Quality Issues section and manually add missing data via export/import workflow.

**Q: Can I re-run extraction?**
A: Yes! Check "Force re-run" when clicking "Run Summary". Useful if document was updated or previous extraction was incomplete.

**Q: How long are summaries stored?**
A: Indefinitely, unless you delete them. Summaries are tied to document lifecycle - deleting document deletes all summaries.

---

## Support

**Need Help?**
- **Documentation**: See `/docs/STRUCTURED_SMART_SUMMARIES_PLAN.md` for technical details
- **API Reference**: See `/app/api/data-room/summaries/` for API endpoints
- **Issues**: Report bugs via GitHub Issues
- **Questions**: Contact support@oppspot.com

**Feature Requests:**
- Multi-language support
- Custom field types
- Manual value editing UI
- Batch export for entire Data Room
- Template marketplace

---

**Last Updated**: 2025-11-07
**Version**: 1.0
**Status**: Production Ready
