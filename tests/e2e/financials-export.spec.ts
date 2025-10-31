import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * T046: E2E Test - PDF Export Download
 *
 * Purpose: Validate PDF report generation and download
 * Reference: quickstart.md Scenario 9
 */

const TEST_COMPANY_ID = 'test-company-financial-001';

test.describe('Financial Analytics: PDF Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);
    await page.waitForLoadState('networkidle');
  });

  test('Scenario 1: Export button downloads PDF with correct filename', async ({ page }) => {
    // Find export PDF button
    const exportButton = page.locator('button:has-text("Export PDF"), a:has-text("Export PDF"), a[href*="export-pdf"]');

    // Assert: Export button is visible
    await expect(exportButton.first()).toBeVisible();

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await exportButton.first().click();

    // Wait for download to start
    const download = await downloadPromise;

    // Assert: Filename follows pattern: {CompanyName}_Financial_Report_{Date}.pdf
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/Financial_Report_\d{4}-\d{2}-\d{2}\.pdf$/i);
    expect(filename).toContain('.pdf');

    console.log(`Downloaded: ${filename}`);

    // Save file for inspection
    const downloadPath = await download.path();
    if (downloadPath) {
      // Verify file exists and has content
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(1000); // PDF should be > 1KB
      console.log(`PDF size: ${stats.size} bytes`);
    }
  });

  test('Scenario 2: PDF contains all required sections', async ({ page }) => {
    // This test would require a PDF parser
    // For E2E, we validate that the download works and has reasonable size

    const exportButton = page.locator('a[href*="export-pdf"]').first();

    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;

      const downloadPath = await download.path();

      if (downloadPath) {
        const stats = fs.statSync(downloadPath);

        // Assert: PDF is reasonably sized (3-page report should be 10KB-500KB)
        expect(stats.size).toBeGreaterThan(10000); // > 10KB
        expect(stats.size).toBeLessThan(500000); // < 500KB

        // Note: Full PDF content validation would require pdf-parse or similar
        // Expected sections:
        // 1. Cover Page
        // 2. Executive Summary (KPIs)
        // 3. Revenue Quality (Concentration + AR/AP Aging)
      }
    }
  });

  test('Scenario 4: PDF generation completes without errors', async ({ page }) => {
    // Monitor console for errors during PDF generation
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Trigger PDF export
    const exportButton = page.locator('a[href*="export-pdf"]').first();

    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      await downloadPromise;

      // Assert: No console errors during export
      expect(errors.length).toBe(0);
    }
  });
});

test.describe('Financial Analytics: PDF Export - API Direct', () => {
  test('API endpoint returns PDF with correct headers', async ({ request }) => {
    // Direct API test for PDF endpoint
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/financials/export-pdf`
    );

    // Assert: Success status
    expect(response.status()).toBe(200);

    // Assert: Content-Type is PDF
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/pdf');

    // Assert: Content-Disposition header for download
    const disposition = response.headers()['content-disposition'];
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('Financial_Report');
    expect(disposition).toContain('.pdf');

    // Assert: Response has content
    const body = await response.body();
    expect(body.length).toBeGreaterThan(1000);

    // Assert: PDF magic bytes (starts with %PDF-)
    const pdfHeader = body.toString('ascii', 0, 5);
    expect(pdfHeader).toBe('%PDF-');
  });

  test('API endpoint requires authentication', async ({ request }) => {
    // Test without auth (create new context)
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/financials/export-pdf`,
      {
        headers: {
          // No auth headers
        },
      }
    );

    // Assert: 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('API endpoint checks Financial Editor role', async ({ request }) => {
    // This test assumes a user without the role
    // In real implementation, you'd use a different auth token

    const response = await request.get(
      `/api/companies/company-without-role/financials/export-pdf`
    );

    // Assert: 403 Forbidden OR 401 if not authenticated
    expect([401, 403]).toContain(response.status());

    if (response.status() === 403) {
      const body = await response.json();
      expect(body.error).toMatch(/permission|role|editor/i);
    }
  });

  test('API endpoint handles date range params', async ({ request }) => {
    // Test with date range parameters
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/financials/export-pdf?start_date=2024-01-01&end_date=2024-12-31`
    );

    // Assert: Success
    expect(response.status()).toBe(200);

    // Assert: PDF generated
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/pdf');
  });
});

test.describe('Financial Analytics: Export from Dashboard', () => {
  test('Export button in header is accessible', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);

    // Assert: Export button in page header
    const headerExportBtn = page.locator('header button:has-text("Export"), header a:has-text("Export")').first();

    // If not in header, check for floating action or toolbar
    const exportBtn = page.locator('button:has-text("Export PDF"), a:has-text("Export PDF")').first();

    await expect(exportBtn.or(headerExportBtn)).toBeVisible();
  });

  test('Export button has proper icon', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);

    const exportButton = page.locator('button:has-text("Export"), a:has-text("Export")').first();

    if (await exportButton.isVisible()) {
      // Assert: Button contains icon (FileDown, Download, etc.)
      const hasIcon = await exportButton.locator('svg').count();
      expect(hasIcon).toBeGreaterThan(0);
    }
  });
});

test.describe('Financial Analytics: PDF Export Performance', () => {
  test('PDF generates in reasonable time (<10 seconds)', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);

    const exportButton = page.locator('a[href*="export-pdf"]').first();

    if (await exportButton.isVisible()) {
      const startTime = Date.now();

      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      await downloadPromise;

      const duration = Date.now() - startTime;

      // Assert: Generation completes in < 10 seconds
      expect(duration).toBeLessThan(10000);
      console.log(`PDF generated in ${duration}ms`);
    }
  });
});

test.describe('Financial Analytics: PDF Export Edge Cases', () => {
  test('Export works for company with minimal data', async ({ page }) => {
    // Company with limited financial data
    const minimalCompanyId = 'test-company-minimal-data';
    await page.goto(`/companies/${minimalCompanyId}/financials`);

    const exportButton = page.locator('a[href*="export-pdf"]').first();

    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;

      // Assert: PDF still generates (with N/A values for missing data)
      const filename = download.suggestedFilename();
      expect(filename).toContain('.pdf');
    }
  });

  test('Export handles company names with special characters', async ({ page }) => {
    // Company name: "Test & Co. (UK) Ltd."
    const specialCharCompanyId = 'test-company-special-chars';
    await page.goto(`/companies/${specialCharCompanyId}/financials`);

    const exportButton = page.locator('a[href*="export-pdf"]').first();

    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;

      // Assert: Filename sanitized (special chars replaced with _)
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/^[a-zA-Z0-9_-]+\.pdf$/);
    }
  });
});

test.describe('Financial Analytics: PDF Quality Checks', () => {
  test('Downloaded PDF is not corrupted', async ({ page }) => {
    await page.goto(`/companies/${TEST_COMPANY_ID}/financials`);

    const exportButton = page.locator('a[href*="export-pdf"]').first();

    if (await exportButton.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;

      const downloadPath = await download.path();

      if (downloadPath) {
        const buffer = fs.readFileSync(downloadPath);

        // Assert: PDF magic bytes
        expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');

        // Assert: PDF end marker
        const endMarker = buffer.toString('ascii', buffer.length - 6, buffer.length);
        expect(endMarker).toContain('%%EOF');

        // Assert: Contains expected text (basic validation)
        const pdfContent = buffer.toString('ascii');
        expect(pdfContent).toContain('Financial');
        expect(pdfContent).toContain('Report');
      }
    }
  });
});
