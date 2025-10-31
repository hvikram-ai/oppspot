'use client';

/**
 * Red Flag Detail Drawer Component
 *
 * Slide-out drawer showing full flag details:
 * - Complete flag information
 * - Evidence list
 * - Action history
 * - Quick actions (status change, assign, note, etc.)
 *
 * Integrates with Zustand store for state management.
 */

import { useEffect, useState } from 'react';
import { useRedFlagsStore } from '@/lib/stores/red-flags-store';
import { RedFlag, RedFlagEvidence, RedFlagAction } from '@/lib/red-flags/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Shield,
  FileText,
  Zap,
  Leaf,
  Scale,
  Clock,
  User,
  MessageSquare,
  X,
  Edit,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { EvidenceList } from './evidence-list';
import { ActionHistory } from './action-history';
import { StatusChangeDialog } from './status-change-dialog';

/**
 * Configuration
 */
const SEVERITY_CONFIG = {
  critical: { color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle, label: 'Critical' },
  high: { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertTriangle, label: 'High' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: AlertTriangle, label: 'Medium' },
  low: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Info, label: 'Low' },
};

const CATEGORY_CONFIG = {
  financial: { color: 'bg-green-100 text-green-800', icon: FileText, label: 'Financial' },
  legal: { color: 'bg-purple-100 text-purple-800', icon: Scale, label: 'Legal' },
  operational: { color: 'bg-blue-100 text-blue-800', icon: Zap, label: 'Operational' },
  cyber: { color: 'bg-red-100 text-red-800', icon: Shield, label: 'Cyber' },
  esg: { color: 'bg-green-100 text-green-800', icon: Leaf, label: 'ESG' },
};

const STATUS_CONFIG = {
  open: { color: 'bg-red-100 text-red-800', label: 'Open' },
  reviewing: { color: 'bg-yellow-100 text-yellow-800', label: 'Reviewing' },
  mitigating: { color: 'bg-blue-100 text-blue-800', label: 'Mitigating' },
  resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
  false_positive: { color: 'bg-gray-100 text-gray-800', label: 'False Positive' },
};

/**
 * API Response Type
 */
interface FlagDetailResponse {
  flag: RedFlag;
  evidence: RedFlagEvidence[];
  actions: RedFlagAction[];
}

/**
 * Red Flag Detail Drawer Component
 */
