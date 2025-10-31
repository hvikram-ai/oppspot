/**
 * Contract Test: GET /api/companies/[id]/financials/summary
 *
 * Tests the KPI metrics summary endpoint.
 * This test validates the API contract before implementation (TDD).
 *
 * Expected to FAIL until implementation is complete (T020).
 */

import { expect, test, describe } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('GET /api/companies/[companyId]/financials/summary', () => {
  let supabase: ReturnType<typeof createClient>;
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `test-summary-${Date.now()}@oppspot.test`,
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
      .insert({ name: `Test Org Summary ${Date.now()}` })
      .select()
      .single();

    const { data: companyData } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Test Summary Company',
        registration_number: `SUMMARY${Date.now()}`,
        sector: 'Software',
      })
      .select()
      .single();

    testCompanyId = companyData!.id;

    // Seed KPI snapshots for 24 months
    const snapshots = [];
    const baseDate = new Date('2023-01-01');

    for (let i = 0; i < 24; i++) {
      const periodDate = new Date(baseDate);
      periodDate.setMonth(baseDate.getMonth() + i);

      snapshots.push({
        company_id: testCompanyId,
        period_date: periodDate.toISOString().split('T')[0],
        arr: 120000 + (i * 5000), // Growing ARR
        mrr: 10000 + (i * 400),
        nrr: 110 - (i * 0.5), // Declining NRR (retention issue)
        grr: 95 + (i * 0.2),
        customer_count: 50 + (i * 2),
        churned_customers: i * 1,
        new_customers: 5 + Math.floor(i / 2),
        expansion_mrr: 500 + (i * 50),
        contraction_mrr: 200 + (i * 30),
        churn_mrr: 300 + (i * 40),
        gross_margin_pct: 75.5,
        cac: 5000 - (i * 50), // Improving CAC
        ltv: 50000 + (i * 1000),
        arpu: 200 + (i * 5),
      });
    }

    await supabase.from('kpi_snapshots').insert(snapshots);
  });

  test.afterAll(async () => {
    if (testCompanyId) {
      await supabase.from('companies').delete().eq('id', testCompanyId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('TC-SUM-001: Retrieve KPI summary with default 12-month period', async ({ request }) => {
    // Act: Get summary without period parameter (defaults to 12 months)
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/summary`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with snapshots and trends
    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      data: {
        snapshots: expect.any(Array),
        trends: {
          arr_change_pct: expect.any(Number),
          mrr_change_pct: expect.any(Number),
          nrr_change_pct: expect.any(Number),
        },
      },
      meta: {
        last_calculated_at: expect.any(String),
        period_count: 12,
      },
    });

    // Verify 12 snapshots returned
    expect(body.data.snapshots).toHaveLength(12);

    // Verify sorted by period_date descending (most recent first)
    const dates = body.data.snapshots.map((s: any) => s.period_date);
    for (let i = 0; i < dates.length - 1; i++) {
      expect(new Date(dates[i]).getTime()).toBeGreaterThanOrEqual(
        new Date(dates[i + 1]).getTime()
      );
    }

    // Verify ARR is growing (positive trend)
    expect(body.data.trends.arr_change_pct).toBeGreaterThan(0);
  });

  test('TC-SUM-002: Retrieve KPI summary with custom 24-month period', async ({ request }) => {
    // Act: Get summary with period=24
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/summary?period=24`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with 24 snapshots
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.snapshots).toHaveLength(24);
    expect(body.meta.period_count).toBe(24);
  });

  test('TC-SUM-003: Verify response time < 300ms (FR-053)', async ({ request }) => {
    // Act: Measure response time
    const startTime = Date.now();

    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/summary`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Assert: Response time under 300ms
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(300);
  });

  test('TC-SUM-004: Return empty array when no snapshots exist', async ({ request }) => {
    // Arrange: Create company with no financial data
    const { data: orgData } = await supabase
      .from('organizations')
      .insert({ name: `Empty Org ${Date.now()}` })
      .select()
      .single();

    const { data: emptyCompany } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Empty Company',
        registration_number: `EMPTY${Date.now()}`,
      })
      .select()
      .single();

    // Act: Get summary for company with no data
    const response = await request.get(
      `http://localhost:3000/api/companies/${emptyCompany!.id}/financials/summary`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with empty snapshots
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.snapshots).toHaveLength(0);
    expect(body.meta.period_count).toBe(0);
    expect(body.data.trends).toMatchObject({
      arr_change_pct: 0,
      mrr_change_pct: 0,
      nrr_change_pct: 0,
    });

    // Clean up
    await supabase.from('companies').delete().eq('id', emptyCompany!.id);
  });

  test('TC-SUM-005: Reject unauthorized access (no auth token)', async ({ request }) => {
    // Act: Get summary without authentication
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/summary`
    );

    // Assert: 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toContain('authentication required');
  });

  test('TC-SUM-006: Reject access to company from different organization (RLS)', async ({ request }) => {
    // Arrange: Create second user in different organization
    const { data: otherUser } = await supabase.auth.admin.createUser({
      email: `other-user-${Date.now()}@oppspot.test`,
      password: 'TestPass123!',
      email_confirm: true,
    });

    const { data: otherSession } = await supabase.auth.signInWithPassword({
      email: otherUser!.user.email!,
      password: 'TestPass123!',
    });

    const otherToken = otherSession!.session.access_token;

    // Create separate organization
    const { data: otherOrg } = await supabase
      .from('organizations')
      .insert({ name: `Other Org ${Date.now()}` })
      .select()
      .single();

    // Link user to different org
    await supabase
      .from('profiles')
      .update({ organization_id: otherOrg!.id })
      .eq('id', otherUser!.user.id);

    // Act: Try to access testCompanyId from different org
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/summary`,
      {
        headers: {
          Authorization: `Bearer ${otherToken}`,
        },
      }
    );

    // Assert: 403 Forbidden or 404 Not Found (RLS hides record)
    expect([403, 404]).toContain(response.status());

    // Clean up
    await supabase.auth.admin.deleteUser(otherUser!.user.id);
  });

  test('TC-SUM-007: Validate period parameter range (1-24 months)', async ({ request }) => {
    // Act: Try period=0 (invalid)
    const response1 = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/summary?period=0`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 400 Bad Request
    expect(response1.status()).toBe(400);
    const body1 = await response1.json();
    expect(body1.error).toContain('period must be between 1 and 24');

    // Act: Try period=25 (invalid)
    const response2 = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/summary?period=25`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 400 Bad Request
    expect(response2.status()).toBe(400);
    const body2 = await response2.json();
    expect(body2.error).toContain('period must be between 1 and 24');
  });
});
