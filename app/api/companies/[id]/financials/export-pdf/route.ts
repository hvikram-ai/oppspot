/**
 * GET /api/companies/[id]/financials/export-pdf
 *
 * Generate and download financial analytics PDF report
 */

import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import { hasFinancialRole, logRoleCheckFailure } from '@/lib/financials/auth/role-helper'
import { FinancialReportPDF, generatePDFFilename, type PDFReportData } from '@/lib/financials/exports/pdf-generator'
import type { KPISnapshot, RevenueConcentration, ARAPAging } from '@/lib/financials/types'
import { FinancialRole } from '@/lib/financials/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse | Response> {
  const { id: companyId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const hasRole = await hasFinancialRole(user.id, companyId, [FinancialRole.EDITOR, FinancialRole.ADMIN])

  if (!hasRole) {
    await logRoleCheckFailure(user.id, companyId, 'export-pdf', [FinancialRole.EDITOR, FinancialRole.ADMIN])
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const { data: company } = await supabase.from('companies').select('*').eq('id', companyId).single()
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: currentSnapshot } = await supabase.from('kpi_snapshots').select('*').eq('company_id', companyId).order('period_date', { ascending: false }).limit(1).single() as { data: KPISnapshot | null }
  const { data: snapshots } = await supabase.from('kpi_snapshots').select('*').eq('company_id', companyId).order('period_date', { ascending: false }).limit(2) as { data: KPISnapshot[] | null }
  const { data: concentration } = await supabase.from('revenue_concentration').select('*').eq('company_id', companyId).order('period_date', { ascending: false }).limit(1).single() as { data: RevenueConcentration | null }
  const { data: aging } = await supabase.from('ar_ap_aging').select('*').eq('company_id', companyId).order('snapshot_date', { ascending: false }).limit(1).single() as { data: ARAPAging | null }
  const { data: anomalies } = await supabase.from('anomalies').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(5)

  const pdfData: PDFReportData = {
    company: { name: company.name, sector: company.sector, currency: company.reporting_currency || 'USD' },
    period: { start_date: currentSnapshot?.period_date || '', end_date: currentSnapshot?.period_date || '' },
    kpi_snapshot: currentSnapshot,
    previous_snapshot: snapshots && snapshots[1] || null,
    concentration,
    aging,
    anomalies: anomalies || [],
  }

  const pdfDoc = React.createElement(FinancialReportPDF, { data: pdfData })
  const pdfStream = await renderToStream(pdfDoc)
  const chunks: Uint8Array[] = []
  for await (const chunk of pdfStream as any) chunks.push(chunk)
  const buffer = Buffer.concat(chunks)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${generatePDFFilename(company.name)}"`,
    },
  })
}
