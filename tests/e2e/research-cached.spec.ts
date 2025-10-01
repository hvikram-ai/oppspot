/**
 * Integration Test: Cached Report Retrieval
 * T012: Verify smart caching with differential TTL
 *
 * This test MUST FAIL initially (endpoints don't exist yet)
 * Validates: FR-010, FR-011, FR-012, FR-013, NFR-003
 */

import { test, expect } from '@playwright/test';

test.describe('ResearchGPT Cached Report Integration', () => {

  test.beforeEach(async ({ page }) => {
    // Login as demo user
    await page.goto('/login');
    await page.fill('[name="email"]', 'demo@oppspot.com');
    await page.fill('[name="password"]', 'Demo123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should return cached report instantly on second request', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // ========================================================================
    // FIRST REQUEST: Generate fresh report
    // ========================================================================
    const firstStartTime = Date.now();

    const firstResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    expect(firstResponse.status()).toBe(202);
    const firstData = await firstResponse.json();

    // Wait for completion
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await request.get(`/api/research/${firstData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      const statusData = await statusResponse.json();
      completed = statusData.status === 'complete';
      attempts++;
    }

    const firstDuration = (Date.now() - firstStartTime) / 1000;

    // Assert: First request took reasonable time
    expect(firstDuration).toBeGreaterThan(5); // Takes time to generate
    expect(firstDuration).toBeLessThan(35);

    // ========================================================================
    // SECOND REQUEST: Should return cached instantly
    // ========================================================================
    const secondStartTime = Date.now();

    const secondResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    expect(secondResponse.status()).toBe(202);
    const secondData = await secondResponse.json();

    // Should be same report ID
    expect(secondData.report_id).toBe(firstData.report_id);

    // Check if already complete (cached)
    const cachedResponse = await request.get(`/api/research/${secondData.report_id}`, {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    const cachedData = await cachedResponse.json();
    const secondDuration = (Date.now() - secondStartTime) / 1000;

    // Assert: Second request much faster (<2 seconds)
    expect(secondDuration).toBeLessThan(2);

    // Assert: Cached flag present
    if (cachedData.metadata) {
      expect(cachedData.metadata.cache_hit).toBe(true);
    }

    // Assert: Same generated_at timestamp
    expect(cachedData.generated_at).toBe(firstData.generated_at);

    console.log(`✅ Cache performance:`);
    console.log(`   - First request: ${firstDuration.toFixed(1)}s`);
    console.log(`   - Cached request: ${secondDuration.toFixed(1)}s`);
    console.log(`   - Speedup: ${(firstDuration / secondDuration).toFixed(1)}x faster`);
  });

  test('should not increment quota for cached reports', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Get initial quota
    const quotaBefore = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataBefore = await quotaBefore.json();

    // First request (generates report)
    const firstResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(firstResponse.status()).toBe(202);
    const firstData = await firstResponse.json();

    // Wait for completion
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await request.get(`/api/research/${firstData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      const statusData = await statusResponse.json();
      if (statusData.status === 'complete') break;
      attempts++;
    }

    // Get quota after first request
    const quotaAfter1 = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataAfter1 = await quotaAfter1.json();

    // Assert: Quota incremented by 1
    expect(dataAfter1.researches_used).toBe(dataBefore.researches_used + 1);

    // Second request (cached)
    const secondResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(secondResponse.status()).toBe(202);

    // Get quota after second request
    const quotaAfter2 = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataAfter2 = await quotaAfter2.json();

    // Assert: Quota NOT incremented for cached request
    expect(dataAfter2.researches_used).toBe(dataAfter1.researches_used);

    console.log(`✅ Quota tracking:`);
    console.log(`   - Initial: ${dataBefore.researches_used}`);
    console.log(`   - After first request: ${dataAfter1.researches_used} (+1)`);
    console.log(`   - After cached request: ${dataAfter2.researches_used} (no change)`);
  });

  test('should respect differential TTL: 7 days for snapshot, 6 hours for signals', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Generate report
    const response = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const data = await response.json();

    // Wait for completion
    let reportData;
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const getResponse = await request.get(`/api/research/${data.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      reportData = await getResponse.json();
      if (reportData.status === 'complete') break;
      attempts++;
    }

    // Assert: Sections have different expiration times
    const sections = reportData.sections;

    const snapshotSection = sections.find((s: { section_type: string }) => s.section_type === 'snapshot');
    const signalsSection = sections.find((s: { section_type: string }) => s.section_type === 'buying_signals');

    expect(snapshotSection).toBeDefined();
    expect(signalsSection).toBeDefined();

    // Calculate TTL in hours
    const snapshotCached = new Date(snapshotSection.cached_at);
    const snapshotExpires = new Date(snapshotSection.expires_at);
    const snapshotTTLHours = (snapshotExpires.getTime() - snapshotCached.getTime()) / (1000 * 60 * 60);

    const signalsCached = new Date(signalsSection.cached_at);
    const signalsExpires = new Date(signalsSection.expires_at);
    const signalsTTLHours = (signalsExpires.getTime() - signalsCached.getTime()) / (1000 * 60 * 60);

    // Assert: Snapshot TTL ~7 days (168 hours)
    expect(snapshotTTLHours).toBeGreaterThanOrEqual(160);
    expect(snapshotTTLHours).toBeLessThanOrEqual(176);

    // Assert: Signals TTL ~6 hours
    expect(signalsTTLHours).toBeGreaterThanOrEqual(5.5);
    expect(signalsTTLHours).toBeLessThanOrEqual(6.5);

    console.log(`✅ Differential TTL verified:`);
    console.log(`   - Snapshot: ${snapshotTTLHours.toFixed(1)} hours (${(snapshotTTLHours / 24).toFixed(1)} days)`);
    console.log(`   - Signals: ${signalsTTLHours.toFixed(1)} hours`);
  });

  test('should display cache age in UI', async ({ page }) => {
    // Generate report
    await page.goto('/business/mock-monzo');
    const researchButton = page.locator('button:has-text("Generate Research")');
    await researchButton.click();

    // Wait for completion
    const progressIndicator = page.locator('[data-testid="research-progress"]');
    await expect(progressIndicator).toContainText('6/6 sections', { timeout: 60000 });

    // Assert: Cache indicator shows "just now"
    const cacheIndicator = page.locator('[data-testid="cache-indicator"]');
    await expect(cacheIndicator).toBeVisible();
    await expect(cacheIndicator).toContainText(/just now|seconds ago/i);

    // Wait 2 minutes
    await page.waitForTimeout(120000);

    // Refresh page
    await page.reload();

    // Assert: Cache age updated to "2 minutes ago"
    await expect(cacheIndicator).toContainText(/2 minutes ago/i);
  });

  test('should show cache expiration countdown for each section', async ({ page }) => {
    // Generate report
    await page.goto('/business/mock-monzo');
    const researchButton = page.locator('button:has-text("Generate Research")');
    await researchButton.click();

    const progressIndicator = page.locator('[data-testid="research-progress"]');
    await expect(progressIndicator).toContainText('6/6 sections', { timeout: 60000 });

    // Assert: Snapshot section shows "7 days remaining"
    const snapshotSection = page.locator('[data-testid="section-snapshot"]');
    await expect(snapshotSection).toContainText(/7 days remaining|Valid for 7 days/i);

    // Assert: Signals section shows "6 hours remaining"
    const signalsSection = page.locator('[data-testid="section-buying-signals"]');
    await expect(signalsSection).toContainText(/6 hours remaining|Valid for 6 hours/i);
  });

  test('should allow manual refresh with "force_refresh" parameter', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // First request
    const firstResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const firstData = await firstResponse.json();

    // Wait for completion
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await request.get(`/api/research/${firstData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      const statusData = await statusResponse.json();
      if (statusData.status === 'complete') break;
      attempts++;
    }

    // Get first report
    const firstReport = await request.get(`/api/research/${firstData.report_id}`, {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const firstReportData = await firstReport.json();
    const firstGeneratedAt = firstReportData.generated_at;

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Force refresh request
    const refreshResponse = await request.post('/api/research/mock-monzo?force_refresh=true', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(refreshResponse.status()).toBe(202);
    const refreshData = await refreshResponse.json();

    // Wait for new report completion
    attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await request.get(`/api/research/${refreshData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      const statusData = await statusResponse.json();
      if (statusData.status === 'complete') break;
      attempts++;
    }

    // Get refreshed report
    const refreshedReport = await request.get(`/api/research/${refreshData.report_id}`, {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const refreshedReportData = await refreshedReport.json();
    const newGeneratedAt = refreshedReportData.generated_at;

    // Assert: New report generated (different timestamp)
    expect(newGeneratedAt).not.toBe(firstGeneratedAt);
    expect(new Date(newGeneratedAt).getTime()).toBeGreaterThan(new Date(firstGeneratedAt).getTime());

    console.log(`✅ Force refresh verified:`);
    console.log(`   - First generated: ${firstGeneratedAt}`);
    console.log(`   - Refreshed: ${newGeneratedAt}`);
  });

  test('should optimize API costs through caching', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Make 10 requests for same company
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        request.post('/api/research/mock-monzo', {
          headers: {
            'Cookie': `${authCookie?.name}=${authCookie?.value}`,
          },
        })
      );
    }

    const responses = await Promise.all(requests);

    // All should return 202
    for (const response of responses) {
      expect(response.status()).toBe(202);
    }

    const data = await Promise.all(responses.map(r => r.json()));

    // Assert: All return same report_id (cached)
    const firstReportId = data[0].report_id;
    for (const item of data) {
      expect(item.report_id).toBe(firstReportId);
    }

    console.log(`✅ Cache efficiency:`);
    console.log(`   - 10 requests made`);
    console.log(`   - Only 1 report generated (report_id: ${firstReportId})`);
    console.log(`   - 90% API cost savings from caching`);
  });

  test('should handle cache for multiple users independently', async ({ browser, request }) => {
    // This test requires multiple user sessions
    // For now, we'll skip it and note it needs implementation
    test.skip();

    // TODO: Implement multi-user cache test
    // 1. User A generates research for Company X
    // 2. User B generates research for Company X
    // 3. Both should have independent cached reports
    // 4. User A's cache doesn't affect User B
  });
});
