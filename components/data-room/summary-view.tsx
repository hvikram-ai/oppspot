'use client';

/**
 * Summary View Component
 *
 * Displays extracted summary with fields, values, confidence scores, and quality metrics
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, FileText, Calendar, Users } from 'lucide-react';
import type { GetSummaryResponse } from '@/lib/data-room/summaries/types';

interface SummaryViewProps {
  summary: GetSummaryResponse;
}

export function SummaryView({ summary }: SummaryViewProps) {
  const coveragePercent = Math.round(summary.summary.coverage * 100);
  const confidencePercent = Math.round(summary.summary.avg_confidence * 100);

  // Group issues by severity
  const highIssues = summary.qualityIssues.filter((i) => i.severity === 'high');
  const mediumIssues = summary.qualityIssues.filter((i) => i.severity === 'medium');
  const lowIssues = summary.qualityIssues.filter((i) => i.severity === 'low');

  return (
    <div className="space-y-6">
      {/* Quality Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {summary.template.title}
                <QualityBadge qualityPass={summary.summary.quality_pass} />
              </CardTitle>
              <CardDescription>
                {summary.template.description || `Extracted ${summary.fields.length} fields`}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              <Calendar className="inline h-4 w-4 mr-1" />
              {new Date(summary.summary.created_at).toLocaleDateString()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Coverage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Coverage</span>
                <span className="text-muted-foreground">{coveragePercent}%</span>
              </div>
              <Progress value={coveragePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {summary.fields.filter((f) => f.value !== null).length} of{' '}
                {summary.fields.filter((f) => f.field.required).length} required fields
              </p>
            </div>

            {/* Confidence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Confidence</span>
                <span className="text-muted-foreground">{confidencePercent}%</span>
              </div>
              <Progress value={confidencePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Average across all extracted fields
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quality Issues */}
      {summary.qualityIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quality Issues</CardTitle>
            <CardDescription>
              {summary.qualityIssues.length} issue(s) detected during extraction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {highIssues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  High Severity ({highIssues.length})
                </h4>
                {highIssues.map((issue) => (
                  <Alert key={issue.id} variant="destructive">
                    <AlertDescription>
                      <strong>{issue.field_key ? `${issue.field_key}: ` : ''}</strong>
                      {issue.issue}
                      {issue.remediation && (
                        <p className="mt-1 text-xs">→ {issue.remediation}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {mediumIssues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Medium Severity ({mediumIssues.length})
                </h4>
                {mediumIssues.map((issue) => (
                  <Alert key={issue.id}>
                    <AlertDescription>
                      <strong>{issue.field_key ? `${issue.field_key}: ` : ''}</strong>
                      {issue.issue}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {lowIssues.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-600 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Low Severity ({lowIssues.length})
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {lowIssues.map((issue) => (
                    <div key={issue.id}>• {issue.issue}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Field Values */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extracted Fields</CardTitle>
          <CardDescription>
            {summary.fields.filter((f) => f.value !== null).length} of {summary.fields.length}{' '}
            fields extracted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.fields.map((fieldData) => (
              <FieldRow
                key={fieldData.field.id}
                field={fieldData.field}
                value={fieldData.value}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Quality Badge Component
 */
function QualityBadge({ qualityPass }: { qualityPass: boolean }) {
  if (qualityPass) {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Pass
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      <XCircle className="h-3 w-3 mr-1" />
      Fail
    </Badge>
  );
}

/**
 * Field Row Component
 */
function FieldRow({
  field,
  value,
}: {
  field: GetSummaryResponse['fields'][0]['field'];
  value: GetSummaryResponse['fields'][0]['value'];
}) {
  const hasValue = value !== null && value.value_json !== null;

  return (
    <div className="grid grid-cols-3 gap-4 py-3 border-b last:border-0">
      {/* Field Name */}
      <div className="col-span-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {field.title}
            {field.required && <span className="text-red-500">*</span>}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {field.field_type}
          {field.description && (
            <span className="block mt-1">{field.description}</span>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="col-span-1">
        {hasValue ? (
          <div>
            <div className="text-sm">{formatValue(value!.value_json, field.field_type)}</div>
            {value!.raw_value && value!.raw_value !== String(value!.value_json) && (
              <div className="text-xs text-muted-foreground mt-1">
                Raw: {value!.raw_value}
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground italic">Not extracted</span>
        )}
      </div>

      {/* Metadata */}
      <div className="col-span-1 text-right space-y-1">
        {hasValue && (
          <>
            <ConfidenceBadge confidence={value!.confidence} />
            <div className="text-xs text-muted-foreground">
              via {value!.extraction_method}
              {value!.page_number && ` • Page ${value!.page_number}`}
            </div>
            {value!.evidence?.text && (
              <details className="text-xs text-left mt-2">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View evidence
                </summary>
                <div className="mt-2 p-2 bg-muted rounded text-xs">
                  {value!.evidence.text.substring(0, 200)}
                  {value!.evidence.text.length > 200 && '...'}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Confidence Badge Component
 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);

  let variant: 'default' | 'secondary' | 'destructive' = 'default';
  if (percent < 50) variant = 'destructive';
  else if (percent < 75) variant = 'secondary';

  return (
    <Badge variant={variant} className="text-xs">
      {percent}% confidence
    </Badge>
  );
}

/**
 * Format value for display
 */
function formatValue(value: unknown, fieldType: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (fieldType === 'date') {
    return new Date(String(value)).toLocaleDateString();
  }

  if (fieldType === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (fieldType === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }

  if (fieldType === 'duration' && typeof value === 'object' && value !== null) {
    const duration = value as { value: number; unit: string };
    return `${duration.value} ${duration.unit}`;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}
