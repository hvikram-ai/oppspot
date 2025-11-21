'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type AlertRule = {
  id: string;
  rule_name: string;
  rule_type: string;
  threshold_config: Record<string, unknown>;
  severity: string;
  is_enabled: boolean;
  notify_email: boolean;
  notify_in_app: boolean;
  notify_webhook: boolean;
  webhook_url?: string;
};

type AlertRulesDialogProps = {
  analysisId: string;
};

/**
 * Alert Rules Configuration Dialog
 *
 * Manage alert rules for competitive intelligence monitoring
 * Part of T014 Phase 5 implementation
 */
export function AlertRulesDialog({ analysisId }: AlertRulesDialogProps) {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch rules when dialog opens
  useEffect(() => {
    if (open) {
      fetchRules();
    }
  }, [open]);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/competitive-analysis/${analysisId}/alert-rules`);
      if (!response.ok) throw new Error('Failed to fetch rules');
      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      toast.error('Failed to load alert rules');
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(
        `/api/competitive-analysis/${analysisId}/alert-rules/${ruleId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_enabled: enabled }),
        }
      );

      if (!response.ok) throw new Error('Failed to update rule');

      setRules(prev =>
        prev.map(r => (r.id === ruleId ? { ...r, is_enabled: enabled } : r))
      );
      toast.success(`Alert rule ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(
        `/api/competitive-analysis/${analysisId}/alert-rules/${ruleId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete rule');

      setRules(prev => prev.filter(r => r.id !== ruleId));
      toast.success('Alert rule deleted');
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const getRuleTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      moat_threshold: 'Moat Threshold',
      parity_threshold: 'Parity Threshold',
      pricing_change: 'Pricing Change',
      competitor_added: 'New Competitor',
      platform_threat: 'Platform Threat',
      velocity_drop: 'Velocity Drop',
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Alert Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alert Rules Configuration</DialogTitle>
          <DialogDescription>
            Configure custom alerts for competitive intelligence monitoring
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading rules...</p>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No alert rules configured</p>
              <p className="text-sm mt-1">Create rules to get notified about changes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map(rule => (
                <div
                  key={rule.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{rule.rule_name}</p>
                      <Badge variant="outline">{getRuleTypeLabel(rule.rule_type)}</Badge>
                      <Badge
                        variant={
                          rule.severity === 'critical' || rule.severity === 'high'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {rule.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {rule.notify_email && <span>📧 Email</span>}
                      {rule.notify_in_app && <span>🔔 In-App</span>}
                      {rule.notify_webhook && <span>🔗 Webhook</span>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={rule.is_enabled}
                      onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Default alert types available:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>• Moat drops below threshold</div>
              <div>• Parity exceeds threshold</div>
              <div>• Pricing changes</div>
              <div>• New competitors added</div>
              <div>• Platform threat changes</div>
              <div>• Feature velocity drops</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
