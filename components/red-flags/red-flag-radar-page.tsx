'use client';

/**
 * Red Flag Radar Page Component
 *
 * Main page component that brings together all red flag features:
 * - Filter bar
 * - Flag list
 * - Detail drawer
 * - Export dialog
 * - Bulk actions toolbar
 *
 * Serves as the orchestration layer for the entire Red Flag Radar UI.
 */

import { useEffect } from 'react';
import { useRedFlagsStore } from '@/lib/stores/red-flags-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RedFlagFilters } from './red-flag-filters';
import { RedFlagList } from './red-flag-list';
import { RedFlagDetailDrawer } from './red-flag-detail-drawer';
import { ExportDialog } from './export-dialog';
import { BulkActionsToolbar } from './bulk-actions-toolbar';
import { Shield, Download } from 'lucide-react';

/**
 * Props
 */
interface RedFlagRadarPageProps {
  companyId: string;
  companyName: string;
}

/**
 * Red Flag Radar Page Component
 */
export function RedFlagRadarPage({ companyId, companyName }: RedFlagRadarPageProps) {
  const { setCurrentEntity, openExportDialog } = useRedFlagsStore();

  /**
   * Set current entity on mount
   */
  useEffect(() => {
    setCurrentEntity('company', companyId);
  }, [companyId, setCurrentEntity]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Red Flag Radar</h1>
            <p className="text-gray-600 mt-1">
              AI-powered risk detection for {companyName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openExportDialog}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">About Red Flag Radar</h3>
            <p className="text-sm text-blue-800">
              Red Flag Radar uses AI to detect potential risks across financial, legal, operational,
              cyber security, and ESG categories. Each flag is automatically classified by severity
              and confidence level, with AI-generated explanations and remediation guidance.
            </p>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <RedFlagFilters />
      </Card>

      {/* Flag List */}
      <RedFlagList companyId={companyId} />

      {/* Detail Drawer */}
      <RedFlagDetailDrawer />

      {/* Export Dialog */}
      <ExportDialog />

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar />
    </div>
  );
}
