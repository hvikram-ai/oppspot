/**
 * Document Repository
 * Database operations for documents with RLS support
 */

import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { Document, DocumentWithAnalysis, DocumentListItem } from '../types';
import {
  CreateDocumentInput,
  UpdateDocumentInput,
  DocumentFilter,
  CreateDocumentSchema,
  UpdateDocumentSchema,
  DocumentFilterSchema,
} from '../validation/schemas';
import {
  DataRoomError,
  DataRoomErrorCode,
  notFoundError,
  validationError,
} from '../utils/error-handler';

/**
 * DocumentRepository - CRUD operations for documents
 */
export class DocumentRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Get multiple documents with filters
   * @param dataRoomId - Data room UUID
   * @param filters - Filter and pagination options
   * @returns Array of documents
   */
  async getDocuments(
    dataRoomId: string,
    filters: Partial<DocumentFilter> = {}
  ): Promise<Document[]> {
    try {
      // Validate filters
      const validatedFilters = DocumentFilterSchema.parse({
        ...filters,
        data_room_id: dataRoomId,
      });

      let query = this.supabase
        .from('documents')
        .select('*')
        .eq('data_room_id', dataRoomId)
        .is('deleted_at', null); // Exclude soft-deleted

      // Apply filters
      if (validatedFilters.document_type) {
        query = query.eq('document_type', validatedFilters.document_type);
      }

      if (validatedFilters.folder_path) {
        query = query.eq('folder_path', validatedFilters.folder_path);
      }

      if (validatedFilters.search) {
        query = query.ilike('filename', `%${validatedFilters.search}%`);
      }

      if (validatedFilters.uploaded_by) {
        query = query.eq('uploaded_by', validatedFilters.uploaded_by);
      }

      if (validatedFilters.processing_status) {
        query = query.eq('processing_status', validatedFilters.processing_status);
      }

      if (validatedFilters.date_from) {
        query = query.gte('created_at', validatedFilters.date_from);
      }

      if (validatedFilters.date_to) {
        query = query.lte('created_at', validatedFilters.date_to);
      }

      // Apply sorting
      query = query.order(validatedFilters.sort_by, {
        ascending: validatedFilters.sort_order === 'asc',
      });

      // Apply pagination
      query = query.range(
        validatedFilters.offset,
        validatedFilters.offset + validatedFilters.limit - 1
      );

      const { data, error } = await query;

      if (error) {
        throw new DataRoomError(
          `Failed to fetch documents: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as Document[];
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get documents',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Get a single document by ID
   * @param id - Document UUID
   * @returns Document or null if not found
   */
  async getDocument(id: string): Promise<Document | null> {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw new DataRoomError(
          `Failed to fetch document: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as Document;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get document',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Get document with analysis results
   * @param id - Document UUID
   * @returns Document with analysis or null
   */
  async getDocumentWithAnalysis(
    id: string
  ): Promise<DocumentWithAnalysis | null> {
    try {
      const document = await this.getDocument(id);
      if (!document) return null;

      // Get all analysis records
      const { data: analysis } = await this.supabase
        .from('document_analysis')
        .select('*')
        .eq('document_id', id)
        .order('created_at', { ascending: false });

      // Get annotation count
      const { count: annotationCount } = await this.supabase
        .from('document_annotations')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', id)
        .is('deleted_at', null);

      return {
        ...document,
        analysis: analysis || [],
        annotation_count: annotationCount || 0,
      };
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get document with analysis',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Get documents as list items (lightweight for grid views)
   * @param dataRoomId - Data room UUID
   * @param filters - Filter and pagination options
   * @returns Array of document list items
   */
  async getDocumentListItems(
    dataRoomId: string,
    filters: Partial<DocumentFilter> = {}
  ): Promise<DocumentListItem[]> {
    try {
      const documents = await this.getDocuments(dataRoomId, filters);

      // Get uploader names in batch
      const uploaderIds = [...new Set(documents.map((d) => d.uploaded_by))];
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', uploaderIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p.full_name])
      );

      return documents.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        document_type: doc.document_type,
        file_size_bytes: doc.file_size_bytes,
        created_at: doc.created_at,
        uploaded_by_name: profileMap.get(doc.uploaded_by) || 'Unknown',
        processing_status: doc.processing_status,
        confidence_score: doc.confidence_score,
      }));
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get document list items',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Create a new document record
   * @param input - Document creation data
   * @returns Created document
   */
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    try {
      // Validate input
      const validated = CreateDocumentSchema.parse(input);

      // Get current user
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) {
        throw new DataRoomError(
          'User must be authenticated',
          DataRoomErrorCode.UNAUTHORIZED,
          401
        );
      }

      // Create document
      const { data, error } = await this.supabase
        .from('documents')
        .insert({
          data_room_id: validated.data_room_id,
          filename: validated.filename,
          folder_path: validated.folder_path,
          file_size_bytes: validated.file_size_bytes,
          mime_type: validated.mime_type,
          storage_path: validated.storage_path,
          uploaded_by: user.id,
          upload_completed: true,
          document_type: 'other', // Will be updated by AI
          confidence_score: 0,
          processing_status: 'pending',
          metadata: {},
          error_message: null,
        })
        .select()
        .single();

      if (error) {
        throw new DataRoomError(
          `Failed to create document: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as Document;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      if (error instanceof Error && error.name === 'ZodError') {
        throw validationError('Invalid document input', error);
      }
      throw new DataRoomError(
        'Failed to create document',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Update an existing document
   * @param id - Document UUID
   * @param updates - Fields to update
   * @returns Updated document
   */
  async updateDocument(
    id: string,
    updates: UpdateDocumentInput
  ): Promise<Document> {
    try {
      // Validate updates
      const validated = UpdateDocumentSchema.parse(updates);

      // Check if document exists
      const existing = await this.getDocument(id);
      if (!existing) {
        throw notFoundError('Document', id);
      }

      // Update document
      const { data, error } = await this.supabase
        .from('documents')
        .update({
          ...validated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Check for RLS policy violations
        if (error.code === '42501' || error.code === 'PGRST301') {
          throw new DataRoomError(
            'You do not have permission to update this document',
            DataRoomErrorCode.FORBIDDEN,
            403
          );
        }
        throw new DataRoomError(
          `Failed to update document: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as Document;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      if (error instanceof Error && error.name === 'ZodError') {
        throw validationError('Invalid update data', error);
      }
      throw new DataRoomError(
        'Failed to update document',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Soft delete a document
   * @param id - Document UUID
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      // Check if document exists
      const existing = await this.getDocument(id);
      if (!existing) {
        throw notFoundError('Document', id);
      }

      // Soft delete
      const { error } = await this.supabase
        .from('documents')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        // Check for RLS policy violations
        if (error.code === '42501' || error.code === 'PGRST301') {
          throw new DataRoomError(
            'You do not have permission to delete this document',
            DataRoomErrorCode.FORBIDDEN,
            403
          );
        }
        throw new DataRoomError(
          `Failed to delete document: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to delete document',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Get documents by folder path
   * @param dataRoomId - Data room UUID
   * @param folderPath - Folder path
   * @returns Array of documents in folder
   */
  async getDocumentsByFolder(
    dataRoomId: string,
    folderPath: string
  ): Promise<Document[]> {
    return this.getDocuments(dataRoomId, { folder_path: folderPath });
  }

  /**
   * Get folder structure for data room
   * @param dataRoomId - Data room UUID
   * @returns Array of unique folder paths
   */
  async getFolders(dataRoomId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('folder_path')
        .eq('data_room_id', dataRoomId)
        .is('deleted_at', null);

      if (error) {
        throw new DataRoomError(
          `Failed to fetch folders: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      const folders = [...new Set(data.map((d) => d.folder_path))];
      return folders.sort();
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get folders',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Count documents by type in data room
   * @param dataRoomId - Data room UUID
   * @returns Object with counts by document type
   */
  async getDocumentCountsByType(
    dataRoomId: string
  ): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from('documents')
        .select('document_type')
        .eq('data_room_id', dataRoomId)
        .is('deleted_at', null);

      if (error) {
        throw new DataRoomError(
          `Failed to count documents: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      const counts: Record<string, number> = {};
      data.forEach((doc) => {
        counts[doc.document_type] = (counts[doc.document_type] || 0) + 1;
      });

      return counts;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get document counts',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }
}
