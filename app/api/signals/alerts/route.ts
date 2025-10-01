import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SignalAlertConfig } from '@/lib/signals/types/buying-signals';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's alert configurations
    const { data: configs, error } = await supabase
      .from('signal_alert_configs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Get recent alerts
    const { data: alerts } = await supabase
      .from('threshold_alerts')
      .select(`
        *,
        signal_alert_configs(name)
      `)
      .eq('user_id', user.id)
      .order('triggered_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      success: true,
      data: {
        configurations: configs,
        recent_alerts: alerts
      }
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const alertConfig: Partial<SignalAlertConfig> = {
      user_id: user.id,
      name: body.name,
      description: body.description,
      is_active: body.is_active ?? true,
      signal_types: body.signal_types,
      signal_categories: body.signal_categories,
      minimum_strength: body.minimum_strength,
      minimum_confidence: body.minimum_confidence,
      minimum_buying_probability: body.minimum_buying_probability,
      company_filters: body.company_filters,
      industry_filters: body.industry_filters,
      size_filters: body.size_filters,
      location_filters: body.location_filters,
      alert_channels: body.alert_channels || ['in_app'],
      email_enabled: body.email_enabled || false,
      slack_enabled: body.slack_enabled || false,
      webhook_url: body.webhook_url,
      real_time: body.real_time || false,
      batch_frequency: body.batch_frequency || 'daily',
      quiet_hours: body.quiet_hours
    };

    if (!alertConfig.name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const { data: config, error } = await supabase
      .from('signal_alert_configs')
      .insert(alertConfig)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Error creating alert config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { config_id, ...updates } = body;

    if (!config_id) {
      return NextResponse.json(
        { error: 'Missing config_id' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('signal_alert_configs')
      .select('user_id')
      .eq('id', config_id)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Alert configuration not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update configuration
    const { data: config, error } = await supabase
      .from('signal_alert_configs')
      .update(updates)
      .eq('id', config_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Error updating alert config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('config_id');

    if (!configId) {
      return NextResponse.json(
        { error: 'Missing config_id parameter' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('signal_alert_configs')
      .select('user_id')
      .eq('id', configId)
      .single();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Alert configuration not found or unauthorized' },
        { status: 404 }
      );
    }

    // Delete configuration
    const { error } = await supabase
      .from('signal_alert_configs')
      .delete()
      .eq('id', configId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Alert configuration deleted'
    });

  } catch (error) {
    console.error('Error deleting alert config:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}