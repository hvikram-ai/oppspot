/**
 * Contract Test: GET /api/profiles
 * T007: List business profiles for user's organization
 *
 * Contract Reference: contracts/profiles-api.yaml
 * Requirements: FR-011 (org-scoped), FR-012 (display profiles)
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('GET /api/profiles - List Profiles', () => {
  let authToken: string;
  const testProfileIds: string[] = [];

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

    // Create test profiles for listing
    const profilesData = [
      {
        name: `List Test Profile A ${Date.now()}`,
        company_name: 'Company A',
        website_url: `https://company-a-${Date.now()}.com`,
        analyze_now: false
      },
      {
        name: `List Test Profile B ${Date.now()}`,
        company_name: 'Company B',
        website_url: `https://company-b-${Date.now()}.com`,
        analyze_now: false
      },
      {
        name: `List Test Profile C ${Date.now()}`,
        company_name: 'Company C',
        website_url: `https://company-c-${Date.now()}.com`,
        analyze_now: false
      }
    ];

    for (const profileData of profilesData) {
      const response = await request.post(`${API_BASE}/api/profiles`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: profileData
      });

      if (response.ok()) {
        const body = await response.json();
        testProfileIds.push(body.profile.id);
      }
    }
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: Delete test profiles
    for (const profileId of testProfileIds) {
      await request.delete(`${API_BASE}/api/profiles/${profileId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
    }
  });

  test('should return 401 when not authenticated', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles`);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should list profiles for user org with default parameters', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Validate response structure (contract: profiles-api.yaml)
    expect(body).toHaveProperty('profiles');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.profiles)).toBe(true);
    expect(typeof body.total).toBe('number');

    // Should include at least our 3 test profiles
    expect(body.profiles.length).toBeGreaterThanOrEqual(3);
    expect(body.total).toBeGreaterThanOrEqual(3);

    // Validate each profile has required fields (FR-012)
    const firstProfile = body.profiles[0];
    expect(firstProfile).toHaveProperty('id');
    expect(firstProfile).toHaveProperty('org_id');
    expect(firstProfile).toHaveProperty('name');
    expect(firstProfile).toHaveProperty('company_name');
    expect(firstProfile).toHaveProperty('website_url');
    expect(firstProfile).toHaveProperty('created_at');
    expect(firstProfile).toHaveProperty('analysis_status');
  });

  test('should sort by created_at desc by default', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.profiles.length).toBeGreaterThan(0);

    // Verify descending order (newest first)
    for (let i = 0; i < body.profiles.length - 1; i++) {
      const current = new Date(body.profiles[i].created_at);
      const next = new Date(body.profiles[i + 1].created_at);
      expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
    }
  });

  test('should support sort=name with order=asc', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles?sort=name&order=asc`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.profiles.length).toBeGreaterThan(0);

    // Verify ascending alphabetical order
    for (let i = 0; i < body.profiles.length - 1; i++) {
      const current = body.profiles[i].name.toLowerCase();
      const next = body.profiles[i + 1].name.toLowerCase();
      expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
    }
  });

  test('should support sort=updated_at with order=desc', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles?sort=updated_at&order=desc`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.profiles.length).toBeGreaterThan(0);

    // Verify descending order by updated_at
    for (let i = 0; i < body.profiles.length - 1; i++) {
      const current = new Date(body.profiles[i].updated_at);
      const next = new Date(body.profiles[i + 1].updated_at);
      expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
    }
  });

  test('should filter by analysis_status=completed', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles?status=completed`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // All returned profiles should have status=completed
    body.profiles.forEach((profile: any) => {
      expect(profile.analysis_status).toBe('completed');
    });
  });

  test('should filter by analysis_status=pending', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles?status=pending`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Should include our test profiles (created with analyze_now=false)
    expect(body.profiles.length).toBeGreaterThan(0);

    // All returned profiles should have status=pending
    body.profiles.forEach((profile: any) => {
      expect(profile.analysis_status).toBe('pending');
    });
  });

  test('should filter by analysis_status=analyzing', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles?status=analyzing`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // May be empty if no profiles currently analyzing
    expect(Array.isArray(body.profiles)).toBe(true);

    // All returned profiles should have status=analyzing
    body.profiles.forEach((profile: any) => {
      expect(profile.analysis_status).toBe('analyzing');
    });
  });

  test('should filter by analysis_status=failed', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles?status=failed`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // May be empty if no failed profiles
    expect(Array.isArray(body.profiles)).toBe(true);

    // All returned profiles should have status=failed
    body.profiles.forEach((profile: any) => {
      expect(profile.analysis_status).toBe('failed');
    });
  });

  test('should return 400 for invalid sort parameter', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles?sort=invalid_field`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/sort|invalid/i);
  });

  test('should return 400 for invalid order parameter', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles?order=invalid`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/order|invalid/i);
  });

  test('should return 400 for invalid status parameter', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles?status=invalid_status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/status|invalid/i);
  });

  test('should only return profiles from user org (FR-011 org-scoped)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // All profiles should belong to the same org_id
    if (body.profiles.length > 0) {
      const firstOrgId = body.profiles[0].org_id;
      body.profiles.forEach((profile: any) => {
        expect(profile.org_id).toBe(firstOrgId);
      });
    }
  });

  test('should include profile name, company name, and creation date (FR-012)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/profiles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.profiles.length).toBeGreaterThan(0);

    // FR-012: Must display profile name, company name, and creation date
    body.profiles.forEach((profile: any) => {
      expect(profile).toHaveProperty('name');
      expect(typeof profile.name).toBe('string');
      expect(profile.name.length).toBeGreaterThan(0);

      expect(profile).toHaveProperty('company_name');
      expect(typeof profile.company_name).toBe('string');
      expect(profile.company_name.length).toBeGreaterThan(0);

      expect(profile).toHaveProperty('created_at');
      expect(typeof profile.created_at).toBe('string');
      // Validate ISO 8601 format
      expect(new Date(profile.created_at).toISOString()).toBeTruthy();
    });
  });

  test('should handle empty result set gracefully', async ({ request }) => {
    // Use a status filter that likely returns no results
    const response = await request.get(`${API_BASE}/api/profiles?status=analyzing`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty('profiles');
    expect(body).toHaveProperty('total');
    expect(Array.isArray(body.profiles)).toBe(true);
    expect(body.total).toBe(0);
  });

  test('should support combining sort and filter parameters', async ({ request }) => {
    const response = await request.get(
      `${API_BASE}/api/profiles?status=pending&sort=name&order=asc`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();

    // All profiles should have status=pending
    body.profiles.forEach((profile: any) => {
      expect(profile.analysis_status).toBe('pending');
    });

    // And should be sorted by name ascending
    if (body.profiles.length > 1) {
      for (let i = 0; i < body.profiles.length - 1; i++) {
        const current = body.profiles[i].name.toLowerCase();
        const next = body.profiles[i + 1].name.toLowerCase();
        expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
      }
    }
  });
});

/**
 * Test Summary:
 * - ✅ Tests authentication requirement (401)
 * - ✅ Tests default listing (all profiles in org)
 * - ✅ Tests default sorting (created_at desc)
 * - ✅ Tests sort by name (asc)
 * - ✅ Tests sort by updated_at (desc)
 * - ✅ Tests filter by status (pending, analyzing, completed, failed)
 * - ✅ Tests invalid sort parameter validation
 * - ✅ Tests invalid order parameter validation
 * - ✅ Tests invalid status parameter validation
 * - ✅ Tests FR-011 (org-scoped - only returns profiles from user's org)
 * - ✅ Tests FR-012 (displays name, company_name, created_at)
 * - ✅ Tests empty result handling
 * - ✅ Tests combining sort and filter parameters
 *
 * Expected Result: ALL TESTS SHOULD FAIL (endpoint not implemented yet)
 */
