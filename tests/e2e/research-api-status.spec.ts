/**
 * Contract Test: GET /api/research/[companyId]/status
 * T009: Check research generation status endpoint
 *
 * This test MUST FAIL initially (endpoint doesn't exist yet)
 * Validates: FR-016, FR-017, FR-018
 */

import { test, expect } from '@playwright/test';

test.describe('GET /api/research/[companyId]/status', () => {

  test.beforeEach(async ({ page }) => {
    // Login as demo user
    await page.goto('/login');
    await page.fill('[name="email"]', 'demo@oppspot.com');
    await page.fill('[name="password"]', 'Demo123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should return 200 with status=pending when just initiated', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Initiate research
    const postResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(postResponse.status()).toBe(202);
    const postData = await postResponse.json();

    // Immediately check status
    const statusResponse = await request.get('/api/research/mock-monzo/status', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 200 OK
    expect(statusResponse.status()).toBe(200);

    // Assert: Response schema
    const data = await statusResponse.json();
    expect(data).toHaveProperty('report_id');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('sections_complete');
    expect(data).toHaveProperty('total_sections');
    expect(data).toHaveProperty('estimated_completion_seconds');

    // Assert: Status is pending or generating
    expect(['pending', 'generating']).toContain(data.status);

    // Assert: Progress tracking
    expect(data.total_sections).toBe(6);
    expect(data.sections_complete).toBeGreaterThanOrEqual(0);
    expect(data.sections_complete).toBeLessThanOrEqual(6);
  });

  test('should return 200 with status=generating and progress updates', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Initiate research
    const postResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(postResponse.status()).toBe(202);

    // Poll status endpoint
    let lastSectionsComplete = 0;
    let attempts = 0;
    let statusData;

    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await request.get('/api/research/mock-monzo/status', {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });

      statusData = await statusResponse.json();

      // Assert: Progress is monotonically increasing
      expect(statusData.sections_complete).toBeGreaterThanOrEqual(lastSectionsComplete);
      lastSectionsComplete = statusData.sections_complete;

      if (statusData.status === 'complete') {
        break;
      }

      attempts++;
    }

    // Assert: Eventually completes
    expect(statusData.status).toBe('complete');
    expect(statusData.sections_complete).toBe(6);
  });

  test('should return 200 with status=complete when finished', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Initiate and wait for completion
    const postResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(postResponse.status()).toBe(202);

    // Poll until complete
    let statusData;
    let attempts = 0;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await request.get('/api/research/mock-monzo/status', {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      statusData = await statusResponse.json();
      attempts++;
    } while (statusData.status !== 'complete' && attempts < 60);

    // Assert: Status is complete
    expect(statusData.status).toBe('complete');
    expect(statusData.sections_complete).toBe(6);

    // Assert: Completion metadata present
    expect(statusData).toHaveProperty('generated_at');
    expect(statusData).toHaveProperty('cached_until');
    expect(statusData).toHaveProperty('confidence_score');
    expect(statusData).toHaveProperty('total_sources');

    // Assert: Confidence score is reasonable
    expect(statusData.confidence_score).toBeGreaterThanOrEqual(0.5);
    expect(statusData.confidence_score).toBeLessThanOrEqual(1.0);

    // Assert: Sources count meets minimum
    expect(statusData.total_sources).toBeGreaterThanOrEqual(10);

    // Assert: No estimated_completion_seconds when complete
    expect(statusData.estimated_completion_seconds).toBeUndefined();
  });

  test('should return 200 with status=partial on partial failure', async ({ request, page }) => {
    // This test requires a way to simulate partial failures
    // For now, we'll skip it and note it needs implementation
    test.skip();

    // TODO: Implement partial failure test
    // 1. Mock data source to fail for some sections
    // 2. Check status returns 'partial'
    // 3. Verify sections_complete < 6
    // 4. Check error_sections array exists
  });

  test('should return 200 with status=failed on complete failure', async ({ request, page }) => {
    // This test requires a way to simulate complete failures
    // For now, we'll skip it and note it needs implementation
    test.skip();

    // TODO: Implement complete failure test
    // 1. Mock all data sources to fail
    // 2. Check status returns 'failed'
    // 3. Verify sections_complete = 0
    // 4. Check error_message exists
  });

  test('should return 404 for non-existent company', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: Invalid company ID
    const response = await request.get('/api/research/invalid-company-id/status', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 404 Not Found
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('not found');
  });

  test('should return 401 for unauthenticated requests', async ({ request }) => {
    // Test: No auth cookie
    const response = await request.get('/api/research/mock-monzo/status');

    // Assert: 401 Unauthorized or redirect
    expect([401, 302, 307]).toContain(response.status());
  });

  test('should include per-section status breakdown', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Initiate research
    const postResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(postResponse.status()).toBe(202);

    // Wait a bit for generation to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check status
    const statusResponse = await request.get('/api/research/mock-monzo/status', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    const data = await statusResponse.json();

    // Assert: Section breakdown exists
    expect(data).toHaveProperty('sections');
    expect(Array.isArray(data.sections)).toBe(true);

    // Assert: Each section has status
    for (const section of data.sections) {
      expect(section).toHaveProperty('section_type');
      expect(section).toHaveProperty('status');
      expect(['pending', 'generating', 'complete', 'failed']).toContain(section.status);
    }
  });

  test('should provide accurate estimated_completion_seconds', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Initiate research
    const postResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(postResponse.status()).toBe(202);
    const startTime = Date.now();

    // Immediately check status
    const statusResponse = await request.get('/api/research/mock-monzo/status', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    const data = await statusResponse.json();

    // Assert: Estimated time provided
    expect(data).toHaveProperty('estimated_completion_seconds');
    expect(data.estimated_completion_seconds).toBeGreaterThan(0);
    expect(data.estimated_completion_seconds).toBeLessThanOrEqual(35);

    // Poll until complete and measure actual time
    let statusData;
    let attempts = 0;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await request.get('/api/research/mock-monzo/status', {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      statusData = await response.json();
      attempts++;
    } while (statusData.status !== 'complete' && attempts < 60);

    const actualTimeSeconds = (Date.now() - startTime) / 1000;

    // Assert: Actual time is within reasonable bounds of estimate
    // Allow 50% variance (estimate can be rough)
    expect(actualTimeSeconds).toBeLessThanOrEqual(data.estimated_completion_seconds * 1.5);
  });

  test('should support polling with Last-Modified header', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Initiate research
    await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // First status check
    const response1 = await request.get('/api/research/mock-monzo/status', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: Last-Modified header present
    expect(response1.headers()['last-modified']).toBeDefined();

    // Second status check with If-Modified-Since
    const lastModified = response1.headers()['last-modified'];
    const response2 = await request.get('/api/research/mock-monzo/status', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        'If-Modified-Since': lastModified,
      },
    });

    // Assert: Returns 200 (always return data) or 304 (not modified)
    expect([200, 304]).toContain(response2.status());
  });

  test('should handle concurrent status checks efficiently', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Initiate research
    await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Make 10 concurrent status requests
    const requests = Array(10).fill(null).map(() =>
      request.get('/api/research/mock-monzo/status', {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      })
    );

    const responses = await Promise.all(requests);

    // Assert: All requests succeed
    for (const response of responses) {
      expect(response.status()).toBe(200);
    }

    // Assert: All responses have same status
    const statuses = await Promise.all(responses.map(r => r.json()));
    const firstStatus = statuses[0].sections_complete;

    // All should be same or within 1 section (race condition)
    for (const status of statuses) {
      expect(Math.abs(status.sections_complete - firstStatus)).toBeLessThanOrEqual(1);
    }
  });
});
