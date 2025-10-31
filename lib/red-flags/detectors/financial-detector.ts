/**
 * Financial Detector
 *
 * Detects financial red flags using rule-based logic:
 * - Revenue concentration (top customers > 80% of revenue)
 * - Negative Net Revenue Retention (NRR < 100%)
 * - Accounts receivable aging (>60 days and increasing)
 * - Days Sales Outstanding above target (DSO > threshold)
 * - High burn rate / low runway
 *
 * Data sources: Supabase market_metrics table, business financials
 */

import { BaseDetector } from './base-detector';
import { createClient } from '../../supabase/server';
import {
  RedFlag,
  DetectorResult,
  DetectorOptions,
  FlagSeverity,
  RedFlagEvidence,
} from '../types';
import { scrubEvidencePreview } from '../utils/pii-scrubber';

/**
 * Financial thresholds for detection
 */
const THRESHOLDS = {
  REVENUE_CONCENTRATION: 0.80, // 80% revenue from top 3 customers
  NEGATIVE_NRR: 1.0, // NRR below 100%
  AR_AGING_DAYS: 60, // Receivables over 60 days
  DSO_TARGET: 45, // Days Sales Outstanding target (SaaS standard)
  LOW_RUNWAY_MONTHS: 6, // Less than 6 months runway
  CRITICAL_RUNWAY_MONTHS: 3, // Less than 3 months runway
};

/**
 * Financial Red Flag Detector
 */
export class FinancialDetector extends BaseDetector {
  readonly name = 'financial';
  readonly category = 'financial' as const;
  readonly version = '1.0.0';

  /**
   * Run financial detection
   */
  async detect(options: DetectorOptions): Promise<DetectorResult> {
    return this.safeExecute(async () => {
      const flags: Partial<RedFlag>[] = [];

      // Run all detection rules in parallel
      const [
        revenueConcentration,
        negativeNRR,
        arAging,
        highDSO,
        lowRunway,
      ] = await Promise.allSettled([
        this.checkRevenueConcentration(options),
        this.checkNegativeNRR(options),
        this.checkARAging(options),
        this.checkHighDSO(options),
        this.checkLowRunway(options),
      ]);

      // Collect flags from successful checks
      if (revenueConcentration.status === 'fulfilled' && revenueConcentration.value) {
        flags.push(revenueConcentration.value);
      }
      if (negativeNRR.status === 'fulfilled' && negativeNRR.value) {
        flags.push(negativeNRR.value);
      }
      if (arAging.status === 'fulfilled' && arAging.value) {
        flags.push(arAging.value);
      }
      if (highDSO.status === 'fulfilled' && highDSO.value) {
        flags.push(highDSO.value);
      }
      if (lowRunway.status === 'fulfilled' && lowRunway.value) {
        flags.push(lowRunway.value);
      }

      return flags;
    });
  }

  /**
   * Check for revenue concentration risk
   */
  private async checkRevenueConcentration(
    options: DetectorOptions
  ): Promise<Partial<RedFlag> | null> {
    const supabase = await createClient();

    // Query for customer revenue data
    // Assuming market_metrics has revenue_by_customer data
    const { data: metrics, error } = await supabase
      .from('market_metrics')
      .select('metric_value, metric_metadata')
      .eq('entity_id', options.entityId)
      .eq('metric_type', 'customer_revenue')
      .order('metric_value', { ascending: false })
      .limit(3);

    if (error || !metrics || metrics.length === 0) {
      return null;
    }

    // Calculate top 3 customer concentration
    const top3Revenue = metrics.reduce((sum, m) => sum + parseFloat(m.metric_value), 0);

    // Get total revenue
    const { data: totalData } = await supabase
      .from('market_metrics')
      .select('metric_value')
      .eq('entity_id', options.entityId)
      .eq('metric_name', 'total_revenue')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!totalData) {
      return null;
    }

    const totalRevenue = parseFloat(totalData.metric_value);
    const concentration = top3Revenue / totalRevenue;

    if (concentration < THRESHOLDS.REVENUE_CONCENTRATION) {
      return null; // No flag
    }

