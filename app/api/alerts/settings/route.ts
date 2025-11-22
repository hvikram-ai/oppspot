/**
 * Alert Settings API
 *
 * Get and update alert notification configurations.
 *
 * @route GET /api/alerts/settings - Get all settings
 * @route PUT /api/alerts/settings - Update settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes((profile as any)?.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // 3. Fetch all alert configurations
    const { data: configs, error } = await supabase
      .from('alert_configurations')
      .select('config_key, config_value')
      .in('config_key', ['email_settings', 'slack_settings', 'webhook_settings', 'sms_settings'])

    if (error) {
      throw new Error('Failed to fetch configurations')
    }

    // 4. Transform to object
    const settings: Record<string, unknown> = {}
    configs?.forEach((config) => {
      settings[config.config_key] = config.config_value
    })

    // 5. Return settings
    return NextResponse.json({
      settings,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Settings API] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes((profile as any)?.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // 3. Parse request body
    const body = await request.json()
    const { configKey, configValue } = body

    if (!configKey || !configValue) {
      return NextResponse.json(
        { error: 'Invalid request. Required: configKey, configValue' },
        { status: 400 }
      )
    }

    // Validate config key
    const validKeys = ['email_settings', 'slack_settings', 'webhook_settings', 'sms_settings']
    if (!validKeys.includes(configKey)) {
      return NextResponse.json({ error: `Invalid config key: ${configKey}` }, { status: 400 })
    }

    // 4. Update configuration
    const { error } = await supabase
      .from('alert_configurations')
      .update({
        config_value: configValue,
        updated_at: new Date().toISOString(),
      })
      .eq('config_key', configKey)

    if (error) {
      throw new Error(`Failed to update ${configKey}`)
    }

    // 5. Return success
    return NextResponse.json({
      success: true,
      message: `${configKey} updated successfully`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Settings API] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
