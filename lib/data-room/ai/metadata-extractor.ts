/**
 * Metadata Extractor
 * AI-powered extraction of structured metadata from documents
 */

import { DocumentType, DocumentMetadata } from '../types';

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * MetadataExtractor - Extracts structured metadata using AI
 */
export class MetadataExtractor {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.model = 'anthropic/claude-3.5-sonnet'; // Claude Sonnet 3.5 for accuracy
    this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is required for metadata extraction');
    }
  }

  /**
   * Extract metadata from document text based on document type
   * @param text - Extracted text from document
   * @param documentType - Type of document (affects extraction strategy)
   * @returns Structured metadata
   */
  async extract(
    text: string,
    documentType: DocumentType
  ): Promise<DocumentMetadata> {
    try {
      // Truncate text if too long (keep first 15k characters for metadata extraction)
      const truncatedText = text.slice(0, 15000);

      const systemPrompt = this.getSystemPrompt(documentType);
      const userPrompt = `Extract structured metadata from this ${documentType} document:\n\n${truncatedText}`;

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://oppspot.ai',
          'X-Title': 'oppSpot Data Room',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1, // Low temperature for accurate extraction
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter API error (${response.status}): ${errorText}`
        );
      }

      const data: OpenRouterResponse = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from OpenRouter API');
      }

      // Parse JSON response
      const parsed = JSON.parse(content);

      // Normalize and validate metadata
      const metadata = this.normalizeMetadata(parsed, documentType);

      return metadata;
    } catch (error) {
      throw new Error(
        `Metadata extraction failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get system prompt based on document type
   * @param documentType - Type of document
   * @returns System prompt for AI
   */
  private getSystemPrompt(documentType: DocumentType): string {
    const basePrompt = `You are an expert at extracting structured metadata from business documents.
Extract information accurately and return it as a JSON object.
If information is not found, omit the field rather than guessing.
Use ISO 8601 format for dates (YYYY-MM-DD).
Use standard currency codes (USD, GBP, EUR, etc.).`;

    const typeSpecificPrompts: Record<DocumentType, string> = {
      financial: `${basePrompt}

For financial documents, extract:
{
  "document_date": "YYYY-MM-DD",
  "fiscal_period": "Q1 2024" or "FY 2024",
  "dates": ["YYYY-MM-DD", ...],
  "amounts": [
    {
      "value": 1000000,
      "currency": "USD",
      "context": "Revenue" or "COGS" or "Net Income", etc.
    }
  ],
  "parties": [
    {
      "name": "Company Name",
      "type": "company",
      "role": "subject" or "auditor" or "preparer"
    }
  ]
}

Focus on: Revenue, costs, profits, cash balances, key financial metrics.`,

      contract: `${basePrompt}

For contract documents, extract:
{
  "contract_parties": ["Party A", "Party B"],
  "effective_date": "YYYY-MM-DD",
  "expiration_date": "YYYY-MM-DD",
  "contract_value": 1000000,
  "dates": ["YYYY-MM-DD", ...],
  "amounts": [
    {
      "value": 1000000,
      "currency": "USD",
      "context": "Contract value" or "Payment amount"
    }
  ],
  "parties": [
    {
      "name": "Party Name",
      "type": "company" or "person",
      "role": "client" or "vendor" or "signatory"
    }
  ]
}

Focus on: Parties, dates, payment terms, contract value, renewal terms.`,

      due_diligence: `${basePrompt}

For due diligence documents, extract:
{
  "document_date": "YYYY-MM-DD",
  "dates": ["YYYY-MM-DD", ...],
  "amounts": [
    {
      "value": 1000000,
      "currency": "USD",
      "context": "Valuation" or "Assets" or "Liabilities"
    }
  ],
  "parties": [
    {
      "name": "Target Company",
      "type": "company",
      "role": "subject" or "acquirer" or "advisor"
    }
  ]
}

Focus on: Target company, valuation, assets, liabilities, risks identified.`,

      legal: `${basePrompt}

For legal documents, extract:
{
  "document_date": "YYYY-MM-DD",
  "dates": ["YYYY-MM-DD", ...],
  "parties": [
    {
      "name": "Party Name",
      "type": "company" or "person",
      "role": "plaintiff" or "defendant" or "counsel"
    }
  ],
  "amounts": [
    {
      "value": 1000000,
      "currency": "USD",
      "context": "Damages" or "Settlement" or "Fine"
    }
  ]
}

Focus on: Parties involved, filing date, case numbers, amounts, deadlines.`,

      hr: `${basePrompt}

For HR documents, extract:
{
  "document_date": "YYYY-MM-DD",
  "effective_date": "YYYY-MM-DD",
  "dates": ["YYYY-MM-DD", ...],
  "parties": [
    {
      "name": "Employee Name",
      "type": "person",
      "role": "employee" or "manager"
    }
  ],
  "amounts": [
    {
      "value": 100000,
      "currency": "USD",
      "context": "Salary" or "Bonus" or "Stock options"
    }
  ]
}

Focus on: Employee names, start dates, compensation, benefits, reporting structure.`,

      other: `${basePrompt}

For general documents, extract:
{
  "document_date": "YYYY-MM-DD",
  "dates": ["YYYY-MM-DD", ...],
  "amounts": [
    {
      "value": 1000000,
      "currency": "USD",
      "context": "Brief description"
    }
  ],
  "parties": [
    {
      "name": "Name",
      "type": "company" or "person",
      "role": "Brief role description"
    }
  ]
}

Extract any dates, amounts, and parties mentioned in the document.`,
    };

    return typeSpecificPrompts[documentType] || typeSpecificPrompts.other;
  }

  /**
   * Normalize and validate extracted metadata
   * @param raw - Raw metadata from AI
   * @param documentType - Document type
   * @returns Normalized metadata
   */
  private normalizeMetadata(
    raw: Record<string, unknown>,
    documentType: DocumentType
  ): DocumentMetadata {
    const metadata: DocumentMetadata = {};

    // Common fields
    if (raw.dates && Array.isArray(raw.dates)) {
      metadata.dates = raw.dates
        .filter((d) => this.isValidDate(d))
        .map((d) => String(d));
    }

    if (raw.amounts && Array.isArray(raw.amounts)) {
      metadata.amounts = raw.amounts
        .filter(
          (a: unknown) =>
            typeof a === 'object' &&
            a !== null &&
            'value' in a &&
            typeof (a as { value: unknown }).value === 'number'
        )
        .map((a: Record<string, unknown>) => ({
          value: Number(a.value),
          currency: String(a.currency || 'USD'),
          context: String(a.context || ''),
        }));
    }

    if (raw.parties && Array.isArray(raw.parties)) {
      metadata.parties = raw.parties
        .filter(
          (p: unknown) =>
            typeof p === 'object' && p !== null && 'name' in p
        )
        .map((p: Record<string, unknown>) => ({
          name: String(p.name),
          type: this.normalizePartyType(String(p.type || 'company')),
          role: p.role ? String(p.role) : undefined,
        }));
    }

    // Document-specific fields
    if (raw.document_date && this.isValidDate(raw.document_date)) {
      metadata.document_date = String(raw.document_date);
    }

    if (raw.fiscal_period) {
      metadata.fiscal_period = String(raw.fiscal_period);
    }

    if (documentType === 'contract') {
      if (raw.contract_parties && Array.isArray(raw.contract_parties)) {
        metadata.contract_parties = raw.contract_parties.map(String);
      }

      if (raw.effective_date && this.isValidDate(raw.effective_date)) {
        metadata.effective_date = String(raw.effective_date);
      }

      if (raw.expiration_date && this.isValidDate(raw.expiration_date)) {
        metadata.expiration_date = String(raw.expiration_date);
      }

      if (raw.contract_value && typeof raw.contract_value === 'number') {
        metadata.contract_value = raw.contract_value;
      }
    }

    return metadata;
  }

  /**
   * Validate if a string is a valid date
   * @param date - Date string to validate
   * @returns true if valid
   */
  private isValidDate(date: unknown): boolean {
    if (typeof date !== 'string') return false;

    // Check ISO 8601 format (YYYY-MM-DD)
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(date)) return false;

    // Validate actual date
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  /**
   * Normalize party type
   * @param type - Party type from AI
   * @returns Valid party type
   */
  private normalizePartyType(type: string): 'person' | 'company' {
    const normalized = type.toLowerCase().trim();
    if (normalized === 'person' || normalized === 'individual') {
      return 'person';
    }
    return 'company';
  }

  /**
   * Batch extract metadata from multiple documents
   * @param documents - Array of {text, documentType} objects
   * @returns Array of metadata results
   */
  async extractBatch(
    documents: Array<{ text: string; documentType: DocumentType }>
  ): Promise<DocumentMetadata[]> {
    // Process in parallel with max concurrency of 3 to avoid rate limits
    const results: DocumentMetadata[] = [];
    const batchSize = 3;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((doc) => this.extract(doc.text, doc.documentType))
      );
      results.push(...batchResults);
    }

    return results;
  }
}
