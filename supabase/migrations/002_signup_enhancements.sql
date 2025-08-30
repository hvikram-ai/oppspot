-- Add new fields for enhanced signup flow

-- Add events table for tracking user events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trial and verification fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Add industry and company size to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT;

-- Create index for events
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- RLS policies for events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own events" ON events
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to check if user email is verified
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

-- Function to check trial status
CREATE OR REPLACE FUNCTION get_trial_days_remaining(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    days_remaining INTEGER;
BEGIN
    SELECT EXTRACT(DAY FROM (trial_ends_at - NOW()))::INTEGER
    INTO days_remaining
    FROM profiles
    WHERE id = user_id;
    
    RETURN COALESCE(days_remaining, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function to include trial
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (
        id, 
        full_name, 
        avatar_url,
        trial_ends_at,
        onboarding_completed,
        email_verified_at
    )
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        NOW() + INTERVAL '30 days',
        false,
        CASE 
            WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at
            ELSE NULL
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;