// Financial Role Management Helpers
// Feature: 012-oppspot-docs-financial
// Description: Helper functions for checking and managing Financial Editor/Admin roles

import { createClient } from '@/lib/supabase/server'
import { FinancialRole } from '@/lib/financials/types'

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

export interface FinancialRoleAssignment {
  id: string
  user_id: string
  company_id: string
  role: FinancialRole
  granted_at: string
  granted_by: string | null
}

export interface RoleCheckResult {
  hasRole: boolean
  roles: FinancialRole[]
}

// ==============================================================================
// ROLE CHECKING FUNCTIONS
// ==============================================================================

/**
 * Check if a user has any of the specified financial roles for a company
 * @param userId - The user's ID (auth.uid())
 * @param companyId - The company's UUID
 * @param requiredRoles - Array of roles to check for (defaults to ['editor', 'admin'])
 * @returns Promise<boolean> - True if user has at least one of the required roles
 */
export async function hasFinancialRole(
  userId: string,
  companyId: string,
  requiredRoles: FinancialRole[] = [FinancialRole.EDITOR, FinancialRole.ADMIN]
): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('financial_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .in('role', requiredRoles)
    .limit(1)
    .single()

  if (error) {
    // No role found or database error
    return false
  }

  return !!data
}

/**
 * Get all financial roles for a user at a specific company
 * @param userId - The user's ID (auth.uid())
 * @param companyId - The company's UUID
 * @returns Promise<RoleCheckResult> - Object with hasRole flag and array of roles
 */
export async function getFinancialRoles(
  userId: string,
  companyId: string
): Promise<RoleCheckResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('financial_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('company_id', companyId)

  if (error || !data) {
    return { hasRole: false, roles: [] }
  }

  const roles = data.map((r) => r.role as FinancialRole)
  return {
    hasRole: roles.length > 0,
    roles,
  }
}

/**
 * Check if a user has admin role (for role management operations)
 * @param userId - The user's ID (auth.uid())
 * @param companyId - The company's UUID
 * @returns Promise<boolean> - True if user is an admin
 */
export async function isFinancialAdmin(
  userId: string,
  companyId: string
): Promise<boolean> {
  return hasFinancialRole(userId, companyId, [FinancialRole.ADMIN])
}

// ==============================================================================
// ROLE MANAGEMENT FUNCTIONS (ADMIN ONLY)
// ==============================================================================

/**
 * Grant a financial role to a user (admin only)
 * @param targetUserId - The user to grant the role to
 * @param companyId - The company UUID
 * @param role - The role to grant (editor or admin)
 * @param grantedBy - The admin user granting the role
 * @returns Promise<{ success: boolean; error?: string; data?: FinancialRoleAssignment }>
 */
export async function grantFinancialRole(
  targetUserId: string,
  companyId: string,
  role: FinancialRole,
  grantedBy: string
): Promise<{
  success: boolean
  error?: string
  data?: FinancialRoleAssignment
}> {
  const supabase = await createClient()

  // Verify granter is an admin
  const isAdmin = await isFinancialAdmin(grantedBy, companyId)
  if (!isAdmin) {
    return {
      success: false,
      error: 'Only Financial Admins can grant roles',
    }
  }

  // Insert role (will fail if already exists due to UNIQUE constraint)
  const { data, error } = await supabase
    .from('financial_roles')
    .insert({
      user_id: targetUserId,
      company_id: companyId,
      role,
      granted_by: grantedBy,
    })
    .select()
    .single()

  if (error) {
    // Check if it's a duplicate
    if (error.code === '23505') {
      return {
        success: false,
        error: 'User already has this role',
      }
    }
    return {
      success: false,
      error: error.message,
    }
  }

  return {
    success: true,
    data: data as FinancialRoleAssignment,
  }
}

/**
 * Revoke a financial role from a user (admin only)
 * @param targetUserId - The user to revoke the role from
 * @param companyId - The company UUID
 * @param role - The role to revoke
 * @param revokedBy - The admin user revoking the role
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function revokeFinancialRole(
  targetUserId: string,
  companyId: string,
  role: FinancialRole,
  revokedBy: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Verify revoker is an admin
  const isAdmin = await isFinancialAdmin(revokedBy, companyId)
  if (!isAdmin) {
    return {
      success: false,
      error: 'Only Financial Admins can revoke roles',
    }
  }

  // Prevent self-revocation of admin role
  if (targetUserId === revokedBy && role === FinancialRole.ADMIN) {
    return {
      success: false,
      error: 'Cannot revoke your own admin role',
    }
  }

  // Delete role
  const { error } = await supabase
    .from('financial_roles')
    .delete()
    .eq('user_id', targetUserId)
    .eq('company_id', companyId)
    .eq('role', role)

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  return { success: true }
}

/**
 * List all users with financial roles for a company (admin only)
 * @param companyId - The company UUID
 * @param requesterId - The user requesting the list
 * @returns Promise<{ success: boolean; error?: string; data?: FinancialRoleAssignment[] }>
 */
export async function listFinancialRoles(
  companyId: string,
  requesterId: string
): Promise<{
  success: boolean
  error?: string
  data?: FinancialRoleAssignment[]
}> {
  const supabase = await createClient()

  // Verify requester is an admin
  const isAdmin = await isFinancialAdmin(requesterId, companyId)
  if (!isAdmin) {
    return {
      success: false,
      error: 'Only Financial Admins can view role assignments',
    }
  }

  const { data, error } = await supabase
    .from('financial_roles')
    .select('*')
    .eq('company_id', companyId)
    .order('granted_at', { ascending: false })

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  return {
    success: true,
    data: data as FinancialRoleAssignment[],
  }
}

// ==============================================================================
// AUDIT LOGGING
// ==============================================================================

/**
 * Log a role check failure for audit purposes
 * @param userId - The user who failed the check
 * @param companyId - The company they tried to access
 * @param action - The action they attempted
 * @param requiredRoles - The roles that were required
 */
export async function logRoleCheckFailure(
  userId: string,
  companyId: string,
  action: string,
  requiredRoles: FinancialRole[]
): Promise<void> {
  // In production, this would write to an audit log table
  // For now, we'll just console.log
  console.warn('[ROLE_CHECK_FAILURE]', {
    timestamp: new Date().toISOString(),
    userId,
    companyId,
    action,
    requiredRoles,
  })

  // TODO: Implement proper audit logging to database
  // Example schema:
  // CREATE TABLE financial_audit_log (
  //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  //   user_id UUID NOT NULL,
  //   company_id UUID NOT NULL,
  //   action VARCHAR(100) NOT NULL,
  //   success BOOLEAN NOT NULL,
  //   details JSONB,
  //   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  // );
}
