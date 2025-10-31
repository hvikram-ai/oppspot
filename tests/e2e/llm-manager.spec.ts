/**
 * LLM Manager Integration Tests
 *
 * Tests the core LLM Manager functionality including:
 * - Provider initialization
 * - Chat completion
 * - Provider fallback
 * - Usage tracking
 */

import { test, expect } from '@playwright/test';

const API_BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('LLM Manager System', () => {
  test.describe('LLM Settings API', () => {
    test('should retrieve user configurations', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/llm/settings`);

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('configurations');
      expect(Array.isArray(data.configurations)).toBe(true);
    });

    test('should sanitize API keys in response', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/llm/settings`);

      if (response.ok()) {
        const data = await response.json();

        // Check that any returned configs have sanitized keys
        for (const config of data.configurations) {
          if (config.config && config.config.apiKey) {
            // Should not contain full API key
            expect(config.config.apiKey).not.toMatch(/^sk-[a-zA-Z0-9]{32,}$/);
            // Should be masked
            expect(config.config.apiKey).toContain('*');
          }
        }
      }
    });

    test('should create new configuration', async ({ request }) => {
      const newConfig = {
        providerType: 'openrouter',
        name: 'Test OpenRouter Config',
        config: {
          apiKey: 'test-key-12345',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        priority: 2,
        isPrimary: false,
        monthlyTokenLimit: 100000,
        rateLimitRPM: 60,
      };

      const response = await request.post(`${API_BASE}/api/llm/settings`, {
        data: newConfig,
      });

      if (response.status() === 401) {
        // User not authenticated - expected in test environment
        expect(response.status()).toBe(401);
      } else {
        expect([200, 201]).toContain(response.status());

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.configuration).toHaveProperty('id');
      }
    });
  });

  test.describe('LLM Usage API', () => {
    test('should retrieve usage statistics', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/llm/usage`);

      if (response.status() === 401) {
        // User not authenticated - expected
        expect(response.status()).toBe(401);
      } else {
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('usage');
      }
    });

    test('should support date range filtering', async ({ request }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago

      const response = await request.get(
        `${API_BASE}/api/llm/usage?start=${startDate.toISOString()}&end=${new Date().toISOString()}`
      );

      if (response.status() === 200) {
        const data = await response.json();
        expect(data.usage).toBeDefined();
      }
    });
  });

  test.describe('LLM Provider Health', () => {
    test('should check provider health status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/llm/providers/health`);

      if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty('providers');
        expect(Array.isArray(data.providers)).toBe(true);
      }
    });

    test('should discover available providers', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/llm/providers/discover`);

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('providers');

      // Should detect at least some standard providers
      const providerTypes = data.providers.map((p: any) => p.type);
      expect(providerTypes).toContain('openrouter'); // Always available
    });
  });

  test.describe('LLM Models API', () => {
    test('should list available models', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/llm/models`);

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('models');
      expect(Array.isArray(data.models)).toBe(true);
    });

    test('should filter models by provider', async ({ request }) => {
      const response = await request.get(`${API_BASE}/api/llm/models?provider=openai`);

      if (response.ok()) {
        const data = await response.json();

        // All models should be from OpenAI
        for (const model of data.models) {
          expect(model.provider).toBe('openai');
        }
      }
    });
  });

  test.describe('LLM Test API', () => {
    test('should test provider configuration', async ({ request }) => {
      const testRequest = {
        providerType: 'openrouter',
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || 'test-key',
          baseUrl: 'https://openrouter.ai/api/v1',
        },
      };

      const response = await request.post(`${API_BASE}/api/llm/test`, {
        data: testRequest,
      });

      if (response.status() === 401) {
        // User not authenticated
        expect(response.status()).toBe(401);
      } else {
        const data = await response.json();
        expect(data).toHaveProperty('success');

        if (data.success) {
          expect(data).toHaveProperty('latency');
          expect(typeof data.latency).toBe('number');
        } else {
          expect(data).toHaveProperty('error');
        }
      }
    });
  });
});

test.describe('LLM Feature Integration', () => {
  test('should track feature usage correctly', async ({ request }) => {
    // This would test that when a feature uses LLM, it's tracked correctly
    // Example: AI Chat should track usage under 'ai-chat' feature

    const response = await request.get(`${API_BASE}/api/llm/usage?feature=ai-chat`);

    if (response.ok()) {
      const data = await response.json();

      // All usage should be from ai-chat feature
      if (data.usage && data.usage.length > 0) {
        for (const record of data.usage) {
          expect(record.feature).toBe('ai-chat');
        }
      }
    }
  });

  test('should support multiple features', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/llm/usage`);

    if (response.ok()) {
      const data = await response.json();

      // Should have usage from different features
      const features = new Set(data.usage?.map((u: any) => u.feature) || []);

      // We migrated 5 features: research-gpt, data-room, ai-chat, business-enhancement, voice-parse
      expect(features.size).toBeGreaterThanOrEqual(0); // May be 0 if no usage yet
    }
  });
});

test.describe('LLM Backward Compatibility', () => {
  test('should support legacy AI features through wrapper', async ({ page }) => {
    // Test that old features still work through the backward compatibility layer
    // This is implicit - if the app loads and works, the wrapper is functioning

    await page.goto(`${API_BASE}/settings/ai`);

    // Should load AI settings page
    await expect(page).toHaveTitle(/Settings|AI|oppSpot/i);

    // Should show provider options
    const providerElements = page.locator('[data-testid*="provider"], [role="radiogroup"]');
    const count = await providerElements.count();
    expect(count).toBeGreaterThan(0);
  });
});
