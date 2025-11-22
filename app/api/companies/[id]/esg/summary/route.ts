/**
 * ESG Summary API
 * GET /api/companies/[id]/esg/summary?year=YYYY
 * Returns category scores, metric highlights, benchmark deltas, sentiment summary
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ESGSummaryResponse } from '@/types/esg';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: companyId } = await params;
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Fetch ESG scores for the company and year
    const { data: scores, error: scoresError } = await supabase
      .from('esg_scores')
      .select('*')
      .eq('company_id', companyId)
      .eq('period_year', year)
      .order('category');

    if (scoresError) {
      console.error('[ESG API] Scores error:', scoresError);
      return NextResponse.json({ error: scoresError.message }, { status: 500 });
    }

    // Fetch metrics for highlights
    const { data: metrics, error: metricsError } = await supabase
      .from('esg_metrics')
      .select('*')
      .eq('company_id', companyId)
      .eq('period_year', year)
      .limit(50);

    if (metricsError) {
      console.error('[ESG API] Metrics error:', metricsError);
    }

    // Fetch sentiment (optional)
    const { data: sentiment } = await supabase
      .from('esg_sentiment')
      .select('*')
      .eq('company_id', companyId)
      .eq('period_year', year)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build response
    const response: ESGSummaryResponse = {
      company_id: companyId,
      period_year: year,
      category_scores: {
        environmental: {
          score: 0,
          level: 'lagging',
          subcategories: {},
        },
        social: {
          score: 0,
          level: 'lagging',
          subcategories: {},
        },
        governance: {
          score: 0,
          level: 'lagging',
          subcategories: {},
        },
      },
      highlights: [],
      last_updated: new Date().toISOString(),
    };

    // Process scores
    interface ESGScore {
      category: string;
      subcategory?: string;
      score: number;
      level: string;
      metrics_count?: number;
      metrics_with_data?: number;
      details?: { improvements?: string[] };
    }

    if (scores && scores.length > 0) {
      scores.forEach((score: ESGScore) => {
        const categoryKey = score.category as 'environmental' | 'social' | 'governance';

        if (score.subcategory) {
          // Subcategory score
          if (!response.category_scores[categoryKey].subcategories) {
            response.category_scores[categoryKey].subcategories = {};
          }
          response.category_scores[categoryKey].subcategories[score.subcategory] = {
            score: score.score,
            level: score.level,
            metrics_count: score.metrics_count || 0,
            data_completeness: score.metrics_with_data / Math.max(score.metrics_count, 1),
          };
        } else {
          // Category score
          response.category_scores[categoryKey].score = score.score;
          response.category_scores[categoryKey].level = score.level;
        }

        // Add highlights from details
        if (score.details && score.details.improvements) {
          score.details.improvements.forEach((improvement: string) => {
            response.highlights.push({
              type: 'weakness',
              category: score.category,
              subcategory: score.subcategory,
              message: improvement,
            });
          });
        }
      });
    }

    // Add sentiment summary if available
    interface SentimentItem {
      label: 'positive' | 'neutral' | 'negative';
      score?: number;
    }

    if (sentiment && sentiment.length > 0) {
      const positiveCount = sentiment.filter((s: SentimentItem) => s.label === 'positive').length;
      const neutralCount = sentiment.filter((s: SentimentItem) => s.label === 'neutral').length;
      const negativeCount = sentiment.filter((s: SentimentItem) => s.label === 'negative').length;
      const avgScore = sentiment.reduce((sum: number, s: SentimentItem) => sum + (s.score || 0), 0) / sentiment.length;

      response.sentiment_summary = {
        overall_sentiment: positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral',
        average_score: avgScore,
        positive_count: positiveCount,
        neutral_count: neutralCount,
        negative_count: negativeCount,
        recent_items: sentiment.slice(0, 3),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[ESG API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
