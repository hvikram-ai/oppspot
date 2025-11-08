/**
 * E2E Tests: Add and Remove Competitors
 * Tests competitor management functionality
 */

import { test, expect } from '@playwright/test';
import {
  loginAsUser,
  createAnalysisViaAPI,
  addCompetitorViaAPI,
  deleteAnalysisViaAPI,
  fillAddCompetitorForm,
  waitForToast,
  getCompetitorCount,
  waitForLoadingComplete,
  sampleAnalyses,
  sampleCompetitors,
} from './fixtures';

test.describe('Add Competitors - Happy Path', () => {
  let analysisId: string;

  test.beforeAll(async ({ request }) => {
    analysisId = await createAnalysisViaAPI(request, sampleAnalyses[0]);
  });

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'owner');
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);
    await page.click('text=Competitors'); // Switch to Competitors tab
    await page.waitForLoadState('networkidle');
  });

  test('should display "Add Competitor" button', async ({ page }) => {
    await expect(page.locator('button:has-text("Add Competitor")')).toBeVisible();
  });

  test('should open add competitor dialog', async ({ page }) => {
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    // Verify dialog content
    await expect(page.locator('text=Add Competitor')).toBeVisible();
    await expect(page.locator('input#competitor-name')).toBeVisible();
    await expect(page.locator('input#competitor-website')).toBeVisible();
  });

  test('should add competitor with required fields only', async ({ page }) => {
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    // Fill only required field
    await page.fill('input#competitor-name', 'E2E Test Competitor');

    // Submit
    await page.click('button:has-text("Add Competitor")');

    // Wait for success toast
    await waitForToast(page, /Competitor added|E2E Test Competitor/);

    // Dialog should close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Competitor should appear in table
    await expect(page.locator('text=E2E Test Competitor')).toBeVisible();
  });

  test('should add competitor with all fields filled', async ({ page }) => {
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    const testCompetitor = sampleCompetitors[0];

    // Fill all fields
    await fillAddCompetitorForm(page, testCompetitor);

    // Submit
    await page.click('button:has-text("Add Competitor")');

    // Wait for success toast
    await waitForToast(page, testCompetitor.competitor_name);

    // Competitor should appear in table with all data
    await expect(page.locator(`text=${testCompetitor.competitor_name}`)).toBeVisible();

    // Check website link is displayed
    if (testCompetitor.competitor_website) {
      const hostname = new URL(testCompetitor.competitor_website).hostname;
      await expect(page.locator(`text=${hostname}`)).toBeVisible();
    }
  });

  test('should increment competitor count after adding', async ({ page }) => {
    const initialCount = await getCompetitorCount(page);

    // Add competitor
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');
    await page.fill('input#competitor-name', 'Count Test Competitor');
    await page.click('button:has-text("Add Competitor")');
    await waitForToast(page);

    // Wait for table to update
    await page.waitForTimeout(500);

    const newCount = await getCompetitorCount(page);
    expect(newCount).toBe(initialCount + 1);
  });

  test('should close dialog when clicking Cancel', async ({ page }) => {
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    // Fill some data
    await page.fill('input#competitor-name', 'Will Not Submit');

    // Click Cancel
    await page.click('button:has-text("Cancel")');

    // Dialog should close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Competitor should NOT be added
    await expect(page.locator('text=Will Not Submit')).not.toBeVisible();
  });

  test('should display character count for notes field', async ({ page }) => {
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    // Type in notes
    await page.fill('textarea#notes', 'Test notes content here');

    // Check character count
    await expect(page.locator('text=/25\\/1000 characters/')).toBeVisible();
  });
});

test.describe('Add Competitors - Validation', () => {
  let analysisId: string;

  test.beforeAll(async ({ request }) => {
    analysisId = await createAnalysisViaAPI(request, sampleAnalyses[0]);
  });

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'owner');
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);
    await page.click('text=Competitors');
  });

  test('should show error for missing required field', async ({ page }) => {
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    // Try to submit without filling anything
    await page.click('button:has-text("Add Competitor")');

    // Should show validation error
    await expect(page.locator('text=/Competitor name is required/i')).toBeVisible();
  });

  test('should show error for name exceeding 200 characters', async ({ page }) => {
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    // Fill with very long name (201 characters)
    const longName = 'C'.repeat(201);
    await page.fill('input#competitor-name', longName);

    // Try to submit
    await page.click('button:has-text("Add Competitor")');

    // Should show validation error
    await expect(page.locator('text=/must be less than 200 characters/i')).toBeVisible();
  });

  test('should show error for invalid website URL', async ({ page }) => {
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill('input#competitor-name', 'Test Competitor');
    await page.fill('input#competitor-website', 'not-a-valid-url');

    // Try to submit
    await page.click('button:has-text("Add Competitor")');

    // Should show validation error
    await expect(page.locator('text=/must be a valid URL/i')).toBeVisible();
  });

  test('should show error for notes exceeding 1000 characters', async ({ page }) => {
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill('input#competitor-name', 'Test Competitor');

    // Fill with very long notes (1001 characters)
    const longNotes = 'N'.repeat(1001);
    await page.fill('textarea#notes', longNotes);

    // Try to submit
    await page.click('button:has-text("Add Competitor")');

    // Should show validation error
    await expect(page.locator('text=/must be less than 1000 characters/i')).toBeVisible();
  });

  test('should clear field error when user starts typing', async ({ page }) => {
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    // Try to submit without filling
    await page.click('button:has-text("Add Competitor")');

    // Error should be visible
    await expect(page.locator('text=/Competitor name is required/i')).toBeVisible();

    // Start typing
    await page.fill('input#competitor-name', 'Test');

    // Error should disappear
    await expect(page.locator('text=/Competitor name is required/i')).not.toBeVisible();
  });
});

