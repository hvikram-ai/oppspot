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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2, Globe, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { CompetitorCompany, RelationshipType, ThreatLevel } from '@/lib/competitive-analysis/types';

export interface CompetitorManagementProps {
  analysisId: string;
  competitors: CompetitorCompany[];
  onUpdate: () => void;
}

/**
 * Component for adding and removing competitors
 * Displays competitor table with add/delete controls
 */
export function CompetitorManagement({
  analysisId,
  competitors,
  onUpdate,
}: CompetitorManagementProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    competitor_name: '',
    competitor_website: '',
    relationship_type: 'direct_competitor' as RelationshipType,
    threat_level: 'medium' as ThreatLevel,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.competitor_name || formData.competitor_name.trim().length === 0) {
      newErrors.competitor_name = 'Competitor name is required';
    } else if (formData.competitor_name.length > 200) {
      newErrors.competitor_name = 'Name must be less than 200 characters';
    }

    if (formData.competitor_website && formData.competitor_website.trim().length > 0) {
      try {
        const url = new URL(formData.competitor_website);
        if (!url.protocol.startsWith('http')) {
          newErrors.competitor_website = 'Website must be a valid HTTP(S) URL';
        }
      } catch {
        newErrors.competitor_website = 'Website must be a valid URL';
      }
    }

    if (formData.notes && formData.notes.length > 1000) {
      newErrors.notes = 'Notes must be less than 1000 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch(`/api/competitive-analysis/${analysisId}/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
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

        throw new Error(data.error || 'Failed to add competitor');
      }

      toast.success('Competitor added', {
        description: `${formData.competitor_name} has been added to the analysis`,
      });

      // Reset form
      setFormData({
        competitor_name: '',
        competitor_website: '',
        relationship_type: 'direct_competitor',
        threat_level: 'medium',
        notes: '',
      });

      setShowAddDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding competitor:', error);
      toast.error('Failed to add competitor', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompetitor = async (competitorId: string, competitorName: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${competitorName} from this analysis? All associated data will be deleted.`
      )
    ) {
      return;
    }

    setDeletingId(competitorId);

    try {
      const response = await fetch(
        `/api/competitive-analysis/${analysisId}/competitors/${competitorId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove competitor');
      }

      toast.success('Competitor removed', {
        description: `${competitorName} has been removed from the analysis`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error removing competitor:', error);
      toast.error('Failed to remove competitor', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getThreatBadge = (threatLevel: string | null | undefined) => {
    if (!threatLevel) return null;

    const variants: Record<string, any> = {
      low: 'outline',
      medium: 'secondary',
      high: 'default',
      critical: 'destructive',
    };

    return (
      <Badge variant={variants[threatLevel] || 'outline'}>
        {threatLevel === 'critical' && <AlertTriangle className="mr-1 h-3 w-3" />}
        {threatLevel}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Competitor Management</CardTitle>
              <CardDescription>
                Add and manage competitors for this analysis
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Competitor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Competitor</DialogTitle>
                  <DialogDescription>
                    Add a new competitor to track in this analysis
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleAddCompetitor} className="space-y-4 py-4">
                  {/* Competitor Name */}
                  <div className="space-y-2">
                    <Label htmlFor="competitor-name">
                      Competitor Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="competitor-name"
                      placeholder="Competitor Inc."
                      value={formData.competitor_name}
                      onChange={(e) => handleInputChange('competitor_name', e.target.value)}
                      maxLength={200}
                    />
                    {errors.competitor_name && (
                      <p className="text-sm text-destructive">{errors.competitor_name}</p>
                    )}
                  </div>

                  {/* Competitor Website */}
                  <div className="space-y-2">
                    <Label htmlFor="competitor-website">Website</Label>
                    <Input
                      id="competitor-website"
                      type="url"
                      placeholder="https://competitor.com"
                      value={formData.competitor_website}
                      onChange={(e) => handleInputChange('competitor_website', e.target.value)}
                      maxLength={500}
                    />
                    {errors.competitor_website && (
                      <p className="text-sm text-destructive">{errors.competitor_website}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Used for AI-powered data gathering
                    </p>
                  </div>

                  {/* Relationship Type */}
                  <div className="space-y-2">
                    <Label htmlFor="relationship-type">Relationship Type</Label>
                    <Select
                      value={formData.relationship_type}
                      onValueChange={(v) => handleInputChange('relationship_type', v)}
                    >
                      <SelectTrigger id="relationship-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct_competitor">Direct Competitor</SelectItem>
                        <SelectItem value="adjacent_market">Adjacent Market</SelectItem>
                        <SelectItem value="potential_threat">Potential Threat</SelectItem>
                        <SelectItem value="substitute">Substitute Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Threat Level */}
                  <div className="space-y-2">
                    <Label htmlFor="threat-level">Threat Level</Label>
                    <Select
                      value={formData.threat_level}
                      onValueChange={(v) => handleInputChange('threat_level', v)}
                    >
                      <SelectTrigger id="threat-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional context about this competitor..."
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      maxLength={1000}
                      rows={3}
                    />
                    {errors.notes && <p className="text-sm text-destructive">{errors.notes}</p>}
                    <p className="text-xs text-muted-foreground">
                      {formData.notes.length}/1000 characters
                    </p>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Competitor'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {competitors.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground mb-4">No competitors added yet</p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Competitor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitors.map((competitor) => (
                  <TableRow key={competitor.id}>
                    <TableCell className="font-medium">{competitor.name}</TableCell>
                    <TableCell>
                      {competitor.website ? (
                        <a
                          href={competitor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center"
                        >
                          <Globe className="mr-1 h-3 w-3" />
                          {new URL(competitor.website).hostname}
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {competitor.industry || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {competitor.company_size_band ? (
                        <Badge variant="outline">{competitor.company_size_band}</Badge>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCompetitor(competitor.id, competitor.name)}
                        disabled={deletingId === competitor.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {deletingId === competitor.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
