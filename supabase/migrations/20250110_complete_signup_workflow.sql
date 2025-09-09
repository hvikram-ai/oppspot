-- Complete Signup Workflow Migration
-- This migration sets up all necessary tables and functions for the signup flow

-- ============================================
-- 1. ORGANIZATIONS TABLE
-- ============================================
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

-- ============================================
-- 2. PROFILES TABLE (extends Supabase auth.users)
-- ============================================
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

-- ============================================
-- 3. EVENTS TABLE (for tracking user activity)
-- ============================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. EMAIL_VERIFICATION_TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. WAITLIST TABLE (for early access signups)
-- ============================================
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    company_name TEXT,
    role TEXT,
    source TEXT,
    converted_to_user BOOLEAN DEFAULT false,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_org_id ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can update their organization" ON organizations
    FOR UPDATE USING (
        id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    );

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can view profiles in same org" ON profiles
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    );

-- Events policies
CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own events" ON events
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view org events" ON events
    FOR SELECT USING (
        org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    );

-- Email verification tokens policies
CREATE POLICY "Users can view own tokens" ON email_verification_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage tokens" ON email_verification_tokens
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile entry for new user
    INSERT INTO profiles (
        id,
        email,
        full_name,
        avatar_url,
        email_verified_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        CASE 
            WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at
            ELSE NULL
        END
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate verification token
CREATE OR REPLACE FUNCTION generate_verification_token(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate a random token
    token := encode(gen_random_bytes(32), 'hex');
    
    -- Insert token into table
    INSERT INTO email_verification_tokens (user_id, token)
    VALUES (user_id, token);
    
    RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify email with token
CREATE OR REPLACE FUNCTION verify_email_with_token(verification_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    token_record RECORD;
BEGIN
    -- Find the token
    SELECT * INTO token_record
    FROM email_verification_tokens
    WHERE token = verification_token
        AND expires_at > NOW()
        AND used_at IS NULL;
    
    -- If token not found or expired
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update profile as verified
    UPDATE profiles
    SET email_verified_at = NOW(),
        updated_at = NOW()
    WHERE id = token_record.user_id;
    
    -- Mark token as used
    UPDATE email_verification_tokens
    SET used_at = NOW()
    WHERE id = token_record.id;
    
    -- Log event
    INSERT INTO events (user_id, event_type, metadata)
    VALUES (
        token_record.user_id,
        'email_verified',
        jsonb_build_object('method', 'token', 'timestamp', NOW())
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email is verified
CREATE OR REPLACE FUNCTION is_email_verified(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND email_verified_at IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trial days remaining
CREATE OR REPLACE FUNCTION get_trial_days_remaining(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    days_remaining INTEGER;
BEGIN
    SELECT GREATEST(0, EXTRACT(DAY FROM (trial_ends_at - NOW()))::INTEGER)
    INTO days_remaining
    FROM profiles
    WHERE id = user_id;
    
    RETURN COALESCE(days_remaining, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is in trial
CREATE OR REPLACE FUNCTION is_in_trial(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    sub_tier TEXT;
    trial_end TIMESTAMPTZ;
BEGIN
    SELECT o.subscription_tier, p.trial_ends_at
    INTO sub_tier, trial_end
    FROM profiles p
    LEFT JOIN organizations o ON p.org_id = o.id
    WHERE p.id = user_id;
    
    RETURN sub_tier = 'trial' AND trial_end > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create organization for user
CREATE OR REPLACE FUNCTION create_organization_for_user(
    user_id UUID,
    company_name TEXT,
    company_industry TEXT DEFAULT NULL,
    company_size TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    org_id UUID;
    org_slug TEXT;
BEGIN
    -- Generate unique slug
    org_slug := lower(regexp_replace(company_name, '[^a-z0-9]+', '-', 'g'));
    org_slug := org_slug || '-' || substr(md5(random()::text), 1, 6);
    
    -- Create organization
    INSERT INTO organizations (name, slug, industry, company_size)
    VALUES (company_name, org_slug, company_industry, company_size)
    RETURNING id INTO org_id;
    
    -- Update user profile with org_id
    UPDATE profiles
    SET org_id = org_id,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Log event
    INSERT INTO events (user_id, org_id, event_type, metadata)
    VALUES (
        user_id,
        org_id,
        'organization_created',
        jsonb_build_object(
            'company_name', company_name,
            'industry', company_industry,
            'company_size', company_size
        )
    );
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample organization (commented out for production)
-- INSERT INTO organizations (name, slug, subscription_tier, industry, company_size)
-- VALUES ('Demo Company', 'demo-company', 'trial', 'Technology', '11-50');

-- ============================================
-- GRANTS (for Supabase)
-- ============================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON organizations TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT ON events TO authenticated;
GRANT SELECT ON email_verification_tokens TO authenticated;

-- Grant permissions to anon users for signup
GRANT INSERT ON organizations TO anon;
GRANT INSERT ON profiles TO anon;
GRANT INSERT ON events TO anon;

-- Grant all permissions to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;