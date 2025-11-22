/**
 * Integration Risks API Routes
 * GET - List risks
 * PATCH - Update risk
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlaybookRepository } from '@/lib/data-room/repository/playbook-repository';
import type { RiskCategory, RiskImpact, RiskProbability, RiskStatus } from '@/lib/data-room/types';

/**
 * GET /api/integration-playbook/[id]/risks
 * List all risks with optional filters
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
    const category = searchParams.get('risk_category') as RiskCategory | undefined;
    const impact = searchParams.get('impact') as RiskImpact | undefined;
    const probability = searchParams.get('probability') as RiskProbability | undefined;
    const status = searchParams.get('status') as RiskStatus | undefined;

    // Get risks
    const repository = new PlaybookRepository(supabase);
    let risks = await repository.getRisks(playbookId);

    // Apply filters
    if (category) {
      risks = risks.filter((r) => r.risk_category === category);
    }
    if (impact) {
      risks = risks.filter((r) => r.impact === impact);
    }
    if (probability) {
      risks = risks.filter((r) => r.probability === probability);
    }
    if (status) {
      risks = risks.filter((r) => r.status === status);
    }

    // Calculate risk score for each risk (Impact × Probability)
    const impactScores = { low: 1, medium: 2, high: 3, critical: 4 };
    const probabilityScores = { low: 1, medium: 2, high: 3 };

    const risksWithScores = risks.map((risk) => ({
      ...risk,
      risk_score: impactScores[risk.impact] * probabilityScores[risk.probability],
    }));

    // Sort by risk score descending
    risksWithScores.sort((a, b) => b.risk_score - a.risk_score);

    // Calculate summary
    const summary = {
      total: risks.length,
      open: risks.filter((r) => r.status === 'open').length,
      mitigated: risks.filter((r) => r.status === 'mitigated').length,
      accepted: risks.filter((r) => r.status === 'accepted').length,
      critical_impact: risks.filter((r) => r.impact === 'critical').length,
      high_probability: risks.filter((r) => r.probability === 'high').length,
    };

    return NextResponse.json({
      success: true,
      data: risksWithScores,
      summary,
    });
  } catch (error) {
    console.error('Error fetching risks:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch risks' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/integration-playbook/[id]/risks
 * Update a risk
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
    const { risk_id, impact, probability, status, mitigation_plan, mitigation_owner, mitigation_date, notes } = body;

    if (!risk_id) {
      return NextResponse.json(
        { error: 'risk_id is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updates: {
      updated_at: string;
      impact?: RiskImpact;
      probability?: RiskProbability;
      status?: RiskStatus;
      mitigation_plan?: string;
      mitigation_owner?: string;
      mitigation_date?: string;
      notes?: string;
      risk_score?: number;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (impact) updates.impact = impact;
    if (probability) updates.probability = probability;
    if (status) updates.status = status;
    if (mitigation_plan) updates.mitigation_plan = mitigation_plan;
    if (mitigation_owner) updates.mitigation_owner = mitigation_owner;
    if (mitigation_date) updates.mitigation_date = mitigation_date;
    if (notes) updates.notes = notes;

    // Calculate risk score
    if (impact || probability) {
      const { data: currentRisk } = await supabase
        .from('integration_risks')
        .select('impact, probability')
        .eq('id', risk_id)
        .single();

      if (currentRisk) {
        const impactScores = { low: 1, medium: 2, high: 3, critical: 4 };
        const probabilityScores = { low: 1, medium: 2, high: 3 };

        const finalImpact = impact || currentRisk.impact;
        const finalProbability = probability || currentRisk.probability;

        updates.risk_score = impactScores[finalImpact] * probabilityScores[finalProbability];
      }
    }

    // Update risk
    const { data, error } = await supabase
      .from('integration_risks')
      .update(updates)
      .eq('id', risk_id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update risk: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Risk updated successfully',
    });
  } catch (error) {
    console.error('Error updating risk:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update risk' },
      { status: 500 }
    );
  }
}
