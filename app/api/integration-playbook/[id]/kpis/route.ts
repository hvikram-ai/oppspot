/**
 * Integration KPIs API Routes
 * GET - List KPIs
 * PATCH - Update KPI values
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlaybookRepository } from '@/lib/data-room/repository/playbook-repository';
import type { KPICategory, MeasurementFrequency } from '@/lib/data-room/types';

/**
 * GET /api/integration-playbook/[id]/kpis
 * List all KPIs with optional filters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const playbookId = id;
    const { searchParams } = new URL(request.url);

    // Parse filters
    const category = searchParams.get('kpi_category') as KPICategory | undefined;

    // Get KPIs
    const repository = new PlaybookRepository(supabase);
    let kpis = await repository.getKPIs(playbookId);

    // Apply filters
    if (category) {
      kpis = kpis.filter((k) => k.kpi_category === category);
    }

    // Calculate summary
    const summary = {
      total: kpis.length,
      with_targets: kpis.filter((k) => k.target_value !== null).length,
      with_actuals: kpis.filter((k) => k.current_value !== null).length,
      on_track: kpis.filter((k) => {
        if (k.target_value === null || k.current_value === null) return false;
        return k.current_value >= k.target_value * 0.9; // Within 90% of target
      }).length,
    };

    return NextResponse.json({
      success: true,
      data: kpis,
      summary,
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch KPIs' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/integration-playbook/[id]/kpis
 * Update a KPI's values
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: _playbookId } = await params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { kpi_id, baseline_value, target_value, current_value, notes } = body;

    if (!kpi_id) {
      return NextResponse.json(
        { error: 'kpi_id is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: {
      updated_at: string;
      baseline_value?: number;
      target_value?: number;
      current_value?: number;
      notes?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (baseline_value !== undefined) updates.baseline_value = baseline_value;
    if (target_value !== undefined) updates.target_value = target_value;
    if (current_value !== undefined) updates.current_value = current_value;
    if (notes) updates.notes = notes;

    // Update KPI
    const { data, error } = await supabase
      .from('integration_kpis')
      .update(updates)
      .eq('id', kpi_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update KPI: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'KPI updated successfully',
    });
  } catch (error) {
    console.error('Error updating KPI:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update KPI' },
      { status: 500 }
    );
  }
}
