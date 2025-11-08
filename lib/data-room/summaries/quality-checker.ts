/**
 * Quality Checker - Validates extraction quality and enforces quality gates
 *
 * Checks:
 * - Coverage: Percentage of required fields filled
 * - Confidence: Average confidence across all fields
 * - Quality gates: Minimum thresholds for coverage and confidence
 * - Issues: Missing required fields, low confidence fields, validation errors
 */

import type {
  SummaryTemplate,
  SummaryField,
  SummaryFieldValue,
  QualityCheckResult,
  QualityGateConfig,
  SummaryQualityIssue,
  QualitySeverity,
} from './types';

/**
 * Quality checker for summary extractions
 */
export class QualityChecker {
  /**
   * Perform comprehensive quality check
   */
  checkQuality(
    template: SummaryTemplate,
    fields: SummaryField[],
    values: SummaryFieldValue[],
    gateConfig?: QualityGateConfig
  ): QualityCheckResult {
    // Use template quality gates or provided config
    const config: QualityGateConfig = gateConfig || {
      required_coverage: template.required_coverage,
      min_confidence: template.min_confidence,
      allow_high_severity_issues: false,
    };

    // Calculate metrics
    const coverage = this.calculateCoverage(fields, values);
    const avgConfidence = this.calculateAverageConfidence(values);

    // Detect issues
    const issues: SummaryQualityIssue[] = [];
    const missingRequiredFields: string[] = [];
    const lowConfidenceFields: Array<{ field_key: string; confidence: number }> = [];

    // Check for missing required fields
    const requiredFields = fields.filter((f) => f.required);
    for (const field of requiredFields) {
      const value = values.find((v) => v.field_id === field.id);
      if (!value || value.value_json === null) {
        missingRequiredFields.push(field.key);
        issues.push({
          id: '', // Will be set by database
          run_id: '', // Will be set by caller
          field_key: field.key,
          issue: `Required field "${field.title}" is missing`,
          severity: 'high',
          context: {
            field_id: field.id,
            field_title: field.title,
            expected_value: 'Non-null value',
            actual_value: null,
          },
          remediation: field.source_hint || 'Review document and extract manually',
          created_at: new Date().toISOString(),
        });
      }
    }

    // Check for low confidence fields
    const confidenceThreshold = config.min_confidence - 0.1; // 10% below threshold
    for (const value of values) {
      if (value.confidence < confidenceThreshold) {
        const field = fields.find((f) => f.id === value.field_id);
        if (field) {
          lowConfidenceFields.push({
            field_key: field.key,
            confidence: value.confidence,
          });

          const severity: QualitySeverity = value.confidence < 0.3 ? 'high' : 'medium';
          issues.push({
            id: '',
            run_id: '',
            field_key: field.key,
            issue: `Field "${field.title}" has low confidence (${Math.round(value.confidence * 100)}%)`,
            severity,
            context: {
              field_id: field.id,
              field_title: field.title,
              confidence: value.confidence,
            },
            remediation: 'Review extraction and verify value',
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // Check for validation errors
    for (const value of values) {
      const field = fields.find((f) => f.id === value.field_id);
      if (field && field.validation) {
        const validationIssues = this.validateFieldValue(field, value);
        issues.push(...validationIssues.map(issue => ({
          ...issue,
          id: '',
          run_id: '',
          created_at: new Date().toISOString(),
        })));
      }
    }

    // Check for conflicting values
    const conflictIssues = this.detectConflicts(fields, values);
    issues.push(...conflictIssues.map(issue => ({
      ...issue,
      id: '',
      run_id: '',
      created_at: new Date().toISOString(),
    })));

    // Determine if quality gates pass
    const hasHighSeverityIssues = issues.some((i) => i.severity === 'high');
    const qualityPass =
      coverage >= config.required_coverage &&
      avgConfidence >= config.min_confidence &&
      (!hasHighSeverityIssues || config.allow_high_severity_issues);

    return {
      coverage,
      avg_confidence: avgConfidence,
      quality_pass: qualityPass,
      issues,
      missing_required_fields: missingRequiredFields,
      low_confidence_fields: lowConfidenceFields,
    };
  }

  /**
   * Calculate coverage: (filled required fields) / (total required fields)
   */
  private calculateCoverage(fields: SummaryField[], values: SummaryFieldValue[]): number {
    const requiredFields = fields.filter((f) => f.required);
    if (requiredFields.length === 0) {
      return 1.0; // 100% coverage if no required fields
    }

    const filledRequired = requiredFields.filter((field) => {
      const value = values.find((v) => v.field_id === field.id);
      return value && value.value_json !== null;
    });

    return filledRequired.length / requiredFields.length;
  }

  /**
   * Calculate average confidence across all field values
   */
  private calculateAverageConfidence(values: SummaryFieldValue[]): number {
    if (values.length === 0) {
      return 0;
    }

    const totalConfidence = values.reduce((sum, v) => sum + v.confidence, 0);
    return totalConfidence / values.length;
  }

  /**
   * Validate field value against validation rules
   */
  private validateFieldValue(
    field: SummaryField,
    value: SummaryFieldValue
  ): Omit<SummaryQualityIssue, 'id' | 'run_id' | 'created_at'>[] {
    const issues: Omit<SummaryQualityIssue, 'id' | 'run_id' | 'created_at'>[] = [];

    if (!field.validation || value.value_json === null) {
      return issues;
    }

    const val = value.value_json;
    const validation = field.validation;

    // Check min/max for numbers
    if (typeof val === 'number') {
      if (validation.min !== undefined && val < validation.min) {
        issues.push({
          field_key: field.key,
          issue: `Value ${val} is below minimum ${validation.min}`,
          severity: 'medium',
          context: {
            field_id: field.id,
            field_title: field.title,
            expected_value: `>= ${validation.min}`,
            actual_value: val,
          },
          remediation: 'Verify extracted value or adjust validation rule',
        });
      }

      if (validation.max !== undefined && val > validation.max) {
        issues.push({
          field_key: field.key,
          issue: `Value ${val} is above maximum ${validation.max}`,
          severity: 'medium',
          context: {
            field_id: field.id,
            field_title: field.title,
            expected_value: `<= ${validation.max}`,
            actual_value: val,
          },
          remediation: 'Verify extracted value or adjust validation rule',
        });
      }
    }

    // Check string length
    if (typeof val === 'string') {
      if (validation.minLength !== undefined && val.length < validation.minLength) {
        issues.push({
          field_key: field.key,
          issue: `String length ${val.length} is below minimum ${validation.minLength}`,
          severity: 'low',
          context: {
            field_id: field.id,
            field_title: field.title,
          },
          remediation: 'Verify extracted value',
        });
      }

      if (validation.maxLength !== undefined && val.length > validation.maxLength) {
        issues.push({
          field_key: field.key,
          issue: `String length ${val.length} exceeds maximum ${validation.maxLength}`,
          severity: 'low',
          context: {
            field_id: field.id,
            field_title: field.title,
          },
          remediation: 'Truncate value or adjust validation rule',
        });
      }

      // Check pattern
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(val)) {
          issues.push({
            field_key: field.key,
            issue: validation.message || `Value does not match required pattern`,
            severity: 'medium',
            context: {
              field_id: field.id,
              field_title: field.title,
              actual_value: val,
            },
            remediation: 'Verify extracted value format',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Detect conflicting or inconsistent values
   */
  private detectConflicts(
    fields: SummaryField[],
    values: SummaryFieldValue[]
  ): Omit<SummaryQualityIssue, 'id' | 'run_id' | 'created_at'>[] {
    const issues: Omit<SummaryQualityIssue, 'id' | 'run_id' | 'created_at'>[] = [];

    // Check date ordering (e.g., effective_date before end_date)
    const effectiveDateValue = values.find(
      (v) => fields.find((f) => f.id === v.field_id)?.key === 'effective_date'
    );
    const endDateValue = values.find(
      (v) => fields.find((f) => f.id === v.field_id)?.key === 'end_date'
    );

    if (effectiveDateValue && endDateValue) {
      const effectiveDate = new Date(String(effectiveDateValue.value_json));
      const endDate = new Date(String(endDateValue.value_json));

      if (effectiveDate > endDate) {
        issues.push({
          field_key: null,
          issue: 'Effective date is after end date',
          severity: 'high',
          context: {
            conflicting_evidence: [
              `Effective: ${effectiveDateValue.value_json}`,
              `End: ${endDateValue.value_json}`,
            ],
          },
          remediation: 'Review date fields for accuracy',
        });
      }
    }

    // Check for placeholder values
    const placeholderPatterns = [
      /^(tbd|tbc|n\/?a|unknown|pending|todo)$/i,
      /^x+$/i,
      /^\[.*\]$/,
    ];

    for (const value of values) {
      if (typeof value.value_json === 'string') {
        const str = value.value_json.trim();
        if (placeholderPatterns.some((pattern) => pattern.test(str))) {
          const field = fields.find((f) => f.id === value.field_id);
          issues.push({
            field_key: field?.key || null,
            issue: `Placeholder value detected: "${str}"`,
            severity: field?.required ? 'high' : 'medium',
            context: {
              field_id: field?.id,
              field_title: field?.title,
              actual_value: str,
            },
            remediation: 'Replace placeholder with actual value',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Generate quality report summary
   */
  generateQualityReport(result: QualityCheckResult): string {
    const { coverage, avg_confidence, quality_pass, issues } = result;

    let report = `Quality Check Results\n`;
    report += `===================\n\n`;
    report += `Coverage: ${Math.round(coverage * 100)}%\n`;
    report += `Average Confidence: ${Math.round(avg_confidence * 100)}%\n`;
    report += `Status: ${quality_pass ? '✅ PASS' : '❌ FAIL'}\n\n`;

    if (result.missing_required_fields.length > 0) {
      report += `Missing Required Fields (${result.missing_required_fields.length}):\n`;
      result.missing_required_fields.forEach((key) => {
        report += `  - ${key}\n`;
      });
      report += `\n`;
    }

    if (result.low_confidence_fields.length > 0) {
      report += `Low Confidence Fields (${result.low_confidence_fields.length}):\n`;
      result.low_confidence_fields.forEach(({ field_key, confidence }) => {
        report += `  - ${field_key}: ${Math.round(confidence * 100)}%\n`;
      });
      report += `\n`;
    }

    if (issues.length > 0) {
      report += `Issues (${issues.length}):\n`;
      const grouped = {
        high: issues.filter((i) => i.severity === 'high'),
        medium: issues.filter((i) => i.severity === 'medium'),
        low: issues.filter((i) => i.severity === 'low'),
      };

      Object.entries(grouped).forEach(([severity, severityIssues]) => {
        if (severityIssues.length > 0) {
          report += `\n  ${severity.toUpperCase()} (${severityIssues.length}):\n`;
          severityIssues.forEach((issue) => {
            report += `    - ${issue.issue}\n`;
            if (issue.remediation) {
              report += `      → ${issue.remediation}\n`;
            }
          });
        }
      });
    }

    return report;
  }
}

/**
 * Singleton instance
 */
let checkerInstance: QualityChecker | null = null;

/**
 * Get or create quality checker instance
 */
export function getQualityChecker(): QualityChecker {
  if (!checkerInstance) {
    checkerInstance = new QualityChecker();
  }
  return checkerInstance;
}
