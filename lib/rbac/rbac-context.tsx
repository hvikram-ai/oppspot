'use client';

/**
 * RBAC Context Provider
 * Provides role and permission information to React components
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole, RBACContextValue } from './types';

// =====================================================
// CONTEXT DEFINITION
// =====================================================

const RBACContext = createContext<RBACContextValue | undefined>(undefined);

// =====================================================
// PROVIDER COMPONENT
// =====================================================

interface RBACProviderProps {
  children: React.ReactNode;
}

export function RBACProvider({ children }: RBACProviderProps) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // Load user role and permissions
  useEffect(() => {
    loadUserRoleAndPermissions();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUserRoleAndPermissions();
      } else {
        setRole(null);
        setPermissions([]);
        setOrgId(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUserRoleAndPermissions() {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRole(null);
        setPermissions([]);
        setOrgId(null);
        return;
      }

      // Fetch user profile with role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        setRole(profile.role as UserRole);
        setOrgId(profile.org_id);
      }

      // Fetch user permissions
      const { data: perms } = await supabase.rpc('get_user_permissions', {
        user_id: user.id,
      });

      if (perms) {
        setPermissions(perms);
      }
    } catch (error) {
      console.error('Error loading RBAC data:', error);
    } finally {
      setLoading(false);
    }
  }

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  // Check if user has any of the specified roles
  const hasRole = (...roles: UserRole[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };

  // Check if user is org admin or higher
  const isOrgAdmin =
    role === 'super_admin' || role === 'enterprise_admin';

  // Check if user is super admin
  const isSuperAdmin = role === 'super_admin';

  // Check if user can access a specific organization
  const canAccessOrg = (targetOrgId: string): boolean => {
    if (isSuperAdmin) return true;
    return orgId === targetOrgId;
  };

  // Expose refresh function to allow manual reloading of role/permissions
  const refresh = async () => {
    await loadUserRoleAndPermissions();
  };

  const value: RBACContextValue = {
    role,
    permissions,
    hasPermission,
    hasRole,
    isOrgAdmin,
    isSuperAdmin,
    canAccessOrg,
    loading,
    refresh,
  };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

// =====================================================
// HOOK
// =====================================================

export function useRBAC(): RBACContextValue {
  const context = useContext(RBACContext);

  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }

  return context;
}
