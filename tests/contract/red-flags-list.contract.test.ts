/**
 * Contract Test: GET /api/{entityType}/{id}/red-flags
 *
 * Purpose: Verify API contract for listing red flags
 * Reference: contracts/api-red-flags-list.yaml
 * Expected: These tests MUST FAIL until T034 is implemented
 */

import { test, expect } from '@playwright/test';

const TEST_COMPANY_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_DATA_ROOM_ID = '223e4567-e89b-12d3-a456-426614174000';

test.describe('GET /api/companies/{id}/red-flags', () => {
  test('should return paginated list of red flags', async ({ request }) => {
    // Act: Fetch red flags for company
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags`);

    // Assert: Response status and structure
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body).toHaveProperty('pagination');
    expect(body.pagination).toHaveProperty('page');
    expect(body.pagination).toHaveProperty('limit');
    expect(body.pagination).toHaveProperty('total');
    expect(body.pagination).toHaveProperty('total_pages');
    expect(body).toHaveProperty('summary');
    expect(body.summary).toHaveProperty('total');
    expect(body.summary).toHaveProperty('by_category');
    expect(body.summary).toHaveProperty('by_severity');
    expect(body.summary).toHaveProperty('by_status');
  });

  test('should validate red flag item structure', async ({ request }) => {
    // Act
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags`);
    const body = await response.json();

    // Assert: Each red flag has required fields
    if (body.data.length > 0) {
      const flag = body.data[0];
      expect(flag).toHaveProperty('id');
      expect(flag).toHaveProperty('category');
      expect(['financial', 'legal', 'operational', 'cyber', 'esg']).toContain(flag.category);
      expect(flag).toHaveProperty('title');
      expect(flag.title.length).toBeLessThanOrEqual(255);
      expect(flag).toHaveProperty('severity');
      expect(['critical', 'high', 'medium', 'low']).toContain(flag.severity);
      expect(flag).toHaveProperty('status');
      expect(['open', 'reviewing', 'mitigating', 'resolved', 'false_positive']).toContain(flag.status);
      expect(flag).toHaveProperty('first_detected_at');
      expect(flag).toHaveProperty('last_updated_at');

      if (flag.confidence !== null) {
        expect(flag.confidence).toBeGreaterThanOrEqual(0);
        expect(flag.confidence).toBeLessThanOrEqual(1);
      }

      if (flag.evidence_preview) {
        expect(Array.isArray(flag.evidence_preview)).toBe(true);
        expect(flag.evidence_preview.length).toBeLessThanOrEqual(3);
      }
    }
  });

  test('should filter by status', async ({ request }) => {
    // Act: Filter by open status
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags?status=open`);

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Assert: All returned flags have status = open
    for (const flag of body.data) {
      expect(flag.status).toBe('open');
    }
  });

  test('should filter by category', async ({ request }) => {
    // Act: Filter by financial category
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags?category=financial`);

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Assert: All returned flags are financial
    for (const flag of body.data) {
      expect(flag.category).toBe('financial');
    }
  });

  test('should filter by severity', async ({ request }) => {
    // Act: Filter by critical severity
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags?severity=critical`);

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Assert: All returned flags are critical
    for (const flag of body.data) {
      expect(flag.severity).toBe('critical');
    }
  });

  test('should filter by multiple categories', async ({ request }) => {
    // Act: Filter by financial and legal
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags?category=financial,legal`);

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Assert: All returned flags are either financial or legal
    for (const flag of body.data) {
      expect(['financial', 'legal']).toContain(flag.category);
    }
  });

  test('should search by text', async ({ request }) => {
    // Act: Search for "revenue"
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags?search=revenue`);

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Assert: Results contain search term in title or description
    for (const flag of body.data) {
      const matchesTitle = flag.title.toLowerCase().includes('revenue');
      const matchesDescription = flag.description?.toLowerCase().includes('revenue') || false;
      expect(matchesTitle || matchesDescription).toBe(true);
    }
  });

  test('should sort by severity desc by default', async ({ request }) => {
    // Act: Fetch without explicit sort
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags`);

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Assert: Results sorted by severity DESC (critical > high > medium > low)
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    if (body.data.length > 1) {
      for (let i = 0; i < body.data.length - 1; i++) {
        const currentSeverity = severityOrder[body.data[i].severity];
        const nextSeverity = severityOrder[body.data[i + 1].severity];
        expect(currentSeverity).toBeGreaterThanOrEqual(nextSeverity);
      }
    }
  });

  test('should paginate results', async ({ request }) => {
    // Act: Request first page with limit of 10
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags?page=1&limit=10`);

    expect(response.status()).toBe(200);
    const body = await response.json();

    // Assert: Pagination metadata is correct
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
    expect(body.data.length).toBeLessThanOrEqual(10);
    if (body.pagination.total > 10) {
      expect(body.pagination.total_pages).toBeGreaterThan(1);
    }
  });

  test('should return 401 for unauthenticated requests', async ({ request }) => {
    // Note: This test assumes request context is not authenticated
    // Actual implementation may vary based on auth setup

    // Act: Make request without auth headers
    const response = await request.get(`/api/companies/${TEST_COMPANY_ID}/red-flags`, {
      headers: {
        // Remove any auth headers
        'Authorization': ''
      }
    });

    // Assert: Should return 401 or redirect to login
    expect([401, 302, 307]).toContain(response.status());
  });

  test('should return 404 for non-existent company', async ({ request }) => {
    // Act: Request flags for non-existent company
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request.get(`/api/companies/${fakeId}/red-flags`);

    // Assert: Should return 404
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});

test.describe('GET /api/data-rooms/{id}/red-flags', () => {
  test('should work for data-rooms as well as companies', async ({ request }) => {
    // Act: Fetch red flags for data room
    const response = await request.get(`/api/data-rooms/${TEST_DATA_ROOM_ID}/red-flags`);

    // Assert: Same response structure as companies
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body).toHaveProperty('pagination');
    expect(body).toHaveProperty('summary');
  });
});
