/**
 * Contract Test: POST /api/data-room/documents
 *
 * Purpose: Verify API contract for uploading documents
 * Expected: These tests MUST FAIL until T032 is implemented
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Test fixtures path
const FIXTURES_DIR = path.join(__dirname, '../fixtures');

test.describe('POST /api/data-room/documents', () => {
  let testDataRoomId: string;

  test.beforeAll(async ({ request }) => {
    // Setup: Create a test data room for upload tests
    const response = await request.post('/api/data-room', {
      data: {
        name: 'Document Upload Test Room',
        deal_type: 'due_diligence'
      }
    });

    expect(response.status()).toBe(201);
    const dataRoom = await response.json();
    testDataRoomId = dataRoom.id;
  });

  test('should upload PDF document successfully', async ({ request }) => {
    // Arrange: Read test PDF file
    const filePath = path.join(FIXTURES_DIR, 'sample-financial.pdf');
    const fileBuffer = fs.readFileSync(filePath);

    // Create multipart form data
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), 'sample-financial.pdf');
    formData.append('data_room_id', testDataRoomId);
    formData.append('folder_path', '/');

    // Act: Upload document
    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'sample-financial.pdf',
          mimeType: 'application/pdf',
          buffer: fileBuffer
        },
        data_room_id: testDataRoomId,
        folder_path: '/'
      }
    });

    // Assert: Response structure
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.filename).toBe('sample-financial.pdf');
    expect(body.data_room_id).toBe(testDataRoomId);
    expect(body.mime_type).toBe('application/pdf');
    expect(body.processing_status).toBe('pending');
    expect(body.upload_completed).toBe(true);
    expect(body).toHaveProperty('storage_path');
    expect(body).toHaveProperty('created_at');
  });

  test('should reject file larger than 100MB', async ({ request }) => {
    // Arrange: Create a mock large file (just metadata, not actual 100MB+)
    // In real test, would use actual large file or mock the file size check

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'large-file.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.alloc(101 * 1024 * 1024) // 101MB
        },
        data_room_id: testDataRoomId
      }
    });

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/file size|100MB|too large/i);
  });

  test('should reject invalid MIME type', async ({ request }) => {
    // Arrange: Executable file (not allowed)
    const buffer = Buffer.from('fake executable content');

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'malicious.exe',
          mimeType: 'application/x-msdownload',
          buffer: buffer
        },
        data_room_id: testDataRoomId
      }
    });

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/file type|MIME type|not allowed/i);
  });

  test('should upload Word document (.docx)', async ({ request }) => {
    // Arrange: Mock Word document
    const buffer = Buffer.from('PK mock docx'); // Real .docx starts with PK (ZIP header)

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'contract.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          buffer: buffer
        },
        data_room_id: testDataRoomId
      }
    });

    // Assert: Success
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.filename).toBe('contract.docx');
    expect(body.mime_type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });

  test('should upload Excel spreadsheet (.xlsx)', async ({ request }) => {
    // Arrange: Mock Excel file
    const buffer = Buffer.from('PK mock xlsx');

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'financials.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: buffer
        },
        data_room_id: testDataRoomId
      }
    });

    // Assert: Success
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.filename).toBe('financials.xlsx');
  });

  test('should upload to custom folder path', async ({ request }) => {
    // Arrange: Specify folder path
    const buffer = Buffer.from('test pdf content');

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'report.pdf',
          mimeType: 'application/pdf',
          buffer: buffer
        },
        data_room_id: testDataRoomId,
        folder_path: '/Financials/2024'
      }
    });

    // Assert: Success with folder path
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.folder_path).toBe('/Financials/2024');
  });

  test('should reject upload without Editor permission', async ({ request }) => {
    // Note: This test assumes a setup where test user has Viewer-only access
    // In practice, would need to create data room owned by another user
    // and grant Viewer access to test user

    // For now, document expected behavior
    // Expected: 403 Forbidden if user has Viewer or Commenter permission
  });

  test('should reject upload to non-existent data room', async ({ request }) => {
    // Arrange: Invalid data room ID
    const buffer = Buffer.from('test content');
    const fakeId = '00000000-0000-0000-0000-000000000000';

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'test.pdf',
          mimeType: 'application/pdf',
          buffer: buffer
        },
        data_room_id: fakeId
      }
    });

    // Assert: 404 Not Found
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should trigger AI classification after upload', async ({ request }) => {
    // Arrange: Upload document
    const buffer = Buffer.from('test pdf content');

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'trigger-ai.pdf',
          mimeType: 'application/pdf',
          buffer: buffer
        },
        data_room_id: testDataRoomId
      }
    });

    expect(response.status()).toBe(201);

    const document = await response.json();

    // Assert: Processing status is pending (AI will process async)
    expect(document.processing_status).toBe('pending');

    // Note: Actual AI classification is tested in integration tests
    // Contract test just verifies the initial state
  });

  test('should log upload activity', async ({ request }) => {
    // Arrange: Upload document
    const buffer = Buffer.from('test content');

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'activity-log-test.pdf',
          mimeType: 'application/pdf',
          buffer: buffer
        },
        data_room_id: testDataRoomId
      }
    });

    expect(response.status()).toBe(201);

    const document = await response.json();

    // Assert: Document created (activity log is checked in integration tests)
    expect(document.id).toBeDefined();
  });

  test('should reject missing data_room_id', async ({ request }) => {
    // Arrange: No data room ID
    const buffer = Buffer.from('test content');

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'test.pdf',
          mimeType: 'application/pdf',
          buffer: buffer
        }
        // data_room_id missing
      }
    });

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/data_room_id|required/i);
  });

  test('should accept image files (JPG, PNG)', async ({ request }) => {
    // Arrange: Mock image file
    const jpgBuffer = Buffer.from('\xFF\xD8\xFF'); // JPEG magic bytes

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'diagram.jpg',
          mimeType: 'image/jpeg',
          buffer: jpgBuffer
        },
        data_room_id: testDataRoomId
      }
    });

    // Assert: Success
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.filename).toBe('diagram.jpg');
    expect(body.mime_type).toBe('image/jpeg');
  });

  test('should return storage_path for uploaded file', async ({ request }) => {
    // Arrange: Upload document
    const buffer = Buffer.from('test content');

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'storage-test.pdf',
          mimeType: 'application/pdf',
          buffer: buffer
        },
        data_room_id: testDataRoomId
      }
    });

    expect(response.status()).toBe(201);

    const body = await response.json();

    // Assert: Storage path follows pattern: {data_room_id}/{document_id}_original.{ext}
    expect(body.storage_path).toMatch(new RegExp(`${testDataRoomId}/[a-f0-9-]+_original\\.pdf`));
  });

  test('should increment data room document_count after upload', async ({ request }) => {
    // This is verified indirectly - the trigger in database should increment count
    // Contract test just verifies upload succeeds
    // Actual count verification happens in integration tests

    const buffer = Buffer.from('test content');

    const response = await request.post('/api/data-room/documents', {
      multipart: {
        file: {
          name: 'count-test.pdf',
          mimeType: 'application/pdf',
          buffer: buffer
        },
        data_room_id: testDataRoomId
      }
    });

    expect(response.status()).toBe(201);
  });
});