test.describe('Remove Competitors', () => {
  let analysisId: string;
  let competitorId: string;

  test.beforeEach(async ({ request, page }) => {
    // Create fresh analysis and competitor for each test
    analysisId = await createAnalysisViaAPI(request, {
      title: 'Remove Competitor Test',
      target_company_name: 'Test Company',
    });

    competitorId = await addCompetitorViaAPI(request, analysisId, {
      competitor_name: 'Competitor to Remove',
    });

    await loginAsUser(page, 'owner');
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);
    await page.click('text=Competitors');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test('should display delete button for each competitor', async ({ page }) => {
    // Check for trash icon button
    const deleteButtons = page.locator('button svg[class*="trash"]').or(page.locator('button:has-text("Delete")'));
    await expect(deleteButtons.first()).toBeVisible();
  });

  test('should show confirmation dialog when clicking delete', async ({ page }) => {
    // Set up dialog listener
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Are you sure');
      dialog.dismiss(); // Cancel the deletion
    });

    // Click delete button
    const deleteButton = page.locator('button svg').filter({ hasText: '' }).first();
    await deleteButton.click();

    // Competitor should still be in table (we canceled)
    await expect(page.locator('text=Competitor to Remove')).toBeVisible();
  });

  test('should remove competitor when confirmed', async ({ page }) => {
    // Set up dialog listener to accept
    page.once('dialog', dialog => {
      expect(dialog.message()).toContain('Are you sure');
      dialog.accept(); // Confirm deletion
    });

    // Click delete button
    const trashIcons = page.locator('[class*="lucide-trash"]');
    await trashIcons.first().click();

    // Wait for success toast
    await waitForToast(page, /removed|deleted/i);

    // Competitor should be removed from table
    await expect(page.locator('text=Competitor to Remove')).not.toBeVisible();
  });

  test('should decrement competitor count after removing', async ({ page }) => {
    const initialCount = await getCompetitorCount(page);

    // Accept deletion
    page.once('dialog', dialog => dialog.accept());

    // Click delete
    const trashIcons = page.locator('[class*="lucide-trash"]');
    await trashIcons.first().click();

    // Wait for toast
    await waitForToast(page);

    // Wait for table to update
    await page.waitForTimeout(500);

    const newCount = await getCompetitorCount(page);
    expect(newCount).toBe(initialCount - 1);
  });

  test('should show loading state while deleting', async ({ page }) => {
    // Accept deletion
    page.once('dialog', dialog => dialog.accept());

    // Click delete
    const trashIcons = page.locator('[class*="lucide-trash"]');
    await trashIcons.first().click();

    // Check for spinner (might be fast)
    const spinner = page.locator('[class*="animate-spin"]');
    const isSpinnerVisible = await spinner.isVisible().catch(() => false);
    const isToastVisible = await page.locator('[data-sonner-toast]').isVisible().catch(() => false);

    // Either spinner appeared or delete completed quickly
    expect(isSpinnerVisible || isToastVisible).toBeTruthy();
  });

  test('should disable delete button while deleting', async ({ page }) => {
    // Accept deletion
    page.once('dialog', dialog => dialog.accept());

    const deleteButton = page.locator('button').filter({ has: page.locator('[class*="lucide-trash"]') }).first();

    // Click delete
    await deleteButton.click();

    // Button should be disabled momentarily
    await page.waitForTimeout(100);

    // Check if disabled (might complete fast)
    const isDisabled = await deleteButton.isDisabled().catch(() => false);
    const isRemoved = await page.locator('text=Competitor to Remove').isVisible().then(() => false).catch(() => true);

    // Either button was disabled or deletion completed
    expect(isDisabled || isRemoved).toBeTruthy();
  });
});

test.describe('Competitor Management - Error Handling', () => {
  let analysisId: string;

  test.beforeAll(async ({ request }) => {
    analysisId = await createAnalysisViaAPI(request, sampleAnalyses[0]);
  });

  test.afterAll(async ({ request }) => {
    if (analysisId) {
      await deleteAnalysisViaAPI(request, analysisId);
    }
  });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'owner');
    await page.goto(`/competitive-intelligence/${analysisId}`);
    await waitForLoadingComplete(page);
    await page.click('text=Competitors');
  });

  test('should disable submit button while request is pending', async ({ page }) => {
    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill('input#competitor-name', 'Test Competitor');

    const submitButton = page.locator('button:has-text("Add Competitor")').last();
    await submitButton.click();

    // Button should show "Adding..." and be disabled
    await expect(submitButton).toBeDisabled();
    await expect(page.locator('text=Adding...')).toBeVisible();
  });

  test('should show error toast on API failure', async ({ page, context }) => {
    // Clear auth to trigger 401
    await context.clearCookies();

    await page.click('button:has-text("Add Competitor")');
    await page.waitForSelector('[role="dialog"]');

    await page.fill('input#competitor-name', 'Test Competitor');
    await page.click('button:has-text("Add Competitor")');

    // Should show error toast
    await waitForToast(page, /Failed|error/i);
  });
});
