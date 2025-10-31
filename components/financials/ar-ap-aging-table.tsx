"use client"

import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ARAPAging } from "@/lib/financials/types"

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

export interface ARAPAgingData extends ARAPAging {
  period: string; // Display label
  has_anomaly?: boolean;
  anomaly_message?: string;
}

interface AgingBucket {
  label: string;
  days: string;
  ar_amount: number;
  ap_amount: number | null;
  ar_pct?: number;
  ap_pct?: number;
}

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

function formatCurrency(value: number | null, currency: string = 'USD'): string {
  if (value === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number | undefined): string {
  if (value === undefined) return '';
  return `(${(value * 100).toFixed(0)}%)`;
}

function calculateTotals(data: ARAPAgingData): { ar_total: number; ap_total: number | null } {
  const ar_total = data.ar_0_30 + data.ar_31_60 + data.ar_61_90 + data.ar_90_plus;

  const ap_total =
    data.ap_0_30 !== null &&
    data.ap_31_60 !== null &&
    data.ap_61_90 !== null &&
    data.ap_90_plus !== null
      ? data.ap_0_30 + data.ap_31_60 + data.ap_61_90 + data.ap_90_plus
      : null;

  return { ar_total, ap_total };
}

function buildAgingBuckets(data: ARAPAgingData, totals: { ar_total: number; ap_total: number | null }): AgingBucket[] {
  const { ar_total, ap_total } = totals;

  return [
    {
      label: 'Current',
      days: '0-30',
      ar_amount: data.ar_0_30,
      ap_amount: data.ap_0_30,
      ar_pct: ar_total > 0 ? data.ar_0_30 / ar_total : undefined,
      ap_pct: ap_total && ap_total > 0 ? data.ap_0_30! / ap_total : undefined,
    },
    {
      label: '1-2 Months',
      days: '31-60',
      ar_amount: data.ar_31_60,
      ap_amount: data.ap_31_60,
      ar_pct: ar_total > 0 ? data.ar_31_60 / ar_total : undefined,
      ap_pct: ap_total && ap_total > 0 ? data.ap_31_60! / ap_total : undefined,
    },
    {
      label: '2-3 Months',
      days: '61-90',
      ar_amount: data.ar_61_90,
      ap_amount: data.ap_61_90,
      ar_pct: ar_total > 0 ? data.ar_61_90 / ar_total : undefined,
      ap_pct: ap_total && ap_total > 0 ? data.ap_61_90! / ap_total : undefined,
    },
    {
      label: '90+ Days',
      days: '90+',
      ar_amount: data.ar_90_plus,
      ap_amount: data.ap_90_plus,
      ar_pct: ar_total > 0 ? data.ar_90_plus / ar_total : undefined,
      ap_pct: ap_total && ap_total > 0 ? data.ap_90_plus! / ap_total : undefined,
    },
  ];
}

function getRowClassName(days: string, has_anomaly: boolean): string {
  if (days === '90+' && has_anomaly) {
    return 'bg-red-50 dark:bg-red-950/20';
  }
  return '';
}

// ==============================================================================
// COMPONENT
// ==============================================================================

export interface ARAPAgingTableProps {
  data: ARAPAgingData;
  currency?: string;
  showAP?: boolean;
  className?: string;
}

export function ARAPAgingTable({
  data,
  currency = 'USD',
  showAP = true,
  className,
}: ARAPAgingTableProps) {
  const totals = calculateTotals(data);
  const buckets = buildAgingBuckets(data, totals);
  const hasAPData = totals.ap_total !== null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>AR/AP Aging Analysis</CardTitle>
        <CardDescription>{data.period}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Anomaly Alert */}
        {data.has_anomaly && data.anomaly_message && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{data.anomaly_message}</AlertDescription>
          </Alert>
        )}

        {/* Aging Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Aging Bucket</TableHead>
              <TableHead className="w-[100px]">Days</TableHead>
              <TableHead className="text-right">AR Amount</TableHead>
              {showAP && hasAPData && (
                <TableHead className="text-right">AP Amount</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {buckets.map((bucket) => (
              <TableRow
                key={bucket.days}
                className={getRowClassName(bucket.days, data.has_anomaly || false)}
              >
                <TableCell className="font-medium">{bucket.label}</TableCell>
                <TableCell className="text-muted-foreground">{bucket.days}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(bucket.ar_amount, currency)}{' '}
                  <span className="text-xs text-muted-foreground">
                    {formatPercentage(bucket.ar_pct)}
                  </span>
                </TableCell>
                {showAP && hasAPData && (
                  <TableCell className="text-right">
                    {formatCurrency(bucket.ap_amount, currency)}{' '}
                    <span className="text-xs text-muted-foreground">
                      {formatPercentage(bucket.ap_pct)}
                    </span>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {/* Total Row */}
            <TableRow className="border-t-2 font-semibold">
              <TableCell colSpan={2}>Total</TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.ar_total, currency)}
              </TableCell>
              {showAP && hasAPData && (
                <TableCell className="text-right">
                  {formatCurrency(totals.ap_total, currency)}
                </TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>

        {/* DSO/DPO Metrics */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Days Sales Outstanding</div>
            <div className="text-2xl font-bold mt-1">
              {data.dso !== null ? `${data.dso.toFixed(0)} days` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average time to collect receivables
            </p>
          </div>

          {showAP && hasAPData && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground">Days Payable Outstanding</div>
              <div className="text-2xl font-bold mt-1">
                {data.dpo !== null ? `${data.dpo.toFixed(0)} days` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Average time to pay suppliers
              </p>
            </div>
          )}
        </div>

        {/* Interpretation Note */}
        {!hasAPData && showAP && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            AP data not available for this period
          </p>
        )}
      </CardContent>
    </Card>
  );
}
