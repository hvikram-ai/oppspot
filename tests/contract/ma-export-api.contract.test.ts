/**
 * Contract Test: M&A Prediction Export API
 *
 * Purpose: Verify API contract for exporting predictions in PDF, Excel, CSV
 * Reference: specs/011-m-a-target/contracts/api-export.yaml
 * Expected: These tests MUST FAIL until T032-T035 are implemented
 *
 * Endpoints tested:
 * - POST /api/ma-predictions/export
 * - GET /api/ma-predictions/export/{exportId}/status
 * - GET /api/ma-predictions/export/watchlist
 *
 * Performance targets (FR-019):
 * - PDF: 2-5s for single company
 * - Excel: 1-3s for 100 companies
 * - CSV: <1s
 */

import { test, expect } from '@playwright/test';

const TEST_COMPANY_IDS = [
  '123e4567-e89b-12d3-a456-426614174000',
  '223e4567-e89b-12d3-a456-426614174001',
  '323e4567-e89b-12d3-a456-426614174002'
];

test.describe('POST /api/ma-predictions/export', () => {
  test('should export single company as PDF', async ({ request }) => {
    // Act: Export as PDF
    const startTime = Date.now();
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'pdf',
        company_ids: [TEST_COMPANY_IDS[0]]
      }
    });
    const duration = Date.now() - startTime;

    // Assert: 200 OK with PDF binary
    expect(response.status()).toBe(200);

    // Assert: Performance (FR-019: PDF 2-5s)
    expect(duration).toBeLessThan(5000);

    // Assert: Content-Type is PDF
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/pdf');

    // Assert: Content-Disposition header with filename
    const contentDisposition = response.headers()['content-disposition'];
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('filename');
    expect(contentDisposition).toContain('.pdf');

    // Assert: Body is binary data (PDF starts with %PDF-)
    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(0);

    const pdfHeader = buffer.toString('utf8', 0, 5);
    expect(pdfHeader).toBe('%PDF-');
  });

  test('should export multiple companies as Excel', async ({ request }) => {
    // Act: Export 3 companies as Excel
    const startTime = Date.now();
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'excel',
        company_ids: TEST_COMPANY_IDS
      }
    });
    const duration = Date.now() - startTime;

    // Assert: 200 OK with Excel binary
    expect(response.status()).toBe(200);

    // Assert: Performance (FR-019: Excel 1-3s for small batch)
    expect(duration).toBeLessThan(3000);

    // Assert: Content-Type is Excel
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('spreadsheetml.sheet');

    // Assert: Content-Disposition header
    const contentDisposition = response.headers()['content-disposition'];
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('.xlsx');

    // Assert: Body is binary data (Excel starts with PK - zip header)
    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(0);

    const zipHeader = buffer.toString('utf8', 0, 2);
    expect(zipHeader).toBe('PK'); // Excel is a zip archive
  });

  test('should export companies as CSV', async ({ request }) => {
    // Act: Export as CSV
    const startTime = Date.now();
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'csv',
        company_ids: TEST_COMPANY_IDS
      }
    });
    const duration = Date.now() - startTime;

    // Assert: 200 OK with CSV text
    expect(response.status()).toBe(200);

    // Assert: Performance (FR-019: CSV <1s)
    expect(duration).toBeLessThan(1000);

    // Assert: Content-Type is CSV
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/csv');

    // Assert: Content-Disposition header
    const contentDisposition = response.headers()['content-disposition'];
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('.csv');

    // Assert: Body is CSV text with header row
    const text = await response.text();
    expect(text.length).toBeGreaterThan(0);

    const lines = text.split('\n');
    expect(lines.length).toBeGreaterThan(1); // Header + data rows

    // CSV should have column headers
    const headers = lines[0].toLowerCase();
    expect(headers).toContain('company');
    expect(headers).toContain('score');
    expect(headers).toContain('likelihood');
  });

  test('should support filtering by likelihood categories', async ({ request }) => {
    // Act: Export only High/Very High targets
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'csv',
        company_ids: TEST_COMPANY_IDS,
        filters: {
          likelihood_categories: ['High', 'Very High']
        }
      }
    });

    // Assert: Export succeeds (may be empty if no high targets)
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const text = await response.text();
      expect(text.length).toBeGreaterThan(0);
    }
  });

  test('should support filtering by score range', async ({ request }) => {
    // Act: Export companies with score 70-100
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'csv',
        company_ids: TEST_COMPANY_IDS,
        filters: {
          min_score: 70,
          max_score: 100
        }
      }
    });

    // Assert
    expect([200, 404]).toContain(response.status());
  });

  test('should support include_fields customization', async ({ request }) => {
    // Act: Export with only valuation, no factors/acquirers
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'excel',
        company_ids: TEST_COMPANY_IDS,
        include_fields: {
          factors: false,
          valuation: true,
          acquirer_profiles: false,
          historical_comparables: false
        }
      }
    });

    // Assert: Export succeeds with customized fields
    expect(response.status()).toBe(200);
  });

  test('should include all fields by default', async ({ request }) => {
    // Act: Export without specifying include_fields
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'pdf',
        company_ids: [TEST_COMPANY_IDS[0]]
      }
    });

    // Assert: Defaults include factors, valuation, acquirers per spec
    expect(response.status()).toBe(200);
  });

  test('should return 202 for large async exports (>100 companies)', async ({ request }) => {
    // Act: Request export for 150 companies (exceeds sync threshold)
    const largeCompanyList = Array.from({ length: 150 }, (_, i) =>
      `${i.toString().padStart(8, '0')}-e89b-12d3-a456-426614174000`
    );

    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'excel',
        company_ids: largeCompanyList
      }
    });

    // Assert: 202 Accepted (queued for async processing)
    if (response.status() === 202) {
      const body = await response.json();

      expect(body).toHaveProperty('export_id');
      expect(typeof body.export_id).toBe('string');

      expect(body).toHaveProperty('status');
      expect(body.status).toBe('processing');

      expect(body).toHaveProperty('estimated_completion_seconds');
      expect(typeof body.estimated_completion_seconds).toBe('number');

      expect(body).toHaveProperty('status_url');
      expect(body.status_url).toContain(`/api/ma-predictions/export/${body.export_id}/status`);
    } else {
      // Small test database may still return 200 synchronously
      expect(response.status()).toBe(200);
    }
  });

  test('should return 400 for invalid format', async ({ request }) => {
    // Act: Invalid format
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'docx', // Not supported
        company_ids: TEST_COMPANY_IDS
      }
    });

    // Assert
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('invalid_format');
    expect(body.message).toContain('pdf, excel, csv');
  });

  test('should return 400 for empty company_ids', async ({ request }) => {
    // Act: No companies specified
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'pdf',
        company_ids: []
      }
    });

    // Assert
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.message).toContain('company_ids');
  });

  test('should return 400 for too many companies (>1000)', async ({ request }) => {
    // Act: Exceed maximum of 1000 companies
    const tooManyCompanies = Array.from({ length: 1001 }, (_, i) =>
      `${i.toString().padStart(8, '0')}-e89b-12d3-a456-426614174000`
    );

    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'csv',
        company_ids: tooManyCompanies
      }
    });

    // Assert
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.message).toContain('1000');
  });

  test('should return 400 for invalid min/max score range', async ({ request }) => {
    // Act: min_score > max_score
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'csv',
        company_ids: TEST_COMPANY_IDS,
        filters: {
          min_score: 80,
          max_score: 60
        }
      }
    });

    // Assert
    expect(response.status()).toBe(400);
  });

  test('should return 401 when not authenticated', async ({ request }) => {
    // Act
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'pdf',
        company_ids: TEST_COMPANY_IDS
      },
      headers: {
        'Authorization': ''
      }
    });

    // Assert
    expect(response.status()).toBe(401);
  });

  test('should validate company_ids are valid UUIDs', async ({ request }) => {
    // Act: Invalid UUID format
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'csv',
        company_ids: ['not-a-uuid', 'also-invalid']
      }
    });

    // Assert
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.message).toContain('UUID');
  });
});

