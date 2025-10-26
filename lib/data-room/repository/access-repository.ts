/**
 * Access Repository
 * Permission management and access control for data rooms
 */

import { createClient } from '@/lib/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { sign } from 'jsonwebtoken';
import { DataRoomAccess, PermissionLevel } from '../types';
import {
  CreateAccessInput,
  CreateAccessSchema,
} from '../validation/schemas';
import {
  DataRoomError,
  DataRoomErrorCode,
  validationError,
  forbiddenError,
} from '../utils/error-handler';

/**
 * AccessRepository - Permission and access control operations
 */
export class AccessRepository {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createClient();
  }

  /**
   * Grant access to a user
   * @param input - Access grant data
   * @returns Created access grant with invite token
   */
  async grantAccess(
    input: CreateAccessInput
  ): Promise<DataRoomAccess & { invite_url: string }> {
    try {
      // Validate input
      const validated = CreateAccessSchema.parse(input);

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

      // Check if current user is owner
      const { data: dataRoom } = await this.supabase
        .from('data_rooms')
        .select('user_id')
        .eq('id', validated.data_room_id)
        .single();

      if (!dataRoom || dataRoom.user_id !== user.id) {
        throw forbiddenError('Only data room owners can grant access');
      }

      // Check if user already has access
      const { data: existing } = await this.supabase
        .from('data_room_access')
        .select('id')
        .eq('data_room_id', validated.data_room_id)
        .eq('invite_email', validated.invite_email)
        .is('revoked_at', null)
        .single();

      if (existing) {
        throw new DataRoomError(
          'User already has access to this data room',
          DataRoomErrorCode.ALREADY_EXISTS,
          409
        );
      }

      // Generate invite token (JWT)
      const inviteToken = this.generateInviteToken({
        data_room_id: validated.data_room_id,
        invite_email: validated.invite_email,
        permission_level: validated.permission_level,
      });

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validated.expires_in_days);

      // Try to find user by email
      const { data: invitedUser } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', validated.invite_email)
        .single();

      // Create access grant
      const { data, error } = await this.supabase
        .from('data_room_access')
        .insert({
          data_room_id: validated.data_room_id,
          user_id: invitedUser?.id || '00000000-0000-0000-0000-000000000000', // Placeholder until user accepts
          permission_level: validated.permission_level,
          invited_by: user.id,
          invite_token: inviteToken,
          invite_email: validated.invite_email,
          expires_at: expiresAt.toISOString(),
          accepted_at: invitedUser?.id ? new Date().toISOString() : null, // Auto-accept if user exists
        })
        .select()
        .single();

      if (error) {
        throw new DataRoomError(
          `Failed to grant access: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      // Generate invite URL
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const inviteUrl = `${baseUrl}/data-room/accept-invite?token=${inviteToken}`;

      return {
        ...(data as DataRoomAccess),
        invite_url: inviteUrl,
      };
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      if (error instanceof Error && error.name === 'ZodError') {
        throw validationError('Invalid access grant input', error);
      }
      throw new DataRoomError(
        'Failed to grant access',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Revoke access
   * @param id - Access grant UUID
   */
  async revokeAccess(id: string): Promise<void> {
    try {
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

      // Get access grant
      const { data: access } = await this.supabase
        .from('data_room_access')
        .select('data_room_id')
        .eq('id', id)
        .single();

      if (!access) {
        throw new DataRoomError(
          'Access grant not found',
          DataRoomErrorCode.NOT_FOUND,
          404
        );
      }

      // Check if current user is owner
      const { data: dataRoom } = await this.supabase
        .from('data_rooms')
        .select('user_id')
        .eq('id', access.data_room_id)
        .single();

      if (!dataRoom || dataRoom.user_id !== user.id) {
        throw forbiddenError('Only data room owners can revoke access');
      }

      // Revoke access
      const { error } = await this.supabase
        .from('data_room_access')
        .update({
          revoked_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        throw new DataRoomError(
          `Failed to revoke access: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to revoke access',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Get all access grants for a data room
   * @param dataRoomId - Data room UUID
   * @returns Array of access grants
   */
  async getAccessGrants(dataRoomId: string): Promise<DataRoomAccess[]> {
    try {
      const { data, error } = await this.supabase
        .from('data_room_access')
        .select('*')
        .eq('data_room_id', dataRoomId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new DataRoomError(
          `Failed to fetch access grants: ${error.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return data as DataRoomAccess[];
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to get access grants',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Check if user has required permission level
   * @param userId - User UUID
   * @param dataRoomId - Data room UUID
   * @param requiredPermission - Required permission level
   * @returns true if user has permission
   */
  async checkAccess(
    userId: string,
    dataRoomId: string,
    requiredPermission: PermissionLevel
  ): Promise<boolean> {
    try {
      // Check if user is owner
      const { data: dataRoom } = await this.supabase
        .from('data_rooms')
        .select('user_id')
        .eq('id', dataRoomId)
        .single();

      if (dataRoom?.user_id === userId) {
        return true; // Owners have all permissions
      }

      // Check access grant
      const { data: access } = await this.supabase
        .from('data_room_access')
        .select('permission_level')
        .eq('data_room_id', dataRoomId)
        .eq('user_id', userId)
        .is('revoked_at', null)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (!access) return false;

      // Check permission hierarchy
      const permissionHierarchy: PermissionLevel[] = [
        'owner',
        'editor',
        'commenter',
        'viewer',
      ];

      const userLevel = permissionHierarchy.indexOf(access.permission_level);
      const requiredLevel = permissionHierarchy.indexOf(requiredPermission);

      return userLevel <= requiredLevel; // Lower index = higher permission
    } catch {
      return false;
    }
  }

  /**
   * Accept invitation and activate access
   * @param token - Invite token (JWT)
   * @returns Activated access grant
   */
  async acceptInvite(token: string): Promise<DataRoomAccess> {
    try {
      // Verify token
      const payload = this.verifyInviteToken(token);

      // Get current user
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) {
        throw new DataRoomError(
          'User must be authenticated to accept invite',
          DataRoomErrorCode.UNAUTHORIZED,
          401
        );
      }

      // Find access grant by token
      const { data: access, error: fetchError } = await this.supabase
        .from('data_room_access')
        .select('*')
        .eq('invite_token', token)
        .is('revoked_at', null)
        .single();

      if (fetchError || !access) {
        throw new DataRoomError(
          'Invalid or expired invite token',
          DataRoomErrorCode.INVALID_TOKEN,
          400
        );
      }

      // Check if token is expired
      if (new Date(access.expires_at) < new Date()) {
        throw new DataRoomError(
          'Invite token has expired',
          DataRoomErrorCode.INVALID_TOKEN,
          400
        );
      }

      // Update access grant with user ID and accept timestamp
      const { data: updated, error: updateError } = await this.supabase
        .from('data_room_access')
        .update({
          user_id: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', access.id)
        .select()
        .single();

      if (updateError) {
        throw new DataRoomError(
          `Failed to accept invite: ${updateError.message}`,
          DataRoomErrorCode.DATABASE_ERROR,
          500
        );
      }

      return updated as DataRoomAccess;
    } catch (error) {
      if (error instanceof DataRoomError) throw error;
      throw new DataRoomError(
        'Failed to accept invite',
        DataRoomErrorCode.QUERY_FAILED,
        500
      );
    }
  }

  /**
   * Generate JWT invite token
   * @param payload - Token payload
   * @returns JWT token string
   */
  private generateInviteToken(payload: {
    data_room_id: string;
    invite_email: string;
    permission_level: PermissionLevel;
  }): string {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    return sign(payload, secret, {
      expiresIn: '30d', // Token valid for 30 days
    });
  }

  /**
   * Verify JWT invite token
   * @param token - JWT token string
   * @returns Decoded payload
   */
  private verifyInviteToken(token: string): {
    data_room_id: string;
    invite_email: string;
    permission_level: PermissionLevel;
  } {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const { verify } = require('jsonwebtoken');
      return verify(token, secret);
    } catch {
      throw new DataRoomError(
        'Invalid token',
        DataRoomErrorCode.INVALID_TOKEN,
        400
      );
    }
  }

  /**
   * Get user's permission level for a data room
   * @param userId - User UUID
   * @param dataRoomId - Data room UUID
   * @returns Permission level or null if no access
   */
  async getUserPermission(
    userId: string,
    dataRoomId: string
  ): Promise<PermissionLevel | null> {
    try {
      // Check if owner
      const { data: dataRoom } = await this.supabase
        .from('data_rooms')
        .select('user_id')
        .eq('id', dataRoomId)
        .single();

      if (dataRoom?.user_id === userId) {
        return 'owner';
      }

      // Check access grant
      const { data: access } = await this.supabase
        .from('data_room_access')
        .select('permission_level')
        .eq('data_room_id', dataRoomId)
        .eq('user_id', userId)
        .is('revoked_at', null)
        .gte('expires_at', new Date().toISOString())
        .single();

      return access?.permission_level || null;
    } catch {
      return null;
    }
  }
}