export function RedFlagDetailDrawer() {
  const {
    selectedFlagId,
    isDetailDrawerOpen,
    closeFlagDetail,
    currentEntityId,
  } = useRedFlagsStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FlagDetailResponse | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  /**
   * Fetch flag details when drawer opens
   */
  useEffect(() => {
    if (isDetailDrawerOpen && selectedFlagId && currentEntityId) {
      fetchFlagDetails();
    }
  }, [isDetailDrawerOpen, selectedFlagId, currentEntityId]);

  /**
   * Fetch flag details from API
   */
  const fetchFlagDetails = async () => {
    if (!selectedFlagId || !currentEntityId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/companies/${currentEntityId}/red-flags/${selectedFlagId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch flag details');
      }

      const result: FlagDetailResponse = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load flag details';
      setError(errorMessage);
      console.error('[RedFlagDetailDrawer] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle status change
   */
  const handleStatusChange = () => {
    setIsStatusDialogOpen(true);
  };

  /**
   * Handle status changed (refresh data)
   */
  const handleStatusChanged = () => {
    fetchFlagDetails();
  };

  /**
   * Handle add note
   */
  const handleAddNote = () => {
    setIsNoteDialogOpen(true);
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <Sheet open={isDetailDrawerOpen} onOpenChange={closeFlagDetail}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <Sheet open={isDetailDrawerOpen} onOpenChange={closeFlagDetail}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Error</SheetTitle>
          </SheetHeader>
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </SheetContent>
      </Sheet>
    );
  }

  /**
   * Render empty state
   */
  if (!data) {
    return null;
  }

  const { flag, evidence, actions } = data;
  const SeverityIcon = SEVERITY_CONFIG[flag.severity].icon;
  const CategoryIcon = CATEGORY_CONFIG[flag.category].icon;

  /**
   * Main render
   */
  return (
    <Sheet open={isDetailDrawerOpen} onOpenChange={closeFlagDetail}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl">{flag.title}</SheetTitle>
              <SheetDescription className="mt-2">
                Flag ID: {flag.id.substring(0, 8)}
              </SheetDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleStatusChange}>
                  <Edit className="h-4 w-4 mr-2" />
                  Change Status
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddNote}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add Note
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Assign
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Clock className="h-4 w-4 mr-2" />
                  Snooze
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={SEVERITY_CONFIG[flag.severity].color} variant="outline">
              <SeverityIcon className="h-3 w-3 mr-1" />
              {SEVERITY_CONFIG[flag.severity].label}
            </Badge>
            <Badge className={CATEGORY_CONFIG[flag.category].color} variant="outline">
              <CategoryIcon className="h-3 w-3 mr-1" />
              {CATEGORY_CONFIG[flag.category].label}
            </Badge>
            <Badge className={STATUS_CONFIG[flag.status].color} variant="outline">
              {STATUS_CONFIG[flag.status].label}
            </Badge>
            {flag.confidence !== null && (
              <Badge variant="outline" className="bg-gray-100">
                {Math.round(flag.confidence * 100)}% confidence
              </Badge>
            )}
            {flag.snoozed_until && new Date(flag.snoozed_until) > new Date() && (
              <Badge variant="outline" className="bg-purple-100 text-purple-800">
                <Clock className="h-3 w-3 mr-1" />
                Snoozed until {new Date(flag.snoozed_until).toLocaleDateString()}
              </Badge>
            )}
          </div>

          {/* Description */}
          {flag.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600">{flag.description}</p>
            </div>
          )}

          {/* Explainer */}
          {flag.meta?.explainer && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Why is this a flag?</h3>
              <p className="text-sm text-blue-800 mb-3">{flag.meta.explainer.why}</p>

              {flag.meta.explainer.key_evidence && flag.meta.explainer.key_evidence.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-blue-900 mb-1">Key Evidence:</h4>
                  <ul className="list-disc list-inside text-xs text-blue-800 space-y-1">
                    {flag.meta.explainer.key_evidence.map((evidence, idx) => (
                      <li key={idx}>{evidence}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-blue-900 mb-1">Suggested Remediation:</h4>
                <p className="text-xs text-blue-800">{flag.meta.explainer.suggested_remediation}</p>
              </div>

              {flag.meta.explainer.timeframe && (
                <div className="mt-2">
                  <span className="text-xs text-blue-700">
                    Timeframe: {flag.meta.explainer.timeframe}
                  </span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">First Detected</span>
              <p className="font-medium">{new Date(flag.first_detected_at).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-gray-500">Last Updated</span>
              <p className="font-medium">{new Date(flag.last_updated_at).toLocaleString()}</p>
            </div>
            {flag.owner_id && (
              <div>
                <span className="text-gray-500">Owner</span>
                <p className="font-medium">{flag.owner_id.substring(0, 8)}...</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Tabs for Evidence and Actions */}
          <Tabs defaultValue="evidence" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="evidence">
                Evidence ({evidence.length})
              </TabsTrigger>
              <TabsTrigger value="actions">
                History ({actions.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="evidence" className="mt-4">
              <EvidenceList evidence={evidence} />
            </TabsContent>
            <TabsContent value="actions" className="mt-4">
              <ActionHistory actions={actions} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>

      {/* Status Change Dialog */}
      {currentEntityId && (
        <StatusChangeDialog
          isOpen={isStatusDialogOpen}
          onClose={() => setIsStatusDialogOpen(false)}
          flagId={flag.id}
          companyId={currentEntityId}
          currentStatus={flag.status}
          onStatusChanged={handleStatusChanged}
        />
      )}
    </Sheet>
  );
}
