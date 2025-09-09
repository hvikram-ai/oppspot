-- Fix Profiles Table Email Column
-- This migration ensures the email column exists in the profiles table

-- First, check if profiles table exists, if not create it
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    full_name TEXT,
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

-- Add email column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update profile entry for new user
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
        email = COALESCE(EXCLUDED.email, profiles.email),
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        email_verified_at = COALESCE(EXCLUDED.email_verified_at, profiles.email_verified_at),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Backfill email column from auth.users for existing profiles
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Ensure RLS policies exist
DO $$ 
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" ON profiles
            FOR SELECT USING (id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" ON profiles
            FOR UPDATE USING (id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can view profiles in same org'
    ) THEN
        CREATE POLICY "Users can view profiles in same org" ON profiles
            FOR SELECT USING (
                org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
            );
    END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT ALL ON profiles TO service_role;