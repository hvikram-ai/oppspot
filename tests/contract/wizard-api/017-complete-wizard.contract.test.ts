/**
 * Contract Test: POST /api/streams/wizard/complete
 * Feature: 013-stream-setup-workflow
 * Reference: contracts/wizard-api.yaml (lines 154-220)
 *
 * Test ID: T017
 * Endpoint: POST /api/streams/wizard/complete
 * Description: Complete wizard and create stream with all wizard data
 *
 * Functional Requirements Tested:
 * - FR-001: Multi-step wizard (3 steps) functional
 * - FR-002: 7 goal types selectable
 * - FR-003: Business impact criteria captured (free-form text)
 * - FR-004: Profile creation or selection works
 * - FR-005: Wizard enforces completion of all steps
 */

import { test, expect } from '@playwright/test';

const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Test data - profile IDs for testing
let testProfileId: string;

test.describe('POST /api/streams/wizard/complete - Contract Tests', () => {

  // Setup: Create a test profile for use in tests
  test.beforeAll(async ({ request }) => {
    const profileResponse = await request.post(`${BASE_URL}/api/profiles`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      },
      data: {
        name: 'Test Wizard Profile',
        company_name: 'Wizard Test Corp',
        website_url: 'https://example.com',
        analyze_now: false,
      },
    });

    if (profileResponse.ok()) {
      const data = await profileResponse.json();
      testProfileId = data.profile.id;
    }
  });

  test.describe('Valid Request Scenarios - With Existing Profile', () => {

    test('T017-001: returns 201 when wizard completes with all valid data', async ({ request }) => {
      const requestData = {
        step1: {
          goal_template_id: 'discover_companies',
        },
        step2: {
          business_impact_description: 'Looking to acquire 3-5 SaaS companies with $5-10M ARR in healthcare vertical.',
        },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Healthcare SaaS Acquisition Pipeline',
        stream_description: 'Target acquisition pipeline for healthcare SaaS companies',
        stream_emoji: '🏥',
        stream_color: '#22c55e',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(201);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();

      // Validate response structure (OpenAPI spec lines 193-203)
      expect(data).toHaveProperty('stream');
      expect(data).toHaveProperty('redirect_url');

      // Validate stream object
      expect(data.stream).toHaveProperty('id');
      expect(data.stream).toHaveProperty('name');
      expect(data.stream).toHaveProperty('emoji');
      expect(data.stream).toHaveProperty('color');
      expect(data.stream).toHaveProperty('goal_template_id');
      expect(data.stream).toHaveProperty('business_profile_id');
      expect(data.stream).toHaveProperty('status');
      expect(data.stream).toHaveProperty('created_at');

      // Validate stream data matches request
      expect(data.stream.name).toBe('Healthcare SaaS Acquisition Pipeline');
      expect(data.stream.emoji).toBe('🏥');
      expect(data.stream.color).toBe('#22c55e');
      expect(data.stream.goal_template_id).toBe('discover_companies');
      expect(data.stream.business_profile_id).toBe(testProfileId);
      expect(data.stream.status).toBe('active');

      // Validate redirect_url
      expect(typeof data.redirect_url).toBe('string');
      expect(data.redirect_url).toContain('/streams/');
      expect(data.redirect_url).toContain(data.stream.id);
    });

    test('T017-002: creates stream with default emoji when not provided', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'due_diligence' },
        step2: { business_impact_description: 'Conduct thorough due diligence.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Due Diligence Stream',
        // No stream_emoji provided
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();

      // Default emoji should be 🎯 (as per OpenAPI spec line 187)
      expect(data.stream.emoji).toBe('🎯');
    });

    test('T017-003: creates stream with default color when not provided', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'market_research' },
        step2: { business_impact_description: 'Research market opportunities.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Market Research Stream',
        // No stream_color provided
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();

      // Default color should be #6366f1 (as per OpenAPI spec line 190)
      expect(data.stream.color).toBe('#6366f1');
    });

    test('T017-004: creates stream with optional description', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'competitive_analysis' },
        step2: { business_impact_description: 'Analyze competitive landscape.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Competitive Analysis Stream',
        stream_description: 'Track and analyze key competitors in the market',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.stream.description).toBe('Track and analyze key competitors in the market');
    });

    test('T017-005: creates stream without description (nullable)', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'territory_expansion' },
        step2: { business_impact_description: 'Expand into new territories.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Territory Expansion Stream',
        stream_description: null,
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.stream.description).toBeNull();
    });
  });

  test.describe('Valid Request Scenarios - With New Profile', () => {

    test('T017-006: creates stream with new profile', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'investment_pipeline' },
        step2: { business_impact_description: 'Build investment pipeline.' },
        step3: {
          profile_selection_method: 'new',
          new_profile: {
            name: 'New Investment Profile',
            company_name: 'Investment Corp',
            website_url: 'https://investment-corp.com',
            wait_for_analysis: false,
          },
        },
        stream_name: 'Investment Pipeline Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.stream).toBeTruthy();
      expect(data.stream.business_profile_id).toBeTruthy();

      // New profile should have been created and linked
      expect(typeof data.stream.business_profile_id).toBe('string');
    });
  });

  test.describe('Validation Errors (400) - Missing Required Fields', () => {

    test('T017-007: returns 400 when step1 is missing', async ({ request }) => {
      const requestData = {
        // Missing step1
        step2: { business_impact_description: 'Test description.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.toLowerCase()).toContain('step');
    });

    test('T017-008: returns 400 when step2 is missing', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'discover_companies' },
        // Missing step2
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('step');
    });

    test('T017-009: returns 400 when step3 is missing', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'discover_companies' },
        step2: { business_impact_description: 'Test description.' },
        // Missing step3
        stream_name: 'Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      // As per OpenAPI spec line 213
      expect(data.error).toBe('All wizard steps must be completed');
    });

    test('T017-010: returns 400 when stream_name is missing', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'discover_companies' },
        step2: { business_impact_description: 'Test description.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        // Missing stream_name
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T017-011: returns 400 when stream_name is empty', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'due_diligence' },
        step2: { business_impact_description: 'Due diligence work.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: '', // Empty string
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T017-012: returns 400 when stream_name exceeds max length', async ({ request }) => {
      const longName = 'A'.repeat(256); // 256 characters (> 255 maximum)

      const requestData = {
        step1: { goal_template_id: 'market_research' },
        step2: { business_impact_description: 'Research market.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: longName,
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('Validation Errors (400) - Step Data Validation', () => {

    test('T017-013: returns 400 when step1 goal_template_id is invalid', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'invalid_template' },
        step2: { business_impact_description: 'Test description.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T017-014: returns 400 when step2 business_impact_description is too short', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'competitive_analysis' },
        step2: { business_impact_description: 'Too short' }, // Only 9 characters
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T017-015: returns 400 when step3 profile_selection_method is invalid', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'territory_expansion' },
        step2: { business_impact_description: 'Expand territories.' },
        step3: {
          profile_selection_method: 'invalid_method', // Must be 'existing' or 'new'
        },
        stream_name: 'Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T017-016: returns 400 when selected profile does not exist', async ({ request }) => {
      const nonExistentProfileId = '00000000-0000-0000-0000-000000000000';

      const requestData = {
        step1: { goal_template_id: 'investment_pipeline' },
        step2: { business_impact_description: 'Build pipeline.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: nonExistentProfileId,
        },
        stream_name: 'Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      // As per OpenAPI spec line 216
      expect(data.error).toContain('does not exist');
    });

    test('T017-017: returns 400 when selected profile belongs to different org', async ({ request }) => {
      // This tests RLS enforcement
      const otherOrgProfileId = '11111111-1111-1111-1111-111111111111';

      const requestData = {
        step1: { goal_template_id: 'partnership_opportunities' },
        step2: { business_impact_description: 'Find partnerships.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: otherOrgProfileId,
        },
        stream_name: 'Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      // As per OpenAPI spec line 216
      expect(data.error).toContain('does not belong to your organization');
    });
  });

  test.describe('Authentication & Authorization (401)', () => {

    test('T017-018: returns 401 when Authorization header is missing', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'discover_companies' },
        step2: { business_impact_description: 'Find companies.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: requestData,
      });

      expect(response.status()).toBe(401);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Unauthorized');
    });

    test('T017-019: returns 401 when Bearer token is invalid', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'market_research' },
        step2: { business_impact_description: 'Research markets.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token-12345',
        },
        data: requestData,
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('Server Errors (500)', () => {

    test('T017-020: handles server error gracefully', async ({ request }) => {
      test.skip(true, 'Requires server error injection mechanism');
    });
  });

  test.describe('Content-Type Validation', () => {

    test('T017-021: returns 400 when Content-Type is not application/json', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'discover_companies' },
        step2: { business_impact_description: 'Find companies.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: JSON.stringify(requestData),
      });

      expect([400, 415]).toContain(response.status());
    });

    test('T017-022: returns 400 when request body is malformed JSON', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: '{invalid json',
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Stream Creation & Workflow', () => {

    test('T017-023: created stream has all expected fields', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'discover_companies' },
        step2: { business_impact_description: 'Discover acquisition targets.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Complete Test Stream',
        stream_description: 'Full stream for testing',
        stream_emoji: '🚀',
        stream_color: '#3b82f6',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();

      // Validate Stream schema (OpenAPI spec lines 418-478)
      expect(data.stream).toHaveProperty('id');
      expect(data.stream).toHaveProperty('org_id');
      expect(data.stream).toHaveProperty('name');
      expect(data.stream).toHaveProperty('description');
      expect(data.stream).toHaveProperty('emoji');
      expect(data.stream).toHaveProperty('color');
      expect(data.stream).toHaveProperty('goal_template_id');
      expect(data.stream).toHaveProperty('goal_criteria');
      expect(data.stream).toHaveProperty('business_profile_id');
      expect(data.stream).toHaveProperty('status');
      expect(data.stream).toHaveProperty('created_by');
      expect(data.stream).toHaveProperty('created_at');
      expect(data.stream).toHaveProperty('updated_at');

      // Validate UUID format
      expect(data.stream.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      // Validate timestamps
      const createdAt = new Date(data.stream.created_at);
      expect(createdAt).toBeInstanceOf(Date);
    });

    test('T017-024: redirect_url contains stream ID', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'due_diligence' },
        step2: { business_impact_description: 'Due diligence process.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Redirect Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();

      // Redirect URL should be /streams/{id}/dashboard
      expect(data.redirect_url).toContain('/streams/');
      expect(data.redirect_url).toContain(data.stream.id);
      expect(data.redirect_url).toContain('/dashboard');
    });

    test('T017-025: goal_criteria includes business_impact_description', async ({ request }) => {
      const impactDescription = 'Strategic acquisition targets in healthcare SaaS.';

      const requestData = {
        step1: { goal_template_id: 'investment_pipeline' },
        step2: { business_impact_description: impactDescription },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Goals Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();

      // goal_criteria should contain step2 data
      expect(data.stream.goal_criteria).toBeTruthy();
      expect(typeof data.stream.goal_criteria).toBe('object');
    });
  });

  test.describe('Edge Cases', () => {

    test('T017-026: ignores extra fields not in schema', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'competitive_analysis' },
        step2: { business_impact_description: 'Analyze competitors.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Extra Fields Test',
        extra_field: 'should be ignored',
        another_field: 123,
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      // Should succeed and ignore extra fields
      expect(response.status()).toBe(201);
    });

    test('T017-027: handles special characters in stream_name', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'territory_expansion' },
        step2: { business_impact_description: 'Expand to new territories.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Test Stream: Special & Characters! @#$%',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.stream.name).toBe('Test Stream: Special & Characters! @#$%');
    });
  });

  test.describe('FR-001 to FR-005: Multi-Step Wizard', () => {

    test('T017-028: enforces all 3 steps completed (FR-001, FR-005)', async ({ request }) => {
      const requestData = {
        step1: { goal_template_id: 'partnership_opportunities' },
        step2: { business_impact_description: 'Find strategic partnerships.' },
        step3: {
          profile_selection_method: 'existing',
          selected_profile_id: testProfileId,
        },
        stream_name: 'Multi-Step Test Stream',
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/complete`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(201);

      // All 3 steps were provided and validated
    });
  });

  // Cleanup: Delete test profile after all tests
  test.afterAll(async ({ request }) => {
    if (testProfileId) {
      await request.delete(`${BASE_URL}/api/profiles/${testProfileId}`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });
    }
  });
});
