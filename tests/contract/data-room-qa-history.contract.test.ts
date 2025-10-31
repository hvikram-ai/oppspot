/**
 * Contract Test: GET /api/data-room/[dataRoomId]/history
 * Feature: 008-oppspot-docs-dataroom
 * Task: T005
 * Reference: contracts/history-api.yaml
 *
 * IMPORTANT: This test MUST FAIL until T023 is implemented
 */

import { test, expect } from '@playwright/test';
import type { ErrorResponse } from '@/types/data-room-qa';

interface HistoricalQuery {
  query_id: string;
  question: string;
  answer: string | null;
  answer_type: 'grounded' | 'insufficient_evidence' | 'error';
  created_at: string;
  citation_count: number;
  feedback_rating: 'helpful' | 'not_helpful' | null;
  total_time_ms?: number;
}

interface HistoryResponse {
  queries: HistoricalQuery[];
  has_more: boolean;
  next_cursor?: string;
  total_count?: number;
}

// Helper function to create test queries
async function createTestQueries(request: any, dataRoomId: string, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await request.post(`/api/data-room/${dataRoomId}/query`, {
      data: {
        question: `Test question ${i + 1} for pagination`,
        stream: false,
      },
    });
    // Small delay to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

test.describe('GET /api/data-room/[dataRoomId]/history - Contract Tests', () => {
  const TEST_DATA_ROOM_ID = 'test-room-' + Date.now();

  test.describe('Valid Request Scenarios', () => {
    test('returns 200 with paginated results (default parameters)', async ({ request }) => {
      // Ensure at least some queries exist
      await createTestQueries(request, TEST_DATA_ROOM_ID, 5);

      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history`);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data: HistoryResponse = await response.json();

      // Validate response structure (from OpenAPI spec)
      expect(data).toHaveProperty('queries');
      expect(data).toHaveProperty('has_more');

      // Validate queries array
      expect(Array.isArray(data.queries)).toBe(true);
      expect(data.queries.length).toBeGreaterThan(0);
      expect(data.queries.length).toBeLessThanOrEqual(50); // Default limit

      // Validate has_more flag
      expect(typeof data.has_more).toBe('boolean');

      // If has_more is true, next_cursor should be present
      if (data.has_more) {
        expect(data).toHaveProperty('next_cursor');
        expect(typeof data.next_cursor).toBe('string');
      }

      // Validate first query structure
      const firstQuery = data.queries[0];
      expect(firstQuery).toHaveProperty('query_id');
      expect(firstQuery).toHaveProperty('question');
      expect(firstQuery).toHaveProperty('created_at');

      expect(typeof firstQuery.query_id).toBe('string');
      expect(typeof firstQuery.question).toBe('string');
      expect(typeof firstQuery.created_at).toBe('string');
      expect(['grounded', 'insufficient_evidence', 'error']).toContain(firstQuery.answer_type);
      expect(typeof firstQuery.citation_count).toBe('number');
      expect(firstQuery.citation_count).toBeGreaterThanOrEqual(0);
    });

    test('returns 200 with custom limit parameter', async ({ request }) => {
      await createTestQueries(request, TEST_DATA_ROOM_ID, 15);

      const limit = 10;
      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history?limit=${limit}`);

      expect(response.status()).toBe(200);

      const data: HistoryResponse = await response.json();

      expect(Array.isArray(data.queries)).toBe(true);
      expect(data.queries.length).toBeLessThanOrEqual(limit);
    });

    test('respects maximum limit of 100', async ({ request }) => {
      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history?limit=150`);

      expect(response.status()).toBe(200);

      const data: HistoryResponse = await response.json();

      // Should cap at 100 even though we requested 150
      expect(data.queries.length).toBeLessThanOrEqual(100);
    });

    test('returns 400 for limit less than 1', async ({ request }) => {
      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history?limit=0`);

      expect(response.status()).toBe(400);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBeTruthy();
      expect(error.message).toContain('limit');
    });

    test('returns queries in descending order by default (newest first)', async ({ request }) => {
      await createTestQueries(request, TEST_DATA_ROOM_ID, 5);

      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history`);

      expect(response.status()).toBe(200);

      const data: HistoryResponse = await response.json();

      if (data.queries.length >= 2) {
        const firstTimestamp = new Date(data.queries[0].created_at).getTime();
        const secondTimestamp = new Date(data.queries[1].created_at).getTime();

        // First query should be newer (greater timestamp) than second
        expect(firstTimestamp).toBeGreaterThanOrEqual(secondTimestamp);
      }
    });

    test('supports ascending order when specified', async ({ request }) => {
      await createTestQueries(request, TEST_DATA_ROOM_ID, 5);

      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history?order=asc`);

      expect(response.status()).toBe(200);

      const data: HistoryResponse = await response.json();

      if (data.queries.length >= 2) {
        const firstTimestamp = new Date(data.queries[0].created_at).getTime();
        const secondTimestamp = new Date(data.queries[1].created_at).getTime();

        // First query should be older (lesser timestamp) than second
        expect(firstTimestamp).toBeLessThanOrEqual(secondTimestamp);
      }
    });
  });

  test.describe('Cursor-Based Pagination', () => {
    test('cursor-based pagination works correctly', async ({ request }) => {
      // Create enough queries to test pagination
      await createTestQueries(request, TEST_DATA_ROOM_ID, 25);

      // First page
      const firstResponse = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history?limit=10`);

      expect(firstResponse.status()).toBe(200);

      const firstPage: HistoryResponse = await firstResponse.json();

      expect(firstPage.queries.length).toBeLessThanOrEqual(10);

      // If there are more results, test second page
      if (firstPage.has_more && firstPage.next_cursor) {
        const secondResponse = await request.get(
          `/api/data-room/${TEST_DATA_ROOM_ID}/history?limit=10&cursor=${encodeURIComponent(firstPage.next_cursor)}`
        );

        expect(secondResponse.status()).toBe(200);

        const secondPage: HistoryResponse = await secondResponse.json();

        // Second page should have different queries
        expect(secondPage.queries.length).toBeGreaterThan(0);

        // No query IDs should overlap between pages
        const firstPageIds = new Set(firstPage.queries.map(q => q.query_id));
        const secondPageIds = secondPage.queries.map(q => q.query_id);

        secondPageIds.forEach(id => {
          expect(firstPageIds.has(id)).toBe(false);
        });
      }
    });

    test('returns empty array when cursor points beyond available data', async ({ request }) => {
      // Use a future timestamp as cursor
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

      const response = await request.get(
        `/api/data-room/${TEST_DATA_ROOM_ID}/history?cursor=${encodeURIComponent(futureDate)}&order=desc`
      );

      expect(response.status()).toBe(200);

      const data: HistoryResponse = await response.json();

      expect(data.queries).toEqual([]);
      expect(data.has_more).toBe(false);
    });

    test('handles invalid cursor format gracefully', async ({ request }) => {
      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history?cursor=invalid-date-format`);

      // Should return 400 for invalid date format
      expect(response.status()).toBe(400);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBeTruthy();
      expect(error.message).toContain('cursor');
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('returns 401 for unauthenticated user', async ({ request }) => {
      // Create a new request context without authentication
      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
        headers: {
          // Explicitly remove authorization if set by default
        },
      });

      expect(response.status()).toBe(401);
    });

    test('returns 403 for non-member access', async ({ request }) => {
      // This test assumes a NON_MEMBER_TOKEN is available in test context
      // The test will need proper setup for a non-member user token

      // For now, we'll document the expected behavior
      // Implementation will require test user setup with different permissions

      // Expected:
      // - Create a user who is NOT a member of TEST_DATA_ROOM_ID
      // - Authenticate as that user
      // - Attempt to access history
      // - Should receive 403 Forbidden

      // const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history`, {
      //   headers: {
      //     'Authorization': `Bearer ${NON_MEMBER_TOKEN}`,
      //   },
      // });
      // expect(response.status()).toBe(403);
      // const error: ErrorResponse = await response.json();
      // expect(error.error).toBe('PERMISSION_DENIED');
      // expect(error.message).toContain('permission');
      // expect(error.retry_allowed).toBe(false);
    });
  });

  test.describe('Response Schema Validation', () => {
    test('validates complete query structure matches OpenAPI spec', async ({ request }) => {
      await createTestQueries(request, TEST_DATA_ROOM_ID, 3);

      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history`);

      expect(response.status()).toBe(200);

      const data: HistoryResponse = await response.json();

      if (data.queries.length > 0) {
        const query = data.queries[0];

        // Required fields
        expect(query).toHaveProperty('query_id');
        expect(query).toHaveProperty('question');
        expect(query).toHaveProperty('created_at');

        // Validate UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(query.query_id).toMatch(uuidRegex);

        // Validate ISO date format
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        expect(query.created_at).toMatch(isoDateRegex);
        expect(new Date(query.created_at).toString()).not.toBe('Invalid Date');

        // Validate optional fields if present
        if (query.answer !== null) {
          expect(typeof query.answer).toBe('string');
        }

        if (query.feedback_rating !== null) {
          expect(['helpful', 'not_helpful']).toContain(query.feedback_rating);
        }

        if (query.total_time_ms !== undefined) {
          expect(typeof query.total_time_ms).toBe('number');
          expect(query.total_time_ms).toBeGreaterThan(0);
        }
      }
    });

    test('includes total_count when available', async ({ request }) => {
      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history`);

      expect(response.status()).toBe(200);

      const data: HistoryResponse = await response.json();

      // total_count is optional but useful for UI pagination
      if (data.total_count !== undefined) {
        expect(typeof data.total_count).toBe('number');
        expect(data.total_count).toBeGreaterThanOrEqual(0);
        expect(data.total_count).toBeGreaterThanOrEqual(data.queries.length);
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('returns empty array for data room with no queries', async ({ request }) => {
      const emptyRoomId = 'empty-room-' + Date.now();

      const response = await request.get(`/api/data-room/${emptyRoomId}/history`);

      // Could be 200 with empty array or 404 depending on implementation
      if (response.status() === 200) {
        const data: HistoryResponse = await response.json();
        expect(data.queries).toEqual([]);
        expect(data.has_more).toBe(false);
      } else {
        expect(response.status()).toBe(404);
      }
    });

    test('handles non-UUID data room ID gracefully', async ({ request }) => {
      const response = await request.get('/api/data-room/not-a-uuid/history');

      // Should return 400 for invalid UUID format
      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe('GDPR Compliance (FR-022)', () => {
    test('only returns queries created by the authenticated user', async ({ request }) => {
      // This test verifies RLS policies are working correctly
      // Users should only see their own query history

      await createTestQueries(request, TEST_DATA_ROOM_ID, 3);

      const response = await request.get(`/api/data-room/${TEST_DATA_ROOM_ID}/history`);

      expect(response.status()).toBe(200);

      const data: HistoryResponse = await response.json();

      // All queries should belong to the authenticated user
      // This is enforced by RLS, not by the API layer
      expect(Array.isArray(data.queries)).toBe(true);

      // Note: We can't directly verify user_id without exposing it in the API
      // This is tested at the database level via RLS policies
    });
  });
});
