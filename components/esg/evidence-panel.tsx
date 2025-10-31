'use client';

import React from 'react';
import { FileText, ExternalLink, X, AlertCircle, CheckCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ESGMetric, ESGCitation } from '@/types/esg';
import { cn } from '@/lib/utils';

interface EvidencePanelProps {
  metric: ESGMetric | null;
  isOpen: boolean;
  onClose: () => void;
  onViewDocument?: (documentId: string, pageNumber?: number) => void;
}

export default function EvidencePanel({
  metric,
  isOpen,
  onClose,
  onViewDocument,
}: EvidencePanelProps) {
  if (!metric) return null;

  const citation = metric.citation as ESGCitation | null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl">{metric.metric_name}</SheetTitle>
              <SheetDescription className="mt-1">
                {metric.category} • {metric.subcategory}
              </SheetDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Metric Value */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Extracted Value
            </h3>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {metric.value_numeric !== null && metric.value_numeric.toLocaleString()}
                  {metric.value_boolean !== null && (metric.value_boolean ? 'Yes' : 'No')}
                  {metric.value_text !== null && metric.value_text}
                </span>
                {metric.unit && (
                  <span className="text-lg text-blue-700 dark:text-blue-300">{metric.unit}</span>
                )}
              </div>
            </div>
          </div>

          {/* Confidence Score */}
          {metric.confidence !== null && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Extraction Confidence
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      metric.confidence >= 0.8 && 'bg-green-500',
                      metric.confidence >= 0.5 &&
                        metric.confidence < 0.8 &&
                        'bg-yellow-500',
                      metric.confidence < 0.5 && 'bg-red-500'
                    )}
                    style={{ width: `${metric.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">
                  {(metric.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {metric.confidence >= 0.8 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-700 dark:text-green-400">
                      High confidence - Data is well-documented
                    </span>
                  </>
                ) : metric.confidence >= 0.5 ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-yellow-700 dark:text-yellow-400">
                      Medium confidence - May require verification
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-xs text-red-700 dark:text-red-400">
                      Low confidence - Manual review recommended
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Citation/Source */}
          {citation && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Source Citation
              </h3>

              {/* Document Reference */}
              {citation.document_id && (
                <div className="mb-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Document ID: {citation.document_id.substring(0, 8)}...
                        </p>
                        {citation.page_number && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Page {citation.page_number}
                            {citation.chunk_index !== undefined && ` • Chunk ${citation.chunk_index}`}
                          </p>
                        )}
                      </div>
                    </div>
                    {onViewDocument && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onViewDocument(citation.document_id!, citation.page_number)
                        }
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Excerpt */}
              {citation.excerpt && (
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Excerpt from Source:
                  </p>
                  <blockquote className="p-4 bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-500 rounded-r-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                      {citation.excerpt}
                    </p>
                  </blockquote>
                </div>
              )}
            </div>
          )}

          {/* Additional Metadata */}
          {metric.source && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Additional Information
              </h3>
              <dl className="space-y-2">
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600 dark:text-gray-400">Source:</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{metric.source}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-gray-600 dark:text-gray-400">Period Year:</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {metric.period_year}
                  </dd>
                </div>
                {metric.benchmark_percentile !== null && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-600 dark:text-gray-400">Benchmark Percentile:</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {metric.benchmark_percentile.toFixed(0)}th
                    </dd>
                  </div>
                )}
                {metric.benchmark_sector && (
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-600 dark:text-gray-400">Benchmark Sector:</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {metric.benchmark_sector}
                      {metric.benchmark_size_band && ` (${metric.benchmark_size_band})`}
                      {metric.benchmark_region && ` • ${metric.benchmark_region}`}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Timestamps */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Created: {new Date(metric.created_at).toLocaleString()}
            </p>
            {metric.updated_at !== metric.created_at && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Updated: {new Date(metric.updated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
