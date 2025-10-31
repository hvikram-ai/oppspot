/**
 * Revenue Concentration Calculator
 *
 * Calculates revenue concentration metrics to assess customer risk:
 * - HHI (Herfindahl-Hirschman Index) - Market concentration measure
 * - Top-N customer percentages (Top-1, Top-3, Top-5, Top-10)
 * - Risk level classification (low/medium/high)
 * - Anomaly detection for high concentration (FR-016: >25% from single customer)
 *
 * High revenue concentration = higher business risk (customer churn impact)
 */

import type {
  Subscription,
  RevenueConcentration,
} from '@/lib/financials/types';
import { ANOMALY_THRESHOLDS } from '@/lib/financials/types';

/**
 * Customer revenue aggregation
 */
interface CustomerRevenue {
  customer_id: string;
  mrr: number;
  percentage: number;
}

/**
 * Top-N customer percentages
 */
export interface TopNPercentages {
  top_1_customer_pct: number;
  top_3_customers_pct: number;
  top_5_customers_pct: number;
  top_10_customers_pct: number;
}

/**
 * Revenue concentration risk level
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Concentration Calculator class
 */
export class ConcentrationCalculator {
  /**
   * Calculate HHI (Herfindahl-Hirschman Index)
   *
   * HHI = SUM(market_share^2) * 10,000
   *
   * HHI ranges from 0 (perfect competition) to 10,000 (monopoly)
   * - HHI < 1,000: Low concentration (competitive market)
   * - HHI 1,000-1,500: Moderate concentration
   * - HHI > 1,500: High concentration (risky)
   */
  calculateHHI(subscriptions: Subscription[]): number {
    const activeSubs = subscriptions.filter((sub) => sub.is_active);

    if (activeSubs.length === 0) return 0;

    // Calculate total MRR
    const totalMRR = activeSubs.reduce((sum, sub) => sum + sub.mrr, 0);

    if (totalMRR === 0) return 0;

    // Aggregate MRR by customer
    const mrrByCustomer = new Map<string, number>();
    activeSubs.forEach((sub) => {
      const current = mrrByCustomer.get(sub.customer_id) || 0;
      mrrByCustomer.set(sub.customer_id, current + sub.mrr);
    });

    // Calculate HHI: sum of squared market shares
    let hhi = 0;
    mrrByCustomer.forEach((mrr) => {
      const marketShare = mrr / totalMRR;
      hhi += marketShare * marketShare;
    });

    // Scale to 0-10,000 range
    return Math.round(hhi * 10000);
  }

  /**
   * Calculate top-N customer percentages
   *
   * Returns percentage of total revenue from:
   * - Top 1 customer
   * - Top 3 customers
   * - Top 5 customers
   * - Top 10 customers
   */
  calculateTopNPercentages(subscriptions: Subscription[]): TopNPercentages {
    const activeSubs = subscriptions.filter((sub) => sub.is_active);

    if (activeSubs.length === 0) {
      return {
        top_1_customer_pct: 0,
        top_3_customers_pct: 0,
        top_5_customers_pct: 0,
        top_10_customers_pct: 0,
      };
    }

    // Calculate total MRR
    const totalMRR = activeSubs.reduce((sum, sub) => sum + sub.mrr, 0);

    if (totalMRR === 0) {
      return {
        top_1_customer_pct: 0,
        top_3_customers_pct: 0,
        top_5_customers_pct: 0,
        top_10_customers_pct: 0,
      };
    }

    // Aggregate MRR by customer
    const customerRevenues: CustomerRevenue[] = [];
    const mrrByCustomer = new Map<string, number>();

    activeSubs.forEach((sub) => {
      const current = mrrByCustomer.get(sub.customer_id) || 0;
      mrrByCustomer.set(sub.customer_id, current + sub.mrr);
    });

    // Convert to array and calculate percentages
    mrrByCustomer.forEach((mrr, customer_id) => {
      customerRevenues.push({
        customer_id,
        mrr,
        percentage: (mrr / totalMRR) * 100,
      });
    });

    // Sort by MRR descending
    customerRevenues.sort((a, b) => b.mrr - a.mrr);

    // Calculate top-N percentages
    const calculateTopN = (n: number): number => {
      const topN = customerRevenues.slice(0, Math.min(n, customerRevenues.length));
      const topNRevenue = topN.reduce((sum, c) => sum + c.mrr, 0);
      const percentage = (topNRevenue / totalMRR) * 100;
      return Math.round(percentage * 100) / 100; // 2 decimal places
    };

    return {
      top_1_customer_pct: calculateTopN(1),
      top_3_customers_pct: calculateTopN(3),
      top_5_customers_pct: calculateTopN(5),
      top_10_customers_pct: calculateTopN(10),
    };
  }

  /**
   * Determine risk level based on HHI
   *
   * Risk classification:
   * - Low: HHI < 1,000 (diversified revenue)
   * - Medium: HHI 1,000-1,500 (moderate concentration)
   * - High: HHI > 1,500 (high concentration risk)
   */
  determineRiskLevel(hhi: number): RiskLevel {
    if (hhi > 1500) return 'high';
    if (hhi >= 1000) return 'medium';
    return 'low';
  }

  /**
   * Detect concentration anomalies
   *
   * FR-016: Flag when single customer represents >25% of revenue
   */
  detectConcentrationAnomaly(
    top1CustomerPct: number,
    threshold: number = ANOMALY_THRESHOLDS.CONCENTRATION_SINGLE_CUSTOMER_PCT
  ): {
    isAnomaly: boolean;
    severity: 'low' | 'medium' | 'high';
    message: string;
  } | null {
    if (top1CustomerPct > threshold) {
      // Determine severity
      let severity: 'low' | 'medium' | 'high' = 'medium';
      if (top1CustomerPct > 40) severity = 'high';
      else if (top1CustomerPct > 30) severity = 'medium';
      else severity = 'low';

      return {
        isAnomaly: true,
        severity,
        message: `Single customer represents ${top1CustomerPct.toFixed(1)}% of revenue (threshold: ${threshold}%)`,
      };
    }

    return null;
  }

