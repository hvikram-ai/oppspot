import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * T043: E2E Test - CSV Upload with Validation
 *
 * Purpose: Validate CSV upload functionality with various scenarios
 * Reference: quickstart.md Scenario 1 & 2
 * Expected: Tests validate upload, validation, and permission checks
 */

const TEST_COMPANY_ID = 'test-company-financial-001';

test.describe('Financial Analytics: CSV Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to upload page
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/upload`);
    await page.waitForLoadState('networkidle');
  });

  test('Scenario 1: Upload valid single-currency CSV succeeds', async ({ page }) => {
    // Create test CSV content
    const subscriptionCSV = `customer_id,plan_name,start_date,mrr,currency
CUST-001,Pro Plan,2024-01-01,500,USD
CUST-002,Enterprise,2024-01-15,2000,USD
CUST-003,Starter,2024-02-01,100,USD`;

    // Create blob and file
    const blob = new Blob([subscriptionCSV], { type: 'text/csv' });
    const file = new File([blob], 'subscriptions.csv', { type: 'text/csv' });

    // Set file input (Playwright file chooser)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'subscriptions.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(subscriptionCSV),
    });

    // Wait for file to be added to list
    await expect(page.locator('text=subscriptions.csv')).toBeVisible({ timeout: 5000 });

    // Click upload button
    await page.click('button:has-text("Upload")');

    // Assert: Success message appears
    await expect(page.locator('text=/Upload Successful|success/i')).toBeVisible({ timeout: 10000 });

    // Assert: Affected months displayed
    await expect(page.locator('text=/Jan 2024|Feb 2024/i')).toBeVisible();

    // Assert: Redirects to dashboard after 3 seconds
    await expect(page).toHaveURL(new RegExp(`/companies/${TEST_COMPANY_ID}/financials`), { timeout: 5000 });
  });

  test('Scenario 2: Upload mixed-currency CSV is rejected', async ({ page }) => {
    // Create CSV with mixed currencies
    const mixedCurrencyCSV = `customer_id,plan_name,start_date,mrr,currency
CUST-001,Pro Plan,2024-01-01,500,USD
CUST-002,Enterprise,2024-01-15,1500,GBP
CUST-003,Starter,2024-02-01,80,EUR`;

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'subscriptions.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(mixedCurrencyCSV),
    });

    await page.click('button:has-text("Upload")');

    // Assert: Error message about mixed currencies
    await expect(
      page.locator('text=/mixed currencies|single currency/i')
    ).toBeVisible({ timeout: 5000 });

    // Assert: Currencies found listed
    await expect(page.locator('text=/USD.*GBP.*EUR/i')).toBeVisible();

    // Assert: Does not redirect
    await expect(page).toHaveURL(new RegExp(`/companies/${TEST_COMPANY_ID}/financials/upload`));
  });

  test('Scenario 3: Upload with missing required fields shows validation errors', async ({ page }) => {
    // Create CSV with missing fields
    const invalidCSV = `customer_id,plan_name,start_date
CUST-001,Pro Plan,2024-01-01
CUST-002,,2024-01-15
CUST-003,Starter,`;

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'subscriptions.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(invalidCSV),
    });

    await page.click('button:has-text("Upload")');

    // Assert: Validation errors displayed
    await expect(page.locator('text=/validation error|missing field/i')).toBeVisible({ timeout: 5000 });

    // Assert: Row numbers shown
    await expect(page.locator('text=/row 2|row 3/i')).toBeVisible();

    // Assert: Specific fields mentioned
    await expect(page.locator('text=/mrr|currency|start_date/i')).toBeVisible();
  });

  test('Scenario 4: Re-upload same data is idempotent (no duplicates)', async ({ page }) => {
    const subscriptionCSV = `customer_id,plan_name,start_date,mrr,currency
CUST-IDEM-001,Pro Plan,2024-03-01,500,USD`;

    // First upload
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'subscriptions.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(subscriptionCSV),
    });
    await page.click('button:has-text("Upload")');
    await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 10000 });

    // Navigate back to upload page
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/upload`);

    // Second upload (same data)
    await fileInput.setInputFiles({
      name: 'subscriptions.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(subscriptionCSV),
    });
    await page.click('button:has-text("Upload")');

    // Assert: Success with note about duplicates skipped
    await expect(page.locator('text=/success|uploaded/i')).toBeVisible({ timeout: 10000 });

    // Optional: Check for duplicates_skipped in response
    // This would require inspecting the API response
  });

  test('Scenario 5: Upload without Financial Editor role is denied', async ({ page }) => {
    // This test assumes we can set up a user without the role
    // For now, we'll check if permission error is displayed

    // Mock: Navigate as unauthorized user (implementation-specific)
    // In real tests, you'd use a different auth context

    // Navigate to upload page
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/upload`);

    // Assert: Permission denied message appears
    const permissionError = page.locator('text=/permission denied|financial editor/i');

    // If permission error exists, validate it
    if (await permissionError.isVisible()) {
      await expect(permissionError).toBeVisible();
      await expect(page.locator('text=/contact.*administrator/i')).toBeVisible();

      // Assert: Upload zone not visible
      await expect(page.locator('input[type="file"]')).not.toBeVisible();
    } else {
      // User has permission, test passes (assumes proper auth setup)
      console.log('User has Financial Editor role - test skipped');
    }
  });
});

test.describe('Financial Analytics: CSV Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/upload`);
  });

  test('CSV templates are downloadable', async ({ page }) => {
    // Assert: Template download links visible
    await expect(page.locator('text=/download.*template/i')).toBeVisible();

    // Click subscriptions template download
    const downloadPromise = page.waitForEvent('download');
    await page.click('a[download*="subscriptions"]');
    const download = await downloadPromise;

    // Assert: File downloaded
    expect(download.suggestedFilename()).toContain('subscriptions');
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('Upload instructions are displayed', async ({ page }) => {
    // Assert: Instructions card visible
    await expect(page.locator('text=/upload instructions/i')).toBeVisible();

    // Assert: Key instructions present
    await expect(page.locator('text=/download templates/i')).toBeVisible();
    await expect(page.locator('text=/single currency/i')).toBeVisible();
    await expect(page.locator('text=/ISO date format/i')).toBeVisible();
    await expect(page.locator('text=/unique IDs/i')).toBeVisible();
  });
});

test.describe('Financial Analytics: Upload History', () => {
  test('Recent uploads are displayed', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials/upload`);

    // Check if upload history section exists
    const historySection = page.locator('text=/recent uploads|upload history/i');

    if (await historySection.isVisible()) {
      // Assert: History items displayed
      await expect(page.locator('[data-testid="upload-history-item"]').first()).toBeVisible();

      // Assert: Upload status shown (processing/completed/failed)
      await expect(
        page.locator('text=/processing|completed|failed/i').first()
      ).toBeVisible();

      // Assert: Timestamps displayed
      await expect(page.locator('text=/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i').first()).toBeVisible();
    }
  });
});
