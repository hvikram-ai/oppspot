/**
 * GET /api/competitive-analysis/[id]/trends
 *
 * Get historical trend data for time-series visualizations
 * Extracts key metrics from snapshots for charting
 *
 * Returns:
 * - moat_score_trend: Array of {date, score}
 * - parity_trend: Array of {date, avg_parity}
 * - pricing_trend: Array of {date, competitor_name, price}
 * - competitor_count_trend: Array of {date, count}
 *
 * Part of T014 Phase 4 implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { competitiveAnalysisRepository } from '@/lib/competitive-analysis/repository';
import {
  handleError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from '@/lib/competitive-analysis/errors';
import { validateUUID } from '@/lib/competitive-analysis/validation';
import type { DashboardData } from '@/lib/competitive-analysis/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID format
    const id = validateUUID(analysisId, 'Analysis ID');

    // Check access permissions
    const hasAccess = await competitiveAnalysisRepository.checkUserAccess(id, user.id);

    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this analysis');
    }

    // Check if analysis exists
    const analysis = await competitiveAnalysisRepository.findById(id);

    if (!analysis) {
      throw new NotFoundError('Analysis', id);
    }

    // Get all snapshots for this analysis
    const snapshots = await competitiveAnalysisRepository.getSnapshots(id);

    // Get current dashboard data (most recent point)
    const currentData = await competitiveAnalysisRepository.getDashboardData(id);

    // Extract trends from snapshots
    const trends = extractTrends(snapshots, currentData);

    return NextResponse.json(trends, { status: 200 });
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

/**
 * Extract time-series trends from snapshot data
 */
function extractTrends(
  snapshots: Array<{ snapshot_data: Record<string, unknown>; snapshot_date: string }>,
  currentData: DashboardData
) {
  // Sort snapshots by date (oldest first)
  const sortedSnapshots = [...snapshots].sort((a, b) =>
    new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
  );

  // Add current data as the latest point
  const allDataPoints = [
    ...sortedSnapshots.map(s => ({
      data: s.snapshot_data as DashboardData,
      date: s.snapshot_date,
    })),
    {
      data: currentData,
      date: new Date().toISOString(),
    },
  ];

  // Extract moat score trend
  const moatScoreTrend = allDataPoints
    .filter(point => point.data.moat_score?.overall_moat_score !== undefined)
    .map(point => ({
      date: point.date,
      score: point.data.moat_score!.overall_moat_score,
      feature_differentiation: point.data.moat_score!.feature_differentiation_score,
      pricing_power: point.data.moat_score!.pricing_power_score,
      brand_recognition: point.data.moat_score!.brand_recognition_score,
    }));

  // Extract average parity trend
  const parityTrend = allDataPoints.map(point => ({
    date: point.date,
    avg_parity: calculateAvgParity(point.data),
    competitor_count: point.data.competitors?.length || 0,
  }));

  // Extract per-competitor parity trend
  const competitorParityTrend = extractCompetitorParityTrend(allDataPoints);

  // Extract pricing trend (per competitor)
  const pricingTrend = extractPricingTrend(allDataPoints);

  // Extract competitor count trend
  const competitorCountTrend = allDataPoints.map(point => ({
    date: point.date,
    count: point.data.competitors?.length || 0,
  }));

  // Calculate velocity metrics (features added per time period)
  const featureVelocity = calculateFeatureVelocity(allDataPoints);

  return {
    moat_score_trend: moatScoreTrend,
    parity_trend: parityTrend,
    competitor_parity_trend: competitorParityTrend,
    pricing_trend: pricingTrend,
    competitor_count_trend: competitorCountTrend,
    feature_velocity: featureVelocity,
    data_points: allDataPoints.length,
    oldest_snapshot: sortedSnapshots[0]?.snapshot_date || null,
    latest_snapshot: new Date().toISOString(),
  };
}

/**
 * Calculate average parity from dashboard data
 */
function calculateAvgParity(data: DashboardData): number {
  if (!data.competitors || data.competitors.length === 0) return 0;

  const parityScores = data.competitors
    .map(c => c.parity_score?.parity_score)
    .filter((s): s is number => s !== undefined && s !== null);

  if (parityScores.length === 0) return 0;

  return Math.round(
    parityScores.reduce((sum, s) => sum + s, 0) / parityScores.length
  );
}

/**
 * Extract per-competitor parity trends
 */
function extractCompetitorParityTrend(
  dataPoints: Array<{ data: DashboardData; date: string }>
): Array<{ date: string; competitor_name: string; parity_score: number }> {
  const trends: Array<{ date: string; competitor_name: string; parity_score: number }> = [];

  for (const point of dataPoints) {
    if (!point.data.competitors) continue;

    for (const competitor of point.data.competitors) {
      if (competitor.parity_score?.parity_score !== undefined) {
        trends.push({
          date: point.date,
          competitor_name: competitor.competitor_name,
          parity_score: competitor.parity_score.parity_score,
        });
      }
    }
  }

  return trends;
}

/**
 * Extract pricing trends per competitor
 */
function extractPricingTrend(
  dataPoints: Array<{ data: DashboardData; date: string }>
): Array<{ date: string; competitor_name: string; price: number; currency: string }> {
  const trends: Array<{ date: string; competitor_name: string; price: number; currency: string }> = [];

  for (const point of dataPoints) {
    if (!point.data.pricing_comparisons) continue;

    for (const pricing of point.data.pricing_comparisons) {
      // Find competitor name from junction table
      const competitor = point.data.competitors?.find(
        c => c.competitor_company_id === pricing.competitor_company_id
      );

      if (competitor && pricing.representative_price !== null) {
        trends.push({
          date: point.date,
          competitor_name: competitor.competitor_name,
          price: pricing.representative_price,
          currency: pricing.currency || 'USD',
        });
      }
    }
  }

  return trends;
}

/**
 * Calculate feature velocity (features added per time period)
 */
function calculateFeatureVelocity(
  dataPoints: Array<{ data: DashboardData; date: string }>
): Array<{ period: string; features_added: number; features_total: number }> {
  if (dataPoints.length < 2) return [];

  const velocity: Array<{ period: string; features_added: number; features_total: number }> = [];

  for (let i = 1; i < dataPoints.length; i++) {
    const previous = dataPoints[i - 1];
    const current = dataPoints[i];

    const previousFeatures = new Set(
      previous.data.feature_matrix?.map(f => f.feature_name) || []
    );
    const currentFeatures = new Set(
      current.data.feature_matrix?.map(f => f.feature_name) || []
    );

    const featuresAdded = [...currentFeatures].filter(
      f => !previousFeatures.has(f)
    ).length;

    // Format period as "Jan 2025 - Feb 2025"
    const startDate = new Date(previous.date);
    const endDate = new Date(current.date);
    const period = `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

    velocity.push({
      period,
      features_added: featuresAdded,
      features_total: currentFeatures.size,
    });
  }

  return velocity;
}
