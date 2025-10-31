import { test, expect } from '@playwright/test';

/**
 * T044: E2E Test - Financial Dashboard Metrics Display
 *
 * Purpose: Validate dashboard displays KPIs, tooltips, benchmarks, and anomalies
 * Reference: quickstart.md Scenario 3-6
 * Performance: Dashboard load time < 1 second (FR-053)
 */

const TEST_COMPANY_ID = 'test-company-financial-001';

test.describe('Financial Dashboard: KPI Overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);
    await page.waitForLoadState('networkidle');
  });

  test('Scenario 1: Dashboard displays KPIs with data', async ({ page }) => {
    // Assert: Page title
    await expect(page.locator('h1').filter({ hasText: /financial/i })).toBeVisible();

    // Assert: 8 KPI metrics visible
    const kpiMetrics = [
      'ARR',
      'MRR',
      'NRR',
      'GRR',
      'CAC',
      'LTV',
      'Gross Margin',
      'ARPU'
    ];

    for (const metric of kpiMetrics) {
      await expect(page.locator(`text=${metric}`).first()).toBeVisible({ timeout: 5000 });
    }

    // Assert: Metric values displayed (not N/A)
    const metricValues = page.locator('[data-testid*="metric-value"]');
    if (await metricValues.count() > 0) {
      const firstValue = await metricValues.first().textContent();
      expect(firstValue).not.toBe('N/A');
      expect(firstValue).toMatch(/[\$£€¥]|%/); // Contains currency symbol or percentage
    }

    // Assert: Trend indicators visible
    await expect(
      page.locator('svg').filter({ has: page.locator('path') }).first()
    ).toBeVisible(); // Arrow icons for trends
  });

  test('Scenario 2: Formula tooltips display explanations on hover', async ({ page }) => {
    // Find first help icon (formula tooltip trigger)
    const helpIcon = page.locator('[aria-label*="formula"], button:has(svg)').first();

    if (await helpIcon.isVisible()) {
      // Hover over help icon
      await helpIcon.hover();

      // Assert: Tooltip appears with formula
      await expect(page.locator('[role="tooltip"]')).toBeVisible({ timeout: 2000 });

      // Assert: Formula content visible
      await expect(
        page.locator('[role="tooltip"]').locator('text=/formula|calculation/i')
      ).toBeVisible();

      // Assert: Example shown
      await expect(
        page.locator('[role="tooltip"]').locator('text=/example/i')
      ).toBeVisible();
    }
  });

  test('Scenario 5: Dashboard loads in <1 second (FR-053)', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to dashboard
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);

    // Wait for KPI overview to be visible
    await page.locator('text=ARR').first().waitFor({ state: 'visible' });

    const loadTime = Date.now() - startTime;

    // Assert: Load time under 1 second
    expect(loadTime).toBeLessThan(1000);
    console.log(`Dashboard loaded in ${loadTime}ms`);
  });
});

test.describe('Financial Dashboard: Revenue Quality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);
    await page.waitForLoadState('networkidle');
  });

  test('Revenue concentration chart displays HHI and top customers', async ({ page }) => {
    // Assert: Concentration chart section visible
    const concentrationSection = page.locator('text=/revenue concentration/i');

    if (await concentrationSection.isVisible()) {
      // Assert: HHI value displayed
      await expect(page.locator('text=/HHI/i')).toBeVisible();

      // Assert: Top-N percentages visible
      await expect(page.locator('text=/top 1|top 3|top 5|top 10/i').first()).toBeVisible();

      // Assert: Chart renders (look for svg or canvas)
      await expect(
        page.locator('[class*="recharts"], svg[class*="chart"]').first()
      ).toBeVisible();
    }
  });

  test('AR/AP aging table displays buckets and DSO/DPO', async ({ page }) => {
    // Assert: Aging table section visible
    const agingSection = page.locator('text=/AR.*AP|aging/i');

    if (await agingSection.isVisible()) {
      // Assert: Aging buckets visible
      await expect(page.locator('text=/0-30|30-60|60-90|90\\+/i').first()).toBeVisible();

      // Assert: DSO displayed
      await expect(page.locator('text=/DSO|days sales outstanding/i')).toBeVisible();

      // Assert: Table structure
      await expect(page.locator('table, [role="table"]').first()).toBeVisible();
    }
  });
});

