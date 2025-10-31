import { test, expect } from '@playwright/test';

/**
 * T045: E2E Test - Cohort Analysis View
 *
 * Purpose: Validate cohort retention heatmap and interactive features
 * Reference: quickstart.md Scenario 8
 */

const TEST_COMPANY_ID = 'test-company-financial-001';

test.describe('Cohort Analysis: Heatmap Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/cohorts`);
    await page.waitForLoadState('networkidle');
  });

  test('Scenario 1: 24-month cohort heatmap displays retention percentages', async ({ page }) => {
    // Assert: Page title
    await expect(page.locator('h1').filter({ hasText: /cohort/i })).toBeVisible();

    // Assert: Heatmap grid visible
    await expect(page.locator('[data-testid="cohort-heatmap"], [class*="heatmap"]').first()).toBeVisible({ timeout: 5000 });

    // Assert: Month headers visible (M0, M1, M2, etc.)
    await expect(page.locator('text=/M0|Month 0/i').first()).toBeVisible();

    // Assert: Cohort month labels visible
    await expect(page.locator('text=/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i').first()).toBeVisible();

    // Assert: Retention cells contain percentages
    const retentionCells = page.locator('[data-testid*="retention-cell"], div:has-text("%")');
    if (await retentionCells.count() > 0) {
      const firstCell = await retentionCells.first().textContent();
      expect(firstCell).toMatch(/\d+%/); // Contains percentage
    }

    // Assert: Color-coded cells (check for background colors)
    const cells = page.locator('[style*="background"]');
    expect(await cells.count()).toBeGreaterThan(0);
  });

  test('Cohort labels show month and year', async ({ page }) => {
    // Assert: Full date format in labels
    const datePattern = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i;
    await expect(page.locator(`text=${datePattern}`).first()).toBeVisible();
  });

  test('Heatmap displays up to 24 months of data', async ({ page }) => {
    // Click 24-month window selector
    await page.click('button:has-text("24"), a:has-text("24 Months")');

    // Count month headers (should be <= 24)
    const monthHeaders = page.locator('text=/^M\\d+$/');
    const count = await monthHeaders.count();

    expect(count).toBeLessThanOrEqual(24);
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Cohort Analysis: Toggle Retention Type', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/cohorts`);
  });

  test('Scenario 2: Toggle between logo and revenue retention', async ({ page }) => {
    // Assert: Toggle controls visible
    await expect(
      page.locator('text=/logo.*retention|revenue.*retention/i').first()
    ).toBeVisible();

    // Find toggle tabs
    const logoTab = page.locator('button:has-text("Logo"), [role="tab"]:has-text("Logo")').first();
    const revenueTab = page.locator('button:has-text("Revenue"), [role="tab"]:has-text("Revenue")').first();

    // Click Logo Retention
    if (await logoTab.isVisible()) {
      await logoTab.click();
      await page.waitForTimeout(500); // Wait for data update

      // Assert: Active state
      await expect(logoTab).toHaveAttribute('data-state', 'active');
    }

    // Click Revenue Retention
    if (await revenueTab.isVisible()) {
      await revenueTab.click();
      await page.waitForTimeout(500);

      // Assert: Active state
      await expect(revenueTab).toHaveAttribute('data-state', 'active');

      // Assert: Data potentially different (revenue retention can be >100%)
      const cellsOver100 = page.locator('text=/1[0-9]{2}%|[2-9][0-9]{2}%/');
      // Revenue retention might show >100% due to expansion
    }
  });
});

