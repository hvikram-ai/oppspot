/**
 * Contract Tests: Collection Access (Sharing) API
 * Tests: T016-T019
 */

import { test, expect, type Page } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe("Collection Access API", () => {

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




  test.describe('POST /api/collections/[streamId]/access', () => {
    test('should grant access and return 201', async ({ request, page }) => {
      // Create stream
      const streamRes = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Test Collection' },
      });
      const stream = await streamRes.json();

      const response = await request.post(`${API_BASE}/api/collections/${stream.id}/access`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: {
          user_id: '12345678-1234-1234-1234-123456789012',
          permission_level: 'view',
        },
      });

      expect(response.status()).toBe(201);
    });

    test('should validate permission_level enum', async ({ request, page }) => {
      const streamRes = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Test Collection' },
      });
      const stream = await streamRes.json();

      const response = await request.post(`${API_BASE}/api/collections/${stream.id}/access`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: {
          user_id: '12345678-1234-1234-1234-123456789012',
          permission_level: 'invalid',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should prevent duplicate grants with 409', async ({ request, page }) => {
      const streamRes = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Test Collection' },
      });
      const stream = await streamRes.json();

      const userId = '12345678-1234-1234-1234-123456789012';

      await request.post(`${API_BASE}/api/collections/${stream.id}/access`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { user_id: userId, permission_level: 'view' },
      });

      const response = await request.post(`${API_BASE}/api/collections/${stream.id}/access`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { user_id: userId, permission_level: 'edit' },
      });

      expect(response.status()).toBe(409);
    });

    test('should prevent sharing system collections with 400', async ({ request, page }) => {
      test.skip(); // Requires identifying General stream
    });
  });

  test.describe('GET /api/collections/[streamId]/access', () => {
    test('should list access grants', async ({ request, page }) => {
      const streamRes = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Test Collection' },
      });
      const stream = await streamRes.json();

      const response = await request.get(`${API_BASE}/api/collections/${stream.id}/access`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data.grants)).toBe(true);
    });
  });

  test.describe('DELETE /api/collections/[streamId]/access/[accessId]', () => {
    test('should revoke access and return 204', async ({ request, page }) => {
      const streamRes = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Test Collection' },
      });
      const stream = await streamRes.json();

      const grantRes = await request.post(`${API_BASE}/api/collections/${stream.id}/access`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: {
          user_id: '12345678-1234-1234-1234-123456789012',
          permission_level: 'view',
        },
      });
      const grant = await grantRes.json();

      const response = await request.delete(`${API_BASE}/api/collections/${stream.id}/access/${grant.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
      });

      expect(response.status()).toBe(204);
    });
  });

  test.describe('PATCH /api/collections/[streamId]/access/[accessId]', () => {
    test('should update permission level and return 200', async ({ request, page }) => {
      const streamRes = await request.post(`${API_BASE}/api/collections`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { name: 'Test Collection' },
      });
      const stream = await streamRes.json();

      const grantRes = await request.post(`${API_BASE}/api/collections/${stream.id}/access`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: {
          user_id: '12345678-1234-1234-1234-123456789012',
          permission_level: 'view',
        },
      });
      const grant = await grantRes.json();

      const response = await request.patch(`${API_BASE}/api/collections/${stream.id}/access/${grant.id}`, {
        headers: { 'Cookie': await getAuthCookie(page) },
        data: { permission_level: 'edit' },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.permission_level).toBe('edit');
    });
  });
});