  /**
   * Calculate complete revenue concentration analysis
   */
  calculateConcentration(
    companyId: string,
    periodDate: string,
    subscriptions: Subscription[]
  ): Omit<RevenueConcentration, 'id' | 'created_at' | 'updated_at'> {
    const hhi = this.calculateHHI(subscriptions);
    const topN = this.calculateTopNPercentages(subscriptions);
    const riskLevel = this.determineRiskLevel(hhi);

    return {
      company_id: companyId,
      period_date: periodDate,
      hhi,
      top_1_customer_pct: topN.top_1_customer_pct,
      top_3_customers_pct: topN.top_3_customers_pct,
      top_5_customers_pct: topN.top_5_customers_pct,
      top_10_customers_pct: topN.top_10_customers_pct,
      risk_level: riskLevel,
    };
  }

  /**
   * Calculate concentration for multiple periods (batch)
   */
  calculateConcentrationBatch(
    companyId: string,
    periods: Array<{ periodDate: string; subscriptions: Subscription[] }>
  ): Omit<RevenueConcentration, 'id' | 'created_at' | 'updated_at'>[] {
    return periods.map((period) =>
      this.calculateConcentration(companyId, period.periodDate, period.subscriptions)
    );
  }

  /**
   * Analyze concentration trends over time
   *
   * Returns insights about improving/worsening concentration
   */
  analyzeTrends(
    concentrationHistory: RevenueConcentration[]
  ): {
    trend: 'improving' | 'stable' | 'worsening';
    hhi_change: number;
    top1_change: number;
  } {
    if (concentrationHistory.length < 2) {
      return {
        trend: 'stable',
        hhi_change: 0,
        top1_change: 0,
      };
    }

    // Sort by period_date ascending
    const sorted = concentrationHistory.sort((a, b) =>
      a.period_date.localeCompare(b.period_date)
    );

    const oldest = sorted[0];
    const latest = sorted[sorted.length - 1];

    const hhiChange = latest.hhi - oldest.hhi;
    const top1Change = latest.top_1_customer_pct - oldest.top_1_customer_pct;

    // Determine trend
    let trend: 'improving' | 'stable' | 'worsening' = 'stable';

    if (hhiChange > 200 || top1Change > 5) {
      trend = 'worsening'; // Concentration increasing
    } else if (hhiChange < -200 || top1Change < -5) {
      trend = 'improving'; // Concentration decreasing (diversifying)
    }

    return {
      trend,
      hhi_change: hhiChange,
      top1_change: Math.round(top1Change * 100) / 100,
    };
  }

  /**
   * Calculate revenue at risk
   *
   * Estimates revenue impact if top N customers churn
   */
  calculateRevenueAtRisk(
    subscriptions: Subscription[],
    topN: number = 5
  ): {
    top_n: number;
    mrr_at_risk: number;
    percentage_at_risk: number;
    arr_at_risk: number;
  } {
    const activeSubs = subscriptions.filter((sub) => sub.is_active);
    const totalMRR = activeSubs.reduce((sum, sub) => sum + sub.mrr, 0);

    // Aggregate MRR by customer
    const mrrByCustomer = new Map<string, number>();
    activeSubs.forEach((sub) => {
      const current = mrrByCustomer.get(sub.customer_id) || 0;
      mrrByCustomer.set(sub.customer_id, current + sub.mrr);
    });

    // Sort customers by MRR descending
    const sortedCustomers = Array.from(mrrByCustomer.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    // Calculate MRR at risk from top N customers
    const topNCustomers = sortedCustomers.slice(0, Math.min(topN, sortedCustomers.length));
    const mrrAtRisk = topNCustomers.reduce((sum, [, mrr]) => sum + mrr, 0);
    const percentageAtRisk = totalMRR === 0 ? 0 : (mrrAtRisk / totalMRR) * 100;
    const arrAtRisk = mrrAtRisk * 12;

    return {
      top_n: topN,
      mrr_at_risk: Math.round(mrrAtRisk),
      percentage_at_risk: Math.round(percentageAtRisk * 100) / 100,
      arr_at_risk: Math.round(arrAtRisk),
    };
  }

  /**
   * Get top customers by revenue
   *
   * Returns list of top customers with their revenue contribution
   */
  getTopCustomers(
    subscriptions: Subscription[],
    limit: number = 10
  ): CustomerRevenue[] {
    const activeSubs = subscriptions.filter((sub) => sub.is_active);
    const totalMRR = activeSubs.reduce((sum, sub) => sum + sub.mrr, 0);

    if (totalMRR === 0) return [];

    // Aggregate MRR by customer
    const mrrByCustomer = new Map<string, number>();
    activeSubs.forEach((sub) => {
      const current = mrrByCustomer.get(sub.customer_id) || 0;
      mrrByCustomer.set(sub.customer_id, current + sub.mrr);
    });

    // Convert to array with percentages
    const customerRevenues: CustomerRevenue[] = [];
    mrrByCustomer.forEach((mrr, customer_id) => {
      customerRevenues.push({
        customer_id,
        mrr: Math.round(mrr),
        percentage: Math.round((mrr / totalMRR) * 100 * 100) / 100,
      });
    });

    // Sort by MRR descending and limit
    return customerRevenues
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, Math.min(limit, customerRevenues.length));
  }
}
