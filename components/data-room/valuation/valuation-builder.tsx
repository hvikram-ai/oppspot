'use client';

/**
 * Valuation Builder Component
 *
 * Multi-step form for creating new valuations
 * Steps: 1) Basic info, 2) Data source, 3) Financial inputs, 4) Review
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const valuationSchema = z.object({
  model_name: z.string().min(1, 'Model name is required'),
  company_name: z.string().min(1, 'Company name is required'),
  currency: z.enum(['USD', 'GBP', 'EUR']),
  fiscal_year_end: z.string().optional(),

  // Data source
  source_documents: z.array(z.string()).optional(),
  extraction_method: z.enum(['manual', 'ai_extracted']),

  // Financial inputs (all optional - can be extracted)
  arr: z.number().positive().optional().or(z.literal('')),
  mrr: z.number().positive().optional().or(z.literal('')),
  revenue_growth_rate: z.number().optional().or(z.literal('')),
  gross_margin: z.number().min(0).max(100).optional().or(z.literal('')),
  net_revenue_retention: z.number().optional().or(z.literal('')),
  cac_payback_months: z.number().positive().optional().or(z.literal('')),
  burn_rate: z.number().optional().or(z.literal('')),
  runway_months: z.number().positive().optional().or(z.literal('')),
  ebitda: z.number().optional().or(z.literal('')),
  employees: z.number().int().positive().optional().or(z.literal('')),
});

type ValuationFormData = z.infer<typeof valuationSchema>;

interface ValuationBuilderProps {
  dataRoomId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (valuationId: string) => void;
  availableDocuments?: Array<{ id: string; filename: string }>;
}

export function ValuationBuilder({
  dataRoomId,
  open,
  onClose,
  onSuccess,
  availableDocuments = [],
}: ValuationBuilderProps) {
  const [step, setStep] = useState<'basic' | 'source' | 'inputs' | 'review'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);

  const form = useForm<ValuationFormData>({
    resolver: zodResolver(valuationSchema),
    defaultValues: {
      currency: 'USD',
      extraction_method: 'manual',
      arr: '' as any,
      mrr: '' as any,
      revenue_growth_rate: '' as any,
      gross_margin: '' as any,
      net_revenue_retention: '' as any,
      cac_payback_months: '' as any,
      burn_rate: '' as any,
      runway_months: '' as any,
      ebitda: '' as any,
      employees: '' as any,
    },
  });

  const onSubmit = async (data: ValuationFormData) => {
    setIsSubmitting(true);

    try {
      // Clean up empty string values
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== '' && v !== undefined)
      );

      const response = await fetch('/api/data-room/valuations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cleanedData,
          data_room_id: dataRoomId,
          source_documents: selectedDocs.length > 0 ? selectedDocs : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create valuation');
      }

      const result = await response.json();

      toast.success('Valuation created successfully', {
        description: `Range: ${result.valuation_range}`,
      });

      onSuccess(result.valuation_model_id);
      onClose();
      form.reset();
      setStep('basic');
      setSelectedDocs([]);
    } catch (error) {
      console.error('Create valuation error:', error);
      toast.error('Failed to create valuation', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progressValue = {
    basic: 25,
    source: 50,
    inputs: 75,
    review: 100,
  }[step];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Valuation Model</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {['basic', 'source', 'inputs', 'review'].indexOf(step) + 1} of 4</span>
              <span>{progressValue}%</span>
            </div>
            <Progress value={progressValue} />
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Basic Info */}
            {step === 'basic' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="model_name">Model Name</Label>
                  <Input
                    id="model_name"
                    placeholder="e.g., ITONICS Valuation Q4 2024"
                    {...form.register('model_name')}
                  />
                  {form.formState.errors.model_name && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.model_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    placeholder="e.g., ITONICS"
                    {...form.register('company_name')}
                  />
                  {form.formState.errors.company_name && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.company_name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={form.watch('currency')}
                      onValueChange={(value) => form.setValue('currency', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fiscal_year_end">Fiscal Year End (Optional)</Label>
                    <Input
                      id="fiscal_year_end"
                      type="date"
                      {...form.register('fiscal_year_end')}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={() => setStep('source')}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Data Source */}
            {step === 'source' && (
              <div className="space-y-4">
                <div>
                  <Label>How would you like to provide financial data?</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Button
                      type="button"
                      variant={form.watch('extraction_method') === 'manual' ? 'default' : 'outline'}
                      className="h-20"
                      onClick={() => form.setValue('extraction_method', 'manual')}
                    >
                      <div>
                        <div className="font-semibold">Manual Entry</div>
                        <div className="text-xs text-muted-foreground">Enter values manually</div>
                      </div>
                    </Button>
                    <Button
                      type="button"
                      variant={form.watch('extraction_method') === 'ai_extracted' ? 'default' : 'outline'}
                      className="h-20"
                      onClick={() => form.setValue('extraction_method', 'ai_extracted')}
                    >
                      <div>
                        <div className="font-semibold">AI Extraction</div>
                        <div className="text-xs text-muted-foreground">Extract from documents</div>
                      </div>
                    </Button>
                  </div>
                </div>

                {form.watch('extraction_method') === 'ai_extracted' && (
                  <div>
                    <Label>Select Documents</Label>
                    <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                      {availableDocuments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No documents available</p>
                      ) : (
                        availableDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={doc.id}
                              checked={selectedDocs.includes(doc.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDocs([...selectedDocs, doc.id]);
                                } else {
                                  setSelectedDocs(selectedDocs.filter((id) => id !== doc.id));
                                }
                              }}
                            />
                            <label htmlFor={doc.id} className="text-sm cursor-pointer">
                              {doc.filename}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep('basic')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button type="button" onClick={() => setStep('inputs')}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Financial Inputs */}
            {step === 'inputs' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {form.watch('extraction_method') === 'ai_extracted'
                    ? 'Optionally provide values (AI will extract from documents if left blank)'
                    : 'Enter financial metrics for valuation calculation'}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="arr">Annual Recurring Revenue (ARR)</Label>
                    <Input
                      id="arr"
                      type="number"
                      placeholder="e.g., 10000000"
                      {...form.register('arr', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="mrr">Monthly Recurring Revenue (MRR)</Label>
                    <Input
                      id="mrr"
                      type="number"
                      placeholder="e.g., 833333"
                      {...form.register('mrr', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="revenue_growth_rate">Revenue Growth Rate (%)</Label>
                    <Input
                      id="revenue_growth_rate"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 45.5"
                      {...form.register('revenue_growth_rate', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="gross_margin">Gross Margin (%)</Label>
                    <Input
                      id="gross_margin"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 75.0"
                      {...form.register('gross_margin', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="net_revenue_retention">Net Revenue Retention (%)</Label>
                    <Input
                      id="net_revenue_retention"
                      type="number"
                      step="0.1"
                      placeholder="e.g., 110.0"
                      {...form.register('net_revenue_retention', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cac_payback_months">CAC Payback (months)</Label>
                    <Input
                      id="cac_payback_months"
                      type="number"
                      placeholder="e.g., 12"
                      {...form.register('cac_payback_months', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep('source')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button type="button" onClick={() => setStep('review')}>
                    Review
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {step === 'review' && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold">Review Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Model Name:</span>
                      <span className="ml-2 font-medium">{form.watch('model_name')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Company:</span>
                      <span className="ml-2 font-medium">{form.watch('company_name')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Currency:</span>
                      <span className="ml-2 font-medium">{form.watch('currency')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Data Source:</span>
                      <span className="ml-2 font-medium">
                        {form.watch('extraction_method') === 'ai_extracted' ? 'AI Extraction' : 'Manual Entry'}
                      </span>
                    </div>
                  </div>
                  {selectedDocs.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Documents:</span>
                      <span className="ml-2 font-medium">{selectedDocs.length} selected</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep('inputs')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Create Valuation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
