/**
 * Operational Detector
 *
 * Detects operational red flags using rule-based logic:
 * - SLA breach rates exceeding thresholds
 * - Backlog aging (median age increasing)
 * - Single-supplier dependency (>50% spend with one vendor)
 * - Quality issues (defect rates)
 *
 * Data sources: Supabase market_metrics, alerts table
 */

import { BaseDetector } from './base-detector';
import { createClient } from '../../supabase/server';
import {
  RedFlag,
  DetectorResult,
  DetectorOptions,
  FlagSeverity,
} from '../types';

/**
 * Operational thresholds for detection
 */
const THRESHOLDS = {
  SLA_BREACH_RATE: 0.05, // 5% breach rate
  CRITICAL_SLA_BREACH_RATE: 0.15, // 15% breach rate
  BACKLOG_MEDIAN_DAYS: 14, // 14 days median backlog age
  BACKLOG_CRITICAL_DAYS: 30, // 30 days median backlog age
  SUPPLIER_CONCENTRATION: 0.50, // 50% spend with single supplier
  DEFECT_RATE: 0.02, // 2% defect rate
};

/**
 * Operational Red Flag Detector
 */
export class OperationalDetector extends BaseDetector {
  readonly name = 'operational';
  readonly category = 'operational' as const;
  readonly version = '1.0.0';

  /**
   * Run operational detection
   */
  async detect(options: DetectorOptions): Promise<DetectorResult> {
    return this.safeExecute(async () => {
      const flags: Partial<RedFlag>[] = [];

      // Run all detection rules in parallel
      const [
        slaBreaches,
        backlogAging,
        supplierDependency,
        qualityIssues,
      ] = await Promise.allSettled([
        this.checkSLABreaches(options),
        this.checkBacklogAging(options),
        this.checkSupplierDependency(options),
        this.checkQualityIssues(options),
      ]);

      // Collect flags from successful checks
      if (slaBreaches.status === 'fulfilled' && slaBreaches.value) {
        flags.push(slaBreaches.value);
      }
      if (backlogAging.status === 'fulfilled' && backlogAging.value) {
        flags.push(backlogAging.value);
      }
      if (supplierDependency.status === 'fulfilled' && supplierDependency.value) {
        flags.push(supplierDependency.value);
      }
      if (qualityIssues.status === 'fulfilled' && qualityIssues.value) {
        flags.push(qualityIssues.value);
      }

      return flags;
    });
  }

  /**
   * Check for SLA breach rate issues
   */
  private async checkSLABreaches(
    options: DetectorOptions
  ): Promise<Partial<RedFlag> | null> {
    const supabase = await createClient();

    // Get SLA breach rate from metrics
    const { data: breachData, error } = await supabase
      .from('market_metrics')
      .select('metric_value, metric_metadata, timestamp')
      .eq('entity_id', options.entityId)
      .eq('metric_name', 'sla_breach_rate')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !breachData) {
      return null;
    }

    const breachRate = parseFloat(breachData.metric_value);

    if (breachRate < THRESHOLDS.SLA_BREACH_RATE) {
      return null; // Breach rate is acceptable
    }

