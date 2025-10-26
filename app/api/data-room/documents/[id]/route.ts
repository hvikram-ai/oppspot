/**
 * Document Detail API Routes
 * GET - Get document with signed URL
 * DELETE - Delete document
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
  notFoundError,
} from '@/lib/data-room';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/data-room/documents/[id]
 * Get a document with signed URL for download/viewing
 */
export const GET = withErrorHandler(
  async (req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw unauthorizedError();
    }

    // Get document
    const docRepo = new DocumentRepository(supabase);
    const document = await docRepo.getDocumentWithAnalysis(id);

    if (!document) {
      throw notFoundError('Document', id);
    }

    // Check access to data room
    const dataRoomRepo = new DataRoomRepository(supabase);
    const hasAccess = await dataRoomRepo.hasAccess(
      document.data_room_id,
      user.id
    );

    if (!hasAccess) {
      throw forbiddenError('You do not have access to this document');
    }

    // Generate signed URL (1 hour expiration)
    const storage = new DocumentStorage(supabase);
    const signedUrl = await storage.getSignedUrl(document.storage_path, 3600);

    // Log view activity
    const activityRepo = new ActivityRepository(supabase);
    await activityRepo.logActivity({
      data_room_id: document.data_room_id,
      document_id: id,
      action: 'view',
      details: {
        filename: document.filename,
      },
    });

    return NextResponse.json({
      ...document,
      signed_url: signedUrl,
    });
  }
);

/**
 * DELETE /api/data-room/documents/[id]
 * Delete a document (soft delete in DB, hard delete in storage)
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw unauthorizedError();
    }

    // Get document
    const docRepo = new DocumentRepository(supabase);
    const document = await docRepo.getDocument(id);

    if (!document) {
      throw notFoundError('Document', id);
    }

    // Check if user is owner or editor
    const dataRoomRepo = new DataRoomRepository(supabase);
    const hasAccess = await dataRoomRepo.hasAccess(
      document.data_room_id,
      user.id
    );

    if (!hasAccess) {
      throw forbiddenError(
        'You do not have permission to delete this document'
      );
    }

    // Delete from storage
    const storage = new DocumentStorage(supabase);
    await storage.deleteDocument(document.storage_path);

    // Soft delete from database
    await docRepo.deleteDocument(id);

    // Update data room storage metrics
    await dataRoomRepo.updateStorageMetrics(
      document.data_room_id,
      -document.file_size_bytes,
      -1
    );

    // Log activity
    const activityRepo = new ActivityRepository(supabase);
    await activityRepo.logActivity({
      data_room_id: document.data_room_id,
      document_id: id,
      action: 'delete',
      details: {
        filename: document.filename,
        file_size: document.file_size_bytes,
      },
    });

    return NextResponse.json({ success: true, message: 'Document deleted' });
  }
);
