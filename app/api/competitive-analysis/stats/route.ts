import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleError, UnauthorizedError } from '@/lib/competitive-analysis/errors';

/**
 * GET /api/competitive-analysis/stats
 * Get aggregate statistics for user's competitive analyses
 *
 * Returns:
 * - active_analyses: Count of active analyses
 * - total_competitors: Total competitors tracked across all analyses
 * - avg_parity_score: Average feature parity across all competitors
 * - avg_moat_score: Average moat strength across all analyses
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Query 1: Count active analyses
    const { count: activeCount, error: countError } = await supabase
      .from('competitive_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (countError) {
      console.error('Error counting active analyses:', countError);
      throw countError;
    }

    // Query 2: Get all user's analyses with competitor counts and scores
    const { data: analyses, error: analysesError } = await supabase
      .from('competitive_analyses')
      .select(`
        id,
        competitor_count,
        avg_feature_parity_score,
        overall_moat_score
      `)
      .eq('created_by', user.id)
      .is('deleted_at', null);

    if (analysesError) {
      console.error('Error fetching analyses:', analysesError);
      throw analysesError;
    }

    // Calculate aggregate stats
    const totalCompetitors = analyses?.reduce((sum, a) => sum + (a.competitor_count || 0), 0) || 0;

    // Calculate average parity score (weighted by competitor count)
    let avgParityScore: number | null = null;
    if (analyses && analyses.length > 0) {
      const parityScores = analyses
        .filter(a => a.avg_feature_parity_score !== null && a.competitor_count > 0)
        .map(a => ({
          score: a.avg_feature_parity_score!,
          weight: a.competitor_count
        }));

      if (parityScores.length > 0) {
        const totalWeight = parityScores.reduce((sum, p) => sum + p.weight, 0);
        const weightedSum = parityScores.reduce((sum, p) => sum + (p.score * p.weight), 0);
        avgParityScore = Math.round((weightedSum / totalWeight) * 100) / 100;
      }
    }

    // Calculate average moat score
    let avgMoatScore: number | null = null;
    if (analyses && analyses.length > 0) {
      const moatScores = analyses
        .filter(a => a.overall_moat_score !== null)
        .map(a => a.overall_moat_score!);

      if (moatScores.length > 0) {
        avgMoatScore = Math.round((moatScores.reduce((sum, s) => sum + s, 0) / moatScores.length) * 100) / 100;
      }
    }

    return NextResponse.json({
      active_analyses: activeCount || 0,
      total_competitors: totalCompetitors,
      avg_parity_score: avgParityScore,
      avg_moat_score: avgMoatScore,
    }, { status: 200 });

  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}
