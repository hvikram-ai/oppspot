import { test, expect } from '@playwright/test';

/**
 * T013: E2E Test - Flag Status Change to False Positive
 * Reference: quickstart.md Scenario 4
 * Expected: MUST FAIL until T050 is implemented
 */

const TEST_COMPANY_ID = 'test-company-001';

test.describe('Red Flag Actions', () => {
  test('should mark flag as false positive (T013)', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/red-flags`);

    // Open flag detail
    await page.click('[data-testid="flag-card"]', { timeout: 5000 });
    const drawer = page.locator('[data-testid="flag-detail-drawer"]');
    await expect(drawer).toBeVisible();

    // Change status to False Positive
    await page.click('[data-testid="change-status-button"]');
    await page.selectOption('[data-testid="status-dropdown"]', 'false_positive');

    // Provide reason
    const reasonDialog = page.locator('[data-testid="reason-dialog"]');
    await expect(reasonDialog).toBeVisible();
    await page.fill('[data-testid="reason-textarea"]', 'SLA breach was due to planned maintenance window');
    await page.click('[data-testid="confirm-button"]');

    // Assert: Status updated
    await expect(page.locator('[data-testid="flag-status"]')).toContainText(/false.?positive/i);
    await expect(page.locator('text=/marked as false positive/i')).toBeVisible();

    // Assert: Action logged in history
    const actionHistory = page.locator('[data-testid="action-history"]');
    await expect(actionHistory.locator('text=/status_change/i')).toBeVisible();
    await expect(actionHistory.locator('text=/false_positive/i')).toBeVisible();
  });
});
