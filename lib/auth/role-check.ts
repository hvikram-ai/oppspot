/**
 * Lightweight role helpers for server-side checks
 */

import { createClient } from '@/lib/supabase/server'

const ADMIN_ROLES = ['admin', 'owner', 'super_admin', 'enterprise_admin'] as const
type AdminRole = (typeof ADMIN_ROLES)[number]

export interface UserRoleResult {
  role: string | null
  isAdmin: boolean
}

/**
 * Fetch a user's role and whether it is considered an admin-level role.
 * Falls back to non-admin when profile lookup fails.
 */
export async function getUserRoleWithAdminFlag(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<UserRoleResult> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const role = profile?.role ?? null
  const isAdmin = !!role && ADMIN_ROLES.includes(role as AdminRole)

  if (error) {
    console.warn('[role-check] Failed to fetch profile role:', error)
  }

  return { role, isAdmin }
}

/**
 * Convenience helper for admin-only routes.
 */
export async function requireAdminRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  const { isAdmin } = await getUserRoleWithAdminFlag(supabase, userId)
  return isAdmin
}