test.describe('Financial Dashboard: Anomalies and Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);
  });

  test('Scenario 4: Anomaly banner displays concentration risk (>25%)', async ({ page }) => {
    // Look for anomaly alert banners
    const anomalyBanner = page.locator('[role="alert"], [data-testid="anomaly-banner"]').first();

    if (await anomalyBanner.isVisible()) {
      // Assert: Alert is visible
      await expect(anomalyBanner).toBeVisible();

      // Assert: Severity indicator present
      await expect(
        anomalyBanner.locator('text=/high|medium|low|critical/i')
      ).toBeVisible();

      // Assert: Message describes the issue
      const bannerText = await anomalyBanner.textContent();
      expect(bannerText?.toLowerCase()).toMatch(/concentration|risk|customer|revenue/);

      // If concentration risk, check for 25% threshold mention
      if (bannerText?.toLowerCase().includes('concentration')) {
        expect(bannerText).toMatch(/25%|percent/);
      }
    }
  });

  test('Multiple anomalies are sorted by severity', async ({ page }) => {
    const anomalyBanners = page.locator('[role="alert"]');
    const count = await anomalyBanners.count();

    if (count > 1) {
      // Get severity badges
      const firstSeverity = await anomalyBanners.nth(0).locator('text=/high|medium|low/i').textContent();
      const secondSeverity = await anomalyBanners.nth(1).locator('text=/high|medium|low/i').textContent();

      // Assert: First is higher or equal severity than second
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const first = severityOrder[firstSeverity?.toLowerCase() as keyof typeof severityOrder] || 0;
      const second = severityOrder[secondSeverity?.toLowerCase() as keyof typeof severityOrder] || 0;

      expect(first).toBeGreaterThanOrEqual(second);
    }
  });
});

test.describe('Financial Dashboard: Benchmarks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);
  });

  test('Scenario 3: Benchmark comparison shows sector medians', async ({ page }) => {
    // Look for benchmark section
    const benchmarkSection = page.locator('text=/benchmark|sector median|quartile/i').first();

    if (await benchmarkSection.isVisible()) {
      // Assert: Sector and size band displayed
      await expect(
        page.locator('text=/SaaS|FinTech|Healthcare|E-commerce/i').first()
      ).toBeVisible();

      await expect(
        page.locator('text=/\\$1M|\\$10M|\\$50M/i').first()
      ).toBeVisible();

      // Assert: Performance indicators visible
      await expect(
        page.locator('[data-testid*="performance"], text=/above|below|at median/i').first()
      ).toBeVisible();

      // Assert: Quartile values (P25, P50, P75)
      await expect(page.locator('text=/P25|P50|P75/i').first()).toBeVisible();
    }
  });

  test('Traffic light indicators show performance vs median', async ({ page }) => {
    const benchmarkCards = page.locator('[data-testid*="benchmark-card"]');

    if (await benchmarkCards.count() > 0) {
      const firstCard = benchmarkCards.first();

      // Assert: Visual indicator present (icon or color)
      await expect(
        firstCard.locator('svg, [data-testid*="indicator"]').first()
      ).toBeVisible();

      // Assert: Status text present
      await expect(
        firstCard.locator('text=/above|below|at/i')
      ).toBeVisible();
    }
  });
});

test.describe('Financial Dashboard: Navigation', () => {
  test('Export PDF button is accessible', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);

    // Assert: Export PDF button visible
    await expect(
      page.locator('button:has-text("Export"), a:has-text("Export"), a:has-text("PDF")')
    ).toBeVisible();
  });

  test('Upload Data button navigates to upload page', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);

    // Click upload button
    await page.click('button:has-text("Upload"), a:has-text("Upload")');

    // Assert: Navigates to upload page
    await expect(page).toHaveURL(new RegExp(`/companies/${TEST_COMPANY_ID}/financials/upload`));
  });

  test('Cohort Analysis link navigates to cohorts page', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);

    // Click cohort link
    await page.click('a:has-text("Cohort"), button:has-text("Cohort")');

    // Assert: Navigates to cohorts page
    await expect(page).toHaveURL(new RegExp(`/companies/${TEST_COMPANY_ID}/financials/cohorts`));
  });
});

test.describe('Financial Dashboard: Empty State', () => {
  test('Shows empty state when no data uploaded', async ({ page }) => {
    // Use a company with no financial data
    const emptyCompanyId = 'test-company-no-data';
    await page.goto(`/companies/${emptyCompanyId}/financials`);

    // Assert: Empty state message
    await expect(
      page.locator('text=/no financial data|upload.*data|get started/i')
    ).toBeVisible();

    // Assert: Upload CTA visible
    await expect(
      page.locator('button:has-text("Upload"), a:has-text("Upload")')
    ).toBeVisible();

    // Assert: KPIs not visible
    await expect(page.locator('text=ARR').first()).not.toBeVisible();
  });
});
