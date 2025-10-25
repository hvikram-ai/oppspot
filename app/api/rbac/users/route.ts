/**
 * RBAC Users API
 * Fetch users within organization with their roles
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireEnterpriseAdmin } from '@/lib/rbac/middleware';
import { PermissionService } from '@/lib/rbac/permission-service';

/**
 * GET /api/rbac/users
 * Get all users in the organization (or all users for Super Admin)
 * Requires Enterprise Admin role
 */
export const GET = requireEnterpriseAdmin(
  async (
    request: NextRequest,
    context: unknown,
    user: { id: string }
  ) => {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();

      // Check if user is Super Admin
      const isSuperAdmin = await PermissionService.isSuperAdmin(user.id);

      let query = supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          org_id,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      // If not Super Admin, filter by organization
      if (!isSuperAdmin) {
        const userOrgId = await PermissionService.getUserOrgId(user.id);
        if (!userOrgId) {
          return NextResponse.json(
            {
              error: 'FORBIDDEN',
              message: 'Unable to determine your organization',
            },
            { status: 403 }
          );
        }
        query = query.eq('org_id', userOrgId);
      }

      const { data: users, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
          {
            error: 'DATABASE_ERROR',
            message: 'Failed to fetch users',
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          users: users || [],
          isSuperAdmin,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
      return NextResponse.json(
        {
          error: 'INTERNAL_SERVER_ERROR',
          message: errorMessage,
        },
        { status: 500 }
      );
    }
  }
);
