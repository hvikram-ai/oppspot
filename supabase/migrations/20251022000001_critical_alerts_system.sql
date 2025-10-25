-- =====================================================
-- Critical Alerts System - Phase 1 Foundation
-- Created: 2025-10-22
-- Purpose: Add system-level failure detection and alerting
-- =====================================================

-- =====================================================
-- 1. Fix Notifications Table - Add Missing Columns
-- =====================================================

-- Add missing columns that existing code expects
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS delivered_channels JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

-- Create index on priority for filtering
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_archived ON notifications(user_id, is_archived);

-- Update existing rows to set is_read based on read_at
UPDATE notifications SET is_read = true WHERE read_at IS NOT NULL AND is_read = false;

-- =====================================================
-- 2. System Alerts Table - For Critical Failures
-- =====================================================

CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alert Classification
  severity TEXT NOT NULL CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),
  category TEXT NOT NULL CHECK (category IN (
    'database_failure',
    'api_failure',
    'external_service_failure',
    'auth_failure',
    'data_integrity',
    'performance_degradation',
    'security_incident',
    'rate_limit_exceeded',
    'job_failure',
    'custom'
  )),

  -- Alert Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB DEFAULT '{}'::jsonb,

  -- Source Information
  source_service TEXT NOT NULL, -- e.g., 'api', 'database', 'supabase', 'openrouter'
  source_endpoint TEXT, -- e.g., '/api/companies/enrich'
  source_method TEXT, -- e.g., 'GET', 'POST'
  affected_users TEXT[], -- Array of user IDs affected

  -- Alert State
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'investigating', 'resolved', 'false_positive')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,

  -- Delivery Tracking
  channels_notified TEXT[] DEFAULT '{}', -- e.g., ['email', 'slack', 'sms']
  notification_sent_at TIMESTAMPTZ,
  notification_failed BOOLEAN DEFAULT false,
  notification_error TEXT,

  -- Deduplication
  fingerprint TEXT, -- Hash of error to prevent duplicate alerts
  occurrence_count INTEGER DEFAULT 1,
  first_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  last_occurred_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  related_alert_ids UUID[],
  runbook_url TEXT, -- Link to runbook for this type of alert

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_status ON system_alerts(status);
CREATE INDEX idx_system_alerts_category ON system_alerts(category);
CREATE INDEX idx_system_alerts_source_service ON system_alerts(source_service);
CREATE INDEX idx_system_alerts_fingerprint ON system_alerts(fingerprint) WHERE fingerprint IS NOT NULL;
CREATE INDEX idx_system_alerts_created_at ON system_alerts(created_at DESC);
CREATE INDEX idx_system_alerts_unresolved ON system_alerts(status, created_at DESC) WHERE status IN ('open', 'acknowledged', 'investigating');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_alerts_updated_at
  BEFORE UPDATE ON system_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_system_alerts_updated_at();

-- =====================================================
-- 3. Alert Rules Table - Configurable Alert Triggers
-- =====================================================

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rule Identification
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN DEFAULT true,

  -- Rule Conditions
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('P0', 'P1', 'P2', 'P3')),

  -- Trigger Conditions (JSONB for flexibility)
  conditions JSONB NOT NULL,
  /* Example conditions:
  {
    "error_rate": { "threshold": 10, "window": "5m" },
    "response_time": { "threshold": 5000, "window": "1m" },
    "failure_count": { "threshold": 5, "window": "10m" }
  }
  */

  -- Alert Behavior
  notification_channels TEXT[] DEFAULT '{email}'::TEXT[], -- email, slack, sms
  deduplication_window INTEGER DEFAULT 300, -- seconds (5 min default)
  auto_resolve_after INTEGER, -- seconds, null = manual resolution only

  -- Recipients
  recipient_emails TEXT[] DEFAULT '{}',
  recipient_user_ids UUID[] DEFAULT '{}',
  recipient_roles TEXT[] DEFAULT '{admin}'::TEXT[], -- Notify users with these roles

  -- Escalation
  escalate_after INTEGER, -- seconds before escalating
  escalation_channels TEXT[] DEFAULT '{}',
  escalation_recipients TEXT[] DEFAULT '{}',

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  runbook_url TEXT,
  created_by UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled) WHERE enabled = true;
