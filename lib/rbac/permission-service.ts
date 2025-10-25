/**
 * Permission Service
 * Core service for checking and managing user permissions
 */

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import type {
  UserRole,
  Permission,
  UserPermission,
  RoleChangeRequest,
  PermissionCheckResult,
} from './types';
import { PERMISSIONS } from './types';

// =====================================================
// PERMISSION CHECKING
// =====================================================

export class PermissionService {
  /**
   * Check if a user has a specific permission
   */
  static async userHasPermission(
    userId: string,
    permissionName: string
  ): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('user_has_permission', {
      user_id: userId,
      permission_name: permissionName,
    });

    if (error) {
      console.error('Error checking permission:', error);
      return false;
    }

    return data === true;
  }

  /**
   * Check if a user has ANY of the specified permissions
   */
  static async userHasAnyPermission(
    userId: string,
    permissionNames: string[]
  ): Promise<boolean> {
    for (const permission of permissionNames) {
      const hasPermission = await this.userHasPermission(userId, permission);
      if (hasPermission) return true;
    }
    return false;
  }

  /**
   * Check if a user has ALL of the specified permissions
   */
  static async userHasAllPermissions(
    userId: string,
    permissionNames: string[]
  ): Promise<boolean> {
    for (const permission of permissionNames) {
      const hasPermission = await this.userHasPermission(userId, permission);
      if (!hasPermission) return false;
    }
    return true;
  }

  /**
   * Get all permissions for a specific role
   */
  static async getRolePermissions(role: UserRole): Promise<Permission[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permission:permissions (
          id,
          name,
          description,
          resource,
          action,
          created_at,
          updated_at
        )
      `)
      .eq('role', role);

    if (error) {
      console.error('Error fetching role permissions:', error);
      return [];
    }

    return data?.map((rp: any) => rp.permission).filter(Boolean) || [];
  }

  /**
   * Get all permissions for a user (role-based + overrides)
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    const supabase = await createClient();

    // Get user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (!profile) return [];

    // Get role-based permissions
    const rolePermissions = await this.getRolePermissions(profile.role);
    const permissionNames = new Set(rolePermissions.map(p => p.name));

    // Get user-specific permission overrides
    const { data: userPerms } = await supabase
      .from('user_permissions')
      .select(`
        granted,
        permission:permissions (name)
      `)
      .eq('user_id', userId);

    if (userPerms) {
      userPerms.forEach((up: any) => {
        const permName = up.permission?.name;
        if (permName) {
          if (up.granted) {
            permissionNames.add(permName);
          } else {
            permissionNames.delete(permName);
          }
        }
      });
    }

    return Array.from(permissionNames);
  }

  // =====================================================
  // ROLE MANAGEMENT
  // =====================================================

  /**
   * Get a user's role
   */
  static async getUserRole(userId: string): Promise<UserRole | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching user role:', error);
      return null;
    }

    return data.role as UserRole;
  }

  /**
   * Change a user's role (with audit logging)
   */
  static async changeUserRole(
    request: RoleChangeRequest,
    changedBy: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<PermissionCheckResult> {
    const adminClient = createAdminClient();

    // Get current role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', request.user_id)
      .single();

    if (!profile) {
      return { allowed: false, reason: 'User not found' };
    }

    // Set context for trigger
    await adminClient.rpc('set_config', {
      setting: 'app.current_user_id',
      value: changedBy,
    });

    if (request.reason) {
      await adminClient.rpc('set_config', {
        setting: 'app.role_change_reason',
        value: request.reason,
      });
    }

    // Update role
    const { error } = await adminClient
      .from('profiles')
      .update({ role: request.new_role })
      .eq('id', request.user_id);

    if (error) {
      console.error('Error changing user role:', error);
      return { allowed: false, reason: error.message };
    }

    // Log the change (trigger handles this, but we can add IP/UA)
    if (ipAddress || userAgent) {
      await adminClient
        .from('role_audit_log')
        .update({
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .eq('user_id', request.user_id)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    return { allowed: true };
  }

  /**
   * Check if a user is a Super Admin
   */
  static async isSuperAdmin(userId: string): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('is_super_admin', {
      user_id: userId,
    });

    if (error) {
      console.error('Error checking super admin:', error);
      return false;
    }

    return data === true;
  }

  /**
   * Check if a user is an Enterprise Admin or higher
   */
  static async isEnterpriseAdmin(userId: string): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('is_enterprise_admin', {
      user_id: userId,
    });

    if (error) {
      console.error('Error checking enterprise admin:', error);
      return false;
    }

    return data === true;
  }

  // =====================================================
  // USER-SPECIFIC PERMISSION OVERRIDES
  // =====================================================

  /**
   * Grant a specific permission to a user
   */
  static async grantPermission(
    userId: string,
    permissionName: string,
    grantedBy: string,
    reason?: string
  ): Promise<PermissionCheckResult> {
    const supabase = await createClient();

    // Get permission ID
    const { data: permission } = await supabase
      .from('permissions')
      .select('id')
      .eq('name', permissionName)
      .single();

    if (!permission) {
      return { allowed: false, reason: 'Permission not found' };
    }

    // Insert or update user permission
    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: userId,
        permission_id: permission.id,
        granted: true,
        granted_by: grantedBy,
        reason,
      });

    if (error) {
      console.error('Error granting permission:', error);
      return { allowed: false, reason: error.message };
    }

    return { allowed: true };
  }

  /**
   * Revoke a specific permission from a user
   */
  static async revokePermission(
    userId: string,
    permissionName: string,
    revokedBy: string,
    reason?: string
  ): Promise<PermissionCheckResult> {
    const supabase = await createClient();

    // Get permission ID
    const { data: permission } = await supabase
      .from('permissions')
      .select('id')
      .eq('name', permissionName)
      .single();

    if (!permission) {
      return { allowed: false, reason: 'Permission not found' };
    }

    // Insert or update user permission to revoked
    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: userId,
        permission_id: permission.id,
        granted: false,
        granted_by: revokedBy,
        reason,
      });

    if (error) {
      console.error('Error revoking permission:', error);
      return { allowed: false, reason: error.message };
    }

    return { allowed: true };
  }

  /**
   * Get user-specific permission overrides
   */
  static async getUserPermissionOverrides(
    userId: string
  ): Promise<UserPermission[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user permission overrides:', error);
      return [];
    }

    return data || [];
  }

  // =====================================================
  // ORGANIZATION ACCESS
  // =====================================================

  /**
   * Check if a user can access a specific organization
   */
  static async canAccessOrganization(
    userId: string,
    orgId: string
  ): Promise<boolean> {
    // Super admins can access any organization
    if (await this.isSuperAdmin(userId)) {
      return true;
    }

    // Check if user belongs to the organization
    const supabase = await createClient();
    const { data } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single();

    return data?.org_id === orgId;
  }

  /**
   * Get user's organization ID
   */
  static async getUserOrgId(userId: string): Promise<string | null> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_user_org_id', {
      user_id: userId,
    });

    if (error) {
      console.error('Error getting user org ID:', error);
      return null;
    }

    return data;
  }

  // =====================================================
  // AUDIT LOG
  // =====================================================

  /**
   * Get role change audit log
   */
  static async getRoleAuditLog(
    filters?: {
      userId?: string;
      changedBy?: string;
      limit?: number;
    }
  ) {
    const supabase = await createClient();

    let query = supabase
      .from('role_audit_log')
      .select(`
        *,
        user:profiles!role_audit_log_user_id_fkey(id, full_name, email),
        changed_by_user:profiles!role_audit_log_changed_by_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters?.changedBy) {
      query = query.eq('changed_by', filters.changedBy);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit log:', error);
      return [];
    }

    return data || [];
  }
}
