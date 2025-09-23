-- Buying Signals Detection System
-- This migration creates the complete infrastructure for tracking and analyzing buying signals

-- Main buying signals table
CREATE TABLE IF NOT EXISTS buying_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  signal_type VARCHAR(50) NOT NULL, -- web_activity, job_posting, funding, tech_adoption, etc.
  signal_category VARCHAR(50), -- intent, growth, technology, financial
  signal_strength FLOAT DEFAULT 0, -- 0-10 scale
  confidence_score FLOAT DEFAULT 0, -- 0-1 confidence in signal accuracy
  source VARCHAR(100) NOT NULL, -- website, linkedin, news, job_boards
  source_url TEXT,
  title VARCHAR(500),
  description TEXT,
  raw_data JSONB,
  metadata JSONB,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Some signals lose relevance over time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_signals_company (company_id),
  INDEX idx_signals_type (signal_type),
  INDEX idx_signals_strength (signal_strength DESC),
  INDEX idx_signals_detected (detected_at DESC),
  INDEX idx_signals_processed (processed, detected_at DESC)
);

-- Signal patterns for detection rules
CREATE TABLE IF NOT EXISTS signal_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_name VARCHAR(100) NOT NULL,
  pattern_type VARCHAR(50) NOT NULL,
  pattern_category VARCHAR(50),
  detection_rules JSONB NOT NULL,
  keywords TEXT[],
  weight FLOAT DEFAULT 1.0,
  min_confidence FLOAT DEFAULT 0.5,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_patterns_type (pattern_type),
  INDEX idx_patterns_active (active)
);

-- Web activity tracking
CREATE TABLE IF NOT EXISTS web_activity_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES buying_signals(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  session_id VARCHAR(100),
  visitor_id VARCHAR(100),
  page_url TEXT NOT NULL,
  page_title VARCHAR(500),
  page_type VARCHAR(50), -- pricing, demo, features, blog, contact
  time_on_page INTEGER, -- seconds
  scroll_depth FLOAT, -- percentage
  clicks INTEGER DEFAULT 0,
  form_interactions BOOLEAN DEFAULT FALSE,
  content_downloads TEXT[],
  referrer_url TEXT,
  user_agent TEXT,
  ip_country VARCHAR(2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_web_activity_company (company_id),
  INDEX idx_web_activity_session (session_id),
  INDEX idx_web_activity_page_type (page_type),
  INDEX idx_web_activity_created (created_at DESC)
);

-- Job posting signals
CREATE TABLE IF NOT EXISTS job_posting_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES buying_signals(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  job_title VARCHAR(500) NOT NULL,
  department VARCHAR(100),
  seniority_level VARCHAR(50),
  job_type VARCHAR(50), -- full-time, contract, etc.
  location VARCHAR(200),
  remote_type VARCHAR(50), -- remote, hybrid, onsite
  salary_min INTEGER,
  salary_max INTEGER,
  currency VARCHAR(3),
  required_skills TEXT[],
  tech_stack TEXT[],
  job_board_source VARCHAR(100),
  job_url TEXT,
  posted_date DATE,
  closing_date DATE,
  raw_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_job_postings_company (company_id),
  INDEX idx_job_postings_department (department),
  INDEX idx_job_postings_posted (posted_date DESC)
);

-- Technology adoption signals
CREATE TABLE IF NOT EXISTS tech_adoption_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES buying_signals(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  technology_name VARCHAR(200) NOT NULL,
  technology_category VARCHAR(100), -- CRM, Marketing, Analytics, etc.
  technology_vendor VARCHAR(200),
  adoption_type VARCHAR(50), -- new, upgrade, switch, expansion
  detection_method VARCHAR(100), -- dns, website_tech, job_posting, news
  confidence FLOAT DEFAULT 0.5,
  previous_technology VARCHAR(200),
  implementation_stage VARCHAR(50), -- researching, evaluating, implementing, deployed
  detected_date DATE,
  evidence JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tech_adoption_company (company_id),
  INDEX idx_tech_adoption_category (technology_category),
  INDEX idx_tech_adoption_date (detected_date DESC)
);

-- Signal aggregations for quick access
CREATE TABLE IF NOT EXISTS company_signal_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  total_signals INTEGER DEFAULT 0,
  intent_score FLOAT DEFAULT 0, -- 0-100
  intent_level VARCHAR(20), -- hot, warm, lukewarm, cold
  growth_score FLOAT DEFAULT 0,
  technology_score FLOAT DEFAULT 0,
  engagement_score FLOAT DEFAULT 0,
  top_signals JSONB,
  signal_history JSONB,
  last_signal_date TIMESTAMP WITH TIME ZONE,
  last_high_intent_date TIMESTAMP WITH TIME ZONE,
  predicted_timeline VARCHAR(50), -- immediate, 1-3_months, 3-6_months, 6+_months
  recommended_actions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_signal_summary_intent (intent_score DESC),
  INDEX idx_signal_summary_level (intent_level),
  INDEX idx_signal_summary_updated (updated_at DESC)
);

