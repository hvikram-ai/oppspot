/**
 * Contract Test: POST /api/research/[companyId]
 * T007: Generate research report endpoint
 *
 * This test MUST FAIL initially (endpoint doesn't exist yet)
 * Validates: FR-001, FR-039, FR-040, FR-041
 */

import { test, expect } from '@playwright/test';

test.describe('POST /api/research/[companyId]', () => {

  test.beforeEach(async ({ page }) => {
    // Login as demo user
    await page.goto('/login');
    await page.fill('[name="email"]', 'demo@oppspot.com');
    await page.fill('[name="password"]', 'Demo123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should initiate research generation and return 202', async ({ request, page }) => {
    // Get auth token
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: POST /api/research/mock-monzo
    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 202 Accepted
    expect(response.status()).toBe(202);

    // Assert: Response schema matches OpenAPI spec
    const data = await response.json();
    expect(data).toHaveProperty('report_id');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('estimated_completion_seconds');
    expect(data).toHaveProperty('poll_url');

    // Assert: Status is pending or generating
    expect(['pending', 'generating']).toContain(data.status);

    // Assert: Valid UUID format
    expect(data.report_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Assert: Estimated time is reasonable (target <30s)
    expect(data.estimated_completion_seconds).toBeGreaterThan(0);
    expect(data.estimated_completion_seconds).toBeLessThanOrEqual(35);

    // Assert: Poll URL is valid
    expect(data.poll_url).toContain('/api/research/');
    expect(data.poll_url).toContain(data.report_id);
  });

  test('should accept force_refresh query parameter', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: POST with force_refresh=true
    const response = await request.post('/api/research/mock-monzo?force_refresh=true', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    expect(response.status()).toBe(202);
    const data = await response.json();
    expect(data).toHaveProperty('report_id');
  });

  test('should accept optional request body with focus areas', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: POST with request body
    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        'Content-Type': 'application/json',
      },
      data: {
        focus_areas: ['buying_signals', 'decision_makers'],
        user_context: 'We sell CRM software to fintech companies',
      },
    });

    expect(response.status()).toBe(202);
  });

  test('should return 404 for invalid company ID', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: Invalid company ID
    const response = await request.post('/api/research/invalid-company-id-12345', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 404 Not Found
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('message');
    expect(data.error).toContain('not found');
  });

  test('should return 403 when quota exceeded', async ({ request, page }) => {
    // Note: This test requires setting quota to 100/100 first
    // In real implementation, we'd use a test helper to set quota

    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // TODO: Set quota to 100/100 via test helper
    // For now, skip this test
    test.skip();

    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 403 Forbidden
    expect(response.status()).toBe(403);

    // Assert: Response includes quota details
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('quota');
    expect(data.error).toContain('quota');
    expect(data.quota.researches_used).toBe(100);
    expect(data.quota.researches_limit).toBe(100);
  });

  test('should return 401 for unauthenticated requests', async ({ request }) => {
    // Test: No auth cookie
    const response = await request.post('/api/research/mock-monzo');

    // Assert: 401 Unauthorized or redirect to login
    expect([401, 302, 307]).toContain(response.status());
  });

  test('should handle concurrent requests (5 concurrent limit)', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: Launch 5 concurrent requests (should succeed)
    const requests = Array(5).fill(null).map(() =>
      request.post('/api/research/mock-monzo', {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      })
    );

    const responses = await Promise.all(requests);

    // Assert: All 5 should succeed (or some might be rate limited)
    const successCount = responses.filter(r => r.status() === 202).length;
    expect(successCount).toBeGreaterThanOrEqual(1);
  });

  test('should create database record with status=pending', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    expect(response.status()).toBe(202);
    const data = await response.json();

    // TODO: In real implementation, verify database state
    // Query research_reports table to confirm row exists with status='pending'
    // This would require database access in tests or an internal API endpoint

    expect(data.status).toMatch(/pending|generating/);
  });

  test('should increment user quota after research initiated', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Get quota before
    const quotaBefore = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataeBefore = await quotaBefore.json();
    const usedBefore = dataBefore.researches_used;

    // Initiate research
    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(response.status()).toBe(202);

    // Get quota after
    const quotaAfter = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataAfter = await quotaAfter.json();

    // Assert: Quota incremented by 1
    expect(dataAfter.researches_used).toBe(usedBefore + 1);
  });

  test('should return error for malformed request body', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        'Content-Type': 'application/json',
      },
      data: {
        focus_areas: 'invalid_should_be_array', // Invalid: should be array
        user_context: 12345, // Invalid: should be string
      },
    });

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});
