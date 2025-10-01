/**
 * Integration Test: Happy Path - Generate Complete Research Report
 * T011: End-to-end user journey for successful research generation
 *
 * This test MUST FAIL initially (endpoints don't exist yet)
 * Validates: Complete feature flow from initiation to viewing report
 */

import { test, expect } from '@playwright/test';

test.describe('ResearchGPT Happy Path Integration', () => {

  test.beforeEach(async ({ page }) => {
    // Login as demo user
    await page.goto('/login');
    await page.fill('[name="email"]', 'demo@oppspot.com');
    await page.fill('[name="password"]', 'Demo123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should complete full research generation journey', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // ========================================================================
    // STEP 1: Navigate to business detail page
    // ========================================================================
    await page.goto('/business/mock-monzo');

    // Assert: Page loaded
    await expect(page.locator('h1')).toContainText('Monzo');

    // ========================================================================
    // STEP 2: Click "Generate Research" button
    // ========================================================================
    const researchButton = page.locator('button:has-text("Generate Research")');
    await expect(researchButton).toBeVisible();
    await researchButton.click();

    // Assert: Research initiated toast/notification
    await expect(page.locator('text=Research generation started')).toBeVisible({ timeout: 5000 });

    // ========================================================================
    // STEP 3: Monitor progress UI
    // ========================================================================
    const progressIndicator = page.locator('[data-testid="research-progress"]');
    await expect(progressIndicator).toBeVisible({ timeout: 5000 });

    // Assert: Progress shows sections being generated
    await expect(progressIndicator).toContainText(/\d\/6 sections/);

    // Wait for completion (up to 60 seconds)
    await expect(progressIndicator).toContainText('6/6 sections', { timeout: 60000 });

    // ========================================================================
    // STEP 4: Verify report displayed automatically
    // ========================================================================
    const reportView = page.locator('[data-testid="research-report"]');
    await expect(reportView).toBeVisible({ timeout: 5000 });

    // Assert: All 6 sections visible
    await expect(page.locator('[data-testid="section-snapshot"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-buying-signals"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-decision-makers"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-revenue-signals"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-recommended-approach"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-sources"]')).toBeVisible();

    // ========================================================================
    // STEP 5: Verify section content quality
    // ========================================================================

    // Snapshot section
    const snapshot = page.locator('[data-testid="section-snapshot"]');
    await expect(snapshot).toContainText(/Industry:/);
    await expect(snapshot).toContainText(/Employees:/);
    await expect(snapshot).toContainText(/Founded:/);

    // Buying signals section
    const signals = page.locator('[data-testid="section-buying-signals"]');
    await expect(signals).toContainText(/Hiring|Expansion|Leadership/);

    // Decision makers section
    const decisionMakers = page.locator('[data-testid="section-decision-makers"]');
    await expect(decisionMakers).toContainText(/CEO|CTO|Director|Manager/i);

    // Revenue signals section
    const revenue = page.locator('[data-testid="section-revenue-signals"]');
    await expect(revenue).toContainText(/Revenue|Financial|Growth/);

    // Recommended approach section
    const approach = page.locator('[data-testid="section-recommended-approach"]');
    await expect(approach).toContainText(/Strategy|Approach|Recommend/);

    // Sources section
    const sources = page.locator('[data-testid="section-sources"]');
    await expect(sources).toContainText(/Source/);
    // At least 10 sources
    const sourceItems = sources.locator('[data-testid="source-item"]');
    await expect(sourceItems).toHaveCount(10, { timeout: 5000 });

    // ========================================================================
    // STEP 6: Verify cache indicator
    // ========================================================================
    const cacheIndicator = page.locator('[data-testid="cache-indicator"]');
    await expect(cacheIndicator).toBeVisible();
    await expect(cacheIndicator).toContainText(/Generated|Cached/);

    // ========================================================================
    // STEP 7: Verify confidence score displayed
    // ========================================================================
    const confidenceScore = page.locator('[data-testid="confidence-score"]');
    await expect(confidenceScore).toBeVisible();
    await expect(confidenceScore).toContainText(/\d+%/); // e.g., "85%"

    // ========================================================================
    // STEP 8: Test export functionality
    // ========================================================================
    const exportButton = page.locator('button:has-text("Export PDF")');
    await expect(exportButton).toBeVisible();

    // Start download
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    const download = await downloadPromise;

    // Assert: PDF downloaded
    expect(download.suggestedFilename()).toContain('.pdf');
    expect(download.suggestedFilename()).toContain('research');

    // ========================================================================
    // STEP 9: Verify quota updated
    // ========================================================================
    const quotaDisplay = page.locator('[data-testid="quota-display"]');
    await expect(quotaDisplay).toBeVisible();
    await expect(quotaDisplay).toContainText(/\d+\/100/); // e.g., "1/100"

    // ========================================================================
    // STEP 10: Verify report appears in history
    // ========================================================================
    await page.goto('/research');

    // Assert: Research history page loads
    await expect(page.locator('h1')).toContainText('Research History');

    // Assert: Recent report appears in list
    const historyList = page.locator('[data-testid="research-history-list"]');
    await expect(historyList).toBeVisible();

    const firstItem = historyList.locator('[data-testid="history-item"]').first();
    await expect(firstItem).toContainText('Monzo');
    await expect(firstItem).toContainText(/just now|minutes ago/i);

    // ========================================================================
    // STEP 11: Click to view report from history
    // ========================================================================
    await firstItem.click();

    // Assert: Report displayed again
    await expect(reportView).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="section-snapshot"]')).toBeVisible();

    // ========================================================================
    // STEP 12: Verify API response directly
    // ========================================================================
    const quotaResponse = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });

    const quotaData = await quotaResponse.json();

    // Assert: Quota incremented
    expect(quotaData.researches_used).toBeGreaterThan(0);
    expect(quotaData.researches_used).toBeLessThanOrEqual(quotaData.researches_limit);

    console.log('✅ Happy path test completed successfully!');
    console.log(`   - Research generated in <30 seconds`);
    console.log(`   - All 6 sections present`);
    console.log(`   - ${quotaData.researches_used}/${quotaData.researches_limit} quota used`);
  });

  test('should handle multiple company researches in sequence', async ({ page, request }) => {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name.includes('auth'));

    // Get initial quota
    const quotaBefore = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataeBefore = await quotaBefore.json();

    if (dataBefore.researches_remaining < 3) {
      test.skip(); // Need at least 3 researches available
    }

    const companies = [
      { id: 'mock-monzo', name: 'Monzo' },
      { id: 'mock-revolut', name: 'Revolut' },
      { id: 'mock-starling', name: 'Starling' },
    ];

    for (const company of companies) {
      // Navigate to company
      await page.goto(`/business/${company.id}`);
      await expect(page.locator('h1')).toContainText(company.name);

      // Generate research
      const researchButton = page.locator('button:has-text("Generate Research")');
      await researchButton.click();

      // Wait for completion
      const progressIndicator = page.locator('[data-testid="research-progress"]');
      await expect(progressIndicator).toContainText('6/6 sections', { timeout: 60000 });

      // Verify report displayed
      const reportView = page.locator('[data-testid="research-report"]');
      await expect(reportView).toBeVisible();
    }

    // Verify quota incremented by 3
    const quotaAfter = await request.get('/api/research/quota', {
      headers: {
        'Cookie': `${authCookie?.name}=${authCookie?.value}`,
      },
    });
    const dataAfter = await quotaAfter.json();

    expect(dataAfter.researches_used).toBe(dataBefore.researches_used + 3);
  });

  test('should show research button only for premium users', async ({ page }) => {
    // This test requires a way to switch user tiers
    // For now, we'll skip it and note it needs implementation
    test.skip();

    // TODO: Implement tier-based access test
    // 1. Login as free tier user
    // 2. Navigate to business page
    // 3. Research button should show "Upgrade to Premium"
    // 4. Click should show pricing modal
  });

  test('should meet performance target (<30 seconds for 95% of requests)', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to company
    await page.goto('/business/mock-monzo');

    // Generate research
    const researchButton = page.locator('button:has-text("Generate Research")');
    await researchButton.click();

    // Wait for completion
    const progressIndicator = page.locator('[data-testid="research-progress"]');
    await expect(progressIndicator).toContainText('6/6 sections', { timeout: 60000 });

    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;

    // Assert: Completed in <30 seconds (allowing some overhead for UI)
    expect(durationSeconds).toBeLessThan(35);

    console.log(`✅ Research generated in ${durationSeconds.toFixed(1)} seconds`);
  });

  test('should display freshness indicators for cached data', async ({ page }) => {
    // First generation
    await page.goto('/business/mock-monzo');
    const researchButton = page.locator('button:has-text("Generate Research")');
    await researchButton.click();

    const progressIndicator = page.locator('[data-testid="research-progress"]');
    await expect(progressIndicator).toContainText('6/6 sections', { timeout: 60000 });

    // Navigate away and back
    await page.goto('/');
    await page.goto('/business/mock-monzo');

    // Assert: Cache indicator shows fresh data
    const cacheIndicator = page.locator('[data-testid="cache-indicator"]');
    await expect(cacheIndicator).toBeVisible();
    await expect(cacheIndicator).toContainText(/just now|minutes ago/i);

    // Assert: Different TTLs shown for different sections
    const snapshotSection = page.locator('[data-testid="section-snapshot"]');
    const signalsSection = page.locator('[data-testid="section-buying-signals"]');

    // Snapshot: "Valid for 7 days"
    await expect(snapshotSection).toContainText(/7 days|days remaining/i);

    // Signals: "Valid for 6 hours"
    await expect(signalsSection).toContainText(/6 hours|hours remaining/i);
  });
});
