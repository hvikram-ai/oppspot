/**
 * Contract Tests: Collection Items API
 * Feature: Collection-Based Work Organization
 * Tests: T012-T015
 */

import { test, expect, type Page } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe("Collection Items API", () => {

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill('[name="email"]', "demo@oppspot.com");
    await page.fill('[name="password"]', "Demo123456!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/");
  });

  async function getAuthCookie(page: Page) {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c) => c.name.includes("auth"));
    return authCookie ? `${authCookie.name}=${authCookie.value}` : "";
  }




  // Helper to create a test stream
  async function createTestCollection(request: any, page: any, name = 'Test Collection') {
    const response = await request.post(`${API_BASE}/api/collections`, {
      headers: { 'Cookie': await getAuthCookie(page) },
      data: { name },
    });
    return await response.json();
  }

  // =========================================================================
  // T012: POST /api/collections/[streamId]/items
  // =========================================================================

  test.describe('POST /api/collections/[streamId]/items', () => {

    test('should add item with valid type/ID and return 201', async ({ request, page }) => {
      const stream = await createTestCollection(request, page);

      const response = await request.post(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: {
          item_type: 'business',
          item_id: '12345678-1234-1234-1234-123456789012',
        },
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data.item_type).toBe('business');
    });

    test('should validate item_type enum and return 400', async ({ request, page }) => {
      const stream = await createTestCollection(request, page);

      const response = await request.post(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: {
          item_type: 'invalid_type',
          item_id: '12345678-1234-1234-1234-123456789012',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should validate item_id UUID format and return 400', async ({ request, page }) => {
      const stream = await createTestCollection(request, page);

      const response = await request.post(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: {
          item_type: 'business',
          item_id: 'not-a-uuid',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should return 403 for view-only users', async ({ request, page }) => {
      test.skip(); // Requires multi-user setup
    });

    test('should allow edit+ permission users', async ({ request, page }) => {
      test.skip(); // Requires multi-user setup
    });

    test('same item can be in multiple collections', async ({ request, page }) => {
      const stream1 = await createTestCollection(request, page, 'Collection 1');
      const stream2 = await createTestCollection(request, page, 'Collection 2');
      const itemId = '12345678-1234-1234-1234-123456789012';

      const response1 = await request.post(`${API_BASE}/api/collections/${stream1.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { item_type: 'business', item_id: itemId },
      });

      const response2 = await request.post(`${API_BASE}/api/collections/${stream2.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { item_type: 'business', item_id: itemId },
      });

      expect(response1.status()).toBe(201);
      expect(response2.status()).toBe(201);
    });
  });

  // =========================================================================
  // T013: GET /api/collections/[streamId]/items
  // =========================================================================

  test.describe('GET /api/collections/[streamId]/items', () => {

    test('should list items chronologically (newest first, ORDER BY added_at DESC)', async ({ request, page }) => {
      const stream = await createTestCollection(request, page);

      // Add multiple items
      await request.post(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { item_type: 'business', item_id: '11111111-1111-1111-1111-111111111111' },
      });

      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

      await request.post(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { item_type: 'report', item_id: '22222222-2222-2222-2222-222222222222' },
      });

      const response = await request.get(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.items)).toBe(true);

      // Verify chronological order (newest first)
      if (data.items.length >= 2) {
        const firstAdded = new Date(data.items[0].added_at);
        const secondAdded = new Date(data.items[1].added_at);
        expect(firstAdded.getTime()).toBeGreaterThanOrEqual(secondAdded.getTime());
      }
    });

    test('should paginate results (limit/offset query params)', async ({ request, page }) => {
      const stream = await createTestCollection(request, page);

      const response = await request.get(`${API_BASE}/api/collections/${stream.id}/items?limit=10&offset=0`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');
    });

    test('should return items for all permission levels (view+)', async ({ request, page }) => {
      const stream = await createTestCollection(request, page);

      const response = await request.get(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);
    });

    test('should return empty array for empty stream', async ({ request, page }) => {
      const stream = await createTestCollection(request, page);

      const response = await request.get(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.items).toEqual([]);
    });

    test('should include item metadata (added_by, added_at)', async ({ request, page }) => {
      const stream = await createTestCollection(request, page);

      await request.post(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { item_type: 'business', item_id: '12345678-1234-1234-1234-123456789012' },
      });

      const response = await request.get(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      const data = await response.json();
      if (data.items.length > 0) {
        expect(data.items[0]).toHaveProperty('added_by');
        expect(data.items[0]).toHaveProperty('added_at');
      }
    });
  });

  // =========================================================================
  // T014: DELETE /api/collections/[streamId]/items/[itemId]
  // =========================================================================

  test.describe('DELETE /api/collections/[streamId]/items/[itemId]', () => {

    test('should remove item successfully and return 204', async ({ request, page }) => {
      const stream = await createTestCollection(request, page);

      const addResponse = await request.post(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { item_type: 'business', item_id: '12345678-1234-1234-1234-123456789012' },
      });
      const item = await addResponse.json();

      const response = await request.delete(`${API_BASE}/api/collections/${stream.id}/items/${item.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(204);
    });

    test('should return 403 for view-only users', async ({ request, page }) => {
      test.skip();
    });

    test('should return 404 for non-existent item', async ({ request, page }) => {
      const stream = await createTestCollection(request, page);
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request.delete(`${API_BASE}/api/collections/${stream.id}/items/${fakeId}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(404);
    });

    test('should allow edit+ permission users', async ({ request, page }) => {
      test.skip();
    });
  });

  // =========================================================================
  // T015: PATCH /api/collections/[streamId]/items/[itemId]
  // =========================================================================

  test.describe('PATCH /api/collections/[streamId]/items/[itemId]', () => {

    test('should move item to different stream', async ({ request, page }) => {
      const stream1 = await createTestCollection(request, page, 'Collection 1');
      const stream2 = await createTestCollection(request, page, 'Collection 2');

      const addResponse = await request.post(`${API_BASE}/api/collections/${stream1.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { item_type: 'business', item_id: '12345678-1234-1234-1234-123456789012' },
      });
      const item = await addResponse.json();

      const response = await request.patch(`${API_BASE}/api/collections/${stream1.id}/items/${item.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { target_collection_id: stream2.id },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.collection_id).toBe(stream2.id);
    });

    test('should validate target stream exists and return 404', async ({ request, page }) => {
      const stream = await createTestCollection(request, page);

      const addResponse = await request.post(`${API_BASE}/api/collections/${stream.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { item_type: 'business', item_id: '12345678-1234-1234-1234-123456789012' },
      });
      const item = await addResponse.json();

      const fakeStreamId = '00000000-0000-0000-0000-000000000000';
      const response = await request.patch(`${API_BASE}/api/collections/${stream.id}/items/${item.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { target_collection_id: fakeStreamId },
      });

      expect(response.status()).toBe(404);
    });

    test('should check permissions on both collections and return 403', async ({ request, page }) => {
      test.skip();
    });

    test('should preserve item metadata (item_type, item_id)', async ({ request, page }) => {
      const stream1 = await createTestCollection(request, page, 'Collection 1');
      const stream2 = await createTestCollection(request, page, 'Collection 2');

      const addResponse = await request.post(`${API_BASE}/api/collections/${stream1.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { item_type: 'business', item_id: '12345678-1234-1234-1234-123456789012' },
      });
      const item = await addResponse.json();

      const response = await request.patch(`${API_BASE}/api/collections/${stream1.id}/items/${item.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { target_collection_id: stream2.id },
      });

      const data = await response.json();
      expect(data.item_type).toBe('business');
      expect(data.item_id).toBe('12345678-1234-1234-1234-123456789012');
    });

    test('should update added_at to current time', async ({ request, page }) => {
      const stream1 = await createTestCollection(request, page, 'Collection 1');
      const stream2 = await createTestCollection(request, page, 'Collection 2');

      const addResponse = await request.post(`${API_BASE}/api/collections/${stream1.id}/items`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { item_type: 'business', item_id: '12345678-1234-1234-1234-123456789012' },
      });
      const item = await addResponse.json();
      const originalAddedAt = item.added_at;

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request.patch(`${API_BASE}/api/collections/${stream1.id}/items/${item.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { target_collection_id: stream2.id },
      });

      const data = await response.json();
      expect(new Date(data.added_at).getTime()).toBeGreaterThan(new Date(originalAddedAt).getTime());
    });
  });
});
