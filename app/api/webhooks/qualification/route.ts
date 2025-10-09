import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import type { Row } from '@/lib/supabase/helpers'

// Webhook event types (enum not exported due to Next.js route constraints)
enum QualificationWebhookEvent {
  LEAD_QUALIFIED = 'lead.qualified',
  LEAD_DISQUALIFIED = 'lead.disqualified',
  LEAD_ASSIGNED = 'lead.assigned',
  LEAD_REASSIGNED = 'lead.reassigned',
  SCORE_UPDATED = 'score.updated',
  ALERT_TRIGGERED = 'alert.triggered',
  CHECKLIST_COMPLETED = 'checklist.completed',
  LEAD_RECYCLED = 'lead.recycled',
  SLA_BREACH = 'sla.breach'
}

// Webhook payload interface
interface WebhookPayload {
  event: QualificationWebhookEvent
  timestamp: string
  data: Record<string, unknown>
  metadata?: {
    organization_id?: string
    user_id?: string
    source?: string
  }
}

// Store webhook configurations (in production, this would be in database)
const webhookConfigs = new Map<string, {
  url: string
  secret: string
  events: QualificationWebhookEvent[]
  active: boolean
}>()

/**
 * POST /api/webhooks/qualification
 * Receive webhook events from external systems
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-webhook-signature')
    const webhookId = request.headers.get('x-webhook-id')

    if (!signature || !webhookId) {
      return NextResponse.json(
        { error: 'Missing webhook signature or ID' },
        { status: 401 }
      )
    }

    const body = await request.text()
    const payload = JSON.parse(body) as WebhookPayload

    // Verify signature
    const config = webhookConfigs.get(webhookId)
    if (!config || !config.active) {
      return NextResponse.json(
        { error: 'Invalid webhook ID or inactive webhook' },
        { status: 401 }
      )
    }

    const expectedSignature = crypto
      .createHmac('sha256', config.secret)
      .update(body)
      .digest('hex')

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Process webhook event
    const result = await processWebhookEvent(payload)

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      event: payload.event,
      result
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/webhooks/qualification
 * Get webhook configuration and status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get webhook configurations from database
    const { data: webhooks, error } = await supabase
      .from('webhook_configurations')
      .select('*')
      .eq('type', 'qualification')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      webhooks: webhooks || [],
      availableEvents: Object.values(QualificationWebhookEvent),
      statistics: {
        total: webhooks?.length || 0,
        active: webhooks?.filter(w => w.is_active).length || 0,
        inactive: webhooks?.filter(w => !w.is_active).length || 0
      }
    })
  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/webhooks/qualification
 * Register or update a webhook endpoint
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, events, secret, name, description } = body

    if (!url || !events || !secret) {
      return NextResponse.json(
        { error: 'Missing required fields: url, events, secret' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Generate webhook ID
    const webhookId = crypto.randomBytes(16).toString('hex')

    // Store webhook configuration
    const { data, error } = await supabase
      .from('webhook_configurations')
      // @ts-ignore - Supabase type inference issue
      .insert({
        id: webhookId,
        name: name || 'Qualification Webhook',
        description: description || '',
        type: 'qualification',
        url,
        secret,
        events,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    // Also store in memory for quick access
    webhookConfigs.set(webhookId, {
      url,
      secret,
      events,
      active: true
    })

    // Test webhook with a ping event
    const testResult = await sendWebhook(url, secret, {
      event: 'webhook.test' as QualificationWebhookEvent,
      timestamp: new Date().toISOString(),
      data: {
        message: 'Webhook successfully configured',
        webhook_id: webhookId
      }
    })

    return NextResponse.json({
      success: true,
      webhook_id: webhookId,
      url,
      events,
      test_result: testResult,
      message: 'Webhook registered successfully'
    })
  } catch (error) {
    console.error('Error registering webhook:', error)
    return NextResponse.json(
      { error: 'Failed to register webhook' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/webhooks/qualification
 * Delete a webhook endpoint
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Missing webhook ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('webhook_configurations')
      .delete()
      .eq('id', webhookId)

    if (error) {
      throw error
    }

    // Remove from memory
    webhookConfigs.delete(webhookId)

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting webhook:', error)
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    )
  }
}

/**
 * Process incoming webhook event
 */
