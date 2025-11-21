-- ================================================================
-- Competitive Intelligence Alert System
-- Created: 2025-11-22
-- Feature: T014 Phase 5 - Alert System
-- ================================================================

-- ================================================================
-- 1. ALERT RULES TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS competitive_intelligence_alert_rules (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rule Configuration
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
    'moat_threshold',      -- Moat score drops below threshold
    'parity_threshold',    -- Parity increases above threshold
    'pricing_change',      -- Any pricing change
    'competitor_added',    -- New competitor detected
    'platform_threat',     -- Platform threat level change
    'velocity_drop'        -- Feature velocity drops
  )),

  -- Threshold Configuration
  threshold_config JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- moat_threshold: { "min_score": 50, "comparison": "below" }
  -- parity_threshold: { "max_score": 80, "comparison": "above" }
  -- velocity_drop: { "min_features_per_period": 5 }

  -- Alert Settings
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Notification Channels
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_in_app BOOLEAN NOT NULL DEFAULT true,
  notify_webhook BOOLEAN NOT NULL DEFAULT false,
  webhook_url VARCHAR(500),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_rule_per_analysis UNIQUE(analysis_id, rule_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_rules_analysis_id ON competitive_intelligence_alert_rules(analysis_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_created_by ON competitive_intelligence_alert_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON competitive_intelligence_alert_rules(is_enabled);

-- RLS
ALTER TABLE competitive_intelligence_alert_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their analysis alert rules" ON competitive_intelligence_alert_rules;
CREATE POLICY "Users manage their analysis alert rules"
  ON competitive_intelligence_alert_rules
  FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid() OR
    analysis_id IN (
      SELECT id FROM competitive_analyses
      WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid() OR
    analysis_id IN (
      SELECT id FROM competitive_analyses
      WHERE created_by = auth.uid()
    )
  );

-- ================================================================
-- 2. ALERT NOTIFICATIONS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS competitive_intelligence_alert_notifications (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  analysis_id UUID NOT NULL REFERENCES competitive_analyses(id) ON DELETE CASCADE,
  alert_rule_id UUID REFERENCES competitive_intelligence_alert_rules(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Alert Details
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Alert Data
  alert_data JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- { "old_score": 65, "new_score": 48, "change": -17, "competitor": "Miro" }
  -- { "competitor_name": "Notion", "parity_score": 85 }

  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alert_notifications_analysis_id ON competitive_intelligence_alert_notifications(analysis_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_user_id ON competitive_intelligence_alert_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_is_read ON competitive_intelligence_alert_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_created_at ON competitive_intelligence_alert_notifications(created_at DESC);

-- RLS
ALTER TABLE competitive_intelligence_alert_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their alert notifications" ON competitive_intelligence_alert_notifications;
CREATE POLICY "Users view their alert notifications"
  ON competitive_intelligence_alert_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update their alert notifications" ON competitive_intelligence_alert_notifications;
CREATE POLICY "Users update their alert notifications"
  ON competitive_intelligence_alert_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================================================
-- 3. UPDATE TRIGGERS
-- ================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_competitive_intelligence_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON competitive_intelligence_alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_competitive_intelligence_alert_rules_updated_at();

CREATE OR REPLACE FUNCTION update_competitive_intelligence_alert_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alert_notifications_updated_at
  BEFORE UPDATE ON competitive_intelligence_alert_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_competitive_intelligence_alert_notifications_updated_at();

-- ================================================================
-- 4. DEFAULT ALERT RULES FOR ITONICS
-- ================================================================

-- These will be created automatically when the ITONICS analysis is initialized
-- (Handled in application code, not here)

COMMENT ON TABLE competitive_intelligence_alert_rules IS 'Configurable alert rules for competitive intelligence monitoring';
COMMENT ON TABLE competitive_intelligence_alert_notifications IS 'Alert notifications triggered by competitive intelligence changes';
