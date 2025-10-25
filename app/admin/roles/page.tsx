'use client';

/**
 * Role Management Page for Enterprise Admins
 * Allows Enterprise Admins and Super Admins to manage user roles within their organization
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminGate } from '@/components/rbac/admin-gate';
import { ErrorBoundary } from '@/components/error-boundary';
import { RoleStats } from '@/components/admin/role-stats';
import { UserTable } from '@/components/admin/user-table';
import { AuditLogList } from '@/components/admin/audit-log-list';
import { useIsOrgAdmin, useIsSuperAdmin } from '@/lib/rbac/hooks';
import { useRBAC } from '@/lib/rbac/rbac-context';
import { UserRole } from '@/lib/rbac/types';
import { toast } from 'sonner';
import { Search, History } from 'lucide-react';
import { RoleChangeDialog } from '@/components/rbac/role-change-dialog';
import { UserProfile, AuditLogEntry, RoleStatistics, PaginationState } from '@/types/admin-roles';

export default function RoleManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLogLoading, setAuditLogLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  const router = useRouter();
  const isOrgAdmin = useIsOrgAdmin();
  const isSuperAdmin = useIsSuperAdmin();
  const { refresh: refreshRBAC } = useRBAC();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rbac/users');

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      setUsers(result.data.users);
      setFilteredUsers(result.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLog = useCallback(async (page = 1, pageSize = pagination.pageSize) => {
    try {
      setAuditLogLoading(true);
      const supabase = createClient();

      // Get total count
      const { count } = await supabase
        .from('role_audit_log')
        .select('*', { count: 'exact', head: true });

      // Get paginated data
      const offset = (page - 1) * pageSize;
      const { data, error } = await supabase
        .from('role_audit_log')
        .select(`
          *,
          user:profiles!role_audit_log_user_id_fkey(id, full_name, email),
          changed_by_user:profiles!role_audit_log_changed_by_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('Error fetching audit log:', error);
        toast.error('Failed to load audit log');
        return;
      }

      setAuditLog(data as unknown as AuditLogEntry[] || []);
      setPagination(prev => ({
        ...prev,
        page,
        pageSize,
        total: count || 0,
      }));
    } catch (error) {
      console.error('Error fetching audit log:', error);
      toast.error('Failed to load audit log');
    } finally {
      setAuditLogLoading(false);
    }
  }, [pagination.pageSize]);

  // Load initial data - must be after fetchUsers and fetchAuditLog declarations
  useEffect(() => {
    if (!isOrgAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
    fetchAuditLog();
  }, [isOrgAdmin, router, fetchUsers, fetchAuditLog]);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.email?.toLowerCase().includes(query) ||
          user.full_name?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const handlePageChange = (newPage: number) => {
    fetchAuditLog(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    // Reset to page 1 when changing page size
    fetchAuditLog(1, newPageSize);
  };

  const handleRoleChange = (user: UserProfile) => {
    setSelectedUser(user);
    setShowRoleDialog(true);
  };

  const handleOptimisticUpdate = (userId: string, newRole: UserRole) => {
    // Immediately update the UI with the new role
    const updatedUsers = users.map(user =>
      user.id === userId
        ? { ...user, role: newRole }
        : user
    );
    setUsers(updatedUsers);
    setFilteredUsers(updatedUsers.filter(user =>
      searchQuery
        ? user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    ));
  };

  const handleRollback = (userId: string, previousRole: UserRole, error: Error) => {
    // Revert to the previous role on error
    const revertedUsers = users.map(user =>
      user.id === userId
        ? { ...user, role: previousRole }
        : user
    );
    setUsers(revertedUsers);
    setFilteredUsers(revertedUsers.filter(user =>
      searchQuery
        ? user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    ));

    console.error('Role change failed, rolled back:', error);
  };

  const handleRoleChangeSuccess = async () => {
    // UI already updated optimistically, just cleanup and refresh data
    setShowRoleDialog(false);
    setSelectedUser(null);

    // Refresh RBAC context to ensure permissions are up-to-date across the app
    await refreshRBAC();

    // Refresh audit log in background to show the new entry
    fetchAuditLog();
  };

  const getRoleStats = (): RoleStatistics => {
    const stats: RoleStatistics = {
      total: users.length,
      super_admin: 0,
      enterprise_admin: 0,
      user: 0,
      viewer: 0,
    };

    users.forEach((user) => {
      if (user.role in stats) {
        stats[user.role]++;
      }
    });

    return stats;
  };

  const stats = getRoleStats();

  return (
    <ErrorBoundary>
      <AdminGate>
        <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Role Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions within your organization
          </p>
        </div>

        {/* Statistics */}
        <RoleStats stats={stats} showSuperAdmin={isSuperAdmin} />

        {/* Search and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showAuditLog ? 'default' : 'outline'}
            onClick={() => setShowAuditLog(!showAuditLog)}
          >
            <History className="mr-2 h-4 w-4" />
            {showAuditLog ? 'Hide' : 'Show'} Audit Log
          </Button>
        </div>

        {/* Users Table */}
        <UserTable
          users={filteredUsers}
          loading={loading}
          searchQuery={searchQuery}
          onRoleChange={handleRoleChange}
        />

        {/* Audit Log */}
        {showAuditLog && (
          <AuditLogList
            entries={auditLog}
            pagination={pagination}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            loading={auditLogLoading}
          />
        )}

        {/* Role Change Dialog */}
        {selectedUser && (
          <RoleChangeDialog
            open={showRoleDialog}
            onOpenChange={setShowRoleDialog}
            user={selectedUser}
            onSuccess={handleRoleChangeSuccess}
            onOptimisticUpdate={handleOptimisticUpdate}
            onRollback={handleRollback}
          />
        )}
        </div>
      </AdminGate>
    </ErrorBoundary>
  );
}
