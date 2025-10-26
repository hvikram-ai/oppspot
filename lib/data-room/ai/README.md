# Data Room AI Utilities

AI-powered document analysis tools for the Data Room feature.

## Overview

This module provides AI-powered document classification and metadata extraction capabilities for uploaded documents in the Data Room.

## Components

### 1. Text Extractor (`text-extractor.ts`)

Utilities for extracting text from various document formats.

**Key Functions:**
- `extractTextFromPDF(buffer)` - Extract text from PDF files
- `detectIfScanned(text)` - Detect if a PDF is scanned/image-based
- `cleanText(text)` - Normalize and clean extracted text
- `splitTextIntoChunks(text, maxSize)` - Split long text for AI processing
- `getTextStatistics(text)` - Get word count, sentence count, etc.

**Example:**
```typescript
import { extractTextFromPDF } from '@/lib/data-room/ai';

const pdfBuffer = await file.arrayBuffer();
const result = await extractTextFromPDF(Buffer.from(pdfBuffer));

console.log(result.text); // Extracted text
console.log(result.isScanned); // true if scanned document
console.log(result.pageCount); // Number of pages
```

### 2. Document Classifier (`document-classifier.ts`)

AI-powered document type classification using OpenRouter API.

**Document Types:**
- `financial` - Financial statements, P&L, balance sheets
- `contract` - Legal agreements, contracts, NDAs
- `due_diligence` - Due diligence reports, audits
- `legal` - Legal opinions, court documents, patents
- `hr` - Employment agreements, org charts
- `other` - Unclassified documents

**Example:**
```typescript
import { DocumentClassifier } from '@/lib/data-room/ai';

const classifier = new DocumentClassifier(process.env.OPENROUTER_API_KEY);

const result = await classifier.classify(extractedText, 'contract.pdf');

console.log(result.document_type); // 'contract'
console.log(result.confidence_score); // 0.95
console.log(result.reasoning); // AI explanation
```

**Features:**
- Confidence scoring (0-1)
- Alternative type suggestions
- Human review flagging for ambiguous documents
- Batch classification support

### 3. Metadata Extractor (`metadata-extractor.ts`)

AI-powered extraction of structured metadata from documents.

**Extracted Fields:**
- **Common**: dates, amounts, parties
- **Financial**: fiscal_period, revenue, costs
- **Contract**: effective_date, expiration_date, contract_value
- **Legal**: case_number, filing_date
- **HR**: start_date, salary, benefits

**Example:**
```typescript
import { MetadataExtractor } from '@/lib/data-room/ai';

const extractor = new MetadataExtractor(process.env.OPENROUTER_API_KEY);

const metadata = await extractor.extract(extractedText, 'contract');

console.log(metadata.effective_date); // '2024-01-15'
console.log(metadata.contract_parties); // ['Company A', 'Company B']
console.log(metadata.amounts); // [{ value: 1000000, currency: 'USD', context: 'Contract value' }]
```

**Features:**
- Type-specific extraction prompts
- Structured JSON output
- Date validation and normalization
- Currency and amount parsing
- Batch extraction support

## Edge Function

### Analyze Document (`supabase/functions/analyze-document/index.ts`)

Supabase Edge Function that orchestrates the complete document analysis pipeline.

**Workflow:**
1. Receive document_id via HTTP POST
2. Fetch document record from database
3. Download file from Supabase Storage
4. Extract text using pdf-parse
5. Classify document using AI
6. Extract metadata using AI
7. Update document record with results
8. Insert analysis record

**Trigger:**
```typescript
// From API route after document upload
const response = await fetch(`${supabaseUrl}/functions/v1/analyze-document`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ document_id: documentId }),
});
```

**Response:**
```json
{
  "success": true,
  "document_id": "uuid",
  "classification": "financial",
  "confidence": 0.95,
  "processing_time_ms": 2500
}
```

## Performance

**Target Performance:**
- Text extraction: <1s for typical PDFs (10-50 pages)
- Classification: <2s (single API call)
- Metadata extraction: <3s (single API call)
- **Total processing: <10s for 95% of documents**

**Optimization:**
- Text truncation (10k chars for classification, 15k for metadata)
- Batch processing with concurrency limits
- Parallel extraction when possible

## Error Handling

All functions include comprehensive error handling:

```typescript
try {
  const result = await classifier.classify(text, filename);
} catch (error) {
  // Error contains detailed message
  console.error('Classification failed:', error.message);

  // Update document status to 'failed'
  await updateDocumentStatus(documentId, 'failed', error.message);
}
```

**Common Errors:**
- `OPENROUTER_API_KEY is required` - Missing API key
- `Insufficient text extracted` - Empty or scanned PDF
- `OpenRouter API error` - API rate limit or service issue
- `Failed to download file` - Storage permission issue

## Configuration

**Environment Variables:**
```bash
OPENROUTER_API_KEY=your_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**AI Model:**
- Default: `anthropic/claude-3.5-sonnet`
- Can be changed in constructor or environment variable

## Testing

**Manual Testing:**
```typescript
// Test text extraction
import { extractTextFromPDF } from '@/lib/data-room/ai';
const buffer = await fs.readFile('./sample.pdf');
const result = await extractTextFromPDF(buffer);

// Test classification
import { DocumentClassifier } from '@/lib/data-room/ai';
const classifier = new DocumentClassifier();
const classification = await classifier.classify(result.text, 'sample.pdf');

// Test metadata extraction
import { MetadataExtractor } from '@/lib/data-room/ai';
const extractor = new MetadataExtractor();
const metadata = await extractor.extract(result.text, classification.document_type);
```

**Edge Function Testing:**
```bash
# Serve locally
supabase functions serve analyze-document

# Test with curl
curl -X POST http://localhost:54321/functions/v1/analyze-document \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"document_id": "uuid-here"}'
```

## Deployment

**Deploy Edge Function:**
```bash
supabase functions deploy analyze-document
```

**Verify Deployment:**
```bash
supabase functions list
```

## Future Enhancements

- [ ] OCR support for scanned documents (Tesseract.js)
- [ ] Support for Word, Excel, PowerPoint
- [ ] Advanced risk analysis
- [ ] Financial anomaly detection
- [ ] Contract clause extraction
- [ ] Multi-language support
- [ ] Custom extraction templates

## License

Proprietary - oppSpot SaaS Platform