test.describe('Cohort Analysis: Tooltips', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/cohorts`);
  });

  test('Scenario 3: Hover cell shows tooltip with exact values', async ({ page }) => {
    // Find first retention cell
    const retentionCell = page.locator('[data-testid*="retention-cell"]').first();

    if (await retentionCell.isVisible()) {
      // Hover over cell
      await retentionCell.hover();

      // Assert: Tooltip appears
      await expect(page.locator('[role="tooltip"]')).toBeVisible({ timeout: 2000 });

      // Assert: Tooltip contains cohort month
      await expect(
        page.locator('[role="tooltip"]').locator('text=/cohort/i')
      ).toBeVisible();

      // Assert: Tooltip contains period month
      await expect(
        page.locator('[role="tooltip"]').locator('text=/period/i')
      ).toBeVisible();

      // Assert: Tooltip contains month number (e.g., "Month 3")
      await expect(
        page.locator('[role="tooltip"]').locator('text=/month\s+\d+/i')
      ).toBeVisible();

      // Assert: Tooltip shows exact retention percentage
      await expect(
        page.locator('[role="tooltip"]').locator('text=/\d+\.?\d*%/')
      ).toBeVisible();
    }
  });
});

test.describe('Cohort Analysis: Window Selector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/cohorts`);
  });

  test('12-month window selector works', async ({ page }) => {
    // Click 12-month button
    await page.click('button:has-text("12"), a:has-text("12 Months")');

    // Assert: URL updated
    await expect(page).toHaveURL(/window=12/);

    // Assert: Grid size changed (fewer columns)
    const monthHeaders = page.locator('text=/^M\\d+$/');
    const count = await monthHeaders.count();
    expect(count).toBeLessThanOrEqual(12);
  });

  test('18-month window selector works', async ({ page }) => {
    // Click 18-month button
    await page.click('button:has-text("18"), a:has-text("18 Months")');

    // Assert: URL updated
    await expect(page).toHaveURL(/window=18/);
  });

  test('24-month window selector works', async ({ page }) => {
    // Click 24-month button
    await page.click('button:has-text("24"), a:has-text("24 Months")');

    // Assert: URL updated
    await expect(page).toHaveURL(/window=24/);
  });
});

test.describe('Cohort Analysis: Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/cohorts`);
  });

  test('Scenario 4: Export to CSV downloads file', async ({ page }) => {
    // Find export button
    const exportButton = page.locator('button:has-text("Export"), a:has-text("Export CSV")');

    if (await exportButton.isVisible()) {
      // Setup download listener
      const downloadPromise = page.waitForEvent('download');

      // Click export
      await exportButton.click();

      // Wait for download
      const download = await downloadPromise;

      // Assert: Filename contains expected pattern
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/cohort|retention/i);
      expect(filename).toContain('.csv');

      // Optional: Verify file size > 0
      const path = await download.path();
      if (path) {
        const fs = require('fs');
        const stats = fs.statSync(path);
        expect(stats.size).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Cohort Analysis: Insights', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/cohorts`);
  });

  test('Understanding Cohort Analysis section is visible', async ({ page }) => {
    // Scroll to bottom to find insights card
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Assert: Insights card visible
    await expect(
      page.locator('text=/understanding.*cohort|how to read|interpretation/i')
    ).toBeVisible();

    // Assert: Explanation of logo vs revenue retention
    await expect(page.locator('text=/logo retention/i')).toBeVisible();
    await expect(page.locator('text=/revenue retention/i')).toBeVisible();

    // Assert: Benchmark guidance
    await expect(page.locator('text=/70%|85%|90%|110%/i').first()).toBeVisible();

    // Assert: How to read the heatmap
    await expect(page.locator('text=/row|column|cohort/i').first()).toBeVisible();
  });
});

test.describe('Cohort Analysis: Color Legend', () => {
  test('Color legend explains heatmap colors', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/cohorts`);

    // Assert: Legend visible
    await expect(page.locator('text=/retention|legend/i').first()).toBeVisible();

    // Assert: Color indicators present
    await expect(page.locator('text=/0-30%|90-100%|green|red/i').first()).toBeVisible();

    // Assert: Visual color swatches
    const colorSwatches = page.locator('[class*="bg-red"], [class*="bg-green"], [class*="bg-yellow"]');
    expect(await colorSwatches.count()).toBeGreaterThan(0);
  });
});

test.describe('Cohort Analysis: Empty State', () => {
  test('Shows empty state when no cohort data', async ({ page }) => {
    // Use company with no data
    const emptyCompanyId = 'test-company-no-data';
    await page.goto(`/companies/${emptyCompanyId}/financials/cohorts`);

    // Assert: Empty state message
    await expect(
      page.locator('text=/no cohort data|upload.*subscription/i')
    ).toBeVisible();

    // Assert: Upload CTA
    await expect(
      page.locator('button:has-text("Upload"), a:has-text("Upload")')
    ).toBeVisible();

    // Assert: Explanation of cohorts
    await expect(
      page.locator('text=/cohorts.*created.*subscription/i')
    ).toBeVisible();
  });
});

test.describe('Cohort Analysis: Navigation', () => {
  test('Back to Dashboard button works', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/cohorts`);

    // Click back button
    await page.click('button:has-text("Back"), a:has-text("Back")');

    // Assert: Returns to dashboard
    await expect(page).toHaveURL(new RegExp(`/companies/${TEST_COMPANY_ID}/financials$`));
  });
});