test.describe('GET /api/ma-predictions/export/{exportId}/status', () => {
  test('should return export status for async job', async ({ request }) => {
    // Arrange: Create large export to trigger async processing
    const largeCompanyList = Array.from({ length: 150 }, (_, i) =>
      `${i.toString().padStart(8, '0')}-e89b-12d3-a456-426614174000`
    );

    const createResponse = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'excel',
        company_ids: largeCompanyList
      }
    });

    // Skip if synchronous (small test dataset)
    if (createResponse.status() !== 202) {
      test.skip();
      return;
    }

    const { export_id } = await createResponse.json();

    // Act: Check status
    const response = await request.get(`/api/ma-predictions/export/${export_id}/status`);

    // Assert
    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toHaveProperty('export_id');
    expect(body.export_id).toBe(export_id);

    expect(body).toHaveProperty('status');
    expect(['queued', 'processing', 'completed', 'failed']).toContain(body.status);

    expect(body).toHaveProperty('progress_percentage');
    expect(body.progress_percentage).toBeGreaterThanOrEqual(0);
    expect(body.progress_percentage).toBeLessThanOrEqual(100);

    expect(body).toHaveProperty('created_at');
    expect(typeof body.created_at).toBe('string');

    // Assert: Conditional fields
    if (body.status === 'completed') {
      expect(body).toHaveProperty('completed_at');
      expect(body).toHaveProperty('download_url');
      expect(typeof body.download_url).toBe('string');
      expect(body.download_url).toContain('http');

      expect(body).toHaveProperty('expires_at');
      expect(typeof body.expires_at).toBe('string');
    }

    if (body.status === 'failed') {
      expect(body).toHaveProperty('error_message');
      expect(typeof body.error_message).toBe('string');
    }
  });

  test('should return 404 for non-existent export', async ({ request }) => {
    // Act
    const fakeExportId = '999e9999-e99b-99d9-a999-999999999999';
    const response = await request.get(`/api/ma-predictions/export/${fakeExportId}/status`);

    // Assert
    expect(response.status()).toBe(404);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('code');
    expect(body.code).toBe(404);
  });

  test('should return 401 when not authenticated', async ({ request }) => {
    // Act
    const response = await request.get('/api/ma-predictions/export/123e4567-e89b-12d3-a456-426614174000/status', {
      headers: {
        'Authorization': ''
      }
    });

    // Assert
    expect(response.status()).toBe(401);
  });
});

