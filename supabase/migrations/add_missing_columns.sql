-- Add missing columns to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS company_size TEXT DEFAULT NULL;

-- Add missing columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ DEFAULT NULL;

-- Add missing events table for signup tracking
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own events" ON events
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create index for events
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);