    // Determine severity
    let severity: FlagSeverity = 'medium';
    if (breachRate >= THRESHOLDS.CRITICAL_SLA_BREACH_RATE) {
      severity = 'critical';
    } else if (breachRate >= 0.10) {
      severity = 'high';
    }

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'operational',
      title: 'High SLA Breach Rate',
      description: `SLA breach rate at ${(breachRate * 100).toFixed(1)}% exceeds acceptable threshold of ${(THRESHOLDS.SLA_BREACH_RATE * 100).toFixed(0)}%. Indicates capacity, quality, or process issues.`,
      severity,
      confidence: 1.0,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          metric_name: 'sla_breach_rate',
          metric_type: 'sla_performance',
          threshold: THRESHOLDS.SLA_BREACH_RATE,
          actual_value: breachRate,
          measured_at: breachData.timestamp,
          sla_details: breachData.metric_metadata,
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }

  /**
   * Check for backlog aging issues
   */
  private async checkBacklogAging(
    options: DetectorOptions
  ): Promise<Partial<RedFlag> | null> {
    const supabase = await createClient();

    // Get backlog median age
    const { data: backlogData, error } = await supabase
      .from('market_metrics')
      .select('metric_value, timestamp')
      .eq('entity_id', options.entityId)
      .eq('metric_name', 'backlog_median_age_days')
      .order('timestamp', { ascending: false })
      .limit(2); // Get current and previous for trend

    if (error || !backlogData || backlogData.length === 0) {
      return null;
    }

    const currentAge = parseFloat(backlogData[0].metric_value);

    if (currentAge < THRESHOLDS.BACKLOG_MEDIAN_DAYS) {
      return null; // Backlog age is acceptable
    }

    // Check if trending upward
    const isIncreasing = backlogData.length > 1 &&
      currentAge > parseFloat(backlogData[1].metric_value);

    // Determine severity
    let severity: FlagSeverity = 'medium';
    if (currentAge >= THRESHOLDS.BACKLOG_CRITICAL_DAYS) {
      severity = isIncreasing ? 'critical' : 'high';
    } else if (isIncreasing) {
      severity = 'high';
    }

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'operational',
      title: 'Growing Backlog Age',
      description: `Median backlog age at ${currentAge.toFixed(0)} days${isIncreasing ? ' and increasing' : ''}. Indicates resource constraints or inefficient processes.`,
      severity,
      confidence: 1.0,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          metric_name: 'backlog_aging',
          metric_type: 'backlog',
          threshold: THRESHOLDS.BACKLOG_MEDIAN_DAYS,
          actual_value: currentAge,
          is_increasing: isIncreasing,
          measured_at: backlogData[0].timestamp,
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }

  /**
   * Check for single-supplier dependency
   */
  private async checkSupplierDependency(
    options: DetectorOptions
  ): Promise<Partial<RedFlag> | null> {
    const supabase = await createClient();

    // Get supplier concentration data
    const { data: supplierData, error } = await supabase
      .from('market_metrics')
      .select('metric_value, metric_metadata')
      .eq('entity_id', options.entityId)
      .eq('metric_name', 'top_supplier_concentration')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error || !supplierData) {
      return null;
    }

    const concentration = parseFloat(supplierData.metric_value);

    if (concentration < THRESHOLDS.SUPPLIER_CONCENTRATION) {
      return null; // Supplier concentration is acceptable
    }

    // Determine severity
    let severity: FlagSeverity = 'medium';
    if (concentration >= 0.80) {
      severity = 'critical'; // >80% dependency is critical
    } else if (concentration >= 0.65) {
      severity = 'high';
    }

    const supplierName = supplierData.metric_metadata?.supplier_name || 'unknown supplier';

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'operational',
      title: 'Single-Supplier Dependency Risk',
      description: `${(concentration * 100).toFixed(0)}% of spend concentrated with ${supplierName}. Creates business continuity risk if supplier relationship is disrupted.`,
      severity,
      confidence: 1.0,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          metric_name: 'supplier_concentration',
          metric_type: 'vendor',
          threshold: THRESHOLDS.SUPPLIER_CONCENTRATION,
          actual_value: concentration,
          supplier_name: supplierName,
        },
      },
    };

    flag.fingerprint = this.generateFingerprint(flag);
    return flag;
  }

  /**
   * Check for quality issues (defect rates)
   */
  private async checkQualityIssues(
    options: DetectorOptions
  ): Promise<Partial<RedFlag> | null> {
    const supabase = await createClient();

    // Get defect rate
    const { data: qualityData, error } = await supabase
      .from('market_metrics')
      .select('metric_value, timestamp')
      .eq('entity_id', options.entityId)
      .eq('metric_name', 'defect_rate')
      .order('timestamp', { ascending: false })
      .limit(2);

    if (error || !qualityData || qualityData.length === 0) {
      return null;
    }

    const currentDefectRate = parseFloat(qualityData[0].metric_value);

    if (currentDefectRate < THRESHOLDS.DEFECT_RATE) {
      return null; // Quality is acceptable
    }

    // Check if trending upward
    const isIncreasing = qualityData.length > 1 &&
      currentDefectRate > parseFloat(qualityData[1].metric_value);

    // Determine severity
    let severity: FlagSeverity = 'medium';
    if (currentDefectRate >= 0.05) {
      severity = isIncreasing ? 'critical' : 'high';
    } else if (isIncreasing) {
      severity = 'high';
    }

    const flag: Partial<RedFlag> = {
      entity_type: options.entityType,
      entity_id: options.entityId,
      category: 'operational',
      title: 'Quality Issues - High Defect Rate',
      description: `Defect rate at ${(currentDefectRate * 100).toFixed(2)}%${isIncreasing ? ' and increasing' : ''}, exceeding target of ${(THRESHOLDS.DEFECT_RATE * 100).toFixed(1)}%. May impact customer satisfaction and retention.`,
      severity,
      confidence: 1.0,
      status: 'open',
      first_detected_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      meta: {
        detector_metadata: {
          metric_name: 'defect_rate',
          metric_type: 'quality',
          threshold: THRESHOLDS.DEFECT_RATE,
          actual_value: currentDefectRate,
          is_increasing: isIncreasing,
          measured_at: qualityData[0].timestamp,
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
let operationalDetectorInstance: OperationalDetector | null = null;

/**
 * Get operational detector instance
 */
export function getOperationalDetector(): OperationalDetector {
  if (!operationalDetectorInstance) {
    operationalDetectorInstance = new OperationalDetector();
  }
  return operationalDetectorInstance;
}
