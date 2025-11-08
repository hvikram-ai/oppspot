/**
 * Contract Test: GET /api/goal-templates
 * Feature: 013-stream-setup-workflow
 * Reference: contracts/wizard-api.yaml (lines 222-250)
 *
 * Test ID: T018
 * Endpoint: GET /api/goal-templates
 * Description: List available goal templates for Step 1
 *
 * Functional Requirements Tested:
 * - FR-002: 7 goal types selectable
 */

import { test, expect } from '@playwright/test';

const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('GET /api/goal-templates - Contract Tests', () => {

  test.describe('Valid Request Scenarios - No Filters', () => {

    test('T018-001: returns 200 with all goal templates', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();

      // Validate response structure (OpenAPI spec lines 237-246)
      expect(data).toHaveProperty('templates');
      expect(Array.isArray(data.templates)).toBe(true);

      // FR-002: 7 goal types should be available
      expect(data.templates.length).toBe(7);
    });

    test('T018-002: returns templates with expected IDs (FR-002)', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Expected 7 goal template IDs from spec
      const expectedIds = [
        'due_diligence',
        'discover_companies',
        'market_research',
        'competitive_analysis',
        'territory_expansion',
        'investment_pipeline',
        'partnership_opportunities',
      ];

      const templateIds = data.templates.map((t: any) => t.id);

      // All expected templates should be present
      expectedIds.forEach(id => {
        expect(templateIds).toContain(id);
      });
    });

    test('T018-003: each template has required fields', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Validate GoalTemplate schema (OpenAPI spec lines 364-416)
      data.templates.forEach((template: any) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('icon');
        expect(template).toHaveProperty('is_active');
        expect(template).toHaveProperty('display_order');

        // Validate types
        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(['acquisition', 'expansion', 'research']).toContain(template.category);
        expect(typeof template.icon).toBe('string');
        expect(typeof template.is_active).toBe('boolean');
        expect(typeof template.display_order).toBe('number');
      });
    });

    test('T018-004: templates are sorted by display_order', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Verify templates are ordered by display_order
      let previousOrder = -1;
      data.templates.forEach((template: any) => {
        expect(template.display_order).toBeGreaterThanOrEqual(previousOrder);
        previousOrder = template.display_order;
      });
    });

    test('T018-005: all templates are active', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // All 7 templates should be active
      data.templates.forEach((template: any) => {
        expect(template.is_active).toBe(true);
      });
    });

    test('T018-006: templates include optional fields when available', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Check if optional fields are present
      data.templates.forEach((template: any) => {
        // These are optional but may be included
        if (template.default_criteria) {
          expect(typeof template.default_criteria).toBe('object');
        }
        if (template.default_metrics) {
          expect(typeof template.default_metrics).toBe('object');
        }
        if (template.default_success_criteria) {
          expect(typeof template.default_success_criteria).toBe('object');
        }
        if (template.suggested_stages) {
          expect(Array.isArray(template.suggested_stages)).toBe(true);
        }
        if (template.suggested_agents) {
          expect(Array.isArray(template.suggested_agents)).toBe(true);
        }
      });
    });
  });

  test.describe('Valid Request Scenarios - With Category Filter', () => {

    test('T018-007: filters templates by category=acquisition', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates?category=acquisition`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // All returned templates should be acquisition category
      expect(data.templates.length).toBeGreaterThan(0);
      data.templates.forEach((template: any) => {
        expect(template.category).toBe('acquisition');
      });

      // Expected acquisition templates: due_diligence, investment_pipeline
      const acquisitionIds = data.templates.map((t: any) => t.id);
      expect(acquisitionIds).toContain('due_diligence');
      expect(acquisitionIds).toContain('investment_pipeline');
    });

    test('T018-008: filters templates by category=expansion', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates?category=expansion`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.templates.length).toBeGreaterThan(0);
      data.templates.forEach((template: any) => {
        expect(template.category).toBe('expansion');
      });

      // Expected expansion templates: discover_companies, territory_expansion, partnership_opportunities
      const expansionIds = data.templates.map((t: any) => t.id);
      expect(expansionIds).toContain('discover_companies');
      expect(expansionIds).toContain('territory_expansion');
      expect(expansionIds).toContain('partnership_opportunities');
    });

    test('T018-009: filters templates by category=research', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates?category=research`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.templates.length).toBeGreaterThan(0);
      data.templates.forEach((template: any) => {
        expect(template.category).toBe('research');
      });

      // Expected research templates: market_research, competitive_analysis
      const researchIds = data.templates.map((t: any) => t.id);
      expect(researchIds).toContain('market_research');
      expect(researchIds).toContain('competitive_analysis');
    });
  });

  test.describe('Validation Errors (400)', () => {

    test('T018-010: returns 400 for invalid category value', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates?category=invalid_category`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T018-011: returns 400 for multiple category values', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates?category=acquisition&category=expansion`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // Should either accept first value or return 400
      expect([200, 400]).toContain(response.status());
    });
  });

  test.describe('Authentication & Authorization (401)', () => {

    test('T018-012: returns 401 when Authorization header is missing', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {},
      });

      expect(response.status()).toBe(401);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Unauthorized');
    });

    test('T018-013: returns 401 when Bearer token is invalid', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': 'Bearer invalid-token-12345',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T018-014: returns 401 when Bearer token is expired', async ({ request }) => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Server Errors (500)', () => {

    test('T018-015: handles server error gracefully', async ({ request }) => {
      test.skip(true, 'Requires server error injection mechanism');
    });
  });

  test.describe('Template Content Validation', () => {

    test('T018-016: due_diligence template has correct properties', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      const dueDiligence = data.templates.find((t: any) => t.id === 'due_diligence');

      expect(dueDiligence).toBeTruthy();
      expect(dueDiligence.name).toBe('Conduct Due Diligence');
      expect(dueDiligence.category).toBe('acquisition');
      expect(dueDiligence.is_active).toBe(true);
    });

    test('T018-017: discover_companies template has correct properties', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      const discoverCompanies = data.templates.find((t: any) => t.id === 'discover_companies');

      expect(discoverCompanies).toBeTruthy();
      expect(discoverCompanies.name).toBe('Discover Companies');
      expect(discoverCompanies.category).toBe('expansion');
      expect(discoverCompanies.is_active).toBe(true);
    });

    test('T018-018: all templates have unique IDs', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      const ids = data.templates.map((t: any) => t.id);

      // Check uniqueness
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('T018-019: all templates have non-empty names and descriptions', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      data.templates.forEach((template: any) => {
        expect(template.name.length).toBeGreaterThan(0);
        expect(template.description.length).toBeGreaterThan(0);
      });
    });

    test('T018-020: all templates have valid icon emojis', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      data.templates.forEach((template: any) => {
        // Icons should be emoji strings (non-empty)
        expect(template.icon.length).toBeGreaterThan(0);
        expect(typeof template.icon).toBe('string');
      });
    });
  });

  test.describe('Query Parameters', () => {

    test('T018-021: ignores unknown query parameters', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates?unknown_param=value`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // Should succeed and ignore unknown param
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.templates.length).toBe(7);
    });

    test('T018-022: handles empty category parameter', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates?category=`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // Should either return all or return 400
      expect([200, 400]).toContain(response.status());
    });
  });

  test.describe('Performance', () => {

    test('T018-023: responds within acceptable latency (<300ms)', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      expect(response.status()).toBe(200);

      // Should be fast - this is read-only data
      expect(latency).toBeLessThan(300);
    });

    test('T018-024: supports concurrent requests', async ({ request }) => {
      // Make 10 concurrent requests
      const requests = Array(10).fill(null).map(() =>
        request.get(`${BASE_URL}/api/goal-templates`, {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        })
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });

      // All should return same data
      const dataArrays = await Promise.all(responses.map(r => r.json()));
      dataArrays.forEach(data => {
        expect(data.templates.length).toBe(7);
      });
    });
  });

  test.describe('Edge Cases', () => {

    test('T018-025: returns consistent data across multiple requests', async ({ request }) => {
      // Make 3 requests
      const response1 = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const response2 = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const response3 = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const data1 = await response1.json();
      const data2 = await response2.json();
      const data3 = await response3.json();

      // All should return same templates
      expect(data1.templates.length).toBe(data2.templates.length);
      expect(data2.templates.length).toBe(data3.templates.length);

      // Template IDs should be consistent
      const ids1 = data1.templates.map((t: any) => t.id).sort();
      const ids2 = data2.templates.map((t: any) => t.id).sort();
      const ids3 = data3.templates.map((t: any) => t.id).sort();

      expect(ids1).toEqual(ids2);
      expect(ids2).toEqual(ids3);
    });
  });
});
