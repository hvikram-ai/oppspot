/**
 * Documents API Routes
 * POST - Upload document
 * GET - List documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  DocumentRepository,
  ActivityRepository,
  DataRoomRepository,
  DocumentStorage,
  withErrorHandler,
  unauthorizedError,
  forbiddenError,
  validationError,
  DocumentFilterSchema,
} from '@/lib/data-room';

/**
 * POST /api/data-room/documents
 * Upload a document
 */
export const POST = withErrorHandler(async (req: NextRequest) => {
  // Get authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw unauthorizedError();
  }

  // Parse multipart form data
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const dataRoomId = formData.get('data_room_id') as string;
  const folderPath = (formData.get('folder_path') as string) || '/';

  if (!file) {
    throw validationError('File is required');
  }

  if (!dataRoomId) {
    throw validationError('data_room_id is required');
  }

  // Check if user has editor+ permission
  const dataRoomRepo = new DataRoomRepository(supabase);
  const hasAccess = await dataRoomRepo.hasAccess(dataRoomId, user.id);

  if (!hasAccess) {
    throw forbiddenError('You do not have permission to upload to this data room');
  }

  // Create document record
  const docRepo = new DocumentRepository(supabase);
  const document = await docRepo.createDocument({
    data_room_id: dataRoomId,
    filename: file.name,
    folder_path: folderPath,
    file_size_bytes: file.size,
    mime_type: file.type,
    storage_path: '', // Will be updated after upload
  });

  try {
    // Upload to storage
    const storage = new DocumentStorage(supabase);
    const storagePath = await storage.uploadDocument(
      dataRoomId,
      document.id,
      file
    );

    // Update document with storage path
    const updatedDocument = await docRepo.updateDocument(document.id, {
      storage_path: storagePath,
      processing_status: 'pending',
    });

    // Update data room storage metrics
    await dataRoomRepo.updateStorageMetrics(dataRoomId, file.size, 1);

    // Log activity
    const activityRepo = new ActivityRepository(supabase);
    await activityRepo.logActivity({
      data_room_id: dataRoomId,
      document_id: document.id,
      action: 'upload',
      details: {
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
      },
    });

    // Trigger AI analysis (async)
    // Note: In production, this would call the Edge Function
    // For now, we'll skip the actual AI call
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey) {
      // Fire and forget - don't await
      fetch(`${supabaseUrl}/functions/v1/analyze-document`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ document_id: document.id }),
      }).catch((err) => {
        console.error('Failed to trigger AI analysis:', err);
      });
    }

    return NextResponse.json(updatedDocument, { status: 201 });
  } catch (error) {
    // If upload fails, delete the document record
    await docRepo.deleteDocument(document.id);
    throw error;
  }
});

/**
 * GET /api/data-room/documents
 * List documents in a data room
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  // Get authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw unauthorizedError();
  }

  // Parse query parameters
  const { searchParams } = new URL(req.url);
  const dataRoomId = searchParams.get('data_room_id');

  if (!dataRoomId) {
    throw validationError('data_room_id query parameter is required');
  }

  // Check access
  const dataRoomRepo = new DataRoomRepository(supabase);
  const hasAccess = await dataRoomRepo.hasAccess(dataRoomId, user.id);

  if (!hasAccess) {
    throw forbiddenError('You do not have access to this data room');
  }

  const filters = {
    data_room_id: dataRoomId,
    document_type: searchParams.get('document_type') || undefined,
    folder_path: searchParams.get('folder_path') || undefined,
    search: searchParams.get('search') || undefined,
    processing_status: searchParams.get('processing_status') || undefined,
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_order: searchParams.get('sort_order') || 'desc',
    limit: searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50,
    offset: searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!)
      : 0,
  };

  // Validate filters
  const validated = DocumentFilterSchema.parse(filters);

  // Get documents
  const docRepo = new DocumentRepository(supabase);
  const documents = await docRepo.getDocumentListItems(
    dataRoomId,
    validated
  );

  return NextResponse.json({
    data: documents,
    pagination: {
      limit: validated.limit,
      offset: validated.offset,
      total: documents.length,
    },
  });
});