test.describe('GET /api/ma-predictions/export/watchlist', () => {
  test('should export user saved companies as PDF', async ({ request }) => {
    // Act: Export watchlist as PDF
    const response = await request.get('/api/ma-predictions/export/watchlist?format=pdf');

    // Assert: Either 200 or 404 if no saved companies
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/pdf');

      const buffer = await response.body();
      const pdfHeader = buffer.toString('utf8', 0, 5);
      expect(pdfHeader).toBe('%PDF-');
    } else if (response.status() === 404) {
      const body = await response.json();
      expect(body.message).toContain('No saved companies');
    } else {
      throw new Error(`Unexpected status: ${response.status()}`);
    }
  });

  test('should export watchlist as Excel', async ({ request }) => {
    // Act
    const response = await request.get('/api/ma-predictions/export/watchlist?format=excel');

    // Assert
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('spreadsheetml.sheet');
    } else {
      expect(response.status()).toBe(404);
    }
  });

  test('should export watchlist as CSV', async ({ request }) => {
    // Act
    const response = await request.get('/api/ma-predictions/export/watchlist?format=csv');

    // Assert
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('text/csv');

      const text = await response.text();
      expect(text.length).toBeGreaterThan(0);
    } else {
      expect(response.status()).toBe(404);
    }
  });

  test('should filter for High/Very High likelihood only', async ({ request }) => {
    // Act: Watchlist export (FR-021: automatically filters High/Very High)
    const response = await request.get('/api/ma-predictions/export/watchlist?format=csv');

    // Assert: If successful, exported companies should be high likelihood
    if (response.status() === 200) {
      const text = await response.text();
      const lines = text.split('\n');

      // Check that likelihood column exists and contains only High/Very High
      if (lines.length > 1) {
        const headers = lines[0].toLowerCase().split(',');
        const likelihoodIndex = headers.findIndex(h => h.includes('likelihood'));

        if (likelihoodIndex >= 0) {
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const cells = lines[i].split(',');
              const likelihood = cells[likelihoodIndex];
              expect(['High', 'Very High', '"High"', '"Very High"']).toContain(likelihood.trim());
            }
          }
        }
      }
    }
  });

  test('should support specific list_id parameter', async ({ request }) => {
    // Act: Export specific business list
    const testListId = '123e4567-e89b-12d3-a456-426614174000';
    const response = await request.get(`/api/ma-predictions/export/watchlist?format=csv&list_id=${testListId}`);

    // Assert: Either 200 or 404
    expect([200, 404]).toContain(response.status());
  });

  test('should return 400 for missing format parameter', async ({ request }) => {
    // Act: No format specified
    const response = await request.get('/api/ma-predictions/export/watchlist');

    // Assert
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.message).toContain('format');
  });

  test('should return 400 for invalid format', async ({ request }) => {
    // Act
    const response = await request.get('/api/ma-predictions/export/watchlist?format=json');

    // Assert
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.message).toContain('pdf, excel, csv');
  });

  test('should return 404 when user has no saved companies', async ({ request }) => {
    // Act: User with empty watchlist
    const response = await request.get('/api/ma-predictions/export/watchlist?format=pdf');

    // Assert: 404 with descriptive message
    if (response.status() === 404) {
      const body = await response.json();
      expect(body.message).toMatch(/no saved companies|no high-likelihood targets/i);
    } else {
      // If user has saved companies, should return 200
      expect(response.status()).toBe(200);
    }
  });

  test('should return 401 when not authenticated', async ({ request }) => {
    // Act
    const response = await request.get('/api/ma-predictions/export/watchlist?format=pdf', {
      headers: {
        'Authorization': ''
      }
    });

    // Assert
    expect(response.status()).toBe(401);
  });
});

