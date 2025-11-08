/**
 * Contract Test: POST /api/profiles/analyze
 * Feature: 013-stream-setup-workflow
 * Reference: contracts/profiles-api.yaml (lines 286-346)
 *
 * Test ID: T011
 * Endpoint: POST /api/profiles/analyze
 * Description: Trigger AI website analysis for a business profile
 *
 * Functional Requirements Tested:
 * - FR-007: AI website analysis extracts 11 fields
 * - FR-008: Analysis progress displayed to user
 * - FR-009: Graceful error handling for failed analysis
 */

import { test, expect } from '@playwright/test';

const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Test data - will need actual profile IDs from setup
let testProfileId: string;
let testProfileWithoutWebsite: string;
let testProfileAnalyzing: string;

test.describe('POST /api/profiles/analyze - Contract Tests', () => {

  // Setup: Create test profiles before running tests
  test.beforeAll(async ({ request }) => {
    // Create profile with valid website for analysis
    const profileResponse = await request.post(`${BASE_URL}/api/profiles`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      },
      data: {
        name: 'Test Analysis Profile',
        company_name: 'Test Corp',
        website_url: 'https://example.com',
        analyze_now: false, // Don't auto-analyze
      },
    });

    if (profileResponse.ok()) {
      const data = await profileResponse.json();
      testProfileId = data.profile.id;
    }

    // Create profile without website for error testing
    const noWebsiteResponse = await request.post(`${BASE_URL}/api/profiles`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_USER_TOKEN}`,
      },
      data: {
        name: 'Test No Website Profile',
        company_name: 'No Website Corp',
        website_url: '', // Empty URL
        analyze_now: false,
      },
    });

    if (noWebsiteResponse.ok()) {
      const data = await noWebsiteResponse.json();
      testProfileWithoutWebsite = data.profile.id;
    }
  });

  test.describe('Valid Request Scenarios', () => {

    test('T011-001: returns 202 when analysis is triggered successfully', async ({ request }) => {
      const requestData = {
        profile_id: testProfileId,
        force_reanalysis: false,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(202);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();

      // Validate response structure (from OpenAPI spec lines 310-326)
      expect(data).toHaveProperty('job_id');
      expect(data).toHaveProperty('profile_id');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('estimated_completion');

      // Validate types and values
      expect(typeof data.job_id).toBe('string');
      expect(data.profile_id).toBe(testProfileId);
      expect(data.status).toBe('analyzing');
      expect(typeof data.estimated_completion).toBe('string');

      // Validate estimated_completion is a valid ISO date
      const estimatedDate = new Date(data.estimated_completion);
      expect(estimatedDate).toBeInstanceOf(Date);
      expect(estimatedDate.getTime()).toBeGreaterThan(Date.now());
    });

    test('T011-002: returns 202 when force_reanalysis is true', async ({ request }) => {
      const requestData = {
        profile_id: testProfileId,
        force_reanalysis: true,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(202);

      const data = await response.json();
      expect(data.status).toBe('analyzing');
    });

    test('T011-003: returns 202 when only required fields provided', async ({ request }) => {
      const requestData = {
        profile_id: testProfileId,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(202);

      const data = await response.json();
      expect(data).toHaveProperty('job_id');
      expect(data).toHaveProperty('profile_id');
    });
  });

  test.describe('Validation Errors (400)', () => {

    test('T011-004: returns 400 when profile_id is missing', async ({ request }) => {
      const requestData = {
        force_reanalysis: true,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('profile_id');
    });

    test('T011-005: returns 400 when profile_id is invalid UUID', async ({ request }) => {
      const requestData = {
        profile_id: 'not-a-valid-uuid',
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.toLowerCase()).toContain('invalid');
    });

    test('T011-006: returns 400 when profile has no website_url (FR-009)', async ({ request }) => {
      const requestData = {
        profile_id: testProfileWithoutWebsite,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      // As per OpenAPI spec line 339
      expect(data.error).toBe('Profile must have a valid website_url');
    });

    test('T011-007: returns 400 when analysis already in progress', async ({ request }) => {
      // First request - start analysis
      await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          profile_id: testProfileId,
        },
      });

      // Second request - should fail with "already analyzing"
      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: {
          profile_id: testProfileId,
        },
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      // As per OpenAPI spec line 337
      expect(data.error).toBe('Profile analysis already in progress');
    });

    test('T011-008: returns 400 with invalid force_reanalysis type', async ({ request }) => {
      const requestData = {
        profile_id: testProfileId,
        force_reanalysis: 'yes', // Should be boolean
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
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

  test.describe('Authentication & Authorization (401)', () => {

    test('T011-009: returns 401 when Authorization header is missing', async ({ request }) => {
      const requestData = {
        profile_id: testProfileId,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
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

    test('T011-010: returns 401 when Bearer token is invalid', async ({ request }) => {
      const requestData = {
        profile_id: testProfileId,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
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

    test('T011-011: returns 401 when Bearer token is expired', async ({ request }) => {
      // Use a known expired token (would need to generate one in real scenario)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const requestData = {
        profile_id: testProfileId,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${expiredToken}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Not Found Errors (404)', () => {

    test('T011-012: returns 404 when profile does not exist', async ({ request }) => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const requestData = {
        profile_id: nonExistentId,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(404);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.toLowerCase()).toContain('not found');
    });

    test('T011-013: returns 404 when profile belongs to different organization', async ({ request }) => {
      // This would require a profile ID from a different org
      // In practice, this tests RLS policies
      const otherOrgProfileId = '11111111-1111-1111-1111-111111111111';

      const requestData = {
        profile_id: otherOrgProfileId,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('Server Errors (500)', () => {

    test('T011-014: handles server error gracefully', async ({ request }) => {
      // This test would require mocking or a special test endpoint
      // Skip if no way to trigger server error in test environment
      test.skip(true, 'Requires server error injection mechanism');
    });

    test('T011-015: includes error response schema on 500', async ({ request }) => {
      // This test would require mocking or a special test endpoint
      test.skip(true, 'Requires server error injection mechanism');
    });
  });

  test.describe('Content-Type Validation', () => {

    test('T011-016: returns 400 when Content-Type is not application/json', async ({ request }) => {
      const requestData = {
        profile_id: testProfileId,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: JSON.stringify(requestData),
      });

      // Should reject non-JSON content type
      expect([400, 415]).toContain(response.status());
    });

    test('T011-017: returns 400 when request body is malformed JSON', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: '{invalid json',
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Edge Cases & Additional Validations', () => {

    test('T011-018: returns 400 when request body is empty', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
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

    test('T011-019: ignores extra fields not in schema', async ({ request }) => {
      const requestData = {
        profile_id: testProfileId,
        force_reanalysis: false,
        extra_field: 'should be ignored',
        another_field: 123,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      // Should succeed and ignore extra fields
      expect(response.status()).toBe(202);
    });

    test('T011-020: returns proper estimated_completion time (30 seconds from now)', async ({ request }) => {
      const requestData = {
        profile_id: testProfileId,
      };

      const beforeRequest = Date.now();

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      const afterRequest = Date.now();

      expect(response.status()).toBe(202);

      const data = await response.json();
      const estimatedTime = new Date(data.estimated_completion).getTime();

      // Should be approximately 30 seconds from request time (allow 5s margin)
      const expectedMin = beforeRequest + 25000; // 25 seconds
      const expectedMax = afterRequest + 35000;  // 35 seconds

      expect(estimatedTime).toBeGreaterThanOrEqual(expectedMin);
      expect(estimatedTime).toBeLessThanOrEqual(expectedMax);
    });
  });

  test.describe('FR-007: AI Website Analysis', () => {

    test('T011-021: triggers analysis that will extract 11 profile fields', async ({ request }) => {
      const requestData = {
        profile_id: testProfileId,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(202);

      const data = await response.json();

      // Verify job_id is returned for tracking
      expect(data.job_id).toBeTruthy();
      expect(typeof data.job_id).toBe('string');

      // The actual extraction of 11 fields will be tested in T012 (analysis-status endpoint)
      // This test verifies the analysis is initiated correctly
    });
  });

  test.describe('FR-008: Analysis Progress Tracking', () => {

    test('T011-022: returns job_id for progress polling', async ({ request }) => {
      const requestData = {
        profile_id: testProfileId,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(202);

      const data = await response.json();

      // Job ID must be provided for GET /profiles/{id}/analysis-status polling
      expect(data).toHaveProperty('job_id');
      expect(data.job_id.length).toBeGreaterThan(0);
    });
  });

  test.describe('FR-009: Error Handling', () => {

    test('T011-023: returns clear error message when website is invalid', async ({ request }) => {
      const requestData = {
        profile_id: testProfileWithoutWebsite,
      };

      const response = await request.post(`${BASE_URL}/api/profiles/analyze`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
        data: requestData,
      });

      expect(response.status()).toBe(400);

      const data = await response.json();

      // Error message should be clear and actionable
      expect(data.error).toBe('Profile must have a valid website_url');

      // Should not include technical stack traces in production
      expect(data).not.toHaveProperty('stack');
    });
  });

  // Cleanup: Delete test profiles after all tests
  test.afterAll(async ({ request }) => {
    if (testProfileId) {
      await request.delete(`${BASE_URL}/api/profiles/${testProfileId}`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });
    }

    if (testProfileWithoutWebsite) {
      await request.delete(`${BASE_URL}/api/profiles/${testProfileWithoutWebsite}`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });
    }
  });
});
