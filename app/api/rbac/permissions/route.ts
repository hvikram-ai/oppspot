/**
 * RBAC Permissions API
 * Example of how to protect API routes with permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, requireEnterpriseAdmin } from '@/lib/rbac/middleware';
import { PermissionService } from '@/lib/rbac/permission-service';

/**
 * GET /api/rbac/permissions
 * Get all permissions for the current user
 * Requires authentication
 */
export const GET = requirePermission('users.manage')(
  async (request: NextRequest, context: Record<string, unknown> | undefined, user: Record<string, unknown> | undefined) => {
    try {
      if (!user || typeof user.id !== 'string') {
        return NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'User not found' },
          { status: 401 }
        );
      }

      // Get user's permissions
      const permissions = await PermissionService.getUserPermissions(user.id);

      // Get user's role
      const role = await PermissionService.getUserRole(user.id);

      return NextResponse.json({
        success: true,
        data: {
          userId: user.id,
          role,
          permissions,
          permissionCount: permissions.length,
        },
      });
    } catch (error: unknown) {
      return NextResponse.json(
        {
          error: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch permissions',
        },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/rbac/permissions/grant
 * Grant a permission to a user
 * Requires Enterprise Admin role
 */
export const POST = requireEnterpriseAdmin(
  async (request: NextRequest, context: Record<string, unknown> | undefined, user: Record<string, unknown> | undefined) => {
    try {
      if (!user || typeof user.id !== 'string') {
        return NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'User not found' },
          { status: 401 }
        );
      }

      const { userId, permission, reason } = await request.json();

      if (!userId || !permission) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'userId and permission are required',
          },
          { status: 400 }
        );
      }

      // Grant the permission
      const result = await PermissionService.grantPermission(
        userId,
        permission,
        user.id,
        reason
      );

      if (!result.allowed) {
        return NextResponse.json(
          {
            error: 'PERMISSION_GRANT_FAILED',
            message: result.reason || 'Failed to grant permission',
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Permission ${permission} granted to user ${userId}`,
      });
    } catch (error: unknown) {
      return NextResponse.json(
        {
          error: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to grant permission',
        },
        { status: 500 }
      );
    }
  }
);
