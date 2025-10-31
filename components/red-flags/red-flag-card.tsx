'use client';

/**
 * Red Flag Card Component
 *
 * Displays a single red flag in a card format with:
 * - Category, severity, and status badges
 * - Confidence score
 * - Title and description
 * - Metadata (detected date, updated date)
 * - Hover and click interactions
 *
 * Used in list views and dashboard widgets.
 */

import { RedFlag, FlagCategory, FlagSeverity, FlagStatus } from '@/lib/red-flags/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

/**
 * Severity configuration
 */
const SEVERITY_CONFIG: Record<
  FlagSeverity,
  { color: string; icon: typeof AlertCircle; label: string }
> = {
  critical: { color: 'bg-red-100 text-red-800 border-red-300', icon: AlertCircle, label: 'Critical' },
  high: { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: AlertTriangle, label: 'High' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: AlertTriangle, label: 'Medium' },
  low: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Info, label: 'Low' },
};

/**
 * Category configuration
 */
const CATEGORY_CONFIG: Record<FlagCategory, { color: string; icon: typeof Shield; label: string }> = {
  financial: { color: 'bg-green-100 text-green-800', icon: FileText, label: 'Financial' },
  legal: { color: 'bg-purple-100 text-purple-800', icon: Scale, label: 'Legal' },
  operational: { color: 'bg-blue-100 text-blue-800', icon: Zap, label: 'Operational' },
  cyber: { color: 'bg-red-100 text-red-800', icon: Shield, label: 'Cyber' },
  esg: { color: 'bg-green-100 text-green-800', icon: Leaf, label: 'ESG' },
};

/**
 * Status configuration
 */
const STATUS_CONFIG: Record<FlagStatus, { color: string; label: string }> = {
  open: { color: 'bg-red-100 text-red-800', label: 'Open' },
  reviewing: { color: 'bg-yellow-100 text-yellow-800', label: 'Reviewing' },
  mitigating: { color: 'bg-blue-100 text-blue-800', label: 'Mitigating' },
  resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
  false_positive: { color: 'bg-gray-100 text-gray-800', label: 'False Positive' },
};

/**
 * Props
 */
interface RedFlagCardProps {
  flag: RedFlag;
  onClick?: (flag: RedFlag) => void;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (flagId: string) => void;
  compact?: boolean;
}

/**
 * Red Flag Card Component
 */
export function RedFlagCard({
  flag,
  onClick,
  showCheckbox = false,
  isSelected = false,
  onToggleSelection,
  compact = false,
}: RedFlagCardProps) {
  const SeverityIcon = SEVERITY_CONFIG[flag.severity].icon;
  const CategoryIcon = CATEGORY_CONFIG[flag.category].icon;

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking checkbox
    if (showCheckbox && (e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    onClick?.(flag);
  };

  const handleCheckboxChange = () => {
    onToggleSelection?.(flag.id);
  };

  return (
    <Card
      className={`
        ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
        transition-all
      `}
      onClick={handleClick}
    >
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          {showCheckbox && (
            <div className="pt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleCheckboxChange}
                className="h-4 w-4 rounded border-gray-300"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Badges Row */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* Severity Badge */}
              <Badge className={SEVERITY_CONFIG[flag.severity].color} variant="outline">
                <SeverityIcon className="h-3 w-3 mr-1" />
                {SEVERITY_CONFIG[flag.severity].label}
              </Badge>

              {/* Category Badge */}
              <Badge className={CATEGORY_CONFIG[flag.category].color} variant="outline">
                <CategoryIcon className="h-3 w-3 mr-1" />
                {CATEGORY_CONFIG[flag.category].label}
              </Badge>

              {/* Status Badge */}
              <Badge className={STATUS_CONFIG[flag.status].color} variant="outline">
                {STATUS_CONFIG[flag.status].label}
              </Badge>

              {/* Confidence Badge */}
              {flag.confidence !== null && (
                <Badge variant="outline" className="bg-gray-100">
                  {Math.round(flag.confidence * 100)}% confidence
                </Badge>
              )}

              {/* Snoozed Indicator */}
              {flag.snoozed_until && new Date(flag.snoozed_until) > new Date() && (
                <Badge variant="outline" className="bg-purple-100 text-purple-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Snoozed
                </Badge>
              )}
            </div>

            {/* Title */}
            <h4
              className={`font-semibold text-gray-900 ${
                compact ? 'text-sm mb-0.5' : 'text-base mb-1'
              }`}
            >
              {flag.title}
            </h4>

            {/* Description */}
            {!compact && flag.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{flag.description}</p>
            )}

            {/* Explainer (if available) */}
            {!compact && flag.meta?.explainer?.why && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-2 mb-2">
                <p className="text-xs text-blue-900 line-clamp-2">{flag.meta.explainer.why}</p>
              </div>
            )}

            {/* Metadata */}
            <div
              className={`flex items-center gap-4 ${
                compact ? 'text-xs' : 'text-xs'
              } text-gray-500`}
            >
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Detected {new Date(flag.first_detected_at).toLocaleDateString()}
              </span>
              {flag.last_updated_at !== flag.first_detected_at && (
                <span>Updated {new Date(flag.last_updated_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Red Flag Card Skeleton (for loading states)
 */
export function RedFlagCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card>
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="space-y-3">
          {/* Badges skeleton */}
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-14 bg-gray-200 rounded animate-pulse" />
          </div>
          {/* Title skeleton */}
          <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
          {/* Description skeleton */}
          {!compact && (
            <>
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
            </>
          )}
          {/* Metadata skeleton */}
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
