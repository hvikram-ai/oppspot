/**
 * Analyze Document Edge Function
 * AI-powered document classification and metadata extraction
 *
 * Triggered after document upload to classify and extract metadata
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
// @deno-types="npm:pdf-parse@1.1.1"
import pdf from 'npm:pdf-parse@1.1.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeRequest {
  document_id: string;
}

interface DocumentRecord {
  id: string;
  data_room_id: string;
  filename: string;
  storage_path: string;
  mime_type: string;
  processing_status: string;
}

interface ClassificationResult {
  document_type: string;
  confidence_score: number;
  reasoning: string;
}

interface DocumentMetadata {
  dates?: string[];
  amounts?: Array<{
    value: number;
    currency: string;
    context: string;
  }>;
  parties?: Array<{
    name: string;
    type: 'person' | 'company';
    role?: string;
  }>;
  document_date?: string;
  fiscal_period?: string;
  contract_parties?: string[];
  effective_date?: string;
  expiration_date?: string;
  contract_value?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !openRouterKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { document_id }: AnalyzeRequest = await req.json();

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: 'document_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Starting analysis for document: ${document_id}`);

    // 1. Fetch document record
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, data_room_id, filename, storage_path, mime_type, processing_status')
      .eq('id', document_id)
      .single();

    if (fetchError || !document) {
      throw new Error(`Document not found: ${fetchError?.message}`);
    }

    const docRecord = document as DocumentRecord;

    // Update status to processing
    await supabase
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', document_id);

    const startTime = Date.now();

    try {
      // 2. Download file from storage
      console.log(`Downloading file: ${docRecord.storage_path}`);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('data-room-documents')
        .download(docRecord.storage_path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`);
      }

      // 3. Extract text from PDF
      console.log('Extracting text from PDF...');
      const buffer = await fileData.arrayBuffer();
      const pdfData = await pdf(Buffer.from(buffer));
      const extractedText = pdfData.text || '';

      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error('Insufficient text extracted from document');
      }

      console.log(`Extracted ${extractedText.length} characters from PDF`);

      // 4. Classify document using AI
      console.log('Classifying document...');
      const classification = await classifyDocument(
        extractedText,
        docRecord.filename,
        openRouterKey
      );

      console.log(
        `Classification: ${classification.document_type} (${classification.confidence_score})`
      );

      // 5. Extract metadata using AI
      console.log('Extracting metadata...');
      const metadata = await extractMetadata(
        extractedText,
        classification.document_type,
        openRouterKey
      );

      console.log('Metadata extracted successfully');

      const processingTime = Date.now() - startTime;

      // 6. Update document record
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          document_type: classification.document_type,
          confidence_score: classification.confidence_score,
          metadata: metadata,
          processing_status: 'complete',
          error_message: null,
        })
        .eq('id', document_id);

      if (updateError) {
        throw new Error(`Failed to update document: ${updateError.message}`);
      }

      // 7. Insert analysis record
      const { error: analysisError } = await supabase
        .from('document_analysis')
        .insert({
          document_id: document_id,
          analysis_type: 'classification',
          findings: {
            document_type: classification.document_type,
            confidence_score: classification.confidence_score,
            reasoning: classification.reasoning,
          },
          confidence: classification.confidence_score >= 0.7 ? 'high' : classification.confidence_score >= 0.5 ? 'medium' : 'low',
          risks_identified: 0,
          processing_time_ms: processingTime,
          ai_model: 'anthropic/claude-3.5-sonnet',
          ai_tokens_used: 0, // Updated if we track tokens
        });

      if (analysisError) {
        console.error('Failed to insert analysis record:', analysisError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          document_id,
          classification: classification.document_type,
          confidence: classification.confidence_score,
          processing_time_ms: processingTime,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (processingError) {
      // Update document with error
      await supabase
        .from('documents')
        .update({
          processing_status: 'failed',
          error_message:
            processingError instanceof Error
              ? processingError.message
              : 'Unknown error',
        })
        .eq('id', document_id);

      throw processingError;
    }
  } catch (error) {
    console.error('Error analyzing document:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Classify document using OpenRouter API
 */
async function classifyDocument(
  text: string,
  filename: string,
  apiKey: string
): Promise<ClassificationResult> {
  const truncatedText = text.slice(0, 10000);

  const systemPrompt = `You are an expert document classifier for due diligence and business analysis.

Classify documents into one of these categories:
- financial: Financial statements, P&L, balance sheets, cash flow statements, budgets, forecasts
- contract: Legal agreements, vendor contracts, customer agreements, NDAs, partnerships
- due_diligence: Due diligence reports, audit reports, compliance documents
- legal: Legal opinions, court documents, regulatory filings, patents
- hr: Employment agreements, org charts, compensation plans, employee handbooks
- other: Any document that doesn't fit the above categories

Return your response as a JSON object:
{
  "document_type": "<type>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>"
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://oppspot.ai',
      'X-Title': 'oppSpot Data Room',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Document: Filename: ${filename}\n\nText:\n${truncatedText}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenRouter');
  }

  const parsed = JSON.parse(content);

  return {
    document_type: parsed.document_type || 'other',
    confidence_score: Math.max(0, Math.min(1, parsed.confidence || 0)),
    reasoning: parsed.reasoning || 'No reasoning provided',
  };
}

/**
 * Extract metadata using OpenRouter API
 */
async function extractMetadata(
  text: string,
  documentType: string,
  apiKey: string
): Promise<DocumentMetadata> {
  const truncatedText = text.slice(0, 15000);

  const systemPrompt = `You are an expert at extracting structured metadata from business documents.
Extract information accurately and return it as a JSON object.
If information is not found, omit the field.
Use ISO 8601 format for dates (YYYY-MM-DD).

Extract:
{
  "document_date": "YYYY-MM-DD",
  "dates": ["YYYY-MM-DD", ...],
  "amounts": [
    {
      "value": 1000000,
      "currency": "USD",
      "context": "Description"
    }
  ],
  "parties": [
    {
      "name": "Name",
      "type": "company" or "person",
      "role": "Role"
    }
  ]
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://oppspot.ai',
      'X-Title': 'oppSpot Data Room',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-sonnet',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Extract metadata from this ${documentType} document:\n\n${truncatedText}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenRouter');
  }

  return JSON.parse(content);
}
