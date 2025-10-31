"use client"

import { HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ==============================================================================
// FORMULA DEFINITIONS
// ==============================================================================

export type MetricKey =
  | 'ARR'
  | 'MRR'
  | 'NRR'
  | 'GRR'
  | 'CAC'
  | 'LTV'
  | 'GROSS_MARGIN'
  | 'ARPU';

export interface MetricFormula {
  name: string;
  formula: string;
  description: string;
  example?: string;
}

export const METRIC_FORMULAS: Record<MetricKey, MetricFormula> = {
  ARR: {
    name: 'Annual Recurring Revenue',
    formula: '12 × MRR',
    description: 'Total annualized recurring revenue from subscriptions',
    example: 'If MRR = $50,000, then ARR = $600,000',
  },
  MRR: {
    name: 'Monthly Recurring Revenue',
    formula: 'Sum of all active subscription amounts',
    description: 'Total monthly recurring revenue from all active subscriptions',
    example: 'If 100 customers at $500/mo each, then MRR = $50,000',
  },
  NRR: {
    name: 'Net Revenue Retention',
    formula: '(Start MRR + Expansion - Contraction - Churn) / Start MRR',
    description: 'Percentage of revenue retained including expansion and contraction',
    example: 'If Start MRR = $100k, Expansion = $20k, Churn = $10k, then NRR = 110%',
  },
  GRR: {
    name: 'Gross Revenue Retention',
    formula: '(Start MRR - Churn - Contraction) / Start MRR',
    description: 'Percentage of revenue retained excluding expansion (only churn & contraction)',
    example: 'If Start MRR = $100k, Churn = $10k, Contraction = $5k, then GRR = 85%',
  },
  CAC: {
    name: 'Customer Acquisition Cost',
    formula: 'Total Sales & Marketing Costs / New Customers Acquired',
    description: 'Average cost to acquire a new customer',
    example: 'If S&M costs = $50,000 and acquired 25 customers, then CAC = $2,000',
  },
  LTV: {
    name: 'Customer Lifetime Value',
    formula: 'ARPU × Gross Margin / Churn Rate',
    description: 'Estimated total revenue from a customer over their lifetime',
    example: 'If ARPU = $500, GM = 80%, Churn = 2%, then LTV = $20,000',
  },
  GROSS_MARGIN: {
    name: 'Gross Margin',
    formula: '(Revenue - COGS) / Revenue',
    description: 'Percentage of revenue remaining after direct costs',
    example: 'If Revenue = $100k and COGS = $30k, then GM = 70%',
  },
  ARPU: {
    name: 'Average Revenue Per User',
    formula: 'MRR / Active Customers',
    description: 'Average monthly revenue per active customer',
    example: 'If MRR = $50,000 and 100 active customers, then ARPU = $500',
  },
};

// ==============================================================================
// COMPONENT
// ==============================================================================

export interface FormulaTooltipProps {
  metric: MetricKey;
  showIcon?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children?: React.ReactNode;
}

export function FormulaTooltip({
  metric,
  showIcon = true,
  side = 'top',
  children,
}: FormulaTooltipProps) {
  const formula = METRIC_FORMULAS[metric];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-muted transition-colors"
              aria-label={`Show formula for ${formula.name}`}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-sm">
          <div className="space-y-2">
            <div>
              <div className="font-semibold text-sm">{formula.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {formula.description}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">
                Formula:
              </div>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded mt-0.5 inline-block">
                {formula.formula}
              </code>
            </div>
            {formula.example && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Example:
                </div>
                <div className="text-xs mt-0.5">{formula.example}</div>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
