'use client';

import React, { useState } from 'react';
import { FileText, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ESGMetric, ESGCategory } from '@/types/esg';
import { cn } from '@/lib/utils';

interface MetricsTableProps {
  metrics: ESGMetric[];
  onCitationClick?: (metric: ESGMetric) => void;
  title?: string;
  description?: string;
}

export default function MetricsTable({
  metrics,
  onCitationClick,
  title,
  description,
}: MetricsTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | ESGCategory>('all');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('all');

  // Filter metrics
  const filteredMetrics = metrics.filter((m) => {
    if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
    if (subcategoryFilter !== 'all' && m.subcategory !== subcategoryFilter) return false;
    return true;
  });

  // Get unique subcategories for current category filter
  const subcategories = Array.from(
    new Set(
      metrics
        .filter((m) => categoryFilter === 'all' || m.category === categoryFilter)
        .map((m) => m.subcategory)
        .filter(Boolean)
    )
  );

  const formatValue = (metric: ESGMetric) => {
    if (metric.value_numeric !== null) {
      return `${metric.value_numeric.toLocaleString()} ${metric.unit || ''}`.trim();
    }
    if (metric.value_boolean !== null) {
      return metric.value_boolean ? 'Yes' : 'No';
    }
    if (metric.value_text !== null) {
      return metric.value_text;
    }
    return 'N/A';
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (confidence === null) return null;

    if (confidence >= 0.8) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          High
        </Badge>
      );
    }
    if (confidence >= 0.5) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          Medium
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Low
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title || 'ESG Metrics'}</CardTitle>
            <CardDescription>
              {description || `Showing ${filteredMetrics.length} metrics with extracted data`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Category Filter */}
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value as 'all' | ESGCategory);
                setSubcategoryFilter('all');
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="environmental">Environmental</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="governance">Governance</SelectItem>
              </SelectContent>
            </Select>

            {/* Subcategory Filter */}
            {subcategories.length > 0 && (
              <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub} value={sub!}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredMetrics.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No metrics found matching the selected filters</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Benchmark</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMetrics.map((metric) => (
                  <TableRow key={metric.id}>
                    {/* Metric Name */}
                    <TableCell className="font-medium">
                      <div>
                        <p className="text-sm">{metric.metric_name}</p>
                        {metric.subcategory && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {metric.subcategory}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          metric.category === 'environmental' &&
                            'bg-green-50 text-green-700 border-green-200',
                          metric.category === 'social' &&
                            'bg-blue-50 text-blue-700 border-blue-200',
                          metric.category === 'governance' &&
                            'bg-purple-50 text-purple-700 border-purple-200'
                        )}
                      >
                        {metric.category.charAt(0).toUpperCase() + metric.category.slice(1)}
                      </Badge>
                    </TableCell>

                    {/* Value */}
                    <TableCell>
                      <span className="font-semibold">{formatValue(metric)}</span>
                    </TableCell>

                    {/* Benchmark Percentile */}
                    <TableCell>
                      {metric.benchmark_percentile !== null ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            metric.benchmark_percentile >= 75 &&
                              'bg-green-50 text-green-700 border-green-200',
                            metric.benchmark_percentile >= 25 &&
                              metric.benchmark_percentile < 75 &&
                              'bg-yellow-50 text-yellow-700 border-yellow-200',
                            metric.benchmark_percentile < 25 &&
                              'bg-red-50 text-red-700 border-red-200'
                          )}
                        >
                          P{metric.benchmark_percentile.toFixed(0)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </TableCell>

                    {/* Confidence */}
                    <TableCell>{getConfidenceBadge(metric.confidence)}</TableCell>

                    {/* Source */}
                    <TableCell>
                      {metric.source ? (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {metric.source.length > 30
                            ? `${metric.source.substring(0, 30)}...`
                            : metric.source}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No source</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      {metric.citation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCitationClick?.(metric)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View Citation
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Metrics</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {filteredMetrics.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">With Benchmarks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {filteredMetrics.filter((m) => m.benchmark_percentile !== null).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">High Confidence</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {filteredMetrics.filter((m) => m.confidence && m.confidence >= 0.8).length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
