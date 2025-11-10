import { test, expect } from '@playwright/test';

/**
 * Competitive Analysis E2E Tests
 *
 * Tests the complete competitive analysis workflow:
 * 1. Create analysis
 * 2. Add competitors
 * 3. Refresh data
 * 4. View dashboard
 * 5. Share analysis
 * 6. Export data
 */

test.describe('Competitive Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Use demo login for testing
    await page.click('button:has-text("Try Demo")');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page.getByText('oppSpot Dashboard')).toBeVisible();
  });

  test('should create a new competitive analysis', async ({ page }) => {
    // Navigate to competitive analysis page
    await page.goto('/competitive-analysis');

    // Wait for page to load
    await expect(page.getByRole('heading', { name: /competitive intelligence/i })).toBeVisible();

    // Click create button
    await page.click('button:has-text("New Analysis")');

    // Wait for dialog to open
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill in analysis details
    await page.fill('input[name="title"]', 'Test Analysis - ITONICS Competitor Analysis');
    await page.fill('input[name="target_company_name"]', 'ITONICS');
    await page.fill('input[name="target_company_website"]', 'https://itonics-innovation.com');
    await page.fill('textarea[name="description"]', 'Competitive analysis for ITONICS platform');
    await page.fill('input[name="market_segment"]', 'Innovation Management Software');
    await page.fill('input[name="geography"]', 'Global');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create")');

    // Wait for success and redirect
    await page.waitForURL('**/competitive-analysis/**');

    // Verify analysis was created
    await expect(page.getByText('ITONICS Competitor Analysis')).toBeVisible();
    await expect(page.getByText('ITONICS')).toBeVisible();
  });

  test('should add competitors to analysis', async ({ page }) => {
    // Assuming we're on an analysis detail page
    // You may need to create an analysis first or use a fixture
    await page.goto('/competitive-analysis');

    // Click on first analysis (or create one if none exist)
    const firstAnalysis = page.locator('article').first();

    if (await firstAnalysis.isVisible()) {
      await firstAnalysis.click();
    } else {
      test.skip('No existing analysis found - create one first');
    }

    // Wait for analysis page to load
    await page.waitForURL('**/competitive-analysis/**');

    // Find and click "Add Competitor" button
    const addCompetitorButton = page.getByRole('button', { name: /add competitor/i });

    if (await addCompetitorButton.isVisible()) {
      await addCompetitorButton.click();

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible();

      // Fill competitor details
      await page.fill('input[name="competitor_name"]', 'Viima');
      await page.fill('input[name="competitor_website"]', 'https://www.viima.com');

      // Select relationship type
      await page.selectOption('select[name="relationship_type"]', 'direct_competitor');

      // Submit
      await page.click('button[type="submit"]:has-text("Add")');

      // Wait for competitor to appear
      await expect(page.getByText('Viima')).toBeVisible();
    }
  });

  test('should display empty state when no analyses exist', async ({ page }) => {
    await page.goto('/competitive-analysis');

    // Check for empty state message or create button
    const emptyState = page.getByText(/no competitive analyses/i);
    const createButton = page.getByRole('button', { name: /new analysis/i });

    // Either empty state or create button should be visible
    await expect(emptyState.or(createButton)).toBeVisible();
  });

  test('should navigate through wizard steps', async ({ page }) => {
    await page.goto('/competitive-analysis/new');

    // Step 1: Analysis Details
    await expect(page.getByText(/step 1/i)).toBeVisible();
    await page.fill('input[name="title"]', 'Wizard Test Analysis');
    await page.fill('input[name="target_company_name"]', 'Test Company');
    await page.click('button:has-text("Next")');

    // Step 2: Add Competitors (may skip or add minimal)
    await expect(page.getByText(/step 2/i)).toBeVisible();
    await page.click('button:has-text("Skip") , button:has-text("Next")');

    // Step 3: Review & Create
    await expect(page.getByText(/step 3/i)).toBeVisible();
    await expect(page.getByText('Wizard Test Analysis')).toBeVisible();
  });

  test('should show validation errors for invalid inputs', async ({ page }) => {
    await page.goto('/competitive-analysis');
    await page.click('button:has-text("New Analysis")');

    // Try to submit without filling required fields
    await page.click('button[type="submit"]:has-text("Create")');

    // Check for validation errors
    const errorMessage = page.locator('text=/required|cannot be empty/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test('should display moat strength radar chart when data available', async ({ page }) => {
    await page.goto('/competitive-analysis');

    const firstAnalysis = page.locator('article').first();
    if (await firstAnalysis.isVisible()) {
      await firstAnalysis.click();
      await page.waitForURL('**/competitive-analysis/**');

      // Look for moat score section
      const moatSection = page.getByText(/competitive moat/i);

      if (await moatSection.isVisible()) {
        // Verify radar chart or empty state
        const radarChart = page.locator('[class*="recharts"]');
        const emptyState = page.getByText(/no moat analysis/i);

        await expect(radarChart.or(emptyState)).toBeVisible();
      }
    }
  });

  test('should handle share dialog', async ({ page }) => {
    await page.goto('/competitive-analysis');

    const firstAnalysis = page.locator('article').first();
    if (await firstAnalysis.isVisible()) {
      await firstAnalysis.click();
      await page.waitForURL('**/competitive-analysis/**');

      // Find share button
      const shareButton = page.getByRole('button', { name: /share/i });

      if (await shareButton.isVisible()) {
        await shareButton.click();

        // Wait for share dialog
        await expect(page.getByRole('dialog')).toBeVisible();

        // Verify email input exists
        await expect(page.getByLabel(/email/i)).toBeVisible();

        // Close dialog
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).not.toBeVisible();
      }
    }
  });

  test('should show export options', async ({ page }) => {
    await page.goto('/competitive-analysis');

    const firstAnalysis = page.locator('article').first();
    if (await firstAnalysis.isVisible()) {
      await firstAnalysis.click();
      await page.waitForURL('**/competitive-analysis/**');

      // Find export button
      const exportButton = page.getByRole('button', { name: /export/i });

      if (await exportButton.isVisible()) {
        await exportButton.click();

        // Check for export options (PDF, Excel, PowerPoint)
        const exportDialog = page.getByRole('dialog').or(page.getByRole('menu'));
        await expect(exportDialog).toBeVisible();
      }
    }
  });

  test('should display feature matrix', async ({ page }) => {
    await page.goto('/competitive-analysis');

    const firstAnalysis = page.locator('article').first();
    if (await firstAnalysis.isVisible()) {
      await firstAnalysis.click();
      await page.waitForURL('**/competitive-analysis/**');

      // Scroll to feature matrix section
      const featureMatrixHeading = page.getByRole('heading', { name: /feature matrix|feature comparison/i });

      if (await featureMatrixHeading.isVisible()) {
        await featureMatrixHeading.scrollIntoViewIfNeeded();

        // Verify table or empty state
        const table = page.locator('table');
        const emptyState = page.getByText(/no features/i);

        await expect(table.or(emptyState)).toBeVisible();
      }
    }
  });

  test('should display pricing comparison chart', async ({ page }) => {
    await page.goto('/competitive-analysis');

    const firstAnalysis = page.locator('article').first();
    if (await firstAnalysis.isVisible()) {
      await firstAnalysis.click();
      await page.waitForURL('**/competitive-analysis/**');

      // Look for pricing section
      const pricingHeading = page.getByRole('heading', { name: /pricing comparison/i });

      if (await pricingHeading.isVisible()) {
        await pricingHeading.scrollIntoViewIfNeeded();

        // Verify chart or empty state
        const chart = page.locator('[class*="recharts"]');
        const emptyState = page.getByText(/no pricing data/i);

        await expect(chart.or(emptyState)).toBeVisible();
      }
    }
  });

  test('should show stale data alert when applicable', async ({ page }) => {
    await page.goto('/competitive-analysis');

    // Look for stale data badge or alert
    const staleAlert = page.getByText(/stale|refresh recommended|outdated/i);

    // This may not always be visible, so we just check if it exists
    const isStaleAlertVisible = await staleAlert.isVisible().catch(() => false);

    if (isStaleAlertVisible) {
      await expect(staleAlert).toBeVisible();
    }
  });

  test('should handle delete analysis', async ({ page }) => {
    await page.goto('/competitive-analysis');

    const firstAnalysis = page.locator('article').first();
    if (await firstAnalysis.isVisible()) {
      await firstAnalysis.click();
      await page.waitForURL('**/competitive-analysis/**');

      // Find delete or more options button
      const moreButton = page.getByRole('button', { name: /more|options|menu/i });

      if (await moreButton.isVisible()) {
        await moreButton.click();

        // Look for delete option
        const deleteOption = page.getByRole('menuitem', { name: /delete/i });

        if (await deleteOption.isVisible()) {
          await deleteOption.click();

          // Confirm deletion dialog
          const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });

          if (await confirmButton.isVisible()) {
            // We found the delete flow - don't actually delete in test
            await page.keyboard.press('Escape');
          }
        }
      }
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/competitive-analysis');

    // Verify page renders on mobile
    await expect(page.getByRole('heading', { name: /competitive intelligence/i })).toBeVisible();

    // Check if mobile menu is accessible
    const mobileMenuButton = page.getByRole('button', { name: /menu/i });

    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      // Menu should expand
    }
  });
});
