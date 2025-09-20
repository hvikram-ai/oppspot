-- Fix profiles table RLS policies to prevent infinite recursion
-- This script should be run in the Supabase SQL editor

-- First, drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete for users based on id" ON public.profiles;

-- Create simple, non-recursive RLS policies for profiles
CREATE POLICY "Enable read access for all users"
    ON public.profiles
    FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for authenticated users only"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable delete for users based on id"
    ON public.profiles
    FOR DELETE
    USING (auth.uid() = id);

-- Verify the policies are working
SELECT * FROM public.profiles LIMIT 1;