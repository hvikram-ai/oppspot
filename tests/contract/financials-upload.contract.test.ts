/**
 * Contract Test: POST /api/companies/[id]/financials/upload
 *
 * Tests the multipart/form-data CSV upload endpoint for financial data.
 * This test validates the API contract before implementation (TDD).
 *
 * Expected to FAIL until implementation is complete (T014-T015).
 */

import { expect, test, describe } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('POST /api/companies/[companyId]/financials/upload', () => {
  let supabase: ReturnType<typeof createClient>;
  let authToken: string;
  let testCompanyId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `test-financials-${Date.now()}@oppspot.test`,
      password: 'TestPass123!',
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create test user: ${authError?.message}`);
    }

    testUserId = authData.user.id;

    // Sign in to get auth token
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: authData.user.email!,
      password: 'TestPass123!',
    });

    if (signInError || !sessionData.session) {
      throw new Error(`Failed to sign in: ${signInError?.message}`);
    }

    authToken = sessionData.session.access_token;

    // Create test organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: `Test Org ${Date.now()}` })
      .select()
      .single();

    if (orgError || !orgData) {
      throw new Error(`Failed to create test org: ${orgError?.message}`);
    }

    // Create test company
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({
        org_id: orgData.id,
        name: 'Test Financial Company',
        registration_number: `TEST${Date.now()}`,
      })
      .select()
      .single();

    if (companyError || !companyData) {
      throw new Error(`Failed to create test company: ${companyError?.message}`);
    }

    testCompanyId = companyData.id;

    // Grant Financial Editor role
    const { error: roleError } = await supabase
      .from('financial_roles')
      .insert({
        user_id: testUserId,
        company_id: testCompanyId,
        role: 'editor',
      });

    if (roleError) {
      throw new Error(`Failed to grant Financial Editor role: ${roleError.message}`);
    }
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testCompanyId) {
      await supabase.from('companies').delete().eq('id', testCompanyId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  test('TC-FIN-001: Successfully upload valid CSV with customers and subscriptions', async ({ request }) => {
    // Arrange: Create valid CSV content
    const customersCSV = `customer_id,name,email,country,acquisition_date
CUST-001,Acme Corp,contact@acme.com,GB,2023-01-15
CUST-002,TechStart Ltd,hello@techstart.io,IE,2023-02-20`;

    const subscriptionsCSV = `customer_id,plan,currency,start_date,end_date,mrr,status
CUST-001,Enterprise,GBP,2023-01-15,,5000,active
CUST-002,Pro,GBP,2023-02-20,2023-08-20,1200,churned`;

    // Write to temp files
    const tempDir = path.join(process.cwd(), 'tests', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const customersPath = path.join(tempDir, 'customers.csv');
    const subscriptionsPath = path.join(tempDir, 'subscriptions.csv');

    fs.writeFileSync(customersPath, customersCSV);
    fs.writeFileSync(subscriptionsPath, subscriptionsCSV);

    // Act: Upload CSV files
    const formData = new FormData();
    formData.append('customers', fs.createReadStream(customersPath));
    formData.append('subscriptions', fs.createReadStream(subscriptionsPath));

    const response = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/upload`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        data: formData,
      }
    );

    // Assert: 201 Created with upload details
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body).toMatchObject({
      upload_id: expect.any(String),
      affected_months: expect.any(Number),
      recalculation_status: 'triggered',
    });

    expect(body.affected_months).toBeGreaterThan(0);

    // Verify data was inserted
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', testCompanyId);

    expect(customers).toHaveLength(2);
    expect(customers![0].external_ref).toBe('CUST-001');

    // Clean up temp files
    fs.unlinkSync(customersPath);
    fs.unlinkSync(subscriptionsPath);
  });

  test('TC-FIN-002: Reject CSV with mixed currencies (FR-002)', async ({ request }) => {
    // Arrange: Create CSV with mixed currencies
    const subscriptionsCSV = `customer_id,plan,currency,start_date,mrr,status
CUST-001,Enterprise,GBP,2023-01-15,5000,active
CUST-002,Pro,USD,2023-02-20,1200,active`;

    const tempDir = path.join(process.cwd(), 'tests', 'temp');
    const subscriptionsPath = path.join(tempDir, 'subscriptions_mixed.csv');

    fs.writeFileSync(subscriptionsPath, subscriptionsCSV);

    const formData = new FormData();
    formData.append('subscriptions', fs.createReadStream(subscriptionsPath));

    // Act: Upload CSV
    const response = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/upload`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        data: formData,
      }
    );

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('mixed currencies');
    expect(body.details).toMatchObject({
      currencies_found: expect.arrayContaining(['GBP', 'USD']),
    });

    // Clean up
    fs.unlinkSync(subscriptionsPath);
  });

  test('TC-FIN-003: Reject invalid CSV format (missing required columns)', async ({ request }) => {
    // Arrange: Create CSV with missing required column (customer_id)
    const customersCSV = `name,email,country,acquisition_date
Acme Corp,contact@acme.com,GB,2023-01-15`;

    const tempDir = path.join(process.cwd(), 'tests', 'temp');
    const customersPath = path.join(tempDir, 'customers_invalid.csv');

    fs.writeFileSync(customersPath, customersCSV);

    const formData = new FormData();
    formData.append('customers', fs.createReadStream(customersPath));

    // Act: Upload CSV
    const response = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/upload`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        data: formData,
      }
    );

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('missing required column');
    expect(body.details).toMatchObject({
      missing_columns: expect.arrayContaining(['customer_id']),
    });

    // Clean up
    fs.unlinkSync(customersPath);
  });

  test('TC-FIN-004: Reject upload without Financial Editor role (FR-050)', async ({ request }) => {
    // Arrange: Create new user without Financial Editor role
    const { data: unauthorizedUser } = await supabase.auth.admin.createUser({
      email: `unauthorized-${Date.now()}@oppspot.test`,
      password: 'TestPass123!',
      email_confirm: true,
    });

    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: unauthorizedUser!.user.email!,
      password: 'TestPass123!',
    });

    const unauthorizedToken = sessionData!.session.access_token;

    const customersCSV = `customer_id,name,email,country,acquisition_date
CUST-001,Acme Corp,contact@acme.com,GB,2023-01-15`;

    const tempDir = path.join(process.cwd(), 'tests', 'temp');
    const customersPath = path.join(tempDir, 'customers_unauthorized.csv');

    fs.writeFileSync(customersPath, customersCSV);

    const formData = new FormData();
    formData.append('customers', fs.createReadStream(customersPath));

    // Act: Upload CSV with unauthorized user
    const response = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/upload`,
      {
        headers: {
          Authorization: `Bearer ${unauthorizedToken}`,
          ...formData.getHeaders(),
        },
        data: formData,
      }
    );

    // Assert: 403 Forbidden
    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.error).toContain('insufficient permissions');
    expect(body.required_role).toBe('editor');

    // Clean up
    fs.unlinkSync(customersPath);
    await supabase.auth.admin.deleteUser(unauthorizedUser!.user.id);
  });

  test('TC-FIN-005: Handle duplicate rows using checksum (idempotency)', async ({ request }) => {
    // Arrange: Upload same CSV twice
    const customersCSV = `customer_id,name,email,country,acquisition_date
