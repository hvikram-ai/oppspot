-- Migration: Dashboard Preferences Table
-- Purpose: Store user-specific dashboard customization and settings
-- Created: 2025-10-01

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create dashboard_preferences table
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Layout preferences
  card_visibility JSONB DEFAULT '{
    "ai_digest": true,
    "priority_queue": true,
    "impact_metrics": true,
    "stats_grid": true,
    "recent_activity": true,
    "feature_spotlight": true
  }'::jsonb,

  card_order TEXT[] DEFAULT ARRAY[
    'ai_digest',
    'impact_metrics',
    'priority_queue',
    'stats_grid',
    'recent_activity',
    'feature_spotlight'
  ],

  -- Navigation preferences
  default_landing_page TEXT DEFAULT '/dashboard',
  sidebar_collapsed BOOLEAN DEFAULT FALSE,

  -- Display preferences
  metric_format TEXT DEFAULT 'relative', -- 'absolute' or 'relative'
  time_period TEXT DEFAULT 'week', -- 'day', 'week', 'month'
  theme TEXT DEFAULT 'light', -- 'light', 'dark', 'system'

  -- Feature preferences
  digest_frequency TEXT DEFAULT 'daily', -- 'daily', 'realtime', 'off'
  show_empty_state_tutorials BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_dashboard_prefs_user ON dashboard_preferences(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_dashboard_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dashboard_preferences_updated_at
  BEFORE UPDATE ON dashboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_preferences_updated_at();

-- Enable Row Level Security
ALTER TABLE dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences"
  ON dashboard_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON dashboard_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON dashboard_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON dashboard_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Add constraints
ALTER TABLE dashboard_preferences
  ADD CONSTRAINT check_metric_format
  CHECK (metric_format IN ('absolute', 'relative'));

ALTER TABLE dashboard_preferences
  ADD CONSTRAINT check_time_period
  CHECK (time_period IN ('day', 'week', 'month'));

ALTER TABLE dashboard_preferences
  ADD CONSTRAINT check_theme
  CHECK (theme IN ('light', 'dark', 'system'));

ALTER TABLE dashboard_preferences
  ADD CONSTRAINT check_digest_frequency
  CHECK (digest_frequency IN ('daily', 'realtime', 'off'));

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_dashboard_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO dashboard_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create preferences when profile is created
CREATE TRIGGER trigger_create_default_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_dashboard_preferences();

-- Comment on table
COMMENT ON TABLE dashboard_preferences IS 'Stores user-specific dashboard customization settings including layout, theme, and display preferences';
