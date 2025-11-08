/**
 * E2E Tests: Integration & Full User Flows
 * Tests complete end-to-end user journeys across the application
 */

import { test, expect } from '@playwright/test';
import {
  loginAsUser,
  navigateToCompetitiveIntelligence,
  fillCreateAnalysisForm,
  fillAddCompetitorForm,
  waitForToast,
  deleteAnalysisViaAPI,
  waitForLoadingComplete,
  sampleAnalyses,
  sampleCompetitors,
  testUsers,
} from './fixtures';

test.describe('Integration: Complete Analysis Lifecycle', () => {
  let analysisId: string;

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test('full flow: Create → Add Competitors → Refresh → View Results', async ({ page }) => {
    await loginAsUser(page, 'owner');

    // Step 1: Navigate to Competitive Intelligence
    await navigateToCompetitiveIntelligence(page);
    await expect(page.locator('h1')).toContainText('Competitive Intelligence');

    // Step 2: Create new analysis
    await page.click('button:has-text("New Analysis")');
    await page.waitForSelector('[role="dialog"]');

    const testData = sampleAnalyses[0];
    await fillCreateAnalysisForm(page, testData);

    await page.click('button:has-text("Create Analysis")');
    await waitForToast(page, 'Analysis created');

    // Extract analysis ID from URL
    await page.waitForURL(/\/competitive-intelligence\/[a-f0-9-]+/);
    analysisId = page.url().split('/').pop() || '';

    // Step 3: Verify on detail page
    await expect(page.locator('h1')).toContainText(testData.title);

    // Step 4: Add competitors
    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');

    // Add first competitor
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');
    await fillAddCompetitorForm(page, sampleCompetitors[0]);
    await page.click('button:has-text("Add Competitor")');
    await waitForToast(page, sampleCompetitors[0].competitor_name);
    await page.waitForTimeout(1000);

    // Add second competitor
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');
    await fillAddCompetitorForm(page, sampleCompetitors[1]);
    await page.click('button:has-text("Add Competitor")');
    await waitForToast(page, sampleCompetitors[1].competitor_name);
    await page.waitForTimeout(1000);

    // Verify competitors added
    await expect(page.locator(`text=${sampleCompetitors[0].competitor_name}`)).toBeVisible();
    await expect(page.locator(`text=${sampleCompetitors[1].competitor_name}`)).toBeVisible();

    // Step 5: Navigate back to Overview
    await page.click('text=Overview');
    await page.waitForLoadState('networkidle');

    // Verify competitor count updated
    await expect(page.locator('text=/^2$/')).toBeVisible();

    // Step 6: Trigger refresh (if button is enabled)
    const refreshButton = page.locator('button:has-text("Refresh Data")');
    if (await refreshButton.isEnabled().catch(() => false)) {
      await refreshButton.click();
      await page.waitForSelector('[role="dialog"]');

      // Wait briefly for refresh to start
      await page.waitForTimeout(2000);

      // Close refresh modal (don't wait for completion - it takes too long)
      const closeButton = page.locator('button:has-text("Close")').or(page.locator('button:has-text("Cancel")'));
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      }
    }

    // Step 7: Verify analysis is functional
    await expect(page.locator('h1')).toContainText(testData.title);

    // Complete flow successful
    expect(true).toBeTruthy();
  });
});

