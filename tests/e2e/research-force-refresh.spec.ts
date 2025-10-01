/**
 * Integration Test: Force Refresh
 * T013: Verify force_refresh parameter bypasses cache
 *
 * This test MUST FAIL initially (endpoints don't exist yet)
 * Validates: FR-014, FR-015, FR-036
 */

import { test, expect } from '@playwright/test';

test.describe('ResearchGPT Force Refresh Integration', () => {

  test.beforeEach(async ({ page }) => {
    // Login as demo user
    await page.goto('/login');
    await page.fill('[name="email"]', 'demo@oppspot.com');
    await page.fill('[name="password"]', 'Demo123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should regenerate report when force_refresh=true', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // ========================================================================
    // STEP 1: Generate initial report
    // ========================================================================
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
      const statusCheck = await request.get(`/api/research/${firstData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      const statusData = await statusCheck.json();
      if (statusData.status === 'complete') break;
      attempts++;
    }

    // Get first report details
    const firstReport = await request.get(`/api/research/${firstData.report_id}`, {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const firstReportData = await firstReport.json();

    // ========================================================================
    // STEP 2: Request same company (should return cached)
    // ========================================================================
    const cachedResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    const cachedData = await cachedResponse.json();

    // Assert: Same report ID (cached)
    expect(cachedData.report_id).toBe(firstData.report_id);

    // ========================================================================
    // STEP 3: Request with force_refresh=true
    // ========================================================================
    // Wait 2 seconds to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 2000));

    const refreshResponse = await request.post('/api/research/mock-monzo?force_refresh=true', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    expect(refreshResponse.status()).toBe(202);
    const refreshData = await refreshResponse.json();

    // Assert: New report ID (not cached)
    expect(refreshData.report_id).not.toBe(firstData.report_id);

    // Wait for new report completion
    attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusCheck = await request.get(`/api/research/${refreshData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      const statusData = await statusCheck.json();
      if (statusData.status === 'complete') break;
      attempts++;
    }

    // Get new report details
    const newReport = await request.get(`/api/research/${refreshData.report_id}`, {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const newReportData = await newReport.json();

    // Assert: Different generated_at timestamp
    expect(newReportData.generated_at).not.toBe(firstReportData.generated_at);
    expect(new Date(newReportData.generated_at).getTime())
      .toBeGreaterThan(new Date(firstReportData.generated_at).getTime());

    console.log(`✅ Force refresh verified:`);
    console.log(`   - First report: ${firstData.report_id}`);
    console.log(`   - Cached report: ${cachedData.report_id} (same)`);
    console.log(`   - Refreshed report: ${refreshData.report_id} (new)`);
    console.log(`   - Time difference: ${(new Date(newReportData.generated_at).getTime() - new Date(firstReportData.generated_at).getTime()) / 1000}s`);
  });

  test('should consume quota on force refresh', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Get initial quota
    const quotaBefore = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataBefore = await quotaBefore.json();

    if (dataBefore.researches_remaining < 2) {
      test.skip(); // Need at least 2 researches available
    }

    // First request
    const firstResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(firstResponse.status()).toBe(202);

    // Get quota after first request
    const quotaAfter1 = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataAfter1 = await quotaAfter1.json();

    // Assert: Quota incremented by 1
    expect(dataAfter1.researches_used).toBe(dataBefore.researches_used + 1);

    // Force refresh
    const refreshResponse = await request.post('/api/research/mock-monzo?force_refresh=true', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(refreshResponse.status()).toBe(202);

    // Get quota after force refresh
    const quotaAfter2 = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataAfter2 = await quotaAfter2.json();

    // Assert: Quota incremented again
    expect(dataAfter2.researches_used).toBe(dataAfter1.researches_used + 1);
    expect(dataAfter2.researches_used).toBe(dataBefore.researches_used + 2);

    console.log(`✅ Quota consumption verified:`);
    console.log(`   - Initial: ${dataBefore.researches_used}`);
    console.log(`   - After first request: ${dataAfter1.researches_used} (+1)`);
    console.log(`   - After force refresh: ${dataAfter2.researches_used} (+1)`);
  });

  test('should show "Refresh" button in UI for cached reports', async ({ page }) => {
    // Generate initial report
    await page.goto('/business/mock-monzo');
    const researchButton = page.locator('button:has-text("Generate Research")');
    await researchButton.click();

    // Wait for completion
    const progressIndicator = page.locator('[data-testid="research-progress"]');
    await expect(progressIndicator).toContainText('6/6 sections', { timeout: 60000 });

    // Navigate away and back
    await page.goto('/');
    await page.goto('/business/mock-monzo');

    // Assert: Refresh button appears
    const refreshButton = page.locator('button:has-text("Refresh Research")');
    await expect(refreshButton).toBeVisible();

    // Assert: Tooltip explains quota consumption
    await refreshButton.hover();
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toContainText(/This will use 1 research credit/i);
  });

  test('should confirm before force refresh in UI', async ({ page }) => {
    // Generate initial report
    await page.goto('/business/mock-monzo');
    const researchButton = page.locator('button:has-text("Generate Research")');
    await researchButton.click();

    const progressIndicator = page.locator('[data-testid="research-progress"]');
    await expect(progressIndicator).toContainText('6/6 sections', { timeout: 60000 });

    // Navigate back
    await page.goto('/business/mock-monzo');

    // Click refresh button
    const refreshButton = page.locator('button:has-text("Refresh Research")');
    await refreshButton.click();

    // Assert: Confirmation dialog appears
    const confirmDialog = page.locator('[role="alertdialog"], [role="dialog"]');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(/Are you sure|Confirm/i);
    await expect(confirmDialog).toContainText(/use 1 research credit|quota/i);

    // Cancel
    const cancelButton = confirmDialog.locator('button:has-text("Cancel")');
    await cancelButton.click();

    // Assert: Dialog dismissed
    await expect(confirmDialog).not.toBeVisible();

    // Click refresh again and confirm
    await refreshButton.click();
    await expect(confirmDialog).toBeVisible();

    const confirmButton = confirmDialog.locator('button:has-text("Confirm"), button:has-text("Refresh")');
    await confirmButton.click();

    // Assert: New research initiated
    await expect(progressIndicator).toBeVisible();
    await expect(progressIndicator).toContainText(/\d\/6 sections/);
  });

  test('should respect quota limits on force refresh', async ({ request, page }) => {
    // This test requires setting quota to limit
    // For now, we'll skip it and note it needs implementation
    test.skip();

    // TODO: Implement quota limit test
    // 1. Set user quota to 100/100
    // 2. Attempt force refresh
    // 3. Should return 403 Forbidden
    // 4. Error message should explain quota exceeded
  });

  test('should update all sections on force refresh', async ({ request, page }) => {
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
      const statusCheck = await request.get(`/api/research/${firstData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      const statusData = await statusCheck.json();
      if (statusData.status === 'complete') break;
      attempts++;
    }

    // Get first report sections
    const firstReport = await request.get(`/api/research/${firstData.report_id}`, {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const firstReportData = await firstReport.json();
    const firstSections = firstReportData.sections;

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Force refresh
    const refreshResponse = await request.post('/api/research/mock-monzo?force_refresh=true', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const refreshData = await refreshResponse.json();

    // Wait for new report completion
    attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusCheck = await request.get(`/api/research/${refreshData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      const statusData = await statusCheck.json();
      if (statusData.status === 'complete') break;
      attempts++;
    }

    // Get new report sections
    const newReport = await request.get(`/api/research/${refreshData.report_id}`, {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const newReportData = await newReport.json();
    const newSections = newReportData.sections;

    // Assert: All sections regenerated
    expect(newSections).toHaveLength(6);

    for (let i = 0; i < 6; i++) {
      const firstSection = firstSections[i];
      const newSection = newSections.find((s: { section_type: string }) => s.section_type === firstSection.section_type);

      expect(newSection).toBeDefined();

      // Assert: Different section IDs
      expect(newSection.id).not.toBe(firstSection.id);

      // Assert: Different cached_at timestamps
      expect(newSection.cached_at).not.toBe(firstSection.cached_at);
      expect(new Date(newSection.cached_at).getTime())
        .toBeGreaterThan(new Date(firstSection.cached_at).getTime());

      console.log(`✅ Section ${firstSection.section_type} regenerated:`);
      console.log(`   - First ID: ${firstSection.id}`);
      console.log(`   - New ID: ${newSection.id}`);
    }
  });

  test('should preserve user context on force refresh', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    const userContext = 'We sell CRM software to fintech companies';

    // First request with user context
    const firstResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        'Content-Type': 'application/json',
      },
      data: {
        user_context: userContext,
        focus_areas: ['buying_signals', 'decision_makers'],
      },
    });

    expect(firstResponse.status()).toBe(202);
    const firstData = await firstResponse.json();

    // Wait for completion
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusCheck = await request.get(`/api/research/${firstData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      const statusData = await statusCheck.json();
      if (statusData.status === 'complete') break;
      attempts++;
    }

    // Force refresh without specifying context again
    const refreshResponse = await request.post('/api/research/mock-monzo?force_refresh=true', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    expect(refreshResponse.status()).toBe(202);
    const refreshData = await refreshResponse.json();

    // Wait for new report
    attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusCheck = await request.get(`/api/research/${refreshData.report_id}`, {
        headers: {
          'Cookie': `${authCookie?.name}=${authCookie?.value}`,
        },
      });
      const statusData = await statusCheck.json();
      if (statusData.status === 'complete') break;
      attempts++;
    }

    // Get new report
    const newReport = await request.get(`/api/research/${refreshData.report_id}`, {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const newReportData = await newReport.json();

    // Assert: User context preserved in metadata
    expect(newReportData.metadata).toHaveProperty('user_context');
    expect(newReportData.metadata.user_context).toBe(userContext);
  });

  test('should handle force refresh during active generation', async ({ request, page }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Initiate first research
    const firstResponse = await request.post('/api/research/mock-monzo', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    expect(firstResponse.status()).toBe(202);

    // Immediately try force refresh (while first is still generating)
    const refreshResponse = await request.post('/api/research/mock-monzo?force_refresh=true', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    // Should either:
    // A) Accept and queue new request (202)
    // B) Reject with 429 Too Many Requests
    expect([202, 429]).toContain(refreshResponse.status());

    if (refreshResponse.status() === 429) {
      const data = await refreshResponse.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('generation in progress');
    }
  });
});
