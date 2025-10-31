/**
 * AR/AP Aging Calculator
 *
 * Calculates accounts receivable and payable aging metrics:
 * - AR aging buckets (current, 30, 60, 90+ days)
 * - AP aging buckets (current, 30, 60, 90+ days)
 * - DSO (Days Sales Outstanding) - How quickly customers pay
 * - DPO (Days Payables Outstanding) - How quickly company pays suppliers
 * - Anomaly detection for AR aging spikes (FR-021: >50% increase in 90+ bucket)
 *
 * AR/AP aging helps assess cash flow health and collection efficiency.
 */

import type {
  Invoice,
  COGSEntry,
  ARAPAging,
  Anomaly,
} from '@/lib/financials/types';
import { ANOMALY_THRESHOLDS } from '@/lib/financials/types';

/**
 * AR aging buckets
 */
export interface ARAging {
  ar_current: number; // 0-30 days
  ar_30_days: number; // 31-60 days
  ar_60_days: number; // 61-90 days
  ar_90_plus: number; // 90+ days
  ar_total: number;
}

/**
 * AP aging buckets
 */
export interface APAging {
  ap_current: number; // 0-30 days
  ap_30_days: number; // 31-60 days
  ap_60_days: number; // 61-90 days
  ap_90_plus: number; // 90+ days
  ap_total: number;
}

/**
 * Input for calculating complete AR/AP aging
 */
export interface ARAPAgingInput {
  companyId: string;
  periodDate: string;
  invoices: Invoice[];
  cogsEntries: COGSEntry[];
  totalRevenue: number; // For DSO calculation
  totalCOGS: number; // For DPO calculation
  days: number; // Period length (typically 30, 90, or 365)
  today: Date;
}

/**
 * AR/AP Aging Calculator class
 */