async function processWebhookEvent(payload: WebhookPayload): Promise<unknown> {
  const supabase = await createClient()

  switch (payload.event) {
    case QualificationWebhookEvent.LEAD_QUALIFIED:
      // Update lead status
      await supabase
        .from('lead_scores')
        // @ts-ignore - Type inference issue
        .update({
          status: 'qualified',
          qualified_at: new Date().toISOString(),
          metadata: { ...payload.data }
        })
        .eq('id', payload.data.lead_id)
      break

    case QualificationWebhookEvent.LEAD_DISQUALIFIED:
      // Update lead status and trigger recycling
      await supabase
        .from('lead_scores')
        .update({
          status: 'disqualified',
          disqualified_at: new Date().toISOString(),
          disqualification_reason: payload.data.reason
        })
        .eq('id', payload.data.lead_id)
      break

    case QualificationWebhookEvent.LEAD_ASSIGNED:
      // Create assignment record
      await supabase
        // @ts-ignore - Supabase type inference issue
        .from('lead_assignments')
        .insert({
          lead_id: payload.data.lead_id,
          assigned_to: payload.data.assigned_to,
          assigned_by: payload.data.assigned_by,
          priority: payload.data.priority || 'medium',
          sla_deadline: payload.data.sla_deadline,
          status: 'assigned',
          created_at: new Date().toISOString()
        })
      break

    case QualificationWebhookEvent.SCORE_UPDATED:
      // Update qualification scores
      if (payload.data.framework === 'BANT') {
        await supabase
          .from('bant_qualifications')
          .update({
            overall_score: payload.data.score,
            updated_at: new Date().toISOString()
          })
          .eq('lead_id', payload.data.lead_id)
      } else if (payload.data.framework === 'MEDDIC') {
        await supabase
          .from('meddic_qualifications')
          .update({
            overall_score: payload.data.score,
            updated_at: new Date().toISOString()
          })
          .eq('lead_id', payload.data.lead_id)
      }
      break

    case QualificationWebhookEvent.ALERT_TRIGGERED:
      // Record alert in history
      // @ts-ignore - Supabase type inference issue
      await supabase
        .from('alert_history')
        .insert({
          alert_config_id: payload.data.alert_id,
          lead_id: payload.data.lead_id,
          trigger_type: payload.data.trigger_type,
          trigger_value: payload.data.trigger_value,
          status: 'triggered',
          created_at: new Date().toISOString()
        })
      break

    case QualificationWebhookEvent.CHECKLIST_COMPLETED:
      // Update checklist status
      await supabase
        .from('qualification_checklists')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completion_percentage: 100
        })
        .eq('id', payload.data.checklist_id)
      break

    case QualificationWebhookEvent.LEAD_RECYCLED:
      // @ts-ignore - Supabase type inference issue
      // Record recycling history
      await supabase
        .from('lead_recycling_history')
        .insert({
          lead_id: payload.data.lead_id,
          rule_id: payload.data.rule_id,
          previous_status: payload.data.previous_status,
          new_status: payload.data.new_status,
          recycling_reason: payload.data.reason,
          created_at: new Date().toISOString()
        })
      break

    case QualificationWebhookEvent.SLA_BREACH:
      // Record SLA breach and escalate
      await supabase
        .from('lead_assignments')
        .update({
          sla_breached: true,
          breached_at: new Date().toISOString(),
          status: 'escalated'
        })
        .eq('id', payload.data.assignment_id)
      break

    default:
      console.log('Unknown webhook event:', payload.event)
  }
// @ts-ignore - Supabase type inference issue

  // Log webhook event
  await supabase
    .from('webhook_logs')
    .insert({
      event: payload.event,
      payload: payload.data,
      metadata: payload.metadata,
      processed_at: new Date().toISOString()
    })

  return { processed: true, event: payload.event }
}

/**
 * Send webhook to external endpoint
 */
async function sendWebhook(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const body = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
        'x-webhook-timestamp': payload.timestamp,
        'x-webhook-event': payload.event
      },
      body
    })

    return {
      success: response.ok,
      status: response.status
    }
  } catch (error) {
    console.error('Error sending webhook:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send webhook'
    }
  }
}

/**
 * Trigger webhook for qualification events
 * NOTE: This should be moved to a separate utility file
 * For now, keeping it here but not exported
 */
async function _triggerQualificationWebhook(
  event: QualificationWebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient()

    // Get active webhooks for this event
    const { data: webhooks } = await supabase
      .from('webhook_configurations')
      .select('*')
      .eq('type', 'qualification')
      .eq('is_active', true)
      .contains('events', [event])

    if (!webhooks || webhooks.length === 0) {
      return
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data
    }

    // Send to all registered webhooks
    for (const webhook of webhooks) {
      await sendWebhook(webhook.url, webhook.secret, payload)
    }
  } catch (error) {
    console.error('Error triggering webhooks:', error)
  }
}