CUST-DUP-001,Duplicate Corp,dup@test.com,GB,2023-01-15`;

    const tempDir = path.join(process.cwd(), 'tests', 'temp');
    const customersPath = path.join(tempDir, 'customers_duplicate.csv');

    fs.writeFileSync(customersPath, customersCSV);

    const formData1 = new FormData();
    formData1.append('customers', fs.createReadStream(customersPath));

    // Act: First upload
    const response1 = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/upload`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData1.getHeaders(),
        },
        data: formData1,
      }
    );

    expect(response1.status()).toBe(201);

    // Second upload (duplicate)
    const formData2 = new FormData();
    formData2.append('customers', fs.createReadStream(customersPath));

    const response2 = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/upload`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData2.getHeaders(),
        },
        data: formData2,
      }
    );

    // Assert: 201 but with duplicate warning
    expect(response2.status()).toBe(201);

    const body2 = await response2.json();
    expect(body2.duplicates_skipped).toBeGreaterThan(0);

    // Verify only one record exists in database
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('company_id', testCompanyId)
      .eq('external_ref', 'CUST-DUP-001');

    expect(customers).toHaveLength(1);

    // Clean up
    fs.unlinkSync(customersPath);
  });

  test('TC-FIN-006: Verify auto-recalculation trigger after upload (FR-040)', async ({ request }) => {
    // Arrange: Create valid CSV
    const customersCSV = `customer_id,name,email,country,acquisition_date
CUST-RECALC-001,Recalc Corp,recalc@test.com,GB,2023-01-15`;

    const subscriptionsCSV = `customer_id,plan,currency,start_date,mrr,status
CUST-RECALC-001,Pro,GBP,2023-01-15,2000,active`;

    const tempDir = path.join(process.cwd(), 'tests', 'temp');
    const customersPath = path.join(tempDir, 'customers_recalc.csv');
    const subscriptionsPath = path.join(tempDir, 'subscriptions_recalc.csv');

    fs.writeFileSync(customersPath, customersCSV);
    fs.writeFileSync(subscriptionsPath, subscriptionsCSV);

    const formData = new FormData();
    formData.append('customers', fs.createReadStream(customersPath));
    formData.append('subscriptions', fs.createReadStream(subscriptionsPath));

    // Act: Upload CSV
    const response = await request.post(
      `http://localhost:3000/api/companies/${testCompanyId}/financials/upload`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData.getHeaders(),
        },
        data: formData,
      }
    );

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.recalculation_status).toBe('triggered');

    // Assert: Wait for recalculation to complete (polling)
    let calculationComplete = false;
    let attempts = 0;
    const maxAttempts = 20; // 20 seconds timeout

    while (!calculationComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const { data: snapshots } = await supabase
        .from('kpi_snapshots')
        .select('*')
        .eq('company_id', testCompanyId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (snapshots && snapshots.length > 0) {
        const latestSnapshot = snapshots[0];
        const uploadTime = new Date(body.upload_timestamp).getTime();
        const snapshotTime = new Date(latestSnapshot.created_at).getTime();

        if (snapshotTime >= uploadTime) {
          calculationComplete = true;
          expect(latestSnapshot.arr).toBeGreaterThan(0);
        }
      }

      attempts++;
    }

    expect(calculationComplete).toBe(true);

    // Clean up
    fs.unlinkSync(customersPath);
    fs.unlinkSync(subscriptionsPath);
  });
});
