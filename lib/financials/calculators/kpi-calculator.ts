/**
 * KPI Calculator
 *
 * Calculates key SaaS financial metrics:
 * - ARR (Annual Recurring Revenue)
 * - MRR (Monthly Recurring Revenue)
 * - NRR (Net Revenue Retention)
 * - GRR (Gross Revenue Retention)
 * - CAC (Customer Acquisition Cost)
 * - LTV (Lifetime Value)
 * - ARPU (Average Revenue Per User)
 * - Gross Margin
 *
 * All calculations follow SaaS industry standard formulas.
 */

import type {
  Subscription,
  Payment,
  COGSEntry,
  SalesMarketingCost,
  KPISnapshot,
} from '@/lib/financials/types';

/**
 * Input data for calculating a complete KPI snapshot
 */
export interface KPISnapshotInput {
  companyId: string;
  periodDate: string; // YYYY-MM-DD (first day of month)
  subscriptions: Subscription[];
  payments: Payment[];
  cogsEntries: COGSEntry[];
  salesMarketingCosts: SalesMarketingCost[];
  previousSnapshot: KPISnapshot | null; // For calculating NRR, trends
  newCustomers: number;
  churnedCustomers: number;
}

/**
 * KPI Calculator class
 */
export class KPICalculator {
  /**
   * Calculate ARR (Annual Recurring Revenue)
   * Formula: ARR = SUM(active MRR) * 12
   */
  calculateARR(subscriptions: Subscription[]): number {
    const activeSubs = subscriptions.filter((sub) => sub.is_active);
    const totalMRR = activeSubs.reduce((sum, sub) => sum + sub.mrr, 0);
    return totalMRR * 12;
  }

  /**
   * Calculate MRR (Monthly Recurring Revenue)
   * Formula: MRR = SUM(active MRR)
   */
  calculateMRR(subscriptions: Subscription[]): number {
    const activeSubs = subscriptions.filter((sub) => sub.is_active);
    return activeSubs.reduce((sum, sub) => sum + sub.mrr, 0);
  }

  /**
   * Calculate NRR (Net Revenue Retention)
   * Formula: NRR = (Start MRR + Expansion - Contraction - Churn) / Start MRR * 100
   *
   * NRR > 100% = Net expansion (good)
   * NRR = 100% = Perfect retention
   * NRR < 100% = Net contraction (bad)
   */
  calculateNRR(
    startMRR: number,
    expansionMRR: number,
    contractionMRR: number,
    churnMRR: number
  ): number {
    if (startMRR === 0) return 0;

    const endMRR = startMRR + expansionMRR - contractionMRR - churnMRR;
    return Math.round((endMRR / startMRR) * 100);
  }

  /**
   * Calculate GRR (Gross Revenue Retention)
   * Formula: GRR = (Start MRR - Contraction - Churn) / Start MRR * 100
   *
   * GRR excludes expansion (always ≤ 100%)
   * GRR = 100% = Perfect retention (no downgrades or churn)
   */
  calculateGRR(
    startMRR: number,
    contractionMRR: number,
    churnMRR: number
  ): number {
    if (startMRR === 0) return 0;

    const retainedMRR = startMRR - contractionMRR - churnMRR;
    const grr = (retainedMRR / startMRR) * 100;
    return Math.min(Math.round(grr), 100); // Cap at 100%
  }

  /**
   * Calculate Gross Margin
   * Formula: Gross Margin = (Revenue - COGS) / Revenue * 100
   */
  calculateGrossMargin(totalRevenue: number, cogsEntries: COGSEntry[]): number {
    if (totalRevenue === 0) return 0;

    const totalCOGS = cogsEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const grossProfit = totalRevenue - totalCOGS;
    return Math.round((grossProfit / totalRevenue) * 100 * 100) / 100; // 2 decimal places
  }

