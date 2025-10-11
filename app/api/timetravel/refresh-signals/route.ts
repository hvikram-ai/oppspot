import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/utils/error-handler'
import type { Row } from '@/lib/supabase/helpers'

// Refresh signal aggregates for a company or all companies
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { company_id, batch_size = 50 } = body

    if (company_id) {
      // Refresh single company
      // @ts-expect-error - Type inference issue
      const { error } = await supabase.rpc('refresh_signal_aggregates', {
        p_company_id: company_id
      })

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: 'Signal aggregates refreshed for company',
        company_id
      })
    } else {
      // Batch refresh for companies with signals
      const { data: companies, error: companiesError } = await supabase
        .from('buying_signals')
        .select('company_id')
        .gte('detected_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .limit(batch_size)

      if (companiesError) throw companiesError

      const unique_companies = [...new Set(companies?.map(c => c.company_id) || [])]

      let refreshed = 0
      let errors = 0

      for (const cid of unique_companies) {
        try {
          await supabase.rpc('refresh_signal_aggregates', { p_company_id: cid })
          refreshed++
        } catch (err) {
          console.error(`Failed to refresh ${cid}:`, err)
          errors++
        }
      }

      return NextResponse.json({
        success: true,
        message: `Refreshed ${refreshed} companies`,
        refreshed,
        errors,
        total: unique_companies.length
      })
    }

  } catch (error: unknown) {
    console.error('Refresh signals error:', error)
    return NextResponse.json({
      error: getErrorMessage(error) || 'Failed to refresh signals'
    }, { status: 500 })
  }
}
