-- Create email_logs table to track sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  message_id TEXT,
  error TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);

-- Create notification_preferences table if not exists
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  weekly_digest BOOLEAN DEFAULT true,
  business_updates BOOLEAN DEFAULT true,
  search_alerts BOOLEAN DEFAULT true,
  security_alerts BOOLEAN DEFAULT true,
  product_updates BOOLEAN DEFAULT false,
  marketing_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Create scheduled_emails table for queued emails
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  data JSONB NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- pending, sent, failed, cancelled
  attempts INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX idx_scheduled_emails_user_id ON scheduled_emails(user_id);

-- Create function to get user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_preferences(p_user_id UUID)
RETURNS TABLE (
  email_notifications BOOLEAN,
  weekly_digest BOOLEAN,
  business_updates BOOLEAN,
  search_alerts BOOLEAN,
  security_alerts BOOLEAN,
  product_updates BOOLEAN,
  marketing_emails BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(np.email_notifications, true) as email_notifications,
    COALESCE(np.weekly_digest, true) as weekly_digest,
    COALESCE(np.business_updates, true) as business_updates,
    COALESCE(np.search_alerts, true) as search_alerts,
    COALESCE(np.security_alerts, true) as security_alerts,
    COALESCE(np.product_updates, false) as product_updates,
    COALESCE(np.marketing_emails, false) as marketing_emails
  FROM notification_preferences np
  WHERE np.user_id = p_user_id
  UNION ALL
  SELECT 
    true as email_notifications,
    true as weekly_digest,
    true as business_updates,
    true as search_alerts,
    true as security_alerts,
    false as product_updates,
    false as marketing_emails
  WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences WHERE user_id = p_user_id
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to check if user wants specific notification type
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_preferences RECORD;
BEGIN
  SELECT * INTO v_preferences 
  FROM get_user_notification_preferences(p_user_id);
  
  -- Always send security alerts
  IF p_notification_type = 'security' THEN
    RETURN v_preferences.security_alerts;
  END IF;
  
  -- Check if email notifications are enabled
  IF NOT v_preferences.email_notifications THEN
    RETURN false;
  END IF;
  
  -- Check specific notification types
  CASE p_notification_type
    WHEN 'weekly_digest' THEN RETURN v_preferences.weekly_digest;
    WHEN 'business_update' THEN RETURN v_preferences.business_updates;
    WHEN 'search_alert' THEN RETURN v_preferences.search_alerts;
    WHEN 'product_update' THEN RETURN v_preferences.product_updates;
    WHEN 'marketing' THEN RETURN v_preferences.marketing_emails;
    ELSE RETURN v_preferences.email_notifications;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON scheduled_emails TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification TO authenticated;

-- Create RLS policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Email logs policies (users can only see their own)
CREATE POLICY "Users can view own email logs"
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Scheduled emails policies
CREATE POLICY "Users can view own scheduled emails"
  ON scheduled_emails FOR SELECT
  USING (auth.uid() = user_id);