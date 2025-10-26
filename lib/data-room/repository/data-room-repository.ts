/**
 * Data Room Repository
 * Database operations for data rooms with RLS support
 */

import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  DataRoom,
  DataRoomWithStats,
  ActivityAction,
} from '../types';
import {
  CreateDataRoomInput,
  UpdateDataRoomInput,
  DataRoomFilter,
  CreateDataRoomSchema,
  UpdateDataRoomSchema,
  DataRoomFilterSchema,
} from '../validation/schemas';
import {
  DataRoomError,
  DataRoomErrorCode,
  notFoundError,
  validationError,
} from '../utils/error-handler';

/**
 * DataRoomRepository - CRUD operations for data rooms
 */
export class DataRoomRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Get multiple data rooms with filters
   * @param filters - Filter and pagination options
   * @returns Array of data rooms
   */
  async getDataRooms(filters: DataRoomFilter = {}): Promise<DataRoom[]> {
    try {
      // Validate filters
      const validatedFilters = DataRoomFilterSchema.parse(filters);

      let query = this.supabase
        .from('data_rooms')
        .select('*')
        .eq('deleted_at', null); // Exclude soft-deleted

      // Apply filters
      if (validatedFilters.status) {
        query = query.eq('status', validatedFilters.status);
      }

      if (validatedFilters.deal_type) {
        query = query.eq('deal_type', validatedFilters.deal_type);
      }

      if (validatedFilters.search) {
        query = query.or(
          `name.ilike.%${validatedFilters.search}%,description.ilike.%${validatedFilters.search}%`
        );
      }

      // Apply sorting
      query = query.order(validatedFilters.sort_by, {
        ascending: validatedFilters.sort_order === 'asc',
      });

      // Apply pagination
      query = query.range(
        validatedFilters.offset,
        validatedFilters.offset + validatedFilters.limit - 1
      );

      const { data, error } = await query;

      if (error) {
        throw new DataRoomError(
          `Failed to fetch data rooms: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as DataRoom[];
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get data rooms',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Get a single data room by ID
   * @param id - Data room UUID
   * @returns Data room or null if not found
   */
  async getDataRoom(id: string): Promise<DataRoom | null> {
    try {
      const { data, error } = await this.supabase
        .from('data_rooms')
        .select('*')
        .eq('id', id)
        .eq('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw new DataRoomError(
          `Failed to fetch data room: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as DataRoom;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get data room',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Get data room with stats (document count, access grants, recent activity)
   * @param id - Data room UUID
   * @returns Data room with stats or null
   */
  async getDataRoomWithStats(id: string): Promise<DataRoomWithStats | null> {
    try {
      // Get data room
      const dataRoom = await this.getDataRoom(id);
      if (!dataRoom) return null;

      // Get access count
      const { count: accessCount } = await this.supabase
        .from('data_room_access')
        .select('*', { count: 'exact', head: true })
        .eq('data_room_id', id)
        .is('revoked_at', null);

      // Get recent activity (last 5)
      const { data: recentActivity } = await this.supabase
        .from('activity_logs')
        .select('*')
        .eq('data_room_id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get owner info
      const { data: owner } = await this.supabase
        .from('profiles')
        .select('full_name')
        .eq('id', dataRoom.user_id)
        .single();

      // Get current user's permission
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      const { data: myAccess } = user
        ? await this.supabase
            .from('data_room_access')
            .select('permission_level')
            .eq('data_room_id', id)
            .eq('user_id', user.id)
            .is('revoked_at', null)
            .single()
        : { data: null };

      return {
        ...dataRoom,
        access_count: accessCount || 0,
        recent_activity: recentActivity || [],
        owner_name: owner?.full_name || 'Unknown',
        my_permission: myAccess?.permission_level || null,
      };
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get data room with stats',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Create a new data room
   * @param input - Data room creation data
   * @returns Created data room
   */
  async createDataRoom(input: CreateDataRoomInput): Promise<DataRoom> {
    try {
      // Validate input
      const validated = CreateDataRoomSchema.parse(input);

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

      // Create data room
      const { data, error } = await this.supabase
        .from('data_rooms')
        .insert({
          user_id: user.id,
          name: validated.name,
          description: validated.description || null,
          company_id: validated.company_id || null,
          deal_type: validated.deal_type,
          status: 'active',
          storage_used_bytes: 0,
          document_count: 0,
          metadata: validated.metadata,
        })
        .select()
        .single();

      if (error) {
        throw new DataRoomError(
          `Failed to create data room: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as DataRoom;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      if (error instanceof Error && error.name === 'ZodError') {
        throw validationError('Invalid data room input', error);
      }
      throw new DataRoomError(
        'Failed to create data room',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Update an existing data room
   * @param id - Data room UUID
   * @param updates - Fields to update
   * @returns Updated data room
   */
  async updateDataRoom(
    id: string,
    updates: UpdateDataRoomInput
  ): Promise<DataRoom> {
    try {
      // Validate updates
      const validated = UpdateDataRoomSchema.parse(updates);

      // Check if data room exists
      const existing = await this.getDataRoom(id);
      if (!existing) {
        throw notFoundError('Data room', id);
      }

      // Update data room
      const { data, error } = await this.supabase
        .from('data_rooms')
        .update({
          ...validated,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // Check for RLS policy violations
        if (error.code === '42501' || error.code === 'PGRST301') {
          throw new DataRoomError(
            'You do not have permission to update this data room',
            DataRoomErrorCode.FORBIDDEN,
            403
          );
        }
        throw new DataRoomError(
          `Failed to update data room: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as DataRoom;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      if (error instanceof Error && error.name === 'ZodError') {
        throw validationError('Invalid update data', error);
      }
      throw new DataRoomError(
        'Failed to update data room',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Soft delete a data room
   * @param id - Data room UUID
   */
  async deleteDataRoom(id: string): Promise<void> {
    try {
      // Check if data room exists
      const existing = await this.getDataRoom(id);
      if (!existing) {
        throw notFoundError('Data room', id);
      }

      // Soft delete
      const { error } = await this.supabase
        .from('data_rooms')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        // Check for RLS policy violations
        if (error.code === '42501' || error.code === 'PGRST301') {
          throw new DataRoomError(
            'You do not have permission to delete this data room',
            DataRoomErrorCode.FORBIDDEN,
            403
          );
        }
        throw new DataRoomError(
          `Failed to delete data room: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to delete data room',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Update storage metrics after file operations
   * @param id - Data room UUID
   * @param bytesChange - Change in bytes (positive for add, negative for remove)
   * @param countChange - Change in document count
   */
  async updateStorageMetrics(
    id: string,
    bytesChange: number,
    countChange: number
  ): Promise<void> {
    try {
      const existing = await this.getDataRoom(id);
      if (!existing) {
        throw notFoundError('Data room', id);
      }

      const { error } = await this.supabase
        .from('data_rooms')
        .update({
          storage_used_bytes: Math.max(
            0,
            existing.storage_used_bytes + bytesChange
          ),
          document_count: Math.max(0, existing.document_count + countChange),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new DataRoomError(
          `Failed to update storage metrics: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to update storage metrics',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Check if user has access to data room
   * @param dataRoomId - Data room UUID
   * @param userId - User UUID (defaults to current user)
   * @returns true if user has access
   */
  async hasAccess(dataRoomId: string, userId?: string): Promise<boolean> {
    try {
      // Get current user if not provided
      if (!userId) {
        const {
          data: { user },
        } = await this.supabase.auth.getUser();
        if (!user) return false;
        userId = user.id;
      }

      // Check if user is owner
      const { data: dataRoom } = await this.supabase
        .from('data_rooms')
        .select('user_id')
        .eq('id', dataRoomId)
        .single();

      if (dataRoom?.user_id === userId) return true;

      // Check if user has access grant
      const { data: access } = await this.supabase
        .from('data_room_access')
        .select('id')
        .eq('data_room_id', dataRoomId)
        .eq('user_id', userId)
        .is('revoked_at', null)
        .single();

      return !!access;
    } catch {
      return false;
    }
  }
}
