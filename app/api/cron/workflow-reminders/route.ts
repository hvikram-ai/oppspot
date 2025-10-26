/**
 * Workflow Reminders Cron Job Endpoint
 * This endpoint should be called periodically by a cron service (e.g., Vercel Cron, GitHub Actions)
 *
 * Recommended schedule: Every 15 minutes
 * Vercel Cron syntax: *//*15 * * * *
 */

import { NextRequest, NextResponse } from 'next/server'
import { reminderService } from '@/lib/data-room/automation'

// Verification token for cron job security
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret-change-in-production'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Cron] Starting workflow reminders check...')

    // Run reminder checks
    await reminderService.checkAndSendReminders()
    await reminderService.checkExpiredApprovals()

    console.log('[Cron] Workflow reminders check completed')

    return NextResponse.json({
      success: true,
      message: 'Reminders checked and sent',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Cron] Error in workflow reminders:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Allow POST as well for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
