/**
 * Contract Test: GET /api/{entityType}/{id}/red-flags/{flagId}
 *
 * Purpose: Verify API contract for red flag detail view
 * Reference: contracts/api-red-flags-detail.yaml
 * Expected: These tests MUST FAIL until T035 is implemented
 */

import { test, expect } from '@playwright/test';

const TEST_COMPANY_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_FLAG_ID = '323e4567-e89b-12d3-a456-426614174000';

test.describe('GET /api/companies/{id}/red-flags/{flagId}', () => {
  test('should return full red flag detail', async ({ request }) => {
    // Act: Fetch flag detail
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}`);

    // Assert: Response status and structure
    expect(response.status()).toBe(200);

    const body = await response.json();

    // Required fields
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('entity_type');
    expect(['company', 'data_room']).toContain(body.entity_type);
    expect(body).toHaveProperty('entity_id');
    expect(body).toHaveProperty('category');
    expect(['financial', 'legal', 'operational', 'cyber', 'esg']).toContain(body.category);
    expect(body).toHaveProperty('title');
    expect(body).toHaveProperty('severity');
    expect(['critical', 'high', 'medium', 'low']).toContain(body.severity);
    expect(body).toHaveProperty('status');
    expect(['open', 'reviewing', 'mitigating', 'resolved', 'false_positive']).toContain(body.status);
    expect(body).toHaveProperty('first_detected_at');
    expect(body).toHaveProperty('last_updated_at');
    expect(body).toHaveProperty('fingerprint');
    expect(body).toHaveProperty('evidence');
    expect(Array.isArray(body.evidence)).toBe(true);
    expect(body).toHaveProperty('actions');
    expect(Array.isArray(body.actions)).toBe(true);
  });

  test('should validate evidence structure', async ({ request }) => {
    // Act
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}`);
    const body = await response.json();

    // Assert: Each evidence item has required fields
    if (body.evidence.length > 0) {
      const evidence = body.evidence[0];
      expect(evidence).toHaveProperty('id');
      expect(evidence).toHaveProperty('evidence_type');
      expect(['document', 'alert', 'signal', 'kpi', 'news']).toContain(evidence.evidence_type);
      expect(evidence).toHaveProperty('created_at');

      if (evidence.preview) {
        expect(evidence.preview.length).toBeLessThanOrEqual(200);
      }

      if (evidence.importance !== null) {
        expect(evidence.importance).toBeGreaterThanOrEqual(0);
        expect(evidence.importance).toBeLessThanOrEqual(1);
      }

      // Validate citation structure based on evidence type
      if (evidence.citation) {
        if (evidence.evidence_type === 'document') {
          expect(evidence.citation).toHaveProperty('documentId');
          expect(evidence.citation).toHaveProperty('pageNumber');
          expect(evidence.citation).toHaveProperty('chunkIndex');
        } else if (evidence.evidence_type === 'alert') {
          expect(evidence.citation).toHaveProperty('alertId');
          expect(evidence.citation).toHaveProperty('severity');
        } else if (evidence.evidence_type === 'kpi') {
          expect(evidence.citation).toHaveProperty('kpiId');
          expect(evidence.citation).toHaveProperty('value');
          expect(evidence.citation).toHaveProperty('threshold');
        }
      }
    }
  });

  test('should validate action history structure', async ({ request }) => {
    // Act
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}`);
    const body = await response.json();

    // Assert: Each action has required fields
    if (body.actions.length > 0) {
      const action = body.actions[0];
      expect(action).toHaveProperty('id');
      expect(action).toHaveProperty('action_type');
      expect(['assign', 'note', 'status_change', 'snooze', 'remediation', 'override']).toContain(action.action_type);
      expect(action).toHaveProperty('payload');
      expect(typeof action.payload).toBe('object');
      expect(action).toHaveProperty('created_at');

      // Actions should be sorted by created_at DESC
      if (body.actions.length > 1) {
        const firstTime = new Date(body.actions[0].created_at).getTime();
        const secondTime = new Date(body.actions[1].created_at).getTime();
        expect(firstTime).toBeGreaterThanOrEqual(secondTime);
      }
    }
  });

  test('should include explainer if available', async ({ request }) => {
    // Act
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}`);
    const body = await response.json();

    // Assert: If explainer exists, validate structure
    if (body.explainer) {
      expect(body.explainer).toHaveProperty('why');
      expect(typeof body.explainer.why).toBe('string');
      expect(body.explainer).toHaveProperty('key_evidence');
      expect(Array.isArray(body.explainer.key_evidence)).toBe(true);
      expect(body.explainer).toHaveProperty('suggested_remediation');
      expect(typeof body.explainer.suggested_remediation).toBe('string');
      expect(body.explainer).toHaveProperty('timeframe');
      expect(body.explainer).toHaveProperty('cached_at');
    }
  });

  test('should include owner information if assigned', async ({ request }) => {
    // Act
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}`);
    const body = await response.json();

    // Assert: If owner exists, validate structure
    if (body.owner) {
      expect(body.owner).toHaveProperty('id');
      expect(body.owner).toHaveProperty('name');
      expect(body.owner).toHaveProperty('email');
      // avatar_url is optional
    }
  });

  test('should validate confidence score range', async ({ request }) => {
    // Act
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}`);
    const body = await response.json();

    // Assert: Confidence must be between 0 and 1 if present
    if (body.confidence !== null && body.confidence !== undefined) {
      expect(body.confidence).toBeGreaterThanOrEqual(0);
      expect(body.confidence).toBeLessThanOrEqual(1);
    }
  });

  test('should return 404 for non-existent flag', async ({ request }) => {
    // Act: Request non-existent flag
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/${fakeId}`);

    // Assert: Should return 404
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should return 403 for flag belonging to inaccessible entity', async ({ request }) => {
    // Act: Request flag for company user doesn't have access to
    const inaccessibleCompanyId = '99999999-9999-9999-9999-999999999999';
    const response = await request.get(`/api/companies/${inaccessibleCompanyId}/red-flags/${TEST_FLAG_ID}`);

    // Assert: Should return 403 (or 404 depending on security policy)
    expect([403, 404]).toContain(response.status());
  });

  test('should handle snoozed flags', async ({ request }) => {
    // Act
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}`);
    const body = await response.json();

    // Assert: If snoozed_until exists, it should be a valid timestamp
    if (body.snoozed_until) {
      const snoozeTime = new Date(body.snoozed_until).getTime();
      expect(snoozeTime).toBeGreaterThan(0);
    }
  });

  test('should include run_id reference', async ({ request }) => {
    // Act
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags/${TEST_FLAG_ID}`);
    const body = await response.json();

    // Assert: run_id should be UUID or null
    if (body.run_id) {
      expect(body.run_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    }
  });
});
