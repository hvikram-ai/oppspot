"use client"

import { AlertCircle, AlertTriangle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AnomalySeverity } from "@/lib/financials/types"

// ==============================================================================
// ANOMALY TYPE DEFINITIONS
// ==============================================================================

export type AnomalyType =
  | 'concentration_risk'
  | 'ar_aging_spike'
  | 'dso_increase'
  | 'churn_spike'
  | 'nrr_drop'
  | 'grr_drop'
  | 'revenue_drop';

export interface AnomalyMessage {
  title: string;
  description: string;
  actionable?: string;
}

export const ANOMALY_MESSAGES: Record<AnomalyType, AnomalyMessage> = {
  concentration_risk: {
    title: 'Revenue Concentration Risk',
    description: 'A single customer represents more than 25% of total revenue',
    actionable: 'Consider diversifying customer base to reduce dependency risk',
  },
  ar_aging_spike: {
    title: 'AR Aging Spike Detected',
    description: 'Accounts receivable in 90+ days bucket increased by more than 50%',
    actionable: 'Review collection processes and consider escalating overdue accounts',
  },
  dso_increase: {
    title: 'Days Sales Outstanding Increased',
    description: 'DSO has increased significantly compared to previous period',
    actionable: 'Analyze payment terms and collection efficiency',
  },
  churn_spike: {
    title: 'Churn Rate Spike',
    description: 'Customer churn rate exceeded historical average',
    actionable: 'Investigate customer satisfaction and product usage patterns',
  },
  nrr_drop: {
    title: 'Net Revenue Retention Declined',
    description: 'NRR below target threshold, indicating revenue leakage',
    actionable: 'Review expansion opportunities and contraction reasons',
  },
  grr_drop: {
    title: 'Gross Revenue Retention Declined',
    description: 'GRR decreased, indicating higher churn or contraction',
    actionable: 'Focus on customer success and retention initiatives',
  },
  revenue_drop: {
    title: 'Revenue Declined',
    description: 'Month-over-month revenue decreased',
    actionable: 'Analyze sales pipeline and customer acquisition trends',
  },
};

// ==============================================================================
// SEVERITY HELPERS
// ==============================================================================

function getSeverityIcon(severity: AnomalySeverity) {
  switch (severity) {
    case AnomalySeverity.HIGH:
      return <AlertCircle className="h-5 w-5" />;
    case AnomalySeverity.MEDIUM:
      return <AlertTriangle className="h-5 w-5" />;
    case AnomalySeverity.LOW:
      return <Info className="h-5 w-5" />;
  }
}

function getSeverityVariant(severity: AnomalySeverity): 'default' | 'destructive' {
  switch (severity) {
    case AnomalySeverity.HIGH:
      return 'destructive';
    case AnomalySeverity.MEDIUM:
    case AnomalySeverity.LOW:
    default:
      return 'default';
  }
}

function getSeverityBadge(severity: AnomalySeverity) {
  const colors = {
    [AnomalySeverity.HIGH]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    [AnomalySeverity.MEDIUM]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    [AnomalySeverity.LOW]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[severity]}`}
    >
      {severity.toUpperCase()}
    </span>
  );
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export interface AnomalyBannerProps {
  type: AnomalyType;
  severity: AnomalySeverity;
  customMessage?: string;
  details?: Record<string, unknown>;
  className?: string;
}

export function AnomalyBanner({
  type,
  severity,
  customMessage,
  details,
  className,
}: AnomalyBannerProps) {
  const message = ANOMALY_MESSAGES[type];
  const icon = getSeverityIcon(severity);
  const variant = getSeverityVariant(severity);

  return (
    <Alert variant={variant} className={className}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTitle className="mb-0">{message.title}</AlertTitle>
            {getSeverityBadge(severity)}
          </div>
          <AlertDescription>
            <div className="space-y-1">
              <p>{customMessage || message.description}</p>
              {message.actionable && (
                <p className="text-sm font-medium mt-2">
                  💡 {message.actionable}
                </p>
              )}
              {details && Object.keys(details).length > 0 && (
                <div className="mt-2 text-xs opacity-75">
                  {Object.entries(details).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span>{' '}
                      {String(value)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

// ==============================================================================
// MULTIPLE ANOMALIES WRAPPER
// ==============================================================================

export interface AnomalyBannersProps {
  anomalies: Array<{
    type: AnomalyType;
    severity: AnomalySeverity;
    message?: string;
    details?: Record<string, unknown>;
  }>;
  className?: string;
}

export function AnomalyBanners({ anomalies, className }: AnomalyBannersProps) {
  if (anomalies.length === 0) {
    return null;
  }

  // Sort by severity: HIGH > MEDIUM > LOW
  const sortedAnomalies = [...anomalies].sort((a, b) => {
    const severityOrder = {
      [AnomalySeverity.HIGH]: 0,
      [AnomalySeverity.MEDIUM]: 1,
      [AnomalySeverity.LOW]: 2,
    };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {sortedAnomalies.map((anomaly, index) => (
        <AnomalyBanner
          key={`${anomaly.type}-${index}`}
          type={anomaly.type}
          severity={anomaly.severity}
          customMessage={anomaly.message}
          details={anomaly.details}
        />
      ))}
    </div>
  );
}
