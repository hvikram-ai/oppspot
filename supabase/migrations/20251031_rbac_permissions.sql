-- RBAC Permissions Functions
-- Created: 2025-10-31
-- Purpose: Provide permission checking functions for RBAC system

-- ============================================================================
-- get_user_permissions Function
-- ============================================================================
-- Returns an array of permission strings for a given user
-- Used by the RBAC context to determine what actions a user can perform

CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
  user_role TEXT;
  permissions TEXT[];
BEGIN
  -- Get user's role from profiles table
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;

  -- If no role found, return empty array
  IF user_role IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  -- Define permissions based on role
  CASE user_role
    -- Super Admin: All permissions
    WHEN 'super_admin' THEN
      permissions := ARRAY[
        'manage:all',
        'manage:organizations',
        'manage:users',
        'manage:billing',
        'manage:settings',
        'view:analytics',
        'manage:data_rooms',
        'manage:streams',
        'manage:agents',
        'manage:research',
        'manage:companies',
        'manage:exports',
        'manage:integrations',
        'manage:api_keys'
      ];

    -- Enterprise Admin: Organization-level management
    WHEN 'enterprise_admin' THEN
      permissions := ARRAY[
        'manage:organization',
        'manage:users',
        'manage:billing',
        'manage:settings',
        'view:analytics',
        'manage:data_rooms',
        'manage:streams',
        'manage:agents',
        'manage:research',
        'manage:companies',
        'manage:exports',
        'manage:integrations',
        'manage:api_keys'
      ];

    -- Team Admin: Team-level management
    WHEN 'team_admin' THEN
      permissions := ARRAY[
        'manage:team',
        'view:analytics',
        'manage:data_rooms',
        'manage:streams',
        'manage:agents',
        'manage:research',
        'manage:companies',
        'manage:exports'
      ];

    -- Premium User: Full feature access
    WHEN 'premium' THEN
      permissions := ARRAY[
        'view:analytics',
        'create:data_rooms',
        'create:streams',
        'create:agents',
        'generate:research',
        'view:companies',
        'create:exports',
        'access:premium_features'
      ];

    -- Free User: Basic access
    WHEN 'free' THEN
      permissions := ARRAY[
        'view:companies',
        'create:basic_exports',
        'access:basic_features'
      ];

    -- Default: No permissions
    ELSE
      permissions := ARRAY[]::TEXT[];
  END CASE;

  RETURN permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- has_permission Function
-- ============================================================================
-- Check if a user has a specific permission

CREATE OR REPLACE FUNCTION has_permission(
  user_id UUID,
  required_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions TEXT[];
BEGIN
  -- Get user's permissions
  user_permissions := get_user_permissions(user_id);

  -- Check if user has 'manage:all' permission (super admin)
  IF 'manage:all' = ANY(user_permissions) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has the specific permission
  RETURN required_permission = ANY(user_permissions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant Execution Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission(UUID, TEXT) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION get_user_permissions IS 'Returns array of permission strings for a user based on their role';
COMMENT ON FUNCTION has_permission IS 'Checks if a user has a specific permission';
