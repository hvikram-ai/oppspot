'use client';

/**
 * Action History Component
 *
 * Displays a timeline of all actions taken on a red flag.
 * Shows action type, actor, timestamp, and details.
 * Supports all action types: assign, note, status_change, snooze, remediation, override.
 */

import { RedFlagAction, ActionType } from '@/lib/red-flags/types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  MessageSquare,
  GitBranch,
  Clock,
  Wrench,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

/**
 * Action type configuration
 */
const ACTION_CONFIG: Record<
  ActionType,
  { icon: typeof User; label: string; color: string }
> = {
  assign: { icon: User, label: 'Assigned', color: 'text-blue-600' },
  note: { icon: MessageSquare, label: 'Note Added', color: 'text-gray-600' },
  status_change: { icon: GitBranch, label: 'Status Changed', color: 'text-purple-600' },
  snooze: { icon: Clock, label: 'Snoozed', color: 'text-yellow-600' },
  remediation: { icon: Wrench, label: 'Remediation Plan', color: 'text-green-600' },
  override: { icon: AlertTriangle, label: 'Override', color: 'text-red-600' },
};

/**
 * Props
 */
interface ActionHistoryProps {
  actions: RedFlagAction[];
}

/**
 * Action History Component
 */
export function ActionHistory({ actions }: ActionHistoryProps) {
  /**
   * Render empty state
   */
  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <GitBranch className="h-12 w-12 text-gray-400 mb-3" />
        <p className="text-sm text-gray-600">No actions have been taken on this flag yet</p>
      </div>
    );
  }

  /**
   * Sort actions by timestamp (newest first)
   */
  const sortedActions = [...actions].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  /**
   * Format action details based on type
   */
  const formatActionDetails = (action: RedFlagAction): React.ReactNode => {
    const data = action.action_data;

    switch (action.action_type) {
      case 'assign':
        return (
          <div className="text-sm">
            <p>
              Assigned to{' '}
              <span className="font-medium">
                {data.assignee_id?.substring(0, 8)}...
              </span>
            </p>
            {data.previous_owner_id && (
              <p className="text-xs text-gray-500 mt-1">
                Previously: {data.previous_owner_id.substring(0, 8)}...
              </p>
            )}
          </div>
        );

      case 'note':
        return (
          <div className="text-sm">
            <p className="text-gray-700">{data.text}</p>
            {data.is_internal && (
              <Badge variant="outline" className="mt-2 text-xs">
                Internal Note
              </Badge>
            )}
          </div>
        );

      case 'status_change':
        return (
          <div className="text-sm">
            <p>
              Status changed from{' '}
              <Badge variant="outline" className="mx-1">
                {data.from}
              </Badge>{' '}
              to{' '}
              <Badge variant="outline" className="mx-1">
                {data.to}
              </Badge>
            </p>
            {data.reason && (
              <p className="text-gray-600 mt-2 italic">{data.reason}</p>
            )}
          </div>
        );

      case 'snooze':
        return (
          <div className="text-sm">
            <p>
              Snoozed for {data.duration_days} days until{' '}
              <span className="font-medium">
                {data.until && new Date(data.until).toLocaleDateString()}
              </span>
            </p>
            {data.reason && (
              <p className="text-gray-600 mt-2 italic">{data.reason}</p>
            )}
          </div>
        );

      case 'remediation':
        return (
          <div className="text-sm space-y-2">
            <div>
              <p className="font-medium text-gray-900">Remediation Plan:</p>
              <p className="text-gray-700 mt-1">{data.plan}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>
                ETA: {data.eta && new Date(data.eta).toLocaleDateString()}
              </span>
              {data.stakeholders && data.stakeholders.length > 0 && (
                <span>Stakeholders: {data.stakeholders.length}</span>
              )}
            </div>
          </div>
        );

      case 'override':
        return (
          <div className="text-sm">
            <p>
              Overrode {data.field} from{' '}
              <Badge variant="outline" className="mx-1">
                {data.from}
              </Badge>{' '}
              to{' '}
              <Badge variant="outline" className="mx-1">
                {data.to}
              </Badge>
            </p>
            {data.reason && (
              <p className="text-gray-600 mt-2 italic">{data.reason}</p>
            )}
          </div>
        );

      default:
        return <p className="text-sm text-gray-600">Action details not available</p>;
    }
  };

  /**
   * Get actor initials for avatar
   */
  const getActorInitials = (actorId: string): string => {
    return actorId.substring(0, 2).toUpperCase();
  };

  /**
   * Main render
   */
  return (
    <div className="space-y-6">
      {sortedActions.map((action, index) => {
        const Icon = ACTION_CONFIG[action.action_type].icon;
        const isLast = index === sortedActions.length - 1;

        return (
          <div key={action.id} className="flex gap-4">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full border-2 border-gray-200 bg-white
                  flex items-center justify-center
                  ${ACTION_CONFIG[action.action_type].color}
                `}
              >
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && (
                <div className="w-0.5 h-full bg-gray-200 mt-2" style={{ minHeight: '40px' }} />
              )}
            </div>

            {/* Action content */}
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${ACTION_CONFIG[action.action_type].color}`}>
                    {ACTION_CONFIG[action.action_type].label}
                  </span>
                  <span className="text-xs text-gray-500">
                    by {getActorInitials(action.actor_id)}...
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {new Date(action.created_at).toLocaleString()}
                </div>
              </div>

              {/* Action details */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                {formatActionDetails(action)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
