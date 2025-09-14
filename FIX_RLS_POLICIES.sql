-- ============================================
-- FIX RLS POLICIES - Remove Infinite Recursion
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop all existing RLS policies on profiles table
DROP POLICY IF EXISTS "Enable insert for users during signup" ON profiles;
DROP POLICY IF EXISTS "Enable read for users to see their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can do everything" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Step 2: Create simple, non-recursive policies for profiles
-- Allow users to see their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow service role to bypass RLS (for admin operations)
CREATE POLICY "Service role bypass" ON profiles
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Step 3: Drop and recreate organizations policies (if needed)
DROP POLICY IF EXISTS "Enable read for org members" ON organizations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON organizations;
DROP POLICY IF EXISTS "Enable update for org members" ON organizations;
DROP POLICY IF EXISTS "Service role can do everything" ON organizations;

-- Simple organizations policies
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.org_id = organizations.id 
            AND profiles.id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create organizations" ON organizations
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their organization" ON organizations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.org_id = organizations.id 
            AND profiles.id = auth.uid()
        )
    );

-- Service role bypass for organizations
CREATE POLICY "Service role bypass orgs" ON organizations
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Step 4: Verify the policies are working
-- Test query - should return profiles without recursion error
SELECT 
    p.id,
    p.email,
    p.onboarding_completed,
    p.org_id
FROM profiles p
WHERE p.id = auth.uid()
LIMIT 1;

-- Step 5: Grant necessary permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON organizations TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================
-- After running this, test login with demo@oppspot.com
-- The profile query should work without recursion errors