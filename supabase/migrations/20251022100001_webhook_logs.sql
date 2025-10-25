-- Webhook Logs Migration
-- Creates webhook_logs table for tracking webhook delivery

-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES system_alerts(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_webhook_logs_alert_id ON webhook_logs(alert_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status_code) WHERE status_code IS NOT NULL;

-- RLS Policies (admin only)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook logs"
  ON webhook_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Comment on table
COMMENT ON TABLE webhook_logs IS 'Tracks webhook delivery attempts and responses';

-- Automatic cleanup of old logs (keep 30 days)
-- This can be run as a scheduled job or manually
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs() RETURNS void AS $$
BEGIN
  DELETE FROM webhook_logs
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_webhook_logs IS 'Delete webhook logs older than 30 days';