-- Signal alerts configuration
CREATE TABLE IF NOT EXISTS signal_alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID,
  rule_name VARCHAR(200) NOT NULL,
  signal_types TEXT[],
  min_signal_strength FLOAT DEFAULT 7.0,
  alert_channels TEXT[], -- email, slack, in_app, webhook
  alert_frequency VARCHAR(50), -- immediate, hourly, daily, weekly
  conditions JSONB,
  active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_alert_rules_user (user_id),
  INDEX idx_alert_rules_active (active)
);

-- Signal alert history
CREATE TABLE IF NOT EXISTS signal_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_rule_id UUID REFERENCES signal_alert_rules(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES buying_signals(id) ON DELETE CASCADE,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  alert_type VARCHAR(50),
  alert_channel VARCHAR(50),
  alert_status VARCHAR(50), -- pending, sent, failed, acknowledged
  alert_data JSONB,
  sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_alerts_user (user_id),
  INDEX idx_alerts_company (company_id),
  INDEX idx_alerts_status (alert_status),
  INDEX idx_alerts_created (created_at DESC)
);

-- Insert default signal patterns
INSERT INTO signal_patterns (pattern_name, pattern_type, pattern_category, detection_rules, keywords, weight) VALUES
-- High intent patterns
('Pricing Page Visit', 'web_activity', 'intent',
 '{"page_patterns": ["/pricing", "/plans", "/cost", "/packages"], "min_time_seconds": 30}'::jsonb,
 ARRAY['pricing', 'plans', 'cost', 'packages', 'subscription'], 0.8),

('Demo Request', 'web_activity', 'intent',
 '{"page_patterns": ["/demo", "/trial", "/get-started"], "form_submission": true}'::jsonb,
 ARRAY['demo', 'trial', 'free trial', 'get started'], 0.95),

('Contact Sales', 'web_activity', 'intent',
 '{"page_patterns": ["/contact", "/sales", "/quote"], "form_submission": true}'::jsonb,
 ARRAY['contact', 'sales', 'quote', 'inquiry'], 0.9),

-- Growth patterns
('Rapid Hiring', 'job_posting', 'growth',
 '{"min_postings": 5, "timeframe_days": 30}'::jsonb,
 ARRAY['hiring', 'careers', 'join our team'], 0.7),

('Tech Team Expansion', 'job_posting', 'growth',
 '{"departments": ["Engineering", "IT", "Technology"], "min_postings": 3}'::jsonb,
 ARRAY['engineer', 'developer', 'architect', 'devops'], 0.75),

('New Department Creation', 'job_posting', 'growth',
 '{"titles_containing": ["Head of", "Director", "VP"], "new_department": true}'::jsonb,
 ARRAY['head of', 'director', 'vp', 'chief'], 0.8),

-- Technology patterns
('CRM Evaluation', 'tech_adoption', 'technology',
 '{"category": "CRM", "stage": "evaluating"}'::jsonb,
 ARRAY['crm', 'customer relationship', 'salesforce', 'hubspot'], 0.7),

('Digital Transformation', 'tech_adoption', 'technology',
 '{"categories": ["Cloud", "Analytics", "Automation"], "min_adoptions": 2}'::jsonb,
 ARRAY['digital transformation', 'cloud migration', 'automation'], 0.6),

