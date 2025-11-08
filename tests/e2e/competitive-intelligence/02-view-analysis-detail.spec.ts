/**
 * E2E Tests: View Analysis Detail Page
 * Tests viewing and navigating the analysis detail dashboard
 */

import { test, expect } from '@playwright/test';
import {
  loginAsUser,
  createAnalysisViaAPI,
  addCompetitorViaAPI,
  deleteAnalysisViaAPI,
  sampleAnalyses,
  sampleCompetitors,
  waitForLoadingComplete,
} from './fixtures';

test.describe('View Analysis Detail - Happy Path', () => {
  let analysisId: string;

  test.beforeAll(async ({ request }) => {
    // Create test analysis via API
    analysisId = await createAnalysisViaAPI(request, sampleAnalyses[0]);

    // Add some competitors
    await addCompetitorViaAPI(request, analysisId, sampleCompetitors[0]);
    await addCompetitorViaAPI(request, analysisId, sampleCompetitors[1]);
  });

  test.afterAll(async ({ request }) => {
    // Cleanup
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'owner');
  });

  test('should display analysis header with title and metadata', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Check title
    await expect(page.locator('h1')).toContainText(sampleAnalyses[0].title);

    // Check target company
    await expect(page.locator(`text=${sampleAnalyses[0].target_company_name}`)).toBeVisible();

    // Check market segment
    if (sampleAnalyses[0].market_segment) {
      await expect(page.locator(`text=${sampleAnalyses[0].market_segment}`)).toBeVisible();
    }

    // Check geography
    if (sampleAnalyses[0].geography) {
      await expect(page.locator(`text=${sampleAnalyses[0].geography}`)).toBeVisible();
    }

    // Check status badge
    await expect(page.locator('[class*="badge"]')).toBeVisible();
  });

  test('should display key metrics cards', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Check all 4 metric cards are visible
    await expect(page.locator('text=Competitors')).toBeVisible();
    await expect(page.locator('text=Avg. Feature Parity')).toBeVisible();
    await expect(page.locator('text=Moat Score')).toBeVisible();
    await expect(page.locator('text=Deal Status')).toBeVisible();

    // Check competitor count is displayed (should be 2)
    await expect(page.locator('text=/^2$/')).toBeVisible();
  });

  test('should display action bar with buttons', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Check for action buttons
    await expect(page.locator('button:has-text("Refresh Data")')).toBeVisible();
    await expect(page.locator('button:has-text("Share")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('should display tabs for different views', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Check all tabs are visible
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(page.locator('text=Overview')).toBeVisible();
    await expect(page.locator('text=Competitors')).toBeVisible();
    await expect(page.locator('text=Feature Matrix')).toBeVisible();
    await expect(page.locator('text=Pricing')).toBeVisible();
    await expect(page.locator('text=Competitive Moat')).toBeVisible();
  });

  test('should display competitors on Overview tab', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Should be on Overview tab by default
    await expect(page.locator('text=/Competitors \\(2\\)/')).toBeVisible();

    // Check competitor cards are visible
    await expect(page.locator(`text=${sampleCompetitors[0].competitor_name}`)).toBeVisible();
    await expect(page.locator(`text=${sampleCompetitors[1].competitor_name}`)).toBeVisible();
  });

  test('should switch between tabs correctly', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Click Competitors tab
    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');

    // Should show competitor management interface
    await expect(page.locator('button:has-text("Add Competitor")')).toBeVisible();

    // Click Feature Matrix tab
    await page.click('text=Feature Matrix');
    await page.waitForLoadState('networkidle');

    // Should show feature matrix (or empty state)
    await expect(page.locator('text=/Feature|No features/')).toBeVisible();

    // Click back to Overview
    await page.click('text=Overview');
    await page.waitForLoadState('networkidle');

    // Should show competitors again
    await expect(page.locator('text=/Competitors \\(2\\)/')).toBeVisible();
  });

  test('should display "Back to Analyses" link', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Check for back button
    await expect(page.locator('button:has-text("Back to Analyses")')).toBeVisible();

    // Click it
    await page.click('button:has-text("Back to Analyses")');

    // Should navigate to list page
    await page.waitForURL('/competitive-intelligence');
  });

  test('should display description card if description exists', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    if (sampleAnalyses[0].description) {
      await expect(page.locator('text=Analysis Description')).toBeVisible();
      await expect(page.locator(`text=${sampleAnalyses[0].description}`)).toBeVisible();
    }
  });

  test('should display data age badge', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Should show some kind of data age indicator (Fresh, Stale, etc.)
    // Since this is a new analysis, it should say "Never refreshed" or similar
    await expect(page.locator('[class*="badge"]')).toBeVisible();
  });
});

