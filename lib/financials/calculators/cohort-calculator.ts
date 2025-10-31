/**
 * Cohort Calculator
 *
 * Calculates customer retention metrics by acquisition cohort:
 * - Identifies customer cohorts by acquisition month
 * - Calculates retention rate by month offset
 * - Tracks MRR retained by cohort
 * - Generates cohort retention grid for visualization
 *
 * Cohort analysis helps identify retention trends and churn patterns.
 */

import type {
  Customer,
  Subscription,
  CohortMetric,
} from '@/lib/financials/types';

/**
 * Cohort information (customers grouped by acquisition month)
 */
export interface Cohort {
  cohortMonth: string; // YYYY-MM-DD (first day of month)
  customerIds: string[];
  initialCustomers: number;
}

/**
 * Retention data for a specific month offset
 */
export interface RetentionData {
  month_offset: number;
  customers_active: number;
  mrr_retained: number;
  retention_rate_pct: number;
}

/**
 * Cohort Calculator class
 */
export class CohortCalculator {
  /**
   * Identify cohorts from customer acquisition dates
   * Groups customers by the month they were acquired
   */
  identifyCohorts(customers: Customer[]): Map<string, Cohort> {
    const cohorts = new Map<string, Cohort>();

    customers.forEach((customer) => {
      // Normalize acquisition date to first day of month
      const acquisitionDate = new Date(customer.acquisition_date);
      const cohortMonth = new Date(
        acquisitionDate.getFullYear(),
        acquisitionDate.getMonth(),
        1
      )
        .toISOString()
        .split('T')[0];

      // Add customer to cohort
      if (!cohorts.has(cohortMonth)) {
        cohorts.set(cohortMonth, {
          cohortMonth,
          customerIds: [],
          initialCustomers: 0,
        });
      }

      const cohort = cohorts.get(cohortMonth)!;
      cohort.customerIds.push(customer.id);
      cohort.initialCustomers = cohort.customerIds.length;
    });

    return cohorts;
  }

  /**
   * Calculate retention for a specific month offset within a cohort
   *
   * @param cohortMonth - The cohort's acquisition month (YYYY-MM-DD)
   * @param cohortCustomerIds - Customer IDs in this cohort
   * @param monthOffset - Number of months after acquisition (0 = acquisition month)
   * @param subscriptions - All subscriptions for the company
   */
  calculateRetentionByMonth(
    cohortMonth: string,
    cohortCustomerIds: string[],
    monthOffset: number,
    subscriptions: Subscription[]
  ): RetentionData {
    // Calculate target month (cohort month + offset)
    const cohortDate = new Date(cohortMonth);
    const targetMonth = new Date(
      cohortDate.getFullYear(),
      cohortDate.getMonth() + monthOffset,
      1
    );

    // Count active customers and MRR in target month
    let customersActive = 0;
    let mrrRetained = 0;
    const activeCustomerIds = new Set<string>();

    subscriptions.forEach((sub) => {
      // Check if subscription belongs to this cohort
      if (!cohortCustomerIds.includes(sub.customer_id)) {
        return;
      }

      // Check if subscription was active in target month
      const startDate = new Date(sub.start_date);
      const endDate = sub.end_date ? new Date(sub.end_date) : null;

      const isActiveInMonth =
        startDate <= targetMonth && (endDate === null || endDate >= targetMonth);

      if (isActiveInMonth) {
        activeCustomerIds.add(sub.customer_id);
        mrrRetained += sub.mrr;
      }
    });

    customersActive = activeCustomerIds.size;
    const initialCustomers = cohortCustomerIds.length;
    const retentionRatePct =
      initialCustomers === 0
        ? 0
        : Math.round((customersActive / initialCustomers) * 100 * 100) / 100;

    return {
      month_offset: monthOffset,
      customers_active: customersActive,
      mrr_retained: Math.round(mrrRetained),
      retention_rate_pct: retentionRatePct,
    };
  }

  /**
   * Calculate cohort metrics for all cohorts over N months
   *
   * @param companyId - Company ID
   * @param customers - All customers
   * @param subscriptions - All subscriptions
   * @param maxMonthOffset - Maximum number of months to track (default: 12)
   */
  calculateCohortMetrics(
    companyId: string,
    customers: Customer[],
    subscriptions: Subscription[],
    maxMonthOffset: number = 12
  ): Omit<CohortMetric, 'id' | 'created_at' | 'updated_at'>[] {
    const cohorts = this.identifyCohorts(customers);
    const metrics: Omit<CohortMetric, 'id' | 'created_at' | 'updated_at'>[] = [];

    // For each cohort, calculate retention for each month offset
    cohorts.forEach((cohort, cohortMonth) => {
      // Calculate how many months have passed since cohort acquisition
      const cohortDate = new Date(cohortMonth);
      const today = new Date();
      const monthsElapsed =
        (today.getFullYear() - cohortDate.getFullYear()) * 12 +
        (today.getMonth() - cohortDate.getMonth());

      // Only calculate up to min(maxMonthOffset, monthsElapsed)
      const maxOffset = Math.min(maxMonthOffset, monthsElapsed);

      for (let offset = 0; offset <= maxOffset; offset++) {
        const retention = this.calculateRetentionByMonth(
          cohortMonth,
          cohort.customerIds,
          offset,
          subscriptions
        );

        metrics.push({
          company_id: companyId,
          cohort_month: cohortMonth,
          month_offset: offset,
          customers_active: retention.customers_active,
          mrr_retained: retention.mrr_retained,
          retention_rate_pct: retention.retention_rate_pct,
        });
      }
    });

    return metrics;
  }

