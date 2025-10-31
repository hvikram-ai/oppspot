/**
 * Contract Test: GET /api/companies/[id]/financials/cohorts
 *
 * Tests the cohort retention grid endpoint.
 * This test validates the API contract before implementation (TDD).
 *
 * Expected to FAIL until implementation is complete (T021).
 */

import { expect, test, describe } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('GET /api/companies/[companyId]/financials/cohorts', () => {
  let supabase: ReturnType<typeof createClient>;
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `test-cohorts-${Date.now()}@oppspot.test`,
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
      .insert({ name: `Test Org Cohorts ${Date.now()}` })
      .select()
      .single();

    const { data: companyData } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Test Cohorts Company',
        registration_number: `COHORTS${Date.now()}`,
      })
      .select()
      .single();

    testCompanyId = companyData!.id;

    // Seed cohort metrics
    // Cohort 2023-01: 10 customers, retention declining over 12 months
    const cohort202301 = [];
    for (let month = 0; month < 12; month++) {
      cohort202301.push({
        company_id: testCompanyId,
        cohort_month: '2023-01-01',
        month_offset: month,
        customers_active: 10 - month, // Declining retention
        mrr_retained: (10 - month) * 100,
        retention_rate_pct: ((10 - month) / 10) * 100,
      });
    }

    // Cohort 2023-02: 15 customers, better retention
    const cohort202302 = [];
    for (let month = 0; month < 11; month++) {
      cohort202302.push({
        company_id: testCompanyId,
        cohort_month: '2023-02-01',
        month_offset: month,
        customers_active: 15 - Math.floor(month / 2), // Slower decline
        mrr_retained: (15 - Math.floor(month / 2)) * 100,
        retention_rate_pct: ((15 - Math.floor(month / 2)) / 15) * 100,
      });
    }

    // Cohort 2023-03: 20 customers
    const cohort202303 = [];
    for (let month = 0; month < 10; month++) {
      cohort202303.push({
        company_id: testCompanyId,
        cohort_month: '2023-03-01',
        month_offset: month,
        customers_active: 20 - Math.floor(month / 3),
        mrr_retained: (20 - Math.floor(month / 3)) * 100,
        retention_rate_pct: ((20 - Math.floor(month / 3)) / 20) * 100,
      });
    }

    await supabase.from('cohort_metrics').insert([
      ...cohort202301,
      ...cohort202302,
      ...cohort202303,
    ]);
  });

  test.afterAll(async () => {
    if (testCompanyId) {
      await supabase.from('companies').delete().eq('id', testCompanyId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('TC-COH-001: Retrieve cohort retention grid with default 12-cohort view', async ({ request }) => {
    // Act: Get cohort data without cohort_count parameter (defaults to 12)
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/cohorts`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with cohort grid
    expect(response.status()).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      data: {
        cohorts: expect.any(Array),
        month_offsets: expect.any(Array),
      },
      meta: {
        cohort_count: expect.any(Number),
        max_month_offset: expect.any(Number),
      },
    });

    // Verify cohort structure
    expect(body.data.cohorts.length).toBeGreaterThan(0);

    const firstCohort = body.data.cohorts[0];
    expect(firstCohort).toMatchObject({
      cohort_month: expect.any(String),
      initial_customers: expect.any(Number),
      retention_by_month: expect.any(Array),
    });

    // Verify retention_by_month structure
    const firstRetention = firstCohort.retention_by_month[0];
    expect(firstRetention).toMatchObject({
      month_offset: expect.any(Number),
      customers_active: expect.any(Number),
      mrr_retained: expect.any(Number),
      retention_rate_pct: expect.any(Number),
    });

    // Verify sorted by cohort_month descending (most recent first)
    const cohortMonths = body.data.cohorts.map((c: any) => c.cohort_month);
    for (let i = 0; i < cohortMonths.length - 1; i++) {
      expect(new Date(cohortMonths[i]).getTime()).toBeGreaterThanOrEqual(
        new Date(cohortMonths[i + 1]).getTime()
      );
    }
  });

  test('TC-COH-002: Retrieve cohort grid with custom cohort_count parameter', async ({ request }) => {
    // Act: Get 3 most recent cohorts
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/cohorts?cohort_count=3`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with exactly 3 cohorts
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.cohorts).toHaveLength(3);
    expect(body.meta.cohort_count).toBe(3);
  });

  test('TC-COH-003: Verify cohort grid includes month_offset array (FR-011)', async ({ request }) => {
    // Act: Get cohort data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/cohorts`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: month_offsets array exists (0, 1, 2, ..., N)
    expect(body.data.month_offsets).toBeInstanceOf(Array);
    expect(body.data.month_offsets.length).toBeGreaterThan(0);

    // Verify sequential order
    for (let i = 0; i < body.data.month_offsets.length; i++) {
      expect(body.data.month_offsets[i]).toBe(i);
    }

    // Verify max_month_offset matches array length
    expect(body.meta.max_month_offset).toBe(body.data.month_offsets.length - 1);
  });

  test('TC-COH-004: Calculate initial_customers from month_offset=0 data', async ({ request }) => {
    // Act: Get cohort data
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/cohorts`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: initial_customers equals customers_active at month_offset=0
    body.data.cohorts.forEach((cohort: any) => {
      const month0 = cohort.retention_by_month.find((r: any) => r.month_offset === 0);
      expect(cohort.initial_customers).toBe(month0.customers_active);
    });
  });

  test('TC-COH-005: Verify response time < 600ms (FR-053)', async ({ request }) => {
    // Act: Measure response time
    const startTime = Date.now();

    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/cohorts`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Assert: Response time under 600ms
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(600);
  });

  test('TC-COH-006: Return empty array when no cohort data exists', async ({ request }) => {
    // Arrange: Create company with no cohort data
    const { data: orgData } = await supabase
      .from('organizations')
      .insert({ name: `Empty Cohort Org ${Date.now()}` })
      .select()
      .single();

    const { data: emptyCompany } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Empty Cohort Company',
        registration_number: `EMPTYCOH${Date.now()}`,
      })
      .select()
      .single();

    // Act: Get cohort data for empty company
    const response = await request.get(
      `http://localhost:3000/api/companies/${emptyCompany!.id}/financials/cohorts`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 200 OK with empty cohorts
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data.cohorts).toHaveLength(0);
    expect(body.data.month_offsets).toHaveLength(0);
    expect(body.meta.cohort_count).toBe(0);
    expect(body.meta.max_month_offset).toBe(0);

    // Clean up
    await supabase.from('companies').delete().eq('id', emptyCompany!.id);
  });

  test('TC-COH-007: Reject unauthorized access (no auth token)', async ({ request }) => {
    // Act: Get cohort data without authentication
    const response = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/cohorts`
    );

    // Assert: 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toContain('authentication required');
  });

  test('TC-COH-008: Validate cohort_count parameter range (1-24)', async ({ request }) => {
    // Act: Try cohort_count=0 (invalid)
    const response1 = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/cohorts?cohort_count=0`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 400 Bad Request
    expect(response1.status()).toBe(400);
    const body1 = await response1.json();
    expect(body1.error).toContain('cohort_count must be between 1 and 24');

    // Act: Try cohort_count=25 (invalid)
    const response2 = await request.get(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/cohorts?cohort_count=25`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    // Assert: 400 Bad Request
    expect(response2.status()).toBe(400);
    const body2 = await response2.json();
    expect(body2.error).toContain('cohort_count must be between 1 and 24');
  });
});
