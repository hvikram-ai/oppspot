/**
 * Valuation Calculation API Route
 *
 * POST /api/data-room/valuations/[id]/calculate - Recalculate valuation with updated inputs
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValuationService } from '@/lib/data-room/valuation/valuation-service';
import { getValuationPermission } from '@/lib/data-room/valuation/repository/valuation-repository';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const RecalculateSchema = z.object({
  arr: z.number().positive().optional(),
  revenue_growth_rate: z.number().optional(),
  gross_margin: z.number().min(0).max(100).optional(),
  net_revenue_retention: z.number().optional(),
  cac_payback_months: z.number().positive().optional(),
  burn_rate: z.number().optional(),
  runway_months: z.number().positive().optional(),
  ebitda: z.number().optional(),
});

// ============================================================================
// POST - Recalculate Valuation
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission (editor or owner required)
    const permission = await getValuationPermission(id, user.id);
    if (!permission || !['owner', 'editor'].includes(permission)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Editor or owner role required.' },
        { status: 403 }
      );
    }

    // Parse and validate request body (optional inputs for recalculation)
    const body = await request.json().catch(() => ({}));
    const validated = RecalculateSchema.parse(body);

    // Recalculate valuation
    const service = getValuationService();
    const result = await service.recalculateValuation(id, validated);

    return NextResponse.json({
      success: true,
      valuation_model_id: result.valuation_model_id,
      valuation_range: `${formatCurrency(result.valuation_low)}-${formatCurrency(result.valuation_high)}`,
      valuation_low: result.valuation_low,
      valuation_mid: result.valuation_mid,
      valuation_high: result.valuation_high,
      multiple_low: result.multiple_low,
      multiple_mid: result.multiple_mid,
      multiple_high: result.multiple_high,
      confidence: result.confidence,
      data_quality_score: result.data_quality_score,
      ai_insights: result.ai_insights,
      calculation_details: result.calculation_details,
    });
  } catch (error) {
    console.error('[API] Recalculate valuation failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to recalculate valuation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(0)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  } else {
    return `$${amount.toFixed(0)}`;
  }
}
