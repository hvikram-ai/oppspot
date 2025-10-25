/**
 * RBAC Types and Interfaces
 * Defines all types for the Role-Based Access Control system
 */

// =====================================================
// USER ROLES
// =====================================================

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ENTERPRISE_ADMIN = 'enterprise_admin',
  USER = 'user',
  VIEWER = 'viewer',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ENTERPRISE_ADMIN]: 'Enterprise Admin',
  [UserRole.USER]: 'User',
  [UserRole.VIEWER]: 'Viewer',
};

export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Platform-wide administration with full system access',
  [UserRole.ENTERPRISE_ADMIN]: 'Organization-level administration with team management',
  [UserRole.USER]: 'Standard user with full feature access',
  [UserRole.VIEWER]: 'Read-only access to dashboards and reports',
};

export const USER_ROLE_ICONS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '🔐',
  [UserRole.ENTERPRISE_ADMIN]: '👔',
  [UserRole.USER]: '👤',
  [UserRole.VIEWER]: '👁️',
};

// =====================================================
// PERMISSIONS
// =====================================================

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  permission_id: string;
  created_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  granted_by: string | null;
  granted_at: string;
  reason: string | null;
}

// =====================================================
// AUDIT LOG
// =====================================================

export interface RoleAuditLog {
  id: string;
  user_id: string | null;
  previous_role: UserRole | null;
  new_role: UserRole;
  changed_by: string | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// =====================================================
// PERMISSION NAMES
// =====================================================

export const PERMISSIONS = {
  // Organizations
  ORGANIZATIONS_CREATE: 'organizations.create',
  ORGANIZATIONS_READ: 'organizations.read',
  ORGANIZATIONS_UPDATE: 'organizations.update',
  ORGANIZATIONS_DELETE: 'organizations.delete',
  ORGANIZATIONS_SUSPEND: 'organizations.suspend',

  // Users
  USERS_INVITE: 'users.invite',
  USERS_MANAGE: 'users.manage',
  USERS_ASSIGN_ROLES: 'users.assign_roles',
  USERS_REMOVE: 'users.remove',

  // Streams
  STREAMS_CREATE: 'streams.create',
  STREAMS_READ: 'streams.read',
  STREAMS_UPDATE: 'streams.update',
  STREAMS_DELETE: 'streams.delete',

  // Agents
  AGENTS_CREATE: 'agents.create',
  AGENTS_READ: 'agents.read',
  AGENTS_UPDATE: 'agents.update',
  AGENTS_DELETE: 'agents.delete',
  AGENTS_EXECUTE: 'agents.execute',

  // Data Rooms
  DATA_ROOMS_CREATE: 'data_rooms.create',
  DATA_ROOMS_READ: 'data_rooms.read',
  DATA_ROOMS_UPDATE: 'data_rooms.update',
  DATA_ROOMS_DELETE: 'data_rooms.delete',

  // Analytics
  ANALYTICS_VIEW_ORG: 'analytics.view_org',
  ANALYTICS_VIEW_PLATFORM: 'analytics.view_platform',
  ANALYTICS_EXPORT: 'analytics.export',

  // Integrations
  INTEGRATIONS_MANAGE: 'integrations.manage',
  INTEGRATIONS_VIEW: 'integrations.view',

  // Billing
  BILLING_MANAGE: 'billing.manage',
  BILLING_VIEW: 'billing.view',

  // API Keys
  API_KEYS_CREATE: 'api_keys.create',
  API_KEYS_VIEW: 'api_keys.view',
  API_KEYS_DELETE: 'api_keys.delete',

  // Audit Logs
  AUDIT_VIEW_PLATFORM: 'audit.view_platform',
  AUDIT_VIEW_ORG: 'audit.view_org',

  // Lists
  LISTS_CREATE: 'lists.create',
  LISTS_READ: 'lists.read',
  LISTS_UPDATE: 'lists.update',
  LISTS_DELETE: 'lists.delete',

  // Searches
  SEARCHES_PERFORM: 'searches.perform',
  SEARCHES_SAVE: 'searches.save',
  SEARCHES_EXPORT: 'searches.export',
} as const;

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// =====================================================
// HELPER TYPES
// =====================================================

export interface UserWithPermissions {
  id: string;
  role: UserRole;
  permissions: string[];
  org_id: string | null;
}

export interface RoleChangeRequest {
  user_id: string;
  new_role: UserRole;
  reason?: string;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

// =====================================================
// RBAC CONTEXT
// =====================================================

export interface RBACContextValue {
  role: UserRole | null;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
  canAccessOrg: (orgId: string) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

// =====================================================
// ROLE HIERARCHY
// =====================================================

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.ENTERPRISE_ADMIN]: 3,
  [UserRole.USER]: 2,
  [UserRole.VIEWER]: 1,
};

/**
 * Check if a role has higher privilege than another
 */
export function roleHasHigherPrivilege(role1: UserRole, role2: UserRole): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Get the roles that a user can assign (one level below or equal)
 */
export function getAssignableRoles(currentRole: UserRole): UserRole[] {
  const currentLevel = ROLE_HIERARCHY[currentRole];

  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level < currentLevel)
    .map(([role, _]) => role as UserRole);
}

/**
 * Check if role can assign another role
 */
export function canAssignRole(assignerRole: UserRole, targetRole: UserRole): boolean {
  // Super Admin can assign any role
  if (assignerRole === UserRole.SUPER_ADMIN) {
    return true;
  }

  // Enterprise Admin can assign User and Viewer
  if (assignerRole === UserRole.ENTERPRISE_ADMIN) {
    return [UserRole.USER, UserRole.VIEWER].includes(targetRole);
  }

  // Others cannot assign roles
  return false;
}
