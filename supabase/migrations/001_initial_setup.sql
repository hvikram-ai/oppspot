-- Initial Setup Migration
-- This ensures basic tables exist before other migrations run

-- ============================================
-- 1. CREATE ORGANIZATIONS TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    subscription_tier TEXT DEFAULT 'trial',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE PROFILES TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'member',
    preferences JSONB DEFAULT '{}',
    streak_count INTEGER DEFAULT 0,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. BASIC INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- 4. BASIC RLS POLICIES
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON profiles
            FOR SELECT USING (id = auth.uid());
    END IF;
END $$;

-- ============================================
-- 5. TRIGGER FOR NEW USER
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger only if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 6. GRANTS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE ON profiles TO authenticated;
GRANT SELECT ON organizations TO authenticated;