'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { CreateCompetitiveAnalysis } from '@/lib/competitive-analysis/types';

export interface CreateAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for creating a new competitive analysis
 * Validates inputs and submits to API
 */
export function CreateAnalysisDialog({ open, onOpenChange }: CreateAnalysisDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateCompetitiveAnalysis>>({
    title: '',
    target_company_name: '',
    target_company_website: '',
    description: '',
    market_segment: '',
    geography: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const newErrors: Record<string, string> = {};

    if (!formData.title || formData.title.trim().length === 0) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!formData.target_company_name || formData.target_company_name.trim().length === 0) {
      newErrors.target_company_name = 'Target company name is required';
    } else if (formData.target_company_name.length > 200) {
      newErrors.target_company_name = 'Company name must be less than 200 characters';
    }

    if (formData.target_company_website && formData.target_company_website.trim().length > 0) {
      try {
        const url = new URL(formData.target_company_website);
        if (!url.protocol.startsWith('http')) {
          newErrors.target_company_website = 'Website must be a valid HTTP(S) URL';
        }
      } catch {
        newErrors.target_company_website = 'Website must be a valid URL';
      }
    }

    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle API errors
        if (data.code === 'VALIDATION_ERROR' && data.details) {
          const apiErrors: Record<string, string> = {};
          data.details.forEach((issue: any) => {
            if (issue.path && issue.path.length > 0) {
              apiErrors[issue.path[0]] = issue.message;
            }
          });
          setErrors(apiErrors);
          toast.error('Validation failed', {
            description: 'Please check the form for errors',
          });
          return;
        }

        throw new Error(data.error || 'Failed to create analysis');
      }

      toast.success('Analysis created', {
        description: 'Redirecting to your new analysis...',
      });

      // Reset form
      setFormData({
        title: '',
        target_company_name: '',
        target_company_website: '',
        description: '',
        market_segment: '',
        geography: '',
      });

      // Close dialog
      onOpenChange(false);

      // Redirect to the new analysis
      router.push(`/competitive-intelligence/${data.id}`);
    } catch (error) {
      console.error('Error creating analysis:', error);
      toast.error('Failed to create analysis', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof CreateCompetitiveAnalysis, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Competitive Analysis</DialogTitle>
          <DialogDescription>
            Start tracking a new competitor landscape for your product or service
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Analysis Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Q3 2024 SaaS Analytics Competitive Analysis"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              maxLength={200}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.title?.length || 0}/200 characters
            </p>
          </div>

          {/* Target Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company-name">
              Target Company Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company-name"
              placeholder="Acme Analytics Inc."
              value={formData.target_company_name || ''}
              onChange={(e) => handleInputChange('target_company_name', e.target.value)}
              maxLength={200}
            />
            {errors.target_company_name && (
              <p className="text-sm text-destructive">{errors.target_company_name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The company you want to analyze
            </p>
          </div>

          {/* Target Company Website */}
          <div className="space-y-2">
            <Label htmlFor="company-website">Target Company Website</Label>
            <Input
              id="company-website"
              type="url"
              placeholder="https://acmeanalytics.com"
              value={formData.target_company_website || ''}
              onChange={(e) => handleInputChange('target_company_website', e.target.value)}
              maxLength={500}
            />
            {errors.target_company_website && (
              <p className="text-sm text-destructive">{errors.target_company_website}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Used for AI-powered data gathering
            </p>
          </div>

          {/* Market Segment */}
          <div className="space-y-2">
            <Label htmlFor="market-segment">Market Segment</Label>
            <Input
              id="market-segment"
              placeholder="B2B SaaS Analytics"
              value={formData.market_segment || ''}
              onChange={(e) => handleInputChange('market_segment', e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              E.g., "B2B SaaS", "E-commerce", "Fintech"
            </p>
          </div>

          {/* Geography */}
          <div className="space-y-2">
            <Label htmlFor="geography">Primary Geography</Label>
            <Input
              id="geography"
              placeholder="Global, North America, EMEA, etc."
              value={formData.geography || ''}
              onChange={(e) => handleInputChange('geography', e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Main geographic market focus
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Competitive landscape analysis for our new analytics product launch in Q3 2024. Focus on feature parity, pricing strategy, and market positioning against top 5-7 competitors."
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              maxLength={2000}
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.description?.length || 0}/2000 characters
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Analysis'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
