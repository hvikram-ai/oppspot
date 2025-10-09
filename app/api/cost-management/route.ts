import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import CostManagementService from '@/lib/opp-scan/cost-management'
import { getErrorMessage } from '@/lib/utils/error-handler'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'summary'
    const scanId = searchParams.get('scan_id')
    const periodStart = searchParams.get('period_start')
    const periodEnd = searchParams.get('period_end')

    const costManagementService = new CostManagementService()

    switch (action) {
      case 'summary':
        const summary = await costManagementService.getCostSummary({
          userId: user.id,
          scanId: scanId || undefined,
          periodStart: periodStart || undefined,
          periodEnd: periodEnd || undefined
        })

        return NextResponse.json({ summary })

      case 'budgets':
        const budgets = await costManagementService.getUserBudgets(user.id)
        return NextResponse.json({ budgets })

      case 'affordability':
        const dataSources = searchParams.get('data_sources')?.split(',') || ['companies_house']
        const estimatedRequests = parseInt(searchParams.get('estimated_requests') || '100')
        
        const affordabilityCheck = await costManagementService.checkScanAffordability({
          userId: user.id,
          scanId: scanId || undefined,
          dataSources,
          estimatedRequests
        })

        return NextResponse.json({ affordability: affordabilityCheck })

      case 'alerts':
        const alerts = await costManagementService.checkBudgetAlerts(user.id)
        return NextResponse.json({ alerts })

      case 'recommendations':
        const recommendations = await costManagementService.getCostOptimizationRecommendations(user.id)
        return NextResponse.json({ recommendations })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: summary, budgets, affordability, alerts, recommendations' },
          { status: 400 }
        )
    }
  } catch (error: unknown) {
    console.error('Cost management API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cost management data', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, ...data } = body

    const costManagementService = new CostManagementService()

    switch (action) {
      case 'create_budget':
        const budget = await costManagementService.createBudget({
          user_id: user.id,
          ...data
        })
        
        return NextResponse.json({ budget }, { status: 201 })

      case 'setup_alerts':
        if (!data.budget_id || !data.alerts) {
          return NextResponse.json(
            { error: 'Missing required fields: budget_id, alerts' },
            { status: 400 }
          )
        }

        await costManagementService.setupBudgetAlerts(data.budget_id, data.alerts)
        
        return NextResponse.json({ success: true })

      case 'record_transaction':
        const transaction = await costManagementService.recordTransaction({
          user_id: user.id,
          ...data
        })
        
        return NextResponse.json({ transaction }, { status: 201 })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: create_budget, setup_alerts, record_transaction' },
          { status: 400 }
        )
    }
  } catch (error: unknown) {
    console.error('Cost management API error:', error)
    return NextResponse.json(
      { error: 'Failed to process cost management request', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}