/**
 * Integration Synergies API Routes
 * GET - List synergies
 * PATCH - Update synergy actuals
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlaybookRepository } from '@/lib/data-room/repository/playbook-repository';
import type { SynergyType, SynergyStatus } from '@/lib/data-room/types';

/**
 * GET /api/integration-playbook/[id]/synergies
 * List all synergies with optional filters
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
    const synergyType = searchParams.get('synergy_type') as SynergyType | undefined;
    const status = searchParams.get('status') as SynergyStatus | undefined;
    const category = searchParams.get('category');

    // Get synergies
    const repository = new PlaybookRepository(supabase);
    let synergies = await repository.getSynergies(playbookId);

    // Apply filters
    if (synergyType) {
      synergies = synergies.filter((s) => s.synergy_type === synergyType);
    }
    if (status) {
      synergies = synergies.filter((s) => s.status === status);
    }
    if (category) {
      synergies = synergies.filter((s) => s.category === category);
    }

    // Calculate summary
    const summary = {
      total_target: synergies.reduce((sum, s) => sum + (s.total_target || 0), 0),
      total_actual: synergies.reduce((sum, s) => sum + (s.total_actual || 0), 0),
      cost_synergies: synergies.filter((s) => s.synergy_type === 'cost').length,
      revenue_synergies: synergies.filter((s) => s.synergy_type === 'revenue').length,
      on_track: synergies.filter((s) => s.status === 'on_track').length,
      at_risk: synergies.filter((s) => s.status === 'at_risk').length,
    };

    return NextResponse.json({
      success: true,
      data: synergies,
      summary,
    });
  } catch (error) {
    console.error('Error fetching synergies:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch synergies' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/integration-playbook/[id]/synergies
 * Update synergy actuals (batch update)
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
    const { synergy_id, year_1_actual, year_2_actual, year_3_actual, status, notes } = body;

    if (!synergy_id) {
      return NextResponse.json(
        { error: 'synergy_id is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: {
      updated_at: string;
      year_1_actual?: number;
      year_2_actual?: number;
      year_3_actual?: number;
      status?: SynergyStatus;
      notes?: string;
      total_actual?: number;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (year_1_actual !== undefined) updates.year_1_actual = year_1_actual;
    if (year_2_actual !== undefined) updates.year_2_actual = year_2_actual;
    if (year_3_actual !== undefined) updates.year_3_actual = year_3_actual;
    if (status) updates.status = status;
    if (notes) updates.notes = notes;

    // Calculate total_actual if any year actual is updated
    if (year_1_actual !== undefined || year_2_actual !== undefined || year_3_actual !== undefined) {
      const { data: currentSynergy } = await supabase
        .from('integration_synergies')
        .select('year_1_actual, year_2_actual, year_3_actual')
        .eq('id', synergy_id)
        .single();

      if (currentSynergy) {
        const y1 = year_1_actual !== undefined ? year_1_actual : (currentSynergy.year_1_actual || 0);
        const y2 = year_2_actual !== undefined ? year_2_actual : (currentSynergy.year_2_actual || 0);
        const y3 = year_3_actual !== undefined ? year_3_actual : (currentSynergy.year_3_actual || 0);
        updates.total_actual = y1 + y2 + y3;
      }
    }

    // Update synergy
    const { data, error } = await supabase
      .from('integration_synergies')
      .update(updates)
      .eq('id', synergy_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update synergy: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Synergy updated successfully',
    });
  } catch (error) {
    console.error('Error updating synergy:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update synergy' },
      { status: 500 }
    );
  }
}
