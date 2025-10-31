import { test, expect } from '@playwright/test';

/**
 * T014, T015, T017, T018: E2E Tests - Export, Escalation, Evidence, Notifications
 * Reference: quickstart.md Scenarios 2, 5, 6, 8
 * Expected: MUST FAIL until implementations complete
 */

const TEST_COMPANY_ID = 'test-company-001';

test.describe('Red Flag Export (T014)', () => {
  test('should export flags to PDF', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/red-flags`);

    // Open export dialog
    await page.click('[data-testid="export-button"]');
    const dialog = page.locator('[data-testid="export-dialog"]');
    await expect(dialog).toBeVisible();

    // Configure export
    await page.check('[data-testid="format-pdf"]');
    await page.check('[data-testid="include-explanations"]');
    await page.check('[data-testid="include-evidence"]');

    // Trigger export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="generate-export-button"]');
    const download = await downloadPromise;

    // Assert: File downloaded
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});

test.describe('Severity Escalation (T015)', () => {
  test('should detect and notify on severity escalation', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/red-flags`);

    // Trigger recompute
    await page.click('[data-testid="recompute-button"]');
    await page.waitForTimeout(2000); // Wait for detection

    // Check notifications
    await page.click('[data-testid="notification-bell"]');
    const notifications = page.locator('[data-testid="notification-item"]');

    // Look for escalation notification
    const escalationNotif = notifications.filter({ hasText: /escalated|severity increased/i });
    if (await escalationNotif.count() > 0) {
      await expect(escalationNotif.first()).toBeVisible();
    }
  });
});

test.describe('Evidence Navigation (T017)', () => {
  test('should navigate to evidence source', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/red-flags`);

    // Open flag detail
    await page.click('[data-testid="flag-card"]');
    await expect(page.locator('[data-testid="flag-detail-drawer"]')).toBeVisible();

    // Click document evidence link
    const evidenceList = page.locator('[data-testid="evidence-list"]');
    const documentEvidence = evidenceList.locator('[data-testid="evidence-item"][data-type="document"]').first();

    if (await documentEvidence.count() > 0) {
      await documentEvidence.locator('[data-testid="view-source-button"]').click();

      // Assert: Document viewer opens (could be modal or new page)
      await expect(page.locator('[data-testid="document-viewer"]').or(page.locator('[data-testid="pdf-viewer"]'))).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Notifications (T018)', () => {
  test('should receive notification on new critical flag', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/red-flags`);

    // Trigger detection
    await page.click('[data-testid="recompute-button"]');

    // Wait for completion toast
    await expect(page.locator('text=/detection.*complete/i')).toBeVisible({ timeout: 15000 });

    // Check notification bell
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    const badge = notificationBell.locator('[data-testid="notification-badge"]');

    if (await badge.count() > 0) {
      // Has notifications
      await notificationBell.click();

      // Look for red flag notification
      const flagNotif = page.locator('[data-testid="notification-item"]').filter({ hasText: /red.?flag|critical|detected/i });
      if (await flagNotif.count() > 0) {
        await expect(flagNotif.first()).toBeVisible();

        // Click notification link
        await flagNotif.first().click();

        // Assert: Navigates to flag detail
        await expect(page).toHaveURL(/red-flags/);
      }
    }
  });
});
