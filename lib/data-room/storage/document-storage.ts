/**
 * Document Storage
 * File operations using Supabase Storage
 */

import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  DataRoomError,
  DataRoomErrorCode,
  fileUploadError,
} from '../utils/error-handler';

const STORAGE_BUCKET = 'data-room-documents';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * DocumentStorage - File storage operations
 */
export class DocumentStorage {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Upload a document to storage
   * @param dataRoomId - Data room UUID
   * @param documentId - Document UUID
   * @param file - File to upload
   * @returns Storage path
   */
  async uploadDocument(
    dataRoomId: string,
    documentId: string,
    file: File
  ): Promise<string> {
    try {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw fileUploadError(
          `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          DataRoomErrorCode.FILE_TOO_LARGE
        );
      }

      // Generate storage path
      const fileExt = file.name.split('.').pop();
      const storagePath = `${dataRoomId}/${documentId}.${fileExt}`;

      // Upload file
      const { data, error } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        throw fileUploadError(`Upload failed: ${error.message}`);
      }

      return data.path;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw fileUploadError(
        error instanceof Error ? error.message : 'Upload failed'
      );
    }
  }

  /**
   * Upload multiple documents in batch
   * @param dataRoomId - Data room UUID
   * @param files - Array of files with their document IDs
   * @returns Array of storage paths
   */
  async uploadDocumentBatch(
    dataRoomId: string,
    files: Array<{ documentId: string; file: File }>
  ): Promise<string[]> {
    const uploadPromises = files.map(({ documentId, file }) =>
      this.uploadDocument(dataRoomId, documentId, file)
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      throw fileUploadError(
        error instanceof Error ? error.message : 'Batch upload failed'
      );
    }
  }

  /**
   * Download a document from storage
   * @param storagePath - Path to file in storage
   * @returns File blob
   */
  async downloadDocument(storagePath: string): Promise<Blob> {
    try {
      const { data, error } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .download(storagePath);

      if (error) {
        throw new DataRoomError(
          `Download failed: ${error.message}`,
          DataRoomErrorCode.DOWNLOAD_FAILED,
          500
        );
      }

      return data;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Download failed',
        DataRoomErrorCode.DOWNLOAD_FAILED,
        500
      );
    }
  }

  /**
   * Get a signed URL for temporary access to a document
   * @param storagePath - Path to file in storage
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(
    storagePath: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, expiresIn);

      if (error) {
        throw new DataRoomError(
          `Failed to generate signed URL: ${error.message}`,
          DataRoomErrorCode.STORAGE_ERROR,
          500
        );
      }

      return data.signedUrl;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to generate signed URL',
        DataRoomErrorCode.STORAGE_ERROR,
        500
      );
    }
  }

  /**
   * Get signed URLs for multiple documents
   * @param storagePaths - Array of storage paths
   * @param expiresIn - Expiration time in seconds
   * @returns Array of signed URLs
   */
  async getSignedUrls(
    storagePaths: string[],
    expiresIn: number = 3600
  ): Promise<string[]> {
    const urlPromises = storagePaths.map((path) =>
      this.getSignedUrl(path, expiresIn)
    );

    try {
      return await Promise.all(urlPromises);
    } catch (error) {
      throw new DataRoomError(
        'Failed to generate signed URLs',
        DataRoomErrorCode.STORAGE_ERROR,
        500
      );
    }
  }

  /**
   * Delete a document from storage
   * @param storagePath - Path to file in storage
   */
  async deleteDocument(storagePath: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);

      if (error) {
        throw new DataRoomError(
          `Delete failed: ${error.message}`,
          DataRoomErrorCode.STORAGE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Delete failed',
        DataRoomErrorCode.STORAGE_ERROR,
        500
      );
    }
  }

  /**
   * Delete multiple documents in batch
   * @param storagePaths - Array of storage paths
   */
  async deleteDocumentBatch(storagePaths: string[]): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .remove(storagePaths);

      if (error) {
        throw new DataRoomError(
          `Batch delete failed: ${error.message}`,
          DataRoomErrorCode.STORAGE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Batch delete failed',
        DataRoomErrorCode.STORAGE_ERROR,
        500
      );
    }
  }

  /**
   * Move a document to a different folder
   * @param oldPath - Current storage path
   * @param newPath - New storage path
   */
  async moveDocument(oldPath: string, newPath: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .move(oldPath, newPath);

      if (error) {
        throw new DataRoomError(
          `Move failed: ${error.message}`,
          DataRoomErrorCode.STORAGE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Move failed',
        DataRoomErrorCode.STORAGE_ERROR,
        500
      );
    }
  }

  /**
   * Copy a document to a different location
   * @param sourcePath - Source storage path
   * @param destinationPath - Destination storage path
   */
  async copyDocument(
    sourcePath: string,
    destinationPath: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .copy(sourcePath, destinationPath);

      if (error) {
        throw new DataRoomError(
          `Copy failed: ${error.message}`,
          DataRoomErrorCode.STORAGE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Copy failed',
        DataRoomErrorCode.STORAGE_ERROR,
        500
      );
    }
  }

  /**
   * Get file metadata
   * @param storagePath - Path to file in storage
   * @returns File metadata
   */
  async getFileMetadata(storagePath: string): Promise<{
    name: string;
    size: number;
    mimetype: string;
    lastModified: Date;
  } | null> {
    try {
      const { data, error } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .list(storagePath.split('/').slice(0, -1).join('/'), {
          search: storagePath.split('/').pop(),
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      const file = data[0];
      return {
        name: file.name,
        size: file.metadata?.size || 0,
        mimetype: file.metadata?.mimetype || 'application/octet-stream',
        lastModified: new Date(file.updated_at || file.created_at),
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if file exists in storage
   * @param storagePath - Path to file in storage
   * @returns true if file exists
   */
  async fileExists(storagePath: string): Promise<boolean> {
    const metadata = await this.getFileMetadata(storagePath);
    return metadata !== null;
  }

  /**
   * Get total storage used by a data room
   * @param dataRoomId - Data room UUID
   * @returns Total bytes used
   */
  async getStorageUsed(dataRoomId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.storage
        .from(STORAGE_BUCKET)
        .list(dataRoomId);

      if (error) {
        throw new DataRoomError(
          `Failed to calculate storage: ${error.message}`,
          DataRoomErrorCode.STORAGE_ERROR,
          500
        );
      }

      let totalBytes = 0;
      data.forEach((file) => {
        totalBytes += file.metadata?.size || 0;
      });

      return totalBytes;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to calculate storage',
        DataRoomErrorCode.STORAGE_ERROR,
        500
      );
    }
  }

  /**
   * Get public URL for a file (only works if bucket is public)
   * @param storagePath - Path to file in storage
   * @returns Public URL
   */
  getPublicUrl(storagePath: string): string {
    const { data } = this.supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }
}
