# oppSpot RBAC System Guide

## Overview

oppSpot implements a comprehensive Role-Based Access Control (RBAC) system with four distinct roles, granular permissions, and both database-level and application-level enforcement.

## Table of Contents

- [Roles](#roles)
- [Permissions](#permissions)
- [Database Schema](#database-schema)
- [Backend Usage](#backend-usage)
- [Frontend Usage](#frontend-usage)
- [API Route Protection](#api-route-protection)
- [Examples](#examples)
- [Migration Guide](#migration-guide)

---

## Roles

### Super Admin 🔐
**Platform-wide administration**

- Full system access across ALL organizations
- Can manage all organizations and users
- Access to platform analytics and audit logs
- Cannot be assigned through UI (manual SQL only)

### Enterprise Admin 👔
**Organization-level administration**

- Full access within their organization
- Can invite/remove team members
- Can assign User and Viewer roles
- Manages organization settings and billing
- Configures integrations

### User 👤
**Standard platform user**

- Create and manage own streams and workflows
- Search businesses and create lists
- Use AI agents and tools
- View organization analytics
- Cannot manage organization or users

### Viewer 👁️
**Read-only access**

- View dashboards and reports
- View streams and workflows (read-only)
- View shared data rooms
- Use AI chat for queries
- Cannot create or modify anything

---

## Permissions

### Permission Structure

Permissions follow the format: `resource.action`

Examples:
- `streams.create`
- `agents.execute`
- `organizations.update`

### Permission Categories

| Category | Actions | Description |
|----------|---------|-------------|
| organizations | create, read, update, delete, suspend | Organization management |
| users | invite, manage, assign_roles, remove | User management |
| streams | create, read, update, delete | Stream operations |
| agents | create, read, update, delete, execute | AI agent operations |
| data_rooms | create, read, update, delete | Data room operations |
| analytics | view_org, view_platform, export | Analytics access |
| integrations | manage, view | Integration configuration |
| billing | manage, view | Billing management |
| api_keys | create, view, delete | API key management |
| audit | view_platform, view_org | Audit log access |
| lists | create, read, update, delete | Business list operations |
| searches | perform, save, export | Search operations |

---

## Database Schema

### Tables

#### `permissions`
Defines all available permissions in the system.

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL
);
```

#### `role_permissions`
Maps permissions to roles.

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY,
  role user_role NOT NULL,
  permission_id UUID REFERENCES permissions(id)
);
```

#### `user_permissions`
User-specific permission overrides.

```sql
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  permission_id UUID REFERENCES permissions(id),
  granted BOOLEAN NOT NULL
);
```

#### `role_audit_log`
Tracks all role changes.

```sql
CREATE TABLE role_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  previous_role user_role,
  new_role user_role NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  reason TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ
);
```

### Helper Functions

```sql
-- Check if user has permission
user_has_permission(user_id UUID, permission_name VARCHAR) -> BOOLEAN

-- Check if user is super admin
is_super_admin(user_id UUID) -> BOOLEAN

-- Check if user is enterprise admin or higher
is_enterprise_admin(user_id UUID) -> BOOLEAN

-- Get user's organization ID
get_user_org_id(user_id UUID) -> UUID
```

---

## Backend Usage

### Permission Service

```typescript
import { PermissionService } from '@/lib/rbac/permission-service';

// Check if user has permission
const hasPermission = await PermissionService.userHasPermission(
  userId,
  'streams.create'
);

// Get all user permissions
const permissions = await PermissionService.getUserPermissions(userId);

// Change user role
await PermissionService.changeUserRole(
  { user_id: userId, new_role: 'enterprise_admin', reason: 'Promotion' },
  changedByUserId
);

// Grant specific permission
await PermissionService.grantPermission(
  userId,
  'streams.delete',
  grantedByUserId,
  'Special access for cleanup'
);
```

---

## Frontend Usage

### Setup

Add `RBACProvider` to your root layout:

```typescript
// app/layout.tsx
import { RBACProvider } from '@/lib/rbac/rbac-context';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <RBACProvider>
          {children}
        </RBACProvider>
      </body>
    </html>
  );
}
```

### Hooks

```typescript
import {
  useRole,
  useHasRole,
  useHasPermission,
  useIsOrgAdmin,
  useIsSuperAdmin,
} from '@/lib/rbac/hooks';

function MyComponent() {
  const role = useRole();
  const isAdmin = useIsOrgAdmin();
  const canCreateStreams = useHasPermission('streams.create');
  const canManageUsers = useHasPermission('users.manage');

  if (!canCreateStreams) {
    return <div>You don't have permission to create streams</div>;
  }

  return <CreateStreamButton />;
}
```

### Components

#### RoleGate

```typescript
import { RoleGate } from '@/components/rbac';
import { UserRole } from '@/lib/rbac/types';

<RoleGate roles={[UserRole.SUPER_ADMIN, UserRole.ENTERPRISE_ADMIN]}>
  <AdminDashboard />
</RoleGate>
```

#### PermissionGate

```typescript
import { PermissionGate } from '@/components/rbac';

<PermissionGate permission="streams.create">
  <CreateStreamButton />
</PermissionGate>

<PermissionGate allOf={['streams.read', 'agents.read']}>
  <AdvancedFeature />
</PermissionGate>

<PermissionGate anyOf={['billing.view', 'billing.manage']}>
  <BillingSection />
</PermissionGate>
```

#### RoleBadge

```typescript
import { RoleBadge } from '@/components/rbac';

<RoleBadge role={user.role} showIcon />
```

#### AdminGate & SuperAdminGate

```typescript
import { AdminGate, SuperAdminGate } from '@/components/rbac';

<AdminGate>
  <OrganizationSettings />
</AdminGate>

<SuperAdminGate>
  <PlatformAdminPanel />
</SuperAdminGate>
```

---

## API Route Protection

### Basic Protection

```typescript
// app/api/streams/route.ts
import { requirePermission } from '@/lib/rbac/middleware';

export const GET = requirePermission('streams.read')(
  async (request, context, user) => {
    // Handler code
    return NextResponse.json({ streams });
  }
);

export const POST = requirePermission('streams.create')(
  async (request, context, user) => {
    // Handler code
    return NextResponse.json({ stream });
  }
);
```

### Role-Based Protection

```typescript
import { requireRole, requireSuperAdmin } from '@/lib/rbac/middleware';
import { UserRole } from '@/lib/rbac/types';

// Require specific roles
export const GET = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.ENTERPRISE_ADMIN
)(async (request, context, user) => {
  // Handler code
});

// Super Admin only
export const DELETE = requireSuperAdmin(
  async (request, context, user) => {
    // Handler code
  }
);
```

### Organization Access

```typescript
import { requireOrgAccess } from '@/lib/rbac/middleware';

// app/api/organizations/[orgId]/settings/route.ts
export const GET = requireOrgAccess('orgId')(
  async (request, context, user) => {
    const { orgId } = context.params;
    // Super Admins can access any org
    // Others can only access their own org
  }
);
```

### Ownership Check

```typescript
import { requireOwnerOrAdmin } from '@/lib/rbac/middleware';

// app/api/users/[userId]/profile/route.ts
export const PUT = requireOwnerOrAdmin('userId')(
  async (request, context, user) => {
    // User can edit their own profile
    // Admins can edit any profile
  }
);
```

### Composite Middleware

```typescript
import { compose, requirePermission, requireOrgAccess } from '@/lib/rbac/middleware';

export const POST = compose(
  requirePermission('data_rooms.create'),
  requireOrgAccess('orgId')
)(async (request, context, user) => {
  // Handler code
});
```

---

## Examples

### Example 1: Protected Dashboard

```typescript
// app/admin/page.tsx
'use client';

import { AdminGate } from '@/components/rbac';
import { useRole } from '@/lib/rbac/hooks';

export default function AdminPage() {
  const role = useRole();

  return (
    <AdminGate fallback={<div>Access Denied</div>}>
      <div>
        <h1>Admin Dashboard</h1>
        <p>Your role: {role}</p>
      </div>
    </AdminGate>
  );
}
```

### Example 2: Conditional Rendering

```typescript
import { useHasPermission } from '@/lib/rbac/hooks';
import { Button } from '@/components/ui/button';

function StreamActions({ streamId }) {
  const canEdit = useHasPermission('streams.update');
  const canDelete = useHasPermission('streams.delete');

  return (
    <div className="flex gap-2">
      {canEdit && (
        <Button onClick={() => editStream(streamId)}>Edit</Button>
      )}
      {canDelete && (
        <Button variant="destructive" onClick={() => deleteStream(streamId)}>
          Delete
        </Button>
      )}
    </div>
  );
}
```

### Example 3: Role Management

```typescript
// app/api/users/[userId]/role/route.ts
import { requireEnterpriseAdmin } from '@/lib/rbac/middleware';
import { PermissionService } from '@/lib/rbac/permission-service';
import { canAssignRole } from '@/lib/rbac/types';

export const PUT = requireEnterpriseAdmin(
  async (request, context, user) => {
    const { userId } = context.params;
    const { newRole, reason } = await request.json();

    // Get assigner's role
    const assignerRole = await PermissionService.getUserRole(user.id);

    if (!assignerRole || !canAssignRole(assignerRole, newRole)) {
      return NextResponse.json(
        { error: 'Cannot assign this role' },
        { status: 403 }
      );
    }

    // Change role
    const result = await PermissionService.changeUserRole(
      { user_id: userId, new_role: newRole, reason },
      user.id,
      request.headers.get('x-forwarded-for') || undefined
    );

    if (!result.allowed) {
      return NextResponse.json(
        { error: result.reason },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  }
);
```

---

## Migration Guide

### For Existing Users

1. **Run the migration:**
   ```bash
   # Apply the RBAC migration
   npx supabase migration up
   ```

2. **Default role assignment:**
   - All existing users will be assigned the `user` role by default
   - Organization owners should be upgraded to `enterprise_admin`

3. **Update organization owners:**
   ```sql
   -- Manual SQL to promote org owners
   UPDATE profiles
   SET role = 'enterprise_admin'
   WHERE id IN (
     SELECT p.id
     FROM profiles p
     JOIN organizations o ON o.created_by = p.id
   );
   ```

4. **Create first Super Admin:**
   ```sql
   -- Manual SQL (DO NOT expose this in UI)
   UPDATE profiles
   SET role = 'super_admin'
   WHERE email = 'your-admin@email.com';
   ```

### Updating Existing Code

#### Before:
```typescript
// No permission check
export async function GET(request: NextRequest) {
  const users = await getUsers();
  return NextResponse.json({ users });
}
```

#### After:
```typescript
import { requirePermission } from '@/lib/rbac/middleware';

export const GET = requirePermission('users.manage')(
  async (request, context, user) => {
    const users = await getUsers();
    return NextResponse.json({ users });
  }
);
```

---

## Best Practices

### 1. Always Use Permission Checks in API Routes
❌ **Bad:**
```typescript
export async function DELETE(request: NextRequest) {
  // No permission check!
  await deleteStream(streamId);
}
```

✅ **Good:**
```typescript
export const DELETE = requirePermission('streams.delete')(
  async (request, context, user) => {
    await deleteStream(streamId);
  }
);
```

### 2. Use Appropriate Granularity
- Use role checks for broad access control
- Use permission checks for specific actions
- Combine both when needed

### 3. Provide Clear Fallbacks
```typescript
<PermissionGate
  permission="streams.create"
  fallback={
    <Alert>
      You need permission to create streams. Contact your admin.
    </Alert>
  }
>
  <CreateStreamForm />
</PermissionGate>
```

### 4. Audit Important Actions
```typescript
// Log role changes
await PermissionService.changeUserRole(
  { user_id, new_role, reason: 'Promoted for project leadership' },
  changedBy,
  ipAddress
);
```

### 5. Test Permission Logic
```typescript
// In tests
test('viewer cannot create streams', async () => {
  const viewerUser = await createViewerUser();
  const response = await POST('/api/streams', { ...data }, viewerUser);
  expect(response.status).toBe(403);
});
```

---

## Troubleshooting

### Permission Denied But User Should Have Access

1. Check user's role:
   ```sql
   SELECT role FROM profiles WHERE id = '<user_id>';
   ```

2. Check role permissions:
   ```sql
   SELECT p.name
   FROM role_permissions rp
   JOIN permissions p ON p.id = rp.permission_id
   WHERE rp.role = '<role>';
   ```

3. Check user permission overrides:
   ```sql
   SELECT p.name, up.granted
   FROM user_permissions up
   JOIN permissions p ON p.id = up.permission_id
   WHERE up.user_id = '<user_id>';
   ```

### RLS Policy Blocking Access

Check if RLS is properly configured:

```sql
-- View policies
SELECT * FROM pg_policies WHERE tablename = 'streams';

-- Test policy
SET ROLE authenticated;
SET request.jwt.claims.sub = '<user_id>';
SELECT * FROM streams;
```

### Role Changes Not Reflected

- Clear client-side cache
- Refresh the page
- Check if `RBACProvider` is properly set up
- Verify Supabase auth session is valid

---

## Security Considerations

1. **Never expose Super Admin role assignment in UI**
   - Must be done via SQL manually
   - Requires database access

2. **Always validate on server-side**
   - Client-side checks are for UX only
   - API routes MUST enforce permissions

3. **Log all privilege escalations**
   - Role changes are automatically logged
   - Additional audit logging for sensitive actions

4. **Use RLS as defense in depth**
   - Database-level protection
   - Protects against API bypass

5. **Regular permission audits**
   - Review role_audit_log regularly
   - Check for unusual permission grants

---

## Support

For questions or issues with the RBAC system:
- Check this documentation
- Review code examples in `/components/rbac` and `/lib/rbac`
- Consult the permission matrix in [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md)
