'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, FileText, Table2, Presentation, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export interface ExportDialogProps {
  analysisId: string;
  analysisTitle: string;
}

type ExportFormat = 'pdf' | 'excel' | 'pptx';

/**
 * Dialog for selecting and downloading export format
 */
export function ExportDialog({ analysisId, analysisTitle }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const formats = [
    {
      value: 'pdf' as ExportFormat,
      label: 'PDF Report',
      description: 'Executive summary with all visualizations',
      icon: FileText,
      mimeType: 'application/pdf',
      extension: 'pdf',
    },
    {
      value: 'excel' as ExportFormat,
      label: 'Excel Spreadsheet',
      description: 'Feature matrix and pricing data',
      icon: Table2,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    },
    {
      value: 'pptx' as ExportFormat,
      label: 'PowerPoint',
      description: 'Editable charts and analysis',
      icon: Presentation,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: 'pptx',
    },
  ];

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const response = await fetch(
        `/api/competitive-analysis/${analysisId}/export?format=${selectedFormat}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Export failed');
      }

      // Get the blob
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename
      const format = formats.find((f) => f.value === selectedFormat);
      const date = new Date().toISOString().split('T')[0];
      const sanitizedTitle = analysisTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      link.download = `${sanitizedTitle}-${date}.${format?.extension}`;

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(url);

      toast.success('Export successful', {
        description: `${format?.label} downloaded successfully`,
      });

      setOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Analysis</DialogTitle>
          <DialogDescription>
            Choose a format to download your competitive analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={selectedFormat}
            onValueChange={(value) => setSelectedFormat(value as ExportFormat)}
          >
            {formats.map((format) => {
              const Icon = format.icon;
              return (
                <div
                  key={format.value}
                  className="flex items-start space-x-3 space-y-0 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedFormat(format.value)}
                >
                  <RadioGroupItem value={format.value} id={format.value} />
                  <div className="flex items-start space-x-3 flex-1">
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <Label
                        htmlFor={format.value}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {format.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{format.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </RadioGroup>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Export includes executive summary, feature matrix, pricing
              comparison, moat analysis, and data source citations. Target time: ~10 seconds.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
