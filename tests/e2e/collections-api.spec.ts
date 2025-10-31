/**
 * Contract Tests: Collection Management API
 * Feature: Collection-Based Work Organization
 * Tests: T006-T011
 *
 * These tests define the expected behavior of stream management endpoints.
 * They MUST FAIL initially (TDD approach) and pass after implementation.
 */

import { test, expect } from '@playwright/test';

// Test configuration
const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Collection Management API', () => {

  test.beforeEach(async ({ page }) => {
    // Login as demo user
    await page.goto('/login');
    await page.fill('#signin-email', 'demo@oppspot.com');
    await page.fill('#signin-password', 'Demo123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  // Helper to get auth cookie
  async function getAuthCookie(page: any) {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c: any) => c.name.includes('auth'));
    return authCookie ? `${authCookie.name}=${authCookie.value}` : '';
  }

  // =========================================================================
  // T006: GET /api/collections
  // =========================================================================

  test.describe('GET /api/collections', () => {

    test('should return owned and shared collections', async ({ request, page }) => {
      const authCookie = await getAuthCookie(page);
      const response = await request.get(`${API_BASE}/api/collections`, {
        headers: {
          'Cookie': authCookie,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('owned');
      expect(data).toHaveProperty('shared');
      expect(Array.isArray(data.owned)).toBe(true);
      expect(Array.isArray(data.shared)).toBe(true);
    });

    test('should filter archived collections by default', async ({ request, page }) => {
      const response = await request.get(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      // Verify no archived collections in default response
      const allCollections = [...data.owned, ...data.shared];
      const archivedCollections = allCollections.filter((s: any) => s.archived_at !== null);
      expect(archivedCollections.length).toBe(0);
    });

    test('should include archived when include_archived=true', async ({ request, page }) => {
      const response = await request.get(`${API_BASE}/api/collections?include_archived=true`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('owned');
      expect(data).toHaveProperty('shared');
      // Should allow archived collections in response
    });

    test('should return 401 for unauthenticated requests', async ({ request, page }) => {
      const response = await request.get(`${API_BASE}/api/collections`);

      expect(response.status()).toBe(401);
    });

    test('should separate owned vs shared in response', async ({ request, page }) => {
      const response = await request.get(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      // Owned collections should have user_id matching auth user
      // Shared collections should have permission_level
      if (data.shared.length > 0) {
        expect(data.shared[0]).toHaveProperty('permission_level');
      }
    });
  });

  // =========================================================================
  // T007: POST /api/collections
  // =========================================================================

  test.describe('POST /api/collections', () => {

    test('should create stream with valid name and return 201', async ({ request, page }) => {
      const response = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Test Collection' },
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name', 'Test Collection');
      expect(data).toHaveProperty('is_system', false);
      expect(data).toHaveProperty('archived_at', null);
    });

    test('should reject empty name with 400', async ({ request, page }) => {
      const response = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: '' },
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('should reject name > 255 chars with 400', async ({ request, page }) => {
      const longName = 'a'.repeat(256);
      const response = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: longName },
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('should return created stream object with id', async ({ request, page }) => {
      const response = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Another Test Collection' },
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.id).toBeTruthy();
      expect(typeof data.id).toBe('string');
      expect(data.created_at).toBeTruthy();
    });

    test('should set is_system = false for user collections', async ({ request, page }) => {
      const response = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'User Collection' },
      });

      expect(response.status()).toBe(201);

      const data = await response.json();
      expect(data.is_system).toBe(false);
    });
  });

  // =========================================================================
  // T008: GET /api/collections/[streamId]
  // =========================================================================

  test.describe('GET /api/collections/[streamId]', () => {

    test('should return stream details for owner', async ({ request, page }) => {
      // First create a stream
      const createResponse = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Test Collection for Detail' },
      });
      const createdCollection = await createResponse.json();

      // Then fetch its details
      const response = await request.get(`${API_BASE}/api/collections/${createdCollection.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(createdCollection.id);
      expect(data.name).toBe('Test Collection for Detail');
    });

    test('should return 404 for non-existent stream', async ({ request, page }) => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request.get(`${API_BASE}/api/collections/${fakeId}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(404);
    });

    test('should return 403 for unauthorized users', async ({ request, page }) => {
      // This test would require creating a stream with one user
      // and trying to access it with another user
      // Skipping for now, requires multi-user test setup
      test.skip();
    });

    test('should include item_count in response', async ({ request, page }) => {
      const createResponse = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Collection with Count' },
      });
      const createdCollection = await createResponse.json();

      const response = await request.get(`${API_BASE}/api/collections/${createdCollection.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('item_count');
      expect(typeof data.item_count).toBe('number');
    });
  });

  // =========================================================================
  // T009: PUT /api/collections/[streamId]
  // =========================================================================

  test.describe('PUT /api/collections/[streamId]', () => {

    test('should rename stream successfully and return 200', async ({ request, page }) => {
      const createResponse = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Original Name' },
      });
      const createdCollection = await createResponse.json();

      const response = await request.put(`${API_BASE}/api/collections/${createdCollection.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'New Name' },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.name).toBe('New Name');
    });

    test('should prevent renaming system collections with 400', async ({ request, page }) => {
      // Get the General stream
      const listResponse = await request.get(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });
      const collections = await listResponse.json();
      const generalCollection = collections.owned.find((s: any) => s.is_system === true);

      if (generalCollection) {
        const response = await request.put(`${API_BASE}/api/collections/${generalCollection.id}`, {
          headers: { 'Cookie': await getAuthCookie(page) },
          data: { name: 'Renamed General' },
        });

        expect(response.status()).toBe(400);

        const data = await response.json();
        expect(data.error).toContain('system');
      }
    });

    test('should return 403 for non-owners', async ({ request, page }) => {
      // Requires multi-user test setup
      test.skip();
    });

    test('should validate name constraints', async ({ request, page }) => {
      const createResponse = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Test Collection' },
      });
      const createdCollection = await createResponse.json();

      // Empty name
      const response = await request.put(`${API_BASE}/api/collections/${createdCollection.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: '' },
      });

      expect(response.status()).toBe(400);
    });
  });

  // =========================================================================
  // T010: DELETE /api/collections/[streamId]
  // =========================================================================

  test.describe('DELETE /api/collections/[streamId]', () => {

    test('should archive stream (set archived_at) and return 204', async ({ request, page }) => {
      const createResponse = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Collection to Archive' },
      });
      const createdCollection = await createResponse.json();

      const response = await request.delete(`${API_BASE}/api/collections/${createdCollection.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(204);

      // Verify it's archived (not in default list)
      const listResponse = await request.get(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });
      const collections = await listResponse.json();
      const archived = collections.owned.find((s: any) => s.id === createdCollection.id);
      expect(archived).toBeUndefined();
    });

    test('should prevent archiving system collections with 400', async ({ request, page }) => {
      const listResponse = await request.get(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });
      const collections = await listResponse.json();
      const generalCollection = collections.owned.find((s: any) => s.is_system === true);

      if (generalCollection) {
        const response = await request.delete(`${API_BASE}/api/collections/${generalCollection.id}`, {
          headers: { 'Cookie': await getAuthCookie(page) },
        });

        expect(response.status()).toBe(400);
      }
    });

    test('should return 403 for non-owners', async ({ request, page }) => {
      test.skip();
    });

    test('should cascade to collection_items (items remain)', async ({ request, page }) => {
      // This would require adding items first, then archiving
      // and verifying items still exist in archived stream
      test.skip();
    });
  });

  // =========================================================================
  // T011: POST /api/collections/[streamId]/restore
  // =========================================================================

  test.describe('POST /api/collections/[streamId]/restore', () => {

    test('should restore archived stream (set archived_at = NULL) and return 200', async ({ request, page }) => {
      // Create and archive a stream
      const createResponse = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Collection to Restore' },
      });
      const createdCollection = await createResponse.json();

      await request.delete(`${API_BASE}/api/collections/${createdCollection.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      // Restore it
      const response = await request.post(`${API_BASE}/api/collections/${createdCollection.id}/restore`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.archived_at).toBeNull();
    });

    test('should return 400 for already-active stream', async ({ request, page }) => {
      const createResponse = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Active Collection' },
      });
      const createdCollection = await createResponse.json();

      const response = await request.post(`${API_BASE}/api/collections/${createdCollection.id}/restore`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(400);
    });

    test('should return 403 for non-owners', async ({ request, page }) => {
      test.skip();
    });

    test('should return 404 for non-existent stream', async ({ request, page }) => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request.post(`${API_BASE}/api/collections/${fakeId}/restore`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(404);
    });
  });
});
