/**
 * Document Processing Service for Q&A
 * Feature: 008-oppspot-docs-dataroom
 * Task: T033
 *
 * Coordinates document processing pipeline:
 * 1. Extract text from PDF
 * 2. Chunk text into smaller segments
 * 3. Generate embeddings for each chunk
 * 4. Save to database (document_pages, document_chunks)
 * 5. Update processing status
 */

import { createClient } from '@/lib/supabase/server'
import { extractTextFromPDF } from './text-extractor'
import { chunkDocumentText } from './document-chunker'
import { generateEmbeddings } from './embeddings-service'
import type {
  DocumentPage,
  DocumentChunk,
  DocumentProcessingResult,
  DocumentPageInsert,
  DocumentChunkInsert
} from '@/types/data-room-qa'

export interface ProcessDocumentOptions {
  documentId: string
  dataRoomId: string
  storagePath: string
}

export interface ProcessingProgress {
  status: 'pending' | 'extracting' | 'chunking' | 'embedding' | 'completed' | 'failed'
  current_step?: string
  progress_percent?: number
  error_message?: string
}

/**
 * Main document processing function
 * This is called after a document is uploaded to process it for Q&A
 */
export async function processDocumentForQA(
  options: ProcessDocumentOptions
): Promise<DocumentProcessingResult> {
  const startTime = Date.now()
  const { documentId, dataRoomId, storagePath } = options

  const supabase = await createClient()

  try {
    // Update status: extracting
    await updateProcessingStatus(documentId, {
      status: 'extracting',
      current_step: 'Extracting text from PDF',
      progress_percent: 10
    })

    // Step 1: Extract text from PDF
    const pdfBuffer = await downloadDocument(storagePath)
    const extractionResult = await extractTextFromPDF(pdfBuffer)

    if (!extractionResult.text || extractionResult.text.trim().length === 0) {
      throw new Error('No text extracted from document')
    }

    // Update status: chunking
    await updateProcessingStatus(documentId, {
      status: 'chunking',
      current_step: 'Chunking document text',
      progress_percent: 30
    })

    // Step 2: Save document pages
    const pages: DocumentPageInsert[] = extractionResult.pages.map((page: { page_number: number; text: string; confidence?: number }, idx: number) => ({
      document_id: documentId,
      page_number: page.page_number,
      text_content: page.text,
      ocr_confidence: page.confidence || null,
      layout_data: null
    }))

    const { data: insertedPages, error: pagesError } = await supabase
      .from('document_pages')
      .insert(pages)
      .select()

    if (pagesError) {
      throw new Error(`Failed to save document pages: ${pagesError.message}`)
    }

    // Step 3: Chunk the text
    const chunkingResult = await chunkDocumentText(extractionResult.text, extractionResult.pages)

    // Update status: embedding
    await updateProcessingStatus(documentId, {
      status: 'embedding',
      current_step: 'Generating embeddings',
      progress_percent: 60
    })

    // Step 4: Generate embeddings for all chunks
    const chunkTexts = chunkingResult.chunks.map((c: { text: string; page_number: number; token_count: number; start_char: number; end_char: number }) => c.text)
    const embeddings = await generateEmbeddings(chunkTexts)

    // Step 5: Save document chunks with embeddings
    const chunks: DocumentChunkInsert[] = chunkingResult.chunks.map((chunk: { text: string; page_number: number; token_count: number; start_char: number; end_char: number }, idx: number) => {
      // Find the corresponding page
      const page = insertedPages.find(p => p.page_number === chunk.page_number)

      return {
        document_id: documentId,
        page_id: page?.id || insertedPages[0].id, // Fallback to first page if not found
        chunk_index: idx,
        text_content: chunk.text,
        token_count: chunk.token_count,
        start_char: chunk.start_char,
        end_char: chunk.end_char,
        embedding: embeddings[idx],
        embedding_model: 'text-embedding-ada-002'
      }
    })

    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunks)

    if (chunksError) {
      throw new Error(`Failed to save document chunks: ${chunksError.message}`)
    }

    // Step 6: Update document metadata
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        processing_status: 'completed',
        chunk_count: chunks.length,
        avg_chunk_size: chunkingResult.avg_chunk_size,
        ocr_attempted: extractionResult.ocr_used
      })
      .eq('id', documentId)

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`)
    }

    // Update status: completed
    await updateProcessingStatus(documentId, {
      status: 'completed',
      current_step: 'Processing complete',
      progress_percent: 100
    })

    const processingTime = Date.now() - startTime

    return {
      document_id: documentId,
      page_count: extractionResult.pages.length,
      chunk_count: chunks.length,
      processing_time_ms: processingTime,
      ocr_used: extractionResult.ocr_used,
      avg_confidence: extractionResult.avg_confidence
    }

  } catch (error) {
    console.error('Document processing error:', error)

    // Update status: failed
    await updateProcessingStatus(documentId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error occurred'
    })

    // Update document status
    await supabase
      .from('documents')
      .update({
        processing_status: 'failed',
        processing_error: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', documentId)

    throw error
  }
}

/**
 * Download document from storage
 */
async function downloadDocument(storagePath: string): Promise<Buffer> {
  const supabase = await createClient()

  // Parse storage path to get bucket and file path
  // Format: data-rooms/{dataRoomId}/documents/{documentId}/{filename}
  const pathParts = storagePath.split('/')
  const bucket = pathParts[0] || 'data-rooms'
  const filePath = pathParts.slice(1).join('/')

  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath)

  if (error) {
    throw new Error(`Failed to download document: ${error.message}`)
  }

  return Buffer.from(await data.arrayBuffer())
}

/**
 * Update document processing status
 */
async function updateProcessingStatus(
  documentId: string,
  progress: ProcessingProgress
): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('documents')
    .update({
      processing_status: progress.status,
      processing_progress: progress.progress_percent || null
    })
    .eq('id', documentId)

  // Log progress (optional - could be removed or stored in a separate table)
  console.log(`[Document ${documentId}] ${progress.status}: ${progress.current_step}`)
}

/**
 * Trigger document processing (to be called from upload endpoint)
 */
export async function triggerDocumentProcessing(
  documentId: string,
  dataRoomId: string,
  storagePath: string
): Promise<void> {
  // Call processing API endpoint (fire and forget)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  fetch(`${baseUrl}/api/data-room/${dataRoomId}/process-document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document_id: documentId,
      storage_path: storagePath
    })
  }).catch(error => {
    console.error('Failed to trigger document processing:', error)
  })
}
