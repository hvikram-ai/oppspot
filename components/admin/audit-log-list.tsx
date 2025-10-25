/**
 * Audit Log List Component
 * Displays role change audit log with enhanced pagination controls
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoleBadge } from '@/components/rbac/role-badge';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { AuditLogEntry, PaginationState } from '@/types/admin-roles';

interface AuditLogListProps {
  entries: AuditLogEntry[];
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  loading?: boolean;
}

export function AuditLogList({
  entries,
  pagination,
  onPageChange,
  onPageSizeChange,
  loading = false
}: AuditLogListProps) {
  const [jumpToPage, setJumpToPage] = useState('');

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const canGoPrevious = pagination.page > 1;
  const canGoNext = pagination.page < totalPages;

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpToPage('');
    }
  };

  const handlePageSizeChange = (value: string) => {
    const newPageSize = parseInt(value);
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
  };

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role Change Audit Log</CardTitle>
          <CardDescription>
            Recent role changes within your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No role changes recorded yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Change Audit Log</CardTitle>
        <CardDescription>
          Recent role changes within your organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between p-4 rounded-lg border"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">
                    {entry.user?.full_name || entry.user?.email || 'Unknown User'}
                  </span>
                  <span className="text-muted-foreground">role changed from</span>
                  {entry.previous_role && (
                    <RoleBadge role={entry.previous_role} size="sm" />
                  )}
                  <span className="text-muted-foreground">to</span>
                  <RoleBadge role={entry.new_role} size="sm" />
                </div>
                {entry.reason && (
                  <p className="text-sm text-muted-foreground">
                    Reason: {entry.reason}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Changed by{' '}
                  {entry.changed_by_user?.full_name ||
                    entry.changed_by_user?.email ||
                    'System'}{' '}
                  on {new Date(entry.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced Pagination Controls */}
        {pagination.total > 0 && (
          <div className="space-y-4 mt-6 pt-4 border-t">
            {/* Page Info and Size Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)}-
                  {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} entries
                </p>
                {onPageSizeChange && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">
                      Per page:
                    </label>
                    <Select
                      value={pagination.pageSize.toString()}
                      onValueChange={handlePageSizeChange}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Jump to Page */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">
                    Go to:
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={jumpToPage}
                    onChange={(e) => setJumpToPage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
                    placeholder={`1-${totalPages}`}
                    className="w-20 h-8"
                    disabled={loading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleJumpToPage}
                    disabled={loading || !jumpToPage}
                    className="h-8"
                  >
                    Go
                  </Button>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                {/* First Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(1)}
                  disabled={!canGoPrevious || loading}
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                  <span className="sr-only">First page</span>
                </Button>

                {/* Previous Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={!canGoPrevious || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sr-only sm:hidden">Previous page</span>
                </Button>

                {/* Page Indicator */}
                <div className="flex items-center gap-2 px-4">
                  <span className="text-sm font-medium">
                    Page {pagination.page} of {totalPages}
                  </span>
                </div>

                {/* Next Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={!canGoNext || loading}
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sr-only sm:hidden">Next page</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>

                {/* Last Page */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(totalPages)}
                  disabled={!canGoNext || loading}
                  title="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                  <span className="sr-only">Last page</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
