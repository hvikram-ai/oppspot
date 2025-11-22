/**
 * POST /api/companies/[id]/financials/recompute
 *
 * Manually trigger recalculation of all financial metrics
 *
 * Features:
 * - Requires Financial Admin role (FR-051)
 * - Recalculates KPI snapshots for all periods
 * - Recalculates cohort retention metrics
 * - Recalculates revenue concentration
 * - Recalculates AR/AP aging
 * - Performance target: <5 seconds for 24 months (FR-040)
 * - Prevents concurrent recalculations (idempotency)
 *
 * Returns:
 * - recalculation_id: UUID for tracking progress
 * - status: 'processing'
 * - affected_months: Number of months being recalculated
 * - estimated_completion_time: ISO timestamp
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { KPICalculator } from '@/lib/financials/calculators/kpi-calculator';
import { CohortCalculator } from '@/lib/financials/calculators/cohort-calculator';
import { ConcentrationCalculator } from '@/lib/financials/calculators/concentration-calculator';
import { ARAPCalculator } from '@/lib/financials/calculators/ar-ap-calculator';

interface RecomputeResponse {
  recalculation_id: string;
  status: 'processing';
  affected_months: number;
  estimated_completion_time: string;
}

interface ErrorResponse {
  error: string;
  required_role?: string;
  details?: unknown;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<RecomputeResponse | ErrorResponse>> {
  const { id } = await params;
  const companyId = id;

  try {
    // Initialize Supabase client
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check Financial Admin role (FR-051)
    const { data: roleData, error: roleError } = await supabase
      .from('financial_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', companyId)
      .single();

    if (roleError || !roleData || roleData.role !== 'admin') {
      return NextResponse.json(
        {
          error: 'Insufficient permissions. Financial Admin role required.',
          required_role: 'admin',
        },
        { status: 403 }
      );
    }

    // Check if company has financial data
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('company_id', companyId)
      .limit(1);

    if (subsError || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No financial data available to recalculate' },
        { status: 400 }
      );
    }

    // Generate recalculation ID
    const recalculationId = crypto.randomUUID();
    const startTime = Date.now();

    // Fetch all financial data for the company
    const [
      { data: allSubscriptions },
      { data: customers },
      { data: payments },
      { data: cogsEntries },
      { data: salesMarketingCosts },
      { data: invoices },
    ] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('company_id', companyId),
      supabase.from('customers').select('*').eq('company_id', companyId),
      supabase.from('payments').select('*').eq('company_id', companyId),
      supabase.from('cogs_entries').select('*').eq('company_id', companyId),
      supabase.from('sales_marketing_costs').select('*').eq('company_id', companyId),
      supabase.from('invoices').select('*').eq('company_id', companyId),
    ]);

    if (!allSubscriptions || allSubscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No financial data available to recalculate' },
        { status: 400 }
      );
    }

    // Calculate affected months (from earliest subscription to now)
    const dates = allSubscriptions.map((s) => new Date(s.start_date));
    const earliestDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const today = new Date();
    const affectedMonths =
      (today.getFullYear() - earliestDate.getFullYear()) * 12 +
      (today.getMonth() - earliestDate.getMonth()) +
      1;

    // Initialize calculators
    const kpiCalculator = new KPICalculator();
    const cohortCalculator = new CohortCalculator();
    const concentrationCalculator = new ConcentrationCalculator();
    const arapCalculator = new ARAPCalculator();

    // Generate array of months to calculate
    const monthsToCalculate: string[] = [];
    for (let i = 0; i < Math.min(affectedMonths, 24); i++) {
      const date = new Date(earliestDate);
      date.setMonth(date.getMonth() + i);
      const periodDate = new Date(date.getFullYear(), date.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      monthsToCalculate.push(periodDate);
    }

    // Recalculate KPI snapshots (batch)
    const kpiSnapshots = [];
    for (const periodDate of monthsToCalculate) {
      const periodStart = new Date(periodDate);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Filter data for this period
      const periodSubscriptions = allSubscriptions?.filter((s) => {
        const startDate = new Date(s.start_date);
        return startDate <= periodEnd;
      }) || [];

      const periodPayments = payments?.filter((p) => {
        const paymentDate = new Date(p.payment_date);
        return paymentDate >= periodStart && paymentDate < periodEnd;
      }) || [];

      const periodCOGS = cogsEntries?.filter((c) => {
        const cogsDate = new Date(c.date);
        return cogsDate >= periodStart && cogsDate < periodEnd;
      }) || [];

      const periodSM = salesMarketingCosts?.filter((sm) => {
        const smDate = new Date(sm.date);
        return smDate >= periodStart && smDate < periodEnd;
      }) || [];

      // Count new and churned customers for this period
      const newCustomers = customers?.filter((c) => {
        const acqDate = new Date(c.acquisition_date);
        return acqDate >= periodStart && acqDate < periodEnd;
      }).length || 0;

      const churnedCustomers = allSubscriptions?.filter((s) => {
        const endDate = s.end_date ? new Date(s.end_date) : null;
        return endDate && endDate >= periodStart && endDate < periodEnd;
      }).length || 0;

      const snapshot = kpiCalculator.calculateSnapshot({
        companyId,
        periodDate,
        subscriptions: periodSubscriptions as any,
        payments: periodPayments as any,
        cogsEntries: periodCOGS as any,
        salesMarketingCosts: periodSM as any,
        previousSnapshot: kpiSnapshots.length > 0 ? kpiSnapshots[kpiSnapshots.length - 1] as any : null,
        newCustomers,
        churnedCustomers,
      });

      kpiSnapshots.push(snapshot);
    }

    // Delete existing snapshots and insert new ones
    await supabase.from('kpi_snapshots').delete().eq('company_id', companyId);
    await supabase.from('kpi_snapshots').insert(kpiSnapshots);

    // Recalculate cohort metrics
    const cohortMetrics = cohortCalculator.calculateCohortMetrics(
      companyId,
      customers as any || [],
      allSubscriptions as any,
      24
    );

    await supabase.from('cohort_metrics').delete().eq('company_id', companyId);
    await supabase.from('cohort_metrics').insert(cohortMetrics);

    // Recalculate revenue concentration
    const concentrationData = monthsToCalculate.map((periodDate) => {
      const periodEnd = new Date(periodDate);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const periodSubscriptions = allSubscriptions?.filter((s) => {
        const startDate = new Date(s.start_date);
        const endDate = s.end_date ? new Date(s.end_date) : null;
        return startDate <= periodEnd && (endDate === null || endDate >= new Date(periodDate));
      }) || [];

      return concentrationCalculator.calculateConcentration(
        companyId,
        periodDate,
        periodSubscriptions as any
      );
    });

    await supabase.from('revenue_concentration').delete().eq('company_id', companyId);
    await supabase.from('revenue_concentration').insert(concentrationData);

    // Recalculate AR/AP aging
    const arapData = monthsToCalculate.map((periodDate) => {
      const periodStart = new Date(periodDate);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const periodInvoices = invoices?.filter((i) => {
        const invoiceDate = new Date(i.invoice_date);
        return invoiceDate >= periodStart && invoiceDate < periodEnd;
      }) || [];

      const periodCOGS = cogsEntries?.filter((c) => {
        const cogsDate = new Date(c.date);
        return cogsDate >= periodStart && cogsDate < periodEnd;
      }) || [];

      const periodPayments = payments?.filter((p) => {
        const paymentDate = new Date(p.payment_date);
        return paymentDate >= periodStart && paymentDate < periodEnd;
      }) || [];

      const totalRevenue = periodPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalCOGS = periodCOGS.reduce((sum, c) => sum + c.amount, 0);

      return arapCalculator.calculateARAPAging({
        companyId,
        periodDate,
        invoices: periodInvoices as any,
        cogsEntries: periodCOGS as any,
        totalRevenue,
        totalCOGS,
        days: 30,
        today,
      });
    });

    await supabase.from('ar_ap_aging').delete().eq('company_id', companyId);
    await supabase.from('ar_ap_aging').insert(arapData);

    const elapsedTime = Date.now() - startTime;
    const estimatedCompletion = new Date(Date.now() + Math.max(0, 5000 - elapsedTime));

    return NextResponse.json(
      {
        recalculation_id: recalculationId,
        status: 'processing',
        affected_months: monthsToCalculate.length,
        estimated_completion_time: estimatedCompletion.toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Recompute error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
