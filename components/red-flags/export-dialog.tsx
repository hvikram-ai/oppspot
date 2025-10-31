'use client';

/**
 * Export Dialog Component
 *
 * Allows users to export red flags to CSV or PDF format.
 * Supports configuration options:
 * - Format selection (CSV or PDF)
 * - Include/exclude explainer text
 * - Include/exclude evidence
 * - Apply current filters
 *
 * Handles both synchronous and asynchronous exports.
 */

import { useState } from 'react';
import { useRedFlagsStore } from '@/lib/stores/red-flags-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, FileSpreadsheet, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Export Dialog Component
 */
export function ExportDialog() {
  const {
    isExportDialogOpen,
    closeExportDialog,
    filters,
    currentEntityId,
  } = useRedFlagsStore();

  // Export configuration state
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [includeExplainer, setIncludeExplainer] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [applyFilters, setApplyFilters] = useState(true);

  // Export status
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  /**
   * Handle export
   */
  const handleExport = async () => {
    if (!currentEntityId) return;

    setIsExporting(true);
    setExportError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      params.set('format', format);
      params.set('include_explainer', String(includeExplainer));
      params.set('include_evidence', String(includeEvidence));

      // Apply current filters if enabled
      if (applyFilters) {
        if (filters.category && filters.category.length > 0) {
          filters.category.forEach((c) => params.append('category', c));
        }
        if (filters.severity && filters.severity.length > 0) {
          filters.severity.forEach((s) => params.append('severity', s));
        }
        if (filters.status && filters.status.length > 0) {
          filters.status.forEach((st) => params.append('status', st));
        }
        if (filters.search) {
          params.set('search', filters.search);
        }
      }

      // Make export request
      const response = await fetch(
        `/api/companies/${currentEntityId}/red-flags/export?${params.toString()}`
      );

      // Handle different response statuses
      if (response.status === 202) {
        // Async export initiated
        const result = await response.json();
        alert(
          `Export is being processed. You'll receive a notification when it's ready. Export ID: ${result.export_id}`
        );
        closeExportDialog();
        return;
      }

      if (response.status === 413) {
        // Export too large
        const result = await response.json();
        setExportError(result.message || 'Export is too large for synchronous processing');
        return;
      }

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `red-flags-export-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Close dialog on success
      closeExportDialog();
    } catch (err) {
      console.error('[ExportDialog] Error:', err);
      setExportError('Failed to export red flags. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    setExportError(null);
    closeExportDialog();
  };

  return (
    <Dialog open={isExportDialogOpen} onOpenChange={closeExportDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Red Flags</DialogTitle>
          <DialogDescription>
            Download red flags in CSV or PDF format with customizable options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Format</Label>
            <div className="flex gap-2">
              <Button
                variant={format === 'csv' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormat('csv')}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant={format === 'pdf' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setFormat('pdf')}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Options</Label>

            {/* Include Explainer */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeExplainer"
                checked={includeExplainer}
                onCheckedChange={(checked) => setIncludeExplainer(checked as boolean)}
              />
              <label
                htmlFor="includeExplainer"
                className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include AI explanations and remediation guidance
              </label>
            </div>

            {/* Include Evidence */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeEvidence"
                checked={includeEvidence}
                onCheckedChange={(checked) => setIncludeEvidence(checked as boolean)}
                disabled={format === 'csv'}
              />
              <label
                htmlFor="includeEvidence"
                className={`text-sm cursor-pointer leading-none ${
                  format === 'csv' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Include evidence items
                {format === 'csv' && (
                  <span className="text-xs text-gray-500 ml-1">(PDF only)</span>
                )}
              </label>
            </div>

            {/* Apply Filters */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="applyFilters"
                checked={applyFilters}
                onCheckedChange={(checked) => setApplyFilters(checked as boolean)}
              />
              <label
                htmlFor="applyFilters"
                className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Apply current filters to export
              </label>
            </div>
          </div>

          {/* Filter Summary */}
          {applyFilters && (filters.category || filters.severity || filters.status || filters.search) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Export will include only flags matching your current filters:
                {filters.category && filters.category.length > 0 && (
                  <span className="block">Categories: {filters.category.join(', ')}</span>
                )}
                {filters.severity && filters.severity.length > 0 && (
                  <span className="block">Severity: {filters.severity.join(', ')}</span>
                )}
                {filters.status && filters.status.length > 0 && (
                  <span className="block">Status: {filters.status.join(', ')}</span>
                )}
                {filters.search && (
                  <span className="block">Search: {filters.search}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {exportError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{exportError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
