-- =====================================================
-- RBAC System Migration
-- Version: 1.0.0
-- Created: 2025-10-15
-- Description: Comprehensive Role-Based Access Control system
-- =====================================================

-- =====================================================
-- 1. ROLE ENUMERATION
-- =====================================================

-- Create role type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'super_admin',
    'enterprise_admin',
    'user',
    'viewer'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update profiles table to use the role enum
ALTER TABLE profiles
  ALTER COLUMN role TYPE user_role USING
    CASE
      WHEN role = 'super_admin' THEN 'super_admin'::user_role
      WHEN role = 'enterprise_admin' THEN 'enterprise_admin'::user_role
      WHEN role = 'admin' THEN 'enterprise_admin'::user_role -- Map old admin to enterprise_admin
      WHEN role = 'viewer' THEN 'viewer'::user_role
      ELSE 'user'::user_role
    END,
  ALTER COLUMN role SET DEFAULT 'user'::user_role;

-- =====================================================
-- 2. PERMISSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,  -- e.g., 'streams', 'agents', 'organizations'
  action VARCHAR(50) NOT NULL,      -- e.g., 'create', 'read', 'update', 'delete'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. ROLE PERMISSIONS MAPPING
-- =====================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- =====================================================
-- 4. USER-SPECIFIC PERMISSION OVERRIDES
-- =====================================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  UNIQUE(user_id, permission_id)
);

