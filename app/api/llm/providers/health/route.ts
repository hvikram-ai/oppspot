/**
 * API: /api/llm/providers/health
 *
 * Check health status of all configured providers
 *
 * GET - Check health and get statistics
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

    // Initialize LLM Manager
    const manager = await createLLMManager({
      userId: user.id,
      enableFallback: false,
      enableCaching: false,
      enableUsageTracking: false,
      healthCheckIntervalSeconds: 0, // Don't start background checks
    });

    try {
      // Get system statistics
      const stats = manager.getStatistics();

      // Get provider comparisons (includes health info)
      const comparisons = await manager.compareProviders();

      return NextResponse.json({
        success: true,
        checkedAt: new Date().toISOString(),
        summary: {
          totalProviders: stats.totalProviders,
          healthyProviders: stats.healthyProviders,
          degradedProviders: stats.degradedProviders,
          unhealthyProviders: stats.unhealthyProviders,
          primaryProvider: stats.primaryProvider,
        },
        cache: {
          size: stats.cacheSize,
          hitRate: stats.cacheHitRate ? `${(stats.cacheHitRate * 100).toFixed(1)}%` : '0%',
        },
        providers: comparisons.map(comp => ({
          id: comp.configId,
          name: comp.providerName,
          type: comp.providerType,
          score: comp.score,
          recommendation: comp.recommendation,
          reasoning: comp.reasoning,
          factors: {
            availability: `${comp.factors.availability}%`,
            latency: `${comp.factors.latency.toFixed(0)}ms`,
            cost: comp.factors.cost,
            reliability: `${comp.factors.reliability.toFixed(1)}%`,
          },
        })),
      });
    } finally {
      await manager.cleanup();
    }
  } catch (error) {
    console.error('GET /api/llm/providers/health error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
