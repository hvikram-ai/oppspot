/**
 * API: /api/llm/test
 *
 * Test a provider configuration before saving
 *
 * POST - Test connection and get response time
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LocalLLMProvider } from '@/lib/llm/providers/LocalLLMProvider';
import { OpenRouterProvider } from '@/lib/llm/providers/OpenRouterProvider';
import { OpenAIProvider } from '@/lib/llm/providers/OpenAIProvider';
import { AnthropicProvider } from '@/lib/llm/providers/AnthropicProvider';
import type { ProviderType } from '@/lib/llm/interfaces/ILLMProvider';
import type { LLMConfig } from '@/lib/llm/interfaces/ILLMConfig';

interface TestRequest {
  providerType: ProviderType;
  config: Record<string, unknown>;
}

interface TestResult {
  success: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  availableModels?: string[];
  error?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as TestRequest;

    if (!body.providerType || !body.config) {
      return NextResponse.json(
        { error: 'Missing required fields: providerType, config' },
        { status: 400 }
      );
    }

    // Create test configuration
    const testConfig: LLMConfig = {
      id: 'test',
      userId: user.id,
      providerType: body.providerType,
      name: 'Test Configuration',
      isActive: true,
      isPrimary: false,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      config: body.config,
    } as any;

    // Create provider instance
    let provider;
    try {
      switch (body.providerType) {
        case 'local':
          provider = new LocalLLMProvider(testConfig as any);
          break;
        case 'openrouter':
          provider = new OpenRouterProvider(testConfig as any);
          break;
        case 'openai':
          provider = new OpenAIProvider(testConfig as any);
          break;
        case 'anthropic':
          provider = new AnthropicProvider(testConfig as any);
          break;
        case 'managed':
          return NextResponse.json({
            error: 'Managed provider cannot be tested directly. It uses system credentials.',
          }, { status: 400 });
        default:
          return NextResponse.json({
            error: `Unsupported provider type: ${body.providerType}`,
          }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json({
        success: false,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Failed to create provider instance',
      } as TestResult, { status: 400 });
    }

    // Run health check
    const startTime = Date.now();
    try {
      const health = await provider.healthCheck();
      const responseTime = Date.now() - startTime;

      const result: TestResult = {
        success: health.status !== 'unhealthy',
        status: health.status,
        responseTime,
        availableModels: health.availableModels,
        message: health.status === 'healthy'
          ? 'Provider is healthy and ready to use'
          : health.error || 'Provider check completed',
      };

      if (health.error) {
        result.error = health.error;
      }

      // Update configuration test timestamp
      if ('id' in body && (body as any).id) {
        await supabase
          .from('llm_configurations')
          .update({
            last_tested_at: new Date().toISOString(),
            last_error: health.error || null,
          })
          .eq('id', (body as any).id)
          .eq('user_id', user.id);
      }

      return NextResponse.json(result);
    } catch (error) {
      const responseTime = Date.now() - startTime;

      const result: TestResult = {
        success: false,
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Health check failed',
        message: 'Failed to connect to provider',
      };

      return NextResponse.json(result, { status: 200 }); // Return 200 but with failure status
    } finally {
      // Cleanup
      await provider.cleanup();
    }
  } catch (error) {
    console.error('POST /api/llm/test error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