test.describe('View Analysis Detail - Error States', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'owner');
  });

  test('should show 404 error for non-existent analysis', async ({ page }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await page.goto(`/competitive-intelligence/${fakeId}`);

    // Should show error message
    await expect(page.locator('text=/Not Found|Analysis not found/i')).toBeVisible();
    await expect(page.locator('button:has-text("Go Back")')).toBeVisible();
  });

  test('should show error for invalid UUID format', async ({ page }) => {
    await page.goto(`/competitive-intelligence/invalid-uuid-format`);

    // Should show error or redirect
    await page.waitForLoadState('networkidle');

    // Should either show 404 or validation error
    await expect(page.locator('text=/Error|Not Found|Invalid/i')).toBeVisible();
  });

  test('should show error when API fails', async ({ page, context }) => {
    // Create analysis first
    const { request } = context;
    const testId = await createAnalysisViaAPI(request, {
      title: 'Test API Failure',
      target_company_name: 'Test Company',
    });

    // Clear auth to trigger 401
    await context.clearCookies();

    // Try to view
    await page.goto(`/competitive-intelligence/${testId}`);

    // Should show auth error
    await expect(page.locator('text=/You must be logged in|Authentication required/i')).toBeVisible();

    // Cleanup
    await loginAsUser(page, 'owner');
    await deleteAnalysisViaAPI(request, testId);
  });

  test('should show "Try Again" button on error', async ({ page }) => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await page.goto(`/competitive-intelligence/${fakeId}`);

    // Wait for error to display
    await expect(page.locator('text=/Not Found|Error/i')).toBeVisible();

    // Should have Try Again button
    const tryAgainButton = page.locator('button:has-text("Try Again")');
    await expect(tryAgainButton).toBeVisible();

    // Click it - should retry the request
    await tryAgainButton.click();

    // Should still show error (since ID is invalid)
    await expect(page.locator('text=/Not Found|Error/i')).toBeVisible();
  });
});

test.describe('View Analysis Detail - Loading States', () => {
  let analysisId: string;

  test.beforeAll(async ({ request }) => {
    analysisId = await createAnalysisViaAPI(request, sampleAnalyses[1]);
  });

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'owner');
  });

  test('should show loading spinner initially', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);

    // Check for loading indicator
    const loadingText = page.locator('text=/Loading analysis|Loading.../i');

    // Wait a bit to see if loader appears (might be fast)
    await page.waitForTimeout(100);

    // Either loading is visible or page loaded quickly
    const isLoadingVisible = await loadingText.isVisible().catch(() => false);
    const isTitleVisible = await page.locator('h1').isVisible().catch(() => false);

    expect(isLoadingVisible || isTitleVisible).toBeTruthy();
  });

  test('should transition from loading to content', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);

    // Wait for loading to complete
    await waitForLoadingComplete(page);

    // Content should be visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Competitors')).toBeVisible();
  });
});

test.describe('View Analysis Detail - Empty States', () => {
  let emptyAnalysisId: string;

  test.beforeAll(async ({ request }) => {
    // Create analysis with no competitors
    emptyAnalysisId = await createAnalysisViaAPI(request, {
      title: 'Empty Analysis Test',
      target_company_name: 'Test Company',
    });
  });

  test.afterAll(async ({ request }) => {
    if (emptyAnalysisId) {
      await deleteAnalysisViaAPI(request, emptyAnalysisId);
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'owner');
  });

  test('should show empty state when no competitors added', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${emptyAnalysisId}`);
    await waitForLoadingComplete(page);

    // Should show "0" competitors
    await expect(page.locator('text=/^0$/')).toBeVisible();

    // Should show empty state message
    await expect(page.locator('text=/No competitors|Add competitors/i')).toBeVisible();
  });

  test('should show "Add competitors" CTA in empty state', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${emptyAnalysisId}`);
    await waitForLoadingComplete(page);

    // Click Competitors tab to see empty state
    await page.click('text=Competitors');

    // Should show empty state with CTA
    await expect(page.locator('text=/No competitors|Add Your First Competitor/i')).toBeVisible();
    await expect(page.locator('button:has-text("Add")')).toBeVisible();
  });

  test('should show N/A for metrics when no data', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${emptyAnalysisId}`);
    await waitForLoadingComplete(page);

    // Moat score should show N/A (since no competitors)
    await expect(page.locator('text=N/A')).toBeVisible();
  });
});
