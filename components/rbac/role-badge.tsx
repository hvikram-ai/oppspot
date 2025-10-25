'use client';

/**
 * RoleBadge Component
 * Displays a styled badge showing the user's role
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { UserRole, USER_ROLE_LABELS, USER_ROLE_ICONS } from '@/lib/rbac/types';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: UserRole;
  /** Show icon alongside role name */
  showIcon?: boolean;
  /** Custom className */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  [UserRole.ENTERPRISE_ADMIN]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [UserRole.USER]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [UserRole.VIEWER]: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1',
};

export function RoleBadge({
  role,
  showIcon = true,
  className,
  size = 'md',
}: RoleBadgeProps) {
  const label = USER_ROLE_LABELS[role] || role;
  const icon = USER_ROLE_ICONS[role];
  const colorClass = ROLE_COLORS[role];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <Badge
      variant="secondary"
      className={cn(
        colorClass,
        sizeClass,
        'font-medium',
        className
      )}
    >
      {showIcon && icon && <span className="mr-1">{icon}</span>}
      {label}
    </Badge>
  );
}
