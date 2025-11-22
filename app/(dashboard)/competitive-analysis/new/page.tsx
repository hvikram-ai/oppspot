'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StepIndicator } from '@/components/ui/simple-step-indicator';

/**
 * Multi-step wizard for creating a new competitive analysis
 */
export default function NewAnalysisPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Target Company
    targetCompanyName: '',
    targetCompanyWebsite: '',
    targetCompanyDescription: '',

    // Step 2: Analysis Settings
    title: '',
    marketSegment: '',
    geographicFocus: '',
    targetCompanyRepresentativePrice: '',

    // Step 3: Initial Competitors (optional)
    competitors: [
      { name: '', website: '' },
      { name: '', website: '' },
      { name: '', website: '' },
    ],
  });

  const updateFormData = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateCompetitor = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      competitors: prev.competitors.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }));
  };

  const addCompetitor = () => {
    setFormData((prev) => ({
      ...prev,
      competitors: [...prev.competitors, { name: '', website: '' }],
    }));
  };

  const removeCompetitor = (index: number) => {
    if (formData.competitors.length > 1) {
      setFormData((prev) => ({
        ...prev,
        competitors: prev.competitors.filter((_, i) => i !== index),
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.targetCompanyName) {
          toast.error('Target company name is required');
          return false;
        }
        return true;
      case 2:
        if (!formData.title) {
          toast.error('Analysis title is required');
          return false;
        }
        return true;
      case 3:
        return true; // Optional step
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(3, s + 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setLoading(true);

    try {
      // Create analysis
      const response = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          target_company_name: formData.targetCompanyName,
          target_company_website: formData.targetCompanyWebsite,
          target_company_description: formData.targetCompanyDescription,
          market_segment: formData.marketSegment || null,
          geographic_focus: formData.geographicFocus || null,
          target_company_representative_price: formData.targetCompanyRepresentativePrice
            ? parseFloat(formData.targetCompanyRepresentativePrice)
            : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create analysis');
      }

      const analysis = await response.json();

      // Add competitors if any
      const validCompetitors = formData.competitors.filter((c) => c.name.trim());

      if (validCompetitors.length > 0) {
        await Promise.all(
          validCompetitors.map((competitor) =>
            fetch(`/api/competitive-analysis/${analysis.id}/competitors`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                competitor_name: competitor.name,
                competitor_website: competitor.website || null,
              }),
            })
          )
        );
      }

      toast.success('Analysis created successfully');
      router.push(`/competitive-analysis/${analysis.id}`);
    } catch (error) {
      console.error('Error creating analysis:', error);
      toast.error('Failed to create analysis', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Target Company', description: 'Company to analyze' },
    { number: 2, title: 'Analysis Settings', description: 'Configuration' },
    { number: 3, title: 'Competitors', description: 'Optional' },
  ];

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Competitive Analysis</CardTitle>
          <CardDescription>
            Set up a new competitive intelligence analysis in 3 simple steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step Indicator */}
          <StepIndicator steps={steps} currentStep={currentStep} />

          {/* Step 1: Target Company */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetCompanyName">
                  Target Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="targetCompanyName"
                  placeholder="e.g., Acme Corp"
                  value={formData.targetCompanyName}
                  onChange={(e) => updateFormData('targetCompanyName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetCompanyWebsite">Website</Label>
                <Input
                  id="targetCompanyWebsite"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.targetCompanyWebsite}
                  onChange={(e) => updateFormData('targetCompanyWebsite', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetCompanyDescription">Description</Label>
                <Textarea
                  id="targetCompanyDescription"
                  placeholder="Brief description of the target company..."
                  rows={4}
                  value={formData.targetCompanyDescription}
                  onChange={(e) => updateFormData('targetCompanyDescription', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Analysis Settings */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Analysis Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Q1 2025 Competitive Analysis"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketSegment">Market Segment</Label>
                <Input
                  id="marketSegment"
                  placeholder="e.g., Enterprise SaaS, E-commerce"
                  value={formData.marketSegment}
                  onChange={(e) => updateFormData('marketSegment', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="geographicFocus">Geographic Focus</Label>
                <Select
                  value={formData.geographicFocus}
                  onValueChange={(v) => updateFormData('geographicFocus', v)}
                >
                  <SelectTrigger id="geographicFocus">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="north-america">North America</SelectItem>
                    <SelectItem value="europe">Europe</SelectItem>
                    <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
                    <SelectItem value="latin-america">Latin America</SelectItem>
                    <SelectItem value="middle-east-africa">Middle East & Africa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Representative Price (Optional)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g., 99.99"
                  value={formData.targetCompanyRepresentativePrice}
                  onChange={(e) =>
                    updateFormData('targetCompanyRepresentativePrice', e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Monthly price for pricing comparisons
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Initial Competitors */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Add Competitors (Optional)</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You can add competitors now or later from the analysis dashboard
                </p>
              </div>

              {formData.competitors.map((competitor, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Competitor {index + 1}</Label>
                      {formData.competitors.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCompetitor(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Company name"
                      value={competitor.name}
                      onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                    />
                    <Input
                      type="url"
                      placeholder="Website (optional)"
                      value={competitor.website}
                      onChange={(e) => updateCompetitor(index, 'website', e.target.value)}
                    />
                  </div>
                </Card>
              ))}

              <Button variant="outline" onClick={addCompetitor} className="w-full">
                Add Another Competitor
              </Button>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || loading}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={loading}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  'Creating...'
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Analysis
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
