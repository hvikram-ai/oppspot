/**
 * GET /api/data-room/templates
 *
 * List available summary templates (system + org templates)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSummaryService } from '@/lib/data-room/summaries/summary-service';
import type { ListTemplatesResponse } from '@/lib/data-room/summaries/types';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's org_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    const orgId = profile?.org_id || null;

    // Get templates
    const summaryService = getSummaryService();
    const templates = await summaryService.getTemplates(orgId);

    // Get field counts for each template
    const templatesWithCounts = await Promise.all(
      templates.map(async (template) => {
        const { data: fields } = await supabase
          .from('summary_fields')
          .select('id')
          .eq('template_id', template.id);

        return {
          template,
          field_count: fields?.length || 0,
        };
      })
    );

    const response: ListTemplatesResponse = {
      templates: templatesWithCounts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] List templates failed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
