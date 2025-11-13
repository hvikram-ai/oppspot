/**
 * Valuation API Routes
 *
 * POST /api/data-room/valuations - Create new valuation
 * GET /api/data-room/valuations - List valuations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValuationService } from '@/lib/data-room/valuation/valuation-service';
import {
  listValuationModels,
  type ListValuationsFilters,
} from '@/lib/data-room/valuation/repository/valuation-repository';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CreateValuationSchema = z.object({
  data_room_id: z.string().uuid(),
  model_name: z.string().min(1).max(200),
  company_name: z.string().min(1).max(200),
  valuation_date: z.string().optional(),
  currency: z.enum(['USD', 'GBP', 'EUR']).optional(),
  fiscal_year_end: z.string().optional(),

  // Financial inputs (optional)
  arr: z.number().positive().optional(),
  mrr: z.number().positive().optional(),
  revenue_growth_rate: z.number().optional(),
  gross_margin: z.number().min(0).max(100).optional(),
  net_revenue_retention: z.number().optional(),
  cac_payback_months: z.number().positive().optional(),
  burn_rate: z.number().optional(),
  runway_months: z.number().positive().optional(),
  ebitda: z.number().optional(),
  employees: z.number().int().positive().optional(),

  // Extraction settings
  source_documents: z.array(z.string().uuid()).optional(),
  extraction_method: z.enum(['manual', 'ai_extracted', 'companies_house', 'hybrid']).optional(),
  valuation_method: z.enum(['revenue_multiple', 'dcf', 'hybrid']).optional(),
  assumptions: z.record(z.unknown()).optional(),
});

// ============================================================================
// POST - Create Valuation
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = CreateValuationSchema.parse(body);

    // Check data room access
    const { data: access, error: accessError } = await supabase
      .from('data_room_access')
      .select('permission_level')
      .eq('data_room_id', validated.data_room_id)
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .single();

    if (accessError || !access) {
      return NextResponse.json({ error: 'Data room not found or access denied' }, { status: 403 });
    }

    // Check permission (editor or owner required)
    if (!['owner', 'editor'].includes(access.permission_level)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Editor or owner role required.' },
        { status: 403 }
      );
    }

    // Generate valuation
    const service = getValuationService();
    const result = await service.generateValuation(validated, user.id);

    return NextResponse.json(
      {
        success: true,
        valuation_model_id: result.valuation_model_id,
        valuation_range: `${formatCurrency(result.valuation_low, validated.currency)}-${formatCurrency(result.valuation_high, validated.currency)}`,
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
        processing_time_ms: result.processing_time_ms,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Create valuation failed:', error);

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
        error: 'Failed to create valuation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - List Valuations
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: ListValuationsFilters = {
      data_room_id: searchParams.get('data_room_id') || undefined,
      status: (searchParams.get('status') as any) || undefined,
      valuation_method: (searchParams.get('valuation_method') as any) || undefined,
      created_by: searchParams.get('created_by') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      search: searchParams.get('search') || undefined,
    };

    // List valuations (RLS handles access control)
    const valuations = await listValuationModels(filters);

    // Format response
    const formatted = valuations.map((v) => ({
      id: v.id,
      data_room_id: v.data_room_id,
      data_room_name: v.data_room_name,
      model_name: v.model_name,
      company_name: v.company_name,
      valuation_date: v.valuation_date,
      currency: v.currency,
      valuation_range:
        v.estimated_valuation_low && v.estimated_valuation_high
          ? `${formatCurrency(v.estimated_valuation_low, v.currency)}-${formatCurrency(v.estimated_valuation_high, v.currency)}`
          : 'Not calculated',
      valuation_mid: v.estimated_valuation_mid,
      confidence: v.valuation_confidence,
      status: v.status,
      comparables_count: v.comparables_count,
      scenarios_count: v.scenarios_count,
      created_by: v.created_by,
      created_by_name: v.created_by_name,
      created_at: v.created_at,
      updated_at: v.updated_at,
    }));

    return NextResponse.json({
      success: true,
      valuations: formatted,
      count: formatted.length,
    });
  } catch (error) {
    console.error('[API] List valuations failed:', error);

    return NextResponse.json(
      {
        error: 'Failed to list valuations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number, currency?: string): string {
  const currencySymbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';

  if (amount >= 1000000) {
    return `${currencySymbol}${(amount / 1000000).toFixed(0)}M`;
  } else if (amount >= 1000) {
    return `${currencySymbol}${(amount / 1000).toFixed(0)}K`;
  } else {
    return `${currencySymbol}${amount.toFixed(0)}`;
  }
}
