import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import signalAggregator from '@/lib/signals/engines/signal-aggregation-engine';
import { ActionType } from '@/lib/signals/types/buying-signals';

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
    const { signal_id, action_type } = body;

    if (!signal_id || !action_type) {
      return NextResponse.json(
        { error: 'Missing required fields: signal_id and action_type' },
        { status: 400 }
      );
    }

    // Verify signal exists
    const { data: signal } = await supabase
      .from('buying_signals')
      .select('*')
      .eq('id', signal_id)
      .single();

    if (!signal) {
      return NextResponse.json(
        { error: 'Signal not found' },
        { status: 404 }
      );
    }

    // Create action
    const action = await signalAggregator.createSignalAction(
      signal_id,
      action_type as ActionType,
      user.id
    );

    if (!action) {
      return NextResponse.json(
        { error: 'Failed to create action' },
        { status: 500 }
      );
    }

    // Execute action based on type
    const result = await executeAction(action_type, signal, user.id);

    // Update action with execution details
    if (result.success) {
      await supabase
        .from('signal_actions')
        .update({
          action_status: 'completed',
          executed_at: new Date().toISOString(),
          response_data: result.data
        })
        .eq('id', action.id);
    } else {
      await supabase
        .from('signal_actions')
        .update({
          action_status: 'failed',
          executed_at: new Date().toISOString(),
          response_data: { error: result.error }
        })
        .eq('id', action.id);
    }

    return NextResponse.json({
      success: true,
      data: action
    });

  } catch (error) {
    console.error('Error creating signal action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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
    const signalId = searchParams.get('signal_id');
    const companyId = searchParams.get('company_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('signal_actions')
      .select(`
        *,
        buying_signals(
          signal_type,
          signal_strength,
          company_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (signalId) {
      query = query.eq('signal_id', signalId);
    }

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    if (status) {
      query = query.eq('action_status', status);
    }

    const { data: actions, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: actions
    });

  } catch (error) {
    console.error('Error fetching actions:', error);
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
    const { action_id, status, outcome, response_data } = body;

    if (!action_id) {
      return NextResponse.json(
        { error: 'Missing action_id' },
        { status: 400 }
      );
    }

    const updates: {
      updated_at: string;
      action_status?: string;
      outcome?: string;
      outcome_notes?: string;
      completed_at?: string;
      response_data?: unknown;
      response_received?: boolean;
    } = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      updates.action_status = status;
    }

    if (outcome) {
      updates.outcome = outcome;
    }

    if (response_data) {
      updates.response_data = response_data;
      updates.response_received = true;
    }

    const { data: action, error } = await supabase
      .from('signal_actions')
      .update(updates)
      .eq('id', action_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: action
    });

  } catch (error) {
    console.error('Error updating action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to execute different action types
async function executeAction(actionType: string, signal: Record<string, unknown>, userId: string) {
  const supabase = await createClient();

  switch (actionType) {
    case 'task_created':
      // Create a task in the task management system
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: `Follow up on ${signal.signal_type} signal`,
          description: `Company has a ${signal.signal_strength} ${signal.signal_type} signal`,
          assigned_to: userId,
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
          priority: signal.signal_strength === 'very_strong' ? 'high' : 'medium',
          related_company_id: signal.company_id,
          related_signal_id: signal.id
        })
        .select()
        .single();

      return taskError ?
        { success: false, error: taskError.message } :
        { success: true, data: task };

    case 'alert_sent':
      // Create an in-app notification
      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'signal_alert',
          title: `New ${signal.signal_type} signal detected`,
          message: `A ${signal.signal_strength} buying signal has been detected`,
          metadata: {
            signal_id: signal.id,
            company_id: signal.company_id,
            signal_type: signal.signal_type
          }
        })
        .select()
        .single();

      return notifError ?
        { success: false, error: notifError.message } :
        { success: true, data: notification };

    case 'opportunity_created':
      // Create an opportunity in the CRM
      const { data: opportunity, error: oppError } = await supabase
        .from('opportunities')
        .insert({
          company_id: signal.company_id,
          name: `Opportunity from ${signal.signal_type}`,
          stage: 'prospecting',
          probability: signal.buying_probability || 50,
          created_by: userId,
          source: `Signal: ${signal.signal_type}`,
          signal_id: signal.id
        })
        .select()
        .single();

      return oppError ?
        { success: false, error: oppError.message } :
        { success: true, data: opportunity };

    case 'campaign_enrolled':
      // Enroll in a nurture campaign
      const { data: enrollment, error: enrollError } = await supabase
        .from('campaign_enrollments')
        .insert({
          company_id: signal.company_id,
          campaign_type: 'signal_nurture',
          enrolled_by: userId,
          trigger_signal: signal.id,
          status: 'active'
        })
        .select()
        .single();

      return enrollError ?
        { success: false, error: enrollError.message } :
        { success: true, data: enrollment };

    default:
      // For other action types, just mark as executed
      return { success: true, data: { executed: true } };
  }
}