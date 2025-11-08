'use client';

/**
 * Summary Export Controls Component
 *
 * Provides export functionality for summaries in multiple formats
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ExportFormat } from '@/lib/data-room/summaries/types';

interface SummaryExportControlsProps {
  summaryId: string;
  disabled?: boolean;
}

export function SummaryExportControls({ summaryId, disabled }: SummaryExportControlsProps) {
  const [exporting, setExporting] = useState(false);
  const [includeConfidence, setIncludeConfidence] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [includeQualityIssues, setIncludeQualityIssues] = useState(true);

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);

    try {
      // Build query params
      const params = new URLSearchParams({
        format,
        include_confidence: String(includeConfidence),
        include_evidence: String(includeEvidence),
        include_quality_issues: String(includeQualityIssues),
      });

      // Open export URL in new window (triggers download)
      window.open(`/api/data-room/summaries/${summaryId}/export?${params.toString()}`, '_blank');

      toast.success(`Exporting summary as ${format.toUpperCase()}`, {
        description: 'Download will start shortly',
      });
    } catch (error) {
      console.error('[SummaryExportControls] Export failed:', error);
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled || exporting}>
          {exporting ? (
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="h-4 w-4 mr-2" />
          JSON
          <span className="ml-auto text-xs text-muted-foreground">Complete data</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport('xlsx')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
          <span className="ml-auto text-xs text-muted-foreground">Spreadsheet</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => handleExport('docx')}>
          <FileText className="h-4 w-4 mr-2" />
          Word
          <span className="ml-auto text-xs text-muted-foreground">Document</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">Export Options</DropdownMenuLabel>

        <DropdownMenuCheckboxItem
          checked={includeConfidence}
          onCheckedChange={setIncludeConfidence}
        >
          Include confidence scores
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={includeEvidence}
          onCheckedChange={setIncludeEvidence}
        >
          Include evidence citations
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={includeQualityIssues}
          onCheckedChange={setIncludeQualityIssues}
        >
          Include quality issues
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
