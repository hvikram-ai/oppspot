/**
 * Contract Test: GET /api/companies/[id]/financials/export-pdf
 *
 * Tests the PDF report generation endpoint.
 * This test validates the API contract before implementation (TDD).
 *
 * Expected to FAIL until implementation is complete (T025).
 */

import { expect, test, describe } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('GET /api/companies/[companyId]/financials/export-pdf', () => {
  let supabase: ReturnType<typeof createClient>;
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `test-pdf-${Date.now()}@oppspot.test`,
      password: 'TestPass123!',
      email_confirm: true,
    });

    testUserId = authData!.user.id;

    // Sign in
    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: authData!.user.email!,
      password: 'TestPass123!',
    });

    authToken = sessionData!.session.access_token;

    // Create test organization and company
    const { data: orgData } = await supabase
      .from('organizations')
      .insert({ name: `Test Org PDF ${Date.now()}` })
      .select()
      .single();

    const { data: companyData } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Test PDF Export Company',
        registration_number: `PDF${Date.now()}`,
        sector: 'Software',
      })
      .select()
      .single();

    testCompanyId = companyData!.id;

    // Seed comprehensive financial data for PDF export
    // KPI Snapshots
    const snapshots = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date('2023-01-01');
      date.setMonth(date.getMonth() + i);

      snapshots.push({
        company_id: testCompanyId,
        period_date: date.toISOString().split('T')[0],
        arr: 120000 + (i * 5000),
        mrr: 10000 + (i * 400),
        nrr: 110 - (i * 0.5),
        grr: 95 + (i * 0.2),
        customer_count: 50 + (i * 2),
        churned_customers: i * 1,
        new_customers: 5,
        expansion_mrr: 500,
        contraction_mrr: 200,
        churn_mrr: 300,
        gross_margin_pct: 75.5,
        cac: 5000,
        ltv: 50000,
        arpu: 200 + (i * 5),
      });
    }

    await supabase.from('kpi_snapshots').insert(snapshots);

    // Cohort metrics
    const cohorts = [];
    for (let cohortMonth = 0; cohortMonth < 3; cohortMonth++) {
      for (let offset = 0; offset < 12 - cohortMonth; offset++) {
        const cohortDate = new Date('2023-01-01');
        cohortDate.setMonth(cohortDate.getMonth() + cohortMonth);

        cohorts.push({
          company_id: testCompanyId,
          cohort_month: cohortDate.toISOString().split('T')[0],
          month_offset: offset,
          customers_active: 20 - offset,
          mrr_retained: (20 - offset) * 100,
          retention_rate_pct: ((20 - offset) / 20) * 100,
        });
      }
    }

    await supabase.from('cohort_metrics').insert(cohorts);

    // Revenue concentration
    await supabase.from('revenue_concentration').insert({
      company_id: testCompanyId,
      period_date: '2023-12-01',
      hhi: 1200,
      top_1_customer_pct: 22.0,
      top_3_customers_pct: 48.0,
      top_5_customers_pct: 65.0,
      top_10_customers_pct: 85.0,
      risk_level: 'medium',
    });

    // AR/AP Aging
    await supabase.from('ar_ap_aging').insert({
      company_id: testCompanyId,
      period_date: '2023-12-01',
      ar_current: 50000,
      ar_30_days: 30000,
      ar_60_days: 20000,
      ar_90_plus: 15000,
      ar_total: 115000,
      ap_current: 40000,
      ap_30_days: 25000,
      ap_60_days: 15000,
      ap_90_plus: 10000,
      ap_total: 90000,
      dso: 45,
      dpo: 30,
    });
  });

  test.afterAll(async () => {
    if (testCompanyId) {
      await supabase.from('companies').delete().eq('id', testCompanyId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('TC-PDF-001: Generate PDF report with all financial sections', async ({ request }) => {
    // Act: Request PDF export
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/export-pdf`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with PDF content
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');

    // Verify Content-Disposition header includes filename
    const contentDisposition = response.headers()['content-disposition'];
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('.pdf');

    // Verify PDF content is valid
    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(1000); // PDF should be substantial

    // Verify PDF signature (starts with "%PDF-")
    const pdfSignature = buffer.slice(0, 5).toString();
    expect(pdfSignature).toBe('%PDF-');

    // Save to temp file for manual inspection (optional)
    const tempDir = path.join(process.cwd(), 'tests', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const pdfPath = path.join(tempDir, `test-export-${Date.now()}.pdf`);
    fs.writeFileSync(pdfPath, buffer);

    // Clean up after verification
    fs.unlinkSync(pdfPath);
  });

  test('TC-PDF-002: PDF includes company branding and metadata', async ({ request }) => {
    // Act: Request PDF export
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/export-pdf`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    // Verify filename includes company name
    const contentDisposition = response.headers()['content-disposition'];
    expect(contentDisposition).toContain('Test_PDF_Export_Company');

    // Verify PDF metadata (if accessible via headers)
    // Note: PDF metadata is typically embedded in the file, not headers
    const buffer = await response.body();
    const pdfContent = buffer.toString('utf-8', 0, 1000); // First 1000 bytes

    // Check for company name in PDF content
    expect(pdfContent).toContain('Test PDF Export Company');
  });

  test('TC-PDF-003: Filter PDF sections using section parameter', async ({ request }) => {
    // Act: Request PDF with only KPI summary section
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/export-pdf?sections=kpi_summary`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.slice(0, 5).toString()).toBe('%PDF-');

    // Note: Verifying section content requires PDF parsing library
    // This is a basic validation that PDF was generated
  });

  test('TC-PDF-004: Filter PDF by date range using period parameter', async ({ request }) => {
    // Act: Request PDF for last 6 months only
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/export-pdf?period=6`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(500);

    // PDF should be smaller than full 12-month report
    const fullResponse = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/export-pdf?period=12`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const fullBuffer = await fullResponse.body();
    expect(buffer.length).toBeLessThan(fullBuffer.length);
  });

  test('TC-PDF-005: Generate PDF with multiple sections (comma-separated)', async ({ request }) => {
    // Act: Request PDF with KPI summary and cohorts
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/export-pdf?sections=kpi_summary,cohorts`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(1000);
  });

  test('TC-PDF-006: Reject unauthorized access (no auth token)', async ({ request }) => {
    // Act: Request PDF without authentication
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/export-pdf`
    );

    // Assert: 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toContain('authentication required');
  });

  test('TC-PDF-007: Return 400 for invalid section parameter', async ({ request }) => {
    // Act: Request PDF with invalid section
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/export-pdf?sections=invalid_section`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('invalid section');
    expect(body.valid_sections).toEqual(
      expect.arrayContaining(['kpi_summary', 'cohorts', 'concentration', 'ar_ap_aging'])
    );
  });

  test('TC-PDF-008: Generate PDF with empty data (graceful handling)', async ({ request }) => {
    // Arrange: Create company with no financial data
    const { data: orgData } = await supabase
      .from('organizations')
      .insert({ name: `Empty PDF Org ${Date.now()}` })
      .select()
      .single();

    const { data: emptyCompany } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Empty PDF Company',
        registration_number: `EMPTYPDF${Date.now()}`,
      })
      .select()
      .single();

    // Act: Request PDF for empty company
    const response = await request.get(
      `http://localhost:3000/api/companies/${emptyCompany!.id}/financials/export-pdf`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with PDF showing "No data available"
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(500); // Still generates valid PDF

    // Clean up
    await supabase.from('companies').delete().eq('id', emptyCompany!.id);
  });

  test('TC-PDF-009: Include sector benchmark comparison in PDF (FR-026)', async ({ request }) => {
    // Arrange: Seed benchmark data
    await supabase.from('benchmarks_sector_medians').insert({
      sector: 'Software',
      size_band: '$1M-$10M',
      period_month: '2023-12-01',
      median_nrr: 105.0,
      median_grr: 92.0,
      median_gross_margin_pct: 78.0,
      median_cac_ltv_ratio: 0.15,
      sample_size: 50,
    });

    // Act: Request PDF
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/export-pdf?sections=kpi_summary`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    // Assert: PDF generated successfully
    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(1000);

    // Note: Verifying benchmark content in PDF requires PDF parsing
    // This test ensures the endpoint accepts the request
  });

  test('TC-PDF-010: Verify PDF generation completes within reasonable time', async ({ request }) => {
    // Act: Measure PDF generation time
    const startTime = Date.now();

    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/export-pdf`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const endTime = Date.now();
    const generationTime = endTime - startTime;

    // Assert: PDF generated within 3 seconds
    expect(response.status()).toBe(200);
    expect(generationTime).toBeLessThan(3000);

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
