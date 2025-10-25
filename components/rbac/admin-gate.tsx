'use client';

/**
 * AdminGate Component
 * Shorthand for checking if user is an admin (Enterprise Admin or Super Admin)
 */

import React from 'react';
import { RoleGate } from './role-gate';
import { UserRole } from '@/lib/rbac/types';

interface AdminGateProps {
  /** Content to render if user is admin */
  children: React.ReactNode;
  /** Optional fallback content */
  fallback?: React.ReactNode;
  /** Show loading state */
  showLoading?: boolean;
}

export function AdminGate({ children, fallback, showLoading }: AdminGateProps) {
  return (
    <RoleGate
      roles={[UserRole.SUPER_ADMIN, UserRole.ENTERPRISE_ADMIN]}
      fallback={fallback}
      showLoading={showLoading}
    >
      {children}
    </RoleGate>
  );
}
