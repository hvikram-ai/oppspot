/**
 * Contract Test: GET /api/research/[companyId]
 * T008: Fetch research report endpoint
 *
 * This test MUST FAIL initially (endpoint doesn't exist yet)
 * Validates: FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009
 */

import { test, expect } from '@playwright/test';

test.describe('GET /api/research/[companyId]', () => {

  test.beforeEach(async ({ page }) => {
    // Login as demo user
    await page.goto('/login');
    await page.fill('[name="email"]', 'demo@oppspot.com');
    await page.fill('[name="password"]', 'Demo123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should return 200 with complete report when status=complete', async ({ request, page }) => {
    // Get auth token
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // First, initiate research to ensure report exists
    const postResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(postResponse.status()).toBe(202);
    const postData = await postResponse.json();

    // Poll until complete (or timeout after 60s)
    let getResponse;
    let getData;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds

    do {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
      getResponse = await request.get(`/api/research/${postData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      getData = await getResponse.json();
      attempts++;
    } while (getData.status !== 'complete' && attempts < maxAttempts);

    // Assert: 200 OK
    expect(getResponse.status()).toBe(200);

    // Assert: Report is complete
    expect(getData.status).toBe('complete');

    // Assert: All 6 sections present
    expect(getData.sections).toHaveLength(6);
    expect(getData.sections_complete).toBe(6);

    // Assert: Each section type exists
    const sectionTypes = getData.sections.map((s: { section_type: string }) => s.section_type);
    expect(sectionTypes).toContain('snapshot');
    expect(sectionTypes).toContain('buying_signals');
    expect(sectionTypes).toContain('decision_makers');
    expect(sectionTypes).toContain('revenue_signals');
    expect(sectionTypes).toContain('recommended_approach');
    expect(sectionTypes).toContain('sources');

    // Assert: Confidence score is reasonable (>= 0.5)
    expect(getData.confidence_score).toBeGreaterThanOrEqual(0.5);
    expect(getData.confidence_score).toBeLessThanOrEqual(1.0);

    // Assert: At least 10 sources (NFR-005)
    expect(getData.total_sources).toBeGreaterThanOrEqual(10);

    // Assert: Company metadata present
    expect(getData).toHaveProperty('company_name');
    expect(getData).toHaveProperty('company_id');
    expect(getData).toHaveProperty('generated_at');
    expect(getData).toHaveProperty('cached_until');
  });

  test('should return 202 with progress when status=generating', async ({ request, page }) => {
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

    // Immediately fetch (should be generating)
    const getResponse = await request.get(`/api/research/${postData.report_id}`, {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 202 Accepted (still generating)
    expect([200, 202]).toContain(getResponse.status());

    const getData = await getResponse.json();

    // Assert: Status is pending or generating
    expect(['pending', 'generating', 'complete']).toContain(getData.status);

    // Assert: Progress tracking present
    expect(getData).toHaveProperty('sections_complete');
    expect(getData.sections_complete).toBeGreaterThanOrEqual(0);
    expect(getData.sections_complete).toBeLessThanOrEqual(6);

    // Assert: Poll URL present
    expect(getData).toHaveProperty('poll_url');
    expect(getData.poll_url).toContain('/api/research/');
  });

  test('should return cached report with cache metadata', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // First request - generates report
    const post1 = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(post1.status()).toBe(202);
    const data1 = await post1.json();

    // Wait for completion
    let completed = false;
    let attempts = 0;
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

    // Second request - should return cached
    const post2 = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Should return same report (cached)
    const data2 = await post2.json();

    // Assert: Cache hit indicated
    expect(data2).toHaveProperty('cached_until');
    expect(data2).toHaveProperty('generated_at');

    // Assert: cached_until is in the future
    const cachedUntil = new Date(data2.cached_until);
    expect(cachedUntil.getTime()).toBeGreaterThan(Date.now());

    // Assert: Metadata contains cache info
    if (data2.metadata) {
      expect(data2.metadata).toHaveProperty('cache_hit');
    }
  });

  test('should return 404 for non-existent report', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: Invalid report ID
    const response = await request.get('/api/research/00000000-0000-0000-0000-000000000000', {
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

  test('should return 404 for invalid report ID format', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Test: Malformed UUID
    const response = await request.get('/api/research/invalid-uuid-format', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Assert: 404 Not Found
    expect(response.status()).toBe(404);
  });

  test('should return 401 for unauthenticated requests', async ({ request }) => {
    // Test: No auth cookie
    const response = await request.get('/api/research/00000000-0000-0000-0000-000000000000');

    // Assert: 401 Unauthorized or redirect
    expect([401, 302, 307]).toContain(response.status());
  });

  test('should return 403 when accessing another user\'s report', async ({ request, page, context }) => {
    // This test requires two different users
    // For now, we'll skip it and note it needs implementation
    test.skip();

    // TODO: Implement multi-user test
    // 1. User A generates report
    // 2. User B tries to access User A's report
    // 3. Should return 403 Forbidden
  });

  test('should include all section schemas in complete report', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Generate and wait for completion
    const postResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const postData = await postResponse.json();

    // Wait for completion
    let getResponse;
    let getData;
    let attempts = 0;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      getResponse = await request.get(`/api/research/${postData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      getData = await getResponse.json();
      attempts++;
    } while (getData.status !== 'complete' && attempts < 60);

    // Assert: Snapshot section has required fields
    const snapshot = getData.sections.find((s: { section_type: string }) => s.section_type === 'snapshot');
    expect(snapshot).toBeDefined();
    expect(snapshot.content).toHaveProperty('company_name');
    expect(snapshot.content).toHaveProperty('industry');

    // Assert: Buying signals section has required fields
    const signals = getData.sections.find((s: { section_type: string }) => s.section_type === 'buying_signals');
    expect(signals).toBeDefined();
    expect(signals.content).toHaveProperty('hiring_signals');
    expect(signals.content).toHaveProperty('expansion_signals');
    expect(signals.content).toHaveProperty('leadership_changes');

    // Assert: Decision makers section has required fields
    const decisionMakers = getData.sections.find((s: { section_type: string }) => s.section_type === 'decision_makers');
    expect(decisionMakers).toBeDefined();
    expect(decisionMakers.content).toHaveProperty('key_people');
    expect(Array.isArray(decisionMakers.content.key_people)).toBe(true);

    // Assert: Revenue signals section has required fields
    const revenue = getData.sections.find((s: { section_type: string }) => s.section_type === 'revenue_signals');
    expect(revenue).toBeDefined();
    expect(revenue.content).toHaveProperty('financial_health');

    // Assert: Recommended approach section has required fields
    const approach = getData.sections.find((s: { section_type: string }) => s.section_type === 'recommended_approach');
    expect(approach).toBeDefined();
    expect(approach.content).toHaveProperty('strategy');
    expect(approach.content).toHaveProperty('talking_points');

    // Assert: Sources section has required fields
    const sources = getData.sections.find((s: { section_type: string }) => s.section_type === 'sources');
    expect(sources).toBeDefined();
    expect(sources.content).toHaveProperty('sources');
    expect(Array.isArray(sources.content.sources)).toBe(true);
    expect(sources.content.sources.length).toBeGreaterThanOrEqual(10);
  });

  test('should respect cache TTL for snapshot (7 days) vs signals (6 hours)', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Generate report
    const postResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const postData = await postResponse.json();

    // Wait for completion
    let getResponse;
    let getData;
    let attempts = 0;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      getResponse = await request.get(`/api/research/${postData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      getData = await getResponse.json();
      attempts++;
    } while (getData.status !== 'complete' && attempts < 60);

    // Assert: Each section has expires_at timestamp
    for (const section of getData.sections) {
      expect(section).toHaveProperty('expires_at');
      expect(section).toHaveProperty('cached_at');

      const cachedAt = new Date(section.cached_at);
      const expiresAt = new Date(section.expires_at);
      const ttlHours = (expiresAt.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);

      if (section.section_type === 'snapshot') {
        // Should be ~7 days (168 hours)
        expect(ttlHours).toBeGreaterThanOrEqual(160);
        expect(ttlHours).toBeLessThanOrEqual(176);
      } else {
        // Should be ~6 hours
        expect(ttlHours).toBeGreaterThanOrEqual(5.5);
        expect(ttlHours).toBeLessThanOrEqual(6.5);
      }
    }
  });

  test('should include generation time metadata', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Generate report
    const postResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const postData = await postResponse.json();

    // Wait for completion
    let getResponse;
    let getData;
    let attempts = 0;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      getResponse = await request.get(`/api/research/${postData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      getData = await getResponse.json();
      attempts++;
    } while (getData.status !== 'complete' && attempts < 60);

    // Assert: Metadata includes generation time
    expect(getData.metadata).toHaveProperty('generation_time_ms');
    expect(getData.metadata.generation_time_ms).toBeGreaterThan(0);

    // Assert: Generation time is reasonable (<35 seconds = 35000ms)
    expect(getData.metadata.generation_time_ms).toBeLessThanOrEqual(35000);

    // Assert: Each section has generation time
    for (const section of getData.sections) {
      expect(section).toHaveProperty('generation_time_ms');
      expect(section.generation_time_ms).toBeGreaterThan(0);
    }
  });
});
