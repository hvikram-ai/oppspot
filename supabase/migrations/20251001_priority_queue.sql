-- Migration: Priority Queue Items Table
-- Purpose: AI-ranked to-do list items for the dashboard
-- Created: 2025-10-01

-- Create ENUMs
CREATE TYPE priority_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE queue_item_type AS ENUM (
  'lead_follow_up',
  'research_review',
  'signal_alert',
  'list_action',
  'recommendation'
);
CREATE TYPE queue_item_status AS ENUM ('pending', 'in_progress', 'completed', 'dismissed');

-- Create priority_queue_items table
CREATE TABLE IF NOT EXISTS priority_queue_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Item classification
  item_type queue_item_type NOT NULL,
  status queue_item_status DEFAULT 'pending',
  priority_level priority_level NOT NULL,

  -- Priority scoring
  priority_score NUMERIC(10,2) NOT NULL DEFAULT 50.0,
  urgency_score INTEGER CHECK (urgency_score BETWEEN 1 AND 100),
  value_score INTEGER CHECK (value_score BETWEEN 1 AND 100),
  fit_score INTEGER CHECK (fit_score BETWEEN 1 AND 100),

  -- Item content
  title TEXT NOT NULL,
  description TEXT,
  action_label TEXT DEFAULT 'View',
  action_url TEXT NOT NULL,

  -- Related entities (nullable foreign keys)
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  research_report_id UUID REFERENCES research_reports(id) ON DELETE CASCADE,
  list_id UUID REFERENCES business_lists(id) ON DELETE CASCADE,

  -- Metadata
  metadata JSONB,

  -- Lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_pq_user_status_priority ON priority_queue_items(
  user_id, status, priority_score DESC
) WHERE status = 'pending';

CREATE INDEX idx_pq_user_created ON priority_queue_items(user_id, created_at DESC);
CREATE INDEX idx_pq_company ON priority_queue_items(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_pq_report ON priority_queue_items(research_report_id) WHERE research_report_id IS NOT NULL;
CREATE INDEX idx_pq_list ON priority_queue_items(list_id) WHERE list_id IS NOT NULL;
CREATE INDEX idx_pq_due_date ON priority_queue_items(due_date) WHERE due_date IS NOT NULL AND status = 'pending';

-- Enable Row Level Security
ALTER TABLE priority_queue_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own queue items"
  ON priority_queue_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue items"
  ON priority_queue_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items"
  ON priority_queue_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue items"
  ON priority_queue_items FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert queue items (for automated signals)
CREATE POLICY "Service role can insert queue items"
  ON priority_queue_items FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add constraints
ALTER TABLE priority_queue_items
  ADD CONSTRAINT pq_has_entity
  CHECK (
    company_id IS NOT NULL OR
    research_report_id IS NOT NULL OR
    list_id IS NOT NULL OR
    item_type = 'recommendation'
  );

ALTER TABLE priority_queue_items
  ADD CONSTRAINT pq_due_date_future
  CHECK (due_date IS NULL OR due_date > created_at);

ALTER TABLE priority_queue_items
  ADD CONSTRAINT pq_completed_at_when_completed
  CHECK (
    (status = 'completed' AND completed_at IS NOT NULL) OR
    (status != 'completed' AND completed_at IS NULL)
  );

-- Function to auto-archive old completed/dismissed items (30 days)
CREATE OR REPLACE FUNCTION archive_old_queue_items()
RETURNS void AS $$
BEGIN
  DELETE FROM priority_queue_items
  WHERE status IN ('completed', 'dismissed')
    AND (completed_at < NOW() - INTERVAL '30 days' OR dismissed_at < NOW() - INTERVAL '30 days');
END;
$$ LANGUAGE plpgsql;

-- Create view with calculated age_days for easier querying
CREATE OR REPLACE VIEW priority_queue_items_with_age AS
SELECT
  *,
  EXTRACT(DAY FROM (NOW() - created_at))::INTEGER AS age_days
FROM priority_queue_items;

-- Grant access to view
GRANT SELECT ON priority_queue_items_with_age TO authenticated;

-- Comment on table
COMMENT ON TABLE priority_queue_items IS 'AI-ranked to-do list items with priority scoring, urgency indicators, and entity relationships';
COMMENT ON VIEW priority_queue_items_with_age IS 'Priority queue items with dynamically calculated age_days field';
