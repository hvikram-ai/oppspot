/**
 * Contract Test: GET /api/profiles/{id}/analysis-status
 * Feature: 013-stream-setup-workflow
 * Reference: contracts/profiles-api.yaml (lines 348-406)
 *
 * Test ID: T012
 * Endpoint: GET /api/profiles/{id}/analysis-status
 * Description: Poll AI analysis progress and retrieve completion status
 *
 * Functional Requirements Tested:
 * - FR-007: AI website analysis extracts 11 fields
 * - FR-008: Analysis progress displayed to user
 * - FR-009: Graceful error handling for failed analysis
 * - FR-010: User can review and edit AI-generated profile
 */

import { test, expect } from '@playwright/test';

const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Test data
let testProfilePending: string;
let testProfileAnalyzing: string;
let testProfileCompleted: string;
let testProfileFailed: string;

test.describe('GET /api/profiles/{id}/analysis-status - Contract Tests', () => {

  // Setup: Create test profiles with different analysis states
  test.beforeAll(async ({ request }) => {
    // Profile 1: Pending state (not analyzed yet)
    const pendingResponse = await request.post(`${BASE_URL}/api/profiles`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      },
      data: {
        name: 'Test Pending Profile',
        company_name: 'Pending Corp',
        website_url: 'https://example.com',
        analyze_now: false,
      },
    });

    if (pendingResponse.ok()) {
      const data = await pendingResponse.json();
      testProfilePending = data.profile.id;
    }

    // Profile 2: Analyzing state (analysis in progress)
    const analyzingResponse = await request.post(`${BASE_URL}/api/profiles`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      },
      data: {
        name: 'Test Analyzing Profile',
        company_name: 'Analyzing Corp',
        website_url: 'https://example.com',
        analyze_now: true, // Trigger analysis
      },
    });

    if (analyzingResponse.ok()) {
      const data = await analyzingResponse.json();
      testProfileAnalyzing = data.profile.id;
    }

    // Profile 3: Completed state (wait for analysis to finish)
    // Note: In real tests, this might need to wait or use pre-seeded data
    const completedResponse = await request.post(`${BASE_URL}/api/profiles`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      },
      data: {
        name: 'Test Completed Profile',
        company_name: 'Completed Corp',
        website_url: 'https://example.com',
        analyze_now: true,
      },
    });

    if (completedResponse.ok()) {
      const data = await completedResponse.json();
      testProfileCompleted = data.profile.id;

      // Poll until completed (max 60 seconds)
      let attempts = 0;
      while (attempts < 60) {
        const statusResponse = await request.get(
          `${BASE_URL}/api/profiles/${testProfileCompleted}/analysis-status`,
          {
            headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` },
          }
        );

        if (statusResponse.ok()) {
          const statusData = await statusResponse.json();
          if (statusData.status === 'completed' || statusData.status === 'failed') {
            break;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    // Profile 4: Failed state (invalid website)
    const failedResponse = await request.post(`${BASE_URL}/api/profiles`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      },
      data: {
        name: 'Test Failed Profile',
        company_name: 'Failed Corp',
        website_url: 'https://this-website-definitely-does-not-exist-12345.com',
        analyze_now: true,
      },
    });

    if (failedResponse.ok()) {
      const data = await failedResponse.json();
      testProfileFailed = data.profile.id;

      // Wait for failure (max 60 seconds)
      let attempts = 0;
      while (attempts < 60) {
        const statusResponse = await request.get(
          `${BASE_URL}/api/profiles/${testProfileFailed}/analysis-status`,
          {
            headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` },
          }
        );

        if (statusResponse.ok()) {
          const statusData = await statusResponse.json();
          if (statusData.status === 'failed') {
            break;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }
  });

  test.describe('Valid Request Scenarios - Pending Status', () => {

    test('T012-001: returns 200 with pending status for unanalyzed profile', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfilePending}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();

      // Validate response structure (OpenAPI spec lines 364-400)
      expect(data).toHaveProperty('status');
      expect(data.status).toBe('pending');

      // Progress should not be present for pending profiles
      expect(data).not.toHaveProperty('progress');

      // Profile should not be present for pending profiles
      expect(data).not.toHaveProperty('profile');
    });
  });

  test.describe('Valid Request Scenarios - Analyzing Status', () => {

    test('T012-002: returns 200 with analyzing status and progress', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileAnalyzing}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Validate status
      expect(data).toHaveProperty('status');
      expect(['analyzing', 'completed', 'failed']).toContain(data.status);

      if (data.status === 'analyzing') {
        // Validate progress object (OpenAPI spec lines 373-385)
        expect(data).toHaveProperty('progress');
        expect(data.progress).toHaveProperty('stage');
        expect(data.progress).toHaveProperty('message');
        expect(data.progress).toHaveProperty('percent');

        // Validate progress.stage enum
        expect(['fetching_website', 'analyzing_content', 'extracting_data', 'complete', 'error'])
          .toContain(data.progress.stage);

        // Validate progress.message is string
        expect(typeof data.progress.message).toBe('string');
        expect(data.progress.message.length).toBeGreaterThan(0);

        // Validate progress.percent is 0-100
        expect(data.progress.percent).toBeGreaterThanOrEqual(0);
        expect(data.progress.percent).toBeLessThanOrEqual(100);

        // Profile should not be present until completed
        expect(data).not.toHaveProperty('profile');
      }
    });

    test('T012-003: returns valid stage values during analysis (FR-008)', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileAnalyzing}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      expect(response.status()).toBe(200);

      const data = await response.json();

      if (data.status === 'analyzing' && data.progress) {
        // As per OpenAPI spec line 378, stage must be one of these
        const validStages = ['fetching_website', 'analyzing_content', 'extracting_data', 'complete', 'error'];
        expect(validStages).toContain(data.progress.stage);

        // Message should match the stage
        const stageMessageMapping: Record<string, string> = {
          'fetching_website': 'Fetching website',
          'analyzing_content': 'Analyzing',
          'extracting_data': 'Extracting',
          'complete': 'Complete',
          'error': 'Error',
        };

        const expectedMessagePrefix = stageMessageMapping[data.progress.stage];
        expect(data.progress.message.toLowerCase()).toContain(expectedMessagePrefix.toLowerCase());
      }
    });

    test('T012-004: returns increasing percent values as analysis progresses', async ({ request }) => {
      // Skip this test if profile is already completed
      const initialResponse = await request.get(
        `${BASE_URL}/api/profiles/${testProfileAnalyzing}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      const initialData = await initialResponse.json();

      if (initialData.status !== 'analyzing') {
        test.skip(true, 'Profile no longer analyzing');
      }

      const initialPercent = initialData.progress?.percent || 0;

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      const laterResponse = await request.get(
        `${BASE_URL}/api/profiles/${testProfileAnalyzing}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      const laterData = await laterResponse.json();

      if (laterData.status === 'analyzing') {
        const laterPercent = laterData.progress?.percent || 0;

        // Percent should be >= initial (may stay same if very fast)
        expect(laterPercent).toBeGreaterThanOrEqual(initialPercent);
      }
    });
  });

  test.describe('Valid Request Scenarios - Completed Status', () => {

    test('T012-005: returns 200 with completed status and full profile (FR-007)', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileCompleted}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Validate status
      expect(data.status).toBe('completed');

      // Validate profile is returned (OpenAPI spec line 398-400)
      expect(data).toHaveProperty('profile');
      expect(data.profile).toHaveProperty('id');
      expect(data.profile.id).toBe(testProfileCompleted);

      // Validate 11 extracted fields (FR-007)
      expect(data.profile).toHaveProperty('industry');
      expect(data.profile).toHaveProperty('description');
      expect(data.profile).toHaveProperty('company_size');
      expect(data.profile).toHaveProperty('location');
      expect(data.profile).toHaveProperty('revenue_range');
      expect(data.profile).toHaveProperty('tech_stack');
      expect(data.profile).toHaveProperty('products_services');
      expect(data.profile).toHaveProperty('target_markets');
      expect(data.profile).toHaveProperty('key_differentiators');
      expect(data.profile).toHaveProperty('employee_count');
      expect(data.profile).toHaveProperty('website_url'); // 11th field

      // Validate arrays are arrays
      expect(Array.isArray(data.profile.tech_stack)).toBe(true);
      expect(Array.isArray(data.profile.products_services)).toBe(true);
      expect(Array.isArray(data.profile.target_markets)).toBe(true);
      expect(Array.isArray(data.profile.key_differentiators)).toBe(true);
    });

    test('T012-006: returns analysis_metadata when completed', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileCompleted}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Validate analysis_metadata (OpenAPI spec lines 386-396)
      expect(data).toHaveProperty('analysis_metadata');
      expect(data.analysis_metadata).toHaveProperty('model');
      expect(data.analysis_metadata).toHaveProperty('tokens_used');
      expect(data.analysis_metadata).toHaveProperty('analysis_time_ms');

      // Validate types
      expect(typeof data.analysis_metadata.model).toBe('string');
      expect(data.analysis_metadata.model).toContain('claude'); // Should use Claude model
      expect(typeof data.analysis_metadata.tokens_used).toBe('number');
      expect(data.analysis_metadata.tokens_used).toBeGreaterThan(0);
      expect(typeof data.analysis_metadata.analysis_time_ms).toBe('number');

      // Analysis should complete within 30 seconds (FR-007)
      expect(data.analysis_metadata.analysis_time_ms).toBeLessThan(30000);
    });

    test('T012-007: completed profile has timestamps', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileCompleted}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.profile).toHaveProperty('analysis_started_at');
      expect(data.profile).toHaveProperty('analysis_completed_at');

      // Validate ISO date format
      const startedAt = new Date(data.profile.analysis_started_at);
      const completedAt = new Date(data.profile.analysis_completed_at);

      expect(startedAt).toBeInstanceOf(Date);
      expect(completedAt).toBeInstanceOf(Date);

      // Completed should be after started
      expect(completedAt.getTime()).toBeGreaterThan(startedAt.getTime());
    });

    test('T012-008: completed profile enables user review (FR-010)', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileCompleted}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Profile should have all fields for user to review and edit
      expect(data.profile).toBeTruthy();
      expect(data.profile.analysis_status).toBe('completed');

      // Manual edits tracking field should exist
      expect(data.profile).toHaveProperty('manual_edits');
    });
  });

  test.describe('Valid Request Scenarios - Failed Status', () => {

    test('T012-009: returns 200 with failed status and error message (FR-009)', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileFailed}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Validate status
      expect(data.status).toBe('failed');

      // Validate analysis_metadata contains error_message
      expect(data).toHaveProperty('analysis_metadata');
      expect(data.analysis_metadata).toHaveProperty('error_message');
      expect(typeof data.analysis_metadata.error_message).toBe('string');
      expect(data.analysis_metadata.error_message.length).toBeGreaterThan(0);

      // Error message should be clear and actionable
      expect(data.analysis_metadata.error_message.toLowerCase()).toMatch(
        /(unable|failed|error|cannot|invalid)/
      );
    });

    test('T012-010: failed profile still has partial data', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileFailed}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Profile should be returned even on failure (for manual entry)
      expect(data).toHaveProperty('profile');
      expect(data.profile).toHaveProperty('id');
      expect(data.profile).toHaveProperty('company_name');
      expect(data.profile).toHaveProperty('website_url');

      // Analysis status should be 'failed'
      expect(data.profile.analysis_status).toBe('failed');
    });
  });

  test.describe('Authentication & Authorization (401)', () => {

    test('T012-011: returns 401 when Authorization header is missing', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileCompleted}/analysis-status`,
        {
          headers: {},
        }
      );

      expect(response.status()).toBe(401);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Unauthorized');
    });

    test('T012-012: returns 401 when Bearer token is invalid', async ({ request }) => {
      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileCompleted}/analysis-status`,
        {
          headers: {
            'Authorization': 'Bearer invalid-token-12345',
          },
        }
      );

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T012-013: returns 401 when Bearer token is expired', async ({ request }) => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileCompleted}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${expiredToken}`,
          },
        }
      );

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Not Found Errors (404)', () => {

    test('T012-014: returns 404 when profile does not exist', async ({ request }) => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request.get(
        `${BASE_URL}/api/profiles/${nonExistentId}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      expect(response.status()).toBe(404);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.toLowerCase()).toContain('not found');
    });

    test('T012-015: returns 404 when profile ID is invalid UUID format', async ({ request }) => {
      const invalidId = 'not-a-valid-uuid';

      const response = await request.get(
        `${BASE_URL}/api/profiles/${invalidId}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      // Could be 400 or 404 depending on validation order
      expect([400, 404]).toContain(response.status());
    });

    test('T012-016: returns 404 when profile belongs to different organization', async ({ request }) => {
      // This tests RLS policies
      const otherOrgProfileId = '11111111-1111-1111-1111-111111111111';

      const response = await request.get(
        `${BASE_URL}/api/profiles/${otherOrgProfileId}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      expect(response.status()).toBe(404);
    });
  });

  test.describe('Server Errors (500)', () => {

    test('T012-017: handles server error gracefully', async ({ request }) => {
      // This test would require mocking or a special test endpoint
      test.skip(true, 'Requires server error injection mechanism');
    });

    test('T012-018: includes error response schema on 500', async ({ request }) => {
      // This test would require mocking or a special test endpoint
      test.skip(true, 'Requires server error injection mechanism');
    });
  });

  test.describe('Polling Behavior & Performance', () => {

    test('T012-019: supports rapid polling without rate limiting', async ({ request }) => {
      // Make 10 rapid requests (simulating UI polling every second)
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request.get(
            `${BASE_URL}/api/profiles/${testProfileCompleted}/analysis-status`,
            {
              headers: {
                'Authorization': `Bearer ${TEST_USER_TOKEN}`,
              },
            }
          )
        );
      }

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
    });

    test('T012-020: responds within acceptable latency (<500ms)', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get(
        `${BASE_URL}/api/profiles/${testProfileCompleted}/analysis-status`,
        {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        }
      );

      const endTime = Date.now();
      const latency = endTime - startTime;

      expect(response.status()).toBe(200);

      // Should respond quickly for good UX during polling
      expect(latency).toBeLessThan(500);
    });
  });

  test.describe('Edge Cases', () => {

    test('T012-021: handles concurrent status checks for same profile', async ({ request }) => {
      // Make 5 concurrent requests for same profile
      const requests = Array(5).fill(null).map(() =>
        request.get(
          `${BASE_URL}/api/profiles/${testProfileCompleted}/analysis-status`,
          {
            headers: {
              'Authorization': `Bearer ${TEST_USER_TOKEN}`,
            },
          }
        )
      );

      const responses = await Promise.all(requests);

      // All should return consistent data
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });

      const dataArray = await Promise.all(responses.map(r => r.json()));

      // All responses should have same status
      const statuses = dataArray.map(d => d.status);
      expect(new Set(statuses).size).toBe(1); // All same status
    });

    test('T012-022: returns consistent data structure across all statuses', async ({ request }) => {
      // Test all 4 status types have 'status' field
      const profiles = [
        { id: testProfilePending, expectedStatus: 'pending' },
        { id: testProfileAnalyzing, expectedStatus: 'analyzing' },
        { id: testProfileCompleted, expectedStatus: 'completed' },
        { id: testProfileFailed, expectedStatus: 'failed' },
      ];

      for (const { id, expectedStatus } of profiles) {
        const response = await request.get(
          `${BASE_URL}/api/profiles/${id}/analysis-status`,
          {
            headers: {
              'Authorization': `Bearer ${TEST_USER_TOKEN}`,
            },
          }
        );

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('status');

        // Note: analyzing status might have changed to completed by now
        if (expectedStatus === 'analyzing') {
          expect(['analyzing', 'completed', 'failed']).toContain(data.status);
        } else {
          expect(data.status).toBe(expectedStatus);
        }
      }
    });
  });

  // Cleanup: Delete test profiles after all tests
  test.afterAll(async ({ request }) => {
    const profiles = [
      testProfilePending,
      testProfileAnalyzing,
      testProfileCompleted,
      testProfileFailed,
    ];

    for (const profileId of profiles) {
      if (profileId) {
        await request.delete(`${BASE_URL}/api/profiles/${profileId}`, {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        });
      }
    }
  });
});