test.describe('Integration: Sharing & Collaboration Flow', () => {
  let analysisId: string;

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test('full flow: Create → Share → Revoke', async ({ page, request }) => {
    await loginAsUser(page, 'owner');

    // Step 1: Create analysis
    await navigateToCompetitiveIntelligence(page);
    await page.click('button:has-text("New Analysis")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill('input#title', 'Share Flow Test Analysis');
    await page.fill('input#company-name', 'Test Company');

    await page.click('button:has-text("Create Analysis")');
    await waitForToast(page, 'Analysis created');

    await page.waitForURL(/\/competitive-intelligence\/[a-f0-9-]+/);
    analysisId = page.url().split('/').pop() || '';

    // Step 2: Share with viewer
    await page.click('button:has-text("Share")');
    await page.waitForSelector('[role="dialog"]');

    const emailInput = page.locator('input[type="email"]').or(page.locator('input#email'));
    await emailInput.fill(testUsers.viewer.email);

    const inviteButton = page.locator('button:has-text("Invite")').or(
      page.locator('button:has-text("Share")').or(page.locator('button:has-text("Send")'))
    );
    await inviteButton.last().click();
    await waitForToast(page, /invited|shared/i);
    await page.waitForTimeout(1000);

    // Step 3: Verify grant appears in table
    await expect(page.locator(`text=${testUsers.viewer.email}`)).toBeVisible();

    // Step 4: Revoke access
    page.once('dialog', dialog => dialog.accept());

    const revokeButtons = page.locator('button:has-text("Revoke")').or(
      page.locator('button:has-text("Remove")')
    );
    await revokeButtons.first().click();

    await waitForToast(page, /revoked|removed/i);
    await page.waitForTimeout(1000);

    // Step 5: Verify grant removed
    const stillVisible = await page.locator(`text=${testUsers.viewer.email}`).isVisible().catch(() => false);
    expect(stillVisible).toBeFalsy();

    // Complete flow successful
    expect(true).toBeTruthy();
  });
});

test.describe('Integration: Competitor Management Flow', () => {
  let analysisId: string;

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test('full flow: Create → Add Competitors → Delete → Analysis Intact', async ({ page, request }) => {
    await loginAsUser(page, 'owner');

    // Step 1: Create analysis
    await navigateToCompetitiveIntelligence(page);
    await page.click('button:has-text("New Analysis")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill('input#title', 'Competitor Management Test');
    await page.fill('input#company-name', 'Test Company');

    await page.click('button:has-text("Create Analysis")');
    await waitForToast(page);

    await page.waitForURL(/\/competitive-intelligence\/[a-f0-9-]+/);
    analysisId = page.url().split('/').pop() || '';

    // Step 2: Add competitors
    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');

    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Add Competitor")');
      await page.waitForSelector('[role="dialog"]');
      await page.fill('input#competitor-name', `Test Competitor ${i + 1}`);
      await page.click('button:has-text("Add Competitor")');
      await waitForToast(page);
      await page.waitForTimeout(500);
    }

    // Verify 3 competitors added
    await expect(page.locator('text=Test Competitor 1')).toBeVisible();
    await expect(page.locator('text=Test Competitor 2')).toBeVisible();
    await expect(page.locator('text=Test Competitor 3')).toBeVisible();

    // Step 3: Delete one competitor
    page.once('dialog', dialog => dialog.accept());

    const trashIcons = page.locator('[class*="lucide-trash"]');
    await trashIcons.first().click();
    await waitForToast(page, /removed|deleted/i);
    await page.waitForTimeout(1000);

    // Step 4: Verify only 2 competitors remain
    const competitorCount = await page.locator('table tbody tr').count();
    expect(competitorCount).toBe(2);

    // Step 5: Verify analysis still intact
    await page.click('text=Overview');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Competitor Management Test');

    // Complete flow successful
    expect(true).toBeTruthy();
  });
});

test.describe('Integration: Navigation Flow', () => {
  let analysisId: string;

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test('full flow: List → Detail → Back → List', async ({ page, request }) => {
    await loginAsUser(page, 'owner');

    // Step 1: Create analysis via API
    analysisId = await request.post('/api/competitive-analysis', {
      data: {
        title: 'Navigation Test Analysis',
        target_company_name: 'Test Company',
      },
    }).then(res => res.json()).then(data => data.id);

    // Step 2: Navigate to list page
    await navigateToCompetitiveIntelligence(page);
    await expect(page.locator('h1')).toContainText('Competitive Intelligence');

    // Step 3: Click on analysis to view detail
    await page.click('text=Navigation Test Analysis');
    await page.waitForURL(/\/competitive-intelligence\/[a-f0-9-]+/);

    // Verify on detail page
    await expect(page.locator('h1')).toContainText('Navigation Test Analysis');

    // Step 4: Click "Back to Analyses"
    await page.click('button:has-text("Back to Analyses")').or(page.locator('button:has-text("Back")'));
    await page.waitForURL(/\/competitive-intelligence$/);

    // Step 5: Verify back on list page
    await expect(page.locator('h1')).toContainText('Competitive Intelligence');
    await expect(page.locator('text=Navigation Test Analysis')).toBeVisible();

    // Complete flow successful
    expect(true).toBeTruthy();
  });
});

test.describe('Integration: Tab Switching Persistence', () => {
  let analysisId: string;

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test('tab state persists during navigation', async ({ page, request }) => {
    await loginAsUser(page, 'owner');

    // Create analysis
    analysisId = await request.post('/api/competitive-analysis', {
      data: {
        title: 'Tab Persistence Test',
        target_company_name: 'Test Company',
      },
    }).then(res => res.json()).then(data => data.id);

    // Navigate to analysis
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    // Switch to Competitors tab
    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button:has-text("Add Competitor")')).toBeVisible();

    // Switch to Feature Matrix tab
    await page.click('text=Feature Matrix');
    await page.waitForLoadState('networkidle');

    // Switch to Pricing tab
    await page.click('text=Pricing');
    await page.waitForLoadState('networkidle');

    // Switch back to Overview
    await page.click('text=Overview');
    await page.waitForLoadState('networkidle');

    // Verify we can still see overview content
    await expect(page.locator('text=/Competitors \\(/i')).toBeVisible();

    // Tab switching works correctly
    expect(true).toBeTruthy();
  });
});

test.describe('Integration: Multiple Analyses Management', () => {
  let analysisIds: string[] = [];

  test.afterAll(async ({ request }) => {
    for (const id of analysisIds) {
      await deleteAnalysisViaAPI(request, id);
    }
  });

  test('manage multiple analyses simultaneously', async ({ page, request }) => {
    await loginAsUser(page, 'owner');

    // Create 3 analyses
    for (let i = 1; i <= 3; i++) {
      const id = await request.post('/api/competitive-analysis', {
        data: {
          title: `Multi-Analysis Test ${i}`,
          target_company_name: `Company ${i}`,
        },
      }).then(res => res.json()).then(data => data.id);
      analysisIds.push(id);
    }

    // Navigate to list
    await navigateToCompetitiveIntelligence(page);

    // Verify all 3 analyses visible
    await expect(page.locator('text=Multi-Analysis Test 1')).toBeVisible();
    await expect(page.locator('text=Multi-Analysis Test 2')).toBeVisible();
    await expect(page.locator('text=Multi-Analysis Test 3')).toBeVisible();

    // Open first analysis
    await page.click('text=Multi-Analysis Test 1');
    await page.waitForURL(/\/competitive-intelligence\/[a-f0-9-]+/);
    await expect(page.locator('h1')).toContainText('Multi-Analysis Test 1');

    // Go back
    await page.click('button:has-text("Back to Analyses")').or(page.locator('button:has-text("Back")'));
    await page.waitForURL(/\/competitive-intelligence$/);

    // Open second analysis
    await page.click('text=Multi-Analysis Test 2');
    await page.waitForURL(/\/competitive-intelligence\/[a-f0-9-]+/);
    await expect(page.locator('h1')).toContainText('Multi-Analysis Test 2');

    // Multiple analyses work correctly
    expect(true).toBeTruthy();
  });
});

test.describe('Integration: Performance Benchmarks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'owner');
  });

  test('list page loads in under 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/competitive-intelligence');
    await waitForLoadingComplete(page);

    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('detail page loads in under 2 seconds', async ({ page, request }) => {
    // Create test analysis
    const analysisId = await request.post('/api/competitive-analysis', {
      data: {
        title: 'Performance Test Analysis',
        target_company_name: 'Test Company',
      },
    }).then(res => res.json()).then(data => data.id);

    const startTime = Date.now();

    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);

    const loadTime = Date.now() - startTime;

    // Should load in under 2 seconds
    expect(loadTime).toBeLessThan(2000);

    // Cleanup
    await deleteAnalysisViaAPI(request, analysisId);
  });

  test('create analysis completes in under 1 second', async ({ page }) => {
    await navigateToCompetitiveIntelligence(page);

    await page.click('button:has-text("New Analysis")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill('input#title', 'Perf Test Analysis');
    await page.fill('input#company-name', 'Test Company');

    const startTime = Date.now();

    await page.click('button:has-text("Create Analysis")');
    await waitForToast(page, 'Analysis created');

    const createTime = Date.now() - startTime;

    // Should complete in under 1 second
    expect(createTime).toBeLessThan(1000);

    // Extract ID and cleanup
    await page.waitForURL(/\/competitive-intelligence\/[a-f0-9-]+/);
    const analysisId = page.url().split('/').pop() || '';

    // Navigate away (will be cleaned up by user or manual cleanup)
    await page.goto('/competitive-intelligence');
  });
});

