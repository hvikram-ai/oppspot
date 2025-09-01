-- Helper functions for the Opp Scan workflow

-- Function to increment scan target counts
CREATE OR REPLACE FUNCTION increment_scan_targets(scan_id UUID, increment INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
    UPDATE acquisition_scans 
    SET 
        targets_identified = COALESCE(targets_identified, 0) + increment,
        updated_at = NOW()
    WHERE id = scan_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment analyzed targets count
CREATE OR REPLACE FUNCTION increment_analyzed_targets(scan_id UUID, increment INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
    UPDATE acquisition_scans 
    SET 
        targets_analyzed = COALESCE(targets_analyzed, 0) + increment,
        updated_at = NOW()
    WHERE id = scan_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update scan progress
CREATE OR REPLACE FUNCTION update_scan_progress(scan_id UUID, new_progress INTEGER, new_step TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    UPDATE acquisition_scans 
    SET 
        progress_percentage = new_progress,
        current_step = COALESCE(new_step, current_step),
        updated_at = NOW(),
        -- Auto-complete scan when progress reaches 100%
        status = CASE 
            WHEN new_progress >= 100 AND status IN ('scanning', 'analyzing') THEN 'completed'
            WHEN new_progress >= 100 AND status = 'completed' THEN 'completed'
            ELSE status
        END,
        completed_at = CASE 
            WHEN new_progress >= 100 AND completed_at IS NULL THEN NOW()
            ELSE completed_at
        END
    WHERE id = scan_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate and update target company overall score
CREATE OR REPLACE FUNCTION update_target_score(target_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    financial_score DECIMAL := 0.0;
    strategic_score DECIMAL := 0.0;
    risk_score DECIMAL := 0.0;
    overall_score DECIMAL := 0.0;
    target_record RECORD;
BEGIN
    -- Get target company record
    SELECT * INTO target_record FROM target_companies WHERE id = target_id;
    
    IF NOT FOUND THEN
        RETURN 0.0;
    END IF;
    
    -- Get financial health score
    SELECT COALESCE(
        CASE 
            WHEN revenue > 0 AND ebitda > 0 THEN 
                LEAST(100, GREATEST(0, (
                    (COALESCE(revenue_growth_3y, 0) * 25) + 
                    (COALESCE(ebitda_margin, 0) * 50) + 
                    (CASE WHEN COALESCE(altman_z_score, 0) > 2.99 THEN 25 ELSE COALESCE(altman_z_score, 0) * 8.33 END)
                )))
            ELSE 50.0
        END, 50.0
    ) INTO financial_score
    FROM financial_analysis 
    WHERE target_company_id = target_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Use strategic fit score from target record
    strategic_score := COALESCE(target_record.strategic_fit_score, 0.5) * 100;
    
    -- Get inverse risk score (lower risk = higher score)
    SELECT COALESCE((1.0 - COALESCE(overall_risk_score, 0.5)) * 100, 50.0) INTO risk_score
    FROM risk_assessments 
    WHERE target_company_id = target_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Calculate weighted overall score
    overall_score := (financial_score * 0.4) + (strategic_score * 0.35) + (risk_score * 0.25);
    
    -- Ensure score is between 0 and 100
    overall_score := GREATEST(0, LEAST(100, overall_score));
    
    -- Update target company record
    UPDATE target_companies 
    SET 
        overall_score = overall_score,
        financial_health_score = financial_score / 100.0,
        risk_score = (100 - risk_score) / 100.0,
        updated_at = NOW()
    WHERE id = target_id;
    
    RETURN overall_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically update target score when financial or risk data changes
CREATE OR REPLACE FUNCTION trigger_update_target_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the target score whenever financial analysis or risk assessment is updated
    PERFORM update_target_score(
        CASE 
            WHEN TG_TABLE_NAME = 'financial_analysis' THEN NEW.target_company_id
            WHEN TG_TABLE_NAME = 'risk_assessments' THEN NEW.target_company_id
            ELSE NULL
        END
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_score_on_financial_analysis ON financial_analysis;
CREATE TRIGGER update_score_on_financial_analysis
    AFTER INSERT OR UPDATE ON financial_analysis
    FOR EACH ROW EXECUTE FUNCTION trigger_update_target_score();

DROP TRIGGER IF EXISTS update_score_on_risk_assessment ON risk_assessments;
CREATE TRIGGER update_score_on_risk_assessment
    AFTER INSERT OR UPDATE ON risk_assessments
    FOR EACH ROW EXECUTE FUNCTION trigger_update_target_score();

-- Function to get scan statistics
CREATE OR REPLACE FUNCTION get_scan_statistics(scan_id UUID)
RETURNS JSON AS $$
DECLARE
    stats JSON;
BEGIN
    WITH scan_stats AS (
        SELECT 
            s.id,
            s.name,
            s.status,
            s.progress_percentage,
            s.targets_identified,
            s.targets_analyzed,
            s.created_at,
            s.started_at,
            s.completed_at,
            -- Target status counts
            COUNT(CASE WHEN t.analysis_status = 'pending' THEN 1 END) as pending_count,
            COUNT(CASE WHEN t.analysis_status = 'analyzing' THEN 1 END) as analyzing_count,
            COUNT(CASE WHEN t.analysis_status = 'completed' THEN 1 END) as completed_count,
            COUNT(CASE WHEN t.analysis_status = 'shortlisted' THEN 1 END) as shortlisted_count,
            COUNT(CASE WHEN t.analysis_status = 'excluded' THEN 1 END) as excluded_count,
            -- Score statistics
            AVG(t.overall_score) as avg_score,
            MIN(t.overall_score) as min_score,
            MAX(t.overall_score) as max_score,
            COUNT(CASE WHEN t.overall_score >= 80 THEN 1 END) as high_score_count,
            COUNT(CASE WHEN t.overall_score >= 60 AND t.overall_score < 80 THEN 1 END) as medium_score_count,
            COUNT(CASE WHEN t.overall_score < 60 THEN 1 END) as low_score_count,
            -- Risk statistics
            COUNT(CASE WHEN ra.risk_category = 'low' THEN 1 END) as low_risk_count,
            COUNT(CASE WHEN ra.risk_category = 'moderate' THEN 1 END) as moderate_risk_count,
            COUNT(CASE WHEN ra.risk_category = 'high' THEN 1 END) as high_risk_count,
            COUNT(CASE WHEN ra.risk_category = 'critical' THEN 1 END) as critical_risk_count
        FROM acquisition_scans s
        LEFT JOIN target_companies t ON s.id = t.scan_id
        LEFT JOIN risk_assessments ra ON t.id = ra.target_company_id
        WHERE s.id = scan_id
        GROUP BY s.id, s.name, s.status, s.progress_percentage, s.targets_identified, 
                 s.targets_analyzed, s.created_at, s.started_at, s.completed_at
    )
    SELECT row_to_json(scan_stats.*) INTO stats FROM scan_stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Function to get industry analysis for a scan
CREATE OR REPLACE FUNCTION get_scan_industry_analysis(scan_id UUID)
RETURNS JSON AS $$
DECLARE
    industry_data JSON;
BEGIN
    WITH industry_stats AS (
        SELECT 
            unnest(t.industry_codes) as industry_code,
            COUNT(*) as company_count,
            AVG(t.overall_score) as avg_score,
            COUNT(CASE WHEN t.analysis_status = 'shortlisted' THEN 1 END) as shortlisted_count,
            AVG(fa.revenue) as avg_revenue,
            AVG(fa.ebitda_margin) as avg_ebitda_margin
        FROM target_companies t
        LEFT JOIN financial_analysis fa ON t.id = fa.target_company_id
        WHERE t.scan_id = scan_id AND array_length(t.industry_codes, 1) > 0
        GROUP BY unnest(t.industry_codes)
        ORDER BY company_count DESC
    )
    SELECT json_agg(industry_stats.*) INTO industry_data FROM industry_stats;
    
    RETURN industry_data;
END;
$$ LANGUAGE plpgsql;

-- Function to get regional analysis for a scan
CREATE OR REPLACE FUNCTION get_scan_regional_analysis(scan_id UUID)
RETURNS JSON AS $$
DECLARE
    regional_data JSON;
BEGIN
    WITH regional_stats AS (
        SELECT 
            t.registered_address->>'country' as country,
            t.registered_address->>'city' as city,
            COUNT(*) as company_count,
            AVG(t.overall_score) as avg_score,
            COUNT(CASE WHEN t.analysis_status = 'shortlisted' THEN 1 END) as shortlisted_count,
            COUNT(CASE WHEN ra.risk_category IN ('high', 'critical') THEN 1 END) as high_risk_count
        FROM target_companies t
        LEFT JOIN risk_assessments ra ON t.id = ra.target_company_id
        WHERE t.scan_id = scan_id 
        AND t.registered_address IS NOT NULL
        GROUP BY t.registered_address->>'country', t.registered_address->>'city'
        ORDER BY company_count DESC
    )
    SELECT json_agg(regional_stats.*) INTO regional_data FROM regional_stats;
    
    RETURN regional_data;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired data (for GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_expired_scan_data()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Delete scan audit logs older than their retention period
    DELETE FROM scan_audit_log 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_period;
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    -- Delete completed scans older than 2 years (configurable)
    DELETE FROM acquisition_scans 
    WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '2 years';
    
    -- Delete failed scans older than 6 months
    DELETE FROM acquisition_scans 
    WHERE status = 'failed' 
    AND updated_at < NOW() - INTERVAL '6 months';
    
    -- Delete expired reports
    DELETE FROM scan_reports 
    WHERE expires_at < NOW();
    
    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_scan_targets(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_analyzed_targets(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_scan_progress(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_target_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_scan_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_scan_industry_analysis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_scan_regional_analysis(UUID) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_target_companies_scan_id_score ON target_companies(scan_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_financial_analysis_target_created ON financial_analysis(target_company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_target_created ON risk_assessments(target_company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_audit_log_retention ON scan_audit_log(created_at, retention_period);
CREATE INDEX IF NOT EXISTS idx_scan_reports_expires ON scan_reports(expires_at);

COMMENT ON FUNCTION increment_scan_targets IS 'Increments the targets_identified counter for a scan';
COMMENT ON FUNCTION increment_analyzed_targets IS 'Increments the targets_analyzed counter for a scan';
COMMENT ON FUNCTION update_scan_progress IS 'Updates scan progress and automatically completes when 100%';
COMMENT ON FUNCTION update_target_score IS 'Calculates and updates the overall score for a target company';
COMMENT ON FUNCTION get_scan_statistics IS 'Returns comprehensive statistics for a scan';
COMMENT ON FUNCTION cleanup_expired_scan_data IS 'GDPR compliance function to remove expired data';