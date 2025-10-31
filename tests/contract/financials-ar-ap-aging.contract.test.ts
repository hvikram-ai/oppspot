/**
 * Contract Test: GET /api/companies/[id]/financials/ar-ap-aging
 *
 * Tests the accounts receivable and payable aging endpoint.
 * This test validates the API contract before implementation (TDD).
 *
 * Expected to FAIL until implementation is complete (T023).
 */

import { expect, test, describe } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('GET /api/companies/[companyId]/financials/ar-ap-aging', () => {
  let supabase: ReturnType<typeof createClient>;
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `test-arap-${Date.now()}@oppspot.test`,
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
      .insert({ name: `Test Org AR/AP ${Date.now()}` })
      .select()
      .single();

    const { data: companyData } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Test AR/AP Company',
        registration_number: `ARAP${Date.now()}`,
      })
      .select()
      .single();

    testCompanyId = companyData!.id;

    // Seed AR/AP aging data
    // Scenario: Worsening AR aging (spike in 90+ days bucket - FR-021)
    const agingData = [
      // December 2023: Severe AR aging issue
      {
        company_id: testCompanyId,
        period_date: '2023-12-01',
        ar_current: 50000,
        ar_30_days: 30000,
        ar_60_days: 20000,
        ar_90_plus: 45000, // 50% spike from previous month (31% of total)
        ar_total: 145000,
        ap_current: 40000,
        ap_30_days: 25000,
        ap_60_days: 15000,
        ap_90_plus: 10000,
        ap_total: 90000,
        dso: 52, // Days Sales Outstanding (high)
        dpo: 32, // Days Payables Outstanding
      },
      // November 2023: AR aging starting to worsen
      {
        company_id: testCompanyId,
        period_date: '2023-11-01',
        ar_current: 55000,
        ar_30_days: 28000,
        ar_60_days: 18000,
        ar_90_plus: 30000, // Previously lower
        ar_total: 131000,
        ap_current: 42000,
        ap_30_days: 23000,
        ap_60_days: 12000,
        ap_90_plus: 8000,
        ap_total: 85000,
        dso: 48,
        dpo: 30,
      },
      // October 2023: Healthy AR aging
      {
        company_id: testCompanyId,
        period_date: '2023-10-01',
        ar_current: 60000,
        ar_30_days: 25000,
        ar_60_days: 15000,
        ar_90_plus: 20000, // Normal level
        ar_total: 120000,
        ap_current: 45000,
        ap_30_days: 20000,
        ap_60_days: 10000,
        ap_90_plus: 5000,
        ap_total: 80000,
        dso: 45,
        dpo: 28,
      },
    ];

    await supabase.from('ar_ap_aging').insert(agingData);

    // Create anomaly for AR 90+ days spike (FR-021)
    await supabase.from('anomalies').insert({
      company_id: testCompanyId,
      anomaly_type: 'ar_aging_spike',
      period_date: '2023-12-01',
      severity: 'high',
      description: 'AR 90+ days increased 50% month-over-month (threshold: 50%)',
      metric_name: 'ar_90_plus',
      metric_value: 45000,
      threshold_value: 45000, // 50% increase from 30000
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

  test('TC-ARAP-001: Retrieve AR/AP aging with buckets and DSO/DPO', async ({ request }) => {
    // Act: Get AR/AP aging data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/ar-ap-aging`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with aging metrics
    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      data: {
        aging_history: expect.any(Array),
        latest: {
          ar_current: expect.any(Number),
          ar_30_days: expect.any(Number),
          ar_60_days: expect.any(Number),
          ar_90_plus: expect.any(Number),
          ar_total: expect.any(Number),
          ap_current: expect.any(Number),
          ap_30_days: expect.any(Number),
          ap_60_days: expect.any(Number),
          ap_90_plus: expect.any(Number),
          ap_total: expect.any(Number),
          dso: expect.any(Number),
          dpo: expect.any(Number),
        },
        anomalies: expect.any(Array),
      },
      meta: {
        period_count: expect.any(Number),
      },
    });

    // Verify aging history sorted by period_date descending
    const dates = body.data.aging_history.map((a: any) => a.period_date);
    for (let i = 0; i < dates.length - 1; i++) {
      expect(new Date(dates[i]).getTime()).toBeGreaterThanOrEqual(
        new Date(dates[i + 1]).getTime()
      );
    }
  });

  test('TC-ARAP-002: Detect AR aging spike anomaly when 90+ days increases >50% (FR-021)', async ({ request }) => {
    // Act: Get AR/AP aging data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/ar-ap-aging`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Anomaly detected for AR 90+ days spike
    expect(body.data.anomalies.length).toBeGreaterThan(0);

    const anomaly = body.data.anomalies.find(
      (a: any) => a.anomaly_type === 'ar_aging_spike'
    );

    expect(anomaly).toBeDefined();
    expect(anomaly).toMatchObject({
      severity: 'high',
      metric_name: 'ar_90_plus',
      metric_value: 45000,
      description: expect.stringContaining('50%'),
    });

    // Verify 90+ days bucket increased significantly
    const latest = body.data.latest;
    const previous = body.data.aging_history[1]; // November

    const increase = ((latest.ar_90_plus - previous.ar_90_plus) / previous.ar_90_plus) * 100;
    expect(increase).toBeGreaterThanOrEqual(50);
  });

  test('TC-ARAP-003: Calculate DSO (Days Sales Outstanding) correctly', async ({ request }) => {
    // Act: Get AR/AP aging data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/ar-ap-aging`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: DSO is calculated (AR / daily revenue)
    expect(body.data.latest.dso).toBeGreaterThan(0);
    expect(body.data.latest.dso).toBeLessThan(365); // Sanity check

    // DSO formula: (AR / Revenue) * Days
    // Higher DSO = customers taking longer to pay (bad)
    expect(typeof body.data.latest.dso).toBe('number');
  });

  test('TC-ARAP-004: Calculate DPO (Days Payables Outstanding) correctly', async ({ request }) => {
    // Act: Get AR/AP aging data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/ar-ap-aging`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: DPO is calculated (AP / daily COGS)
    expect(body.data.latest.dpo).toBeGreaterThan(0);
    expect(body.data.latest.dpo).toBeLessThan(365); // Sanity check

    // DPO formula: (AP / COGS) * Days
    // Higher DPO = company taking longer to pay suppliers (can be good or bad)
    expect(typeof body.data.latest.dpo).toBe('number');
  });

  test('TC-ARAP-005: Verify AR bucket totals sum to ar_total', async ({ request }) => {
    // Act: Get AR/AP aging data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/ar-ap-aging`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: AR buckets sum to total
    const latest = body.data.latest;
    const calculatedTotal =
      latest.ar_current + latest.ar_30_days + latest.ar_60_days + latest.ar_90_plus;

    expect(calculatedTotal).toBe(latest.ar_total);

    // Verify for all historical periods too
    body.data.aging_history.forEach((entry: any) => {
      const entryTotal =
        entry.ar_current + entry.ar_30_days + entry.ar_60_days + entry.ar_90_plus;
      expect(entryTotal).toBe(entry.ar_total);
    });
  });

  test('TC-ARAP-006: Verify AP bucket totals sum to ap_total', async ({ request }) => {
    // Act: Get AR/AP aging data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/ar-ap-aging`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: AP buckets sum to total
    const latest = body.data.latest;
    const calculatedTotal =
      latest.ap_current + latest.ap_30_days + latest.ap_60_days + latest.ap_90_plus;

    expect(calculatedTotal).toBe(latest.ap_total);

    // Verify for all historical periods too
    body.data.aging_history.forEach((entry: any) => {
      const entryTotal =
        entry.ap_current + entry.ap_30_days + entry.ap_60_days + entry.ap_90_plus;
      expect(entryTotal).toBe(entry.ap_total);
    });
  });

  test('TC-ARAP-007: Filter aging data by period parameter', async ({ request }) => {
    // Act: Get last 2 months of aging data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/ar-ap-aging?period=2`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Only 2 periods returned
    expect(body.data.aging_history).toHaveLength(2);
    expect(body.meta.period_count).toBe(2);
  });

  test('TC-ARAP-008: Return empty array when no aging data exists', async ({ request }) => {
    // Arrange: Create company with no aging data
    const { data: orgData } = await supabase
      .from('organizations')
      .insert({ name: `Empty AR/AP Org ${Date.now()}` })
      .select()
      .single();

    const { data: emptyCompany } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Empty AR/AP Company',
        registration_number: `EMPTYARAP${Date.now()}`,
      })
      .select()
      .single();

    // Act: Get aging data for empty company
    const response = await request.get(
      `http://localhost:3000/api/companies/${emptyCompany!.id}/financials/ar-ap-aging`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with empty data
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.aging_history).toHaveLength(0);
    expect(body.data.latest).toBeNull();
    expect(body.data.anomalies).toHaveLength(0);

    // Clean up
    await supabase.from('companies').delete().eq('id', emptyCompany!.id);
  });

  test('TC-ARAP-009: Reject unauthorized access (no auth token)', async ({ request }) => {
    // Act: Get aging data without authentication
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/ar-ap-aging`
    );

    // Assert: 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toContain('authentication required');
  });
});
