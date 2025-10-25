/**
 * RBAC Role Management API
 * Example of role-based access control with ownership checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireEnterpriseAdmin } from '@/lib/rbac/middleware';
import { PermissionService } from '@/lib/rbac/permission-service';
import { canAssignRole, UserRole } from '@/lib/rbac/types';

/**
 * GET /api/rbac/roles/[userId]
 * Get a user's role
 * Requires Enterprise Admin role
 */
export const GET = requireEnterpriseAdmin(
  async (
    request: NextRequest,
    context: { params: { userId: string } },
    user: any
  ) => {
    try {
      const { userId } = context.params;

      // Check if user can access this organization
      const targetUserOrgId = await PermissionService.getUserOrgId(userId);
      const requesterOrgId = await PermissionService.getUserOrgId(user.id);
      const isSuperAdmin = await PermissionService.isSuperAdmin(user.id);

      if (!isSuperAdmin && targetUserOrgId !== requesterOrgId) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'Cannot access users from other organizations',
          },
          { status: 403 }
        );
      }

      // Get the user's role
      const role = await PermissionService.getUserRole(userId);

      if (!role) {
        return NextResponse.json(
          {
            error: 'NOT_FOUND',
            message: 'User not found',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          userId,
          role,
        },
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          error: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch role',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * PUT /api/rbac/roles/[userId]
 * Change a user's role
 * Requires Enterprise Admin role
 */
export const PUT = requireEnterpriseAdmin(
  async (
    request: NextRequest,
    context: { params: { userId: string } },
    user: any
  ) => {
    try {
      const { userId } = context.params;
      const { role: newRole, reason } = await request.json();

      // Validate new role
      if (!Object.values(UserRole).includes(newRole)) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Invalid role specified',
            validRoles: Object.values(UserRole),
          },
          { status: 400 }
        );
      }

      // Get requester's role
      const requesterRole = await PermissionService.getUserRole(user.id);

      if (!requesterRole) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'Unable to determine your role',
          },
          { status: 403 }
        );
      }

      // Check if requester can assign this role
      if (!canAssignRole(requesterRole, newRole)) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: `You cannot assign the role ${newRole}`,
            hint: 'Enterprise Admins can only assign User and Viewer roles',
          },
          { status: 403 }
        );
      }

      // Check organization access
      const targetUserOrgId = await PermissionService.getUserOrgId(userId);
      const requesterOrgId = await PermissionService.getUserOrgId(user.id);
      const isSuperAdmin = await PermissionService.isSuperAdmin(user.id);

      if (!isSuperAdmin && targetUserOrgId !== requesterOrgId) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'Cannot modify users from other organizations',
          },
          { status: 403 }
        );
      }

      // Change the role
      const ipAddress = request.headers.get('x-forwarded-for') || undefined;
      const userAgent = request.headers.get('user-agent') || undefined;

      const result = await PermissionService.changeUserRole(
        {
          user_id: userId,
          new_role: newRole,
          reason,
        },
        user.id,
        ipAddress,
        userAgent
      );

      if (!result.allowed) {
        return NextResponse.json(
          {
            error: 'ROLE_CHANGE_FAILED',
            message: result.reason || 'Failed to change role',
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `User role changed to ${newRole}`,
        data: {
          userId,
          newRole,
        },
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          error: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to change role',
        },
        { status: 500 }
      );
    }
  }
);
