'use client';

/**
 * Evidence List Component
 *
 * Displays all evidence items linked to a red flag.
 * Groups evidence by type (document, alert, KPI, signal, news).
 * Shows citation data and supports clicking through to source.
 */

import { RedFlagEvidence, EvidenceType } from '@/lib/red-flags/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  AlertTriangle,
  TrendingUp,
  Activity,
  Newspaper,
  ExternalLink,
  Calendar,
} from 'lucide-react';

/**
 * Evidence type configuration
 */
const EVIDENCE_CONFIG: Record<
  EvidenceType,
  { icon: typeof FileText; label: string; color: string }
> = {
  document: { icon: FileText, label: 'Document', color: 'bg-blue-100 text-blue-800' },
  alert: { icon: AlertTriangle, label: 'Alert', color: 'bg-red-100 text-red-800' },
  kpi: { icon: TrendingUp, label: 'KPI', color: 'bg-green-100 text-green-800' },
  signal: { icon: Activity, label: 'Signal', color: 'bg-purple-100 text-purple-800' },
  news: { icon: Newspaper, label: 'News', color: 'bg-yellow-100 text-yellow-800' },
};

/**
 * Props
 */
interface EvidenceListProps {
  evidence: RedFlagEvidence[];
}

/**
 * Evidence List Component
 */
export function EvidenceList({ evidence }: EvidenceListProps) {
  /**
   * Render empty state
   */
  if (evidence.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <FileText className="h-12 w-12 text-gray-400 mb-3" />
        <p className="text-sm text-gray-600">No evidence items linked to this flag</p>
      </div>
    );
  }

  /**
   * Group evidence by type
   */
  const evidenceByType = evidence.reduce((acc, item) => {
    if (!acc[item.evidence_type]) {
      acc[item.evidence_type] = [];
    }
    acc[item.evidence_type].push(item);
    return acc;
  }, {} as Record<EvidenceType, RedFlagEvidence[]>);

  /**
   * Format citation data for display
   */
  const formatCitation = (item: RedFlagEvidence): string => {
    const citation = item.citation_data;
    if (!citation) return '';

    switch (citation.type) {
      case 'document':
        return `Page ${citation.pageNumber}, Chunk ${citation.chunkIndex}`;
      case 'alert':
        return `Alert ${citation.alertId.substring(0, 8)} - ${citation.severity}`;
      case 'kpi':
        return `${citation.metricName}: ${citation.value} ${citation.unit || ''}`;
      case 'signal':
        return `Signal ${citation.signalId.substring(0, 8)} - ${citation.signalType}`;
      case 'news':
        return citation.source;
      default:
        return '';
    }
  };

  /**
   * Get source URL if available
   */
  const getSourceUrl = (item: RedFlagEvidence): string | null => {
    const citation = item.citation_data;
    if (!citation) return null;

    if (citation.type === 'document' && citation.documentId) {
      return `/documents/${citation.documentId}`;
    }
    if (citation.type === 'alert' && citation.alertId) {
      return `/alerts/${citation.alertId}`;
    }
    if (citation.type === 'news' && citation.url) {
      return citation.url;
    }
    return null;
  };

  /**
   * Main render
   */
  return (
    <div className="space-y-4">
      {(Object.keys(evidenceByType) as EvidenceType[]).map((type) => {
        const items = evidenceByType[type];
        const Icon = EVIDENCE_CONFIG[type].icon;

        return (
          <div key={type}>
            {/* Type Header */}
            <div className="flex items-center gap-2 mb-2">
              <Badge className={EVIDENCE_CONFIG[type].color} variant="outline">
                <Icon className="h-3 w-3 mr-1" />
                {EVIDENCE_CONFIG[type].label}
              </Badge>
              <span className="text-xs text-gray-500">({items.length})</span>
            </div>

            {/* Evidence Items */}
            <div className="space-y-2">
              {items.map((item) => {
                const sourceUrl = getSourceUrl(item);
                const citationText = formatCitation(item);

                return (
                  <Card key={item.id} className="border-l-4" style={{
                    borderLeftColor: EVIDENCE_CONFIG[type].color.includes('blue') ? '#3b82f6' :
                      EVIDENCE_CONFIG[type].color.includes('red') ? '#ef4444' :
                      EVIDENCE_CONFIG[type].color.includes('green') ? '#10b981' :
                      EVIDENCE_CONFIG[type].color.includes('purple') ? '#8b5cf6' :
                      '#eab308'
                  }}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {/* Evidence Source/ID */}
                          {citationText && (
                            <p className="text-xs font-medium text-gray-900 mb-1">
                              {citationText}
                            </p>
                          )}

                          {/* Evidence Description */}
                          {item.description && (
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center gap-3 mt-2">
                            {item.collected_at && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(item.collected_at).toLocaleDateString()}
                              </span>
                            )}
                            {item.confidence !== null && (
                              <span className="text-xs text-gray-500">
                                {Math.round(item.confidence * 100)}% confidence
                              </span>
                            )}
                          </div>
                        </div>

                        {/* View Source Button */}
                        {sourceUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={() => window.open(sourceUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
