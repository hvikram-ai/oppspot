# oppSpot Permissions Matrix

Complete reference of all permissions assigned to each role.

## Quick Reference

| Symbol | Meaning |
|--------|---------|
| ✅ | Permission granted |
| ❌ | Permission denied |

---

## Permissions by Category

### Organizations

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `organizations.create` | ✅ | ❌ | ❌ | ❌ | Create new organizations |
| `organizations.read` | ✅ | ✅ | ❌ | ❌ | View organization details |
| `organizations.update` | ✅ | ✅ | ❌ | ❌ | Update organization settings |
| `organizations.delete` | ✅ | ❌ | ❌ | ❌ | Delete organizations |
| `organizations.suspend` | ✅ | ❌ | ❌ | ❌ | Suspend organizations |

### Users & Team Management

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `users.invite` | ✅ | ✅ | ❌ | ❌ | Invite new users to organization |
| `users.manage` | ✅ | ✅ | ❌ | ❌ | Manage user accounts |
| `users.assign_roles` | ✅ | ✅* | ❌ | ❌ | Assign roles to users |
| `users.remove` | ✅ | ✅ | ❌ | ❌ | Remove users from organization |

*Enterprise Admin can only assign User and Viewer roles, not Enterprise Admin or Super Admin

### Streams & Workflows

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `streams.create` | ✅ | ✅ | ✅ | ❌ | Create new streams |
| `streams.read` | ✅ | ✅ | ✅ | ✅ | View streams |
| `streams.update` | ✅ | ✅ | ✅** | ❌ | Edit streams |
| `streams.delete` | ✅ | ✅ | ✅** | ❌ | Delete streams |

**Users can only update/delete their own streams unless they're admins

### AI Agents

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `agents.create` | ✅ | ✅ | ✅ | ❌ | Create AI agents |
| `agents.read` | ✅ | ✅ | ✅ | ✅ | View agents |
| `agents.update` | ✅ | ✅ | ✅** | ❌ | Edit agents |
| `agents.delete` | ✅ | ✅ | ✅** | ❌ | Delete agents |
| `agents.execute` | ✅ | ✅ | ✅ | ❌ | Execute agents |

**Users can only update/delete their own agents unless they're admins

### Data Rooms

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `data_rooms.create` | ✅ | ✅ | ✅ | ❌ | Create data rooms |
| `data_rooms.read` | ✅ | ✅ | ✅ | ✅*** | View data rooms |
| `data_rooms.update` | ✅ | ✅ | ✅** | ❌ | Edit data rooms |
| `data_rooms.delete` | ✅ | ✅ | ✅** | ❌ | Delete data rooms |

**Users can only update/delete their own data rooms
***Viewers can only view shared data rooms

### Analytics & Reports

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `analytics.view_org` | ✅ | ✅ | ✅ | ✅ | View organization analytics |
| `analytics.view_platform` | ✅ | ❌ | ❌ | ❌ | View platform-wide analytics |
| `analytics.export` | ✅ | ✅ | ❌ | ❌ | Export analytics data |

### Integrations

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `integrations.manage` | ✅ | ✅ | ❌ | ❌ | Configure integrations (CRM, APIs) |
| `integrations.view` | ✅ | ✅ | ✅ | ✅ | View integration status |

### Billing & Subscriptions

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `billing.manage` | ✅ | ✅ | ❌ | ❌ | Manage billing and subscriptions |
| `billing.view` | ✅ | ✅ | ❌ | ❌ | View billing information |

### API Keys

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `api_keys.create` | ✅ | ✅ | ❌ | ❌ | Create API keys |
| `api_keys.view` | ✅ | ✅ | ✅ | ❌ | View API keys |
| `api_keys.delete` | ✅ | ✅ | ❌ | ❌ | Delete API keys |

### Audit Logs

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `audit.view_platform` | ✅ | ❌ | ❌ | ❌ | View platform-wide audit logs |
| `audit.view_org` | ✅ | ✅ | ❌ | ❌ | View organization audit logs |

