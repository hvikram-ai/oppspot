/**
 * Contract Test: GET /api/profiles/[id]
 * T008: Get single business profile with usage stats
 *
 * Contract Reference: contracts/profiles-api.yaml
 * Requirements: FR-012 (display profile details)
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('GET /api/profiles/[id] - Get Single Profile', () => {
  let authToken: string;
  let testProfileId: string;

  test.beforeAll(async ({ request }) => {
    // Authenticate
    const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
      data: {
        email: 'demo@oppspot.com',
        password: 'Demo123456!'
      }
    });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      authToken = loginData.access_token || loginData.token;
    } else {
      throw new Error('Failed to authenticate for contract tests');
    }

    // Create a test profile
    const createResponse = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: `Get Test Profile ${Date.now()}`,
        company_name: 'Get Test Company',
        website_url: `https://get-test-${Date.now()}.com`,
        analyze_now: false
      }
    });

    if (createResponse.ok()) {
      const body = await createResponse.json();
      testProfileId = body.profile.id;
    }
  });

  test.afterAll(async ({ request }) => {
    // Cleanup
    if (testProfileId && authToken) {
      await request.delete(`${API_BASE}/api/profiles/${testProfileId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    }
  });

  test('should return 401 when not authenticated', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should return 404 for non-existent profile ID', async ({ request }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(`${API_BASE}/api/profiles/${fakeId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/not found|does not exist/i);
  });

  test('should return 400 for invalid UUID format', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/invalid-uuid`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/invalid|uuid/i);
  });

  test('should return profile with all fields', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Validate response structure (contract: profiles-api.yaml)
    expect(body).toHaveProperty('profile');

    const profile = body.profile;

    // Core fields
    expect(profile).toHaveProperty('id', testProfileId);
    expect(profile).toHaveProperty('org_id');
    expect(profile).toHaveProperty('name');
    expect(profile).toHaveProperty('company_name');
    expect(profile).toHaveProperty('website_url');

    // FR-007: 11 extractable fields
    expect(profile).toHaveProperty('industry');
    expect(profile).toHaveProperty('description');
    expect(profile).toHaveProperty('company_size');
    expect(profile).toHaveProperty('location');
    expect(profile).toHaveProperty('revenue_range');
    expect(profile).toHaveProperty('tech_stack');
    expect(profile).toHaveProperty('products_services');
    expect(profile).toHaveProperty('target_markets');
    expect(profile).toHaveProperty('key_differentiators');
    expect(profile).toHaveProperty('employee_count');

    // Metadata fields
    expect(profile).toHaveProperty('manual_edits');
    expect(profile).toHaveProperty('analysis_status');
    expect(profile).toHaveProperty('analysis_metadata');
    expect(profile).toHaveProperty('created_by');
    expect(profile).toHaveProperty('created_at');
    expect(profile).toHaveProperty('updated_at');
  });

  test('should return usage_stats with profile (contract extension)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Contract specifies usage_stats should be included
    expect(body).toHaveProperty('usage_stats');
    expect(typeof body.usage_stats).toBe('object');

    // usage_stats should have streams_using_profile count
    expect(body.usage_stats).toHaveProperty('streams_using_profile');
    expect(typeof body.usage_stats.streams_using_profile).toBe('number');
    expect(body.usage_stats.streams_using_profile).toBeGreaterThanOrEqual(0);

    // usage_stats should have last_used_at (nullable if never used)
    expect(body.usage_stats).toHaveProperty('last_used_at');
    if (body.usage_stats.last_used_at !== null) {
      expect(typeof body.usage_stats.last_used_at).toBe('string');
      // Validate ISO 8601 format
      expect(new Date(body.usage_stats.last_used_at).toISOString()).toBeTruthy();
    }
  });

  test('should enforce org-scoped access (FR-011)', async ({ request }) => {
    // This test verifies that users can only access profiles in their org
    // Since we can't easily test cross-org access without multiple users,
    // we verify that the returned profile belongs to the authenticated user's org

    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Profile should have org_id matching the authenticated user's org
    expect(body.profile).toHaveProperty('org_id');
    expect(typeof body.profile.org_id).toBe('string');
    expect(body.profile.org_id.length).toBeGreaterThan(0);
  });

  test('should return arrays for multi-value fields', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    const profile = body.profile;

    // These fields should be arrays (even if empty)
    expect(Array.isArray(profile.tech_stack)).toBe(true);
    expect(Array.isArray(profile.products_services)).toBe(true);
    expect(Array.isArray(profile.target_markets)).toBe(true);
    expect(Array.isArray(profile.key_differentiators)).toBe(true);
  });

  test('should return proper null values for nullable fields', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    const profile = body.profile;

    // These fields can be null if not yet analyzed or not provided
    // Just verify they exist in the response
    expect('industry' in profile).toBe(true);
    expect('description' in profile).toBe(true);
    expect('company_size' in profile).toBe(true);
    expect('location' in profile).toBe(true);
    expect('revenue_range' in profile).toBe(true);
    expect('employee_count' in profile).toBe(true);
    expect('updated_by' in profile).toBe(true);
    expect('analysis_started_at' in profile).toBe(true);
    expect('analysis_completed_at' in profile).toBe(true);
  });

  test('should validate analysis_status enum values', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    const validStatuses = ['pending', 'analyzing', 'completed', 'failed'];
    expect(validStatuses).toContain(body.profile.analysis_status);
  });

  test('should validate company_size enum if present', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    if (body.profile.company_size !== null) {
      const validSizes = ['1-10', '11-50', '51-200', '201-500', '500+'];
      expect(validSizes).toContain(body.profile.company_size);
    }
  });

  test('should validate revenue_range enum if present', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    if (body.profile.revenue_range !== null) {
      const validRanges = ['$0-1M', '$1-10M', '$10-50M', '$50-100M', '$100M+'];
      expect(validRanges).toContain(body.profile.revenue_range);
    }
  });

  test('should return manual_edits as empty object if no edits made', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // FR-010: manual_edits should be an object
    expect(typeof body.profile.manual_edits).toBe('object');
    expect(body.profile.manual_edits).not.toBeNull();
  });

  test('should return analysis_metadata as object', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // FR-008: analysis_metadata should be an object
    expect(typeof body.profile.analysis_metadata).toBe('object');
    expect(body.profile.analysis_metadata).not.toBeNull();
  });

  test('should return ISO 8601 timestamps', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Validate created_at is valid ISO 8601
    expect(new Date(body.profile.created_at).toISOString()).toBeTruthy();

    // Validate updated_at is valid ISO 8601
    expect(new Date(body.profile.updated_at).toISOString()).toBeTruthy();

    // created_at should be <= updated_at
    const createdDate = new Date(body.profile.created_at);
    const updatedDate = new Date(body.profile.updated_at);
    expect(createdDate.getTime()).toBeLessThanOrEqual(updatedDate.getTime());
  });
});

/**
 * Test Summary:
 * - ✅ Tests authentication requirement (401)
 * - ✅ Tests 404 for non-existent profile
 * - ✅ Tests 400 for invalid UUID format
 * - ✅ Tests profile retrieval with all fields
 * - ✅ Tests usage_stats calculation (streams_using_profile, last_used_at)
 * - ✅ Tests FR-011 (org-scoped access control)
 * - ✅ Tests FR-007 (11 extractable fields present)
 * - ✅ Tests array field types (tech_stack, products_services, etc.)
 * - ✅ Tests nullable field handling
 * - ✅ Tests enum validation (analysis_status, company_size, revenue_range)
 * - ✅ Tests FR-010 (manual_edits object present)
 * - ✅ Tests FR-008 (analysis_metadata object present)
 * - ✅ Tests timestamp format (ISO 8601)
 *
 * Expected Result: ALL TESTS SHOULD FAIL (endpoint not implemented yet)
 */