export class ARAPCalculator {
  /**
   * Calculate AR aging buckets from invoices
   *
   * Buckets invoices by age (days since invoice_date):
   * - Current: 0-30 days
   * - 30 days: 31-60 days
   * - 60 days: 61-90 days
   * - 90+ days: 90+ days
   */
  calculateARAging(invoices: Invoice[], today: Date): ARAging {
    // Only include unpaid/overdue invoices
    const unpaidInvoices = invoices.filter(
      (inv) => inv.status === 'unpaid' || inv.status === 'overdue'
    );

    const aging: ARAging = {
      ar_current: 0,
      ar_30_days: 0,
      ar_60_days: 0,
      ar_90_plus: 0,
      ar_total: 0,
    };

    unpaidInvoices.forEach((invoice) => {
      const invoiceDate = new Date(invoice.invoice_date);
      const daysOld = Math.floor(
        (today.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const amount = invoice.amount;

      // Allocate to appropriate bucket
      if (daysOld <= 30) {
        aging.ar_current += amount;
      } else if (daysOld <= 60) {
        aging.ar_30_days += amount;
      } else if (daysOld <= 90) {
        aging.ar_60_days += amount;
      } else {
        aging.ar_90_plus += amount;
      }

      aging.ar_total += amount;
    });

    // Round amounts
    aging.ar_current = Math.round(aging.ar_current);
    aging.ar_30_days = Math.round(aging.ar_30_days);
    aging.ar_60_days = Math.round(aging.ar_60_days);
    aging.ar_90_plus = Math.round(aging.ar_90_plus);
    aging.ar_total = Math.round(aging.ar_total);

    return aging;
  }

  /**
   * Calculate AP aging buckets from COGS entries
   *
   * Assumes COGS entries represent payables (amounts owed to suppliers)
   * Buckets by age (days since date)
   */
  calculateAPAging(cogsEntries: COGSEntry[], today: Date): APAging {
    const aging: APAging = {
      ap_current: 0,
      ap_30_days: 0,
      ap_60_days: 0,
      ap_90_plus: 0,
      ap_total: 0,
    };

    cogsEntries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const daysOld = Math.floor(
        (today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const amount = entry.amount;

      // Allocate to appropriate bucket
      if (daysOld <= 30) {
        aging.ap_current += amount;
      } else if (daysOld <= 60) {
        aging.ap_30_days += amount;
      } else if (daysOld <= 90) {
        aging.ap_60_days += amount;
      } else {
        aging.ap_90_plus += amount;
      }

      aging.ap_total += amount;
    });

    // Round amounts
    aging.ap_current = Math.round(aging.ap_current);
    aging.ap_30_days = Math.round(aging.ap_30_days);
    aging.ap_60_days = Math.round(aging.ap_60_days);
    aging.ap_90_plus = Math.round(aging.ap_90_plus);
    aging.ap_total = Math.round(aging.ap_total);

    return aging;
  }

  /**
   * Calculate DSO (Days Sales Outstanding)
   *
   * Formula: DSO = (AR / Revenue) * Days
   *
   * DSO measures how long it takes to collect payment from customers.
   * Lower DSO = faster collections (better)
   * Higher DSO = slower collections (worse)
   *
   * Industry benchmark: 30-45 days for SaaS
   */
  calculateDSO(arTotal: number, totalRevenue: number, days: number): number {
    if (totalRevenue === 0) return 0;

    const dso = (arTotal / totalRevenue) * days;
    return Math.round(dso * 10) / 10; // 1 decimal place
  }

  /**
   * Calculate DPO (Days Payables Outstanding)
   *
   * Formula: DPO = (AP / COGS) * Days
   *
   * DPO measures how long it takes to pay suppliers.
   * Higher DPO = paying slower (can be good for cash flow, but may strain relationships)
   * Lower DPO = paying faster (better supplier relationships)
   *
   * Industry benchmark: 30-60 days
   */
  calculateDPO(apTotal: number, totalCOGS: number, days: number): number {
    if (totalCOGS === 0) return 0;

    const dpo = (apTotal / totalCOGS) * days;
    return Math.round(dpo * 10) / 10; // 1 decimal place
  }

  /**
   * Detect AR aging anomalies
   *
   * FR-021: Flag when AR 90+ days bucket increases >50% month-over-month
   */
  detectAnomalies(
    previousAging: ARAPAging,
    currentAging: ARAPAging,
    threshold: number = ANOMALY_THRESHOLDS.AR_AGING_90_PLUS_SPIKE_PCT
  ): Omit<Anomaly, 'id' | 'created_at' | 'updated_at'>[] {
    const anomalies: Omit<Anomaly, 'id' | 'created_at' | 'updated_at'>[] = [];

    // Check AR 90+ days spike
    if (previousAging.ar_90_plus > 0) {
      const increase =
        ((currentAging.ar_90_plus - previousAging.ar_90_plus) /
          previousAging.ar_90_plus) *
        100;

      if (increase >= threshold) {
        const thresholdValue = previousAging.ar_90_plus * (1 + threshold / 100);

        anomalies.push({
          company_id: currentAging.company_id,
          anomaly_type: 'ar_aging_spike',
          period_date: currentAging.period_date,
          severity: increase >= 100 ? 'high' : increase >= 75 ? 'high' : 'medium',
          description: `AR 90+ days increased ${increase.toFixed(1)}% month-over-month (threshold: ${threshold}%)`,
          metric_name: 'ar_90_plus',
          metric_value: currentAging.ar_90_plus,
          threshold_value: Math.round(thresholdValue),
        });
      }
    }

    // Check for high DSO (>60 days is concerning for SaaS)
    if (currentAging.dso > 60) {
      anomalies.push({
        company_id: currentAging.company_id,
        anomaly_type: 'high_dso',
        period_date: currentAging.period_date,
        severity: currentAging.dso > 90 ? 'high' : 'medium',
        description: `Days Sales Outstanding is ${currentAging.dso} days (benchmark: 30-45 days)`,
        metric_name: 'dso',
        metric_value: currentAging.dso,
        threshold_value: 60,
      });
    }

    return anomalies;
  }

  /**
   * Calculate complete AR/AP aging analysis
   */
  calculateARAPAging(
    input: ARAPAgingInput
  ): Omit<ARAPAging, 'id' | 'created_at' | 'updated_at'> {
    const {
      companyId,
      periodDate,
      invoices,
      cogsEntries,
      totalRevenue,
      totalCOGS,
      days,
      today,
    } = input;

    // Calculate AR aging
    const arAging = this.calculateARAging(invoices, today);

    // Calculate AP aging
    const apAging = this.calculateAPAging(cogsEntries, today);

    // Calculate DSO and DPO
    const dso = this.calculateDSO(arAging.ar_total, totalRevenue, days);
    const dpo = this.calculateDPO(apAging.ap_total, totalCOGS, days);

    return {
      company_id: companyId,
      period_date: periodDate,
      ar_current: arAging.ar_current,
      ar_30_days: arAging.ar_30_days,
      ar_60_days: arAging.ar_60_days,
      ar_90_plus: arAging.ar_90_plus,
      ar_total: arAging.ar_total,
      ap_current: apAging.ap_current,
      ap_30_days: apAging.ap_30_days,
      ap_60_days: apAging.ap_60_days,
      ap_90_plus: apAging.ap_90_plus,
      ap_total: apAging.ap_total,
      dso,
      dpo,
    };
  }

  /**
   * Calculate AR/AP aging for multiple periods (batch)
   */
  calculateAgingBatch(
    inputs: ARAPAgingInput[]
  ): Omit<ARAPAging, 'id' | 'created_at' | 'updated_at'>[] {
    return inputs.map((input) => this.calculateARAPAging(input));
  }

  /**
   * Analyze AR aging trends over time
   *
   * Returns insights about improving/worsening collections
   */
  analyzeTrends(
    agingHistory: ARAPAging[]
  ): {
    trend: 'improving' | 'stable' | 'worsening';
    dso_change: number;
    ar_90_plus_change_pct: number;
  } {
    if (agingHistory.length < 2) {
      return {
        trend: 'stable',
        dso_change: 0,
        ar_90_plus_change_pct: 0,
      };
    }

    // Sort by period_date ascending
    const sorted = agingHistory.sort((a, b) =>
      a.period_date.localeCompare(b.period_date)
    );

    const oldest = sorted[0];
    const latest = sorted[sorted.length - 1];

    const dsoChange = latest.dso - oldest.dso;
    const ar90PlusChangePct =
      oldest.ar_90_plus === 0
        ? 0
        : ((latest.ar_90_plus - oldest.ar_90_plus) / oldest.ar_90_plus) * 100;

    // Determine trend
    let trend: 'improving' | 'stable' | 'worsening' = 'stable';

    if (dsoChange > 10 || ar90PlusChangePct > 50) {
      trend = 'worsening'; // Collections slowing down
    } else if (dsoChange < -10 || ar90PlusChangePct < -25) {
      trend = 'improving'; // Collections speeding up
    }

    return {
      trend,
      dso_change: Math.round(dsoChange * 10) / 10,
      ar_90_plus_change_pct: Math.round(ar90PlusChangePct * 10) / 10,
    };
  }

  /**
   * Calculate cash conversion cycle (CCC)
   *
   * Formula: CCC = DSO + DIO - DPO
   * (DIO = Days Inventory Outstanding, typically 0 for SaaS)
   *
   * CCC measures how quickly company converts investments back into cash
   * Lower CCC = better cash flow
   */
  calculateCashConversionCycle(dso: number, dpo: number, dio: number = 0): number {
    return Math.round((dso + dio - dpo) * 10) / 10;
  }

  /**
   * Calculate percentage of AR in each aging bucket
   *
   * Helps visualize distribution of receivables
   */
  calculateARDistribution(aging: ARAging): {
    current_pct: number;
    days_30_pct: number;
    days_60_pct: number;
    days_90_plus_pct: number;
  } {
    if (aging.ar_total === 0) {
      return {
        current_pct: 0,
        days_30_pct: 0,
        days_60_pct: 0,
        days_90_plus_pct: 0,
      };
    }

    return {
      current_pct: Math.round((aging.ar_current / aging.ar_total) * 100 * 100) / 100,
      days_30_pct: Math.round((aging.ar_30_days / aging.ar_total) * 100 * 100) / 100,
      days_60_pct: Math.round((aging.ar_60_days / aging.ar_total) * 100 * 100) / 100,
      days_90_plus_pct: Math.round((aging.ar_90_plus / aging.ar_total) * 100 * 100) / 100,
    };
  }

  /**
   * Estimate bad debt risk
   *
   * Invoices >90 days old have higher risk of non-payment
   * Industry rule of thumb: ~30% of 90+ day AR may become bad debt
   */
  estimateBadDebtRisk(ar90Plus: number, riskPercentage: number = 30): {
    ar_90_plus: number;
    estimated_bad_debt: number;
    risk_percentage: number;
  } {
    const estimatedBadDebt = (ar90Plus * riskPercentage) / 100;

    return {
      ar_90_plus: Math.round(ar90Plus),
      estimated_bad_debt: Math.round(estimatedBadDebt),
      risk_percentage: riskPercentage,
    };
  }
}