### Lists & Saved Items

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `lists.create` | ✅ | ✅ | ✅ | ❌ | Create business lists |
| `lists.read` | ✅ | ✅ | ✅ | ✅ | View business lists |
| `lists.update` | ✅ | ✅ | ✅** | ❌ | Edit business lists |
| `lists.delete` | ✅ | ✅ | ✅** | ❌ | Delete business lists |

**Users can only update/delete their own lists

### Business Search

| Permission | Super Admin | Enterprise Admin | User | Viewer | Description |
|------------|-------------|------------------|------|--------|-------------|
| `searches.perform` | ✅ | ✅ | ✅ | ✅ | Perform business searches |
| `searches.save` | ✅ | ✅ | ✅ | ❌ | Save search queries |
| `searches.export` | ✅ | ✅ | ✅ | ❌ | Export search results |

---

## Permission Count by Role

| Role | Total Permissions | Percentage |
|------|-------------------|------------|
| Super Admin | 40 | 100% |
| Enterprise Admin | 30 | 75% |
| User | 20 | 50% |
| Viewer | 10 | 25% |

---

## Feature Access Summary

### Super Admin Can:
- ✅ Access all features across all organizations
- ✅ Create and manage organizations
- ✅ Suspend organizations
- ✅ View platform-wide analytics
- ✅ Access all audit logs
- ✅ Bypass Row Level Security
- ✅ Everything Enterprise Admin can do

### Enterprise Admin Can:
- ✅ Full access within their organization
- ✅ Invite and manage team members
- ✅ Assign User and Viewer roles
- ✅ Configure organization settings
- ✅ Manage billing and subscriptions
- ✅ Configure integrations
- ✅ View organization audit logs
- ✅ Everything User can do

### User Can:
- ✅ Create and manage streams (own)
- ✅ Create and use AI agents (own)
- ✅ Search and discover businesses
- ✅ Save businesses to lists (own)
- ✅ Create data rooms
- ✅ View organization analytics
- ✅ Export own data
- ✅ Everything Viewer can do

### Viewer Can:
- ✅ View dashboards and reports
- ✅ View streams (read-only)
- ✅ View AI agents (read-only)
- ✅ View shared data rooms
- ✅ Search businesses
- ✅ View organization analytics
- ✅ Use AI chat

### Viewer Cannot:
- ❌ Create or edit anything
- ❌ Save businesses or create lists
- ❌ Execute AI agents
- ❌ Invite team members
- ❌ Access billing
- ❌ Configure integrations
- ❌ Export data
- ❌ Create data rooms

---

## Special Cases

### Organization Isolation
- **Super Admin**: Can access any organization
- **All Other Roles**: Can only access their own organization
- Enforced by:
  - Row Level Security (RLS) policies
  - API middleware (`requireOrgAccess`)
  - Application logic

### Resource Ownership
Users can manage (update/delete) resources they created, even if they're not admins:
- Own streams
- Own agents
- Own data rooms
- Own lists

Admins can manage all resources within their organization.

### Permission Overrides
Super Admins can grant or revoke specific permissions for individual users:
- Use `user_permissions` table
- Overrides role-based permissions
- Can grant additional permissions
- Can revoke default role permissions
- Logged and audited

---

## RLS Policy Summary

### Streams Table
- **SELECT**: Super Admin sees all; others see org streams
- **INSERT**: Must have `streams.create` permission and belong to org
- **UPDATE**: Owner, org admin, or super admin only
- **DELETE**: Owner, org admin, or super admin only

### AI Agents Table
- **SELECT**: Super Admin sees all; others see org agents
- **INSERT**: Must have `agents.create` permission and belong to org
- **UPDATE**: Owner, org admin, or super admin only
- **DELETE**: Owner, org admin, or super admin only

### Data Rooms Table
- **SELECT**: Super Admin sees all; others see org data rooms
- **INSERT**: Must have `data_rooms.create` permission and belong to org
- **UPDATE**: Owner, org admin, or super admin only
- **DELETE**: Owner, org admin, or super admin only

