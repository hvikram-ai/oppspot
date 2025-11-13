/**
 * Valuation Detail API Routes
 *
 * GET /api/data-room/valuations/[id] - Get valuation by ID
 * PATCH /api/data-room/valuations/[id] - Update valuation
 * DELETE /api/data-room/valuations/[id] - Delete valuation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getValuationModelWithStats,
  updateValuationModel,
  deleteValuationModel,
  checkValuationAccess,
  getValuationPermission,
} from '@/lib/data-room/valuation/repository/valuation-repository';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateValuationSchema = z.object({
  model_name: z.string().min(1).max(200).optional(),
  company_name: z.string().min(1).max(200).optional(),
  valuation_date: z.string().optional(),
  currency: z.enum(['USD', 'GBP', 'EUR']).optional(),
  fiscal_year_end: z.string().optional(),
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
  valuation_method: z.enum(['revenue_multiple', 'dcf', 'hybrid']).optional(),
  assumptions: z.record(z.unknown()).optional(),
});

// ============================================================================
// GET - Retrieve Valuation
// ============================================================================

export async function GET(
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

    // Check access
    const hasAccess = await checkValuationAccess(id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Valuation not found or access denied' }, { status: 404 });
    }

    // Fetch valuation with stats
    const valuation = await getValuationModelWithStats(id);

    if (!valuation) {
      return NextResponse.json({ error: 'Valuation not found' }, { status: 404 });
    }

    // Format response
    const formatted = {
      ...valuation,
      valuation_range:
        valuation.estimated_valuation_low && valuation.estimated_valuation_high
          ? `${formatCurrency(valuation.estimated_valuation_low, valuation.currency)}-${formatCurrency(valuation.estimated_valuation_high, valuation.currency)}`
          : 'Not calculated',
    };

    return NextResponse.json({
      success: true,
      valuation: formatted,
    });
  } catch (error) {
    console.error('[API] Get valuation failed:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve valuation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update Valuation
// ============================================================================

export async function PATCH(
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

    // Parse and validate request body
    const body = await request.json();
    const validated = UpdateValuationSchema.parse(body);

    // Update valuation
    const updated = await updateValuationModel(id, validated);

    return NextResponse.json({
      success: true,
      valuation: updated,
    });
  } catch (error) {
    console.error('[API] Update valuation failed:', error);

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
        error: 'Failed to update valuation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete Valuation
// ============================================================================

export async function DELETE(
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

    // Check permission (owner only)
    const permission = await getValuationPermission(id, user.id);
    if (permission !== 'owner') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Owner role required.' },
        { status: 403 }
      );
    }

    // Soft delete valuation
    await deleteValuationModel(id);

    return NextResponse.json({
      success: true,
      message: 'Valuation deleted successfully',
    });
  } catch (error) {
    console.error('[API] Delete valuation failed:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete valuation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(amount: number, currency: string): string {
  const currencySymbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$';

  if (amount >= 1000000) {
    return `${currencySymbol}${(amount / 1000000).toFixed(0)}M`;
  } else if (amount >= 1000) {
    return `${currencySymbol}${(amount / 1000).toFixed(0)}K`;
  } else {
    return `${currencySymbol}${amount.toFixed(0)}`;
  }
}
