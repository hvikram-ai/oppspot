-- IMMEDIATE FIX FOR EMAIL COLUMN
-- Run this directly in Supabase SQL Editor

-- 1. Add email column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 3. Backfill email from auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;

-- 4. Create email_verification_tokens table if missing
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create index on verification tokens
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- 6. Enable RLS on email_verification_tokens
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- 7. Create policy for email_verification_tokens
CREATE POLICY IF NOT EXISTS "Users can view own tokens" ON email_verification_tokens
    FOR SELECT USING (user_id = auth.uid());

-- 8. Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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

-- 9. Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Verify the fix
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'profiles' 
    AND column_name = 'email';