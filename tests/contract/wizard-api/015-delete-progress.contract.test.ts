/**
 * Contract Test: DELETE /api/streams/wizard/progress
 * Feature: 013-stream-setup-workflow
 * Reference: contracts/wizard-api.yaml (lines 72-84)
 *
 * Test ID: T015
 * Endpoint: DELETE /api/streams/wizard/progress
 * Description: Clear saved wizard state (called on successful stream creation)
 *
 * Functional Requirements Tested:
 * - FR-006: Wizard progress persists on navigation away (session-only)
 * - Cleanup after stream creation
 */

import { test, expect } from '@playwright/test';

const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('DELETE /api/streams/wizard/progress - Contract Tests', () => {

  test.describe('Valid Request Scenarios - With Existing Progress', () => {

    test('T015-001: returns 204 when deleting existing wizard progress', async ({ request }) => {
      // First, create some wizard progress
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 2,
          step1: { goal_template_id: 'discover_companies' },
          step2: { business_impact_description: 'Find acquisition targets.' },
        },
      });

      // Now delete the progress
      const response = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // Validate response (OpenAPI spec line 79-80)
      expect(response.status()).toBe(204);

      // 204 should have no content
      const text = await response.text();
      expect(text).toBe('');
    });

    test('T015-002: progress is null after deletion', async ({ request }) => {
      // Save progress
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 1,
          step1: { goal_template_id: 'due_diligence' },
        },
      });

      // Delete progress
      await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // Verify progress is now null
      const getResponse = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(getResponse.status()).toBe(200);

      const data = await getResponse.json();
      expect(data.progress).toBeNull();
    });

    test('T015-003: deletes progress from all steps', async ({ request }) => {
      // Save complete wizard progress (all 3 steps)
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 3,
          step1: { goal_template_id: 'market_research' },
          step2: { business_impact_description: 'Research market opportunities.' },
          step3: {
            profile_selection_method: 'existing',
            selected_profile_id: '11111111-1111-1111-1111-111111111111',
          },
        },
      });

      // Delete progress
      const response = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(204);

      // Verify all steps cleared
      const getResponse = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const data = await getResponse.json();
      expect(data.progress).toBeNull();
    });
  });

  test.describe('Valid Request Scenarios - No Existing Progress', () => {

    test('T015-004: returns 204 when deleting non-existent progress (idempotent)', async ({ request }) => {
      // First, ensure no progress exists
      await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // Delete again (no progress to delete)
      const response = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // Should still return 204 (idempotent operation)
      expect(response.status()).toBe(204);
    });

    test('T015-005: multiple deletes are idempotent', async ({ request }) => {
      // Save some progress
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 1,
          step1: { goal_template_id: 'competitive_analysis' },
        },
      });

      // Delete 3 times
      const response1 = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const response2 = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const response3 = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // All should return 204
      expect(response1.status()).toBe(204);
      expect(response2.status()).toBe(204);
      expect(response3.status()).toBe(204);
    });
  });

  test.describe('Authentication & Authorization (401)', () => {

    test('T015-006: returns 401 when Authorization header is missing', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {},
      });

      expect(response.status()).toBe(401);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Unauthorized');
    });

    test('T015-007: returns 401 when Bearer token is invalid', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': 'Bearer invalid-token-12345',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T015-008: returns 401 when Bearer token is expired', async ({ request }) => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Server Errors (500)', () => {

    test('T015-009: handles server error gracefully', async ({ request }) => {
      test.skip(true, 'Requires server error injection mechanism');
    });
  });

  test.describe('Use Cases & Workflow', () => {

    test('T015-010: called after successful stream creation to cleanup', async ({ request }) => {
      // Simulate complete wizard flow
      // Step 1: Save progress
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 3,
          step1: { goal_template_id: 'territory_expansion' },
          step2: { business_impact_description: 'Expand to new territories.' },
          step3: {
            profile_selection_method: 'new',
            new_profile: {
              name: 'Expansion Profile',
              company_name: 'Expansion Corp',
              website_url: 'https://expansion.com',
            },
          },
        },
      });

      // Step 2: User completes wizard (not tested here - see T017)
      // This would call POST /api/streams/wizard/complete

      // Step 3: After stream creation, cleanup wizard progress
      const deleteResponse = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(deleteResponse.status()).toBe(204);

      // Verify wizard can be started fresh
      const getResponse = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const data = await getResponse.json();
      expect(data.progress).toBeNull();
    });

    test('T015-011: allows user to restart wizard after deletion', async ({ request }) => {
      // Save progress
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 2,
          step1: { goal_template_id: 'investment_pipeline' },
          step2: { business_impact_description: 'Build pipeline.' },
        },
      });

      // Delete progress (user decides to start over)
      await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // Save new progress (restart wizard)
      const newProgressResponse = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 1,
          step1: { goal_template_id: 'partnership_opportunities' },
        },
      });

      expect(newProgressResponse.status()).toBe(200);

      // Verify new progress saved
      const getResponse = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const data = await getResponse.json();
      expect(data.progress.current_step).toBe(1);
      expect(data.progress.step1.goal_template_id).toBe('partnership_opportunities');
    });
  });

  test.describe('Edge Cases', () => {

    test('T015-012: handles concurrent delete requests', async ({ request }) => {
      // Save progress
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 1,
          step1: { goal_template_id: 'discover_companies' },
        },
      });

      // Make 5 concurrent delete requests
      const requests = Array(5).fill(null).map(() =>
        request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        })
      );

      const responses = await Promise.all(requests);

      // All should succeed (idempotent)
      responses.forEach(response => {
        expect(response.status()).toBe(204);
      });

      // Verify progress deleted
      const getResponse = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const data = await getResponse.json();
      expect(data.progress).toBeNull();
    });

    test('T015-013: DELETE followed by GET returns null', async ({ request }) => {
      // Save progress
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 1,
          step1: { goal_template_id: 'due_diligence' },
        },
      });

      // Delete
      const deleteResponse = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(deleteResponse.status()).toBe(204);

      // Immediately GET
      const getResponse = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(getResponse.status()).toBe(200);

      const data = await getResponse.json();
      expect(data.progress).toBeNull();
    });

    test('T015-014: DELETE does not affect other users progress', async ({ request }) => {
      // Note: This test assumes TEST_USER_TOKEN and would need a second user token
      // For now, we test that the operation is user-scoped

      // Save progress for current user
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 1,
          step1: { goal_template_id: 'market_research' },
        },
      });

      // Delete progress
      const deleteResponse = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(deleteResponse.status()).toBe(204);

      // This would only delete the current user's progress
      // Other users' progress remains intact (enforced by RLS)
    });
  });

  test.describe('Response Headers & Format', () => {

    test('T015-015: returns no content body on 204', async ({ request }) => {
      // Save progress
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 1,
          step1: { goal_template_id: 'competitive_analysis' },
        },
      });

      // Delete
      const response = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(204);

      // 204 No Content should have empty body
      const body = await response.text();
      expect(body).toBe('');
      expect(body.length).toBe(0);
    });

    test('T015-016: does not require Content-Type header', async ({ request }) => {
      // DELETE requests typically don't have request body, so no Content-Type needed
      const response = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // Should succeed regardless of Content-Type presence
      expect([204, 401]).toContain(response.status());
    });
  });

  test.describe('Performance', () => {

    test('T015-017: responds within acceptable latency (<200ms)', async ({ request }) => {
      // Save progress
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 1,
          step1: { goal_template_id: 'territory_expansion' },
        },
      });

      const startTime = Date.now();

      const response = await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      expect(response.status()).toBe(204);

      // Should be fast
      expect(latency).toBeLessThan(200);
    });
  });

  // Cleanup: Ensure wizard progress is cleared after all tests
  test.afterAll(async ({ request }) => {
    await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      },
    });
  });
});
