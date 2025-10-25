'use client';

/**
 * AdminStatsGrid Component
 * Displays key statistics for the admin dashboard
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShieldCheck, Clock, Bot } from 'lucide-react';
import { UserRole } from '@/lib/rbac/types';
import type { AdminStatsGridProps } from '@/types/admin-components';

export function AdminStatsGrid({ stats, refreshing = false }: AdminStatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {/* Total Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Users
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {refreshing ? <Skeleton className="h-8 w-16" /> : stats?.totalUsers || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across all roles
          </p>
        </CardContent>
      </Card>

      {/* Enterprise Admins */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Enterprise Admins
          </CardTitle>
          <ShieldCheck className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {refreshing ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              stats?.usersByRole[UserRole.ENTERPRISE_ADMIN] || 0
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Organization administrators
          </p>
        </CardContent>
      </Card>

      {/* Recent Role Changes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Role Changes
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {refreshing ? <Skeleton className="h-8 w-16" /> : stats?.recentRoleChanges || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Last 7 days
          </p>
        </CardContent>
      </Card>

      {/* Active AI Agents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Active AI Agents
          </CardTitle>
          <Bot className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {refreshing ? <Skeleton className="h-8 w-16" /> : stats?.activeAgents || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Running automation
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
