/**
 * Contract Test: POST /api/streams/wizard/validate
 * Feature: 013-stream-setup-workflow
 * Reference: contracts/wizard-api.yaml (lines 86-152)
 *
 * Test ID: T016
 * Endpoint: POST /api/streams/wizard/validate
 * Description: Server-side validation before proceeding to next step
 *
 * Functional Requirements Tested:
 * - FR-005: Wizard enforces completion of all steps
 * - Server-side validation for each step
 */

import { test, expect } from '@playwright/test';

const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('POST /api/streams/wizard/validate - Contract Tests', () => {

  test.describe('Valid Request Scenarios - Step 1', () => {

    test('T016-001: returns 200 with valid=true for valid step 1 data', async ({ request }) => {
      const requestData = {
        step: 1,
        data: {
          goal_template_id: 'discover_companies',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();

      // Validate response structure (OpenAPI spec lines 112-126)
      expect(data).toHaveProperty('valid');
      expect(data.valid).toBe(true);

      expect(data).toHaveProperty('warnings');
      expect(Array.isArray(data.warnings)).toBe(true);
      expect(data.warnings).toEqual([]);
    });

    test('T016-002: validates all valid goal template IDs', async ({ request }) => {
      const validTemplates = [
        'discover_companies',
        'due_diligence',
        'market_research',
        'competitive_analysis',
        'territory_expansion',
        'investment_pipeline',
        'partnership_opportunities',
      ];

      for (const templateId of validTemplates) {
        const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
          data: {
            step: 1,
            data: { goal_template_id: templateId },
          },
        });

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.valid).toBe(true);
      }
    });
  });

  test.describe('Valid Request Scenarios - Step 2', () => {

    test('T016-003: returns 200 with valid=true for valid step 2 data', async ({ request }) => {
      const requestData = {
        step: 2,
        data: {
          business_impact_description: 'Looking to acquire 3-5 SaaS companies with $5-10M ARR in healthcare vertical.',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.valid).toBe(true);
      expect(data.warnings).toEqual([]);
    });

    test('T016-004: validates minimum length business_impact_description (10 chars)', async ({ request }) => {
      const requestData = {
        step: 2,
        data: {
          business_impact_description: 'Ten chars!', // Exactly 10 characters
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.valid).toBe(true);
    });

    test('T016-005: validates maximum length business_impact_description (5000 chars)', async ({ request }) => {
      const maxDescription = 'A'.repeat(5000);

      const requestData = {
        step: 2,
        data: {
          business_impact_description: maxDescription,
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.valid).toBe(true);
    });

    test('T016-006: validates step 2 with optional custom_criteria', async ({ request }) => {
      const requestData = {
        step: 2,
        data: {
          business_impact_description: 'Expand into new markets.',
          custom_criteria: {
            target_revenue: '$10M-$50M',
            industries: ['healthcare', 'fintech'],
          },
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.valid).toBe(true);
    });
  });

  test.describe('Valid Request Scenarios - Step 3', () => {

    test('T016-007: returns 200 with valid=true for step 3 with existing profile', async ({ request }) => {
      const requestData = {
        step: 3,
        data: {
          profile_selection_method: 'existing',
          selected_profile_id: '11111111-1111-1111-1111-111111111111',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.valid).toBe(true);
    });

    test('T016-008: returns 200 with valid=true for step 3 with new profile', async ({ request }) => {
      const requestData = {
        step: 3,
        data: {
          profile_selection_method: 'new',
          new_profile: {
            name: 'Test Profile',
            company_name: 'Test Corp',
            website_url: 'https://testcorp.com',
            wait_for_analysis: true,
          },
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.valid).toBe(true);
    });

    test('T016-009: validates step 3 new profile with wait_for_analysis=false', async ({ request }) => {
      const requestData = {
        step: 3,
        data: {
          profile_selection_method: 'new',
          new_profile: {
            name: 'Quick Profile',
            company_name: 'Quick Corp',
            website_url: 'https://quickcorp.com',
            wait_for_analysis: false,
          },
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.valid).toBe(true);
    });
  });

  test.describe('Validation Failures (400) - Step 1', () => {

    test('T016-010: returns 400 with valid=false when goal_template_id is missing', async ({ request }) => {
      const requestData = {
        step: 1,
        data: {}, // Missing goal_template_id
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();

      // Validate error response structure (OpenAPI spec lines 127-148)
      expect(data).toHaveProperty('valid');
      expect(data.valid).toBe(false);

      expect(data).toHaveProperty('errors');
      expect(Array.isArray(data.errors)).toBe(true);
      expect(data.errors.length).toBeGreaterThan(0);

      // Validate error object structure
      expect(data.errors[0]).toHaveProperty('field');
      expect(data.errors[0]).toHaveProperty('message');
      expect(data.errors[0].field).toBe('goal_template_id');
      expect(data.errors[0].message).toContain('required');
    });

    test('T016-011: returns 400 with valid=false for invalid goal_template_id', async ({ request }) => {
      const requestData = {
        step: 1,
        data: {
          goal_template_id: 'invalid_template_id',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.errors.length).toBeGreaterThan(0);
    });
  });

  test.describe('Validation Failures (400) - Step 2', () => {

    test('T016-012: returns 400 when business_impact_description is missing', async ({ request }) => {
      const requestData = {
        step: 2,
        data: {}, // Missing business_impact_description
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.errors[0].field).toBe('business_impact_description');
    });

    test('T016-013: returns 400 when business_impact_description is too short (<10 chars)', async ({ request }) => {
      const requestData = {
        step: 2,
        data: {
          business_impact_description: 'Too short', // Only 9 characters
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.errors[0].field).toBe('business_impact_description');
      expect(data.errors[0].message.toLowerCase()).toContain('minimum');
    });

    test('T016-014: returns 400 when business_impact_description exceeds max length', async ({ request }) => {
      const tooLongDescription = 'A'.repeat(5001); // 5001 characters

      const requestData = {
        step: 2,
        data: {
          business_impact_description: tooLongDescription,
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.errors[0].message.toLowerCase()).toContain('maximum');
    });
  });

  test.describe('Validation Failures (400) - Step 3', () => {

    test('T016-015: returns 400 when profile_selection_method is missing', async ({ request }) => {
      const requestData = {
        step: 3,
        data: {}, // Missing profile_selection_method
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.errors[0].field).toBe('profile_selection_method');
    });

    test('T016-016: returns 400 when profile_selection_method is invalid', async ({ request }) => {
      const requestData = {
        step: 3,
        data: {
          profile_selection_method: 'invalid_method', // Must be 'existing' or 'new'
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
    });

    test('T016-017: returns 400 when existing profile has no selected_profile_id', async ({ request }) => {
      const requestData = {
        step: 3,
        data: {
          profile_selection_method: 'existing',
          // Missing selected_profile_id
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.errors[0].field).toBe('selected_profile_id');
    });

    test('T016-018: returns 400 when selected_profile_id is invalid UUID', async ({ request }) => {
      const requestData = {
        step: 3,
        data: {
          profile_selection_method: 'existing',
          selected_profile_id: 'not-a-valid-uuid',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
    });

    test('T016-019: returns 400 when new profile has missing required fields', async ({ request }) => {
      const requestData = {
        step: 3,
        data: {
          profile_selection_method: 'new',
          new_profile: {
            name: 'Incomplete Profile',
            // Missing company_name and website_url
          },
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.errors.length).toBeGreaterThan(0);
    });

    test('T016-020: returns 400 when new profile has invalid website_url', async ({ request }) => {
      const requestData = {
        step: 3,
        data: {
          profile_selection_method: 'new',
          new_profile: {
            name: 'Test Profile',
            company_name: 'Test Corp',
            website_url: 'not-a-valid-url',
          },
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
    });
  });

  test.describe('Request Structure Validation (400)', () => {

    test('T016-021: returns 400 when step field is missing', async ({ request }) => {
      const requestData = {
        // Missing step field
        data: {
          goal_template_id: 'discover_companies',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('valid');
      expect(data.valid).toBe(false);
    });

    test('T016-022: returns 400 when step is invalid (not 1, 2, or 3)', async ({ request }) => {
      const requestData = {
        step: 5, // Invalid - must be 1, 2, or 3
        data: {
          goal_template_id: 'discover_companies',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
    });

    test('T016-023: returns 400 when data field is missing', async ({ request }) => {
      const requestData = {
        step: 1,
        // Missing data field
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
    });

    test('T016-024: returns 400 when data field is null', async ({ request }) => {
      const requestData = {
        step: 1,
        data: null,
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
    });
  });

  test.describe('Authentication & Authorization (401)', () => {

    test('T016-025: returns 401 when Authorization header is missing', async ({ request }) => {
      const requestData = {
        step: 1,
        data: {
          goal_template_id: 'discover_companies',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
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

    test('T016-026: returns 401 when Bearer token is invalid', async ({ request }) => {
      const requestData = {
        step: 1,
        data: {
          goal_template_id: 'market_research',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
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

    test('T016-027: handles server error gracefully', async ({ request }) => {
      test.skip(true, 'Requires server error injection mechanism');
    });
  });

  test.describe('Content-Type Validation', () => {

    test('T016-028: returns 400 when Content-Type is not application/json', async ({ request }) => {
      const requestData = {
        step: 1,
        data: {
          goal_template_id: 'discover_companies',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: JSON.stringify(requestData),
      });

      expect([400, 415]).toContain(response.status());
    });

    test('T016-029: returns 400 when request body is malformed JSON', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: '{invalid json',
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Edge Cases & Multiple Errors', () => {

    test('T016-030: returns multiple errors when multiple fields are invalid', async ({ request }) => {
      const requestData = {
        step: 2,
        data: {
          business_impact_description: 'Too', // Too short (< 10 chars)
          custom_criteria: null, // Invalid if provided
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.errors.length).toBeGreaterThanOrEqual(1);
    });

    test('T016-031: ignores extra fields not in schema', async ({ request }) => {
      const requestData = {
        step: 1,
        data: {
          goal_template_id: 'discover_companies',
          extra_field: 'should be ignored',
        },
      };

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      // Should succeed and ignore extra fields
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.valid).toBe(true);
    });
  });

  test.describe('FR-005: Wizard Enforcement', () => {

    test('T016-032: validates each step independently', async ({ request }) => {
      // Validate step 1
      const step1Response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          step: 1,
          data: { goal_template_id: 'due_diligence' },
        },
      });

      expect(step1Response.status()).toBe(200);

      const step1Data = await step1Response.json();
      expect(step1Data.valid).toBe(true);

      // Validate step 2
      const step2Response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          step: 2,
          data: { business_impact_description: 'Conduct thorough due diligence.' },
        },
      });

      expect(step2Response.status()).toBe(200);

      const step2Data = await step2Response.json();
      expect(step2Data.valid).toBe(true);

      // Each step validates independently
    });
  });

  test.describe('Performance', () => {

    test('T016-033: responds within acceptable latency (<300ms)', async ({ request }) => {
      const requestData = {
        step: 2,
        data: {
          business_impact_description: 'Test validation performance.',
        },
      };

      const startTime = Date.now();

      const response = await request.post(`${BASE_URL}/api/streams/wizard/validate`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      expect(response.status()).toBe(200);

      // Validation should be fast
      expect(latency).toBeLessThan(300);
    });
  });
});
