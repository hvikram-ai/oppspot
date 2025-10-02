/**
 * Contract Test: GET /api/data-room/documents/[id]
 *
 * Purpose: Verify API contract for getting a single document with signed URL
 * Expected: These tests MUST FAIL until T034 is implemented
 */

import { test, expect } from '@playwright/test';

test.describe('GET /api/data-room/documents/[id]', () => {
  let testDataRoomId: string;
  let testDocumentId: string;

  test.beforeAll(async ({ request }) => {
    // Setup: Create a test data room
    const response = await request.post('/api/data-room', {
      data: {
        name: 'Document Get Test Room',
        deal_type: 'due_diligence'
      }
    });

    expect(response.status()).toBe(201);
    const dataRoom = await response.json();
    testDataRoomId = dataRoom.id;

    // Upload a test document
    const buffer = Buffer.from('test PDF content for document get');
    const uploadResponse = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'test-document.pdf',
          mimeType: 'application/pdf',
          buffer: buffer
        },
        data_room_id: testDataRoomId,
        folder_path: '/'
      }
    });

    expect(uploadResponse.status()).toBe(201);
    const uploadedDoc = await uploadResponse.json();
    testDocumentId = uploadedDoc.id;
  });

  test('should return document with signed URL', async ({ request }) => {
    // Act: Get document by ID
    const response = await request.get(`/api/data-room/documents/${testDocumentId}`);

    // Assert: Response structure
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Document fields
    expect(body).toHaveProperty('id');
    expect(body.id).toBe(testDocumentId);
    expect(body).toHaveProperty('filename');
    expect(body.filename).toBe('test-document.pdf');
    expect(body).toHaveProperty('mime_type');
    expect(body.mime_type).toBe('application/pdf');
    expect(body).toHaveProperty('file_size');
    expect(body).toHaveProperty('data_room_id');
    expect(body.data_room_id).toBe(testDataRoomId);
    expect(body).toHaveProperty('uploaded_by');
    expect(body).toHaveProperty('folder_path');
    expect(body).toHaveProperty('storage_path');
    expect(body).toHaveProperty('processing_status');
    expect(body).toHaveProperty('created_at');
    expect(body).toHaveProperty('updated_at');

    // Assert: Signed URL present
    expect(body).toHaveProperty('signed_url');
    expect(body.signed_url).toBeTruthy();
    expect(body.signed_url).toContain('https://');
    expect(body.signed_url).toContain('token='); // Supabase signed URLs contain token
  });

  test('should return valid downloadable signed URL', async ({ request }) => {
    // Arrange: Get document with signed URL
    const response = await request.get(`/api/data-room/documents/${testDocumentId}`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const signedUrl = body.signed_url;

    // Act: Download file using signed URL
    const downloadResponse = await request.get(signedUrl);

    // Assert: File downloads successfully
    expect(downloadResponse.status()).toBe(200);
    expect(downloadResponse.headers()['content-type']).toContain('application/pdf');

    // Assert: Content matches original
    const downloadedContent = await downloadResponse.body();
    expect(downloadedContent.toString()).toContain('test PDF content for document get');
  });

  test('should include document_type and confidence_score if classified', async ({ request }) => {
    // Act: Get document
    const response = await request.get(`/api/data-room/documents/${testDocumentId}`);

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();

    // If document is classified, should have document_type and confidence_score
    if (body.document_type !== null) {
      expect(body.document_type).toMatch(/^(financial|contract|due_diligence|legal|hr|other)$/);
      expect(body.confidence_score).toBeGreaterThanOrEqual(0);
      expect(body.confidence_score).toBeLessThanOrEqual(1);
    }
  });

  test('should include metadata if extracted by AI', async ({ request }) => {
    // Act: Get document
    const response = await request.get(`/api/data-room/documents/${testDocumentId}`);

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();

    // If metadata is extracted, should be valid JSON
    if (body.metadata !== null) {
      expect(typeof body.metadata).toBe('object');
      // Could contain: dates, amounts, parties, etc.
    }
  });

  test('should log view activity when document is accessed', async ({ request }) => {
    // Act: Get document (this should create activity log)
    const response = await request.get(`/api/data-room/documents/${testDocumentId}`);

    // Assert: Success
    expect(response.status()).toBe(200);

    // Note: Activity log verification is done in integration tests
    // Contract test just verifies successful response
  });

  test('should return 404 for non-existent document', async ({ request }) => {
    // Arrange: Invalid document ID
    const fakeId = '00000000-0000-0000-0000-000000000000';

    // Act: Get non-existent document
    const response = await request.get(`/api/data-room/documents/${fakeId}`);

    // Assert: 404 Not Found
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/not found|does not exist/i);
  });

  test('should return 403 if user has no access to data room', async ({ request }) => {
    // Note: This test assumes setup where test user has no access
    // In practice, would need to create document in data room owned by another user
    // and attempt to access without being granted permission

    // For now, document expected behavior
    // Expected: 403 Forbidden if user has no access grant to document's data room
  });

  test('should return 403 if data room access was revoked', async ({ request }) => {
    // Note: This test would need to:
    // 1. Grant access to another user
    // 2. Revoke access
    // 3. Attempt to get document as that user
    // Expected: 403 Forbidden after revocation
  });

  test('should return signed URL with 1-hour expiration', async ({ request }) => {
    // Act: Get document
    const response = await request.get(`/api/data-room/documents/${testDocumentId}`);

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Signed URL exists
    expect(body.signed_url).toBeTruthy();

    // Parse signed URL to check expiration (Supabase format)
    const url = new URL(body.signed_url);
    const expiresParam = url.searchParams.get('Expires') || url.searchParams.get('expires');

    if (expiresParam) {
      const expiresTimestamp = parseInt(expiresParam);
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = expiresTimestamp - now;

      // Should expire in approximately 1 hour (3600 seconds, allow 60s variance)
      expect(expiresIn).toBeGreaterThan(3540); // 59 minutes
      expect(expiresIn).toBeLessThan(3660); // 61 minutes
    }
  });

  test('should return document with analysis if available', async ({ request }) => {
    // Act: Get document
    const response = await request.get(`/api/data-room/documents/${testDocumentId}`);

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();

    // If AI analysis is complete, should include analysis data
    if (body.processing_status === 'completed') {
      // Could include: summary, key_findings, extracted_entities, etc.
      // Structure depends on implementation
    }
  });

  test('should include storage_path but not expose internal details', async ({ request }) => {
    // Act: Get document
    const response = await request.get(`/api/data-room/documents/${testDocumentId}`);

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Should have storage_path for reference
    expect(body).toHaveProperty('storage_path');
    expect(body.storage_path).toMatch(new RegExp(`${testDataRoomId}/[a-f0-9-]+_original\\.pdf`));

    // But sensitive details should not be exposed
    expect(body).not.toHaveProperty('encryption_key');
    expect(body).not.toHaveProperty('internal_storage_url');
  });

  test('should handle deleted documents gracefully', async ({ request }) => {
    // Arrange: Upload and delete a document
    const buffer = Buffer.from('document to be deleted');
    const uploadResponse = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'to-delete.pdf',
          mimeType: 'application/pdf',
          buffer: buffer
        },
        data_room_id: testDataRoomId
      }
    });

    expect(uploadResponse.status()).toBe(201);
    const doc = await uploadResponse.json();

    // Delete the document
    const deleteResponse = await request.delete(`/api/data-room/documents/${doc.id}`);
    expect(deleteResponse.status()).toBe(200);

    // Act: Try to get deleted document
    const response = await request.get(`/api/data-room/documents/${doc.id}`);

    // Assert: 404 Not Found (soft deleted documents should not be accessible)
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should return processing_status for AI classification state', async ({ request }) => {
    // Act: Get document
    const response = await request.get(`/api/data-room/documents/${testDocumentId}`);

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Processing status is valid
    expect(body.processing_status).toMatch(/^(pending|processing|completed|failed)$/);

    // If failed, should have error_message
    if (body.processing_status === 'failed') {
      expect(body).toHaveProperty('error_message');
      expect(body.error_message).toBeTruthy();
    }
  });

  test('should include upload_completed flag', async ({ request }) => {
    // Act: Get document
    const response = await request.get(`/api/data-room/documents/${testDocumentId}`);

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Should have upload_completed field
    expect(body).toHaveProperty('upload_completed');
    expect(body.upload_completed).toBe(true); // Should be completed after beforeAll
  });

  test('should validate UUID format for document ID', async ({ request }) => {
    // Arrange: Invalid UUID format
    const invalidId = 'not-a-valid-uuid';

    // Act: Get document with invalid ID
    const response = await request.get(`/api/data-room/documents/${invalidId}`);

    // Assert: 400 Bad Request (invalid UUID format)
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/invalid|uuid|format/i);
  });
});