CREATE INDEX idx_alert_rules_category ON alert_rules(category);

-- Trigger for updated_at
CREATE TRIGGER alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_system_alerts_updated_at();

-- =====================================================
-- 4. Alert Configuration Table - System Settings
-- =====================================================

CREATE TABLE IF NOT EXISTS alert_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Configuration Key (one row per config type)
  config_key TEXT NOT NULL UNIQUE,

  -- Configuration Values
  config_value JSONB NOT NULL,
  /* Example configurations:
  {
    "email": {
      "enabled": true,
      "from": "alerts@oppspot.ai",
      "admin_emails": ["admin@oppspot.ai"]
    },
    "slack": {
      "enabled": false,
      "webhook_url": "https://hooks.slack.com/...",
      "channel": "#alerts"
    },
    "thresholds": {
      "error_rate_p0": 50,
      "error_rate_p1": 20,
      "response_time_p1": 5000
    }
  }
  */

  description TEXT,
  enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER alert_configurations_updated_at
  BEFORE UPDATE ON alert_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_system_alerts_updated_at();

-- =====================================================
-- 5. Alert History Table - Audit Trail
-- =====================================================

CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES system_alerts(id) ON DELETE CASCADE,

  action TEXT NOT NULL CHECK (action IN ('created', 'acknowledged', 'status_changed', 'resolved', 'escalated', 'note_added')),
  actor_id UUID REFERENCES profiles(id),

  previous_state JSONB,
  new_state JSONB,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alert_history_alert_id ON alert_history(alert_id, created_at DESC);
CREATE INDEX idx_alert_history_created_at ON alert_history(created_at DESC);

-- =====================================================
-- 6. Service Health Checks Table
-- =====================================================

CREATE TABLE IF NOT EXISTS service_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  service_name TEXT NOT NULL,
  check_type TEXT NOT NULL, -- 'database', 'api', 'external_service'
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),

  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_health_service ON service_health_checks(service_name, checked_at DESC);
CREATE INDEX idx_service_health_status ON service_health_checks(status, checked_at DESC);

