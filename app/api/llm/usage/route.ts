/**
 * API: /api/llm/usage
 *
 * Retrieve usage statistics and analytics
 *
 * Query Parameters:
 * - period: 'day' | 'week' | 'month' | 'all' (default: 'month')
 * - feature: Filter by feature (optional)
 * - provider: Filter by provider config ID (optional)
 * - model: Filter by model (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  errorRate: number;
  byProvider: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
    averageLatency: number;
  }>;
  byFeature: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
  byModel: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
  recentRequests: Array<{
    id: string;
    feature: string;
    model: string;
    tokens: number;
    cost: number;
    latency: number;
    status: string;
    createdAt: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const feature = searchParams.get('feature');
    const providerId = searchParams.get('provider');
    const model = searchParams.get('model');

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Build query
    let query = supabase
      .from('llm_usage')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString());

    // Apply filters
    if (feature) query = query.eq('feature', feature);
    if (providerId) query = query.eq('config_id', providerId);
    if (model) query = query.eq('model', model);

    const { data: usageData, error } = await query;

    if (error) {
      console.error('Failed to fetch usage data:', error);
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }

    // Calculate statistics
    const stats: UsageStats = {
      totalRequests: usageData.length,
      successfulRequests: usageData.filter(u => u.status === 'success').length,
      failedRequests: usageData.filter(u => u.status !== 'success').length,
      totalTokens: usageData.reduce((sum, u) => sum + (u.total_tokens || 0), 0),
      totalCost: usageData.reduce((sum, u) => sum + (parseFloat(u.total_cost) || 0), 0),
      averageLatency: usageData.length > 0
        ? usageData.reduce((sum, u) => sum + (u.latency_ms || 0), 0) / usageData.length
        : 0,
      errorRate: usageData.length > 0
        ? (usageData.filter(u => u.status !== 'success').length / usageData.length) * 100
        : 0,
      byProvider: {},
      byFeature: {},
      byModel: {},
      recentRequests: [],
    };

    // Group by provider
    const byProvider = usageData.reduce((acc, usage) => {
      const key = usage.config_id || 'unknown';
      if (!acc[key]) {
        acc[key] = { requests: 0, tokens: 0, cost: 0, totalLatency: 0 };
      }
      acc[key].requests++;
      acc[key].tokens += usage.total_tokens || 0;
      acc[key].cost += parseFloat(usage.total_cost) || 0;
      acc[key].totalLatency += usage.latency_ms || 0;
      return acc;
    }, {} as Record<string, any>);

    stats.byProvider = Object.fromEntries(
      Object.entries(byProvider).map(([key, value]: [string, any]) => [
        key,
        {
          requests: value.requests,
          tokens: value.tokens,
          cost: value.cost,
          averageLatency: value.requests > 0 ? value.totalLatency / value.requests : 0,
        },
      ])
    );

    // Group by feature
    const byFeature = usageData.reduce((acc, usage) => {
      const key = usage.feature;
      if (!acc[key]) {
        acc[key] = { requests: 0, tokens: 0, cost: 0 };
      }
      acc[key].requests++;
      acc[key].tokens += usage.total_tokens || 0;
      acc[key].cost += parseFloat(usage.total_cost) || 0;
      return acc;
    }, {} as Record<string, any>);

    stats.byFeature = byFeature;

    // Group by model
    const byModel = usageData.reduce((acc, usage) => {
      const key = usage.model;
      if (!acc[key]) {
        acc[key] = { requests: 0, tokens: 0, cost: 0 };
      }
      acc[key].requests++;
      acc[key].tokens += usage.total_tokens || 0;
      acc[key].cost += parseFloat(usage.total_cost) || 0;
      return acc;
    }, {} as Record<string, any>);

    stats.byModel = byModel;

    // Get recent requests (last 10)
    stats.recentRequests = usageData
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(usage => ({
        id: usage.id,
        feature: usage.feature,
        model: usage.model,
        tokens: usage.total_tokens,
        cost: parseFloat(usage.total_cost),
        latency: usage.latency_ms,
        status: usage.status,
        createdAt: usage.created_at,
      }));

    return NextResponse.json({
      success: true,
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      stats,
    });
  } catch (error) {
    console.error('GET /api/llm/usage error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
