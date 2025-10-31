/**
 * Contract Test: POST /api/data-room/[dataRoomId]/feedback
 * Feature: 008-oppspot-docs-dataroom
 * Task: T006
 * Reference: contracts/feedback-api.yaml
 *
 * IMPORTANT: This test MUST FAIL until T024 is implemented
 */

import { test, expect } from '@playwright/test';
import type { ErrorResponse } from '@/types/data-room-qa';

interface FeedbackRequest {
  query_id: string;
  rating: 'helpful' | 'not_helpful';
  comment?: string;
}

interface FeedbackResponse {
  success: boolean;
  feedback_id: string;
}

test.describe('POST /api/data-room/[dataRoomId]/feedback - Contract Tests', () => {
  const TEST_DATA_ROOM_ID = 'test-room-' + Date.now();
  let testQueryId: string;

  // Helper to create a test query that we can provide feedback on
  test.beforeEach(async ({ request }) => {
    const queryResponse = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/query`, {
      data: {
        question: 'Test question for feedback testing',
        stream: false,
      },
    });

    if (queryResponse.ok()) {
      const data = await queryResponse.json();
      testQueryId = data.query_id;
    } else {
      // If query creation fails, use a dummy UUID for testing
      testQueryId = '00000000-0000-0000-0000-000000000000';
    }
  });

  test.describe('Valid Feedback Scenarios', () => {
    test('returns 200 for valid helpful rating without comment', async ({ request }) => {
      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data: FeedbackResponse = await response.json();

      // Validate response structure (from OpenAPI spec)
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('feedback_id');

      expect(data.success).toBe(true);
      expect(typeof data.feedback_id).toBe('string');

      // Validate feedback_id is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(data.feedback_id).toMatch(uuidRegex);
    });

    test('returns 200 for valid not_helpful rating without comment', async ({ request }) => {
      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'not_helpful',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(200);

      const data: FeedbackResponse = await response.json();

      expect(data.success).toBe(true);
      expect(data).toHaveProperty('feedback_id');
    });

    test('returns 200 for helpful rating with comment (FR-024)', async ({ request }) => {
      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
        comment: 'This answer was very clear and accurate. The citations were particularly useful.',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(200);

      const data: FeedbackResponse = await response.json();

      expect(data.success).toBe(true);
      expect(data).toHaveProperty('feedback_id');
    });

    test('returns 200 for not_helpful rating with detailed comment', async ({ request }) => {
      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'not_helpful',
        comment: 'The answer did not address the specific question about revenue. It focused on costs instead.',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(200);

      const data: FeedbackResponse = await response.json();

      expect(data.success).toBe(true);
    });

    test('accepts comment at maximum length (2000 chars)', async ({ request }) => {
      const maxLengthComment = 'a'.repeat(2000);

      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
        comment: maxLengthComment,
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(200);

      const data: FeedbackResponse = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Validation Errors (400)', () => {
    test('returns 400 for invalid rating value', async ({ request }) => {
      const invalidRequest = {
        query_id: testQueryId,
        rating: 'somewhat_helpful', // Invalid - not in enum
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: invalidRequest,
      });

      expect(response.status()).toBe(400);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBeTruthy();
      expect(error.message.toLowerCase()).toContain('rating');
    });

    test('returns 400 for missing rating field', async ({ request }) => {
      const invalidRequest = {
        query_id: testQueryId,
        // rating is required but missing
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: invalidRequest,
      });

      expect(response.status()).toBe(400);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBeTruthy();
      expect(error.message.toLowerCase()).toContain('rating');
    });

    test('returns 400 for missing query_id field', async ({ request }) => {
      const invalidRequest = {
        // query_id is required but missing
        rating: 'helpful',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: invalidRequest,
      });

      expect(response.status()).toBe(400);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBeTruthy();
      expect(error.message.toLowerCase()).toContain('query');
    });

    test('returns 400 for comment exceeding 2000 characters', async ({ request }) => {
      const tooLongComment = 'a'.repeat(2001); // 2001 characters

      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
        comment: tooLongComment,
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(400);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBeTruthy();
      expect(error.message).toContain('2000');
      expect(error.message.toLowerCase()).toContain('comment');
    });

    test('returns 400 for invalid query_id format', async ({ request }) => {
      const invalidRequest: FeedbackRequest = {
        query_id: 'not-a-uuid',
        rating: 'helpful',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: invalidRequest,
      });

      expect(response.status()).toBe(400);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBeTruthy();
    });

    test('returns 400 for malformed JSON', async ({ request }) => {
      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: '{ invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Not Found Errors (404)', () => {
    test('returns 404 for non-existent query_id', async ({ request }) => {
      const nonExistentQueryId = '12345678-1234-1234-1234-123456789012';

      const feedbackRequest: FeedbackRequest = {
        query_id: nonExistentQueryId,
        rating: 'helpful',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(404);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBeTruthy();
      expect(error.message.toLowerCase()).toContain('query');
      expect(error.message.toLowerCase()).toContain('not found');
    });

    test('returns 404 when query belongs to different data room', async ({ request }) => {
      // Create a query in a different data room
      const otherDataRoomId = 'other-room-' + Date.now();
      const otherQueryResponse = await request.post(`/api/data-room/${otherDataRoomId}/query`, {
        data: {
          question: 'Query in different data room',
          stream: false,
        },
      });

      if (otherQueryResponse.ok()) {
        const otherData = await otherQueryResponse.json();
        const otherQueryId = otherData.query_id;

        // Try to submit feedback in the wrong data room
        const feedbackRequest: FeedbackRequest = {
          query_id: otherQueryId,
          rating: 'helpful',
        };

        const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
          data: feedbackRequest,
        });

        expect(response.status()).toBe(404);
      }
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('returns 401 for unauthenticated user', async ({ request }) => {
      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
      };

      // Create request without authentication
      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
        headers: {
          // No Authorization header
        },
      });

      expect(response.status()).toBe(401);
    });

    test('returns 403 or 404 when user tries to give feedback on another user\'s query', async ({ request }) => {
      // This test verifies RLS policies prevent users from giving feedback on queries they don't own
      // The exact behavior depends on implementation:
      // - 403: User is authenticated but doesn't have permission
      // - 404: Query not found (due to RLS filtering)

      // For now, we document the expected behavior
      // Implementation will require multi-user test setup

      // Expected:
      // - User A creates a query
      // - User B tries to give feedback on User A's query
      // - Should receive 403 or 404

      // const responseFromDifferentUser = await requestAsUserB.post(
      //   `/api/data-room/${TEST_DATA_ROOM_ID}/feedback`,
      //   {
      //     data: {
      //       query_id: userAQueryId,
      //       rating: 'helpful',
      //     },
      //   }
      // );
      // expect([403, 404]).toContain(responseFromDifferentUser.status());
    });
  });

  test.describe('Upsert Behavior (Update Existing Feedback)', () => {
    test('allows user to update their feedback rating', async ({ request }) => {
      // First feedback submission
      const firstFeedback: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
        comment: 'Initial feedback',
      };

      const firstResponse = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: firstFeedback,
      });

      expect(firstResponse.status()).toBe(200);

      const firstData: FeedbackResponse = await firstResponse.json();
      const firstFeedbackId = firstData.feedback_id;

      // Update feedback (change rating and comment)
      const updatedFeedback: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'not_helpful',
        comment: 'Updated feedback - actually not helpful',
      };

      const updateResponse = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: updatedFeedback,
      });

      expect(updateResponse.status()).toBe(200);

      const updateData: FeedbackResponse = await updateResponse.json();

      // Should return same feedback_id (upsert behavior)
      expect(updateData.feedback_id).toBe(firstFeedbackId);
      expect(updateData.success).toBe(true);
    });

    test('allows user to change rating from not_helpful to helpful', async ({ request }) => {
      // First feedback: not_helpful
      const firstFeedback: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'not_helpful',
      };

      const firstResponse = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: firstFeedback,
      });

      expect(firstResponse.status()).toBe(200);

      // Update feedback: helpful
      const updatedFeedback: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
        comment: 'Actually, upon re-reading, this was helpful',
      };

      const updateResponse = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: updatedFeedback,
      });

      expect(updateResponse.status()).toBe(200);

      const updateData: FeedbackResponse = await updateResponse.json();
      expect(updateData.success).toBe(true);
    });

    test('allows user to add comment to existing feedback', async ({ request }) => {
      // First feedback without comment
      const firstFeedback: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
      };

      const firstResponse = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: firstFeedback,
      });

      expect(firstResponse.status()).toBe(200);

      // Update with comment
      const updatedFeedback: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
        comment: 'Adding a detailed explanation of why this was helpful',
      };

      const updateResponse = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: updatedFeedback,
      });

      expect(updateResponse.status()).toBe(200);

      const updateData: FeedbackResponse = await updateResponse.json();
      expect(updateData.success).toBe(true);
    });
  });

  test.describe('Edge Cases', () => {
    test('accepts empty string as comment', async ({ request }) => {
      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
        comment: '',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(200);

      const data: FeedbackResponse = await response.json();
      expect(data.success).toBe(true);
    });

    test('handles comment with special characters', async ({ request }) => {
      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'not_helpful',
        comment: 'Test with special chars: <script>alert("xss")</script> & "quotes" \'apostrophes\'',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(200);

      const data: FeedbackResponse = await response.json();
      expect(data.success).toBe(true);
    });

    test('handles comment with unicode characters', async ({ request }) => {
      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
        comment: 'Unicode test: 你好 🎉 café résumé',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(200);

      const data: FeedbackResponse = await response.json();
      expect(data.success).toBe(true);
    });

    test('handles comment with newlines and whitespace', async ({ request }) => {
      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
        comment: 'Line 1\n\nLine 2\n\tTabbed line\n  Spaced line',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(200);

      const data: FeedbackResponse = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Response Schema Validation', () => {
    test('validates response structure matches OpenAPI spec', async ({ request }) => {
      const feedbackRequest: FeedbackRequest = {
        query_id: testQueryId,
        rating: 'helpful',
      };

      const response = await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/feedback`, {
        data: feedbackRequest,
      });

      expect(response.status()).toBe(200);

      const data: FeedbackResponse = await response.json();

      // Required fields from OpenAPI spec
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('feedback_id');

      // Type validation
      expect(typeof data.success).toBe('boolean');
      expect(typeof data.feedback_id).toBe('string');

      // UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(data.feedback_id).toMatch(uuidRegex);
    });
  });
});
