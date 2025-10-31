/**
 * POST /api/companies/[id]/esg/recompute
 * Triggers recomputation of ESG scores from metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getScoringEngine } from '@/lib/esg';
import type { ESGMetric, ESGBenchmark, ESGScore } from '@/types/esg';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const body = await request.json();

    // Parse request body
    const periodYear = body.period_year || new Date().getFullYear();
    const force = body.force || false;
    const includeSentiment = body.include_sentiment || false;

    const supabase = await createClient();

    console.log(`🔄 Recomputing ESG scores for company ${companyId}, year ${periodYear}`);

    // Get company info for sector/size matching
    const { data: company, error: companyError } = await supabase
      .from('businesses')
      .select('company_name, company_sector, company_size, country')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check if scores already exist (unless force = true)
    if (!force) {
      const { data: existingScores } = await supabase
        .from('esg_scores')
        .select('id')
        .eq('company_id', companyId)
        .eq('period_year', periodYear)
        .limit(1);

      if (existingScores && existingScores.length > 0) {
        return NextResponse.json({
          message: 'Scores already exist. Use force=true to recompute.',
          company_id: companyId,
          period_year: periodYear,
          status: 'skipped'
        });
      }
    }

    // Fetch all metrics for this company/year
    const { data: metrics, error: metricsError } = await supabase
      .from('esg_metrics')
      .select('*')
      .eq('company_id', companyId)
      .eq('period_year', periodYear);

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      );
    }

    if (!metrics || metrics.length === 0) {
      return NextResponse.json({
        message: 'No metrics found for this period. Upload ESG documents first.',
        company_id: companyId,
        period_year: periodYear,
        status: 'no_data'
      }, { status: 400 });
    }

    // Fetch all benchmarks
    const { data: benchmarks, error: benchmarksError } = await supabase
      .from('esg_benchmarks')
      .select('*');

    if (benchmarksError) {
      console.error('Error fetching benchmarks:', benchmarksError);
      return NextResponse.json(
        { error: 'Failed to fetch benchmarks' },
        { status: 500 }
      );
    }

    // Initialize scoring engine
    const scoringEngine = getScoringEngine();

    // Compute scores
    console.log(`📊 Computing scores from ${metrics.length} metrics...`);

    const sector = company.company_sector || 'Technology';
    const sizeMap: Record<string, string> = {
      'micro': 'small',
      'small': 'small',
      'medium': 'medium',
      'large': 'large',
      'enterprise': 'enterprise'
    };
    const sizeBand = sizeMap[company.company_size?.toLowerCase() || 'medium'] || 'medium';
    const region = company.country === 'Ireland' ? 'Ireland' : 'UK';

    const categoryScores = await scoringEngine.computeAllScores({
      companyId,
      periodYear,
      metrics: metrics as ESGMetric[],
      benchmarks: (benchmarks || []) as ESGBenchmark[],
      sector,
      sizeBand,
      region
    });

    console.log(`✅ Computed ${categoryScores.length} category/subcategory scores`);

    // Delete existing scores if force=true
    if (force) {
      const { error: deleteError } = await supabase
        .from('esg_scores')
        .delete()
        .eq('company_id', companyId)
        .eq('period_year', periodYear);

      if (deleteError) {
        console.error('Error deleting existing scores:', deleteError);
      }
    }

    // Insert new scores
    const scoresToInsert = categoryScores.map(cs => ({
      company_id: companyId,
      period_year: periodYear,
      category: cs.category,
      subcategory: cs.subcategory,
      score: cs.score,
      level: cs.level,
      benchmark_percentile: cs.benchmark_percentile,
      data_completeness: cs.data_completeness,
      details: {
        metric_count: cs.metric_count,
        metrics_with_benchmarks: cs.metrics_with_benchmarks,
        weighted_scores: cs.weighted_scores,
        improvements: cs.improvements
      },
      computed_at: new Date().toISOString()
    }));

    const { data: insertedScores, error: insertError } = await supabase
      .from('esg_scores')
      .insert(scoresToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting scores:', insertError);
      return NextResponse.json(
        { error: 'Failed to save scores', details: insertError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Inserted ${insertedScores?.length || 0} score records`);

    // TODO: If includeSentiment, trigger sentiment analysis

    return NextResponse.json({
      message: 'ESG scores recomputed successfully',
      company_id: companyId,
      company_name: company.company_name,
      period_year: periodYear,
      status: 'success',
      metrics_processed: metrics.length,
      scores_computed: categoryScores.length,
      scores_saved: insertedScores?.length || 0,
      category_summary: {
        environmental: categoryScores.find(s => s.category === 'environmental' && !s.subcategory),
        social: categoryScores.find(s => s.category === 'social' && !s.subcategory),
        governance: categoryScores.find(s => s.category === 'governance' && !s.subcategory)
      },
      computed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('ESG Recompute API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
