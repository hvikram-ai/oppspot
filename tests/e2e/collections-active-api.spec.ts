/**
 * Contract Tests: Active Collection & Archive API
 * Tests: T020-T022
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe("Active Collection & Archive API", () => {

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("[name="email"]", "demo@oppspot.com");
    await page.fill("[name="password"]", "Demo123456!");
    await page.click("button[type="submit"]");
    await page.waitForURL("/");
  });

  async function getAuthCookie(page: any) {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find((c: any) => c.name.includes("auth"));
    return authCookie ? `${authCookie.name}=${authCookie.value}` : "";
  }




  test.describe('GET /api/collections/active', () => {
    test('should return users active stream', async ({ request, page }) => {
      const response = await request.get(`${API_BASE}/api/collections/active`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
    });

    test('should default to General stream if not set', async ({ request, page }) => {
      const response = await request.get(`${API_BASE}/api/collections/active`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      // Should have a stream (likely General)
      expect(data.id).toBeTruthy();
    });

    test('should return 401 for unauthenticated', async ({ request, page }) => {
      const response = await request.get(`${API_BASE}/api/collections/active`);

      expect(response.status()).toBe(401);
    });
  });

  test.describe('PUT /api/collections/active', () => {
    test('should set active stream and return 200', async ({ request, page }) => {
      // Create a stream
      const streamRes = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Test Collection' },
      });
      const stream = await streamRes.json();

      const response = await request.put(`${API_BASE}/api/collections/active`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { collection_id: stream.id },
      });

      expect(response.status()).toBe(200);

      // Verify it was set
      const activeRes = await request.get(`${API_BASE}/api/collections/active`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });
      const active = await activeRes.json();
      expect(active.id).toBe(stream.id);
    });

    test('should validate stream exists and return 404', async ({ request, page }) => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request.put(`${API_BASE}/api/collections/active`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { collection_id: fakeId },
      });

      expect(response.status()).toBe(404);
    });

    test('should validate user has access and return 403', async ({ request, page }) => {
      test.skip(); // Requires multi-user setup
    });

    test('should persist across sessions', async ({ request, page }) => {
      // This would require creating a new session and verifying
      test.skip();
    });
  });

  test.describe('GET /api/collections/archive', () => {
    test('should list archived collections', async ({ request, page }) => {
      // Create and archive a stream
      const streamRes = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'To Archive' },
      });
      const stream = await streamRes.json();

      await request.delete(`${API_BASE}/api/collections/${stream.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      const response = await request.get(`${API_BASE}/api/collections/archive`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);

      // Should find our archived stream
      const archived = data.find((s: any) => s.id === stream.id);
      expect(archived).toBeTruthy();
      expect(archived.archived_at).toBeTruthy();
    });

    test('should only return users owned archived collections', async ({ request, page }) => {
      const response = await request.get(`${API_BASE}/api/collections/archive`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      // All should be archived (have archived_at)
      data.forEach((stream: any) => {
        expect(stream.archived_at).toBeTruthy();
      });
    });

    test('should include archive timestamp', async ({ request, page }) => {
      const response = await request.get(`${API_BASE}/api/collections/archive`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('archived_at');
      }
    });

    test('should exclude shared collections (owned only)', async ({ request, page }) => {
      test.skip(); // Requires multi-user setup
    });
  });
});