-- =====================================================
-- 5. ROLE AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  previous_role user_role,
  new_role user_role NOT NULL,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_user ON role_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_changed_by ON role_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_role_audit_created ON role_audit_log(created_at DESC);

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is enterprise admin or higher
CREATE OR REPLACE FUNCTION is_enterprise_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role IN ('super_admin', 'enterprise_admin')
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(user_id UUID, permission_name VARCHAR)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    -- Check role-based permissions
    SELECT 1
    FROM profiles p
    JOIN role_permissions rp ON rp.role = p.role
    JOIN permissions perm ON perm.id = rp.permission_id
    WHERE p.id = user_id AND perm.name = permission_name

    UNION

    -- Check user-specific permissions (granted)
    SELECT 1
    FROM user_permissions up
    JOIN permissions perm ON perm.id = up.permission_id
    WHERE up.user_id = user_id
      AND perm.name = permission_name
      AND up.granted = true
  ) AND NOT EXISTS (
    -- Exclude if explicitly revoked via user_permissions
    SELECT 1
    FROM user_permissions up
    JOIN permissions perm ON perm.id = up.permission_id
    WHERE up.user_id = user_id
      AND perm.name = permission_name
      AND up.granted = false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Get user's organization ID
CREATE OR REPLACE FUNCTION get_user_org_id(user_id UUID)
RETURNS UUID AS $$
  SELECT org_id FROM profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =====================================================
-- 8. TRIGGER FOR ROLE AUDIT LOG
-- =====================================================

CREATE OR REPLACE FUNCTION audit_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO role_audit_log (
      user_id,
      previous_role,
      new_role,
      changed_by,
      reason
    ) VALUES (
      NEW.id,
      OLD.role,
      NEW.role,
      COALESCE(current_setting('app.current_user_id', TRUE)::UUID, NEW.id),
      current_setting('app.role_change_reason', TRUE)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_role_change ON profiles;
CREATE TRIGGER trigger_audit_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION audit_role_change();

-- =====================================================
-- 9. SEED PERMISSIONS DATA
-- =====================================================

-- Insert base permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  -- Organizations
  ('organizations.create', 'organizations', 'create', 'Create new organizations'),
  ('organizations.read', 'organizations', 'read', 'View organization details'),
  ('organizations.update', 'organizations', 'update', 'Update organization settings'),
  ('organizations.delete', 'organizations', 'delete', 'Delete organizations'),
  ('organizations.suspend', 'organizations', 'suspend', 'Suspend organizations'),

  -- Users
  ('users.invite', 'users', 'invite', 'Invite new users to organization'),
  ('users.manage', 'users', 'manage', 'Manage user accounts'),
  ('users.assign_roles', 'users', 'assign_roles', 'Assign roles to users'),
  ('users.remove', 'users', 'remove', 'Remove users from organization'),

  -- Streams
  ('streams.create', 'streams', 'create', 'Create new streams'),
  ('streams.read', 'streams', 'read', 'View streams'),
  ('streams.update', 'streams', 'update', 'Edit streams'),
  ('streams.delete', 'streams', 'delete', 'Delete streams'),

  -- Agents
  ('agents.create', 'agents', 'create', 'Create AI agents'),
  ('agents.read', 'agents', 'read', 'View agents'),
  ('agents.update', 'agents', 'update', 'Edit agents'),
  ('agents.delete', 'agents', 'delete', 'Delete agents'),
  ('agents.execute', 'agents', 'execute', 'Execute agents'),

  -- Data Rooms
  ('data_rooms.create', 'data_rooms', 'create', 'Create data rooms'),
  ('data_rooms.read', 'data_rooms', 'read', 'View data rooms'),
  ('data_rooms.update', 'data_rooms', 'update', 'Edit data rooms'),
  ('data_rooms.delete', 'data_rooms', 'delete', 'Delete data rooms'),

  -- Analytics
  ('analytics.view_org', 'analytics', 'view', 'View organization analytics'),
  ('analytics.view_platform', 'analytics', 'view_platform', 'View platform-wide analytics'),
  ('analytics.export', 'analytics', 'export', 'Export analytics data'),

  -- Integrations
  ('integrations.manage', 'integrations', 'manage', 'Manage integrations'),
  ('integrations.view', 'integrations', 'view', 'View integrations'),

  -- Billing
  ('billing.manage', 'billing', 'manage', 'Manage billing and subscriptions'),
  ('billing.view', 'billing', 'view', 'View billing information'),

  -- API Keys
  ('api_keys.create', 'api_keys', 'create', 'Create API keys'),
  ('api_keys.view', 'api_keys', 'view', 'View API keys'),
  ('api_keys.delete', 'api_keys', 'delete', 'Delete API keys'),

  -- Audit Logs
  ('audit.view_platform', 'audit', 'view_platform', 'View platform-wide audit logs'),
  ('audit.view_org', 'audit', 'view_org', 'View organization audit logs'),

  -- Lists & Saved Items
  ('lists.create', 'lists', 'create', 'Create business lists'),
  ('lists.read', 'lists', 'read', 'View business lists'),
  ('lists.update', 'lists', 'update', 'Edit business lists'),
  ('lists.delete', 'lists', 'delete', 'Delete business lists'),

  -- Searches
  ('searches.perform', 'searches', 'perform', 'Perform business searches'),
  ('searches.save', 'searches', 'save', 'Save search queries'),
  ('searches.export', 'searches', 'export', 'Export search results')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 10. MAP PERMISSIONS TO ROLES
-- =====================================================

-- Super Admin gets ALL permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin'::user_role, id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Enterprise Admin permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'enterprise_admin'::user_role, id FROM permissions
WHERE name IN (
  'organizations.read', 'organizations.update',
  'users.invite', 'users.manage', 'users.assign_roles', 'users.remove',
  'streams.create', 'streams.read', 'streams.update', 'streams.delete',
  'agents.create', 'agents.read', 'agents.update', 'agents.delete', 'agents.execute',
  'data_rooms.create', 'data_rooms.read', 'data_rooms.update', 'data_rooms.delete',
  'analytics.view_org', 'analytics.export',
  'integrations.manage', 'integrations.view',
  'billing.manage', 'billing.view',
  'api_keys.create', 'api_keys.view', 'api_keys.delete',
  'audit.view_org',
  'lists.create', 'lists.read', 'lists.update', 'lists.delete',
  'searches.perform', 'searches.save', 'searches.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- User permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'user'::user_role, id FROM permissions
WHERE name IN (
  'streams.create', 'streams.read', 'streams.update', 'streams.delete',
  'agents.create', 'agents.read', 'agents.update', 'agents.delete', 'agents.execute',
  'data_rooms.create', 'data_rooms.read', 'data_rooms.update',
  'analytics.view_org',
  'integrations.view',
  'api_keys.view',
  'lists.create', 'lists.read', 'lists.update', 'lists.delete',
  'searches.perform', 'searches.save', 'searches.export'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Viewer permissions (read-only)
INSERT INTO role_permissions (role, permission_id)
SELECT 'viewer'::user_role, id FROM permissions
WHERE name IN (
  'streams.read',
  'agents.read',
  'data_rooms.read',
  'analytics.view_org',
  'integrations.view',
  'lists.read',
  'searches.perform'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- =====================================================
-- 11. UPDATE RLS POLICIES
-- =====================================================

-- Enable RLS on key tables
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_lists ENABLE ROW LEVEL SECURITY;

-- Streams RLS Policies
DROP POLICY IF EXISTS "streams_select_policy" ON streams;
CREATE POLICY "streams_select_policy" ON streams
  FOR SELECT USING (
    is_super_admin(auth.uid()) OR
    org_id = get_user_org_id(auth.uid())
  );

DROP POLICY IF EXISTS "streams_insert_policy" ON streams;
CREATE POLICY "streams_insert_policy" ON streams
  FOR INSERT WITH CHECK (
    user_has_permission(auth.uid(), 'streams.create') AND
    org_id = get_user_org_id(auth.uid())
  );

DROP POLICY IF EXISTS "streams_update_policy" ON streams;
CREATE POLICY "streams_update_policy" ON streams
  FOR UPDATE USING (
    user_has_permission(auth.uid(), 'streams.update') AND
    (
      is_super_admin(auth.uid()) OR
      (is_enterprise_admin(auth.uid()) AND org_id = get_user_org_id(auth.uid())) OR
      created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "streams_delete_policy" ON streams;
CREATE POLICY "streams_delete_policy" ON streams
  FOR DELETE USING (
    user_has_permission(auth.uid(), 'streams.delete') AND
    (
      is_super_admin(auth.uid()) OR
      (is_enterprise_admin(auth.uid()) AND org_id = get_user_org_id(auth.uid())) OR
      created_by = auth.uid()
    )
  );

-- AI Agents RLS Policies
DROP POLICY IF EXISTS "agents_select_policy" ON ai_agents;
CREATE POLICY "agents_select_policy" ON ai_agents
  FOR SELECT USING (
    is_super_admin(auth.uid()) OR
    org_id = get_user_org_id(auth.uid())
  );

DROP POLICY IF EXISTS "agents_insert_policy" ON ai_agents;
CREATE POLICY "agents_insert_policy" ON ai_agents
  FOR INSERT WITH CHECK (
    user_has_permission(auth.uid(), 'agents.create') AND
    org_id = get_user_org_id(auth.uid())
  );

DROP POLICY IF EXISTS "agents_update_policy" ON ai_agents;
CREATE POLICY "agents_update_policy" ON ai_agents
  FOR UPDATE USING (
    user_has_permission(auth.uid(), 'agents.update') AND
    (
      is_super_admin(auth.uid()) OR
      (is_enterprise_admin(auth.uid()) AND org_id = get_user_org_id(auth.uid())) OR
      created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agents_delete_policy" ON ai_agents;
CREATE POLICY "agents_delete_policy" ON ai_agents
  FOR DELETE USING (
    user_has_permission(auth.uid(), 'agents.delete') AND
    (
      is_super_admin(auth.uid()) OR
      (is_enterprise_admin(auth.uid()) AND org_id = get_user_org_id(auth.uid())) OR
      created_by = auth.uid()
    )
  );

-- Data Rooms RLS Policies
DROP POLICY IF EXISTS "data_rooms_select_policy" ON data_rooms;
CREATE POLICY "data_rooms_select_policy" ON data_rooms
  FOR SELECT USING (
    is_super_admin(auth.uid()) OR
    org_id = get_user_org_id(auth.uid())
  );

DROP POLICY IF EXISTS "data_rooms_insert_policy" ON data_rooms;
CREATE POLICY "data_rooms_insert_policy" ON data_rooms
  FOR INSERT WITH CHECK (
    user_has_permission(auth.uid(), 'data_rooms.create') AND
    org_id = get_user_org_id(auth.uid())
  );

DROP POLICY IF EXISTS "data_rooms_update_policy" ON data_rooms;
CREATE POLICY "data_rooms_update_policy" ON data_rooms
  FOR UPDATE USING (
    user_has_permission(auth.uid(), 'data_rooms.update') AND
    (
      is_super_admin(auth.uid()) OR
      (is_enterprise_admin(auth.uid()) AND org_id = get_user_org_id(auth.uid())) OR
      created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "data_rooms_delete_policy" ON data_rooms;
CREATE POLICY "data_rooms_delete_policy" ON data_rooms
  FOR DELETE USING (
    user_has_permission(auth.uid(), 'data_rooms.delete') AND
    (
      is_super_admin(auth.uid()) OR
      (is_enterprise_admin(auth.uid()) AND org_id = get_user_org_id(auth.uid())) OR
      created_by = auth.uid()
    )
  );

-- =====================================================
-- 12. GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT ON permissions TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_permissions TO authenticated;
GRANT SELECT, INSERT ON role_audit_log TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE permissions IS 'Defines all available permissions in the system';
COMMENT ON TABLE role_permissions IS 'Maps permissions to roles';
COMMENT ON TABLE user_permissions IS 'User-specific permission overrides';
COMMENT ON TABLE role_audit_log IS 'Audit trail for role changes';
