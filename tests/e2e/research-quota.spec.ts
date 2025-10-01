/**
 * Contract Test: GET /api/research/quota
 * T010: User research quota endpoint
 *
 * This test MUST FAIL initially (endpoint doesn't exist yet)
 * Validates: FR-034, FR-035, FR-036, FR-037, FR-038, FR-041
 */

import { test, expect } from '@playwright/test';

test.describe('GET /api/research/quota', () => {

  test.beforeEach(async ({ page }) => {
    // Login as demo user
    await page.goto('/login');
    await page.fill('[name="email"]', 'demo@oppspot.com');
    await page.fill('[name="password"]', 'Demo123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should return 200 with quota information', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: GET /api/research/quota
    const response = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 200 OK
    expect(response.status()).toBe(200);

    // Assert: Response schema matches OpenAPI spec
    const data = await response.json();
    expect(data).toHaveProperty('user_id');
    expect(data).toHaveProperty('period_start');
    expect(data).toHaveProperty('period_end');
    expect(data).toHaveProperty('researches_used');
    expect(data).toHaveProperty('researches_limit');
    expect(data).toHaveProperty('tier');

    // Assert: Valid UUID format for user_id
    expect(data.user_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // Assert: Period dates are valid ISO timestamps
    expect(new Date(data.period_start).toString()).not.toBe('Invalid Date');
    expect(new Date(data.period_end).toString()).not.toBe('Invalid Date');

    // Assert: Usage is within limits
    expect(data.researches_used).toBeGreaterThanOrEqual(0);
    expect(data.researches_used).toBeLessThanOrEqual(data.researches_limit);

    // Assert: Default limit is 100 for standard tier
    if (data.tier === 'standard') {
      expect(data.researches_limit).toBe(100);
    }
  });

  test('should calculate remaining researches correctly', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    const response = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    const data = await response.json();

    // Assert: Remaining calculated
    expect(data).toHaveProperty('researches_remaining');
    expect(data.researches_remaining).toBe(data.researches_limit - data.researches_used);
  });

  test('should include percentage used', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    const response = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    const data = await response.json();

    // Assert: Percentage calculated
    expect(data).toHaveProperty('percentage_used');
    expect(data.percentage_used).toBeGreaterThanOrEqual(0);
    expect(data.percentage_used).toBeLessThanOrEqual(100);

    // Assert: Matches manual calculation
    const expectedPercentage = Math.round((data.researches_used / data.researches_limit) * 100);
    expect(data.percentage_used).toBe(expectedPercentage);
  });

  test('should show quota warning when >= 90% used', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Get current quota
    const response = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    const data = await response.json();

    // Assert: Warning flag present
    expect(data).toHaveProperty('warning');

    if (data.percentage_used >= 90) {
      // Assert: Warning is true when quota high
      expect(data.warning).toBe(true);

      // Assert: Warning message present
      expect(data).toHaveProperty('warning_message');
      expect(data.warning_message).toContain('quota');
    }
  });

  test('should increment quota after research initiated', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Get quota before
    const quotaBefore = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataBefore = await quotaBefore.json();
    const usedBefore = dataBefore.researches_used;

    // Initiate research
    const researchResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(researchResponse.status()).toBe(202);

    // Get quota after
    const quotaAfter = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataAfter = await quotaAfter.json();

    // Assert: Quota incremented by 1
    expect(dataAfter.researches_used).toBe(usedBefore + 1);
    expect(dataAfter.researches_remaining).toBe(dataBefore.researches_remaining - 1);
  });

  test('should not increment quota for cached reports', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // First request - generates report
    const research1 = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(research1.status()).toBe(202);
    const data1 = await research1.json();

    // Wait for completion
    let attempts = 0;
    let completed = false;
    while (!completed && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusCheck = await request.get(`/api/research/${data1.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      const statusData = await statusCheck.json();
      completed = statusData.status === 'complete';
      attempts++;
    }

    // Get quota after first research
    const quotaAfter1 = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataQuota1 = await quotaAfter1.json();
    const usedAfter1 = dataQuota1.researches_used;

    // Second request - should return cached
    const research2 = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(research2.status()).toBe(202);

    // Get quota after second (cached) research
    const quotaAfter2 = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataQuota2 = await quotaAfter2.json();

    // Assert: Quota NOT incremented for cached report
    expect(dataQuota2.researches_used).toBe(usedAfter1);
  });

  test('should reset quota at start of new monthly period', async ({ request, page }) => {
    // This test requires time travel or waiting for month boundary
    // For now, we'll skip it and note it needs implementation
    test.skip();

    // TODO: Implement period reset test
    // 1. Mock system time to end of month
    // 2. Generate research
    // 3. Mock time to start of next month
    // 4. Check quota reset to 0
    // 5. Verify period_start and period_end updated
  });

  test('should return 401 for unauthenticated requests', async ({ request }) => {
    // Test: No auth cookie
    const response = await request.get('/api/research/quota');

    // Assert: 401 Unauthorized or redirect
    expect([401, 302, 307]).toContain(response.status());
  });

  test('should create quota record on first request', async ({ request, page, context }) => {
    // This test requires a fresh user account
    // For now, we'll skip it and note it needs implementation
    test.skip();

    // TODO: Implement new user quota creation test
    // 1. Create new test user
    // 2. First quota check creates record with default values
    // 3. Verify researches_used = 0
    // 4. Verify researches_limit = 100
    // 5. Verify tier = 'standard'
  });

  test('should include quota in research POST response', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Initiate research
    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    const data = await response.json();

    // Assert: Quota info included in response
    expect(data).toHaveProperty('quota');
    expect(data.quota).toHaveProperty('researches_used');
    expect(data.quota).toHaveProperty('researches_limit');
    expect(data.quota).toHaveProperty('researches_remaining');
  });

  test('should prevent research when quota exhausted', async ({ request, page }) => {
    // This test requires setting quota to 100/100
    // For now, we'll skip it and note it needs implementation
    test.skip();

    // TODO: Implement quota exhaustion test
    // 1. Set user quota to 100/100 via test helper
    // 2. Attempt to generate research
    // 3. Should return 403 Forbidden
    // 4. Error message should mention quota exceeded
  });

  test('should allow force_refresh when quota available', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Get current quota
    const quotaBefore = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataBefore = await quotaBefore.json();

    // Ensure quota available
    if (dataBefore.researches_remaining === 0) {
      test.skip();
    }

    // First research
    await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Force refresh (should consume another quota)
    const response = await request.post('/api/research/mock-monzo?force_refresh=true', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    expect(response.status()).toBe(202);

    // Check quota incremented
    const quotaAfter = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataAfter = await quotaAfter.json();

    // Assert: Quota increased (force refresh counts)
    expect(dataAfter.researches_used).toBeGreaterThan(dataBefore.researches_used);
  });

  test('should track quota across multiple companies', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Get quota before
    const quotaBefore = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataBefore = await quotaBefore.json();

    // Generate research for multiple companies
    const companies = ['mock-monzo', 'mock-revolut', 'mock-starling'];
    let researchCount = 0;

    for (const company of companies) {
      if (dataBefore.researches_remaining <= researchCount) {
        break; // Don't exceed quota
      }

      const response = await request.post(`/api/research/${company}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });

      if (response.status() === 202) {
        researchCount++;
      }
    }

    // Get quota after
    const quotaAfter = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataAfter = await quotaAfter.json();

    // Assert: Quota tracks all researches
    expect(dataAfter.researches_used).toBe(dataBefore.researches_used + researchCount);
  });
});