  /**
   * Calculate CAC (Customer Acquisition Cost)
   * Formula: CAC = Total Sales & Marketing Costs / New Customers
   */
  calculateCAC(
    salesMarketingCosts: SalesMarketingCost[],
    newCustomers: number
  ): number {
    if (newCustomers === 0) return 0;

    const totalCosts = salesMarketingCosts.reduce(
      (sum, cost) => sum + cost.amount,
      0
    );
    return Math.round(totalCosts / newCustomers);
  }

  /**
   * Calculate LTV (Lifetime Value)
   * Formula: LTV = ARPU * Gross Margin * (1 / Churn Rate)
   *
   * Churn Rate = 100 - GRR
   */
  calculateLTV(arpu: number, grr: number, grossMarginPct: number): number {
    const churnRate = (100 - grr) / 100;

    // Handle perfect retention (GRR = 100%, churn = 0)
    if (churnRate === 0) {
      return Number.MAX_SAFE_INTEGER; // Effectively infinite LTV
    }

    const grossMargin = grossMarginPct / 100;
    const ltv = arpu * grossMargin * (1 / churnRate);
    return Math.round(ltv);
  }

  /**
   * Calculate ARPU (Average Revenue Per User)
   * Formula: ARPU = MRR / Customer Count
   */
  calculateARPU(mrr: number, customerCount: number): number {
    if (customerCount === 0) return 0;
    return Math.round(mrr / customerCount);
  }

  /**
   * Calculate expansion, contraction, and churn MRR changes
   */
  private calculateMRRMovements(
    currentSubscriptions: Subscription[],
    previousSnapshot: KPISnapshot | null
  ): {
    expansionMRR: number;
    contractionMRR: number;
    churnMRR: number;
  } {
    if (!previousSnapshot) {
      // First month - no previous data
      return {
        expansionMRR: 0,
        contractionMRR: 0,
        churnMRR: 0,
      };
    }

    // Group subscriptions by customer
    const currentMRRByCustomer = new Map<string, number>();
    const previousMRRByCustomer = new Map<string, number>();

    // TODO: In production, fetch previous period subscriptions from database
    // For now, we'll use a simplified approach based on current data
    currentSubscriptions.forEach((sub) => {
      if (sub.is_active) {
        const current = currentMRRByCustomer.get(sub.customer_id) || 0;
        currentMRRByCustomer.set(sub.customer_id, current + sub.mrr);
      } else {
        // Churned subscription - had MRR previously, now 0
        previousMRRByCustomer.set(sub.customer_id, sub.mrr);
      }
    });

    let expansionMRR = 0;
    let contractionMRR = 0;
    let churnMRR = 0;

    // Calculate movements (simplified - in production, compare with actual previous period data)
    currentMRRByCustomer.forEach((currentMRR, customerId) => {
      const previousMRR = previousMRRByCustomer.get(customerId) || currentMRR;

      if (currentMRR > previousMRR) {
        expansionMRR += currentMRR - previousMRR;
      } else if (currentMRR < previousMRR) {
        contractionMRR += previousMRR - currentMRR;
      }
    });

    // Churned customers
    previousMRRByCustomer.forEach((previousMRR, customerId) => {
      if (!currentMRRByCustomer.has(customerId)) {
        churnMRR += previousMRR;
      }
    });

    return {
      expansionMRR: Math.round(expansionMRR),
      contractionMRR: Math.round(contractionMRR),
      churnMRR: Math.round(churnMRR),
    };
  }

