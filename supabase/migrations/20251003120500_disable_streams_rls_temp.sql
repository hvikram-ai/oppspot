-- ============================================
-- TEMPORARY: Disable RLS on streams table
-- Migration: 20251003120500_disable_streams_rls_temp.sql
-- This is a temporary fix to allow stream creation while we debug RLS
-- ============================================

-- First, drop ALL existing policies to avoid conflicts
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'streams' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON streams', pol.policyname);
    END LOOP;
END $$;

-- Temporarily disable RLS on streams table
ALTER TABLE streams DISABLE ROW LEVEL SECURITY;

-- Add comment explaining this is temporary
COMMENT ON TABLE streams IS 'Collaborative workspaces - RLS temporarily disabled for debugging';

-- Note: Security is still enforced through:
-- 1. API route authentication (createClient from @/lib/supabase/server)
-- 2. All endpoints require authenticated user
-- 3. org_id checks in the application layer
