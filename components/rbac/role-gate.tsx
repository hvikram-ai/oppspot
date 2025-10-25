'use client';

/**
 * RoleGate Component
 * Conditionally renders children based on user role
 */

import React from 'react';
import { useHasRole, useRBACLoading } from '@/lib/rbac/hooks';
import type { UserRole } from '@/lib/rbac/types';

interface RoleGateProps {
  /** Allowed roles that can see the content */
  roles: UserRole[];
  /** Content to render if user has required role */
  children: React.ReactNode;
  /** Optional fallback content if user doesn't have role */
  fallback?: React.ReactNode;
  /** Show loading state */
  showLoading?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

export function RoleGate({
  roles,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent,
}: RoleGateProps) {
  const hasRole = useHasRole(...roles);
  const loading = useRBACLoading();

  if (loading && showLoading) {
    return <>{loadingComponent || <div className="animate-pulse">Loading...</div>}</>;
  }

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