-- Automatically clean up old health checks (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_health_checks()
RETURNS void AS $$
BEGIN
  DELETE FROM service_health_checks
  WHERE checked_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_health_checks ENABLE ROW LEVEL SECURITY;

-- System Alerts Policies
-- Admin users can see all alerts
CREATE POLICY "Admins can view all system alerts" ON system_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admin users can manage alerts
CREATE POLICY "Admins can update system alerts" ON system_alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Service role can insert alerts (for automated systems)
CREATE POLICY "Service role can insert system alerts" ON system_alerts
  FOR INSERT
  WITH CHECK (true); -- Service role only, handled by RLS bypass

-- Alert Rules Policies
CREATE POLICY "Admins can view alert rules" ON alert_rules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage alert rules" ON alert_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Alert Configurations Policies
CREATE POLICY "Admins can view alert configurations" ON alert_configurations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage alert configurations" ON alert_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Alert History Policies
CREATE POLICY "Admins can view alert history" ON alert_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Service role can insert alert history" ON alert_history
  FOR INSERT
  WITH CHECK (true);

-- Service Health Checks Policies
CREATE POLICY "Admins can view health checks" ON service_health_checks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Service role can insert health checks" ON service_health_checks
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 8. Seed Default Alert Rules
-- =====================================================

INSERT INTO alert_rules (name, description, category, severity, conditions, notification_channels, recipient_roles, runbook_url)
VALUES
  (
    'Database Connection Failure',
    'Alert when database connections fail repeatedly',
    'database_failure',
    'P0',
    '{"failure_count": {"threshold": 3, "window": "5m"}}'::jsonb,
    '{email}'::TEXT[],
    '{admin, super_admin}'::TEXT[],
    'https://docs.oppspot.ai/runbooks/database-failure'
  ),
  (
    'API Error Rate High',
    'Alert when API error rate exceeds threshold',
    'api_failure',
    'P1',
    '{"error_rate": {"threshold": 10, "window": "5m"}}'::jsonb,
    '{email}'::TEXT[],
    '{admin}'::TEXT[],
    'https://docs.oppspot.ai/runbooks/api-errors'
  ),
  (
    'External Service Failure',
    'Alert when external services (Supabase, OpenRouter) fail',
    'external_service_failure',
    'P1',
    '{"failure_count": {"threshold": 5, "window": "10m"}}'::jsonb,
    '{email}'::TEXT[],
    '{admin}'::TEXT[],
    'https://docs.oppspot.ai/runbooks/external-service'
  ),
  (
    'Authentication System Down',
    'Critical alert when auth system fails',
    'auth_failure',
    'P0',
    '{"failure_count": {"threshold": 3, "window": "5m"}}'::jsonb,
    '{email}'::TEXT[],
    '{admin, super_admin}'::TEXT[],
    'https://docs.oppspot.ai/runbooks/auth-failure'
  ),
  (
    'Performance Degradation',
    'Alert when API response times are consistently slow',
    'performance_degradation',
    'P2',
    '{"avg_response_time": {"threshold": 5000, "window": "10m"}}'::jsonb,
    '{email}'::TEXT[],
    '{admin}'::TEXT[],
    'https://docs.oppspot.ai/runbooks/performance'
  )
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 9. Seed Default Alert Configurations
-- =====================================================

INSERT INTO alert_configurations (config_key, config_value, description)
VALUES
  (
    'email_settings',
    '{
      "enabled": true,
      "from": "alerts@oppspot.ai",
      "admin_emails": ["admin@oppspot.ai"]
    }'::jsonb,
    'Email notification settings for critical alerts'
  ),
  (
    'slack_settings',
    '{
      "enabled": false,
      "webhook_url": "",
      "channel": "#alerts",
      "mention_on_p0": true
    }'::jsonb,
    'Slack integration settings (disabled by default)'
  ),
  (
    'alert_thresholds',
    '{
      "error_rate_p0": 50,
      "error_rate_p1": 20,
      "error_rate_p2": 10,
      "response_time_p1": 5000,
      "response_time_p2": 3000,
      "deduplication_window": 300
    }'::jsonb,
    'Global alert thresholds and settings'
  ),
  (
    'escalation_settings',
    '{
      "enabled": true,
      "p0_escalate_after_minutes": 15,
      "p1_escalate_after_minutes": 30,
      "escalation_channels": ["email"]
    }'::jsonb,
    'Alert escalation configuration'
  )
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- 10. Helpful Views
-- =====================================================

-- View for active critical alerts
CREATE OR REPLACE VIEW active_critical_alerts AS
SELECT
  id,
  severity,
  category,
  title,
  message,
  source_service,
  source_endpoint,
  status,
  occurrence_count,
  first_occurred_at,
  last_occurred_at,
  created_at
FROM system_alerts
WHERE status IN ('open', 'acknowledged', 'investigating')
  AND severity IN ('P0', 'P1')
ORDER BY
  CASE severity
    WHEN 'P0' THEN 1
    WHEN 'P1' THEN 2
    WHEN 'P2' THEN 3
    WHEN 'P3' THEN 4
  END,
  created_at DESC;

-- View for alert statistics
CREATE OR REPLACE VIEW alert_statistics AS
SELECT
  DATE_TRUNC('hour', created_at) AS hour,
  severity,
  category,
  COUNT(*) AS alert_count,
  COUNT(DISTINCT fingerprint) AS unique_alerts,
  AVG(occurrence_count) AS avg_occurrences
FROM system_alerts
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), severity, category
ORDER BY hour DESC;

-- =====================================================
-- Migration Complete
-- =====================================================

COMMENT ON TABLE system_alerts IS 'Critical system failure alerts for admin notification';
COMMENT ON TABLE alert_rules IS 'Configurable rules for triggering system alerts';
COMMENT ON TABLE alert_configurations IS 'System-wide alert configuration settings';
COMMENT ON TABLE alert_history IS 'Audit trail for all alert state changes';
COMMENT ON TABLE service_health_checks IS 'Health check results for system services';