  /**
   * Calculate complete KPI snapshot for a period
   */
  calculateSnapshot(input: KPISnapshotInput): Omit<KPISnapshot, 'id' | 'created_at' | 'updated_at'> {
    const {
      companyId,
      periodDate,
      subscriptions,
      payments,
      cogsEntries,
      salesMarketingCosts,
      previousSnapshot,
      newCustomers,
      churnedCustomers,
    } = input;

    // Calculate base metrics
    const arr = this.calculateARR(subscriptions);
    const mrr = this.calculateMRR(subscriptions);
    const customerCount = new Set(
      subscriptions.filter((s) => s.is_active).map((s) => s.customer_id)
    ).size;

    // Calculate revenue from payments
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate MRR movements
    const { expansionMRR, contractionMRR, churnMRR } = this.calculateMRRMovements(
      subscriptions,
      previousSnapshot
    );

    // Calculate retention metrics
    const startMRR = previousSnapshot?.mrr || mrr;
    const nrr = this.calculateNRR(startMRR, expansionMRR, contractionMRR, churnMRR);
    const grr = this.calculateGRR(startMRR, contractionMRR, churnMRR);

    // Calculate profitability metrics
    const grossMarginPct = this.calculateGrossMargin(totalRevenue, cogsEntries);

    // Calculate customer economics
    const cac = this.calculateCAC(salesMarketingCosts, newCustomers);
    const arpu = this.calculateARPU(mrr, customerCount);
    const ltv = this.calculateLTV(arpu, grr, grossMarginPct);

    return {
      company_id: companyId,
      period_date: periodDate,
      arr,
      mrr,
      nrr,
      grr,
      customer_count: customerCount,
      churned_customers: churnedCustomers,
      new_customers: newCustomers,
      expansion_mrr: expansionMRR,
      contraction_mrr: contractionMRR,
      churn_mrr: churnMRR,
      gross_margin_pct: grossMarginPct,
      cac,
      ltv,
      arpu,
    };
  }

  /**
   * Calculate snapshots for multiple periods (batch)
   */
  calculateSnapshotsBatch(
    inputs: KPISnapshotInput[]
  ): Omit<KPISnapshot, 'id' | 'created_at' | 'updated_at'>[] {
    // Sort by period_date to ensure chronological order
    const sortedInputs = inputs.sort((a, b) =>
      a.periodDate.localeCompare(b.periodDate)
    );

    const snapshots: Omit<KPISnapshot, 'id' | 'created_at' | 'updated_at'>[] = [];

    sortedInputs.forEach((input, index) => {
      // Use previous snapshot from batch if available
      const previousSnapshot =
        index > 0 ? (snapshots[index - 1] as unknown as KPISnapshot) : input.previousSnapshot;

      const snapshot = this.calculateSnapshot({
        ...input,
        previousSnapshot,
      });

      snapshots.push(snapshot);
    });

    return snapshots;
  }

  /**
   * Calculate trend metrics (compare two periods)
   */
  calculateTrends(
    currentSnapshot: KPISnapshot,
    previousSnapshot: KPISnapshot
  ): {
    arr_change_pct: number;
    mrr_change_pct: number;
    nrr_change_pct: number;
    customer_count_change_pct: number;
  } {
    const arrChange =
      previousSnapshot.arr === 0
        ? 0
        : Math.round(
            ((currentSnapshot.arr - previousSnapshot.arr) / previousSnapshot.arr) * 100 * 100
          ) / 100;

    const mrrChange =
      previousSnapshot.mrr === 0
        ? 0
        : Math.round(
            ((currentSnapshot.mrr - previousSnapshot.mrr) / previousSnapshot.mrr) * 100 * 100
          ) / 100;

    const nrrChange =
      previousSnapshot.nrr === 0
        ? 0
        : Math.round(
            ((currentSnapshot.nrr - previousSnapshot.nrr) / previousSnapshot.nrr) * 100 * 100
          ) / 100;

    const customerChange =
      previousSnapshot.customer_count === 0
        ? 0
        : Math.round(
            ((currentSnapshot.customer_count - previousSnapshot.customer_count) /
              previousSnapshot.customer_count) *
              100 *
              100
          ) / 100;

    return {
      arr_change_pct: arrChange,
      mrr_change_pct: mrrChange,
      nrr_change_pct: nrrChange,
      customer_count_change_pct: customerChange,
    };
  }
}
