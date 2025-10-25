/**
 * Type definitions for Admin Role Management
 * Shared types used across role management components
 */

import { UserRole } from '@/lib/rbac/types';

/**
 * User profile with role information
 */
export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  org_id: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Audit log entry for role changes
 */
export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  previous_role: UserRole | null;
  new_role: UserRole;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
  user: {
    full_name: string | null;
    email: string | null;
  };
  changed_by_user: {
    full_name: string | null;
    email: string | null;
  };
}

/**
 * Statistics for role distribution
 */
export interface RoleStatistics {
  total: number;
  super_admin: number;
  enterprise_admin: number;
  user: number;
  viewer: number;
}

/**
 * Pagination state for audit log
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}