-- Engagement patterns
('High Engagement', 'web_activity', 'engagement',
 '{"min_page_views": 10, "min_time_minutes": 5, "timeframe_days": 7}'::jsonb,
 ARRAY['engaged', 'active', 'interested'], 0.6),

('Content Consumption', 'web_activity', 'engagement',
 '{"content_downloads": true, "min_downloads": 2}'::jsonb,
 ARRAY['whitepaper', 'case study', 'ebook', 'guide'], 0.5);

-- RLS Policies
ALTER TABLE buying_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_activity_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posting_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tech_adoption_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_signal_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for buying_signals
CREATE POLICY "Users can view signals for their org's companies" ON buying_signals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM businesses b
      JOIN profiles p ON p.org_id = b.org_id OR p.id = b.created_by
      WHERE b.id = buying_signals.company_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "System can insert signals" ON buying_signals
  FOR INSERT WITH CHECK (true);

-- Policies for signal_alert_rules
CREATE POLICY "Users can manage their own alert rules" ON signal_alert_rules
  FOR ALL USING (auth.uid() = user_id);

-- Function to calculate intent score
CREATE OR REPLACE FUNCTION calculate_intent_score(p_company_id UUID)
RETURNS TABLE(
  intent_score FLOAT,
  intent_level VARCHAR(20),
  top_signals JSONB
) AS $$
DECLARE
  v_score FLOAT := 0;
  v_level VARCHAR(20);
  v_signals JSONB;
BEGIN
  -- Calculate weighted score from recent signals
  SELECT
    COALESCE(SUM(
      CASE
        WHEN detected_at > NOW() - INTERVAL '7 days' THEN signal_strength * 1.0
        WHEN detected_at > NOW() - INTERVAL '30 days' THEN signal_strength * 0.7
        WHEN detected_at > NOW() - INTERVAL '90 days' THEN signal_strength * 0.4
        ELSE signal_strength * 0.2
      END
    ) / NULLIF(COUNT(*), 0), 0) * 10
  INTO v_score
  FROM buying_signals
  WHERE company_id = p_company_id
    AND detected_at > NOW() - INTERVAL '180 days';

  -- Determine intent level
  v_level := CASE
    WHEN v_score >= 80 THEN 'hot'
    WHEN v_score >= 60 THEN 'warm'
    WHEN v_score >= 40 THEN 'lukewarm'
    WHEN v_score >= 20 THEN 'cold'
    ELSE 'no_intent'
  END;

  -- Get top signals
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', signal_type,
      'strength', signal_strength,
      'detected_at', detected_at,
      'title', title
    ) ORDER BY signal_strength DESC
  )
  INTO v_signals
  FROM (
    SELECT signal_type, signal_strength, detected_at, title
    FROM buying_signals
    WHERE company_id = p_company_id
    ORDER BY signal_strength DESC
    LIMIT 5
  ) t;

  RETURN QUERY SELECT v_score, v_level, v_signals;
END;
$$ LANGUAGE plpgsql;

