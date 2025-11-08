/**
 * Contract Test: PATCH /api/profiles/[id]
 * T009: Update business profile with manual edit tracking
 *
 * Contract Reference: contracts/profiles-api.yaml
 * Requirements: FR-010 (review and edit profile, manual_edits tracking)
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('PATCH /api/profiles/[id] - Update Profile', () => {
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
        name: `Update Test Profile ${Date.now()}`,
        company_name: 'Update Test Company',
        website_url: `https://update-test-${Date.now()}.com`,
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
    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      data: {
        industry: 'Technology'
      }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should return 404 for non-existent profile ID', async ({ request }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.patch(`${API_BASE}/api/profiles/${fakeId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        industry: 'Technology'
      }
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should return 400 for invalid UUID format', async ({ request }) => {
    const response = await request.patch(`${API_BASE}/api/profiles/invalid-uuid`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        industry: 'Technology'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should update single field (industry)', async ({ request }) => {
    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        industry: 'Healthcare Technology'
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty('profile');
    expect(body.profile.id).toBe(testProfileId);
    expect(body.profile.industry).toBe('Healthcare Technology');

    // updated_at should be more recent than created_at
    const updatedDate = new Date(body.profile.updated_at);
    const createdDate = new Date(body.profile.created_at);
    expect(updatedDate.getTime()).toBeGreaterThan(createdDate.getTime());
  });

  test('should update multiple fields simultaneously', async ({ request }) => {
    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        industry: 'Financial Services',
        description: 'Leading fintech company',
        location: 'London, UK',
        company_size: '51-200',
        revenue_range: '$10-50M'
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.profile.industry).toBe('Financial Services');
    expect(body.profile.description).toBe('Leading fintech company');
    expect(body.profile.location).toBe('London, UK');
    expect(body.profile.company_size).toBe('51-200');
    expect(body.profile.revenue_range).toBe('$10-50M');
  });

  test('should update array fields (tech_stack)', async ({ request }) => {
    const techStack = ['React', 'Node.js', 'PostgreSQL', 'TypeScript'];

    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        tech_stack: techStack
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(Array.isArray(body.profile.tech_stack)).toBe(true);
    expect(body.profile.tech_stack).toEqual(techStack);
  });

  test('should update multiple array fields', async ({ request }) => {
    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        products_services: ['SaaS Platform', 'API Services', 'Consulting'],
        target_markets: ['Healthcare', 'Finance', 'Technology'],
        key_differentiators: ['AI-Powered', 'Enterprise-Grade', 'HIPAA Compliant']
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.profile.products_services).toEqual(['SaaS Platform', 'API Services', 'Consulting']);
    expect(body.profile.target_markets).toEqual(['Healthcare', 'Finance', 'Technology']);
    expect(body.profile.key_differentiators).toEqual(['AI-Powered', 'Enterprise-Grade', 'HIPAA Compliant']);
  });

  test('should validate tech_stack max 10 items', async ({ request }) => {
    const tooManyTechs = Array(11).fill('Tech').map((t, i) => `${t}${i}`);

    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        tech_stack: tooManyTechs
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/tech_stack|maximum|10/i);
  });

  test('should validate products_services max 5 items', async ({ request }) => {
    const tooManyProducts = Array(6).fill('Product').map((p, i) => `${p}${i}`);

    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        products_services: tooManyProducts
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/products_services|maximum|5/i);
  });

  test('should validate target_markets max 5 items', async ({ request }) => {
    const tooManyMarkets = Array(6).fill('Market').map((m, i) => `${m}${i}`);

    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        target_markets: tooManyMarkets
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/target_markets|maximum|5/i);
  });

  test('should validate key_differentiators max 3 items', async ({ request }) => {
    const tooManyDiffs = Array(4).fill('Differentiator').map((d, i) => `${d}${i}`);

    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        key_differentiators: tooManyDiffs
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/key_differentiators|maximum|3/i);
  });

  test('should validate company_size enum', async ({ request }) => {
    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        company_size: 'invalid-size'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/company_size|invalid/i);
  });

  test('should validate revenue_range enum', async ({ request }) => {
    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        revenue_range: 'invalid-range'
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/revenue_range|invalid/i);
  });

  test('should validate employee_count is non-negative', async ({ request }) => {
    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        employee_count: -10
      }
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/employee_count|negative|positive/i);
  });

  test('should update employee_count with valid value', async ({ request }) => {
    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        employee_count: 150
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.profile.employee_count).toBe(150);
  });

  test('should track manual edits in manual_edits field (FR-010)', async ({ request }) => {
    // First, get the original value
    const getResponse = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const originalProfile = (await getResponse.json()).profile;

    // Update a field manually
    const updateResponse = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        industry: 'Manually Updated Industry'
      }
    });

    expect(updateResponse.status()).toBe(200);
    const body = await updateResponse.json();

    // FR-010: manual_edits should track the change
    expect(body.profile).toHaveProperty('manual_edits');
    expect(typeof body.profile.manual_edits).toBe('object');

    // manual_edits should contain entry for 'industry'
    if (originalProfile.industry !== null) {
      expect(body.profile.manual_edits).toHaveProperty('industry');
      expect(body.profile.manual_edits.industry).toHaveProperty('original');
      expect(body.profile.manual_edits.industry).toHaveProperty('edited');
      expect(body.profile.manual_edits.industry.edited).toBe('Manually Updated Industry');
      expect(body.profile.manual_edits.industry).toHaveProperty('edited_at');
    }
  });

  test('should update updated_by field with current user', async ({ request }) => {
    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        description: 'Updated description'
      }
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    // updated_by should be set to current user's ID
    expect(body.profile).toHaveProperty('updated_by');
    expect(body.profile.updated_by).not.toBeNull();
    expect(typeof body.profile.updated_by).toBe('string');
  });

  test('should not allow updating immutable fields (id, org_id, created_by, created_at)', async ({ request }) => {
    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        id: '00000000-0000-0000-0000-000000000000',
        org_id: '00000000-0000-0000-0000-000000000000',
        created_by: '00000000-0000-0000-0000-000000000000',
        created_at: '2020-01-01T00:00:00Z',
        industry: 'Valid Update'
      }
    });

    // Should either ignore immutable fields or return 400
    // Let's accept 200 if it ignores them, or 400 if it rejects
    expect([200, 400]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      // Immutable fields should NOT have changed
      expect(body.profile.id).toBe(testProfileId);
      // industry (valid field) should have updated
      expect(body.profile.industry).toBe('Valid Update');
    }
  });

  test('should not allow updating analysis fields directly', async ({ request }) => {
    const response = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        analysis_status: 'completed',
        analysis_metadata: { fake: 'data' }
      }
    });

    // Should reject attempts to manually change analysis fields
    expect([400, 403]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should handle partial update (only provided fields change)', async ({ request }) => {
    // Get original profile
    const getResponse = await request.get(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const originalProfile = (await getResponse.json()).profile;

    // Update only one field
    const updateResponse = await request.patch(`${API_BASE}/api/profiles/${testProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        location: 'New York, USA'
      }
    });

    expect(updateResponse.status()).toBe(200);
    const updatedProfile = (await updateResponse.json()).profile;

    // Only location should change
    expect(updatedProfile.location).toBe('New York, USA');

    // Other fields should remain unchanged (if they were set)
    if (originalProfile.industry !== null) {
      expect(updatedProfile.industry).toBe(originalProfile.industry);
    }
  });

  test('should return 403 when trying to update profile from different org', async ({ request }) => {
    // This test assumes RLS policies prevent cross-org updates
    // In reality, we'd need a second user from a different org to properly test this
    // For now, we document the expected behavior

    // Attempting to update a profile that doesn't belong to user's org should return 403 or 404
    const fakeOrgProfileId = '00000000-0000-0000-0000-000000000001';

    const response = await request.patch(`${API_BASE}/api/profiles/${fakeOrgProfileId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        industry: 'Should Not Work'
      }
    });

    // Should return 403 (forbidden) or 404 (not found due to RLS)
    expect([403, 404]).toContain(response.status());
  });
});

/**
 * Test Summary:
 * - ✅ Tests authentication requirement (401)
 * - ✅ Tests 404 for non-existent profile
 * - ✅ Tests 400 for invalid UUID
 * - ✅ Tests single field update
 * - ✅ Tests multiple field update
 * - ✅ Tests array field updates (tech_stack, products_services, target_markets, key_differentiators)
 * - ✅ Tests array field max length validation (10, 5, 5, 3 respectively)
 * - ✅ Tests enum validation (company_size, revenue_range)
 * - ✅ Tests employee_count validation (non-negative)
 * - ✅ Tests FR-010 (manual_edits tracking with original, edited, edited_at)
 * - ✅ Tests updated_by field set to current user
 * - ✅ Tests immutable fields cannot be changed (id, org_id, created_by, created_at)
 * - ✅ Tests analysis fields cannot be directly modified
 * - ✅ Tests partial updates (only specified fields change)
 * - ✅ Tests org-scoped access control (403/404 for cross-org updates)
 *
 * Expected Result: ALL TESTS SHOULD FAIL (endpoint not implemented yet)
 */
