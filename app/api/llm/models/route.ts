/**
 * API: /api/llm/models
 *
 * List all available models across all configured providers
 *
 * Query Parameters:
 * - provider: Filter by provider config ID (optional)
 * - capability: Filter by capability (streaming, functions, vision, json_mode)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createLLMManager } from '@/lib/llm/manager/LLMManager';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('provider');
    const capability = searchParams.get('capability') as 'streaming' | 'functions' | 'vision' | 'json_mode' | null;

    // Initialize LLM Manager
    const manager = await createLLMManager({
      userId: user.id,
      enableFallback: false,
      enableCaching: false,
      enableUsageTracking: false,
    });

    try {
      // Get all models
      const models = await manager.listModels();

      // Filter by provider if specified
      let filteredModels = models;
      if (providerId) {
        filteredModels = models.filter(m => {
          // This would need provider ID in model info
          // For now, filter by provider type if model ID contains provider name
          return m.id.includes(providerId);
        });
      }

      // Filter by capability if specified
      if (capability) {
        filteredModels = filteredModels.filter(m => m.capabilities[capability]);
      }

      // Group by provider
      const byProvider = filteredModels.reduce((acc, model) => {
        const providerType = model.provider;
        if (!acc[providerType]) {
          acc[providerType] = [];
        }
        acc[providerType].push(model);
        return acc;
      }, {} as Record<string, typeof filteredModels>);

      return NextResponse.json({
        success: true,
        total: filteredModels.length,
        models: filteredModels,
        byProvider,
      });
    } finally {
      await manager.cleanup();
    }
  } catch (error) {
    console.error('GET /api/llm/models error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