  /**
   * Generate cohort retention grid for UI visualization
   *
   * Returns data in format suitable for cohort heatmap/table:
   * - Rows: Cohorts (sorted by cohort_month descending)
   * - Columns: Month offsets (0, 1, 2, ..., N)
   * - Values: Retention rate percentages
   */
  generateRetentionGrid(
    metrics: CohortMetric[]
  ): {
    cohorts: Array<{
      cohort_month: string;
      initial_customers: number;
      retention_by_month: RetentionData[];
    }>;
    month_offsets: number[];
  } {
    // Group metrics by cohort
    const metricsByCohort = new Map<string, CohortMetric[]>();

    metrics.forEach((metric) => {
      if (!metricsByCohort.has(metric.cohort_month)) {
        metricsByCohort.set(metric.cohort_month, []);
      }
      metricsByCohort.get(metric.cohort_month)!.push(metric);
    });

    // Sort cohorts by cohort_month descending (most recent first)
    const sortedCohorts = Array.from(metricsByCohort.entries()).sort(
      ([cohortA], [cohortB]) => cohortB.localeCompare(cohortA)
    );

    // Determine max month offset
    const maxMonthOffset = Math.max(
      ...metrics.map((m) => m.month_offset),
      0
    );

    const monthOffsets = Array.from({ length: maxMonthOffset + 1 }, (_, i) => i);

    // Build cohort grid
    const cohorts = sortedCohorts.map(([cohortMonth, cohortMetrics]) => {
      // Sort metrics by month_offset
      const sortedMetrics = cohortMetrics.sort(
        (a, b) => a.month_offset - b.month_offset
      );

      // Get initial customers from month_offset=0
      const initialMetric = sortedMetrics.find((m) => m.month_offset === 0);
      const initialCustomers = initialMetric?.customers_active || 0;

      // Build retention array
      const retentionByMonth: RetentionData[] = sortedMetrics.map((metric) => ({
        month_offset: metric.month_offset,
        customers_active: metric.customers_active,
        mrr_retained: metric.mrr_retained,
        retention_rate_pct: metric.retention_rate_pct,
      }));

      return {
        cohort_month: cohortMonth,
        initial_customers: initialCustomers,
        retention_by_month: retentionByMonth,
      };
    });

    return {
      cohorts,
      month_offsets: monthOffsets,
    };
  }

  /**
   * Calculate average retention rate across all cohorts for a specific month offset
   *
   * Useful for identifying overall retention trends (e.g., "Month 6 retention is 75%")
   */
  calculateAverageRetention(
    metrics: CohortMetric[],
    monthOffset: number
  ): number {
    const metricsAtOffset = metrics.filter((m) => m.month_offset === monthOffset);

    if (metricsAtOffset.length === 0) return 0;

    const averageRetention =
      metricsAtOffset.reduce((sum, m) => sum + m.retention_rate_pct, 0) /
      metricsAtOffset.length;

    return Math.round(averageRetention * 100) / 100;
  }

  /**
   * Identify cohorts with best/worst retention
   */
  identifyRetentionOutliers(
    metrics: CohortMetric[],
    monthOffset: number
  ): {
    best: { cohort_month: string; retention_rate_pct: number } | null;
    worst: { cohort_month: string; retention_rate_pct: number } | null;
  } {
    const metricsAtOffset = metrics.filter((m) => m.month_offset === monthOffset);

    if (metricsAtOffset.length === 0) {
      return { best: null, worst: null };
    }

    const sorted = metricsAtOffset.sort(
      (a, b) => b.retention_rate_pct - a.retention_rate_pct
    );

    return {
      best: {
        cohort_month: sorted[0].cohort_month,
        retention_rate_pct: sorted[0].retention_rate_pct,
      },
      worst: {
        cohort_month: sorted[sorted.length - 1].cohort_month,
        retention_rate_pct: sorted[sorted.length - 1].retention_rate_pct,
      },
    };
  }

  /**
   * Calculate cohort lifetime value (projected)
   *
   * Projects total revenue from a cohort based on retention curve
   */
  calculateCohortLTV(
    cohortMetrics: CohortMetric[],
    averageGrossMarginPct: number
  ): number {
    // Sort by month_offset
    const sorted = cohortMetrics.sort((a, b) => a.month_offset - b.month_offset);

    // Sum MRR retained over all months
    const totalMRR = sorted.reduce((sum, metric) => sum + metric.mrr_retained, 0);

    // Apply gross margin
    const grossMargin = averageGrossMarginPct / 100;
    const projectedLTV = totalMRR * grossMargin;

    return Math.round(projectedLTV);
  }
}
