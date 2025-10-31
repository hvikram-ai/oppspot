/**
 * Contract Test: POST /api/companies/[id]/financials/recompute
 *
 * Tests the manual recalculation trigger endpoint.
 * This test validates the API contract before implementation (TDD).
 *
 * Expected to FAIL until implementation is complete (T024).
 */

import { expect, test, describe } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('POST /api/companies/[companyId]/financials/recompute', () => {
  let supabase: ReturnType<typeof createClient>;
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user
    const { data: authData } = await supabase.auth.admin.createUser({
      email: `test-recompute-${Date.now()}@oppspot.test`,
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
      .insert({ name: `Test Org Recompute ${Date.now()}` })
      .select()
      .single();

    const { data: companyData } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Test Recompute Company',
        registration_number: `RECOMP${Date.now()}`,
        sector: 'Software',
      })
      .select()
      .single();

    testCompanyId = companyData!.id;

    // Grant Financial Admin role (needed for recompute)
    await supabase.from('financial_roles').insert({
      user_id: testUserId,
      company_id: testCompanyId,
      role: 'admin',
    });

    // Seed financial data for recalculation
    // Create customers
    const customers = [
      {
        company_id: testCompanyId,
        external_ref: 'CUST-001',
        name: 'Customer One',
        email: 'cust1@test.com',
        country: 'GB',
        acquisition_date: '2023-01-15',
        checksum: 'checksum1',
      },
      {
        company_id: testCompanyId,
        external_ref: 'CUST-002',
        name: 'Customer Two',
        email: 'cust2@test.com',
        country: 'IE',
        acquisition_date: '2023-02-20',
        checksum: 'checksum2',
      },
    ];

    await supabase.from('customers').insert(customers);

    const { data: customerRecords } = await supabase
      .from('customers')
      .select('id, external_ref')
      .eq('company_id', testCompanyId);

    const cust1Id = customerRecords!.find(c => c.external_ref === 'CUST-001')!.id;
    const cust2Id = customerRecords!.find(c => c.external_ref === 'CUST-002')!.id;

    // Create subscriptions
    const subscriptions = [
      {
        company_id: testCompanyId,
        customer_id: cust1Id,
        external_ref: 'SUB-001',
        plan_name: 'Enterprise',
        start_date: '2023-01-15',
        end_date: null,
        mrr: 5000,
        currency: 'GBP',
        is_active: true,
        checksum: 'subchecksum1',
      },
      {
        company_id: testCompanyId,
        customer_id: cust2Id,
        external_ref: 'SUB-002',
        plan_name: 'Pro',
        start_date: '2023-02-20',
        end_date: '2023-08-20',
        mrr: 1200,
        currency: 'GBP',
        is_active: false,
        checksum: 'subchecksum2',
      },
    ];

    await supabase.from('subscriptions').insert(subscriptions);
  });

  test.afterAll(async () => {
    if (testCompanyId) {
      await supabase.from('companies').delete().eq('id', testCompanyId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('TC-RECOMP-001: Successfully trigger recalculation with Financial Admin role', async ({ request }) => {
    // Act: Trigger recalculation
    const response = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/recompute`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Assert: 202 Accepted (async operation started)
    expect(response.status()).toBe(202);

    const body = await response.json();

    expect(body).toMatchObject({
      recalculation_id: expect.any(String),
      status: 'processing',
      affected_months: expect.any(Number),
      estimated_completion_time: expect.any(String),
    });

    expect(body.affected_months).toBeGreaterThan(0);

    // Verify recalculation started (check for eventual completion)
    let calculationComplete = false;
    let attempts = 0;
    const maxAttempts = 10; // 10 seconds timeout

    while (!calculationComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: snapshots } = await supabase
        .from('kpi_snapshots')
        .select('*')
        .eq('company_id', testCompanyId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (snapshots && snapshots.length > 0) {
        calculationComplete = true;
        expect(snapshots[0].arr).toBeGreaterThan(0);
      }

      attempts++;
    }

    expect(calculationComplete).toBe(true);
  });

  test('TC-RECOMP-002: Verify recalculation completes within <5 seconds for 24 months (FR-040)', async ({ request }) => {
    // Arrange: Delete existing snapshots to force full recalculation
    await supabase.from('kpi_snapshots').delete().eq('company_id', testCompanyId);

    // Act: Measure recalculation time
    const startTime = Date.now();

    const response = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/recompute`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.status()).toBe(202);

    // Poll for completion
    let calculationComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max

    while (!calculationComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Check every 100ms

      const { data: snapshots } = await supabase
        .from('kpi_snapshots')
        .select('*')
        .eq('company_id', testCompanyId);

      if (snapshots && snapshots.length > 0) {
        calculationComplete = true;
      }

      attempts++;
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Assert: Completed within 5 seconds (5000ms)
    expect(calculationComplete).toBe(true);
    expect(totalTime).toBeLessThan(5000);
  });

  test('TC-RECOMP-003: Reject recalculation without Financial Admin role (FR-051)', async ({ request }) => {
    // Arrange: Create user with only Financial Editor role
    const { data: editorUser } = await supabase.auth.admin.createUser({
      email: `editor-${Date.now()}@oppspot.test`,
      password: 'TestPass123!',
      email_confirm: true,
    });

    const { data: editorSession } = await supabase.auth.signInWithPassword({
      email: editorUser!.user.email!,
      password: 'TestPass123!',
    });

    const editorToken = editorSession!.session.access_token;

    // Grant only Editor role (not Admin)
    await supabase.from('financial_roles').insert({
      user_id: editorUser!.user.id,
      company_id: testCompanyId,
      role: 'editor',
    });

    // Act: Try to trigger recalculation with Editor role
    const response = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/recompute`,
      {
        headers: {
          Authorization: `Bearer ${editorToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Assert: 403 Forbidden
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error).toContain('insufficient permissions');
    expect(body.required_role).toBe('admin');

    // Clean up
    await supabase.auth.admin.deleteUser(editorUser!.user.id);
  });

  test('TC-RECOMP-004: Reject unauthorized access (no auth token)', async ({ request }) => {
    // Act: Try to recompute without authentication
    const response = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/recompute`
    );

    // Assert: 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toContain('authentication required');
  });

  test('TC-RECOMP-005: Return 400 when no financial data exists to recalculate', async ({ request }) => {
    // Arrange: Create company with no financial data
    const { data: orgData } = await supabase
      .from('organizations')
      .insert({ name: `Empty Recomp Org ${Date.now()}` })
      .select()
      .single();

    const { data: emptyCompany } = await supabase
      .from('companies')
      .insert({
        org_id: orgData!.id,
        name: 'Empty Recompute Company',
        registration_number: `EMPTYRECOMP${Date.now()}`,
      })
      .select()
      .single();

    // Grant admin role for empty company
    await supabase.from('financial_roles').insert({
      user_id: testUserId,
      company_id: emptyCompany!.id,
      role: 'admin',
    });

    // Act: Try to recompute with no data
    const response = await request.post(
      `http://localhost:3000/api/companies/${emptyCompany!.id}/financials/recompute`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('no financial data');

    // Clean up
    await supabase.from('companies').delete().eq('id', emptyCompany!.id);
  });

  test('TC-RECOMP-006: Prevent concurrent recalculations (idempotency)', async ({ request }) => {
    // Act: Trigger two recalculations simultaneously
    const response1Promise = request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/recompute`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const response2Promise = request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/recompute`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const [response1, response2] = await Promise.all([response1Promise, response2Promise]);

    // Assert: First succeeds (202), second rejects (409 Conflict)
    const statuses = [response1.status(), response2.status()].sort();

    // One should be 202 (accepted), one should be 409 (conflict)
    expect(statuses).toEqual([202, 409]);

    const conflictResponse = response1.status() === 409 ? response1 : response2;
    const conflictBody = await conflictResponse.json();

    expect(conflictBody.error).toContain('recalculation already in progress');
  });

  test('TC-RECOMP-007: Return recalculation_id for tracking progress', async ({ request }) => {
    // Act: Trigger recalculation
    const response = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/recompute`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(response.status()).toBe(202);

    const body = await response.json();

    // Assert: recalculation_id is a valid UUID
    expect(body.recalculation_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    // Could be used to track progress in future endpoint
    // GET /api/companies/[id]/financials/recompute/[recalculationId]
  });
});
