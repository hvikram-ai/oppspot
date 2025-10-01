-- ============================================
-- Fix Profiles RLS Infinite Recursion Issue
-- Migration: 20250131000001_fix_profiles_rls_recursion.sql
-- Description: Remove recursive RLS policy causing 500 errors
-- ============================================

-- Drop all existing potentially problematic policies
DROP POLICY IF EXISTS "Users can view profiles in same org" ON profiles;
DROP POLICY IF EXISTS "Users can view organization members" ON profiles;
DROP POLICY IF EXISTS "Enable read for users to see their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for users during signup" ON profiles;
DROP POLICY IF EXISTS "Service role bypass" ON profiles;
DROP POLICY IF EXISTS "Service role can do everything" ON profiles;
DROP POLICY IF EXISTS "Service role full access" ON profiles;

-- Create simple, non-recursive policies

-- 1. Users can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    USING (id = auth.uid());

-- 2. Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 3. Users can insert their own profile during signup
CREATE POLICY "profiles_insert_own" ON profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- 4. Service role has full access (for admin operations)
CREATE POLICY "profiles_service_role_all" ON profiles
    FOR ALL
    USING (
        auth.jwt()->>'role' = 'service_role'
    );

-- Grant necessary permissions
GRANT SELECT, UPDATE, INSERT ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT ALL ON profiles TO service_role;

-- Add helpful comment
COMMENT ON POLICY "profiles_select_own" ON profiles IS
    'Non-recursive policy: users can only view their own profile directly';

COMMENT ON TABLE profiles IS
    'User profiles table with non-recursive RLS policies to prevent infinite recursion errors';
