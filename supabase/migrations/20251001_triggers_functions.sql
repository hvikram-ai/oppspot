-- Migration: Triggers and Functions for Dashboard
-- Purpose: Priority score calculation and automated workflows
-- Created: 2025-10-01

-- Priority Score Calculation Function
-- Formula: (value*0.4 + urgency*0.3 + fit*0.2 + recency*0.1) / log(age_days + 1)
CREATE OR REPLACE FUNCTION calculate_priority_score()
RETURNS TRIGGER AS $$
DECLARE
  age_days INTEGER;
  recency_score INTEGER;
BEGIN
  -- Calculate age in days
  age_days := EXTRACT(DAY FROM (NOW() - NEW.created_at))::INTEGER;

  -- Calculate recency score (100 for new, decays over time)
  recency_score := GREATEST(0, 100 - (age_days * 2));

  -- Calculate weighted priority score
  NEW.priority_score := (
    (COALESCE(NEW.value_score, 50) * 0.4) +
    (COALESCE(NEW.urgency_score, 50) * 0.3) +
    (COALESCE(NEW.fit_score, 50) * 0.2) +
    (recency_score * 0.1)
  ) / NULLIF(LOG(age_days + 2), 0); -- +2 to avoid log(1)=0

  -- Set priority_level based on score
  IF NEW.priority_score >= 75 THEN
    NEW.priority_level := 'critical';
  ELSIF NEW.priority_score >= 60 THEN
    NEW.priority_level := 'high';
  ELSIF NEW.priority_score >= 40 THEN
    NEW.priority_level := 'medium';
  ELSE
    NEW.priority_level := 'low';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to priority_queue_items
CREATE TRIGGER trigger_calculate_priority_score
  BEFORE INSERT OR UPDATE OF urgency_score, value_score, fit_score
  ON priority_queue_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_priority_score();

-- Auto-set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_queue_item_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := NOW();
  END IF;

  IF NEW.status = 'dismissed' AND OLD.status != 'dismissed' THEN
    NEW.dismissed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_completed_at
  BEFORE UPDATE OF status ON priority_queue_items
  FOR EACH ROW
  EXECUTE FUNCTION set_queue_item_completed_at();

-- Function to generate priority queue items from signals
-- This will be called by background jobs when new signals are detected
CREATE OR REPLACE FUNCTION create_queue_item_from_signal(
  p_user_id UUID,
  p_company_id UUID,
  p_signal_type TEXT,
  p_urgency_score INTEGER DEFAULT 70,
  p_value_score INTEGER DEFAULT 60
)
RETURNS UUID AS $$
DECLARE
  v_queue_item_id UUID;
  v_company_name TEXT;
  v_item_type queue_item_type;
BEGIN
  -- Get company name
  SELECT name INTO v_company_name FROM businesses WHERE id = p_company_id;

  -- Determine item type based on signal
  CASE p_signal_type
    WHEN 'hiring' THEN v_item_type := 'signal_alert';
    WHEN 'funding' THEN v_item_type := 'signal_alert';
    WHEN 'leadership_change' THEN v_item_type := 'signal_alert';
    ELSE v_item_type := 'recommendation';
  END CASE;

  -- Create queue item
  INSERT INTO priority_queue_items (
    user_id,
    company_id,
    item_type,
    title,
    description,
    action_label,
    action_url,
    urgency_score,
    value_score,
    fit_score,
    metadata
  ) VALUES (
    p_user_id,
    p_company_id,
    v_item_type,
    format('%s detected for %s', p_signal_type, v_company_name),
    format('New %s signal detected. This could be a good opportunity to reach out.', p_signal_type),
    'View Company',
    format('/business/%s', p_company_id),
    p_urgency_score,
    p_value_score,
    70, -- Default fit score
    jsonb_build_object('signal_type', p_signal_type, 'auto_generated', true)
  )
  RETURNING id INTO v_queue_item_id;

  RETURN v_queue_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role (for automated jobs)
GRANT EXECUTE ON FUNCTION create_queue_item_from_signal(UUID, UUID, TEXT, INTEGER, INTEGER) TO service_role;

-- Function to create follow-up queue items for stale leads
CREATE OR REPLACE FUNCTION create_follow_up_queue_items()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  -- Find companies that haven't been contacted in 7+ days
  FOR r IN
    SELECT DISTINCT
      sb.user_id,
      sb.business_id,
      b.name AS company_name,
      EXTRACT(DAY FROM NOW() - sb.updated_at)::INTEGER AS days_since_contact
    FROM saved_businesses sb
    JOIN businesses b ON sb.business_id = b.id
    WHERE sb.updated_at < NOW() - INTERVAL '7 days'
      AND sb.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM priority_queue_items pq
        WHERE pq.company_id = sb.business_id
          AND pq.user_id = sb.user_id
          AND pq.item_type = 'lead_follow_up'
          AND pq.status = 'pending'
      )
    LIMIT 100
  LOOP
    -- Create follow-up queue item
    INSERT INTO priority_queue_items (
      user_id,
      company_id,
      item_type,
      title,
      description,
      action_label,
      action_url,
      urgency_score,
      value_score,
      fit_score,
      metadata,
      priority_level
    ) VALUES (
      r.user_id,
      r.business_id,
      'lead_follow_up',
      format('Follow up: %s', r.company_name),
      format('Last contacted %s days ago. Time to reconnect.', r.days_since_contact),
      'Contact Lead',
      format('/business/%s', r.business_id),
      LEAST(100, 50 + (r.days_since_contact * 3)), -- Urgency increases with age
      70,
      75,
      jsonb_build_object('days_since_contact', r.days_since_contact, 'auto_generated', true),
      'high'
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION create_follow_up_queue_items() TO service_role;

-- Scheduled job trigger (to be called by cron or edge function)
CREATE OR REPLACE FUNCTION run_daily_queue_generation()
RETURNS void AS $$
BEGIN
  -- Generate follow-up items
  PERFORM create_follow_up_queue_items();

  -- Archive old completed items (30+ days)
  PERFORM archive_old_queue_items();

  -- Cleanup old analytics (90+ days)
  PERFORM cleanup_old_analytics();

  -- Cleanup old AI digests (90+ days)
  PERFORM cleanup_old_ai_digests();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION run_daily_queue_generation() TO service_role;

-- Comment on functions
COMMENT ON FUNCTION calculate_priority_score IS 'Calculates weighted priority score for queue items based on value, urgency, fit, and age';
COMMENT ON FUNCTION create_queue_item_from_signal IS 'Creates a priority queue item from a detected buying signal';
COMMENT ON FUNCTION create_follow_up_queue_items IS 'Generates follow-up queue items for leads that haven not been contacted recently';
COMMENT ON FUNCTION run_daily_queue_generation IS 'Daily scheduled job to generate queue items and clean up old data';