---

## API Route Protection Examples

### By Permission
```typescript
// Requires streams.create permission
POST /api/streams                → requirePermission('streams.create')

// Requires agents.execute permission
POST /api/agents/[id]/execute    → requirePermission('agents.execute')

// Requires billing.view permission
GET /api/billing                 → requirePermission('billing.view')
```

### By Role
```typescript
// Super Admin only
GET /api/admin/platform-stats    → requireSuperAdmin

// Enterprise Admin or Super Admin
GET /api/admin/users             → requireEnterpriseAdmin

// Any authenticated user
GET /api/profile                 → requireAnyUser
```

### By Organization
```typescript
// Must belong to organization
GET /api/organizations/[orgId]/settings → requireOrgAccess()

// Must be org admin or super admin
PUT /api/organizations/[orgId]/settings → compose(
  requireEnterpriseAdmin,
  requireOrgAccess()
)
```

---

## Permission Naming Convention

Format: `resource.action`

### Resources
- Singular noun (e.g., `stream`, `agent`, `organization`)
- Plural for collections (e.g., `users`, `lists`)
- Hierarchical with dots (e.g., `analytics.platform`)

### Actions
- CRUD: `create`, `read`, `update`, `delete`
- Special: `manage`, `execute`, `suspend`, `export`, `assign_roles`
- View variants: `view`, `view_org`, `view_platform`

### Examples
- ✅ `streams.create`
- ✅ `users.manage`
- ✅ `analytics.view_platform`
- ❌ `stream_create` (use dot notation)
- ❌ `readStream` (use resource.action format)

---

## Adding New Permissions

1. **Define in Database**
   ```sql
   INSERT INTO permissions (name, resource, action, description)
   VALUES ('new_resource.new_action', 'new_resource', 'new_action', 'Description');
   ```

2. **Map to Roles**
   ```sql
   INSERT INTO role_permissions (role, permission_id)
   SELECT 'super_admin', id FROM permissions WHERE name = 'new_resource.new_action';
   ```

3. **Add to TypeScript Constants**
   ```typescript
   // lib/rbac/types.ts
   export const PERMISSIONS = {
     // ...
     NEW_RESOURCE_NEW_ACTION: 'new_resource.new_action',
   } as const;
   ```

4. **Update Documentation**
   - Add to this matrix
   - Update RBAC_GUIDE.md
   - Update relevant component docs

5. **Create RLS Policies** (if needed)
   ```sql
   CREATE POLICY "new_resource_select_policy" ON new_resource
     FOR SELECT USING (
       is_super_admin(auth.uid()) OR
       org_id = get_user_org_id(auth.uid())
     );
   ```

6. **Protect API Routes**
   ```typescript
   export const GET = requirePermission('new_resource.new_action')(handler);
   ```

---

## Testing Permissions

```typescript
// tests/rbac/permissions.spec.ts
describe('Permission Matrix', () => {
  test('Super Admin has all permissions', async () => {
    const superAdmin = await createSuperAdmin();
    const allPermissions = await getAllPermissions();

    for (const permission of allPermissions) {
      const hasPermission = await PermissionService.userHasPermission(
        superAdmin.id,
        permission.name
      );
      expect(hasPermission).toBe(true);
    }
  });

  test('Viewer cannot create streams', async () => {
    const viewer = await createViewer();
    const hasPermission = await PermissionService.userHasPermission(
      viewer.id,
      'streams.create'
    );
    expect(hasPermission).toBe(false);
  });

  // ... more tests
});
```

---

## Change Log

| Date | Change | By |
|------|--------|------|
| 2025-10-15 | Initial RBAC system implementation | System |
| | Created 40 base permissions | System |
| | Defined 4 roles with hierarchical structure | System |

---

For implementation details, see [RBAC_GUIDE.md](./RBAC_GUIDE.md)
