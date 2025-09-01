-- Notification System Schema

-- Notification types and templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL UNIQUE CHECK (type IN (
        -- Business alerts
        'new_competitor',
        'competitor_rating_change',
        'competitor_new_location',
        'market_shift',
        
        -- Review alerts
        'new_review',
        'review_response_needed',
        'rating_change',
        'review_milestone',
        
        -- Social media alerts
        'social_mention',
        'social_milestone',
        'engagement_spike',
        'follower_milestone',
        
        -- Business updates
        'business_update',
        'business_followed',
        'update_liked',
        'update_commented',
        
        -- System notifications
        'welcome',
        'weekly_digest',
        'monthly_report',
        'data_ready',
        'scrape_complete',
        'alert_triggered'
    )),
    
    -- Template content
    title TEXT NOT NULL,
    body_template TEXT NOT NULL, -- Supports variables like {{business_name}}
    email_subject TEXT,
    email_template TEXT,
    sms_template TEXT,
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    
    -- Delivery channels
    supports_push BOOLEAN DEFAULT true,
    supports_email BOOLEAN DEFAULT true,
    supports_sms BOOLEAN DEFAULT false,
    supports_in_app BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Global settings
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT DEFAULT 'UTC',
    
    -- Frequency settings
    digest_frequency TEXT CHECK (digest_frequency IN ('realtime', 'daily', 'weekly', 'never')) DEFAULT 'realtime',
    
    -- Type-specific preferences (JSONB for flexibility)
    type_preferences JSONB DEFAULT '{}', -- {type: {email: true, push: false, ...}}
    
    -- Contact info
    email_address TEXT,
    phone_number TEXT,
    phone_verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    
    -- Content
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Additional data (business_id, update_id, etc.)
    
    -- Metadata
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    category TEXT, -- For grouping in UI
    action_url TEXT, -- Where to navigate when clicked
    image_url TEXT, -- Optional image/icon
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Delivery status
    delivered_channels TEXT[] DEFAULT '{}', -- ['in_app', 'email', 'push', 'sms']
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    sms_sent BOOLEAN DEFAULT false,
    sms_sent_at TIMESTAMPTZ,
    push_sent BOOLEAN DEFAULT false,
    push_sent_at TIMESTAMPTZ,
    
    -- Expiry
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification queue for batch processing
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    notification_data JSONB NOT NULL,
    
    -- Processing
    status TEXT CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')) DEFAULT 'pending',
    scheduled_for TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- Delivery channels
    channels TEXT[] NOT NULL DEFAULT '{in_app}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification subscriptions (for specific alerts)
CREATE TABLE notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- What to monitor
    entity_type TEXT CHECK (entity_type IN ('business', 'competitor_set', 'market', 'category')),
    entity_id TEXT, -- Could be business_id, competitor_set_id, category name, etc.
    
    -- Alert conditions
    alert_conditions JSONB DEFAULT '{}', -- {rating_drop: 0.5, new_review: true, etc.}
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    frequency TEXT CHECK (frequency IN ('instant', 'hourly', 'daily', 'weekly')) DEFAULT 'instant',
    
    -- Last check
    last_checked_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, entity_type, entity_id)
);

-- Push notification tokens
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    token TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('web', 'ios', 'android')) NOT NULL,
    device_info JSONB DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(token)
);

-- Notification analytics
CREATE TABLE notification_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    
    -- Engagement
    clicked BOOLEAN DEFAULT false,
    clicked_at TIMESTAMPTZ,
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,
    
    -- Delivery metrics
    delivery_time_ms INT, -- Time to deliver
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX idx_notification_subscriptions_user ON notification_subscriptions(user_id);
CREATE INDEX idx_notification_subscriptions_entity ON notification_subscriptions(entity_type, entity_id);
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_token ON push_tokens(token);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Templates (public read)
CREATE POLICY "Anyone can view active templates" ON notification_templates
    FOR SELECT USING (is_active = true);

-- Preferences
CREATE POLICY "Users can view their preferences" ON notification_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their preferences" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- Notifications
CREATE POLICY "Users can view their notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Queue (admin only for direct access)
CREATE POLICY "Admins can manage queue" ON notification_queue
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'owner')
        )
    );

-- Subscriptions
CREATE POLICY "Users can manage their subscriptions" ON notification_subscriptions
    FOR ALL USING (user_id = auth.uid());

-- Push tokens
CREATE POLICY "Users can manage their push tokens" ON push_tokens
    FOR ALL USING (user_id = auth.uid());

-- Analytics
CREATE POLICY "Users can view their notification analytics" ON notification_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM notifications
            WHERE notifications.id = notification_id
            AND notifications.user_id = auth.uid()
        )
    );

