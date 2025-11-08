'use client';

/**
 * Summary Run Button Component
 *
 * Triggers summary extraction for a document
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Play, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { SummaryTemplate } from '@/lib/data-room/summaries/types';

interface SummaryRunButtonProps {
  documentId: string;
  templates: SummaryTemplate[];
  onRunStarted?: (runId: string) => void;
  disabled?: boolean;
}

export function SummaryRunButton({
  documentId,
  templates,
  onRunStarted,
  disabled,
}: SummaryRunButtonProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [force, setForce] = useState(false);

  const handleRun = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setRunning(true);

    try {
      const response = await fetch('/api/data-room/summaries/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          templateKey: selectedTemplate,
          force,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run summary');
      }

      toast.success('Summary extraction started', {
        description: `Run ID: ${data.runId}`,
      });

      setOpen(false);
      onRunStarted?.(data.runId);
    } catch (error) {
      console.error('[SummaryRunButton] Run failed:', error);
      toast.error('Failed to run summary', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" disabled={disabled}>
          <Sparkles className="h-4 w-4 mr-2" />
          Run Summary
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run Summary Extraction</DialogTitle>
          <DialogDescription>
            Extract structured key points from this document using AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.key}>
                    <div className="flex flex-col">
                      <span className="font-medium">{template.title}</span>
                      {template.description && (
                        <span className="text-xs text-muted-foreground">
                          {template.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the template that best matches your document type
            </p>
          </div>

          {/* Force Re-run */}
          <div className="flex items-center space-x-2">
            <Checkbox id="force" checked={force} onCheckedChange={(checked) => setForce(!!checked)} />
            <Label
              htmlFor="force"
              className="text-sm font-normal cursor-pointer"
            >
              Force re-run (re-extract even if summary exists)
            </Label>
          </div>

          {/* Template Info */}
          {selectedTemplate && templates.find((t) => t.key === selectedTemplate) && (
            <div className="p-3 bg-muted rounded-md space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quality thresholds:</span>
                <span>
                  {Math.round(
                    templates.find((t) => t.key === selectedTemplate)!.required_coverage * 100
                  )}
                  % coverage,{' '}
                  {Math.round(
                    templates.find((t) => t.key === selectedTemplate)!.min_confidence * 100
                  )}
                  % confidence
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={running || !selectedTemplate}>
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Extraction
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
