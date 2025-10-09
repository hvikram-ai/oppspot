// SmartSync™ API - Sync Contact/Company to CRM
// POST /api/integrations/crm/sync

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSmartSyncOrchestrator } from '@/lib/integrations/crm/smartsync-orchestrator';
import { z } from 'zod';
import type { Row } from '@/lib/supabase/helpers'

const SyncContactSchema = z.object({
  integration_id: z.string().uuid().optional(),
  entity_type: z.enum(['contact', 'company']),
  contact: z.object({
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    company: z.string().optional(),
    companyId: z.string().uuid().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
  }).optional(),
  company: z.object({
    companyId: z.string().uuid(),
    name: z.string(),
    domain: z.string().optional(),
    industry: z.string().optional(),
    employeeCount: z.number().optional(),
    revenue: z.number().optional(),
    description: z.string().optional(),
  }).optional(),
  options: z.object({
    skipEnrichment: z.boolean().optional(),
    priority: z.number().min(1).max(10).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single() as { data: Pick<Row<'profiles'>, 'organization_id'> | null; error: any };

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse and validate
    const body = await request.json();
    const validated = SyncContactSchema.parse(body);

    // Get integration
    let integrationId = validated.integration_id;

    if (!integrationId) {
      // Get first active integration for this org
      const { data: integration } = await supabase
        .from('crm_integrations')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .limit(1)
        .single() as { data: Pick<Row<'crm_integrations'>, 'id'> | null; error: any };

      if (!integration) {
        return NextResponse.json(
          { error: 'No active CRM integration found' },
          { status: 404 }
        );
      }

      integrationId = integration.id;
    }

    const orchestrator = getSmartSyncOrchestrator();

    // Sync based on entity type
    if (validated.entity_type === 'contact' && validated.contact) {
      const result = await orchestrator.syncContact(
        integrationId,
        validated.contact,
        validated.options || {}
      );

      return NextResponse.json({
        success: result.success,
        crmContactId: result.crmContactId,
        error: result.error,
        entityType: 'contact',
      });
    } else if (validated.entity_type === 'company' && validated.company) {
      const result = await orchestrator.syncCompany(
        integrationId,
        validated.company
      );

      return NextResponse.json({
        success: result.success,
        crmCompanyId: result.crmCompanyId,
        error: result.error,
        entityType: 'company',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid entity type or missing data' },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('SmartSync sync error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

// GET - Sync history/logs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single() as { data: Pick<Row<'profiles'>, 'organization_id'> | null; error: any };

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integration_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    // Query sync logs
    let query = supabase
      .from('crm_sync_logs')
      .select(`
        *,
        integration:crm_integrations!inner(organization_id, crm_type)
      `)
      .eq('integration.organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (integrationId) {
      query = query.eq('integration_id', integrationId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs || [],
    });
  } catch (error: unknown) {
    console.error('Get sync logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sync logs' },
      { status: 500 }
    );
  }
}
