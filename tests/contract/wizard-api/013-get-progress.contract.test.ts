/**
 * Contract Test: GET /api/streams/wizard/progress
 * Feature: 013-stream-setup-workflow
 * Reference: contracts/wizard-api.yaml (lines 14-38)
 *
 * Test ID: T013
 * Endpoint: GET /api/streams/wizard/progress
 * Description: Retrieve saved wizard state for session persistence
 *
 * Functional Requirements Tested:
 * - FR-006: Wizard progress persists on navigation away (session-only)
 */

import { test, expect } from '@playwright/test';

const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('GET /api/streams/wizard/progress - Contract Tests', () => {

  // Setup: Clear any existing wizard progress before tests
  test.beforeAll(async ({ request }) => {
    await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      },
    });
  });

  test.describe('Valid Request Scenarios - No Progress', () => {

    test('T013-001: returns 200 with null progress when no saved state exists', async ({ request }) => {
      // Ensure clean state
      await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const response = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();

      // Validate response structure (OpenAPI spec lines 23-34)
      expect(data).toHaveProperty('progress');
      expect(data).toHaveProperty('session_id');

      // Progress should be null if no saved state
      expect(data.progress).toBeNull();

      // Session ID should still be provided for tracking
      expect(typeof data.session_id).toBe('string');
    });
  });

  test.describe('Valid Request Scenarios - With Progress', () => {

    test('T013-002: returns 200 with saved progress after saving wizard state', async ({ request }) => {
      // First, save some wizard progress
      const progressData = {
        current_step: 1,
        step1: {
          goal_template_id: 'discover_companies',
        },
        step2: null,
        step3: null,
      };

      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      // Now retrieve the progress
      const response = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Validate response structure
      expect(data).toHaveProperty('progress');
      expect(data).toHaveProperty('session_id');

      // Progress should be an object
      expect(data.progress).not.toBeNull();
      expect(typeof data.progress).toBe('object');

      // Validate WizardProgress schema (lines 287-306)
      expect(data.progress).toHaveProperty('current_step');
      expect(data.progress).toHaveProperty('step1');
      expect(data.progress).toHaveProperty('step2');
      expect(data.progress).toHaveProperty('step3');
      expect(data.progress).toHaveProperty('session_id');
      expect(data.progress).toHaveProperty('saved_at');

      // Validate saved data matches
      expect(data.progress.current_step).toBe(1);
      expect(data.progress.step1.goal_template_id).toBe('discover_companies');
      expect(data.progress.step2).toBeNull();
      expect(data.progress.step3).toBeNull();

      // Validate saved_at is valid ISO timestamp
      const savedAt = new Date(data.progress.saved_at);
      expect(savedAt).toBeInstanceOf(Date);
      expect(savedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('T013-003: returns progress with all steps completed', async ({ request }) => {
      // Save complete wizard progress (all 3 steps)
      const completeProgressData = {
        current_step: 3,
        step1: {
          goal_template_id: 'due_diligence',
        },
        step2: {
          business_impact_description: 'Looking to acquire 3-5 SaaS companies with $5-10M ARR in healthcare vertical.',
        },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: '11111111-1111-1111-1111-111111111111',
        },
      };

      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: completeProgressData,
      });

      // Retrieve progress
      const response = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Validate all steps are present
      expect(data.progress.current_step).toBe(3);
      expect(data.progress.step1).not.toBeNull();
      expect(data.progress.step2).not.toBeNull();
      expect(data.progress.step3).not.toBeNull();

      // Validate step1 data
      expect(data.progress.step1.goal_template_id).toBe('due_diligence');

      // Validate step2 data
      expect(data.progress.step2.business_impact_description).toBeTruthy();
      expect(data.progress.step2.business_impact_description.length).toBeGreaterThan(10);

      // Validate step3 data
      expect(data.progress.step3.profile_selection_method).toBe('existing');
      expect(data.progress.step3.selected_profile_id).toBeTruthy();
    });

    test('T013-004: returns progress with partial completion (step 2 only)', async ({ request }) => {
      // Save progress at step 2
      const partialProgressData = {
        current_step: 2,
        step1: {
          goal_template_id: 'competitive_analysis',
        },
        step2: {
          business_impact_description: 'Track competitive landscape in European market.',
        },
        step3: null,
      };

      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: partialProgressData,
      });

      const response = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.progress.current_step).toBe(2);
      expect(data.progress.step1).not.toBeNull();
      expect(data.progress.step2).not.toBeNull();
      expect(data.progress.step3).toBeNull();
    });
  });

  test.describe('Authentication & Authorization (401)', () => {

    test('T013-005: returns 401 when Authorization header is missing', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {},
      });

      expect(response.status()).toBe(401);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Unauthorized');
    });

    test('T013-006: returns 401 when Bearer token is invalid', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': 'Bearer invalid-token-12345',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T013-007: returns 401 when Bearer token is expired', async ({ request }) => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Server Errors (500)', () => {

    test('T013-008: handles server error gracefully', async ({ request }) => {
      // This test would require mocking or a special test endpoint
      test.skip(true, 'Requires server error injection mechanism');
    });
  });

  test.describe('Edge Cases & Session Management', () => {

    test('T013-009: returns consistent session_id across multiple requests', async ({ request }) => {
      // Save progress
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

      // Make 3 GET requests
      const response1 = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` },
      });

      const response2 = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` },
      });

      const response3 = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` },
      });

      const data1 = await response1.json();
      const data2 = await response2.json();
      const data3 = await response3.json();

      // Session IDs should be consistent
      expect(data1.session_id).toBe(data2.session_id);
      expect(data2.session_id).toBe(data3.session_id);
    });

    test('T013-010: handles concurrent GET requests without conflicts', async ({ request }) => {
      // Make 5 concurrent requests
      const requests = Array(5).fill(null).map(() =>
        request.get(`${BASE_URL}/api/streams/wizard/progress`, {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });

      const dataArray = await Promise.all(responses.map(r => r.json()));

      // All should return same progress data
      const progressStrings = dataArray.map(d => JSON.stringify(d.progress));
      expect(new Set(progressStrings).size).toBe(1); // All identical
    });

    test('T013-011: returns null progress after DELETE', async ({ request }) => {
      // Save progress
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 2,
          step1: { goal_template_id: 'territory_expansion' },
          step2: { business_impact_description: 'Expand into new territories.' },
        },
      });

      // Delete progress
      await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // Verify progress is now null
      const response = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.progress).toBeNull();
    });

    test('T013-012: returns updated progress after save', async ({ request }) => {
      // Save initial progress
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 1,
          step1: { goal_template_id: 'investment_pipeline' },
        },
      });

      // Get progress
      const response1 = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` },
      });

      const data1 = await response1.json();
      expect(data1.progress.current_step).toBe(1);

      // Update progress to step 2
      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 2,
          step1: { goal_template_id: 'investment_pipeline' },
          step2: { business_impact_description: 'Build acquisition pipeline.' },
        },
      });

      // Get updated progress
      const response2 = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: { 'Authorization': `Bearer ${TEST_USER_TOKEN}` },
      });

      const data2 = await response2.json();
      expect(data2.progress.current_step).toBe(2);
      expect(data2.progress.step2).not.toBeNull();
    });
  });

  test.describe('FR-006: Session Persistence', () => {

    test('T013-013: wizard progress persists across requests (simulating navigation)', async ({ request }) => {
      // Simulate user completing step 1 and navigating away
      const step1Progress = {
        current_step: 1,
        step1: { goal_template_id: 'partnership_opportunities' },
      };

      await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: step1Progress,
      });

      // Simulate user returning later (new request)
      const response = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Progress should be recovered
      expect(data.progress).not.toBeNull();
      expect(data.progress.current_step).toBe(1);
      expect(data.progress.step1.goal_template_id).toBe('partnership_opportunities');

      // User can continue wizard from where they left off
    });

    test('T013-014: saved_at timestamp indicates when progress was last saved', async ({ request }) => {
      const beforeSave = Date.now();

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

      const afterSave = Date.now();

      const response = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const data = await response.json();

      const savedAt = new Date(data.progress.saved_at).getTime();

      // saved_at should be between beforeSave and afterSave
      expect(savedAt).toBeGreaterThanOrEqual(beforeSave);
      expect(savedAt).toBeLessThanOrEqual(afterSave + 1000); // Allow 1s margin
    });
  });

  test.describe('Response Performance', () => {

    test('T013-015: responds within acceptable latency (<300ms)', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      expect(response.status()).toBe(200);

      // Should be fast for good UX
      expect(latency).toBeLessThan(300);
    });
  });

  // Cleanup: Clear wizard progress after all tests
  test.afterAll(async ({ request }) => {
    await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      },
    });
  });
});