-- Function to track web activity
CREATE OR REPLACE FUNCTION track_web_activity(
  p_company_id UUID,
  p_session_id VARCHAR(100),
  p_page_url TEXT,
  p_page_title VARCHAR(500),
  p_time_on_page INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_signal_id UUID;
  v_page_type VARCHAR(50);
  v_signal_strength FLOAT;
BEGIN
  -- Determine page type
  v_page_type := CASE
    WHEN p_page_url LIKE '%/pricing%' OR p_page_url LIKE '%/plans%' THEN 'pricing'
    WHEN p_page_url LIKE '%/demo%' OR p_page_url LIKE '%/trial%' THEN 'demo'
    WHEN p_page_url LIKE '%/contact%' OR p_page_url LIKE '%/sales%' THEN 'contact'
    WHEN p_page_url LIKE '%/features%' OR p_page_url LIKE '%/product%' THEN 'features'
    WHEN p_page_url LIKE '%/blog%' OR p_page_url LIKE '%/resources%' THEN 'content'
    ELSE 'other'
  END;

  -- Calculate signal strength based on page type and engagement
  v_signal_strength := CASE v_page_type
    WHEN 'demo' THEN 9.0
    WHEN 'pricing' THEN 7.5
    WHEN 'contact' THEN 8.0
    WHEN 'features' THEN 5.0
    WHEN 'content' THEN 3.0
    ELSE 2.0
  END;

  -- Adjust for time on page
  IF p_time_on_page IS NOT NULL AND p_time_on_page > 30 THEN
    v_signal_strength := v_signal_strength + (LEAST(p_time_on_page / 60.0, 2.0));
  END IF;

  -- Create buying signal if high-intent page
  IF v_page_type IN ('pricing', 'demo', 'contact', 'features') THEN
    INSERT INTO buying_signals (
      company_id,
      signal_type,
      signal_category,
      signal_strength,
      confidence_score,
      source,
      source_url,
      title,
      description,
      raw_data
    ) VALUES (
      p_company_id,
      'web_activity',
      'intent',
      LEAST(v_signal_strength, 10),
      0.8,
      'website',
      p_page_url,
      p_page_title,
      'High-intent page visit: ' || v_page_type,
      jsonb_build_object(
        'page_type', v_page_type,
        'session_id', p_session_id,
        'time_on_page', p_time_on_page
      )
    )
    RETURNING id INTO v_signal_id;

    -- Record web activity
    INSERT INTO web_activity_signals (
      signal_id,
      company_id,
      session_id,
      page_url,
      page_title,
      page_type,
      time_on_page
    ) VALUES (
      v_signal_id,
      p_company_id,
      p_session_id,
      p_page_url,
      p_page_title,
      v_page_type,
      p_time_on_page
    );
  END IF;

  -- Update company signal summary
  PERFORM update_company_signal_summary(p_company_id);

  RETURN v_signal_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update company signal summary
CREATE OR REPLACE FUNCTION update_company_signal_summary(p_company_id UUID)
RETURNS void AS $$
DECLARE
  v_intent_data RECORD;
BEGIN
  -- Get intent score
  SELECT * INTO v_intent_data
  FROM calculate_intent_score(p_company_id);

  -- Upsert summary
  INSERT INTO company_signal_summary (
    company_id,
    total_signals,
    intent_score,
    intent_level,
    top_signals,
    last_signal_date,
    updated_at
  )
  SELECT
    p_company_id,
    COUNT(*),
    v_intent_data.intent_score,
    v_intent_data.intent_level,
    v_intent_data.top_signals,
    MAX(detected_at),
    NOW()
  FROM buying_signals
  WHERE company_id = p_company_id
  ON CONFLICT (company_id) DO UPDATE SET
    total_signals = EXCLUDED.total_signals,
    intent_score = EXCLUDED.intent_score,
    intent_level = EXCLUDED.intent_level,
    top_signals = EXCLUDED.top_signals,
    last_signal_date = EXCLUDED.last_signal_date,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to check alerts when new signal is created
CREATE OR REPLACE FUNCTION check_signal_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if signal meets any alert criteria
  INSERT INTO signal_alerts (
    alert_rule_id,
    signal_id,
    company_id,
    user_id,
    alert_type,
    alert_status,
    alert_data
  )
  SELECT
    r.id,
    NEW.id,
    NEW.company_id,
    r.user_id,
    'signal_detected',
    'pending',
    jsonb_build_object(
      'signal_type', NEW.signal_type,
      'signal_strength', NEW.signal_strength,
      'company_id', NEW.company_id
    )
  FROM signal_alert_rules r
  WHERE r.active = true
    AND NEW.signal_strength >= r.min_signal_strength
    AND (r.signal_types IS NULL OR NEW.signal_type = ANY(r.signal_types));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_signal_alerts
  AFTER INSERT ON buying_signals
  FOR EACH ROW
  EXECUTE FUNCTION check_signal_alerts();

-- Indexes for performance
CREATE INDEX idx_signals_company_date ON buying_signals(company_id, detected_at DESC);
CREATE INDEX idx_web_activity_high_intent ON web_activity_signals(company_id, page_type)
  WHERE page_type IN ('pricing', 'demo', 'contact');
CREATE INDEX idx_job_postings_recent ON job_posting_signals(company_id, posted_date DESC);
CREATE INDEX idx_alerts_pending ON signal_alerts(alert_status, created_at)
  WHERE alert_status = 'pending';