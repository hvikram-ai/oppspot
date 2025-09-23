'use client';

import { useState, useEffect } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Stakeholder } from '@/lib/stakeholder-tracking/types/stakeholder';

interface StakeholderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stakeholder?: Stakeholder | null;
  companyId: string;
  onSuccess?: (stakeholder: Stakeholder) => void;
}

export function StakeholderDialog({
  open,
  onOpenChange,
  stakeholder,
  companyId,
  onSuccess
}: StakeholderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    department: '',
    email: '',
    phone: '',
    linkedin_url: '',
    role_type: 'neutral' as Stakeholder['role_type'],
    influence_level: 5,
    decision_authority: false,
    budget_authority: false,
    relationship_status: 'not_contacted' as Stakeholder['relationship_status'],
    engagement_score: 50,
    champion_score: 0,
    champion_status: 'potential' as Stakeholder['champion_status'],
    notes: '',
    tags: [] as string[]
  });

  useEffect(() => {
    if (stakeholder) {
      setFormData({
        name: stakeholder.name || '',
        title: stakeholder.title || '',
        department: stakeholder.department || '',
        email: stakeholder.email || '',
        phone: stakeholder.phone || '',
        linkedin_url: stakeholder.linkedin_url || '',
        role_type: stakeholder.role_type || 'neutral',
        influence_level: stakeholder.influence_level || 5,
        decision_authority: stakeholder.decision_authority || false,
        budget_authority: stakeholder.budget_authority || false,
        relationship_status: stakeholder.relationship_status || 'not_contacted',
        engagement_score: stakeholder.engagement_score || 50,
        champion_score: stakeholder.champion_score || 0,
        champion_status: stakeholder.champion_status || 'potential',
        notes: stakeholder.notes || '',
        tags: stakeholder.tags || []
      });
    } else {
      // Reset form for new stakeholder
      setFormData({
        name: '',
        title: '',
        department: '',
        email: '',
        phone: '',
        linkedin_url: '',
        role_type: 'neutral',
        influence_level: 5,
        decision_authority: false,
        budget_authority: false,
        relationship_status: 'not_contacted',
        engagement_score: 50,
        champion_score: 0,
        champion_status: 'potential',
        notes: '',
        tags: []
      });
    }
  }, [stakeholder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = '/api/stakeholders';
      const method = stakeholder ? 'PUT' : 'POST';

      const body = stakeholder
        ? {
            stakeholder_id: stakeholder.id,
            updates: {
              ...formData,
              company_id: companyId
            }
          }
        : {
            stakeholder: {
              ...formData,
              company_id: companyId
            }
          };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save stakeholder');
      }

      onSuccess?.(data.stakeholder);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving stakeholder:', err);
      setError(err instanceof Error ? err.message : 'Failed to save stakeholder');
    } finally {
      setLoading(false);
    }
  };

  const handleTagInput = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {stakeholder ? 'Edit Stakeholder' : 'Add New Stakeholder'}
          </DialogTitle>
          <DialogDescription>
            {stakeholder
              ? 'Update stakeholder information and relationship status'
              : 'Add a new stakeholder to track and manage relationships'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input
                  id="linkedin"
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Role & Influence */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Role & Influence</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role_type">Role Type</Label>
                <Select
                  value={formData.role_type}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, role_type: value }))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="champion">Champion</SelectItem>
                    <SelectItem value="influencer">Influencer</SelectItem>
                    <SelectItem value="decision_maker">Decision Maker</SelectItem>
                    <SelectItem value="gatekeeper">Gatekeeper</SelectItem>
                    <SelectItem value="end_user">End User</SelectItem>
                    <SelectItem value="detractor">Detractor</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="relationship_status">Relationship Status</Label>
                <Select
                  value={formData.relationship_status}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, relationship_status: value }))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_contacted">Not Contacted</SelectItem>
                    <SelectItem value="initial_contact">Initial Contact</SelectItem>
                    <SelectItem value="developing">Developing</SelectItem>
                    <SelectItem value="established">Established</SelectItem>
                    <SelectItem value="strong">Strong</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="influence">Influence Level: {formData.influence_level}</Label>
              <Slider
                id="influence"
                min={1}
                max={10}
                step={1}
                value={[formData.influence_level]}
                onValueChange={([value]) => setFormData(prev => ({ ...prev, influence_level: value }))}
                disabled={loading}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="engagement">Engagement Score: {formData.engagement_score}%</Label>
              <Slider
                id="engagement"
                min={0}
                max={100}
                step={5}
                value={[formData.engagement_score]}
                onValueChange={([value]) => setFormData(prev => ({ ...prev, engagement_score: value }))}
                disabled={loading}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="decision_authority">Decision Authority</Label>
                <Switch
                  id="decision_authority"
                  checked={formData.decision_authority}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, decision_authority: checked }))}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="budget_authority">Budget Authority</Label>
                <Switch
                  id="budget_authority"
                  checked={formData.budget_authority}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, budget_authority: checked }))}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Champion Tracking (if role_type is champion) */}
          {formData.role_type === 'champion' && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Champion Tracking</h3>

              <div>
                <Label htmlFor="champion_status">Champion Status</Label>
                <Select
                  value={formData.champion_status}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, champion_status: value }))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="potential">Potential</SelectItem>
                    <SelectItem value="developing">Developing</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="super">Super Champion</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="champion_score">Champion Score: {formData.champion_score}%</Label>
                <Slider
                  id="champion_score"
                  min={0}
                  max={100}
                  step={5}
                  value={[formData.champion_score]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, champion_score: value }))}
                  disabled={loading}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Additional Information</h3>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags.join(', ')}
                onChange={(e) => handleTagInput(e.target.value)}
                placeholder="e.g., key contact, technical buyer, budget holder"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {stakeholder ? 'Update Stakeholder' : 'Add Stakeholder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}