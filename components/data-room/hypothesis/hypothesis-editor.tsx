'use client';

/**
 * Hypothesis Editor Component
 * Form dialog for creating/editing hypotheses
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, X } from 'lucide-react';
import { HypothesisType, Hypothesis, CreateHypothesisRequest } from '@/lib/data-room/types';
import { useToast } from '@/hooks/use-toast';

interface HypothesisEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataRoomId: string;
  hypothesisId?: string | null; // If provided, edit mode
  onSuccess?: (hypothesis: Hypothesis) => void;
}

const HYPOTHESIS_TYPES: { value: HypothesisType; label: string; description: string }[] = [
  {
    value: 'revenue_growth',
    label: 'Revenue Growth',
    description: 'Revenue expansion potential and growth opportunities',
  },
  {
    value: 'cost_synergy',
    label: 'Cost Synergy',
    description: 'Cost reduction and operational savings opportunities',
  },
  {
    value: 'market_expansion',
    label: 'Market Expansion',
    description: 'Market entry, geographic expansion, or new segments',
  },
  {
    value: 'tech_advantage',
    label: 'Tech Advantage',
    description: 'Technology capabilities, IP, or competitive advantages',
  },
  {
    value: 'team_quality',
    label: 'Team Quality',
    description: 'Leadership experience, team capabilities, and culture',
  },
  {
    value: 'competitive_position',
    label: 'Competitive Position',
    description: 'Market share, differentiation, and barriers to entry',
  },
  {
    value: 'operational_efficiency',
    label: 'Operational Efficiency',
    description: 'Process improvements, productivity, and automation',
  },
  {
    value: 'customer_acquisition',
    label: 'Customer Acquisition',
    description: 'CAC, LTV, conversion rates, and growth channels',
  },
  { value: 'custom', label: 'Custom', description: 'Define your own hypothesis type' },
];

export function HypothesisEditor({
  open,
  onOpenChange,
  dataRoomId,
  hypothesisId,
  onSuccess,
}: HypothesisEditorProps) {
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hypothesisType, setHypothesisType] = useState<HypothesisType>('revenue_growth');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const isEditMode = !!hypothesisId;

  // Load existing hypothesis in edit mode
  useEffect(() => {
    if (open && hypothesisId) {
      loadHypothesis(hypothesisId);
    } else if (open && !hypothesisId) {
      // Reset form for create mode
      resetForm();
    }
  }, [open, hypothesisId]);

  const loadHypothesis = async (id: string) => {
    setLoadingExisting(true);
    try {
      const response = await fetch(`/api/data-room/hypotheses/${id}`);
      const data = await response.json();

      if (data.success) {
        const hypothesis = data.data;
        setTitle(hypothesis.title);
        setDescription(hypothesis.description);
        setHypothesisType(hypothesis.hypothesis_type);
        setTags(hypothesis.tags || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load hypothesis',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load hypothesis',
        variant: 'destructive',
      });
    } finally {
      setLoadingExisting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setHypothesisType('revenue_growth');
    setTags([]);
    setTagInput('');
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title and description are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditMode) {
        // Update existing hypothesis
        const response = await fetch(`/api/data-room/hypotheses/${hypothesisId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            hypothesis_type: hypothesisType,
            tags,
          }),
        });

        const data = await response.json();

        if (data.success) {
          toast({
            title: 'Success',
            description: 'Hypothesis updated successfully',
          });
          onSuccess?.(data.data);
          onOpenChange(false);
        } else {
          throw new Error(data.error || 'Failed to update hypothesis');
        }
      } else {
        // Create new hypothesis
        const request: CreateHypothesisRequest = {
          data_room_id: dataRoomId,
          title,
          description,
          hypothesis_type: hypothesisType,
          tags,
        };

        const response = await fetch('/api/data-room/hypotheses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        const data = await response.json();

        if (data.success) {
          toast({
            title: 'Success',
            description: 'Hypothesis created successfully',
          });
          onSuccess?.(data.data);
          onOpenChange(false);
          resetForm();
        } else {
          throw new Error(data.error || 'Failed to create hypothesis');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Hypothesis' : 'Create New Hypothesis'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update your hypothesis details'
              : 'Define a hypothesis to test and validate with AI-powered document analysis'}
          </DialogDescription>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Revenue will grow 30% YoY through market expansion"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
                required
              />
              <p className="text-xs text-muted-foreground">{title.length}/255 characters</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Detailed explanation of your hypothesis, including assumptions, expected outcomes, and validation criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what you're testing and how you'll validate it
              </p>
            </div>

            {/* Hypothesis Type */}
            <div className="space-y-2">
              <Label htmlFor="hypothesis_type">
                Hypothesis Type <span className="text-destructive">*</span>
              </Label>
              <Select value={hypothesisType} onValueChange={(value) => setHypothesisType(value as HypothesisType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HYPOTHESIS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditMode ? 'Update Hypothesis' : 'Create Hypothesis'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