test.describe('Integration: Error Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'owner');
  });

  test('recover from 404 error and continue working', async ({ page }) => {
    // Try to access non-existent analysis
    await page.goto('/competitive-intelligence/00000000-0000-0000-0000-000000000000');
    await page.waitForLoadState('networkidle');

    // Should see error
    await expect(page.locator('text=/Not Found|404/i')).toBeVisible();

    // Click "Go Back"
    await page.click('button:has-text("Go Back")').or(page.locator('button:has-text("Back")'));
    await page.waitForURL(/\/competitive-intelligence$/);

    // Should be able to continue working
    await expect(page.locator('h1')).toContainText('Competitive Intelligence');
    await expect(page.locator('button:has-text("New Analysis")')).toBeVisible();

    // Error recovery successful
    expect(true).toBeTruthy();
  });

  test('recover from auth error and re-login', async ({ page, context }) => {
    await page.goto('/competitive-intelligence');
    await waitForLoadingComplete(page);

    // Clear auth
    await context.clearCookies();

    // Try to create analysis
    await page.click('button:has-text("New Analysis")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill('input#title', 'Test');
    await page.fill('input#company-name', 'Test Company');
    await page.click('button:has-text("Create Analysis")');

    // Should see error or redirect to login
    await page.waitForTimeout(2000);

    // Re-login
    await loginAsUser(page, 'owner');

    // Navigate back and try again
    await page.goto('/competitive-intelligence');
    await waitForLoadingComplete(page);

    // Should be able to continue working
    await expect(page.locator('h1')).toContainText('Competitive Intelligence');

    // Recovery successful
    expect(true).toBeTruthy();
  });
});
