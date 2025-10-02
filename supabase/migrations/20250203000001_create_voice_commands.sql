-- ============================================
-- Voice Command System - Tables and Policies
-- ============================================

-- 1. Create voice_commands table
CREATE TABLE IF NOT EXISTS voice_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Command Details
  transcript TEXT NOT NULL,              -- Raw voice input
  intent TEXT NOT NULL,                  -- Detected intent (navigate, search, query, action)
  confidence DECIMAL(3,2),               -- 0.00 - 1.00
  parameters JSONB DEFAULT '{}',         -- Extracted parameters

  -- Execution
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_time_ms INTEGER,             -- Performance tracking
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- Context
  page_url TEXT,                         -- Where command was issued
  session_id TEXT,                       -- Voice session ID

  -- Metadata
  language VARCHAR(5) DEFAULT 'en-GB',
  device_type TEXT,                      -- desktop, mobile, tablet

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create voice_preferences table
CREATE TABLE IF NOT EXISTS voice_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Voice Settings
  enabled BOOLEAN DEFAULT true,
  wake_word_enabled BOOLEAN DEFAULT false,
  wake_word TEXT DEFAULT 'hey oppspot',

  -- Speech Settings
  voice_name TEXT,                       -- Preferred TTS voice
  speech_rate DECIMAL(2,1) DEFAULT 1.0,  -- 0.5 - 2.0
  speech_pitch DECIMAL(2,1) DEFAULT 1.0, -- 0.0 - 2.0
  speech_volume DECIMAL(2,1) DEFAULT 1.0,-- 0.0 - 1.0

  -- Recognition Settings
  language VARCHAR(5) DEFAULT 'en-GB',
  continuous_listening BOOLEAN DEFAULT false,

  -- Privacy
  save_history BOOLEAN DEFAULT true,
  analytics_enabled BOOLEAN DEFAULT true,

  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_commands_user_date ON voice_commands(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_commands_org_date ON voice_commands(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_commands_intent ON voice_commands(intent, success);
CREATE INDEX IF NOT EXISTS idx_voice_commands_session ON voice_commands(session_id);

-- 4. Enable Row Level Security
ALTER TABLE voice_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_preferences ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for voice_commands

-- Users can view their own commands
CREATE POLICY "Users view own voice commands" ON voice_commands
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own commands
CREATE POLICY "Users create voice commands" ON voice_commands
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete their own commands
CREATE POLICY "Users delete own voice commands" ON voice_commands
  FOR DELETE USING (user_id = auth.uid());

-- 6. RLS Policies for voice_preferences

-- Users can view their own preferences
CREATE POLICY "Users view own voice preferences" ON voice_preferences
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users create voice preferences" ON voice_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users update own voice preferences" ON voice_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own preferences
CREATE POLICY "Users delete own voice preferences" ON voice_preferences
  FOR DELETE USING (user_id = auth.uid());

-- 7. Create function to automatically create default voice preferences
CREATE OR REPLACE FUNCTION create_default_voice_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO voice_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger to create preferences when user is created
DROP TRIGGER IF EXISTS trigger_create_voice_preferences ON profiles;
CREATE TRIGGER trigger_create_voice_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_voice_preferences();

-- 9. Grant permissions
GRANT SELECT, INSERT, DELETE ON voice_commands TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON voice_preferences TO authenticated;
