/**
 * Contract Test: GET /api/companies/[id]/financials/concentration
 *
 * Tests the revenue concentration analysis endpoint.
 * This test validates the API contract before implementation (TDD).
 *
 * Expected to FAIL until implementation is complete (T022).
 */

import { expect, test, describe } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('GET /api/companies/[companyId]/financials/concentration', () => {
  let supabase: ReturnType<typeof createClient>;
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `test-concentration-${Date.now()}@oppspot.test`,
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
      .insert({ name: `Test Org Concentration ${Date.now()}` })
      .select()
      .single();

    const { data: companyData } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Test Concentration Company',
        registration_number: `CONC${Date.now()}`,
      })
      .select()
      .single();

    testCompanyId = companyData!.id;

    // Seed revenue concentration data
    // Scenario: High concentration - one customer dominates (35% of revenue)
    const concentrationData = [
      {
        company_id: testCompanyId,
        period_date: '2023-12-01',
        hhi: 1450, // High concentration (>1500 is very concentrated)
        top_1_customer_pct: 35.0, // EXCEEDS 25% threshold (FR-016)
        top_3_customers_pct: 60.0,
        top_5_customers_pct: 75.0,
        top_10_customers_pct: 90.0,
        risk_level: 'high',
      },
      {
        company_id: testCompanyId,
        period_date: '2023-11-01',
        hhi: 1380,
        top_1_customer_pct: 33.0,
        top_3_customers_pct: 58.0,
        top_5_customers_pct: 73.0,
        top_10_customers_pct: 88.0,
        risk_level: 'high',
      },
      {
        company_id: testCompanyId,
        period_date: '2023-10-01',
        hhi: 1200,
        top_1_customer_pct: 28.0,
        top_3_customers_pct: 52.0,
        top_5_customers_pct: 68.0,
        top_10_customers_pct: 85.0,
        risk_level: 'medium',
      },
      {
        company_id: testCompanyId,
        period_date: '2023-09-01',
        hhi: 950,
        top_1_customer_pct: 18.0, // Below 25% threshold
        top_3_customers_pct: 45.0,
        top_5_customers_pct: 60.0,
        top_10_customers_pct: 80.0,
        risk_level: 'low',
      },
    ];

    await supabase.from('revenue_concentration').insert(concentrationData);

    // Create anomaly for high concentration (FR-016)
    await supabase.from('anomalies').insert({
      company_id: testCompanyId,
      anomaly_type: 'concentration_risk',
      period_date: '2023-12-01',
      severity: 'high',
      description: 'Single customer represents 35% of revenue (threshold: 25%)',
      metric_name: 'top_1_customer_pct',
      metric_value: 35.0,
      threshold_value: 25.0,
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

  test('TC-CONC-001: Retrieve revenue concentration with HHI and top-N percentages', async ({ request }) => {
    // Act: Get concentration data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/concentration`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with concentration metrics
    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      data: {
        concentration_history: expect.any(Array),
        latest: {
          hhi: expect.any(Number),
          top_1_customer_pct: expect.any(Number),
          top_3_customers_pct: expect.any(Number),
          top_5_customers_pct: expect.any(Number),
          top_10_customers_pct: expect.any(Number),
          risk_level: expect.stringMatching(/^(low|medium|high)$/),
        },
        anomalies: expect.any(Array),
      },
      meta: {
        period_count: expect.any(Number),
      },
    });

    // Verify concentration history sorted by period_date descending
    const dates = body.data.concentration_history.map((c: any) => c.period_date);
    for (let i = 0; i < dates.length - 1; i++) {
      expect(new Date(dates[i]).getTime()).toBeGreaterThanOrEqual(
        new Date(dates[i + 1]).getTime()
      );
    }
  });

  test('TC-CONC-002: Detect high concentration anomaly when top-1 exceeds 25% (FR-016)', async ({ request }) => {
    // Act: Get concentration data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/concentration`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Anomaly detected for latest period
    expect(body.data.anomalies.length).toBeGreaterThan(0);

    const anomaly = body.data.anomalies.find(
      (a: any) => a.anomaly_type === 'concentration_risk'
    );

    expect(anomaly).toBeDefined();
    expect(anomaly).toMatchObject({
      severity: 'high',
      metric_name: 'top_1_customer_pct',
      metric_value: expect.any(Number),
      threshold_value: 25.0,
      description: expect.stringContaining('35%'),
    });

    // Verify latest period has high risk level
    expect(body.data.latest.risk_level).toBe('high');
    expect(body.data.latest.top_1_customer_pct).toBeGreaterThan(25);
  });

  test('TC-CONC-003: Verify HHI calculation (Herfindahl-Hirschman Index)', async ({ request }) => {
    // Act: Get concentration data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/concentration`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: HHI is calculated and within valid range (0-10000)
    expect(body.data.latest.hhi).toBeGreaterThanOrEqual(0);
    expect(body.data.latest.hhi).toBeLessThanOrEqual(10000);

    // HHI > 1500 indicates high concentration
    // HHI 1000-1500 indicates moderate concentration
    // HHI < 1000 indicates low concentration
    if (body.data.latest.hhi > 1500) {
      expect(body.data.latest.risk_level).toBe('high');
    }
  });

  test('TC-CONC-004: Filter concentration by period parameter', async ({ request }) => {
    // Act: Get last 3 months of concentration data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/concentration?period=3`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Only 3 periods returned
    expect(body.data.concentration_history).toHaveLength(3);
    expect(body.meta.period_count).toBe(3);
  });

  test('TC-CONC-005: Return empty array when no concentration data exists', async ({ request }) => {
    // Arrange: Create company with no concentration data
    const { data: orgData } = await supabase
      .from('organizations')
      .insert({ name: `Empty Conc Org ${Date.now()}` })
      .select()
      .single();

    const { data: emptyCompany } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Empty Concentration Company',
        registration_number: `EMPTYCONC${Date.now()}`,
      })
      .select()
      .single();

    // Act: Get concentration data for empty company
    const response = await request.get(
      `http://localhost:3000/api/companies/${emptyCompany!.id}/financials/concentration`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with empty data
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.concentration_history).toHaveLength(0);
    expect(body.data.latest).toBeNull();
    expect(body.data.anomalies).toHaveLength(0);

    // Clean up
    await supabase.from('companies').delete().eq('id', emptyCompany!.id);
  });

  test('TC-CONC-006: Reject unauthorized access (no auth token)', async ({ request }) => {
    // Act: Get concentration data without authentication
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/concentration`
    );

    // Assert: 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toContain('authentication required');
  });

  test('TC-CONC-007: Verify risk level calculation based on HHI thresholds', async ({ request }) => {
    // Act: Get concentration data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/concentration`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Risk level matches HHI thresholds
    body.data.concentration_history.forEach((entry: any) => {
      if (entry.hhi > 1500) {
        expect(entry.risk_level).toBe('high');
      } else if (entry.hhi >= 1000 && entry.hhi <= 1500) {
        expect(entry.risk_level).toBe('medium');
      } else {
        expect(entry.risk_level).toBe('low');
      }
    });
  });
});
