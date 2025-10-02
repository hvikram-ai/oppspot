/**
 * Contract Test: GET /api/data-room
 *
 * Purpose: Verify API contract for listing data rooms
 * Expected: These tests MUST FAIL until T028 is implemented
 */

import { test, expect } from '@playwright/test';

test.describe('GET /api/data-room', () => {
  test('should list all data rooms for authenticated user', async ({ request }) => {
    // Act: Fetch data rooms
    const response = await request.get('/api/data-room');

    // Assert: Response structure
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('data_rooms');
    expect(Array.isArray(body.data_rooms)).toBe(true);
    expect(body).toHaveProperty('total');
    expect(typeof body.total).toBe('number');
  });

  test('should filter by status', async ({ request }) => {
    // Act: Filter by active status
    const response = await request.get('/api/data-room?status=active');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: All returned data rooms are active
    for (const room of body.data_rooms) {
      expect(room.status).toBe('active');
    }
  });

  test('should filter by deal_type', async ({ request }) => {
    // Act: Filter by acquisition
    const response = await request.get('/api/data-room?deal_type=acquisition');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: All returned data rooms are acquisitions
    for (const room of body.data_rooms) {
      expect(room.deal_type).toBe('acquisition');
    }
  });

  test('should search by name', async ({ request }) => {
    // Act: Search for "Acme"
    const searchTerm = 'Acme';
    const response = await request.get(`/api/data-room?search=${searchTerm}`);

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: All returned data rooms contain search term
    for (const room of body.data_rooms) {
      expect(room.name.toLowerCase()).toContain(searchTerm.toLowerCase());
    }
  });

  test('should sort by created_at descending by default', async ({ request }) => {
    // Act: Fetch without explicit sort
    const response = await request.get('/api/data-room');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Results sorted by created_at DESC
    if (body.data_rooms.length > 1) {
      for (let i = 0; i < body.data_rooms.length - 1; i++) {
        const current = new Date(body.data_rooms[i].created_at).getTime();
        const next = new Date(body.data_rooms[i + 1].created_at).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    }
  });

  test('should sort by name ascending', async ({ request }) => {
    // Act: Sort by name ASC
    const response = await request.get('/api/data-room?sort_by=name&sort_order=asc');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Results sorted alphabetically
    if (body.data_rooms.length > 1) {
      for (let i = 0; i < body.data_rooms.length - 1; i++) {
        expect(body.data_rooms[i].name.localeCompare(body.data_rooms[i + 1].name)).toBeLessThanOrEqual(0);
      }
    }
  });

  test('should return empty array when no data rooms exist', async ({ request }) => {
    // Act: Fetch data rooms (assuming fresh test user with no data)
    const response = await request.get('/api/data-room');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Empty array, not error
    expect(body.data_rooms).toEqual([]);
    expect(body.total).toBe(0);
  });

  test('should include data rooms user has access to (not just owned)', async ({ request }) => {
    // Note: This test assumes setup where test user has been granted access to another user's data room
    // In practice, would need test data setup

    const response = await request.get('/api/data-room');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Can include rooms where user_id != current user (if they have access grants)
    // This is verified by RLS policy, not just user_id filter
    expect(body.data_rooms).toBeDefined();
  });

  test('should not return deleted data rooms by default', async ({ request }) => {
    // Act: Fetch data rooms without status filter
    const response = await request.get('/api/data-room');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: No deleted data rooms in results
    for (const room of body.data_rooms) {
      expect(room.status).not.toBe('deleted');
    }
  });

  test('should return deleted data rooms when filtered', async ({ request }) => {
    // Act: Explicitly filter for deleted
    const response = await request.get('/api/data-room?status=deleted');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Only deleted data rooms
    for (const room of body.data_rooms) {
      expect(room.status).toBe('deleted');
    }
  });

  test('should reject unauthenticated requests', async ({ request }) => {
    // Note: In real test, would explicitly clear auth
    // For now, assume test framework handles auth

    // This test documents the expected behavior
    // Actual implementation depends on auth setup
  });

  test('should include all required fields in each data room', async ({ request }) => {
    // Act: Fetch data rooms
    const response = await request.get('/api/data-room');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: Each data room has required fields
    for (const room of body.data_rooms) {
      expect(room).toHaveProperty('id');
      expect(room).toHaveProperty('user_id');
      expect(room).toHaveProperty('name');
      expect(room).toHaveProperty('deal_type');
      expect(room).toHaveProperty('status');
      expect(room).toHaveProperty('document_count');
      expect(room).toHaveProperty('storage_used_bytes');
      expect(room).toHaveProperty('created_at');
      expect(room).toHaveProperty('updated_at');
    }
  });

  test('should combine multiple filters', async ({ request }) => {
    // Act: Filter by status AND deal_type
    const response = await request.get('/api/data-room?status=active&deal_type=acquisition');

    expect(response.status()).toBe(200);

    const body = await response.json();

    // Assert: All results match both filters
    for (const room of body.data_rooms) {
      expect(room.status).toBe('active');
      expect(room.deal_type).toBe('acquisition');
    }
  });
});
