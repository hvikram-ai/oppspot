import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { competitiveAnalysisRepository } from '@/lib/competitive-analysis/repository';
import { dataGatherer } from '@/lib/competitive-analysis/data-gatherer';
import { scoringEngine } from '@/lib/competitive-analysis/scoring-engine';
import { validateUUID } from '@/lib/competitive-analysis/validation';
import {
  handleError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/lib/competitive-analysis/errors';

/**
 * POST /api/competitive-analysis/[id]/refresh
 * Trigger on-demand data refresh for an analysis
 *
 * Creates snapshot before refresh
 * Gathers fresh competitor data
 * Updates feature matrix and pricing
 * Recalculates parity and moat scores
 * Updates last_refreshed_at timestamp
 *
 * Target: <2 minutes for 10 competitors
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID format
    const id = validateUUID(params.id, 'Analysis ID');

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

    // Check if analysis is owned by user (only owner can refresh for now)
    if (analysis.created_by !== user.id) {
      throw new ForbiddenError('Only the owner can refresh analysis data');
    }

    // Get competitors
    const competitors = await competitiveAnalysisRepository.getCompetitors(id);

    if (competitors.length === 0) {
      throw new ValidationError('Add competitors before refreshing data');
    }

    // Create snapshot before refresh
    try {
      const dashboardData = await competitiveAnalysisRepository.getDashboardData(id);
      await competitiveAnalysisRepository.createSnapshot({
        analysis_id: id,
        snapshot_data: dashboardData,
        snapshot_notes: 'Auto-snapshot before data refresh',
      });
    } catch (snapshotError) {
      console.error('Failed to create snapshot:', snapshotError);
      // Continue with refresh even if snapshot fails
    }

    // Estimate completion time (20 seconds per competitor + overhead)
    const estimatedSeconds = Math.ceil(competitors.length * 20 + 30);

    // Start refresh process (in background for now - could be moved to queue)
    const refreshPromise = performRefresh(id, analysis, competitors);

    // Return 202 Accepted with estimated completion
    return NextResponse.json(
      {
        message: 'Data refresh started',
        status: 'processing',
        estimated_completion_seconds: estimatedSeconds,
        competitors_count: competitors.length,
      },
      { status: 202 }
    );
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

/**
 * GET /api/competitive-analysis/[id]/refresh
 * Get refresh status (for polling)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new UnauthorizedError();
    }

    // Validate UUID format
    const id = validateUUID(params.id, 'Analysis ID');

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

    // Return refresh status
    return NextResponse.json(
      {
        last_refreshed_at: analysis.last_refreshed_at,
        status: analysis.status,
      },
      { status: 200 }
    );
  } catch (error) {
    const { statusCode, body } = handleError(error);
    return NextResponse.json(body, { status: statusCode });
  }
}

/**
 * Perform the actual refresh (background process)
 */
async function performRefresh(
  analysisId: string,
  analysis: any,
  competitors: any[]
): Promise<void> {
  try {
    console.log(`[Refresh] Starting refresh for analysis ${analysisId}`);

    // Gather fresh competitor data
    const competitorData = await dataGatherer.gatherCompetitorData(
      competitors.map((c) => ({
        name: c.competitor_name,
        website: c.competitor_website,
      })),
      (progress) => {
        console.log(`[Refresh] Progress: ${progress.current}/${progress.total} - ${progress.current_competitor || 'processing'}`);
      }
    );

    console.log(`[Refresh] Data gathered for ${competitorData.length} competitors`);

    // Update feature matrix entries
    for (const data of competitorData) {
      if (data.features && data.features.length > 0) {
        // Find competitor in junction table
        const competitor = competitors.find((c) => c.competitor_name === data.competitor_name);
        if (!competitor) continue;

        // Add/update features in matrix
        for (const feature of data.features) {
          try {
            await competitiveAnalysisRepository.upsertFeatureMatrixEntry({
              analysis_id: analysisId,
              feature_name: feature,
              feature_category: 'core', // Default category
              target_company_has: false, // User needs to update
              competitor_company_id: competitor.competitor_company_id,
              competitor_has: true,
              notes: `Auto-detected from website on ${new Date().toISOString()}`,
            });
          } catch (featureError) {
            console.error(`Failed to upsert feature ${feature}:`, featureError);
          }
        }
      }

      // Update pricing comparison
      if (data.pricing_info) {
        try {
          await competitiveAnalysisRepository.upsertPricingComparison({
            analysis_id: analysisId,
            competitor_company_id: competitors.find((c) => c.competitor_name === data.competitor_name)
              ?.competitor_company_id,
            price_tier: data.pricing_info.price_tier as any,
            representative_price: data.pricing_info.representative_price,
            pricing_model: data.pricing_info.pricing_model,
            currency: data.pricing_info.currency,
          });
        } catch (pricingError) {
          console.error(`Failed to update pricing for ${data.competitor_name}:`, pricingError);
        }
      }
    }

    // Recalculate parity scores for each competitor
    for (const competitor of competitors) {
      try {
        const featureMatrix = await competitiveAnalysisRepository.getFeatureMatrix(analysisId);

        const targetFeatures = featureMatrix
          .filter((f) => f.target_company_has)
          .map((f) => f.feature_name);

        const competitorFeatures = featureMatrix
          .filter(
            (f) => f.competitor_company_id === competitor.competitor_company_id && f.competitor_has
          )
          .map((f) => f.feature_name);

        const parityScore = scoringEngine.calculateFeatureParity(
          { features: targetFeatures },
          { features: competitorFeatures }
        );

        await competitiveAnalysisRepository.upsertFeatureParityScore({
          analysis_id: analysisId,
          competitor_company_id: competitor.competitor_company_id,
          parity_score: parityScore.score,
          overlap_percentage: parityScore.overlapPercentage,
          target_unique_count: parityScore.targetUniqueCount,
          competitor_unique_count: parityScore.competitorUniqueCount,
          shared_features_count: parityScore.sharedFeaturesCount,
          confidence_level: parityScore.confidenceLevel,
        });
      } catch (scoreError) {
        console.error(`Failed to calculate parity for competitor ${competitor.competitor_company_id}:`, scoreError);
      }
    }

    // Recalculate moat score
    try {
      const parityScores = await competitiveAnalysisRepository.getParityScores(analysisId);
      const pricingComparisons = await competitiveAnalysisRepository.getPricingComparisons(analysisId);

      // Get competitor names for platform threat detection
      const competitorNames = competitors.map(c => c.competitor_name);

      const moatScore = scoringEngine.calculateMoatScore({
        parityScores: parityScores.map((s) => s.parity_score),
        pricingComparisons: pricingComparisons.map((p) => ({
          positioning: p.pricing_positioning || 'parity',
          targetPrice: analysis.target_company_representative_price || 0,
          competitorPrice: p.representative_price || 0,
        })),
        competitorNames, // Pass competitor names for threat detection
      });

      await competitiveAnalysisRepository.upsertMoatScore({
        analysis_id: analysisId,
        overall_moat_score: moatScore.overallScore,
        feature_differentiation_score: moatScore.featureDifferentiation,
        pricing_power_score: moatScore.pricingPower,
        brand_recognition_score: moatScore.brandRecognition,
        customer_lockin_score: moatScore.customerLockIn,
        network_effects_score: moatScore.networkEffects,
        risk_factors: moatScore.riskFactors, // Include risk factors with platform threats
      });
    } catch (moatError) {
      console.error('Failed to calculate moat score:', moatError);
    }

    // Update last_refreshed_at timestamp
    await competitiveAnalysisRepository.updateLastRefreshed(analysisId);

    console.log(`[Refresh] Completed refresh for analysis ${analysisId}`);
  } catch (error) {
    console.error(`[Refresh] Failed to refresh analysis ${analysisId}:`, error);
    throw error;
  }
}
