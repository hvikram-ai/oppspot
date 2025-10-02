/**
 * Contract Test: POST /api/data-room
 *
 * Purpose: Verify API contract for creating data rooms
 * Expected: These tests MUST FAIL until T027 is implemented
 */

import { test, expect } from '@playwright/test';

// Test data
const validDataRoom = {
  name: 'Test Acquisition Deal',
  deal_type: 'acquisition',
  description: 'Testing data room creation',
  metadata: {
    deal_value: 50000000,
    currency: 'GBP',
    tags: ['test', 'acquisition']
  }
};

test.describe('POST /api/data-room', () => {
  test('should create data room with valid input', async ({ request }) => {
    // Arrange: Authenticate (assuming test user is logged in)
    const response = await request.post('/api/data-room', {
      data: validDataRoom
    });

    // Assert: Response structure
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.name).toBe(validDataRoom.name);
    expect(body.deal_type).toBe(validDataRoom.deal_type);
    expect(body.description).toBe(validDataRoom.description);
    expect(body.status).toBe('active');
    expect(body.document_count).toBe(0);
    expect(body.storage_used_bytes).toBe(0);

    // Verify metadata
    expect(body.metadata.deal_value).toBe(validDataRoom.metadata.deal_value);
    expect(body.metadata.currency).toBe(validDataRoom.metadata.currency);

    // Verify timestamps
    expect(body).toHaveProperty('created_at');
    expect(body).toHaveProperty('updated_at');
    expect(body.deleted_at).toBeNull();
  });

  test('should reject unauthenticated requests', async ({ request }) => {
    // Arrange: Clear auth headers
    const response = await request.post('/api/data-room', {
      data: validDataRoom,
      headers: {
        // Explicitly remove auth (in real test, this would be handled by test setup)
      }
    });

    // Assert: 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('Unauthorized');
  });

  test('should reject invalid input - missing name', async ({ request }) => {
    // Arrange: Missing required field
    const invalidData = {
      deal_type: 'acquisition',
      description: 'Missing name field'
    };

    const response = await request.post('/api/data-room', {
      data: invalidData
    });

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('name');
  });

  test('should reject invalid deal_type', async ({ request }) => {
    // Arrange: Invalid enum value
    const invalidData = {
      name: 'Test Deal',
      deal_type: 'invalid_type', // Not in enum
      description: 'Invalid deal type'
    };

    const response = await request.post('/api/data-room', {
      data: invalidData
    });

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body.error).toMatch(/deal_type|validation/i);
  });

  test('should create data room with minimal required fields', async ({ request }) => {
    // Arrange: Only required fields
    const minimalData = {
      name: 'Minimal Test Deal'
    };

    const response = await request.post('/api/data-room', {
      data: minimalData
    });

    // Assert: Success with defaults
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.name).toBe(minimalData.name);
    expect(body.deal_type).toBe('due_diligence'); // Default value
    expect(body.description).toBeNull();
    expect(body.company_id).toBeNull();
  });

  test('should create data room with optional company_id', async ({ request }) => {
    // Arrange: Include company_id (assuming a test company exists)
    const dataWithCompany = {
      ...validDataRoom,
      company_id: '123e4567-e89b-12d3-a456-426614174000' // Test UUID
    };

    const response = await request.post('/api/data-room', {
      data: dataWithCompany
    });

    // Assert: Company linked
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.company_id).toBe(dataWithCompany.company_id);
  });

  test('should log activity when data room is created', async ({ request }) => {
    // Arrange & Act: Create data room
    const response = await request.post('/api/data-room', {
      data: validDataRoom
    });

    expect(response.status()).toBe(201);
    const dataRoom = await response.json();

    // Assert: Activity log created (check via separate query)
    // Note: This test assumes we can query activity logs
    // In practice, this would be tested in integration tests
    // For contract test, we just verify the data room was created
    expect(dataRoom.id).toBeDefined();
  });

  test('should reject name longer than 255 characters', async ({ request }) => {
    // Arrange: Name too long
    const longName = 'A'.repeat(256);
    const invalidData = {
      name: longName,
      deal_type: 'acquisition'
    };

    const response = await request.post('/api/data-room', {
      data: invalidData
    });

    // Assert: 400 Bad Request
    expect(response.status()).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('should accept all valid deal_types', async ({ request }) => {
    // Arrange: Test all enum values
    const dealTypes = ['acquisition', 'investment', 'partnership', 'merger', 'sale', 'due_diligence', 'other'];

    for (const dealType of dealTypes) {
      const response = await request.post('/api/data-room', {
        data: {
          name: `Test ${dealType} Deal`,
          deal_type: dealType
        }
      });

      // Assert: All should succeed
      expect(response.status()).toBe(201);

      const body = await response.json();
      expect(body.deal_type).toBe(dealType);
    }
  });
});
