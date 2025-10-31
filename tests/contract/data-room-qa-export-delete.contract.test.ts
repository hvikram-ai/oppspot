/**
 * Contract Test: GET /api/data-room/[dataRoomId]/export & DELETE /api/data-room/[dataRoomId]/history
 * Feature: 008-oppspot-docs-dataroom
 * Task: T007
 * Reference: contracts/export-delete-api.yaml
 *
 * IMPORTANT: This test MUST FAIL until T025 and T026 are implemented
 */

import { test, expect } from '@playwright/test';
import type { ErrorResponse } from '@/types/data-room-qa';

interface ExportResponse {
  download_url: string;
  expires_at: string;
  file_size_bytes: number;
}

interface DeleteResponse {
  deleted_count: number;
}

// Helper to create test queries for export/delete testing
async function createTestQueries(request: any, dataRoomId: string, count: number): Promise<string[]> {
  const queryIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const response = await request.post(`/api/data-room/${dataRoomId}/query`, {
      data: {
        question: `Test question ${i + 1} for export/delete`,
        stream: false,
      },
    });

    if (response.ok()) {
      const data = await response.json();
      queryIds.push(data.query_id);
    }

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  return queryIds;
}

test.describe('Export & Delete API - Contract Tests', () => {
  const TEST_DATA_ROOM_ID = 'test-room-' + Date.now();

  test.describe('GET /api/data-room/[dataRoomId]/export - Export Scenarios', () => {
    test.beforeEach(async ({ request }) => {
      // Create some test queries for export
      await createTestQueries(request, TEST_DATA_ROOM_ID, 5);
    });

    test('returns 200 with JSON format (default)', async ({ request }) => {
      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/export`);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data: ExportResponse = await response.json();

      // Validate response structure (from OpenAPI spec)
      expect(data).toHaveProperty('download_url');
      expect(data).toHaveProperty('expires_at');
      expect(data).toHaveProperty('file_size_bytes');

      // Validate download_url is a valid URL
      expect(typeof data.download_url).toBe('string');
      expect(data.download_url).toMatch(/^https?:\/\//);

      // Validate expires_at is ISO date format
      expect(typeof data.expires_at).toBe('string');
      const expiresDate = new Date(data.expires_at);
      expect(expiresDate.toString()).not.toBe('Invalid Date');

      // Should expire in the future (within 1 hour per spec)
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      expect(expiresDate.getTime()).toBeGreaterThan(now.getTime());
      expect(expiresDate.getTime()).toBeLessThanOrEqual(oneHourFromNow.getTime());

      // Validate file_size_bytes
      expect(typeof data.file_size_bytes).toBe('number');
      expect(data.file_size_bytes).toBeGreaterThan(0);
    });

    test('returns 200 with JSON format when explicitly specified', async ({ request }) => {
      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/export?format=json`);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data: ExportResponse = await response.json();

      expect(data).toHaveProperty('download_url');
      expect(data).toHaveProperty('expires_at');
      expect(data).toHaveProperty('file_size_bytes');
    });

    test('returns 200 with CSV format when specified', async ({ request }) => {
      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/export?format=csv`);

      expect(response.status()).toBe(200);

      // CSV can be returned directly or as a signed URL
      // Check if it's direct CSV or JSON with URL
      const contentType = response.headers()['content-type'];

      if (contentType?.includes('text/csv') || contentType?.includes('application/csv')) {
        // Direct CSV response
        const csvText = await response.text();

        // Validate CSV structure
        expect(csvText).toBeTruthy();
        expect(csvText).toContain('question');
        expect(csvText).toContain('answer');
        expect(csvText).toContain('created_at');
      } else if (contentType?.includes('application/json')) {
        // JSON response with signed URL to CSV
        const data: ExportResponse = await response.json();
        expect(data).toHaveProperty('download_url');
        expect(data.download_url).toMatch(/\.csv/);
      }
    });

    test('returns 400 for invalid format parameter', async ({ request }) => {
      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/export?format=xml`);

      expect(response.status()).toBe(400);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBeTruthy();
      expect(error.message.toLowerCase()).toContain('format');
    });

    test('returns 401 for unauthenticated user', async ({ request }) => {
      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/export`, {
        headers: {
          // No Authorization header
        },
      });

      expect(response.status()).toBe(401);
    });

    test('returns empty export for data room with no queries', async ({ request }) => {
      const emptyRoomId = 'empty-room-' + Date.now();

      const response = await request.get(`/api/data-room/${emptyRoomId}/export`);

      // Should still return 200 with empty export
      expect(response.status()).toBe(200);

      const data: ExportResponse = await response.json();

      // Should still have all required fields
      expect(data).toHaveProperty('download_url');
      expect(data).toHaveProperty('expires_at');
      expect(data).toHaveProperty('file_size_bytes');

      // File size should be minimal (just headers or empty array)
      expect(data.file_size_bytes).toBeGreaterThanOrEqual(0);
    });

    test('download URL is accessible and returns valid data', async ({ request }) => {
      const exportResponse = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/export?format=json`);

      expect(exportResponse.status()).toBe(200);

      const data: ExportResponse = await exportResponse.json();

      // Try to download the file using the signed URL
      const downloadResponse = await request.get(data.download_url);

      expect(downloadResponse.status()).toBe(200);

      // Validate the downloaded content
      const downloadedData = await downloadResponse.json();

      expect(Array.isArray(downloadedData) || typeof downloadedData === 'object').toBe(true);
    });

    test('exported data includes all query fields', async ({ request }) => {
      const exportResponse = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/export?format=json`);

      expect(exportResponse.status()).toBe(200);

      const data: ExportResponse = await exportResponse.json();

      // Download and validate structure
      const downloadResponse = await request.get(data.download_url);
      const exportedData = await downloadResponse.json();

      if (Array.isArray(exportedData) && exportedData.length > 0) {
        const firstQuery = exportedData[0];

        // Should include key fields from query history
        expect(firstQuery).toHaveProperty('question');
        expect(firstQuery).toHaveProperty('created_at');
        // May include: answer, citations, feedback, etc.
      }
    });
  });

  test.describe('DELETE /api/data-room/[dataRoomId]/history - Delete Scenarios', () => {
    let testQueryIds: string[];

    test.beforeEach(async ({ request }) => {
      // Create test queries for deletion
      testQueryIds = await createTestQueries(request, TEST_DATA_ROOM_ID, 10);
    });

    test('deletes individual queries when query_ids provided', async ({ request }) => {
      // Select 3 queries to delete
      const queriesToDelete = testQueryIds.slice(0, 3);

      const response = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        data: {
          query_ids: queriesToDelete,
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data: DeleteResponse = await response.json();

      // Validate response structure
      expect(data).toHaveProperty('deleted_count');
      expect(typeof data.deleted_count).toBe('number');

      // Should have deleted exactly 3 queries
      expect(data.deleted_count).toBe(3);
    });

    test('deletes all queries when query_ids omitted (bulk delete)', async ({ request }) => {
      const response = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        data: {}, // No query_ids = delete all
      });

      expect(response.status()).toBe(200);

      const data: DeleteResponse = await response.json();

      expect(data).toHaveProperty('deleted_count');

      // Should have deleted all 10 test queries
      expect(data.deleted_count).toBeGreaterThanOrEqual(10);
    });

    test('deletes all queries when request body is empty', async ({ request }) => {
      const response = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`);

      expect(response.status()).toBe(200);

      const data: DeleteResponse = await response.json();

      expect(data).toHaveProperty('deleted_count');
      expect(data.deleted_count).toBeGreaterThanOrEqual(0);
    });

    test('returns 0 deleted_count for empty query_ids array', async ({ request }) => {
      const response = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        data: {
          query_ids: [], // Empty array
        },
      });

      expect(response.status()).toBe(200);

      const data: DeleteResponse = await response.json();

      expect(data.deleted_count).toBe(0);
    });

    test('returns 401 for unauthenticated user', async ({ request }) => {
      const response = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        headers: {
          // No Authorization header
        },
      });

      expect(response.status()).toBe(401);
    });

    test('handles deletion of non-existent query gracefully', async ({ request }) => {
      const nonExistentId = '12345678-1234-1234-1234-123456789012';

      const response = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        data: {
          query_ids: [nonExistentId],
        },
      });

      // Should return 200 with deleted_count = 0 (idempotent)
      expect(response.status()).toBe(200);

      const data: DeleteResponse = await response.json();
      expect(data.deleted_count).toBe(0);
    });

    test('only deletes valid query IDs from mixed array', async ({ request }) => {
      const nonExistentId = '12345678-1234-1234-1234-123456789012';
      const validId = testQueryIds[0];

      const response = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        data: {
          query_ids: [validId, nonExistentId],
        },
      });

      expect(response.status()).toBe(200);

      const data: DeleteResponse = await response.json();

      // Should only delete the 1 valid query
      expect(data.deleted_count).toBe(1);
    });

    test('returns 400 for invalid UUID format in query_ids', async ({ request }) => {
      const response = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        data: {
          query_ids: ['not-a-uuid', 'also-invalid'],
        },
      });

      expect(response.status()).toBe(400);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBeTruthy();
      expect(error.message.toLowerCase()).toContain('uuid');
    });
  });

  test.describe('GDPR Compliance (FR-022a, FR-022b)', () => {
    test('cascading delete removes citations and feedback', async ({ request }) => {
      // Create a query
      const queryIds = await createTestQueries(request, TEST_DATA_ROOM_ID, 1);
      const queryId = queryIds[0];

      // Add feedback to the query
      await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: {
          query_id: queryId,
          rating: 'helpful',
          comment: 'Test feedback',
        },
      });

      // Delete the query
      const deleteResponse = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        data: {
          query_ids: [queryId],
        },
      });

      expect(deleteResponse.status()).toBe(200);

      const deleteData: DeleteResponse = await deleteResponse.json();
      expect(deleteData.deleted_count).toBe(1);

      // Verify the query no longer appears in history
      const historyResponse = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history`);

      expect(historyResponse.status()).toBe(200);

      const historyData = await historyResponse.json();

      // Query should not be in the history
      const deletedQuery = historyData.queries.find((q: any) => q.query_id === queryId);
      expect(deletedQuery).toBeUndefined();
    });

    test('user can export then delete all data (GDPR full workflow)', async ({ request }) => {
      // Create queries
      await createTestQueries(request, TEST_DATA_ROOM_ID, 5);

      // Step 1: Export data (FR-022b - data portability)
      const exportResponse = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/export?format=json`);

      expect(exportResponse.status()).toBe(200);

      const exportData: ExportResponse = await exportResponse.json();

      expect(exportData.download_url).toBeTruthy();

      // Step 2: Verify data is exportable
      const downloadResponse = await request.get(exportData.download_url);
      expect(downloadResponse.status()).toBe(200);

      // Step 3: Delete all data (FR-022a - right to erasure)
      const deleteResponse = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`);

      expect(deleteResponse.status()).toBe(200);

      const deleteData: DeleteResponse = await deleteResponse.json();

      expect(deleteData.deleted_count).toBeGreaterThanOrEqual(5);

      // Step 4: Verify data is gone
      const historyResponse = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history`);

      expect(historyResponse.status()).toBe(200);

      const historyData = await historyResponse.json();

      // Should have no queries left
      expect(historyData.queries).toEqual([]);
      expect(historyData.has_more).toBe(false);
    });

    test('deletion is user-specific (RLS enforced)', async ({ request }) => {
      // This test verifies that users can only delete their own queries
      // Implementation requires multi-user test setup

      // Expected behavior:
      // - User A creates queries
      // - User B tries to delete User A's queries
      // - User B should get 403 or deleted_count = 0 (RLS filters)

      // For now, we document the expected behavior
      // const userBDeleteResponse = await requestAsUserB.delete(
      //   `/api/data-room/${TEST_DATA_ROOM_ID}/history`,
      //   {
      //     data: {
      //       query_ids: [userAQueryId],
      //     },
      //   }
      // );
      // expect([403, 200]).toContain(userBDeleteResponse.status());
      // if (userBDeleteResponse.status() === 200) {
      //   const data = await userBDeleteResponse.json();
      //   expect(data.deleted_count).toBe(0); // RLS prevents deletion
      // }
    });
  });

  test.describe('Edge Cases & Error Handling', () => {
    test('export handles large query history efficiently', async ({ request }) => {
      // Create many queries
      await createTestQueries(request, TEST_DATA_ROOM_ID, 100);

      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/export?format=json`);

      expect(response.status()).toBe(200);

      const data: ExportResponse = await response.json();

      expect(data.download_url).toBeTruthy();
      expect(data.file_size_bytes).toBeGreaterThan(0);

      // File size should be reasonable (not bloated)
      // Assuming ~1KB per query, 100 queries ~= 100KB
      expect(data.file_size_bytes).toBeLessThan(1000000); // Less than 1MB
    });

    test('delete handles duplicate query_ids in array', async ({ request }) => {
      const queryIds = await createTestQueries(request, TEST_DATA_ROOM_ID, 1);
      const queryId = queryIds[0];

      // Try to delete the same query twice in one request
      const response = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        data: {
          query_ids: [queryId, queryId, queryId], // Duplicate IDs
        },
      });

      expect(response.status()).toBe(200);

      const data: DeleteResponse = await response.json();

      // Should only delete once (idempotent)
      expect(data.deleted_count).toBe(1);
    });

    test('delete is idempotent - can call multiple times', async ({ request }) => {
      const queryIds = await createTestQueries(request, TEST_DATA_ROOM_ID, 1);

      // First delete
      const firstResponse = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        data: {
          query_ids: queryIds,
        },
      });

      expect(firstResponse.status()).toBe(200);

      const firstData: DeleteResponse = await firstResponse.json();
      expect(firstData.deleted_count).toBe(1);

      // Second delete (same query IDs)
      const secondResponse = await request.delete(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        data: {
          query_ids: queryIds,
        },
      });

      expect(secondResponse.status()).toBe(200);

      const secondData: DeleteResponse = await secondResponse.json();

      // Should return 0 (already deleted)
      expect(secondData.deleted_count).toBe(0);
    });

    test('export handles special characters in query text', async ({ request }) => {
      // Create a query with special characters
      await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/query`, {
        data: {
          question: 'Test with "quotes", commas, and <html> tags & symbols',
          stream: false,
        },
      });

      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/export?format=csv`);

      expect(response.status()).toBe(200);

      // CSV should properly escape special characters
      // No assertion on content since we can't easily verify escaped content
      // but the request should succeed
    });
  });
});
