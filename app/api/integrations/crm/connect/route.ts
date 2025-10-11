// SmartSync™ API - Connect CRM
// POST /api/integrations/crm/connect

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { HubSpotConnector } from '@/lib/integrations/crm/hubspot-connector';
import { z } from 'zod';
import { getErrorMessage } from '@/lib/utils/error-handler';
import type { Row } from '@/lib/supabase/helpers'

const ConnectSchema = z.object({
  crm_type: z.enum(['hubspot', 'salesforce', 'pipedrive']),
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  instance_url: z.string().optional(), // For Salesforce
  config: z.record(z.any()).optional(),
  sync_direction: z.enum(['to_crm', 'from_crm', 'bidirectional']).default('bidirectional'),
  sync_frequency: z.enum(['realtime', 'hourly', 'daily', 'manual']).default('realtime'),
  auto_enrich: z.boolean().default(true),
  auto_score: z.boolean().default(true),
  auto_assign: z.boolean().default(true),
  auto_create_tasks: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user's organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only admins can connect CRMs
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only admins can connect CRM integrations' },
        { status: 403 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validated = ConnectSchema.parse(body);

    // Validate credentials with CRM
    let connector;
    switch (validated.crm_type) {
      case 'hubspot':
        connector = new HubSpotConnector();
        break;
      // case 'salesforce':
      //   connector = new SalesforceConnector();
      //   break;
      default:
        return NextResponse.json(
          { error: `CRM type not yet supported: ${validated.crm_type}` },
          { status: 400 }
        );
    }

    await connector.connect({
      type: validated.crm_type,
      accessToken: validated.access_token,
      refreshToken: validated.refresh_token,
      instanceUrl: validated.instance_url,
      clientId: process.env.HUBSPOT_CLIENT_ID,
      clientSecret: process.env.HUBSPOT_CLIENT_SECRET,
    });

    const isValid = await connector.validateCredentials();
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid CRM credentials' },
        { status: 400 }
      );
    }

    // Check if integration already exists
    const { data: existingIntegration, error: existingIntegrationError } = await supabase
      .from('crm_integrations')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('crm_type', validated.crm_type)
      .single();

    if (existingIntegration) {
      // Update existing integration
      const { data: integration, error } = await supabase
        .from('crm_integrations')
        // @ts-expect-error - Type inference issue
        .update({
          access_token: validated.access_token,
          refresh_token: validated.refresh_token,
          instance_url: validated.instance_url,
          config: validated.config || {},
          sync_direction: validated.sync_direction,
          sync_frequency: validated.sync_frequency,
          auto_enrich: validated.auto_enrich,
          auto_score: validated.auto_score,
          auto_assign: validated.auto_assign,
          auto_create_tasks: validated.auto_create_tasks,
          is_active: true,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingIntegration.id)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        integration,
        message: 'CRM integration updated successfully',
      });
    } else {
      // Create new integration
      const { data: integration, error } = await supabase
        .from('crm_integrations')
        // @ts-expect-error - Supabase type inference issue
        .insert({
          organization_id: profile.organization_id,
          crm_type: validated.crm_type,
          access_token: validated.access_token,
          refresh_token: validated.refresh_token,
          instance_url: validated.instance_url,
          config: validated.config || {},
          sync_direction: validated.sync_direction,
          sync_frequency: validated.sync_frequency,
          auto_enrich: validated.auto_enrich,
          auto_score: validated.auto_score,
          auto_assign: validated.auto_assign,
          auto_create_tasks: validated.auto_create_tasks,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        integration,
        message: 'CRM integration connected successfully',
      });
    }
  } catch (error: unknown) {
    console.error('SmartSync connect error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}

// GET - List integrations
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { data: integrations, error } = await supabase
      .from('crm_integrations')
      .select('id, crm_type, sync_direction, sync_frequency, auto_enrich, auto_score, auto_assign, auto_create_tasks, is_active, last_sync_at, sync_count, created_at')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      integrations: integrations || [],
    });
  } catch (error: unknown) {
    console.error('List integrations error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