test.describe('Export Performance', () => {
  test('PDF export should complete in 2-5 seconds', async ({ request }) => {
    // Act
    const startTime = Date.now();
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'pdf',
        company_ids: [TEST_COMPANY_IDS[0]]
      }
    });
    const duration = Date.now() - startTime;

    // Assert: FR-019 performance target
    if (response.status() === 200) {
      expect(duration).toBeGreaterThan(2000); // At least 2s (realistic report generation)
      expect(duration).toBeLessThan(5000); // Under 5s
    }
  });

  test('Excel export should complete in 1-3 seconds for small batch', async ({ request }) => {
    // Act: Export 10 companies
    const smallBatch = TEST_COMPANY_IDS.slice(0, 3);
    const startTime = Date.now();
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'excel',
        company_ids: smallBatch
      }
    });
    const duration = Date.now() - startTime;

    // Assert: FR-019 performance target
    if (response.status() === 200) {
      expect(duration).toBeLessThan(3000);
    }
  });

  test('CSV export should complete in under 1 second', async ({ request }) => {
    // Act
    const startTime = Date.now();
    const response = await request.post('/api/ma-predictions/export', {
      data: {
        format: 'csv',
        company_ids: TEST_COMPANY_IDS
      }
    });
    const duration = Date.now() - startTime;

    // Assert: FR-019 performance target
    if (response.status() === 200) {
      expect(duration).toBeLessThan(1000);
    }
  });
});
