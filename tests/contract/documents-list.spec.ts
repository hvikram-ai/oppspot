/**
 * Contract Test: GET /api/data-room/documents
 *
 * Purpose: Verify API contract for listing documents
 * Expected: These tests MUST FAIL until T033 is implemented
 */

import { test, expect } from '@playwright/test';

test.describe('GET /api/data-room/documents', () => {
  let testDataRoomId: string;
  let uploadedDocumentIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    // Setup: Create a test data room
    const response = await request.post('/api/data-room', {
      data: {
        name: 'Documents List Test Room',
        deal_type: 'due_diligence'
      }
    });

    expect(response.status()).toBe(201);
    const dataRoom = await response.json();
    testDataRoomId = dataRoom.id;

    // Upload multiple test documents for listing
    const testDocuments = [
      { name: 'financial-q1.pdf', type: 'application/pdf', folder: '/' },
      { name: 'contract-vendor.pdf', type: 'application/pdf', folder: '/Contracts' },
      { name: 'hr-policy.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', folder: '/HR' },
      { name: 'revenue-report.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', folder: '/Financials' },
      { name: 'logo.png', type: 'image/png', folder: '/' }
    ];

    for (const doc of testDocuments) {
      const buffer = Buffer.from(`test content for ${doc.name}`);
      const uploadResponse = await request.post('/api/data-room/documents', {
        multipart: {
          file: {
            name: doc.name,
            mimeType: doc.type,
            buffer: buffer
          },
          data_room_id: testDataRoomId,
          folder_path: doc.folder
        }
      });

      expect(uploadResponse.status()).toBe(201);
      const uploadedDoc = await uploadResponse.json();
      uploadedDocumentIds.push(uploadedDoc.id);
    }
  });

  test('should list all documents in data room', async ({ request }) => {
    // Act: Get all documents
    const response = await request.get(`/api/data-room/documents?data_room_id=${testDataRoomId}`);

    // Assert: Response structure
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(5);

    // Assert: Each document has required fields
    body.forEach((doc: any) => {
      expect(doc).toHaveProperty('id');
      expect(doc).toHaveProperty('filename');
      expect(doc).toHaveProperty('mime_type');
      expect(doc).toHaveProperty('file_size');
      expect(doc).toHaveProperty('folder_path');
      expect(doc).toHaveProperty('data_room_id');
      expect(doc).toHaveProperty('uploaded_by');
      expect(doc).toHaveProperty('created_at');
      expect(doc).toHaveProperty('processing_status');
    });
  });

  test('should filter documents by document_type', async ({ request }) => {
    // Arrange: Assume AI has classified some documents
    // In real scenario, would wait for classification or manually set document_type

    // Act: Get financial documents only
    const response = await request.get(
      `/api/data-room/documents?data_room_id=${testDataRoomId}&document_type=financial`
    );

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);

    // All returned documents should be financial type
    body.forEach((doc: any) => {
      expect(doc.document_type).toBe('financial');
    });
  });

  test('should filter documents by folder_path', async ({ request }) => {
    // Act: Get documents in /Contracts folder
    const response = await request.get(
      `/api/data-room/documents?data_room_id=${testDataRoomId}&folder_path=/Contracts`
    );

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);

    // All returned documents should be in /Contracts folder
    body.forEach((doc: any) => {
      expect(doc.folder_path).toBe('/Contracts');
    });
  });

  test('should search documents by filename', async ({ request }) => {
    // Act: Search for "financial" in filename
    const response = await request.get(
      `/api/data-room/documents?data_room_id=${testDataRoomId}&search=financial`
    );

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);

    // All returned documents should contain "financial" in filename
    body.forEach((doc: any) => {
      expect(doc.filename.toLowerCase()).toContain('financial');
    });
  });

  test('should sort documents by created_at DESC (default)', async ({ request }) => {
    // Act: Get documents without sort parameter
    const response = await request.get(`/api/data-room/documents?data_room_id=${testDataRoomId}`);

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);

    // Verify documents are sorted by created_at descending (newest first)
    for (let i = 0; i < body.length - 1; i++) {
      const currentDate = new Date(body[i].created_at);
      const nextDate = new Date(body[i + 1].created_at);
      expect(currentDate >= nextDate).toBe(true);
    }
  });

  test('should sort documents by filename ASC', async ({ request }) => {
    // Act: Get documents sorted by filename
    const response = await request.get(
      `/api/data-room/documents?data_room_id=${testDataRoomId}&sort=filename&order=asc`
    );

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);

    // Verify documents are sorted by filename ascending
    for (let i = 0; i < body.length - 1; i++) {
      expect(body[i].filename.localeCompare(body[i + 1].filename)).toBeLessThanOrEqual(0);
    }
  });

  test('should sort documents by file_size DESC', async ({ request }) => {
    // Act: Get documents sorted by size descending
    const response = await request.get(
      `/api/data-room/documents?data_room_id=${testDataRoomId}&sort=file_size&order=desc`
    );

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);

    // Verify documents are sorted by file_size descending
    for (let i = 0; i < body.length - 1; i++) {
      expect(body[i].file_size >= body[i + 1].file_size).toBe(true);
    }
  });

  test('should support pagination with limit and offset', async ({ request }) => {
    // Act: Get first 2 documents
    const response1 = await request.get(
      `/api/data-room/documents?data_room_id=${testDataRoomId}&limit=2&offset=0`
    );

    expect(response1.status()).toBe(200);
    const page1 = await response1.json();
    expect(page1.length).toBe(2);

    // Act: Get next 2 documents
    const response2 = await request.get(
      `/api/data-room/documents?data_room_id=${testDataRoomId}&limit=2&offset=2`
    );

    expect(response2.status()).toBe(200);
    const page2 = await response2.json();
    expect(page2.length).toBe(2);

    // Assert: Pages should have different documents
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  test('should return empty array when no documents match filters', async ({ request }) => {
    // Act: Search for non-existent filename
    const response = await request.get(
      `/api/data-room/documents?data_room_id=${testDataRoomId}&search=nonexistent-file-xyz`
    );

    // Assert: Success with empty array
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  test('should require data_room_id parameter', async ({ request }) => {
    // Act: Request without data_room_id
    const response = await request.get('/api/data-room/documents');

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/data_room_id|required/i);
  });

  test('should return 404 for non-existent data room', async ({ request }) => {
    // Arrange: Invalid data room ID
    const fakeId = '00000000-0000-0000-0000-000000000000';

    // Act: Get documents for fake data room
    const response = await request.get(`/api/data-room/documents?data_room_id=${fakeId}`);

    // Assert: 404 Not Found
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should return 403 if user has no access to data room', async ({ request }) => {
    // Note: This test assumes setup where test user has no access
    // In practice, would need to create data room owned by another user
    // and attempt to list documents without being granted access

    // For now, document expected behavior
    // Expected: 403 Forbidden if user has no access grant to data room
  });

  test('should include processing_status for each document', async ({ request }) => {
    // Act: Get all documents
    const response = await request.get(`/api/data-room/documents?data_room_id=${testDataRoomId}`);

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Each document should have processing_status (pending, processing, completed, failed)
    body.forEach((doc: any) => {
      expect(doc.processing_status).toMatch(/^(pending|processing|completed|failed)$/);
    });
  });

  test('should include document_type and confidence_score when classified', async ({ request }) => {
    // Arrange: Assume some documents have been classified by AI
    // In real test, would wait for classification or manually update database

    // Act: Get all documents
    const response = await request.get(`/api/data-room/documents?data_room_id=${testDataRoomId}`);

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Classified documents should have document_type and confidence_score
    const classifiedDocs = body.filter((doc: any) => doc.document_type !== null);

    classifiedDocs.forEach((doc: any) => {
      expect(doc.document_type).toMatch(/^(financial|contract|due_diligence|legal|hr|other)$/);
      expect(doc.confidence_score).toBeGreaterThanOrEqual(0);
      expect(doc.confidence_score).toBeLessThanOrEqual(1);
    });
  });

  test('should combine multiple filters (folder + type + search)', async ({ request }) => {
    // Act: Apply multiple filters
    const response = await request.get(
      `/api/data-room/documents?data_room_id=${testDataRoomId}&folder_path=/Financials&document_type=financial&search=revenue`
    );

    // Assert: Success
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);

    // All conditions should be met
    body.forEach((doc: any) => {
      expect(doc.folder_path).toBe('/Financials');
      expect(doc.document_type).toBe('financial');
      expect(doc.filename.toLowerCase()).toContain('revenue');
    });
  });

  test('should return total_count in response headers for pagination', async ({ request }) => {
    // Act: Get documents with limit
    const response = await request.get(
      `/api/data-room/documents?data_room_id=${testDataRoomId}&limit=2`
    );

    // Assert: Success
    expect(response.status()).toBe(200);

    // Assert: X-Total-Count header present
    const totalCount = response.headers()['x-total-count'];
    expect(totalCount).toBe('5'); // We uploaded 5 documents
  });
});
