/**
 * RBAC Middleware for API Route Protection
 * Provides middleware functions to protect API routes based on roles and permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PermissionService } from './permission-service';
import { UserRole } from './types';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export type NextRouteHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

export type ProtectedRouteHandler = (
  request: NextRequest,
  context?: any,
  user?: any
) => Promise<NextResponse> | NextResponse;

// =====================================================
// AUTHENTICATION CHECK
// =====================================================

/**
 * Require authenticated user
 */
export function requireAuth(handler: ProtectedRouteHandler): NextRouteHandler {
  return async (request: NextRequest, context?: any) => {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Attach user to request for downstream use
    return handler(request, context, user);
  };
}

// =====================================================
// ROLE-BASED PROTECTION
// =====================================================

/**
 * Require specific role(s) to access endpoint
 *
 * @example
 * export const GET = requireRole('super_admin', 'enterprise_admin')(handler);
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (handler: ProtectedRouteHandler): NextRouteHandler => {
    return async (request: NextRequest, context?: any) => {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          { status: 401 }
        );
      }

      // Get user's role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'User profile not found',
          },
          { status: 403 }
        );
      }

      // Check if user has required role
      const userRole = profile.role as UserRole;
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'Insufficient permissions to access this resource',
            requiredRoles: allowedRoles,
            userRole,
          },
          { status: 403 }
        );
      }

      return handler(request, context, user);
    };
  };
}

/**
 * Require Super Admin role
 */
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);

/**
 * Require Enterprise Admin or Super Admin role
 */
export const requireEnterpriseAdmin = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.ENTERPRISE_ADMIN
);

/**
 * Require any authenticated user (all roles)
 */
export const requireAnyUser = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.ENTERPRISE_ADMIN,
  UserRole.USER,
  UserRole.VIEWER
);

// =====================================================
// PERMISSION-BASED PROTECTION
// =====================================================

/**
 * Require specific permission(s) to access endpoint
 *
 * @example
 * export const POST = requirePermission('streams.create')(handler);
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (handler: ProtectedRouteHandler): NextRouteHandler => {
    return async (request: NextRequest, context?: any) => {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          { status: 401 }
        );
      }

      // Check if user has all required permissions
      const hasPermissions = await PermissionService.userHasAllPermissions(
        user.id,
        requiredPermissions
      );

      if (!hasPermissions) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'You do not have permission to perform this action',
            requiredPermissions,
          },
          { status: 403 }
        );
      }

      return handler(request, context, user);
    };
  };
}

/**
 * Require ANY of the specified permissions
 *
 * @example
 * export const GET = requireAnyPermission('streams.read', 'agents.read')(handler);
 */
export function requireAnyPermission(...permissions: string[]) {
  return (handler: ProtectedRouteHandler): NextRouteHandler => {
    return async (request: NextRequest, context?: any) => {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          { status: 401 }
        );
      }

      // Check if user has any of the required permissions
      const hasPermission = await PermissionService.userHasAnyPermission(
        user.id,
        permissions
      );

      if (!hasPermission) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'You do not have permission to perform this action',
            requiredPermissions: permissions,
          },
          { status: 403 }
        );
      }

      return handler(request, context, user);
    };
  };
}

// =====================================================
// ORGANIZATION ACCESS PROTECTION
// =====================================================

/**
 * Require user to belong to specific organization
 * Super Admins can access any organization
 *
 * @param orgIdParam - Name of the URL parameter containing org ID (default: 'orgId')
 *
 * @example
 * export const GET = requireOrgAccess()(handler);
 * // URL: /api/organizations/[orgId]/...
 */
