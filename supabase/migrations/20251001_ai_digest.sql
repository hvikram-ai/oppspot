-- Migration: AI Digest Table
-- Purpose: Store daily AI-generated digest summaries for each user
-- Created: 2025-10-01

-- Create ai_digest table
CREATE TABLE IF NOT EXISTS ai_digest (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Digest metadata
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  digest_date DATE DEFAULT CURRENT_DATE,
  priority_score INTEGER CHECK (priority_score BETWEEN 1 AND 10),

  -- Digest content (JSONB for flexibility)
  digest_data JSONB NOT NULL,
  /* Structure:
  {
    "overnight_discoveries": [
      {
        "type": "opportunity",
        "title": "12 SaaS companies matched your criteria",
        "description": "...",
        "action_url": "/search?id=...",
        "priority": "high"
      }
    ],
    "urgent_alerts": [
      {
        "type": "follow_up",
        "title": "3 hot leads need follow-up",
        "company_ids": ["uuid1", "uuid2"],
        "days_since_contact": 8
      }
    ],
    "completed_work": [
      {
        "type": "research_report",
        "title": "4 research reports completed",
        "report_ids": ["uuid1", "uuid2", "uuid3", "uuid4"]
      }
    ],
    "recommendations": [
      {
        "type": "suggestion",
        "title": "Try ResearchGPT™ on your saved companies",
        "reason": "You have 23 saved companies without research reports"
      }
    ]
  }
  */

  -- User interaction
  read_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE,

  -- Generation metadata
  generation_duration_ms INTEGER,
  ai_model TEXT DEFAULT 'gpt-4-turbo',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_ai_digest_user_date ON ai_digest(user_id, digest_date DESC);
CREATE INDEX idx_ai_digest_unread ON ai_digest(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_ai_digest_created ON ai_digest(created_at DESC);

-- Unique constraint: one digest per user per day
CREATE UNIQUE INDEX idx_ai_digest_user_date_unique
  ON ai_digest(user_id, digest_date);

-- Enable Row Level Security
ALTER TABLE ai_digest ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own digest"
  ON ai_digest FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digest"
  ON ai_digest FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own digest"
  ON ai_digest FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own digest"
  ON ai_digest FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert digests (for cron job)
CREATE POLICY "Service role can insert digests"
  ON ai_digest FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add constraints
ALTER TABLE ai_digest
  ADD CONSTRAINT check_digest_date_not_future
  CHECK (digest_date <= CURRENT_DATE);

ALTER TABLE ai_digest
  ADD CONSTRAINT check_digest_data_is_object
  CHECK (jsonb_typeof(digest_data) = 'object');

-- Function to auto-expire old digests (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_ai_digests()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_digest
  WHERE generated_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE ai_digest IS 'Stores daily AI-generated digest summaries with overnight discoveries, urgent alerts, completed work, and recommendations';
