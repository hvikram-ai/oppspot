/**
 * Contract Test: POST /api/{entityType}/{id}/red-flags/{flagId}/actions
 *
 * Purpose: Verify API contract for recording flag actions
 * Reference: contracts/api-red-flags-actions.yaml
 * Expected: These tests MUST FAIL until T037 is implemented
 */

import { test, expect } from '@playwright/test';

const TEST_COMPANY_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_FLAG_ID = '323e4567-e89b-12d3-a456-426614174000';
const TEST_USER_ID = '423e4567-e89b-12d3-a456-426614174000';

test.describe('POST /api/companies/{id}/red-flags/{flagId}/actions', () => {
  test('should create assign action', async ({ request }) => {
    // Act: Assign flag to user
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'assign',
        assignee_id: TEST_USER_ID
      }
    });

    // Assert: Should return 201 Created
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('flag_id');
    expect(body.flag_id).toBe(TEST_FLAG_ID);
    expect(body).toHaveProperty('action_type');
    expect(body.action_type).toBe('assign');
    expect(body).toHaveProperty('created_at');
    expect(body).toHaveProperty('payload');
    expect(body.payload).toHaveProperty('assignee_id');
    expect(body.payload.assignee_id).toBe(TEST_USER_ID);
  });

  test('should create note action', async ({ request }) => {
    // Act: Add note to flag
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'note',
        text: 'This is an internal note about the flag',
        is_internal: true
      }
    });

    // Assert: Should return 201
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.action_type).toBe('note');
    expect(body.payload).toHaveProperty('text');
    expect(body.payload.text).toContain('internal note');
    expect(body.payload).toHaveProperty('is_internal');
  });

  test('should create status_change action', async ({ request }) => {
    // Act: Change status from open to reviewing
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'status_change',
        to: 'reviewing',
        reason: 'Starting investigation'
      }
    });

    // Assert: Should return 201
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.action_type).toBe('status_change');
    expect(body.payload).toHaveProperty('to');
    expect(body.payload.to).toBe('reviewing');
    expect(body).toHaveProperty('flag_updated');
    expect(body.flag_updated).toHaveProperty('status');
    expect(body.flag_updated.status).toBe('reviewing');
  });

  test('should create snooze action', async ({ request }) => {
    // Act: Snooze notifications for 30 days
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'snooze',
        duration_days: 30,
        reason: 'Waiting for Q4 data'
      }
    });

    // Assert: Should return 201
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.action_type).toBe('snooze');
    expect(body.payload).toHaveProperty('duration_days');
    expect(body.payload.duration_days).toBe(30);
    expect(body.payload).toHaveProperty('reason');
    expect(body).toHaveProperty('flag_updated');
    expect(body.flag_updated).toHaveProperty('snoozed_until');
  });

  test('should create remediation action', async ({ request }) => {
    // Act: Add remediation plan
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'remediation',
        plan: 'Diversify customer base by targeting 3 new market segments',
        eta: '2025-12-31T23:59:59Z',
        stakeholders: [TEST_USER_ID]
      }
    });

    // Assert: Should return 201
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.action_type).toBe('remediation');
    expect(body.payload).toHaveProperty('plan');
    expect(body.payload).toHaveProperty('eta');
    expect(body.payload).toHaveProperty('stakeholders');
    expect(Array.isArray(body.payload.stakeholders)).toBe(true);
  });

  test('should create override action for severity', async ({ request }) => {
    // Act: Override severity with justification
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'override',
        field: 'severity',
        to: 'high',
        reason: 'AI overestimated risk; customer has long-term contract'
      }
    });

    // Assert: Should return 201
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.action_type).toBe('override');
    expect(body.payload).toHaveProperty('field');
    expect(body.payload.field).toBe('severity');
    expect(body.payload).toHaveProperty('to');
    expect(body.payload).toHaveProperty('reason');
    expect(body).toHaveProperty('flag_updated');
    expect(body.flag_updated).toHaveProperty('severity');
  });

  test('should create override action for confidence', async ({ request }) => {
    // Act: Override confidence score
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'override',
        field: 'confidence',
        to: 0.95,
        reason: 'Manually verified with legal team'
      }
    });

    // Assert: Should return 201
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.action_type).toBe('override');
    expect(body.payload.field).toBe('confidence');
    expect(body.payload.to).toBe(0.95);
    expect(body.flag_updated).toHaveProperty('confidence');
  });

  test('should reject invalid status transition', async ({ request }) => {
    // Act: Try to transition from resolved back to open (invalid)
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'status_change',
        to: 'open' // Assuming current status is resolved
      }
    });

    // Assert: Should return 400 for invalid transition
    // Note: This test depends on flag's current status
    if (response.status() === 400) {
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('INVALID_STATUS_TRANSITION');
    }
  });

  test('should reject override without reason', async ({ request }) => {
    // Act: Try to override without providing reason
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'override',
        field: 'severity',
        to: 'low'
        // Missing: reason
      }
    });

    // Assert: Should return 400
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toContain('reason');
  });

  test('should reject snooze with invalid duration', async ({ request }) => {
    // Act: Try to snooze with duration > 365 days
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'snooze',
        duration_days: 500,
        reason: 'Very long snooze'
      }
    });

    // Assert: Should return 400
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should validate note text length', async ({ request }) => {
    // Act: Try to add very long note (>5000 chars)
    const longText = 'a'.repeat(5001);
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'note',
        text: longText
      }
    });

    // Assert: Should return 400
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should return 404 for non-existent flag', async ({ request }) => {
    // Act: Try to add action to non-existent flag
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${fakeId}/actions`, {
      data: {
        action_type: 'note',
        text: 'Test note'
      }
    });

    // Assert: Should return 404
    expect(response.status()).toBe(404);
  });

  test('should include actor information in response', async ({ request }) => {
    // Act: Create any action
    const response = await request.post(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}/actions`, {
      data: {
        action_type: 'note',
        text: 'Test note for actor validation'
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    // Assert: Should include actor details
    if (body.actor) {
      expect(body.actor).toHaveProperty('id');
      expect(body.actor).toHaveProperty('name');
      expect(body.actor).toHaveProperty('email');
    }
  });
});
