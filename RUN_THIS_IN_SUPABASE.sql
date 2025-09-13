-- ============================================
-- COMPLETE SIGNUP SETUP FOR OPPSPOT
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- 1. ORGANIZATIONS TABLE
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

-- 2. PROFILES TABLE
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

-- 3. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EMAIL VERIFICATION TOKENS
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL,
    used BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);

-- 6. Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON organizations;
DROP POLICY IF EXISTS "Enable read for org members" ON organizations;
DROP POLICY IF EXISTS "Enable update for org members" ON organizations;
DROP POLICY IF EXISTS "Enable insert for users during signup" ON profiles;
DROP POLICY IF EXISTS "Enable read for users to see their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for users to update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON events;
DROP POLICY IF EXISTS "Enable read for users to see their own events" ON events;

-- 8. RLS Policies for organizations
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

-- 9. RLS Policies for profiles
CREATE POLICY "Enable insert for users during signup" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable read for users to see their own profile" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Enable update for users to update their own profile" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- 10. RLS Policies for events
CREATE POLICY "Enable insert for authenticated users" ON events
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Enable read for users to see their own events" ON events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- 11. Create helper function for organization creation
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

-- 12. Create trigger to auto-create profile on user signup
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
    );
    RETURN new;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- VERIFICATION QUERIES - Run these to check
-- ============================================
-- Check if tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check organizations table:
-- SELECT * FROM organizations LIMIT 1;

-- Check profiles table:
-- SELECT * FROM profiles LIMIT 1;

-- Check RLS policies:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- ============================================
-- SUCCESS! Your database is now ready for signups
-- ============================================