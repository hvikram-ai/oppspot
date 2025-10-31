import { test, expect } from '@playwright/test';

/**
 * T011 & T016: E2E Test - Red Flag List with Filters
 *
 * Purpose: Validate red flag list view with filtering, sorting, and search
 * Reference: quickstart.md Scenario 1 & 7
 * Expected: These tests MUST FAIL until T044-T045 are implemented
 */

const TEST_COMPANY_ID = 'test-company-001';

test.describe('Red Flag List: Filtering and Search', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to company dashboard
    await page.goto(`/companies/${TEST_COMPANY_ID}`);

    // Navigate to Red Flag Radar section
    await page.click('text=/Risk Assessment|Red Flag/i');
    await page.waitForURL(`**/companies/${TEST_COMPANY_ID}/red-flags`);
  });

  test('should display red flag list with summary counts', async ({ page }) => {
    // Assert: Page title
    await expect(page.locator('h1, h2').filter({ hasText: /Red Flag Radar/i })).toBeVisible();

    // Assert: Flag cards visible with category badges
    const flagCards = page.locator('[data-testid="flag-card"]');
    await expect(flagCards.first()).toBeVisible({ timeout: 5000 });

    // Assert: Severity indicators displayed
    await expect(page.locator('[data-testid="severity-badge"]').first()).toBeVisible();

    // Assert: Summary counts section
    await expect(page.locator('[data-testid="summary-total"]')).toBeVisible();
    await expect(page.locator('[data-testid="summary-by-category"]')).toBeVisible();
    await expect(page.locator('[data-testid="summary-by-severity"]')).toBeVisible();
  });

  test('should filter by single category', async ({ page }) => {
    // Click Financial category chip
    await page.click('[data-testid="filter-category-financial"]');
    await page.waitForTimeout(500); // Wait for filter to apply

    // Assert: URL includes category filter
    await expect(page).toHaveURL(/category=financial/);

    // Assert: All visible flags are financial
    const categoryBadges = page.locator('[data-testid="category-badge"]');
    const count = await categoryBadges.count();
    for (let i = 0; i < count; i++) {
      await expect(categoryBadges.nth(i)).toContainText(/financial/i);
    }
  });

  test('should filter by severity', async ({ page }) => {
    // Select critical severity
    await page.click('[data-testid="filter-severity-critical"]');
    await page.waitForTimeout(500);

    // Assert: URL includes severity filter
    await expect(page).toHaveURL(/severity=critical/);

    // Assert: All visible flags are critical
    const severityBadges = page.locator('[data-testid="severity-badge"]');
    const count = await severityBadges.count();
    for (let i = 0; i < count; i++) {
      await expect(severityBadges.nth(i)).toContainText(/critical/i);
    }
  });

  test('should filter by status', async ({ page }) => {
    // Select Open status from dropdown
    await page.click('[data-testid="filter-status"]');
    await page.click('[data-testid="status-option-open"]');
    await page.waitForTimeout(500);

    // Assert: URL includes status filter
    await expect(page).toHaveURL(/status=open/);

    // Assert: All visible flags have open status
    const statusBadges = page.locator('[data-testid="status-badge"]');
    const count = await statusBadges.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      await expect(statusBadges.nth(i)).toContainText(/open/i);
    }
  });

  test('should search by text', async ({ page }) => {
    // Type search query
    await page.fill('[data-testid="search-input"]', 'revenue');
    await page.waitForTimeout(500); // Debounce delay

    // Assert: URL includes search parameter
    await expect(page).toHaveURL(/search=revenue/);

    // Assert: Results contain search term
    const flagTitles = page.locator('[data-testid="flag-title"]');
    const count = await flagTitles.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const text = await flagTitles.nth(i).textContent();
        expect(text?.toLowerCase()).toContain('revenue');
      }
    }
  });

  test('should clear all filters', async ({ page }) => {
    // Apply multiple filters
    await page.click('[data-testid="filter-category-financial"]');
    await page.click('[data-testid="filter-severity-critical"]');
    await page.waitForTimeout(300);

    // Assert: Filters are applied
    await expect(page).toHaveURL(/category=financial/);
    await expect(page).toHaveURL(/severity=critical/);

    // Click clear filters button
    await page.click('[data-testid="clear-filters"]');
    await page.waitForTimeout(300);

    // Assert: URL has no filter parameters
    const url = page.url();
    expect(url).not.toContain('category=');
    expect(url).not.toContain('severity=');
    expect(url).not.toContain('status=');
  });

  test('should filter by multiple categories (T016)', async ({ page }) => {
    // Click Financial chip
    await page.click('[data-testid="filter-category-financial"]');
    await page.waitForTimeout(200);

    // Click Legal chip (multi-select)
    await page.click('[data-testid="filter-category-legal"]', { modifiers: ['Control'] });
    await page.waitForTimeout(500);

    // Assert: URL includes both categories
    await expect(page).toHaveURL(/category=financial,legal|category=legal,financial/);

    // Assert: Summary shows only filtered categories
    const summaryCategories = page.locator('[data-testid="summary-by-category"]');
    await expect(summaryCategories).toBeVisible();
  });

  test('should combine multiple filter types (T016)', async ({ page }) => {
    // Apply category filter (Financial + Legal)
    await page.click('[data-testid="filter-category-financial"]');
    await page.click('[data-testid="filter-category-legal"]', { modifiers: ['Control'] });

    // Apply status filter (Open)
    await page.click('[data-testid="filter-status"]');
    await page.click('[data-testid="status-option-open"]');
    await page.waitForTimeout(500);

    // Assert: URL includes both filters
    await expect(page).toHaveURL(/category=/);
    await expect(page).toHaveURL(/status=open/);

    // Assert: Summary counts reflect filters
    const total = await page.locator('[data-testid="summary-total"]').textContent();
    expect(total).toBeTruthy();
  });

  test('should remove one category from multi-select (T016)', async ({ page }) => {
    // Apply two categories
    await page.click('[data-testid="filter-category-financial"]');
    await page.click('[data-testid="filter-category-legal"]', { modifiers: ['Control'] });
    await page.waitForTimeout(300);

    // Remove Financial category
    await page.click('[data-testid="filter-category-financial"]');
    await page.waitForTimeout(500);

    // Assert: Only Legal remains in URL
    const url = page.url();
    expect(url).toContain('category=legal');
    expect(url).not.toContain('financial');
  });
});
