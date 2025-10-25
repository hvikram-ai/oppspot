-- Collaboration Auto-Notification Triggers
-- Created: 2025-10-12
-- Purpose: Automatically broadcast team activities and notifications

-- ============================================================================
-- Trigger: Research Completion Notification
-- ============================================================================

-- Function to broadcast research completion
CREATE OR REPLACE FUNCTION notify_research_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_company_name TEXT;
  v_org_id UUID;
  v_user_name TEXT;
BEGIN
  -- Get company name
  SELECT name INTO v_company_name
  FROM businesses
  WHERE id = NEW.company_id;

  -- Get user's org_id and name
  SELECT org_id, name INTO v_org_id, v_user_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Only proceed if user is in an organization
  IF v_org_id IS NOT NULL THEN
    -- Create team activity
    INSERT INTO team_activities (
      org_id,
      user_id,
      activity_type,
      entity_type,
      entity_id,
      entity_name,
      metadata
    ) VALUES (
      v_org_id,
      NEW.user_id,
      'research_generated',
      'company',
      NEW.company_id,
      COALESCE(v_company_name, 'Unknown Company'),
      jsonb_build_object(
        'report_id', NEW.id,
        'report_type', NEW.report_type
      )
    );

    -- Create notifications for all org members (except the creator)
    INSERT INTO notifications (
      user_id,
      type,
      title,
      body,
      priority,
      action_url,
      data
    )
    SELECT
      p.id,
      'research_complete',
      'New research available for ' || COALESCE(v_company_name, 'a company'),
      v_user_name || ' generated research report',
      'medium',
      '/business/' || NEW.company_id::text || '?tab=research&report=' || NEW.id::text,
      jsonb_build_object(
        'company_id', NEW.company_id,
        'company_name', v_company_name,
        'report_id', NEW.id,
        'user_name', v_user_name
      )
    FROM profiles p
    WHERE p.org_id = v_org_id
      AND p.id != NEW.user_id;  -- Don't notify the creator

    RAISE NOTICE 'Research completion notification sent for company % to org %', v_company_name, v_org_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on research_cache table
DROP TRIGGER IF EXISTS research_completion_notify ON research_cache;
CREATE TRIGGER research_completion_notify
  AFTER INSERT ON research_cache
  FOR EACH ROW
  EXECUTE FUNCTION notify_research_completion();

-- ============================================================================
-- Trigger: Buying Signal Detection
-- ============================================================================

-- Function to broadcast buying signal detection
CREATE OR REPLACE FUNCTION notify_buying_signal()
RETURNS TRIGGER AS $$
DECLARE
  v_company_name TEXT;
  v_org_id UUID;
  v_user_name TEXT;
  v_signal_priority TEXT;
BEGIN
  -- Get company name
  SELECT name INTO v_company_name
  FROM businesses
  WHERE id = NEW.company_id;

  -- Get user's org_id and name (if user_id is set)
  IF NEW.user_id IS NOT NULL THEN
    SELECT org_id, name INTO v_org_id, v_user_name
    FROM profiles
    WHERE id = NEW.user_id;
  END IF;

  -- Determine signal priority based on confidence and status
  IF NEW.confidence >= 0.8 AND NEW.status = 'active' THEN
    v_signal_priority := 'urgent';
  ELSIF NEW.confidence >= 0.6 AND NEW.status = 'active' THEN
    v_signal_priority := 'high';
  ELSE
    v_signal_priority := 'medium';
  END IF;

  -- Only proceed if we have an org_id
  IF v_org_id IS NOT NULL THEN
    -- Create team activity
    INSERT INTO team_activities (
      org_id,
      user_id,
      activity_type,
      entity_type,
      entity_id,
      entity_name,
      metadata
    ) VALUES (
      v_org_id,
      NEW.user_id,
      'signal_detected',
      'company',
      NEW.company_id,
      COALESCE(v_company_name, 'Unknown Company'),
      jsonb_build_object(
        'signal_id', NEW.id,
        'signal_type', NEW.signal_type,
        'confidence', NEW.confidence,
        'description', NEW.description
      )
    );

    -- Create notifications for all org members (high priority signals only)
    IF v_signal_priority IN ('high', 'urgent') THEN
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        priority,
        action_url,
        data
      )
      SELECT
        p.id,
        'signal_detected',
        '🔥 Buying signal detected: ' || COALESCE(v_company_name, 'Unknown Company'),
        COALESCE(NEW.description, 'New buying signal detected'),
        v_signal_priority,
        '/business/' || NEW.company_id::text,
        jsonb_build_object(
          'company_id', NEW.company_id,
          'company_name', v_company_name,
          'signal_id', NEW.id,
          'signal_type', NEW.signal_type,
          'confidence', NEW.confidence
        )
      FROM profiles p
      WHERE p.org_id = v_org_id
        AND (NEW.user_id IS NULL OR p.id != NEW.user_id);  -- Don't notify creator if set

      RAISE NOTICE 'Buying signal notification sent for company % to org %', v_company_name, v_org_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on buying_signals table