-- Functions

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE notifications
    SET 
        is_read = true,
        read_at = NOW()
    WHERE id = notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
    UPDATE notifications
    SET 
        is_read = true,
        read_at = NOW()
    WHERE user_id = auth.uid()
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get unread count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM notifications
        WHERE user_id = auth.uid()
        AND is_read = false
        AND is_archived = false
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT,
    p_data JSONB DEFAULT '{}',
    p_priority TEXT DEFAULT 'medium',
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_preferences RECORD;
BEGIN
    -- Get user preferences
    SELECT * INTO v_preferences
    FROM notification_preferences
    WHERE user_id = p_user_id;
    
    -- Create the notification
    INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        data,
        priority,
        action_url
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_body,
        p_data,
        p_priority,
        p_action_url
    ) RETURNING id INTO v_notification_id;
    
    -- Queue for email/SMS if enabled
    IF v_preferences.email_enabled THEN
        INSERT INTO notification_queue (
            user_id,
            notification_type,
            notification_data,
            channels
        ) VALUES (
            p_user_id,
            p_type,
            jsonb_build_object(
                'notification_id', v_notification_id,
                'title', p_title,
                'body', p_body,
                'data', p_data
            ),
            ARRAY['email']
        );
    END IF;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check and trigger alerts
CREATE OR REPLACE FUNCTION check_notification_triggers()
RETURNS void AS $$
DECLARE
    v_subscription RECORD;
    v_should_notify BOOLEAN;
BEGIN
    -- Check each active subscription
    FOR v_subscription IN 
        SELECT * FROM notification_subscriptions
        WHERE is_active = true
        AND (
            frequency = 'instant' 
            OR (frequency = 'hourly' AND last_checked_at < NOW() - INTERVAL '1 hour')
            OR (frequency = 'daily' AND last_checked_at < NOW() - INTERVAL '1 day')
            OR (frequency = 'weekly' AND last_checked_at < NOW() - INTERVAL '1 week')
        )
    LOOP
        v_should_notify := false;
        
        -- Check conditions based on entity type
        IF v_subscription.entity_type = 'business' THEN
            -- Check for business-specific triggers
            -- (Rating changes, new reviews, etc.)
            v_should_notify := check_business_triggers(
                v_subscription.entity_id,
                v_subscription.alert_conditions
            );
        ELSIF v_subscription.entity_type = 'competitor_set' THEN
            -- Check for competitor changes
            v_should_notify := check_competitor_triggers(
                v_subscription.entity_id,
                v_subscription.alert_conditions
            );
        END IF;
        
        -- Create notification if triggered
        IF v_should_notify THEN
            PERFORM create_notification(
                v_subscription.user_id,
                'alert_triggered',
                'Alert Triggered',
                'Your monitoring alert has been triggered',
                jsonb_build_object(
                    'subscription_id', v_subscription.id,
                    'entity_type', v_subscription.entity_type,
                    'entity_id', v_subscription.entity_id
                )
            );
            
            -- Update last triggered
            UPDATE notification_subscriptions
            SET last_triggered_at = NOW()
            WHERE id = v_subscription.id;
        END IF;
        
        -- Update last checked
        UPDATE notification_subscriptions
        SET last_checked_at = NOW()
        WHERE id = v_subscription.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check business triggers
CREATE OR REPLACE FUNCTION check_business_triggers(
    p_business_id TEXT,
    p_conditions JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_business RECORD;
    v_old_rating DECIMAL;
BEGIN
    -- This is a simplified version
    -- In production, you'd check various conditions
    SELECT * INTO v_business
    FROM businesses
    WHERE id = p_business_id::UUID;
    
    -- Check rating drop
    IF p_conditions->>'rating_drop' IS NOT NULL THEN
        -- Would need to compare with historical data
        RETURN false; -- Placeholder
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check competitor triggers  
CREATE OR REPLACE FUNCTION check_competitor_triggers(
    p_set_id TEXT,
    p_conditions JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Placeholder for competitor checking logic
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default notification templates
INSERT INTO notification_templates (type, title, body_template, email_subject, priority) VALUES
('new_competitor', 'New Competitor Alert', 'A new competitor "{{competitor_name}}" has been detected in your market', 'New Competitor Alert', 'high'),
('rating_change', 'Rating Change Alert', 'Rating for {{business_name}} has changed from {{old_rating}} to {{new_rating}}', 'Rating Change Alert', 'high'),
('new_review', 'New Review', '{{business_name}} has received a new {{rating}}-star review', 'New Review for {{business_name}}', 'medium'),
('social_mention', 'Social Media Mention', '{{business_name}} was mentioned on {{platform}}', 'Social Media Mention', 'medium'),
('weekly_digest', 'Weekly Digest', 'Your weekly business intelligence summary is ready', 'Your Weekly OppSpot Digest', 'low'),
('business_followed', 'New Follower', '{{user_name}} is now following {{business_name}}', 'New Follower', 'low'),
('welcome', 'Welcome to OppSpot', 'Welcome to OppSpot! Start tracking your business competition today.', 'Welcome to OppSpot', 'medium');