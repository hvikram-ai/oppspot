/**
 * GET /api/companies/[id]/esg/metrics
 * Returns detailed ESG metrics for a company with benchmark data
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ESGMetric, ESGBenchmark } from '@/types/esg';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const category = searchParams.get('category') as 'environmental' | 'social' | 'governance' | null;
    const subcategory = searchParams.get('subcategory') || null;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();

    // Build query for metrics
    let metricsQuery = supabase
      .from('esg_metrics')
      .select('*')
      .eq('company_id', companyId)
      .eq('period_year', year)
      .order('category', { ascending: true })
      .order('subcategory', { ascending: true })
      .order('metric_name', { ascending: true })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (category) {
      metricsQuery = metricsQuery.eq('category', category);
    }
    if (subcategory) {
      metricsQuery = metricsQuery.eq('subcategory', subcategory);
    }

    const { data: metrics, error: metricsError } = await metricsQuery;

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      );
    }

    // If no metrics found, return empty response
    if (!metrics || metrics.length === 0) {
      return NextResponse.json({
        company_id: companyId,
        period_year: year,
        metrics: [],
        benchmarks: {},
        total_count: 0,
        filters: { category, subcategory }
      });
    }

    // Fetch benchmarks for all metric keys
    const metricKeys = [...new Set(metrics.map(m => m.metric_key))];

    // Get company info to determine sector and size
    const { data: company } = await supabase
      .from('businesses')
      .select('company_sector, company_size, country')
      .eq('id', companyId)
      .single();

    const sector = company?.company_sector || 'Technology';
    const sizeMap: Record<string, string> = {
      'micro': 'small',
      'small': 'small',
      'medium': 'medium',
      'large': 'large',
      'enterprise': 'enterprise'
    };
    const sizeBand = sizeMap[company?.company_size?.toLowerCase() || 'medium'] || 'medium';
    const region = company?.country === 'Ireland' ? 'Ireland' : 'UK';

    // Fetch benchmarks for these metrics
    const { data: benchmarks } = await supabase
      .from('esg_benchmarks')
      .select('*')
      .in('metric_key', metricKeys);

    // Create benchmark lookup map
    const benchmarkMap: Record<string, ESGBenchmark[]> = {};
    if (benchmarks) {
      benchmarks.forEach((b: ESGBenchmark) => {
        if (!benchmarkMap[b.metric_key]) {
          benchmarkMap[b.metric_key] = [];
        }
        benchmarkMap[b.metric_key].push(b);
      });
    }

    // Enhance metrics with benchmark data and calculated percentiles
    const enhancedMetrics = metrics.map((metric: ESGMetric) => {
      const metricBenchmarks = benchmarkMap[metric.metric_key] || [];

      // Find the best matching benchmark (exact sector/size/region -> sector/size -> sector -> global)
      let matchedBenchmark: ESGBenchmark | null = null;

      // Priority 1: Exact match
      matchedBenchmark = metricBenchmarks.find(
        b => b.sector === sector && b.size_band === sizeBand && b.region === region
      ) || null;

      // Priority 2: Sector and size match (any region)
      if (!matchedBenchmark) {
        matchedBenchmark = metricBenchmarks.find(
          b => b.sector === sector && b.size_band === sizeBand
        ) || null;
      }

      // Priority 3: Sector match only
      if (!matchedBenchmark) {
        matchedBenchmark = metricBenchmarks.find(
          b => b.sector === sector
        ) || null;
      }

      // Priority 4: Any benchmark
      if (!matchedBenchmark && metricBenchmarks.length > 0) {
        matchedBenchmark = metricBenchmarks[0];
      }

      return {
        ...metric,
        benchmark: matchedBenchmark,
        has_benchmark: !!matchedBenchmark
      };
    });

    // Get total count for pagination
    let countQuery = supabase
      .from('esg_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('period_year', year);

    if (category) {
      countQuery = countQuery.eq('category', category);
    }
    if (subcategory) {
      countQuery = countQuery.eq('subcategory', subcategory);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      company_id: companyId,
      period_year: year,
      metrics: enhancedMetrics,
      benchmarks: benchmarkMap,
      total_count: count || 0,
      returned_count: enhancedMetrics.length,
      filters: {
        category,
        subcategory,
        sector,
        size_band: sizeBand,
        region
      },
      pagination: {
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('ESG Metrics API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
