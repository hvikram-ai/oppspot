'use client';

/**
 * SuperAdminGate Component
 * Shorthand for checking if user is a Super Admin
 */

import React from 'react';
import { RoleGate } from './role-gate';
import { UserRole } from '@/lib/rbac/types';

interface SuperAdminGateProps {
  /** Content to render if user is super admin */
  children: React.ReactNode;
  /** Optional fallback content */
  fallback?: React.ReactNode;
  /** Show loading state */
  showLoading?: boolean;
}

export function SuperAdminGate({ children, fallback, showLoading }: SuperAdminGateProps) {
  return (
    <RoleGate
      roles={[UserRole.SUPER_ADMIN]}
      fallback={fallback}
      showLoading={showLoading}
    >
      {children}
    </RoleGate>
  );
}
