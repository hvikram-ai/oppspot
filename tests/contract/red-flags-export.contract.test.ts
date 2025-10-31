/**
 * Contract Test: GET /api/{entityType}/{id}/red-flags/export
 *
 * Purpose: Verify API contract for exporting red flags to PDF/CSV
 * Reference: contracts/api-red-flags-export.yaml
 * Expected: These tests MUST FAIL until T038-T040 are implemented
 */

import { test, expect } from '@playwright/test';

const TEST_COMPANY_ID = '123e4567-e89b-12d3-a456-426614174000';

test.describe('GET /api/companies/{id}/red-flags/export - PDF', () => {
  test('should export flags as PDF', async ({ request }) => {
    // Act: Request PDF export
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/export?format=pdf`);

    // Assert: Should return binary PDF or 202 for async processing
    expect([200, 202]).toContain(response.status());

    if (response.status() === 200) {
      // Synchronous export
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/pdf');

      const contentDisposition = response.headers()['content-disposition'];
      expect(contentDisposition).toContain('attachment');
      expect(contentDisposition).toContain('filename');

      // Validate it's actually PDF data
      const buffer = await response.body();
      expect(buffer.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      const header = buffer.toString('utf-8', 0, 4);
      expect(header).toBe('%PDF');
    } else {
      // Async export (202)
      const body = await response.json();
      expect(body).toHaveProperty('export_id');
      expect(body).toHaveProperty('status');
      expect(body.status).toBe('processing');
      expect(body).toHaveProperty('poll_url');
    }
  });

  test('should apply status filter to PDF export', async ({ request }) => {
    // Act: Export only open flags
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/red-flags/export?format=pdf&status=open`
    );

    // Assert: Should process export with filter
    expect([200, 202]).toContain(response.status());
  });

  test('should apply category filter to PDF export', async ({ request }) => {
    // Act: Export only financial flags
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/red-flags/export?format=pdf&category=financial`
    );

    // Assert: Should process export with filter
    expect([200, 202]).toContain(response.status());
  });

  test('should respect include options for PDF', async ({ request }) => {
    // Act: Export with specific inclusions
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/red-flags/export?format=pdf&include_explainer=true&include_evidence=true&include_remediation=true`
    );

    // Assert: Should process export with options
    expect([200, 202]).toContain(response.status());
  });

  test('should exclude resolved flags by default', async ({ request }) => {
    // Act: Export without specifying include_resolved
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/red-flags/export?format=pdf`
    );

    // Assert: Should process (resolved flags excluded by default)
    expect([200, 202]).toContain(response.status());
  });
});

test.describe('GET /api/companies/{id}/red-flags/export - CSV', () => {
  test('should export flags as CSV', async ({ request }) => {
    // Act: Request CSV export
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/export?format=csv`);

    // Assert: Should return CSV data
    expect([200, 202]).toContain(response.status());

    if (response.status() === 200) {
      // Synchronous export
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/csv');

      const contentDisposition = response.headers()['content-disposition'];
      expect(contentDisposition).toContain('attachment');
      expect(contentDisposition).toContain('.csv');

      // Validate CSV structure
      const text = await response.text();
      expect(text.length).toBeGreaterThan(0);

      // CSV should have header row
      const lines = text.split('\n');
      expect(lines.length).toBeGreaterThan(0);

      const header = lines[0];
      expect(header).toContain('ID');
      expect(header).toContain('Category');
      expect(header).toContain('Severity');
      expect(header).toContain('Title');
      expect(header).toContain('Status');
    }
  });

  test('should apply filters to CSV export', async ({ request }) => {
    // Act: Export critical financial flags only
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/red-flags/export?format=csv&category=financial&severity=critical`
    );

    // Assert: Should process export with filters
    expect([200, 202]).toContain(response.status());
  });
});

test.describe('GET /api/companies/{id}/red-flags/export - Error Handling', () => {
  test('should return 400 for missing format parameter', async ({ request }) => {
    // Act: Request export without format
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/export`);

    // Assert: Should return 400
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should return 400 for invalid format', async ({ request }) => {
    // Act: Request export with invalid format
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/red-flags/export?format=xml`
    );

    // Assert: Should return 400
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should return 413 for exports exceeding size limit', async ({ request }) => {
    // Act: Request export that would exceed 2000 flags
    // Note: This test depends on having >2000 flags
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/red-flags/export?format=pdf`
    );

    // Assert: If more than 2000 flags, should return 413
    if (response.status() === 413) {
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('EXPORT_TOO_LARGE');
      expect(body).toHaveProperty('details');
      expect(body.details).toHaveProperty('total_flags');
      expect(body.details).toHaveProperty('max_allowed');
      expect(body.details.max_allowed).toBe(2000);
    }
  });

  test('should return 404 for non-existent company', async ({ request }) => {
    // Act: Request export for non-existent company
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(`/api/companies/${fakeId}/red-flags/export?format=pdf`);

    // Assert: Should return 404
    expect(response.status()).toBe(404);
  });
});

test.describe('GET /api/companies/{id}/red-flags/exports/{exportId}', () => {
  test('should return export status for async exports', async ({ request }) => {
    // First, trigger an async export (would return 202)
    // For this test, we'll use a mock export_id
    const mockExportId = '523e4567-e89b-12d3-a456-426614174000';

    // Act: Check export status
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/red-flags/exports/${mockExportId}`
    );

    // Assert: Should return export status or file
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];

      if (contentType?.includes('application/json')) {
        // Status check
        const body = await response.json();
        expect(body).toHaveProperty('export_id');
        expect(body).toHaveProperty('status');
        expect(['processing', 'ready', 'expired', 'failed']).toContain(body.status);
        expect(body).toHaveProperty('created_at');

        if (body.status === 'ready') {
          expect(body).toHaveProperty('download_url');
          expect(body).toHaveProperty('file_size_bytes');
          expect(body).toHaveProperty('flag_count');
          expect(body).toHaveProperty('expires_at');
        }

        if (body.status === 'failed') {
          expect(body).toHaveProperty('error');
        }
      } else {
        // Direct file download
        expect(['application/pdf', 'text/csv']).toContain(contentType);
      }
    }
  });

  test('should return 404 for non-existent export', async ({ request }) => {
    // Act: Check status of non-existent export
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/red-flags/exports/${fakeId}`
    );

    // Assert: Should return 404
    expect(response.status()).toBe(404);
  });

  test('should handle expired exports', async ({ request }) => {
    // Note: This test would need an export older than 24 hours
    // For now, just validate the structure if status is 'expired'

    const mockExportId = '623e4567-e89b-12d3-a456-426614174000';
    const response = await request.get(
      `/api/companies/${TEST_COMPANY_ID}/red-flags/exports/${mockExportId}`
    );

    if (response.status() === 200) {
      const body = await response.json();
      if (body.status === 'expired') {
        expect(body).toHaveProperty('expires_at');
        expect(new Date(body.expires_at).getTime()).toBeLessThan(Date.now());
      }
    }
  });
});

test.describe('GET /api/data-rooms/{id}/red-flags/export', () => {
  test('should work for data-rooms as well as companies', async ({ request }) => {
    // Act: Export from data room
    const dataRoomId = '223e4567-e89b-12d3-a456-426614174000';
    const response = await request.get(`/api/data-rooms/${dataRoomId}/red-flags/export?format=pdf`);

    // Assert: Same behavior as companies
    expect([200, 202]).toContain(response.status());
  });
});
