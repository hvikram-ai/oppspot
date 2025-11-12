'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CategoryTiles from '@/components/esg/category-tiles';
import BenchmarkBars from '@/components/esg/benchmark-bars';
import MetricsTable from '@/components/esg/metrics-table';
import EvidencePanel from '@/components/esg/evidence-panel';
import type {
  ESGSummaryResponse,
  ESGMetric,
  ESGCategory,
} from '@/types/esg';

export default function ESGDashboardPage() {
  const params = useParams();
  const companyId = params.id as string;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<ESGSummaryResponse | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<ESGMetric | null>(null);
  const [evidencePanelOpen, setEvidencePanelOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ESGCategory | null>(null);

  // Fetch ESG summary data
  const fetchESGSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/companies/${companyId}/esg/summary?year=${selectedYear}`
      );

      if (!response.ok) {
        throw new Error('Failed to load ESG data');
      }

      const data = await response.json();
      setSummaryData(data);
    } catch (err) {
      console.error('ESG Dashboard Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ESG data');
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedYear]);

  useEffect(() => {
    fetchESGSummary();
  }, [fetchESGSummary]);

  const handleCitationClick = (metric: ESGMetric) => {
    setSelectedMetric(metric);
    setEvidencePanelOpen(true);
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch(
        `/api/companies/${companyId}/esg/report?year=${selectedYear}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate PDF report');
      }

      // Download PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ESG_Report_${companyId}_${selectedYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export Error:', err);
      alert('Failed to export PDF report. This feature is coming soon.');
    }
  };

  const handleRecompute = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/companies/${companyId}/esg/recompute?year=${selectedYear}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to recompute ESG scores');
      }

      // Refresh data
      await fetchESGSummary();
    } catch (err) {
      console.error('Recompute Error:', err);
      alert('Failed to recompute scores. This feature is coming soon.');
    } finally {
      setLoading(false);
    }
  };

  // Generate year options (current year - 5 to current year)
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  if (loading && !summaryData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading ESG data...</p>
        </div>
      </div>
    );
  }

  if (error && !summaryData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchESGSummary} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              ESG Benchmarking
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Environmental, Social, and Governance performance analysis
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Year Selector */}
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Recompute Button */}
            <Button variant="outline" onClick={handleRecompute} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recompute
            </Button>

            {/* Export PDF Button */}
            <Button onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        {summaryData && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {new Date(summaryData.last_updated).toLocaleString()}
          </p>
        )}
      </div>

      {summaryData ? (
        <div className="space-y-8">
          {/* Category Tiles */}
          <CategoryTiles
            scores={summaryData.category_scores}
            onCategoryClick={setSelectedCategory}
          />

          {/* Highlights */}
          {summaryData.highlights && summaryData.highlights.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summaryData.highlights.slice(0, 6).map((highlight, index) => (
                <Alert
                  key={index}
                  variant={highlight.type === 'strength' ? 'default' : 'destructive'}
                >
                  <AlertTitle className="text-sm font-semibold">
                    {highlight.type === 'strength' ? '✓ Strength' : '⚠ Area for Improvement'}
                  </AlertTitle>
                  <AlertDescription className="text-xs">{highlight.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Benchmark Comparison - Coming from /metrics endpoint */}
          <BenchmarkBars
            metrics={[]}  // TODO: Fetch from /api/companies/[id]/esg/metrics
            title="Key Metrics Benchmark Comparison"
            description="How your metrics compare to industry peers"
          />

          {/* Metrics Table */}
          <MetricsTable
            metrics={[]}  // TODO: Fetch from /api/companies/[id]/esg/metrics
            onCitationClick={handleCitationClick}
            title="All ESG Metrics"
            description={`Detailed metrics for ${selectedYear}`}
          />

          {/* Evidence Panel */}
          <EvidencePanel
            metric={selectedMetric}
            isOpen={evidencePanelOpen}
            onClose={() => setEvidencePanelOpen(false)}
            onViewDocument={(docId, page) => {
              // TODO: Integrate with document viewer
              console.log('View document:', docId, 'page:', page);
            }}
          />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No ESG data available for {selectedYear}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Upload ESG reports and sustainability documents to generate insights
          </p>
        </div>
      )}
    </div>
  );
}
