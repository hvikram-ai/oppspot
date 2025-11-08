/**
 * Contract Test: POST /api/streams/wizard/progress
 * Feature: 013-stream-setup-workflow
 * Reference: contracts/wizard-api.yaml (lines 40-70)
 *
 * Test ID: T014
 * Endpoint: POST /api/streams/wizard/progress
 * Description: Save wizard state for session recovery
 *
 * Functional Requirements Tested:
 * - FR-006: Wizard progress persists on navigation away (session-only)
 */

import { test, expect } from '@playwright/test';

const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('POST /api/streams/wizard/progress - Contract Tests', () => {

  // Setup: Clear any existing wizard progress before tests
  test.beforeAll(async ({ request }) => {
    await request.delete(`${BASE_URL}/api/streams/wizard/progress`, {
      headers: {
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      },
    });
  });

  test.describe('Valid Request Scenarios - Step 1', () => {

    test('T014-001: returns 200 when saving step 1 progress', async ({ request }) => {
      const progressData = {
        current_step: 1,
        step1: {
          goal_template_id: 'discover_companies',
        },
        step2: null,
        step3: null,
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();

      // Validate response structure (OpenAPI spec lines 54-64)
      expect(data).toHaveProperty('session_id');
      expect(data).toHaveProperty('saved_at');

      // Validate types
      expect(typeof data.session_id).toBe('string');
      expect(data.session_id.length).toBeGreaterThan(0);

      // Validate saved_at is ISO timestamp
      const savedAt = new Date(data.saved_at);
      expect(savedAt).toBeInstanceOf(Date);
      expect(savedAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });

    test('T014-002: saves step 1 with valid goal_template_id', async ({ request }) => {
      const validGoalTemplates = [
        'discover_companies',
        'due_diligence',
        'market_research',
        'competitive_analysis',
        'territory_expansion',
        'investment_pipeline',
        'partnership_opportunities',
      ];

      for (const templateId of validGoalTemplates) {
        const progressData = {
          current_step: 1,
          step1: {
            goal_template_id: templateId,
          },
        };

        const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: progressData,
        });

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.session_id).toBeTruthy();
      }
    });
  });

  test.describe('Valid Request Scenarios - Step 2', () => {

    test('T014-003: returns 200 when saving step 2 progress', async ({ request }) => {
      const progressData = {
        current_step: 2,
        step1: {
          goal_template_id: 'due_diligence',
        },
        step2: {
          business_impact_description: 'Looking to acquire 3-5 SaaS companies with $5-10M ARR in healthcare vertical to expand our product portfolio.',
        },
        step3: null,
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('session_id');
      expect(data).toHaveProperty('saved_at');
    });

    test('T014-004: saves step 2 with minimum length business_impact_description', async ({ request }) => {
      const progressData = {
        current_step: 2,
        step1: {
          goal_template_id: 'market_research',
        },
        step2: {
          business_impact_description: 'Ten chars!', // Exactly 10 characters (minimum)
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(200);
    });

    test('T014-005: saves step 2 with maximum length business_impact_description', async ({ request }) => {
      // Generate 5000 character string (maximum allowed)
      const maxDescription = 'A'.repeat(5000);

      const progressData = {
        current_step: 2,
        step1: {
          goal_template_id: 'competitive_analysis',
        },
        step2: {
          business_impact_description: maxDescription,
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(200);
    });

    test('T014-006: saves step 2 with optional custom_criteria', async ({ request }) => {
      const progressData = {
        current_step: 2,
        step1: {
          goal_template_id: 'territory_expansion',
        },
        step2: {
          business_impact_description: 'Expand into European markets.',
          custom_criteria: {
            target_revenue: '$10M-$50M',
            target_industries: ['healthcare', 'fintech'],
            geographic_focus: ['UK', 'Germany', 'France'],
          },
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('Valid Request Scenarios - Step 3', () => {

    test('T014-007: returns 200 when saving step 3 with existing profile', async ({ request }) => {
      const progressData = {
        current_step: 3,
        step1: {
          goal_template_id: 'investment_pipeline',
        },
        step2: {
          business_impact_description: 'Build acquisition pipeline.',
        },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: '11111111-1111-1111-1111-111111111111',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.session_id).toBeTruthy();
    });

    test('T014-008: returns 200 when saving step 3 with new profile', async ({ request }) => {
      const progressData = {
        current_step: 3,
        step1: {
          goal_template_id: 'partnership_opportunities',
        },
        step2: {
          business_impact_description: 'Find strategic partnership opportunities.',
        },
        step3: {
          profile_selection_method: 'new',
          new_profile: {
            name: 'Test Profile',
            company_name: 'Test Corp',
            website_url: 'https://testcorp.com',
            wait_for_analysis: true,
          },
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(200);
    });

    test('T014-009: saves step 3 with new profile and wait_for_analysis=false', async ({ request }) => {
      const progressData = {
        current_step: 3,
        step1: {
          goal_template_id: 'discover_companies',
        },
        step2: {
          business_impact_description: 'Discover target companies.',
        },
        step3: {
          profile_selection_method: 'new',
          new_profile: {
            name: 'Quick Profile',
            company_name: 'Quick Corp',
            website_url: 'https://quickcorp.com',
            wait_for_analysis: false,
          },
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(200);
    });
  });

  test.describe('Validation Errors (400)', () => {

    test('T014-010: returns 400 when current_step is missing', async ({ request }) => {
      const progressData = {
        step1: {
          goal_template_id: 'discover_companies',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T014-011: returns 400 when current_step is invalid (not 1, 2, or 3)', async ({ request }) => {
      const progressData = {
        current_step: 5, // Invalid - must be 1, 2, or 3
        step1: {
          goal_template_id: 'discover_companies',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T014-012: returns 400 when step1 goal_template_id is missing', async ({ request }) => {
      const progressData = {
        current_step: 1,
        step1: {}, // Missing goal_template_id
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T014-013: returns 400 when step2 business_impact_description is too short', async ({ request }) => {
      const progressData = {
        current_step: 2,
        step1: {
          goal_template_id: 'market_research',
        },
        step2: {
          business_impact_description: 'Too short', // Only 9 characters (< 10 minimum)
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.toLowerCase()).toContain('minimum');
    });

    test('T014-014: returns 400 when step2 business_impact_description exceeds max length', async ({ request }) => {
      const tooLongDescription = 'A'.repeat(5001); // 5001 characters (> 5000 maximum)

      const progressData = {
        current_step: 2,
        step1: {
          goal_template_id: 'competitive_analysis',
        },
        step2: {
          business_impact_description: tooLongDescription,
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.toLowerCase()).toContain('maximum');
    });

    test('T014-015: returns 400 when step3 profile_selection_method is missing', async ({ request }) => {
      const progressData = {
        current_step: 3,
        step1: {
          goal_template_id: 'due_diligence',
        },
        step2: {
          business_impact_description: 'Conduct due diligence.',
        },
        step3: {}, // Missing profile_selection_method
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T014-016: returns 400 when step3 profile_selection_method is invalid', async ({ request }) => {
      const progressData = {
        current_step: 3,
        step1: {
          goal_template_id: 'investment_pipeline',
        },
        step2: {
          business_impact_description: 'Build pipeline.',
        },
        step3: {
          profile_selection_method: 'invalid_method', // Must be 'existing' or 'new'
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T014-017: returns 400 when step3 existing profile has no selected_profile_id', async ({ request }) => {
      const progressData = {
        current_step: 3,
        step1: {
          goal_template_id: 'partnership_opportunities',
        },
        step2: {
          business_impact_description: 'Find partnerships.',
        },
        step3: {
          profile_selection_method: 'existing',
          // Missing selected_profile_id
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T014-018: returns 400 when step3 new profile has missing required fields', async ({ request }) => {
      const progressData = {
        current_step: 3,
        step1: {
          goal_template_id: 'discover_companies',
        },
        step2: {
          business_impact_description: 'Discover companies.',
        },
        step3: {
          profile_selection_method: 'new',
          new_profile: {
            name: 'Incomplete Profile',
            // Missing company_name and website_url
          },
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('Authentication & Authorization (401)', () => {

    test('T014-019: returns 401 when Authorization header is missing', async ({ request }) => {
      const progressData = {
        current_step: 1,
        step1: {
          goal_template_id: 'discover_companies',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: progressData,
      });

      expect(response.status()).toBe(401);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Unauthorized');
    });

    test('T014-020: returns 401 when Bearer token is invalid', async ({ request }) => {
      const progressData = {
        current_step: 1,
        step1: {
          goal_template_id: 'market_research',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-12345',
        },
        data: progressData,
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('Server Errors (500)', () => {

    test('T014-021: handles server error gracefully', async ({ request }) => {
      test.skip(true, 'Requires server error injection mechanism');
    });
  });

  test.describe('Content-Type Validation', () => {

    test('T014-022: returns 400 when Content-Type is not application/json', async ({ request }) => {
      const progressData = {
        current_step: 1,
        step1: {
          goal_template_id: 'discover_companies',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: JSON.stringify(progressData),
      });

      expect([400, 415]).toContain(response.status());
    });

    test('T014-023: returns 400 when request body is malformed JSON', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: '{invalid json',
      });

      expect(response.status()).toBe(400);
    });

    test('T014-024: returns 400 when request body is empty', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {},
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('Update & Overwrite Behavior', () => {

    test('T014-025: updates existing progress when saving again', async ({ request }) => {
      // Save initial progress
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

      // Update to step 2
      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 2,
          step1: { goal_template_id: 'market_research' },
          step2: { business_impact_description: 'Research market opportunities.' },
        },
      });

      expect(response.status()).toBe(200);

      // Verify updated progress
      const getResponse = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const data = await getResponse.json();
      expect(data.progress.current_step).toBe(2);
      expect(data.progress.step2).not.toBeNull();
    });

    test('T014-026: overwrites previous step data when updating', async ({ request }) => {
      // Save with step 1 goal A
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

      // Change step 1 goal to B
      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 1,
          step1: { goal_template_id: 'competitive_analysis' },
        },
      });

      expect(response.status()).toBe(200);

      // Verify goal changed
      const getResponse = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const data = await getResponse.json();
      expect(data.progress.step1.goal_template_id).toBe('competitive_analysis');
    });
  });

  test.describe('FR-006: Session Persistence', () => {

    test('T014-027: saved progress can be retrieved via GET endpoint', async ({ request }) => {
      const progressData = {
        current_step: 2,
        step1: { goal_template_id: 'territory_expansion' },
        step2: { business_impact_description: 'Expand territory coverage.' },
      };

      // Save progress
      const saveResponse = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(saveResponse.status()).toBe(200);

      // Retrieve progress
      const getResponse = await request.get(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const data = await getResponse.json();

      // Verify saved data matches
      expect(data.progress.current_step).toBe(2);
      expect(data.progress.step1.goal_template_id).toBe('territory_expansion');
      expect(data.progress.step2.business_impact_description).toBe('Expand territory coverage.');
    });

    test('T014-028: session_id remains consistent across saves', async ({ request }) => {
      // First save
      const response1 = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 1,
          step1: { goal_template_id: 'investment_pipeline' },
        },
      });

      const data1 = await response1.json();
      const sessionId1 = data1.session_id;

      // Second save (update)
      const response2 = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          current_step: 2,
          step1: { goal_template_id: 'investment_pipeline' },
          step2: { business_impact_description: 'Build investment pipeline.' },
        },
      });

      const data2 = await response2.json();
      const sessionId2 = data2.session_id;

      // Session IDs should be consistent
      expect(sessionId1).toBe(sessionId2);
    });
  });

  test.describe('Edge Cases', () => {

    test('T014-029: ignores extra fields not in schema', async ({ request }) => {
      const progressData = {
        current_step: 1,
        step1: { goal_template_id: 'discover_companies' },
        extra_field: 'should be ignored',
        another_field: 123,
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/progress`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: progressData,
      });

      expect(response.status()).toBe(200);
    });

    test('T014-030: handles concurrent save requests', async ({ request }) => {
      // Make 5 concurrent save requests
      const requests = Array(5).fill(null).map((_, i) =>
        request.post(`${BASE_URL}/api/streams/wizard/progress`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: {
            current_step: 1,
            step1: { goal_template_id: 'partnership_opportunities' },
          },
        })
      );

      const responses = await Promise.all(requests);

      // All should succeed (last write wins)
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
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
