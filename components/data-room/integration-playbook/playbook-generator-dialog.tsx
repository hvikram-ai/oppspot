'use client';

/**
 * Integration Playbook Generator Dialog
 * Multi-step wizard to create a new integration playbook
 */

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, Calendar, Target, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DealType } from '@/lib/data-room/types';

interface PlaybookGeneratorDialogProps {
  dataRoomId: string;
  onSuccess?: (playbookId: string) => void;
}

export function PlaybookGeneratorDialog({
  dataRoomId,
  onSuccess,
}: PlaybookGeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Form state
  const [playbookName, setPlaybookName] = useState('');
  const [dealType, setDealType] = useState<DealType>('acquisition');
  const [dealRationale, setDealRationale] = useState('');
  const [integrationObjectives, setIntegrationObjectives] = useState<string[]>([]);
  const [targetCloseDate, setTargetCloseDate] = useState('');
  const [useTechStack, setUseTechStack] = useState(true);
  const [useHypotheses, setUseHypotheses] = useState(true);
  const [includeQuickWins, setIncludeQuickWins] = useState(true);
  const [customObjectives, setCustomObjectives] = useState('');

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/data-room/${dataRoomId}/integration-playbook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbook_name: playbookName,
          deal_type: dealType,
          deal_rationale: dealRationale,
          integration_objectives: integrationObjectives,
          target_close_date: targetCloseDate || null,
          use_tech_stack_analysis: useTechStack,
          use_deal_hypotheses: useHypotheses,
          include_quick_wins: includeQuickWins,
          custom_objectives: customObjectives || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate playbook');
      }

      toast.success('Integration playbook generated successfully!', {
        description: `${result.data.activities?.length || 0} activities created`,
      });

      setOpen(false);
      resetForm();

      if (onSuccess && result.data.playbook) {
        onSuccess(result.data.playbook.id);
      }
    } catch (error) {
      console.error('Playbook generation error:', error);
      toast.error('Failed to generate playbook', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setPlaybookName('');
    setDealType('acquisition');
    setDealRationale('');
    setIntegrationObjectives([]);
    setTargetCloseDate('');
    setUseTechStack(true);
    setUseHypotheses(true);
    setIncludeQuickWins(true);
    setCustomObjectives('');
  };

  const isStep1Valid = playbookName.length > 0 && dealType;
  const isStep2Valid = dealRationale.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Integration Playbook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Integration Playbook</DialogTitle>
          <DialogDescription>
            AI-powered 100-day M&A integration plan in 30 seconds
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
            </div>
            <span className="text-sm font-medium">Deal Info</span>
          </div>
          <div className="h-px bg-gray-300 flex-1 mx-2" />
          <div className="flex items-center space-x-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              {step > 2 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
            </div>
            <span className="text-sm font-medium">Objectives</span>
          </div>
          <div className="h-px bg-gray-300 flex-1 mx-2" />
          <div className="flex items-center space-x-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className="text-sm font-medium">Options</span>
          </div>
        </div>

        {/* Step 1: Deal Information */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="playbook-name">Playbook Name *</Label>
              <Input
                id="playbook-name"
                placeholder="e.g., Acme Corp Acquisition Integration"
                value={playbookName}
                onChange={(e) => setPlaybookName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="deal-type">Deal Type *</Label>
              <Select value={dealType} onValueChange={(value) => setDealType(value as DealType)}>
                <SelectTrigger id="deal-type">
                  <SelectValue placeholder="Select deal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acquisition">Acquisition</SelectItem>
                  <SelectItem value="merger">Merger</SelectItem>
                  <SelectItem value="divestiture">Divestiture</SelectItem>
                  <SelectItem value="carveout">Carve-out</SelectItem>
                  <SelectItem value="joint_venture">Joint Venture</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="target-close-date">Target Close Date (Optional)</Label>
              <Input
                id="target-close-date"
                type="date"
                value={targetCloseDate}
                onChange={(e) => setTargetCloseDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Deal Rationale & Objectives */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="deal-rationale">Deal Rationale *</Label>
              <Textarea
                id="deal-rationale"
                placeholder="Why is this deal strategic? What value does it create?"
                value={dealRationale}
                onChange={(e) => setDealRationale(e.target.value)}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="custom-objectives">Custom Integration Objectives (Optional)</Label>
              <Textarea
                id="custom-objectives"
                placeholder="e.g., Consolidate engineering teams by Q2, Achieve $5M cost synergies in Year 1"
                value={customObjectives}
                onChange={(e) => setCustomObjectives(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                One objective per line. AI will incorporate these into the playbook.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Generation Options */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Data Sources</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-tech-stack"
                    checked={useTechStack}
                    onCheckedChange={(checked) => setUseTechStack(checked as boolean)}
                  />
                  <label
                    htmlFor="use-tech-stack"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Use Tech Stack Analysis
                  </label>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  Incorporate technical findings and integration recommendations
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-hypotheses"
                    checked={useHypotheses}
                    onCheckedChange={(checked) => setUseHypotheses(checked as boolean)}
                  />
                  <label
                    htmlFor="use-hypotheses"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Use Deal Hypotheses
                  </label>
                </div>
                <p className="text-xs text-gray-500 ml-6">
                  Align activities with validated deal hypotheses
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Generation Options</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-quick-wins"
                  checked={includeQuickWins}
                  onCheckedChange={(checked) => setIncludeQuickWins(checked as boolean)}
                />
                <label
                  htmlFor="include-quick-wins"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include Quick Wins (Day 1-30)
                </label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Identify 3-5 quick wins to build momentum
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-3">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">AI-Powered Generation</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Claude Sonnet 3.5 will analyze your data room and generate a customized
                    100-day integration plan with 40-50 activities, synergies, risks, and KPIs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                Back
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Playbook
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
