/**
 * Day 1 Checklist API Routes
 * GET - Get Day 1 checklist
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlaybookRepository } from '@/lib/data-room/repository/playbook-repository';

/**
 * GET /api/integration-playbook/[id]/day1-checklist
 * Get Day 1 checklist items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const playbookId = params.id;
    const { searchParams } = new URL(request.url);

    // Parse filters
    const category = searchParams.get('category');
    const isCritical = searchParams.get('is_critical');
    const status = searchParams.get('status');

    // Get checklist items
    const repository = new PlaybookRepository(supabase);
    let items = await repository.getDay1Checklist(playbookId);

    // Apply filters
    if (category) {
      items = items.filter((item) => item.category === category);
    }
    if (isCritical !== null) {
      items = items.filter((item) => item.is_critical === (isCritical === 'true'));
    }
    if (status) {
      items = items.filter((item) => item.status === status);
    }

    // Calculate summary
    const summary = {
      total: items.length,
      critical: items.filter((item) => item.is_critical).length,
      pending: items.filter((item) => item.status === 'pending').length,
      in_progress: items.filter((item) => item.status === 'in_progress').length,
      completed: items.filter((item) => item.status === 'completed').length,
      completion_percentage: items.length > 0
        ? Math.round((items.filter((item) => item.status === 'completed').length / items.length) * 100)
        : 0,
    };

    return NextResponse.json({
      success: true,
      data: items,
      summary,
    });
  } catch (error) {
    console.error('Error fetching Day 1 checklist:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Day 1 checklist' },
      { status: 500 }
    );
  }
}
