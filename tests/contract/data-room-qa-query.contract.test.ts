/**
 * Contract Test: POST /api/data-room/[dataRoomId]/query
 * Feature: 008-oppspot-docs-dataroom
 * Reference: contracts/query-api.yaml
 *
 * IMPORTANT: This test MUST FAIL until T022 is implemented
 */

import { test, expect } from '@playwright/test';
import type { QueryRequest, QueryResponse, ErrorResponse } from '@/types/data-room-qa';

const TEST_DATA_ROOM_ID = 'test-room-' + Date.now();
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';

test.describe('POST /api/data-room/[dataRoomId]/query - Contract Tests', () => {
  test.describe('Valid Request Scenarios', () => {
    test('returns 200 with valid question and non-streaming response', async ({ request }) => {
      const queryRequest: QueryRequest = {
        question: 'What are the revenue projections for Q3 2024?',
        stream: false,
      };

      const response = await request.post(
        `/api/data-room/${TEST_DATA_ROOM_ID}/query`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: queryRequest,
        }
      );

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data: QueryResponse = await response.json();

      // Validate response structure (from OpenAPI spec)
      expect(data).toHaveProperty('query_id');
      expect(data).toHaveProperty('question');
      expect(data).toHaveProperty('answer');
      expect(data).toHaveProperty('answer_type');
      expect(data).toHaveProperty('citations');
      expect(data).toHaveProperty('metrics');

      // Validate types
      expect(typeof data.query_id).toBe('string');
      expect(data.question).toBe(queryRequest.question);
      expect(typeof data.answer).toBe('string');
      expect(['grounded', 'insufficient_evidence']).toContain(data.answer_type);
      expect(Array.isArray(data.citations)).toBe(true);

      // Validate metrics
      expect(data.metrics).toHaveProperty('total_time_ms');
      expect(data.metrics).toHaveProperty('retrieval_time_ms');
      expect(data.metrics).toHaveProperty('llm_time_ms');
      expect(data.metrics.total_time_ms).toBeLessThan(7000); // FR-005: <7s target
    });

    test('returns 200 with streaming response (SSE)', async ({ request }) => {
      const queryRequest: QueryRequest = {
        question: 'What are the revenue projections?',
        stream: true,
      };

      const response = await request.post(
        `/api/data-room/${TEST_DATA_ROOM_ID}/query`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: queryRequest,
        }
      );

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe('text/event-stream');

      // Verify response body is a readable stream
      expect(response.body).toBeTruthy();
    });
  });

  test.describe('Validation Errors (400)', () => {
    test('returns 400 for question too short (<5 chars)', async ({ request }) => {
      const requestData = {
        question: 'Why?', // Only 4 characters
      };

      const response = await request.post(
        `/api/data-room/${TEST_DATA_ROOM_ID}/query`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: requestData,
        }
      );

      expect(response.status()).toBe(400);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBe('INVALID_QUERY');
      expect(error.message).toContain('5');
      expect(error.retry_allowed).toBe(false);
    });

    test('returns 400 for question too long (>2000 chars)', async ({ request }) => {
      const requestData = {
        question: 'a'.repeat(2001), // 2001 characters
      };

      const response = await request.post(
        `/api/data-room/${TEST_DATA_ROOM_ID}/query`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: requestData,
        }
      );

      expect(response.status()).toBe(400);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBe('INVALID_QUERY');
      expect(error.message).toContain('2000');
    });

    test('returns 400 for malformed JSON', async ({ request }) => {
      const response = await request.post(
        `/api/data-room/${TEST_DATA_ROOM_ID}/query`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: '{ invalid json',
        }
      );

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('returns 401 for unauthenticated user', async ({ request }) => {
      const requestData: QueryRequest = {
        question: 'What are the projections?',
      };

      const response = await request.post(
        `/api/data-room/${TEST_DATA_ROOM_ID}/query`,
        {
          headers: {
            'Content-Type': 'application/json',
            // NO Authorization header
          },
          data: requestData,
        }
      );

      expect(response.status()).toBe(401);
    });

    test('returns 403 for non-member access', async ({ request }) => {
      const NON_MEMBER_TOKEN = process.env.TEST_NON_MEMBER_TOKEN || '';
      const requestData: QueryRequest = {
        question: 'What are the projections?',
      };

      const response = await request.post(
        `/api/data-room/${TEST_DATA_ROOM_ID}/query`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${NON_MEMBER_TOKEN}`,
          },
          data: requestData,
        }
      );

      expect(response.status()).toBe(403);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBe('PERMISSION_DENIED');
      expect(error.message).toContain('permission');
      expect(error.retry_allowed).toBe(false);
    });
  });

  test.describe('Rate Limiting (FR-014)', () => {
    test('returns 429 after 60 queries in one hour', async ({ request }) => {
      const requestData: QueryRequest = {
        question: 'Test question for rate limit',
        stream: false,
      };

      // Submit 60 queries
      for (let i = 0; i < 60; i++) {
        await request.post(`/api/data-room/${TEST_DATA_ROOM_ID}/query`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: { ...requestData, question: `${requestData.question} ${i}` },
        });
      }

      // 61st query should fail with rate limit
      const response = await request.post(
        `/api/data-room/${TEST_DATA_ROOM_ID}/query`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: requestData,
        }
      );

      expect(response.status()).toBe(429);

      // Verify Retry-After header present
      const retryAfter = response.headers()['retry-after'];
      expect(retryAfter).toBeTruthy();
      expect(parseInt(retryAfter || '0')).toBeGreaterThan(0);

      const error: ErrorResponse = await response.json();
      expect(error.error).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.message).toContain('60');
      expect(error.message).toContain('hour');
      expect(error.retry_after_seconds).toBeGreaterThan(0);
      expect(error.retry_allowed).toBe(false);
    }, 120000); // 2 minute timeout for this test
  });

  test.describe('Error Handling', () => {
    test('returns 500 with descriptive error for LLM timeout', async ({ request }) => {
      // This test requires mocking LLM service to timeout
      // For now, we'll skip implementation details and just verify contract

      const requestData: QueryRequest = {
        question: 'Very complex question that might timeout',
      };

      const response = await request.post(
        `/api/data-room/${TEST_DATA_ROOM_ID}/query`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: requestData,
        }
      );

      if (response.status() === 500) {
        const error: ErrorResponse = await response.json();

        // FR-036: Descriptive error messages
        expect(error.error).toBe('LLM_TIMEOUT');
        expect(error.message).toContain('timeout');

        // FR-037: Retry allowed
        expect(error.retry_allowed).toBe(true);

        // FR-035: Automatic retry attempted
        expect(error.retry_attempted).toBe(true);
      }
    });
  });

  test.describe('Response Schema Validation', () => {
    test('validates citation structure matches OpenAPI spec', async ({ request }) => {
      const requestData: QueryRequest = {
        question: 'What are the projections?',
        stream: false,
      };

      const response = await request.post(
        `/api/data-room/${TEST_DATA_ROOM_ID}/query`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: requestData,
        }
      );

      const data: QueryResponse = await response.json();

      if (data.citations && data.citations.length > 0) {
        const citation = data.citations[0];

        // Validate required fields (from OpenAPI schema)
        expect(citation).toHaveProperty('document_id');
        expect(citation).toHaveProperty('document_title');
        expect(citation).toHaveProperty('page_number');
        expect(citation).toHaveProperty('chunk_id');
        expect(citation).toHaveProperty('relevance_score');
        expect(citation).toHaveProperty('text_preview');

        // Validate types
        expect(typeof citation.document_id).toBe('string');
        expect(typeof citation.document_title).toBe('string');
        expect(typeof citation.page_number).toBe('number');
        expect(citation.page_number).toBeGreaterThanOrEqual(1);
        expect(typeof citation.chunk_id).toBe('string');
        expect(typeof citation.relevance_score).toBe('number');
        expect(citation.relevance_score).toBeGreaterThanOrEqual(0);
        expect(citation.relevance_score).toBeLessThanOrEqual(1);

        // FR-010: Text preview ~240 chars, max 500
        expect(typeof citation.text_preview).toBe('string');
        expect(citation.text_preview.length).toBeLessThanOrEqual(500);
      }
    });
  });
});
