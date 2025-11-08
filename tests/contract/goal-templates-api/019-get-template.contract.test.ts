/**
 * Contract Test: GET /api/goal-templates/{id}
 * Feature: 013-stream-setup-workflow
 * Reference: contracts/wizard-api.yaml (lines 252-277)
 *
 * Test ID: T019
 * Endpoint: GET /api/goal-templates/{id}
 * Description: Get single goal template with defaults and suggested agents
 *
 * Functional Requirements Tested:
 * - FR-002: 7 goal types selectable
 * - Template details for wizard step 2 pre-population
 */

import { test, expect } from '@playwright/test';

const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('GET /api/goal-templates/{id} - Contract Tests', () => {

  test.describe('Valid Request Scenarios - Valid Template IDs', () => {

    test('T019-001: returns 200 for discover_companies template', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/discover_companies`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();

      // Validate GoalTemplate schema (OpenAPI spec lines 364-416)
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('category');
      expect(data).toHaveProperty('icon');

      // Validate specific template data
      expect(data.id).toBe('discover_companies');
      expect(data.name).toBe('Discover Companies');
      expect(data.category).toBe('expansion');
    });

    test('T019-002: returns 200 for due_diligence template', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/due_diligence`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.id).toBe('due_diligence');
      expect(data.name).toBe('Conduct Due Diligence');
      expect(data.category).toBe('acquisition');
    });

    test('T019-003: returns 200 for market_research template', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/market_research`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.id).toBe('market_research');
      expect(data.name).toBe('Market Research');
      expect(data.category).toBe('research');
    });

    test('T019-004: returns 200 for competitive_analysis template', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/competitive_analysis`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.id).toBe('competitive_analysis');
      expect(data.name).toBe('Competitive Analysis');
      expect(data.category).toBe('research');
    });

    test('T019-005: returns 200 for territory_expansion template', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/territory_expansion`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.id).toBe('territory_expansion');
      expect(data.name).toBe('Territory Expansion');
      expect(data.category).toBe('expansion');
    });

    test('T019-006: returns 200 for investment_pipeline template', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/investment_pipeline`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.id).toBe('investment_pipeline');
      expect(data.name).toBe('Investment Pipeline');
      expect(data.category).toBe('acquisition');
    });

    test('T019-007: returns 200 for partnership_opportunities template', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/partnership_opportunities`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data.id).toBe('partnership_opportunities');
      expect(data.name).toBe('Partnership Opportunities');
      expect(data.category).toBe('expansion');
    });
  });

  test.describe('Template Details & Optional Fields', () => {

    test('T019-008: includes default_criteria when available', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/discover_companies`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // default_criteria is optional but should be object if present
      if (data.default_criteria) {
        expect(typeof data.default_criteria).toBe('object');
        expect(data.default_criteria).not.toBeNull();
      }
    });

    test('T019-009: includes default_metrics when available', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/investment_pipeline`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // default_metrics is optional but should be object if present
      if (data.default_metrics) {
        expect(typeof data.default_metrics).toBe('object');
        expect(data.default_metrics).not.toBeNull();
      }
    });

    test('T019-010: includes default_success_criteria when available', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/due_diligence`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // default_success_criteria is optional but should be object if present
      if (data.default_success_criteria) {
        expect(typeof data.default_success_criteria).toBe('object');
        expect(data.default_success_criteria).not.toBeNull();
      }
    });

    test('T019-011: includes suggested_stages array when available', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/territory_expansion`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // suggested_stages is optional but should be array if present
      if (data.suggested_stages) {
        expect(Array.isArray(data.suggested_stages)).toBe(true);

        // Validate stage structure (OpenAPI spec lines 388-397)
        if (data.suggested_stages.length > 0) {
          const stage = data.suggested_stages[0];
          expect(stage).toHaveProperty('id');
          expect(stage).toHaveProperty('name');
          expect(stage).toHaveProperty('color');
        }
      }
    });

    test('T019-012: includes suggested_agents array when available', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/competitive_analysis`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // suggested_agents is optional but should be array if present
      if (data.suggested_agents) {
        expect(Array.isArray(data.suggested_agents)).toBe(true);

        // Validate agent structure (OpenAPI spec lines 399-410)
        if (data.suggested_agents.length > 0) {
          const agent = data.suggested_agents[0];
          expect(agent).toHaveProperty('agent_type');
          expect(agent).toHaveProperty('role');
          expect(agent).toHaveProperty('order');
          expect(agent).toHaveProperty('config');

          expect(typeof agent.agent_type).toBe('string');
          expect(typeof agent.role).toBe('string');
          expect(typeof agent.order).toBe('number');
          expect(typeof agent.config).toBe('object');
        }
      }
    });

    test('T019-013: includes use_count field', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/market_research`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      expect(data).toHaveProperty('use_count');
      expect(typeof data.use_count).toBe('number');
      expect(data.use_count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Not Found Errors (404)', () => {

    test('T019-014: returns 404 for non-existent template ID', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/non_existent_template`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(404);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error.toLowerCase()).toContain('not found');
    });

    test('T019-015: returns 404 for UUID format ID (not used in this API)', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/11111111-1111-1111-1111-111111111111`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(404);
    });

    test('T019-016: returns 404 for empty template ID', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // This might hit the list endpoint instead or return 404
      // Depending on routing, could be 200 (list) or 404
      expect([200, 404]).toContain(response.status());
    });

    test('T019-017: returns 404 for special characters in ID', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/invalid@#$%`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(404);
    });
  });

  test.describe('Authentication & Authorization (401)', () => {

    test('T019-018: returns 401 when Authorization header is missing', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/discover_companies`, {
        headers: {},
      });

      expect(response.status()).toBe(401);
      expect(response.headers()['content-type']).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Unauthorized');
    });

    test('T019-019: returns 401 when Bearer token is invalid', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/due_diligence`, {
        headers: {
          'Authorization': 'Bearer invalid-token-12345',
        },
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('T019-020: returns 401 when Bearer token is expired', async ({ request }) => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await request.get(`${BASE_URL}/api/goal-templates/market_research`, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Server Errors (500)', () => {

    test('T019-021: handles server error gracefully', async ({ request }) => {
      test.skip(true, 'Requires server error injection mechanism');
    });
  });

  test.describe('Template Consistency', () => {

    test('T019-022: template data matches list endpoint', async ({ request }) => {
      // Get list
      const listResponse = await request.get(`${BASE_URL}/api/goal-templates`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const listData = await listResponse.json();
      const discoverTemplate = listData.templates.find((t: any) => t.id === 'discover_companies');

      // Get single template
      const singleResponse = await request.get(`${BASE_URL}/api/goal-templates/discover_companies`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const singleData = await singleResponse.json();

      // Core fields should match
      expect(singleData.id).toBe(discoverTemplate.id);
      expect(singleData.name).toBe(discoverTemplate.name);
      expect(singleData.description).toBe(discoverTemplate.description);
      expect(singleData.category).toBe(discoverTemplate.category);
      expect(singleData.icon).toBe(discoverTemplate.icon);
    });

    test('T019-023: all 7 templates are individually accessible', async ({ request }) => {
      const templateIds = [
        'due_diligence',
        'discover_companies',
        'market_research',
        'competitive_analysis',
        'territory_expansion',
        'investment_pipeline',
        'partnership_opportunities',
      ];

      for (const templateId of templateIds) {
        const response = await request.get(`${BASE_URL}/api/goal-templates/${templateId}`, {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        });

        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data.id).toBe(templateId);
      }
    });
  });

  test.describe('Performance', () => {

    test('T019-024: responds within acceptable latency (<300ms)', async ({ request }) => {
      const startTime = Date.now();

      const response = await request.get(`${BASE_URL}/api/goal-templates/discover_companies`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      expect(response.status()).toBe(200);

      // Should be fast - this is read-only lookup
      expect(latency).toBeLessThan(300);
    });

    test('T019-025: supports concurrent requests for different templates', async ({ request }) => {
      const templateIds = [
        'discover_companies',
        'due_diligence',
        'market_research',
        'competitive_analysis',
        'territory_expansion',
      ];

      const requests = templateIds.map(id =>
        request.get(`${BASE_URL}/api/goal-templates/${id}`, {
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

      // Verify correct templates returned
      const dataArray = await Promise.all(responses.map(r => r.json()));
      dataArray.forEach((data, index) => {
        expect(data.id).toBe(templateIds[index]);
      });
    });

    test('T019-026: supports rapid sequential requests', async ({ request }) => {
      // Make 10 rapid sequential requests for same template
      for (let i = 0; i < 10; i++) {
        const response = await request.get(`${BASE_URL}/api/goal-templates/investment_pipeline`, {
          headers: {
            'Authorization': `Bearer ${TEST_USER_TOKEN}`,
          },
        });

        expect(response.status()).toBe(200);
      }
    });
  });

  test.describe('Edge Cases', () => {

    test('T019-027: case sensitivity in template ID', async ({ request }) => {
      // Try uppercase version
      const response = await request.get(`${BASE_URL}/api/goal-templates/DISCOVER_COMPANIES`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // Should return 404 (case-sensitive) or normalize to lowercase
      expect([200, 404]).toContain(response.status());
    });

    test('T019-028: handles URL-encoded template ID', async ({ request }) => {
      // discovery_companies with encoded underscore
      const response = await request.get(`${BASE_URL}/api/goal-templates/discover%5Fcompanies`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      // URL encoding should be decoded correctly
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.id).toBe('discover_companies');
    });

    test('T019-029: returns consistent data across multiple requests', async ({ request }) => {
      // Make 3 requests for same template
      const response1 = await request.get(`${BASE_URL}/api/goal-templates/competitive_analysis`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const response2 = await request.get(`${BASE_URL}/api/goal-templates/competitive_analysis`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const response3 = await request.get(`${BASE_URL}/api/goal-templates/competitive_analysis`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      const data1 = await response1.json();
      const data2 = await response2.json();
      const data3 = await response3.json();

      // All should return identical data
      expect(JSON.stringify(data1)).toBe(JSON.stringify(data2));
      expect(JSON.stringify(data2)).toBe(JSON.stringify(data3));
    });
  });

  test.describe('Use Case: Wizard Step 2 Pre-population', () => {

    test('T019-030: template provides data for pre-populating wizard step 2', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/goal-templates/due_diligence`, {
        headers: {
          'Authorization': `Bearer ${TEST_USER_TOKEN}`,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Template should provide defaults that can pre-populate wizard
      // These fields are useful for step 2 pre-population
      expect(data.description).toBeTruthy(); // Can be used as hint text

      if (data.default_criteria) {
        // Can pre-populate business impact criteria template
        expect(typeof data.default_criteria).toBe('object');
      }

      if (data.default_metrics) {
        // Can suggest metrics to track
        expect(typeof data.default_metrics).toBe('object');
      }
    });
  });
});
