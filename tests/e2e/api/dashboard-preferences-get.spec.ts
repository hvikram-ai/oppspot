import { test, expect } from '@playwright/test'

/**
 * T018: API Contract Test - GET /api/dashboard/preferences
 *
 * Validates response schema matches OpenAPI specification
 *
 * Expected: This test will FAIL initially (API route not implemented)
 */

test.describe('API Contract: GET /api/dashboard/preferences', () => {
  let authToken: string

  test.beforeAll(async ({ request }) => {
    // Get auth token (use demo account)
    const response = await request.post('/api/auth/signin', {
      data: {
        email: 'demo@oppspot.com',
        password: 'Demo123456!'
      }
    })

    const data = await response.json()
    authToken = data.token || data.access_token
  })

  test('should return 401 without authentication', async ({ request }) => {
    const response = await request.get('/api/dashboard/preferences')

    expect(response.status()).toBe(401)
  })

  test('should return 200 with valid authentication', async ({ request }) => {
    const response = await request.get('/api/dashboard/preferences', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    expect(response.status()).toBe(200)
  })

  test('should match OpenAPI schema', async ({ request }) => {
    const response = await request.get('/api/dashboard/preferences', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    const data = await response.json()

    // Validate required fields per OpenAPI spec
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('user_id')
    expect(data).toHaveProperty('card_visibility')
    expect(data).toHaveProperty('card_order')
    expect(data).toHaveProperty('default_landing_page')
    expect(data).toHaveProperty('sidebar_collapsed')
    expect(data).toHaveProperty('metric_format')
    expect(data).toHaveProperty('time_period')
    expect(data).toHaveProperty('theme')
    expect(data).toHaveProperty('digest_frequency')
    expect(data).toHaveProperty('show_empty_state_tutorials')
    expect(data).toHaveProperty('created_at')
    expect(data).toHaveProperty('updated_at')
  })

  test('should return correct data types', async ({ request }) => {
    const response = await request.get('/api/dashboard/preferences', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    const data = await response.json()

    // Type validation
    expect(typeof data.id).toBe('string')
    expect(typeof data.user_id).toBe('string')
    expect(typeof data.card_visibility).toBe('object')
    expect(Array.isArray(data.card_order)).toBe(true)
    expect(typeof data.default_landing_page).toBe('string')
    expect(typeof data.sidebar_collapsed).toBe('boolean')
    expect(['absolute', 'relative']).toContain(data.metric_format)
    expect(['day', 'week', 'month']).toContain(data.time_period)
    expect(['light', 'dark', 'system']).toContain(data.theme)
    expect(['daily', 'realtime', 'off']).toContain(data.digest_frequency)
    expect(typeof data.show_empty_state_tutorials).toBe('boolean')
  })

  test('should have valid card_visibility object', async ({ request }) => {
    const response = await request.get('/api/dashboard/preferences', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    const data = await response.json()

    // card_visibility should be object with boolean values
    expect(data.card_visibility).toHaveProperty('ai_digest')
    expect(data.card_visibility).toHaveProperty('priority_queue')
    expect(data.card_visibility).toHaveProperty('impact_metrics')
    expect(data.card_visibility).toHaveProperty('stats_grid')

    // All values should be boolean
    Object.values(data.card_visibility).forEach(value => {
      expect(typeof value).toBe('boolean')
    })
  })

  test('should have valid card_order array', async ({ request }) => {
    const response = await request.get('/api/dashboard/preferences', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    const data = await response.json()

    // card_order should be array of strings
    expect(Array.isArray(data.card_order)).toBe(true)
    expect(data.card_order.length).toBeGreaterThan(0)

    data.card_order.forEach((item: any) => {
      expect(typeof item).toBe('string')
    })

    // Should contain known card IDs
    const validCards = ['ai_digest', 'priority_queue', 'impact_metrics', 'stats_grid', 'recent_activity', 'feature_spotlight']
    data.card_order.forEach((cardId: string) => {
      expect(validCards).toContain(cardId)
    })
  })

  test('should create default preferences if not exists', async ({ request }) => {
    // This tests the auto-create trigger
    // For a brand new user, preferences should be auto-created

    const response = await request.get('/api/dashboard/preferences', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    expect(response.status()).toBe(200)

    const data = await response.json()

    // Should have defaults
    expect(data.default_landing_page).toBe('/dashboard')
    expect(data.sidebar_collapsed).toBe(false)
    expect(data.metric_format).toBe('relative')
    expect(data.time_period).toBe('week')
    expect(data.theme).toBe('light')
    expect(data.digest_frequency).toBe('daily')
    expect(data.show_empty_state_tutorials).toBe(true)
  })

  test('should return consistent data on multiple requests', async ({ request }) => {
    // First request
    const response1 = await request.get('/api/dashboard/preferences', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    const data1 = await response1.json()

    // Second request
    const response2 = await request.get('/api/dashboard/preferences', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
    const data2 = await response2.json()

    // Should return same data (idempotent)
    expect(data1.id).toBe(data2.id)
    expect(data1.user_id).toBe(data2.user_id)
    expect(data1.card_visibility).toEqual(data2.card_visibility)
  })

  test('should have timestamps in ISO 8601 format', async ({ request }) => {
    const response = await request.get('/api/dashboard/preferences', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    const data = await response.json()

    // ISO 8601 format validation
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
    expect(data.created_at).toMatch(iso8601Regex)
    expect(data.updated_at).toMatch(iso8601Regex)

    // updated_at should be >= created_at
    const createdDate = new Date(data.created_at)
    const updatedDate = new Date(data.updated_at)
    expect(updatedDate >= createdDate).toBe(true)
  })

  test('should handle CORS headers correctly', async ({ request }) => {
    const response = await request.get('/api/dashboard/preferences', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Origin': 'http://localhost:3000'
      }
    })

    // Should have CORS headers
    const headers = response.headers()
    expect(headers['access-control-allow-origin']).toBeDefined()
  })
})

/**
 * Expected Result: ❌ THIS TEST SHOULD FAIL
 *
 * Failure reasons:
 * - API route /api/dashboard/preferences does not exist (T028 not implemented)
 * - Will return 404 instead of 200/401
 *
 * This test defines the API contract for T028 (Implement GET /api/dashboard/preferences)
 */
