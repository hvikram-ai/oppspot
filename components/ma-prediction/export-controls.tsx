/**
 * Export Controls Component
 *
 * Dropdown menu for exporting M&A predictions
 * Part of T045 implementation
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportControlsProps {
  companyIds: string[];
  onExportStart?: () => void;
  onExportComplete?: () => void;
}

export default function ExportControls({
  companyIds,
  onExportStart,
  onExportComplete
}: ExportControlsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (companyIds.length === 0) {
      toast({
        title: 'No companies selected',
        description: 'Please select at least one company to export',
        variant: 'destructive'
      });
      return;
    }

    setIsExporting(true);
    onExportStart?.();

    try {
      const response = await fetch('/api/ma-predictions/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          company_ids: companyIds
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }

      // For CSV, download directly
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ma-predictions-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: 'Export successful',
          description: `Exported ${companyIds.length} predictions as CSV`
        });
      } else {
        // PDF/Excel - show message
        toast({
          title: 'Export not available',
          description: 'PDF and Excel exports are not yet implemented. Please use CSV.',
          variant: 'destructive'
        });
      }

      onExportComplete?.();
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || companyIds.length === 0}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export ({companyIds.length})
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          Export as PDF (Coming Soon)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          Export as Excel (Coming Soon)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
