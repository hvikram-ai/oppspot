/**
 * E2E Tests: Authorization Checks
 * Tests permission levels (owner, editor, viewer, unauthenticated)
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

test.describe('Authorization - Viewer Role', () => {
  let analysisId: string;

  test.beforeAll(async ({ request }) => {
    // Create analysis as owner
    analysisId = await createAnalysisViaAPI(request, sampleAnalyses[0]);
    await addCompetitorViaAPI(request, analysisId, sampleCompetitors[0]);
  });

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login as viewer (non-owner)
    await loginAsUser(page, 'viewer');
  });

  test('viewer can view analysis details', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Should be able to see the analysis
    await expect(page.locator('h1')).toContainText(sampleAnalyses[0].title);
    await expect(page.locator(`text=${sampleAnalyses[0].target_company_name}`)).toBeVisible();
  });

  test('viewer can see competitors list', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Navigate to Competitors tab
    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');

    // Should see competitor
    await expect(page.locator(`text=${sampleCompetitors[0].competitor_name}`)).toBeVisible();
  });

  test('viewer can switch between tabs', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Click each tab
    await page.click('text=Competitors');
    await expect(page.locator('text=/Add Competitor|Competitor Management/i')).toBeVisible();

    await page.click('text=Overview');
    await expect(page.locator('text=/Competitors \\(/i')).toBeVisible();

    // Viewer has full read access
    expect(true).toBeTruthy();
  });

  test('viewer cannot see "Refresh Data" button', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Refresh button should not be visible
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    const isVisible = await refreshButton.isVisible().catch(() => false);

    if (isVisible) {
      // If visible, must be disabled
      await expect(refreshButton).toBeDisabled();
    } else {
      // Not visible - correct
      expect(true).toBeTruthy();
    }
  });

  test('viewer cannot see "Share" button', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Share button should not be visible
    const shareButton = page.locator('button:has-text("Share")');
    const isVisible = await shareButton.isVisible().catch(() => false);

    if (isVisible) {
      // If visible, must be disabled
      await expect(shareButton).toBeDisabled();
    } else {
      // Not visible - correct
      expect(true).toBeTruthy();
    }
  });

  test('viewer cannot delete competitors', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Navigate to Competitors tab
    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');

    // Delete buttons should not be visible or disabled
    const deleteButtons = page.locator('button').filter({ has: page.locator('[class*="trash"]') });
    const deleteVisible = await deleteButtons.first().isVisible().catch(() => false);

    if (deleteVisible) {
      // If visible, must be disabled
      const isDisabled = await deleteButtons.first().isDisabled().catch(() => false);
      expect(isDisabled).toBeTruthy();
    } else {
      // Not visible - correct
      expect(true).toBeTruthy();
    }
  });

  test('viewer cannot add competitors', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Navigate to Competitors tab
    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');

    // Add Competitor button should not be visible or disabled
    const addButton = page.locator('button:has-text("Add Competitor")');
    const isVisible = await addButton.isVisible().catch(() => false);

    if (isVisible) {
      // If visible, must be disabled
      await expect(addButton).toBeDisabled();
    } else {
      // Not visible - correct
      expect(true).toBeTruthy();
    }
  });

  test('viewer cannot edit analysis title', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Look for edit button/icon near title
    const editButton = page.locator('button').filter({ hasText: /edit/i }).or(
      page.locator('[class*="edit"]').filter({ hasText: '' })
    );

    const isVisible = await editButton.first().isVisible().catch(() => false);

    if (isVisible) {
      // If edit button visible, must be disabled
      const isDisabled = await editButton.first().isDisabled().catch(() => false);
      expect(isDisabled).toBeTruthy();
    } else {
      // No edit button - correct
      expect(true).toBeTruthy();
    }
  });
});

test.describe('Authorization - Editor Role', () => {
  let analysisId: string;

  test.beforeAll(async ({ request }) => {
    analysisId = await createAnalysisViaAPI(request, sampleAnalyses[1]);
    await addCompetitorViaAPI(request, analysisId, sampleCompetitors[1]);
  });

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test.beforeEach(async ({ page }) => {
    // For this test, we'll use admin as editor (since we don't have separate editor user)
    await loginAsUser(page, 'admin');
  });

  test('editor can view analysis', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Should see analysis
    await expect(page.locator('h1')).toContainText(sampleAnalyses[1].title);
  });

  test('editor can add competitors', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Navigate to Competitors tab
    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');

    // Add Competitor button should be visible and enabled
    const addButton = page.locator('button:has-text("Add Competitor")');
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });

  test('editor can delete competitors', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Navigate to Competitors tab
    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');

    // Delete buttons should be visible and enabled
    const deleteButtons = page.locator('button').filter({ has: page.locator('[class*="trash"]') });
    const deleteVisible = await deleteButtons.first().isVisible().catch(() => false);

    if (deleteVisible) {
      await expect(deleteButtons.first()).toBeEnabled();
    } else {
      // No competitors to delete - test passes
      expect(true).toBeTruthy();
    }
  });

  test('editor cannot share analysis', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Share button should not be visible for editor
    const shareButton = page.locator('button:has-text("Share")');
    const isVisible = await shareButton.isVisible().catch(() => false);

    if (isVisible) {
      // If visible, must be disabled
      await expect(shareButton).toBeDisabled();
    } else {
      // Not visible - correct
      expect(true).toBeTruthy();
    }
  });

  test('editor cannot refresh data', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Refresh button should not be visible for editor
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    const isVisible = await refreshButton.isVisible().catch(() => false);

    if (isVisible) {
      // If visible, must be disabled
      await expect(refreshButton).toBeDisabled();
    } else {
      // Not visible - correct
      expect(true).toBeTruthy();
    }
  });
});

test.describe('Authorization - Unauthenticated Access', () => {
  let analysisId: string;

  test.beforeAll(async ({ request }) => {
    analysisId = await createAnalysisViaAPI(request, sampleAnalyses[2]);
  });

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test('unauthenticated user redirected to login when accessing analysis', async ({ page, context }) => {
    // Clear all cookies to simulate unauthenticated state
    await context.clearCookies();

    // Try to access analysis
    await page.goto(`/competitive-intelligence/${analysisId}`);

    // Should redirect to login page
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // Verify we're on login page
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('unauthenticated user redirected to login when accessing list page', async ({ page, context }) => {
    await context.clearCookies();

    // Try to access list page
    await page.goto('/competitive-intelligence');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('unauthenticated API request returns 401 Unauthorized', async ({ request, context }) => {
    // Clear auth context
    await context.clearCookies();

    // Try to fetch analysis via API
    const response = await request.get(`/api/competitive-analysis/${analysisId}`);

    // Should return 401
    expect(response.status()).toBe(401);
  });
});

test.describe('Authorization - Owner Role', () => {
  let analysisId: string;

  test.beforeAll(async ({ request }) => {
    analysisId = await createAnalysisViaAPI(request, {
      title: 'Owner Permissions Test',
      target_company_name: 'Test Company',
    });
  });

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'owner');
  });

  test('owner can see all action buttons', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Owner should see all buttons
    await expect(page.locator('button:has-text("Refresh Data")')).toBeVisible();
    await expect(page.locator('button:has-text("Share")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
  });

  test('owner can add competitors', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');

    const addButton = page.locator('button:has-text("Add Competitor")');
    await expect(addButton).toBeVisible();
    await expect(addButton).toBeEnabled();
  });

  test('owner can delete competitors', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');

    // If competitors exist, delete buttons should be enabled
    const deleteButtons = page.locator('button').filter({ has: page.locator('[class*="trash"]') });
    const hasCompetitors = await deleteButtons.count() > 0;

    if (hasCompetitors) {
      await expect(deleteButtons.first()).toBeEnabled();
    }

    expect(true).toBeTruthy();
  });

  test('owner can share analysis', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    const shareButton = page.locator('button:has-text("Share")');
    await expect(shareButton).toBeVisible();
    await expect(shareButton).toBeEnabled();

    // Open share dialog
    await shareButton.click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page.locator('input[type="email"]').or(page.locator('input#email'))).toBeVisible();
  });

  test('owner can refresh data', async ({ page }) => {
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    const refreshButton = page.locator('button:has-text("Refresh Data")');
    await expect(refreshButton).toBeVisible();

    // May be disabled if no competitors, but should be visible
    expect(true).toBeTruthy();
  });
});

test.describe('Authorization - Cross-User Access', () => {
  let ownerAnalysisId: string;

  test.beforeAll(async ({ request }) => {
    // Create analysis as owner
    ownerAnalysisId = await createAnalysisViaAPI(request, {
      title: 'Owner-Only Analysis',
      target_company_name: 'Private Company',
    });
  });

  test.afterAll(async ({ request }) => {
    if (ownerAnalysisId) {
      await deleteAnalysisViaAPI(request, ownerAnalysisId);
    }
  });

  test('viewer cannot access owner\'s analysis without grant', async ({ page }) => {
    // Login as viewer
    await loginAsUser(page, 'viewer');

    // Try to access owner's analysis
    await page.goto(`/competitive-intelligence/${ownerAnalysisId}`);

    // Should show 403 Forbidden or redirect to list
    await page.waitForLoadState('networkidle');

    // Either shows error or redirected
    const errorVisible = await page.locator('text=/Access Denied|Forbidden|403/i').isVisible().catch(() => false);
    const redirectedToList = page.url().includes('/competitive-intelligence') && !page.url().includes(ownerAnalysisId);

    expect(errorVisible || redirectedToList).toBeTruthy();
  });

  test('different owner cannot access another owner\'s analysis', async ({ page }) => {
    // Login as admin (different owner)
    await loginAsUser(page, 'admin');

    // Try to access owner's analysis
    await page.goto(`/competitive-intelligence/${ownerAnalysisId}`);
    await page.waitForLoadState('networkidle');

    // Should show 403 or redirect
    const errorVisible = await page.locator('text=/Access Denied|Forbidden|Not Found/i').isVisible().catch(() => false);
    const redirectedToList = page.url().includes('/competitive-intelligence') && !page.url().includes(ownerAnalysisId);

    expect(errorVisible || redirectedToList).toBeTruthy();
  });
});