    // Determine severity based on concentration level
    let severity: FlagSeverity = 'high';
    if (concentration >= 0.95) {
      severity = 'critical'; // >95% concentration is critical
    } else if (concentration >= 0.90) {
      severity = 'high';
    } else {
      severity = 'medium';
    }

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'financial',
      title: 'High Customer Revenue Concentration',
      description: `Top 3 customers represent ${(concentration * 100).toFixed(1)}% of total revenue, creating significant revenue risk.`,
      severity,
      confidence: 1.0, // Rule-based = certain
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          metric_name: 'revenue_concentration',
          threshold: THRESHOLDS.REVENUE_CONCENTRATION,
          actual_value: concentration,
          top3_revenue: top3Revenue,
          total_revenue: totalRevenue,
        },
      },
    };

    // Generate fingerprint
    flag.fingerprint = this.generateFingerprint(flag);

    return flag;
  }

  /**
   * Check for negative Net Revenue Retention
   */
  private async checkNegativeNRR(
    options: DetectorOptions
  ): Promise<Partial<RedFlag> | null> {
    const supabase = await createClient();

    const { data: nrrData, error } = await supabase
      .from('market_metrics')
      .select('metric_value, timestamp')
      .eq('entity_id', options.entityId)
      .eq('metric_name', 'net_revenue_retention')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !nrrData) {
      return null;
    }

    const nrr = parseFloat(nrrData.metric_value);

    if (nrr >= THRESHOLDS.NEGATIVE_NRR) {
      return null; // NRR is healthy
    }

    // Determine severity
    let severity: FlagSeverity = 'high';
    if (nrr < 0.85) {
      severity = 'critical'; // NRR below 85% is critical
    } else if (nrr < 0.95) {
      severity = 'high';
    } else {
      severity = 'medium';
    }

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'financial',
      title: 'Negative Net Revenue Retention',
      description: `NRR at ${(nrr * 100).toFixed(1)}% indicates customer churn exceeding expansion revenue. Target is >100%.`,
      severity,
      confidence: 1.0,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          metric_name: 'net_revenue_retention',
          threshold: THRESHOLDS.NEGATIVE_NRR,
          actual_value: nrr,
          measured_at: nrrData.timestamp,
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }

  /**
   * Check for aging accounts receivable
   */
  private async checkARAging(
    options: DetectorOptions
  ): Promise<Partial<RedFlag> | null> {
    const supabase = await createClient();

    const { data: arData, error } = await supabase
      .from('market_metrics')
      .select('metric_value, timestamp')
      .eq('entity_id', options.entityId)
      .eq('metric_name', 'ar_over_60_days')
      .order('timestamp', { ascending: false })
      .limit(2); // Get current and previous for trend

    if (error || !arData || arData.length === 0) {
      return null;
    }

    const currentAR = parseFloat(arData[0].metric_value);

    // Check if AR is significant and increasing
    const isIncreasing = arData.length > 1 && currentAR > parseFloat(arData[1].metric_value);

    if (currentAR < 10000 && !isIncreasing) {
      return null; // Not material
    }

    let severity: FlagSeverity = 'medium';
    if (currentAR > 100000) {
      severity = isIncreasing ? 'critical' : 'high';
    } else if (isIncreasing) {
      severity = 'high';
    }

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'financial',
      title: 'Aging Accounts Receivable Risk',
      description: `£${currentAR.toLocaleString()} in receivables over 60 days${isIncreasing ? ', trending upward' : ''}. May indicate collection issues or customer financial distress.`,
      severity,
      confidence: 1.0,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          metric_name: 'ar_aging',
          threshold: THRESHOLDS.AR_AGING_DAYS,
          actual_value: currentAR,
          is_increasing: isIncreasing,
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }

  /**
   * Check for high Days Sales Outstanding
   */
  private async checkHighDSO(
    options: DetectorOptions
  ): Promise<Partial<RedFlag> | null> {
    const supabase = await createClient();

    const { data: dsoData, error } = await supabase
      .from('market_metrics')
      .select('metric_value, timestamp')
      .eq('entity_id', options.entityId)
      .eq('metric_name', 'days_sales_outstanding')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !dsoData) {
      return null;
    }

    const dso = parseFloat(dsoData.metric_value);

    if (dso <= THRESHOLDS.DSO_TARGET) {
      return null; // DSO is healthy
    }

    let severity: FlagSeverity = 'low';
    if (dso > 90) {
      severity = 'critical';
    } else if (dso > 60) {
      severity = 'high';
    } else if (dso > 45) {
      severity = 'medium';
    }

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'financial',
      title: 'High Days Sales Outstanding',
      description: `DSO at ${dso.toFixed(0)} days exceeds target of ${THRESHOLDS.DSO_TARGET} days. Indicates collection inefficiency or customer payment issues.`,
      severity,
      confidence: 1.0,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          metric_name: 'days_sales_outstanding',
          threshold: THRESHOLDS.DSO_TARGET,
          actual_value: dso,
          measured_at: dsoData.timestamp,
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }

  /**
   * Check for low cash runway
   */
  private async checkLowRunway(
    options: DetectorOptions
  ): Promise<Partial<RedFlag> | null> {
    const supabase = await createClient();

    const { data: runwayData, error } = await supabase
      .from('market_metrics')
      .select('metric_value, timestamp')
      .eq('entity_id', options.entityId)
      .eq('metric_name', 'cash_runway_months')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !runwayData) {
      return null;
    }

    const runwayMonths = parseFloat(runwayData.metric_value);

    if (runwayMonths >= THRESHOLDS.LOW_RUNWAY_MONTHS) {
      return null; // Runway is adequate
    }

    let severity: FlagSeverity = 'medium';
    if (runwayMonths < THRESHOLDS.CRITICAL_RUNWAY_MONTHS) {
      severity = 'critical';
    } else {
      severity = 'high';
    }

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'financial',
      title: 'Low Cash Runway',
      description: `Cash runway of ${runwayMonths.toFixed(1)} months. Company may face funding pressure or need to reduce burn rate significantly.`,
      severity,
      confidence: 1.0,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          metric_name: 'cash_runway_months',
          threshold: THRESHOLDS.LOW_RUNWAY_MONTHS,
          actual_value: runwayMonths,
          measured_at: runwayData.timestamp,
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }
}

/**
 * Singleton instance
 */
let financialDetectorInstance: FinancialDetector | null = null;

/**
 * Get financial detector instance
 */
export function getFinancialDetector(): FinancialDetector {
  if (!financialDetectorInstance) {
    financialDetectorInstance = new FinancialDetector();
  }
  return financialDetectorInstance;
}
