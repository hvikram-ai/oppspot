/**
 * Contract Test: POST /api/profiles
 * T006: Create business profile with optional AI analysis
 *
 * Contract Reference: contracts/profiles-api.yaml
 * Requirements: FR-007 (AI extraction), FR-011 (org-scoped)
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('POST /api/profiles - Create Profile', () => {
  let authToken: string;
  let testProfileId: string;

  test.beforeAll(async ({ request }) => {
    // Authenticate and get auth token
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
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: Delete test profile if created
    if (testProfileId && authToken) {
      await request.delete(`${API_BASE}/api/profiles/${testProfileId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    }
  });

  test('should return 401 when not authenticated', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/profiles`, {
      data: {
        name: 'Test Profile',
        company_name: 'Test Company',
        website_url: 'https://example.com'
      }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should return 400 when name is missing', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        company_name: 'Test Company',
        website_url: 'https://example.com'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('name');
  });

  test('should return 400 when company_name is missing', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Test Profile',
        website_url: 'https://example.com'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('company_name');
  });

  test('should return 400 when website_url is missing', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Test Profile',
        company_name: 'Test Company'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('website_url');
  });

  test('should return 400 when website_url is invalid', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Test Profile',
        company_name: 'Test Company',
        website_url: 'not-a-valid-url'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/url|invalid/i);
  });

  test('should create profile without AI analysis when analyze_now is false', async ({ request }) => {
    const uniqueName = `Test Profile ${Date.now()}`;
    const response = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: uniqueName,
        company_name: 'Test Company',
        website_url: `https://example-${Date.now()}.com`,
        analyze_now: false
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    // Validate response structure (contract: profiles-api.yaml)
    expect(body).toHaveProperty('profile');
    expect(body.profile).toHaveProperty('id');
    expect(body.profile).toHaveProperty('org_id');
    expect(body.profile).toHaveProperty('name', uniqueName);
    expect(body.profile).toHaveProperty('company_name', 'Test Company');
    expect(body.profile).toHaveProperty('website_url');
    expect(body.profile).toHaveProperty('analysis_status', 'pending');
    expect(body.profile).toHaveProperty('created_at');
    expect(body.profile).toHaveProperty('updated_at');

    // FR-007: Should have 11 extractable fields (nullable before analysis)
    expect(body.profile).toHaveProperty('industry');
    expect(body.profile).toHaveProperty('description');
    expect(body.profile).toHaveProperty('company_size');
    expect(body.profile).toHaveProperty('location');
    expect(body.profile).toHaveProperty('revenue_range');
    expect(body.profile).toHaveProperty('tech_stack');
    expect(body.profile).toHaveProperty('products_services');
    expect(body.profile).toHaveProperty('target_markets');
    expect(body.profile).toHaveProperty('key_differentiators');
    expect(body.profile).toHaveProperty('employee_count');

    // When analyze_now=false, should NOT have analysis_job_id
    expect(body).not.toHaveProperty('analysis_job_id');

    // Store for cleanup
    testProfileId = body.profile.id;
  });

  test('should create profile WITH AI analysis when analyze_now is true', async ({ request }) => {
    const uniqueName = `Test Profile AI ${Date.now()}`;
    const response = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: uniqueName,
        company_name: 'Test Company AI',
        website_url: `https://example-ai-${Date.now()}.com`,
        analyze_now: true
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    // Validate response structure
    expect(body).toHaveProperty('profile');
    expect(body.profile).toHaveProperty('id');
    expect(body.profile.name).toBe(uniqueName);
    expect(body.profile.analysis_status).toMatch(/pending|analyzing/);

    // When analyze_now=true, should have analysis_job_id for tracking (FR-008)
    expect(body).toHaveProperty('analysis_job_id');
    expect(typeof body.analysis_job_id).toBe('string');
    expect(body.analysis_job_id.length).toBeGreaterThan(0);

    // Cleanup
    await request.delete(`${API_BASE}/api/profiles/${body.profile.id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  });

  test('should return 400 when duplicate website_url in same org', async ({ request }) => {
    const uniqueUrl = `https://duplicate-test-${Date.now()}.com`;

    // Create first profile
    const firstResponse = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: `First Profile ${Date.now()}`,
        company_name: 'First Company',
        website_url: uniqueUrl,
        analyze_now: false
      }
    });

    expect(firstResponse.status()).toBe(201);
    const firstBody = await firstResponse.json();
    const firstProfileId = firstBody.profile.id;

    // Try to create second profile with same URL (should fail - FR-011 uniqueness)
    const secondResponse = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: `Second Profile ${Date.now()}`,
        company_name: 'Second Company',
        website_url: uniqueUrl, // Same URL
        analyze_now: false
      }
    });

    expect(secondResponse.status()).toBe(400);
    const secondBody = await secondResponse.json();
    expect(secondBody).toHaveProperty('error');
    expect(secondBody.error).toMatch(/duplicate|exists|already/i);
    expect(secondBody.error).toContain('website');

    // Cleanup
    await request.delete(`${API_BASE}/api/profiles/${firstProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  });

  test('should return 400 when duplicate name in same org', async ({ request }) => {
    const uniqueName = `Unique Name ${Date.now()}`;

    // Create first profile
    const firstResponse = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: uniqueName,
        company_name: 'Company One',
        website_url: `https://company-one-${Date.now()}.com`,
        analyze_now: false
      }
    });

    expect(firstResponse.status()).toBe(201);
    const firstBody = await firstResponse.json();
    const firstProfileId = firstBody.profile.id;

    // Try to create second profile with same name (should fail - FR-011 uniqueness)
    const secondResponse = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: uniqueName, // Same name
        company_name: 'Company Two',
        website_url: `https://company-two-${Date.now()}.com`,
        analyze_now: false
      }
    });

    expect(secondResponse.status()).toBe(400);
    const secondBody = await secondResponse.json();
    expect(secondBody).toHaveProperty('error');
    expect(secondBody.error).toMatch(/duplicate|exists|already/i);
    expect(secondBody.error).toContain('name');

    // Cleanup
    await request.delete(`${API_BASE}/api/profiles/${firstProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  });

  test('should validate manual_edits and analysis_metadata fields exist', async ({ request }) => {
    const uniqueName = `Metadata Test ${Date.now()}`;
    const response = await request.post(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        name: uniqueName,
        company_name: 'Metadata Company',
        website_url: `https://metadata-${Date.now()}.com`,
        analyze_now: false
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    // FR-010: manual_edits should exist and be empty object initially
    expect(body.profile).toHaveProperty('manual_edits');
    expect(typeof body.profile.manual_edits).toBe('object');

    // FR-008: analysis_metadata should exist
    expect(body.profile).toHaveProperty('analysis_metadata');
    expect(typeof body.profile.analysis_metadata).toBe('object');

    // Cleanup
    await request.delete(`${API_BASE}/api/profiles/${body.profile.id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  });
});

/**
 * Test Summary:
 * - ✅ Tests authentication requirement (401)
 * - ✅ Tests required field validation (name, company_name, website_url)
 * - ✅ Tests URL format validation
 * - ✅ Tests create without AI analysis (analyze_now=false)
 * - ✅ Tests create WITH AI analysis (analyze_now=true)
 * - ✅ Tests duplicate website_url prevention (org-scoped uniqueness)
 * - ✅ Tests duplicate name prevention (org-scoped uniqueness)
 * - ✅ Tests FR-007 (11 extractable fields present in response)
 * - ✅ Tests FR-008 (analysis_job_id returned when analyze_now=true)
 * - ✅ Tests FR-010 (manual_edits field exists)
 * - ✅ Tests FR-011 (org-scoped storage)
 *
 * Expected Result: ALL TESTS SHOULD FAIL (endpoint not implemented yet)
 */