DROP TRIGGER IF EXISTS buying_signal_notify ON buying_signals;
CREATE TRIGGER buying_signal_notify
  AFTER INSERT ON buying_signals
  FOR EACH ROW
  WHEN (NEW.status = 'active')  -- Only notify for active signals
  EXECUTE FUNCTION notify_buying_signal();

-- ============================================================================
-- Trigger: High-Value Lead Detection
-- ============================================================================

-- Function to notify about high-value leads (lead score > 80)
CREATE OR REPLACE FUNCTION notify_hot_lead()
RETURNS TRIGGER AS $$
DECLARE
  v_company_name TEXT;
  v_org_id UUID;
BEGIN
  -- Only trigger for high scores
  IF NEW.overall_score IS NOT NULL AND NEW.overall_score >= 80 THEN
    -- Get company name
    SELECT name INTO v_company_name
    FROM businesses
    WHERE id = NEW.company_id;

    -- Get company's org_id (assuming businesses are org-scoped or we track who's interested)
    -- For now, we'll broadcast to all orgs that have this company saved
    FOR v_org_id IN
      SELECT DISTINCT p.org_id
      FROM saved_businesses sb
      JOIN profiles p ON p.id = sb.user_id
      WHERE sb.business_id = NEW.company_id
        AND p.org_id IS NOT NULL
    LOOP
      -- Create notifications for org members
      INSERT INTO notifications (
        user_id,
        type,
        title,
        body,
        priority,
        action_url,
        data
      )
      SELECT
        p.id,
        'hot_lead',
        '⭐ High-value lead discovered',
        COALESCE(v_company_name, 'A company') || ' scored ' || NEW.overall_score || '/100',
        'urgent',
        '/business/' || NEW.company_id::text,
        jsonb_build_object(
          'company_id', NEW.company_id,
          'company_name', v_company_name,
          'score', NEW.overall_score,
          'score_id', NEW.id
        )
      FROM profiles p
      WHERE p.org_id = v_org_id;

      RAISE NOTICE 'Hot lead notification sent for company % (score: %) to org %',
        v_company_name, NEW.overall_score, v_org_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on lead_scores table
DROP TRIGGER IF EXISTS hot_lead_notify ON lead_scores;
CREATE TRIGGER hot_lead_notify
  AFTER INSERT OR UPDATE OF overall_score ON lead_scores
  FOR EACH ROW
  EXECUTE FUNCTION notify_hot_lead();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION notify_research_completion() IS 'Automatically notifies team when research is generated';
COMMENT ON FUNCTION notify_buying_signal() IS 'Automatically notifies team when buying signals are detected';
COMMENT ON FUNCTION notify_hot_lead() IS 'Automatically notifies team when high-value leads are scored';

COMMENT ON TRIGGER research_completion_notify ON research_cache IS 'Triggers team notifications when research completes';
COMMENT ON TRIGGER buying_signal_notify ON buying_signals IS 'Triggers team notifications when buying signals are detected';
COMMENT ON TRIGGER hot_lead_notify ON lead_scores IS 'Triggers team notifications for high-scoring leads';
