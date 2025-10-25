'use client';

/**
 * RBAC React Hooks
 * Convenience hooks for checking roles and permissions in components
 */

import { useRBAC } from './rbac-context';
import type { UserRole } from './types';

// =====================================================
// ROLE HOOKS
// =====================================================

/**
 * Get the current user's role
 *
 * @example
 * const role = useRole();
 * if (role === 'super_admin') { ... }
 */
export function useRole(): UserRole | null {
  const { role } = useRBAC();
  return role;
}

/**
 * Check if user has a specific role
 *
 * @example
 * const isSuperAdmin = useHasRole('super_admin');
 */
export function useHasRole(...roles: UserRole[]): boolean {
  const { hasRole } = useRBAC();
  return hasRole(...roles);
}

/**
 * Check if user is Super Admin
 *
 * @example
 * const isSuperAdmin = useIsSuperAdmin();
 */
export function useIsSuperAdmin(): boolean {
  const { isSuperAdmin } = useRBAC();
  return isSuperAdmin;
}

/**
 * Check if user is Enterprise Admin or higher
 *
 * @example
 * const isOrgAdmin = useIsOrgAdmin();
 */
export function useIsOrgAdmin(): boolean {
  const { isOrgAdmin } = useRBAC();
  return isOrgAdmin;
}

// =====================================================
// PERMISSION HOOKS
// =====================================================

/**
 * Get all user permissions
 *
 * @example
 * const permissions = usePermissions();
 */
export function usePermissions(): string[] {
  const { permissions } = useRBAC();
  return permissions;
}

/**
 * Check if user has a specific permission
 *
 * @example
 * const canCreateStreams = useHasPermission('streams.create');
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission } = useRBAC();
  return hasPermission(permission);
}

/**
 * Check if user has ALL of the specified permissions
 *
 * @example
 * const canManageStreams = useHasAllPermissions('streams.create', 'streams.update', 'streams.delete');
 */
export function useHasAllPermissions(...permissions: string[]): boolean {
  const { hasPermission } = useRBAC();
  return permissions.every((perm) => hasPermission(perm));
}

/**
 * Check if user has ANY of the specified permissions
 *
 * @example
 * const canViewData = useHasAnyPermission('streams.read', 'agents.read');
 */
export function useHasAnyPermission(...permissions: string[]): boolean {
  const { hasPermission } = useRBAC();
  return permissions.some((perm) => hasPermission(perm));
}

// =====================================================
// ORGANIZATION HOOKS
// =====================================================

/**
 * Check if user can access a specific organization
 *
 * @example
 * const canAccess = useCanAccessOrg(orgId);
 */
export function useCanAccessOrg(orgId: string): boolean {
  const { canAccessOrg } = useRBAC();
  return canAccessOrg(orgId);
}

// =====================================================
// LOADING STATE
// =====================================================

/**
 * Check if RBAC data is still loading
 *
 * @example
 * const loading = useRBACLoading();
 * if (loading) return <Spinner />;
 */
export function useRBACLoading(): boolean {
  const { loading } = useRBAC();
  return loading;
}

// =====================================================
// COMPOSITE HOOKS
// =====================================================

/**
 * Check if user can perform a specific action on a resource
 * Combines role and permission checks
 *
 * @example
 * const canEdit = useCanPerformAction('streams.update', 'enterprise_admin', 'user');
 */
export function useCanPerformAction(
  permission: string,
  ...allowedRoles: UserRole[]
): boolean {
  const { hasPermission, hasRole } = useRBAC();

  // User must have both the permission AND an allowed role
  return hasPermission(permission) && hasRole(...allowedRoles);
}

/**
 * Get a permission check result with loading state
 * Useful for showing loading indicators while checking permissions
 *
 * @example
 * const { allowed, loading } = usePermissionCheck('streams.create');
 */
export function usePermissionCheck(permission: string): {
  allowed: boolean;
  loading: boolean;
} {
  const { hasPermission, loading } = useRBAC();

  return {
    allowed: loading ? false : hasPermission(permission),
    loading,
  };
}

/**
 * Get a role check result with loading state
 *
 * @example
 * const { allowed, loading } = useRoleCheck('super_admin', 'enterprise_admin');
 */
export function useRoleCheck(...roles: UserRole[]): {
  allowed: boolean;
  loading: boolean;
} {
  const { hasRole, loading } = useRBAC();

  return {
    allowed: loading ? false : hasRole(...roles),
    loading,
  };
}

// =====================================================
// FEATURE FLAGS BASED ON ROLE
// =====================================================

/**
 * Check if a feature is enabled for the user's role
 * Useful for feature gating
 *
 * @example
 * const canUseAdvancedFeatures = useFeatureEnabled({
 *   super_admin: true,
 *   enterprise_admin: true,
 *   user: false,
 *   viewer: false,
 * });
 */
export function useFeatureEnabled(
  featureMap: Partial<Record<UserRole, boolean>>
): boolean {
  const role = useRole();

  if (!role) return false;

  return featureMap[role] ?? false;
}

// =====================================================
// ADMIN CHECKS
// =====================================================

/**
 * Check if user can manage other users
 *
 * @example
 * const canManageUsers = useCanManageUsers();
 */
export function useCanManageUsers(): boolean {
  return useHasPermission('users.manage');
}

/**
 * Check if user can manage organization settings
 *
 * @example
 * const canManageOrg = useCanManageOrganization();
 */
export function useCanManageOrganization(): boolean {
  return useHasPermission('organizations.update');
}

/**
 * Check if user can view billing information
 *
 * @example
 * const canViewBilling = useCanViewBilling();
 */
export function useCanViewBilling(): boolean {
  return useHasPermission('billing.view');
}

/**
 * Check if user can manage billing
 *
 * @example
 * const canManageBilling = useCanManageBilling();
 */
export function useCanManageBilling(): boolean {
  return useHasPermission('billing.manage');
}