export function requireOrgAccess(orgIdParam: string = 'orgId') {
  return (handler: ProtectedRouteHandler): NextRouteHandler => {
    return async (request: NextRequest, context?: any) => {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          { status: 401 }
        );
      }

      // Check if user is Super Admin
      const isSuperAdmin = await PermissionService.isSuperAdmin(user.id);
      if (isSuperAdmin) {
        return handler(request, context, user);
      }

      // Extract org ID from request
      const requestedOrgId = context?.params?.[orgIdParam];

      if (!requestedOrgId) {
        return NextResponse.json(
          {
            error: 'BAD_REQUEST',
            message: 'Organization ID required',
          },
          { status: 400 }
        );
      }

      // Check if user belongs to the organization
      const canAccess = await PermissionService.canAccessOrganization(
        user.id,
        requestedOrgId
      );

      if (!canAccess) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'Access denied to this organization',
          },
          { status: 403 }
        );
      }

      return handler(request, context, user);
    };
  };
}

// =====================================================
// RESOURCE OWNERSHIP PROTECTION
// =====================================================

/**
 * Require user to be the owner of the resource OR have admin privileges
 *
 * @param ownerIdField - Field name in context.params that contains the owner ID
 *
 * @example
 * export const PUT = requireOwnerOrAdmin('userId')(handler);
 * // URL: /api/users/[userId]/profile
 */
export function requireOwnerOrAdmin(ownerIdField: string = 'userId') {
  return (handler: ProtectedRouteHandler): NextRouteHandler => {
    return async (request: NextRequest, context?: any) => {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          { status: 401 }
        );
      }

      const requestedUserId = context?.params?.[ownerIdField];

      // Allow if user is accessing their own resource
      if (user.id === requestedUserId) {
        return handler(request, context, user);
      }

      // Check if user is admin
      const isAdmin = await PermissionService.isEnterpriseAdmin(user.id);
      if (isAdmin) {
        return handler(request, context, user);
      }

      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Access denied to this resource',
        },
        { status: 403 }
      );
    };
  };
}

// =====================================================
// COMPOSITE MIDDLEWARE
// =====================================================

/**
 * Combine multiple middleware functions
 *
 * @example
 * export const POST = compose(
 *   requireAuth,
 *   requirePermission('streams.create'),
 *   requireOrgAccess()
 * )(handler);
 */
export function compose(...middlewares: Array<(handler: ProtectedRouteHandler) => NextRouteHandler>) {
  return (handler: ProtectedRouteHandler): NextRouteHandler => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc as any) as any,
      handler
    ) as NextRouteHandler;
  };
}

// =====================================================
// RATE LIMITING (OPTIONAL)
// =====================================================

/**
 * Simple rate limiting by role
 * Different roles get different rate limits
 */
export function rateLimit(options?: {
  windowMs?: number;
  maxRequests?: Record<UserRole, number>;
}) {
  const windowMs = options?.windowMs || 60000; // 1 minute
  const maxRequests = options?.maxRequests || {
    [UserRole.SUPER_ADMIN]: 1000,
    [UserRole.ENTERPRISE_ADMIN]: 500,
    [UserRole.USER]: 100,
    [UserRole.VIEWER]: 50,
  };

  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  return (handler: ProtectedRouteHandler): NextRouteHandler => {
    return async (request: NextRequest, context?: any) => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return handler(request, context, user);
      }

      const key = `${user.id}`;
      const now = Date.now();
      const record = requestCounts.get(key);

      if (record && now < record.resetAt) {
        record.count++;

        // Get user role
        const role = await PermissionService.getUserRole(user.id);
        const limit = role ? maxRequests[role] : maxRequests[UserRole.VIEWER];

        if (record.count > limit) {
          return NextResponse.json(
            {
              error: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests, please try again later',
            },
            { status: 429 }
          );
        }
      } else {
        requestCounts.set(key, { count: 1, resetAt: now + windowMs });
      }

      return handler(request, context, user);
    };
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get authenticated user from request
 * Utility function for use in route handlers
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get user's role
 * Utility function for use in route handlers
 */
export async function getUserRole(userId: string): Promise<UserRole | null> {
  return PermissionService.getUserRole(userId);
}

/**
 * Get user's permissions
 * Utility function for use in route handlers
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  return PermissionService.getUserPermissions(userId);
}
