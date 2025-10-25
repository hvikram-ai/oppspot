'use client';

/**
 * PermissionGate Component
 * Conditionally renders children based on user permissions
 */

import React from 'react';
import { useHasPermission, useHasAllPermissions, useHasAnyPermission, useRBACLoading } from '@/lib/rbac/hooks';

interface PermissionGateProps {
  /** Single permission to check */
  permission?: string;
  /** Multiple permissions - ALL required */
  allOf?: string[];
  /** Multiple permissions - ANY required */
  anyOf?: string[];
  /** Content to render if user has permission */
  children: React.ReactNode;
  /** Optional fallback content if user doesn't have permission */
  fallback?: React.ReactNode;
  /** Show loading state */
  showLoading?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

export function PermissionGate({
  permission,
  allOf,
  anyOf,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent,
}: PermissionGateProps) {
  const loading = useRBACLoading();

  // Determine which check to use
  const hasSinglePermission = useHasPermission(permission || '');
  const hasAllPermissions = useHasAllPermissions(...(allOf || []));
  const hasAnyPermissions = useHasAnyPermission(...(anyOf || []));

  if (loading && showLoading) {
    return <>{loadingComponent || <div className="animate-pulse">Loading...</div>}</>;
  }

  let hasPermission = false;

  if (permission) {
    hasPermission = hasSinglePermission;
  } else if (allOf && allOf.length > 0) {
    hasPermission = hasAllPermissions;
  } else if (anyOf && anyOf.length > 0) {
    hasPermission = hasAnyPermissions;
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
