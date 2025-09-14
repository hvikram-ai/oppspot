-- ============================================
-- COMPLETE DATABASE FIX FOR OPPSPOT
-- Run this ENTIRE file in Supabase SQL Editor
-- This will fix all missing columns and tables
-- ============================================

-- First, let's check what exists and add missing columns
DO $$ 
BEGIN
    -- Check if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Add org_id if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'org_id') THEN
            ALTER TABLE profiles ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
        END IF;
        
        -- Add email if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'email') THEN
            ALTER TABLE profiles ADD COLUMN email TEXT;
        END IF;
        
        -- Add full_name if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
            ALTER TABLE profiles ADD COLUMN full_name TEXT;
        END IF;
        
        -- Add role if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'role') THEN
            ALTER TABLE profiles ADD COLUMN role TEXT CHECK (role IN ('sales', 'marketing', 'business-dev', 'research', 'founder', 'other', NULL));
        END IF;
        
        -- Add preferences if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'preferences') THEN
            ALTER TABLE profiles ADD COLUMN preferences JSONB DEFAULT '{"email_notifications": true, "weekly_digest": true}';
        END IF;
        
        -- Add streak_count if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'streak_count') THEN
            ALTER TABLE profiles ADD COLUMN streak_count INTEGER DEFAULT 0;
        END IF;
        
        -- Add last_active if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'last_active') THEN
            ALTER TABLE profiles ADD COLUMN last_active TIMESTAMPTZ;
        END IF;
        
        -- Add email_verified_at if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'email_verified_at') THEN
            ALTER TABLE profiles ADD COLUMN email_verified_at TIMESTAMPTZ;
        END IF;
        
        -- Add trial_ends_at if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'trial_ends_at') THEN
            ALTER TABLE profiles ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
        END IF;
        
        -- Add onboarding_completed if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
            ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;

-- Now ensure organizations table exists with all columns
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription_tier TEXT DEFAULT 'trial' CHECK (subscription_tier IN ('trial', 'free', 'starter', 'professional', 'enterprise')),
    onboarding_step INTEGER DEFAULT 0,
    industry TEXT,
    company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+', NULL)),
    website TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- If profiles doesn't exist, create it with all columns
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('sales', 'marketing', 'business-dev', 'research', 'founder', 'other', NULL)),
    preferences JSONB DEFAULT '{"email_notifications": true, "weekly_digest": true}',
    streak_count INTEGER DEFAULT 0,
    last_active TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL,
    used BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON organizations;
DROP POLICY IF EXISTS "Enable read for org members" ON organizations;
DROP POLICY IF EXISTS "Enable update for org members" ON organizations;
DROP POLICY IF EXISTS "Enable insert for users during signup" ON profiles;
DROP POLICY IF EXISTS "Enable read for users to see their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON events;
DROP POLICY IF EXISTS "Enable read for users to see their own events" ON events;
DROP POLICY IF EXISTS "Service role can do everything" ON organizations;
DROP POLICY IF EXISTS "Service role can do everything" ON profiles;

-- Create new RLS policies
-- Organizations policies
CREATE POLICY "Enable insert for authenticated users only" ON organizations
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable read for org members" ON organizations
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT org_id FROM profiles WHERE profiles.id = auth.uid()
        )
    );

CREATE POLICY "Enable update for org members" ON organizations
    FOR UPDATE TO authenticated
    USING (
        id IN (
            SELECT org_id FROM profiles WHERE profiles.id = auth.uid()
        )
    );

-- Service role bypass for organizations
CREATE POLICY "Service role can do everything" ON organizations
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Profiles policies
CREATE POLICY "Enable insert for users during signup" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable read for users to see their own profile" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Enable update for users to update their own profile" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- Service role bypass for profiles
CREATE POLICY "Service role can do everything" ON profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Events policies
CREATE POLICY "Enable insert for authenticated users" ON events
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable read for users to see their own events" ON events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Create or replace the organization creation function
CREATE OR REPLACE FUNCTION create_organization_for_user(
    user_id UUID,
    company_name TEXT,
    company_industry TEXT DEFAULT NULL,
    company_size TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_org_id UUID;
    org_slug TEXT;
BEGIN
    -- Generate unique slug
    org_slug := lower(regexp_replace(company_name, '[^a-z0-9]+', '-', 'g'));
    org_slug := org_slug || '-' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Create organization
    INSERT INTO organizations (name, slug, industry, company_size)
    VALUES (company_name, org_slug, company_industry, company_size)
    RETURNING id INTO new_org_id;
    
    -- Update user's profile with org_id
    UPDATE profiles 
    SET org_id = new_org_id,
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN new_org_id;
END;
$$;

-- Create trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, created_at, updated_at)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        updated_at = NOW();
    
    RETURN new;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT ON events TO authenticated;

-- ============================================
-- VERIFICATION SECTION
-- ============================================

-- Check if everything is set up correctly
DO $$ 
DECLARE
    missing_cols TEXT := '';
BEGIN
    -- Check profiles columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'org_id') THEN
        missing_cols := missing_cols || 'profiles.org_id, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        missing_cols := missing_cols || 'profiles.email, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        missing_cols := missing_cols || 'profiles.full_name, ';
    END IF;
    
    IF missing_cols = '' THEN
        RAISE NOTICE '✅ All required columns exist!';
    ELSE
        RAISE WARNING '❌ Missing columns: %', missing_cols;
    END IF;
END $$;

-- Show table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name IN ('organizations', 'profiles', 'events')
    AND table_schema = 'public'
ORDER BY 
    table_name, ordinal_position;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- If you see the table structure above with all columns including org_id,
-- then your database is ready for signups!
-- ============================================