'use client';

/**
 * Admin Dashboard Landing Page
 * Centralized hub for all administrative tools and system management
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { AdminGate } from '@/components/rbac/admin-gate';
import { RoleBadge } from '@/components/rbac/role-badge';
import { ErrorBoundary } from '@/components/error-boundary';
import { DashboardSkeleton } from '@/components/admin/dashboard-skeleton';
import { AdminStatsGrid } from '@/components/admin/admin-stats-grid';
import { AdminToolsGrid } from '@/components/admin/admin-tools-grid';
import { QuickActionsGrid } from '@/components/admin/quick-actions-grid';
import type { AdminStats, AdminTool } from '@/types/admin-components';
import { useRole, useIsSuperAdmin } from '@/lib/rbac/hooks';
import {
  ShieldCheck,
  Bot,
  Upload,
  Activity,
  Database,
  Sparkles,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('Admin');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const role = useRole();
  const isSuperAdmin = useIsSuperAdmin();
  const supabase = createClient();

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single() as { data: { full_name: string | null; email: string | null } | null };

        if (profile) {
          setUserName(profile.full_name || profile.email?.split('@')[0] || 'Admin');
        }
      }

      // Fetch admin statistics
      const [usersResponse, roleChangesResponse, agentsResponse] = await Promise.all([
        fetch('/api/rbac/users'),
        supabase
          .from('role_audit_log')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('agents')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
      ]);

      let totalUsers = 0;
      const usersByRole: Record<string, number> = {};

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        const users = usersData.data?.users || [];
        totalUsers = users.length;

        users.forEach((u: { role: string }) => {
          usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
        });
      }

      setStats({
        totalUsers,
        usersByRole,
        recentRoleChanges: roleChangesResponse.count || 0,
        activeAgents: agentsResponse.count || 0,
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const adminTools: AdminTool[] = [
    {
      title: 'Role Management',
      description: 'Manage user roles and permissions within your organization',
      href: '/admin/roles',
      icon: ShieldCheck,
      badge: 'New',
    },
    {
      title: 'System Alerts',
      description: 'Monitor critical failures and system health in real-time',
      href: '/admin/alerts',
      icon: Activity,
      badge: 'New',
    },
    {
      title: 'AI Agents',
      description: 'Configure and manage autonomous AI agents for automation',
      href: '/admin/agents',
      icon: Bot,
      isPremium: true,
    },
    {
      title: 'Import Data',
      description: 'Bulk import business data from external sources',
      href: '/admin/import',
      icon: Upload,
    },
    {
      title: 'Signal Detection',
      description: 'Configure buying signal detection and monitoring rules',
      href: '/admin/signals',
      icon: Activity,
    },
    {
      title: 'Vector Embeddings',
      description: 'Manage AI embeddings for semantic search and recommendations',
      href: '/admin/embeddings',
      icon: Database,
      requiresSuperAdmin: true,
    },
    {
      title: 'Data Enhancement',
      description: 'Enhance and enrich existing business data with AI',
      href: '/admin/enhance',
      icon: Sparkles,
    },
  ];

  // Show full skeleton on initial load
  if (loading) {
    return (
      <ErrorBoundary>
        <AdminGate>
          <DashboardSkeleton />
        </AdminGate>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AdminGate>
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Welcome back, {userName}
              </h1>
              <p className="text-muted-foreground">
                System administration and management dashboard
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              {role && <RoleBadge role={role} showIcon size="lg" />}
            </div>
          </div>

          {isSuperAdmin && (
            <Alert className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-900 dark:text-purple-100">
                You have Super Admin access with platform-wide privileges
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Statistics */}
        <AdminStatsGrid stats={stats} refreshing={refreshing} />

        {/* Admin Tools Grid */}
        <AdminToolsGrid tools={adminTools} isSuperAdmin={isSuperAdmin} />

        {/* Quick Actions */}
        <QuickActionsGrid />

        {/* System Status */}
        <div className="mt-8 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>All systems operational</span>
          </div>
          <div>
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>
      </AdminGate>
    </ErrorBoundary>
  );
}
