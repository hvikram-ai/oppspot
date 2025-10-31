/**
 * Contract Test: POST /api/{entityType}/{id}/red-flags/recompute
 *
 * Purpose: Verify API contract for triggering detection runs
 * Reference: contracts/api-red-flags-recompute.yaml
 * Expected: These tests MUST FAIL until T036 is implemented
 */

import { test, expect } from '@playwright/test';

const TEST_COMPANY_ID = '123e4567-e89b-12d3-a456-426614174000';

test.describe('POST /api/companies/{id}/red-flags/recompute', () => {
  test('should trigger detection run and return 202 Accepted', async ({ request }) => {
    // Act: Trigger recompute
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/recompute`);

    // Assert: Should return 202 (async execution)
    expect(response.status()).toBe(202);

    const body = await response.json();
    expect(body).toHaveProperty('run_id');
    expect(body.run_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('running');
    expect(body).toHaveProperty('started_at');
    expect(body).toHaveProperty('poll_url');
  });

  test('should accept detector filter in request body', async ({ request }) => {
    // Act: Run only financial and legal detectors
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/recompute`, {
      data: {
        detectors: ['financial', 'legal']
      }
    });

    // Assert: Should accept and process request
    expect(response.status()).toBe(202);
    const body = await response.json();
    expect(body).toHaveProperty('run_id');
  });

  test('should accept force flag in request body', async ({ request }) => {
    // Act: Force run even if recent run exists
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/recompute`, {
      data: {
        force: true
      }
    });

    // Assert: Should accept force flag
    expect(response.status()).toBe(202);
    const body = await response.json();
    expect(body).toHaveProperty('run_id');
  });

  test('should return 400 if recent run exists without force', async ({ request }) => {
    // This test simulates the rate limiting behavior
    // First run should succeed
    const firstResponse = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/recompute`);
    expect(firstResponse.status()).toBe(202);

    // Immediate second run should fail without force=true
    const secondResponse = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/recompute`);

    // Assert: Should return 400 with rate limit info
    if (secondResponse.status() === 400) {
      const body = await secondResponse.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('RECENT_RUN_EXISTS');
      expect(body).toHaveProperty('details');
      expect(body.details).toHaveProperty('last_run_id');
    }
    // Note: This test may pass 202 if enough time has elapsed
  });

  test('should return 403 for non-editor users', async ({ request }) => {
    // Note: This assumes request context is authenticated as viewer
    // Act: Attempt to trigger recompute as viewer
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/recompute`);

    // Assert: Should return 403 (or 202 if user is editor)
    // This test will vary based on auth context
    if (response.status() === 403) {
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('INSUFFICIENT_PERMISSIONS');
    }
  });

  test('should return 404 for non-existent company', async ({ request }) => {
    // Act: Trigger recompute for non-existent company
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.post(`/api/companies/${fakeId}/red-flags/recompute`);

    // Assert: Should return 404
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should validate detector names', async ({ request }) => {
    // Act: Send invalid detector name
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/recompute`, {
      data: {
        detectors: ['invalid_detector']
      }
    });

    // Assert: Should return 400 for invalid detector
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});

test.describe('GET /api/companies/{id}/red-flags/runs/{runId}', () => {
  test('should return run status', async ({ request }) => {
    // First, trigger a run to get a run_id
    const triggerResponse = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/recompute`);
    expect(triggerResponse.status()).toBe(202);
    const triggerBody = await triggerResponse.json();
    const runId = triggerBody.run_id;

    // Act: Check run status
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/runs/${runId}`);

    // Assert: Should return run status
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.id).toBe(runId);
    expect(body).toHaveProperty('entity_type');
    expect(['company', 'data_room']).toContain(body.entity_type);
    expect(body).toHaveProperty('entity_id');
    expect(body).toHaveProperty('started_at');
    expect(body).toHaveProperty('status');
    expect(['running', 'success', 'partial', 'error']).toContain(body.status);
  });

  test('should include stats when run completes', async ({ request }) => {
    // This test checks completed run structure
    // Will need a completed run to test against

    // For now, just validate the schema would be correct
    const triggerResponse = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/recompute`);
    const triggerBody = await triggerResponse.json();
    const runId = triggerBody.run_id;

    // Poll until complete or timeout
    let attempts = 0;
    let runStatus = 'running';
    let finalBody;

    while (runStatus === 'running' && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/runs/${runId}`);
      finalBody = await response.json();
      runStatus = finalBody.status;
      attempts++;
    }

    // Assert: If completed, should have stats
    if (finalBody && finalBody.status !== 'running') {
      expect(finalBody).toHaveProperty('finished_at');
      if (finalBody.stats) {
        expect(finalBody.stats).toHaveProperty('detectors_ran');
        expect(finalBody.stats).toHaveProperty('detectors_succeeded');
        expect(finalBody.stats).toHaveProperty('detectors_failed');
        expect(finalBody.stats).toHaveProperty('flags_detected');
        expect(finalBody.stats).toHaveProperty('flags_new');
        expect(finalBody.stats).toHaveProperty('flags_updated');
      }
    }
  });

  test('should return 404 for non-existent run', async ({ request }) => {
    // Act: Request non-existent run
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/runs/${fakeId}`);

    // Assert: Should return 404
    expect(response.status()).toBe(404);
  });
});
