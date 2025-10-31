import { test, expect } from '@playwright/test';

/**
 * T012: E2E Test - Red Flag Detail with Evidence
 * Reference: quickstart.md Scenario 3
 * Expected: MUST FAIL until T047-T049 are implemented
 */

const TEST_COMPANY_ID = 'test-company-001';
const TEST_FLAG_TITLE = 'Revenue Concentration Risk';

test.describe('Red Flag Detail View', () => {
  test('should display comprehensive flag detail (T012)', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/red-flags`);

    // Click first flag card
    await page.click(`[data-testid="flag-card"]:has-text("${TEST_FLAG_TITLE}")`);

    // Assert: Detail drawer opens
    const drawer = page.locator('[data-testid="flag-detail-drawer"]');
    await expect(drawer).toBeVisible();

    // Assert: Metadata section
    await expect(drawer.locator('[data-testid="flag-category"]')).toBeVisible();
    await expect(drawer.locator('[data-testid="flag-severity"]')).toBeVisible();
    await expect(drawer.locator('[data-testid="flag-confidence"]')).toBeVisible();
    await expect(drawer.locator('[data-testid="flag-status"]')).toBeVisible();

    // Assert: Explanation section
    await expect(drawer.locator('text=/Why This Matters/i')).toBeVisible();
    const explanation = drawer.locator('[data-testid="flag-explanation"]');
    await expect(explanation).toBeVisible();
    const explainText = await explanation.textContent();
    expect(explainText?.length).toBeGreaterThan(100);

    // Assert: Evidence list
    await expect(drawer.locator('text=/Evidence/i')).toBeVisible();
    const evidenceItems = drawer.locator('[data-testid="evidence-item"]');
    await expect(evidenceItems.first()).toBeVisible();

    // Assert: Remediation section
    await expect(drawer.locator('text=/Remediation/i')).toBeVisible();
    await expect(drawer.locator('[data-testid="remediation-text"]')).toBeVisible();

    // Assert: Action history
    await expect(drawer.locator('text=/Action History/i')).toBeVisible();
  });
});
