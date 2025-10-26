/**
 * Activity Repository
 * Audit logging for data room activities
 */

import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { ActivityLog } from '../types';
import {
  CreateActivityLogInput,
  ActivityLogFilter,
  CreateActivityLogSchema,
  ActivityLogFilterSchema,
} from '../validation/schemas';
import {
  DataRoomError,
  DataRoomErrorCode,
  validationError,
} from '../utils/error-handler';

/**
 * ActivityRepository - Audit logging operations
 */
export class ActivityRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Log an activity
   * @param input - Activity log data
   * @returns Created activity log
   */
  async logActivity(input: CreateActivityLogInput): Promise<ActivityLog> {
    try {
      // Validate input
      const validated = CreateActivityLogSchema.parse(input);

      // Get current user
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) {
        throw new DataRoomError(
          'User must be authenticated',
          DataRoomErrorCode.UNAUTHORIZED,
          401
        );
      }

      // Get user profile for name and email
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Get IP address and user agent from request context
      // Note: In Edge Functions or API routes, these would be passed from headers
      const ipAddress = '127.0.0.1'; // Placeholder
      const userAgent = 'Unknown'; // Placeholder

      // Create activity log
      const { data, error } = await this.supabase
        .from('activity_logs')
        .insert({
          data_room_id: validated.data_room_id,
          document_id: validated.document_id || null,
          actor_id: user.id,
          actor_name: profile?.full_name || user.email || 'Unknown',
          actor_email: profile?.email || user.email || 'unknown@example.com',
          action: validated.action,
          details: validated.details,
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .select()
        .single();

      if (error) {
        throw new DataRoomError(
          `Failed to log activity: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as ActivityLog;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      if (error instanceof Error && error.name === 'ZodError') {
        throw validationError('Invalid activity log input', error);
      }
      throw new DataRoomError(
        'Failed to log activity',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Get activity logs with filters
   * @param filters - Filter and pagination options
   * @returns Array of activity logs
   */
  async getActivityLogs(filters: ActivityLogFilter): Promise<ActivityLog[]> {
    try {
      // Validate filters
      const validated = ActivityLogFilterSchema.parse(filters);

      let query = this.supabase
        .from('activity_logs')
        .select('*')
        .eq('data_room_id', validated.data_room_id);

      // Apply filters
      if (validated.document_id) {
        query = query.eq('document_id', validated.document_id);
      }

      if (validated.actor_id) {
        query = query.eq('actor_id', validated.actor_id);
      }

      if (validated.action) {
        query = query.eq('action', validated.action);
      }

      if (validated.date_from) {
        query = query.gte('created_at', validated.date_from);
      }

      if (validated.date_to) {
        query = query.lte('created_at', validated.date_to);
      }

      // Order by most recent first
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      query = query.range(
        validated.offset,
        validated.offset + validated.limit - 1
      );

      const { data, error } = await query;

      if (error) {
        throw new DataRoomError(
          `Failed to fetch activity logs: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as ActivityLog[];
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get activity logs',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Export activity logs to CSV
   * @param dataRoomId - Data room UUID
   * @returns CSV string
   */
  async exportActivityLog(dataRoomId: string): Promise<string> {
    try {
      // Get all logs (no pagination for export)
      const { data, error } = await this.supabase
        .from('activity_logs')
        .select('*')
        .eq('data_room_id', dataRoomId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new DataRoomError(
          `Failed to export activity logs: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      if (!data || data.length === 0) {
        return 'No activity logs found';
      }

      // CSV header
      const headers = [
        'Timestamp',
        'Actor',
        'Email',
        'Action',
        'Document ID',
        'Details',
        'IP Address',
      ];
      const csvRows = [headers.join(',')];

      // CSV rows
      data.forEach((log: ActivityLog) => {
        const row = [
          new Date(log.created_at).toISOString(),
          `"${log.actor_name}"`,
          `"${log.actor_email}"`,
          log.action,
          log.document_id || '',
          `"${JSON.stringify(log.details)}"`,
          log.ip_address,
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to export activity logs',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Get recent activity for a data room
   * @param dataRoomId - Data room UUID
   * @param limit - Number of recent activities to fetch
   * @returns Array of recent activity logs
   */
  async getRecentActivity(
    dataRoomId: string,
    limit: number = 10
  ): Promise<ActivityLog[]> {
    return this.getActivityLogs({
      data_room_id: dataRoomId,
      limit,
      offset: 0,
    });
  }

  /**
   * Get activity count by action type
   * @param dataRoomId - Data room UUID
   * @returns Object with counts by action type
   */
  async getActivityCountsByAction(
    dataRoomId: string
  ): Promise<Record<string, number>> {
    try {
      const { data, error } = await this.supabase
        .from('activity_logs')
        .select('action')
        .eq('data_room_id', dataRoomId);

      if (error) {
        throw new DataRoomError(
          `Failed to count activities: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      const counts: Record<string, number> = {};
      data.forEach((log) => {
        counts[log.action] = (counts[log.action] || 0) + 1;
      });

      return counts;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get activity counts',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Get activity stats for a time period
   * @param dataRoomId - Data room UUID
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @returns Activity stats
   */
  async getActivityStats(
    dataRoomId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<{
    total_actions: number;
    unique_actors: number;
    most_active_user: { actor_name: string; action_count: number } | null;
    actions_by_type: Record<string, number>;
  }> {
    try {
      const logs = await this.getActivityLogs({
        data_room_id: dataRoomId,
        date_from: dateFrom,
        date_to: dateTo,
        limit: 10000, // Get all for stats
        offset: 0,
      });

      // Calculate stats
      const uniqueActors = new Set(logs.map((log) => log.actor_id));
      const actionsByType: Record<string, number> = {};
      const actorCounts: Record<string, { name: string; count: number }> = {};

      logs.forEach((log) => {
        // Count by action type
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;

        // Count by actor
        if (!actorCounts[log.actor_id]) {
          actorCounts[log.actor_id] = {
            name: log.actor_name,
            count: 0,
          };
        }
        actorCounts[log.actor_id].count++;
      });

      // Find most active user
      const mostActiveUser = Object.values(actorCounts).reduce(
        (max, current) => (current.count > (max?.count || 0) ? current : max),
        null as { name: string; count: number } | null
      );

      return {
        total_actions: logs.length,
        unique_actors: uniqueActors.size,
        most_active_user: mostActiveUser
          ? {
              actor_name: mostActiveUser.name,
              action_count: mostActiveUser.count,
            }
          : null,
        actions_by_type: actionsByType,
      };
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get activity stats',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }
}
