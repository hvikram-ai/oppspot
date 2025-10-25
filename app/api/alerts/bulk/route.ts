/**
 * Bulk Alert Actions API
 *
 * Perform actions on multiple alerts at once (acknowledge, resolve, delete).
 *
 * @route POST /api/alerts/bulk
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AlertService } from '@/lib/alerts'

export async function POST(request: NextRequest) {
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
    const { data: profile } = await (supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single())

    if (!profile || !['admin', 'super_admin'].includes((profile as any)?.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // 3. Parse request body
    const body = await request.json()
    const { action, alertIds, notes } = body

    if (!action || !alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Required: action, alertIds (array)' },
        { status: 400 }
      )
    }

    // Limit to 100 alerts per request to prevent timeout
    if (alertIds.length > 100) {
      return NextResponse.json(
        { error: 'Too many alerts. Maximum 100 per request' },
        { status: 400 }
      )
    }

    // 4. Perform bulk action
    const alertService = new AlertService()
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    }

    switch (action) {
      case 'acknowledge':
        for (const alertId of alertIds) {
          try {
            const success = await alertService.acknowledgeAlert(alertId, user.id, notes)
            if (success) {
              results.success++
            } else {
              results.failed++
              results.errors.push({ id: alertId, error: 'Acknowledge failed' })
            }
          } catch (error) {
            results.failed++
            results.errors.push({
              id: alertId,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
        break

      case 'resolve':
        if (!notes) {
          return NextResponse.json(
            { error: 'Resolution notes are required for bulk resolve' },
            { status: 400 }
          )
        }

        for (const alertId of alertIds) {
          try {
            const success = await alertService.resolveAlert(alertId, user.id, notes)
            if (success) {
              results.success++
            } else {
              results.failed++
              results.errors.push({ id: alertId, error: 'Resolve failed' })
            }
          } catch (error) {
            results.failed++
            results.errors.push({
              id: alertId,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
        break

      case 'delete':
        // Bulk delete (for false positives)
        for (const alertId of alertIds) {
          try {
            const { error } = await (supabase
              .from('system_alerts') as any)
              .update({ status: 'false_positive' })
              .eq('id', alertId)

            if (error) {
              results.failed++
              results.errors.push({ id: alertId, error: error.message })
            } else {
              results.success++
            }
          } catch (error) {
            results.failed++
            results.errors.push({
              id: alertId,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
        break

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Allowed: acknowledge, resolve, delete` },
          { status: 400 }
        )
    }

    // 5. Return results
    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      results: {
        total: alertIds.length,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Bulk Alerts API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
