-- Cost Management Tables for Real Data Integration
-- Database Schema for API cost tracking and budget management

-- ==========================================
-- COST BUDGETS
-- ==========================================

-- Budget management for controlling API costs
CREATE TABLE cost_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES acquisition_scans(id) ON DELETE CASCADE,
    
    -- Budget configuration
    budget_type TEXT NOT NULL CHECK (budget_type IN ('user', 'organization', 'scan')),
    total_budget DECIMAL(10,2) NOT NULL CHECK (total_budget > 0),
    remaining_budget DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'GBP' CHECK (currency IN ('GBP', 'EUR', 'USD')),
    
    -- Budget period
    period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one_time')),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    auto_renewal BOOLEAN DEFAULT FALSE,
    
    -- Alert configuration
    budget_alerts JSONB NOT NULL DEFAULT '{
        "warning_threshold": 75,
        "critical_threshold": 90,
        "email_notifications": true
    }'::jsonb,
    
    -- Status tracking
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_budget_period CHECK (period_end > period_start),
    CONSTRAINT valid_remaining_budget CHECK (remaining_budget >= 0 AND remaining_budget <= total_budget)
);

-- Indexes for performance
CREATE INDEX idx_cost_budgets_user_id ON cost_budgets(user_id);
CREATE INDEX idx_cost_budgets_org_id ON cost_budgets(org_id);
CREATE INDEX idx_cost_budgets_scan_id ON cost_budgets(scan_id);
CREATE INDEX idx_cost_budgets_period ON cost_budgets(period_start, period_end);
CREATE INDEX idx_cost_budgets_active ON cost_budgets(is_active) WHERE is_active = true;

-- ==========================================
-- COST TRANSACTIONS
-- ==========================================

-- Individual cost transactions for API calls
CREATE TABLE cost_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    scan_id UUID REFERENCES acquisition_scans(id) ON DELETE SET NULL,
    
    -- Transaction details
    data_source TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'api_call',
        'data_enrichment', 
        'analysis',
        'report_generation'
    )),
    
    -- Cost information
    cost_amount DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    currency TEXT NOT NULL DEFAULT 'GBP' CHECK (currency IN ('GBP', 'EUR', 'USD')),
    request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count > 0),
    data_volume DECIMAL(10,2), -- MB processed
    
    -- Transaction metadata
    transaction_metadata JSONB NOT NULL DEFAULT '{}',
    
    -- Performance tracking
    processing_time INTEGER, -- milliseconds
    response_size INTEGER, -- bytes
    
    -- Status
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and analytics
CREATE INDEX idx_cost_transactions_user_id ON cost_transactions(user_id);
CREATE INDEX idx_cost_transactions_scan_id ON cost_transactions(scan_id);
CREATE INDEX idx_cost_transactions_data_source ON cost_transactions(data_source);
CREATE INDEX idx_cost_transactions_created_at ON cost_transactions(created_at);
CREATE INDEX idx_cost_transactions_cost_amount ON cost_transactions(cost_amount);
CREATE INDEX idx_cost_transactions_success ON cost_transactions(success);

-- Composite index for cost analysis queries
CREATE INDEX idx_cost_transactions_analytics ON cost_transactions(user_id, created_at, success, cost_amount);

-- ==========================================
-- DATA SOURCE USAGE TRACKING
-- ==========================================

-- Track usage patterns for each data source
CREATE TABLE data_source_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Data source information
    data_source_id TEXT NOT NULL,
    data_source_name TEXT NOT NULL,
    
    -- Usage statistics (daily aggregation)
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    average_response_time INTEGER, -- milliseconds
    data_volume_processed DECIMAL(10,2), -- MB
    
    -- Rate limiting information
    rate_limit_hits INTEGER DEFAULT 0,
    rate_limit_resets INTEGER DEFAULT 0,
    
    -- Performance metrics
    fastest_response INTEGER, -- milliseconds
    slowest_response INTEGER, -- milliseconds
    
    -- Quality metrics
    average_confidence_score DECIMAL(3,2),
    data_quality_issues INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for daily usage per user/source
    UNIQUE(user_id, data_source_id, usage_date)
);

-- Indexes for analytics
CREATE INDEX idx_data_source_usage_user_date ON data_source_usage(user_id, usage_date);
CREATE INDEX idx_data_source_usage_source ON data_source_usage(data_source_id);
CREATE INDEX idx_data_source_usage_cost ON data_source_usage(total_cost);

-- ==========================================
-- API KEY MANAGEMENT
-- ==========================================

-- Secure storage and management of API keys
CREATE TABLE api_key_management (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- API key information
    data_source_id TEXT NOT NULL,
    key_name TEXT NOT NULL,
    encrypted_api_key TEXT NOT NULL, -- Encrypted storage
    key_status TEXT NOT NULL DEFAULT 'active' CHECK (key_status IN ('active', 'inactive', 'expired', 'revoked')),
    
    -- Usage limits
    daily_request_limit INTEGER,
    monthly_request_limit INTEGER,
    cost_per_request DECIMAL(10,4),
    
    -- Key metadata
    key_permissions JSONB DEFAULT '{}',
    key_restrictions JSONB DEFAULT '{}',
    
    -- Monitoring
    last_used_at TIMESTAMPTZ,
    total_requests INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    
    -- Expiration
    expires_at TIMESTAMPTZ,
    auto_renewal BOOLEAN DEFAULT FALSE,
    
    -- Security
    created_by UUID REFERENCES profiles(id),
    last_rotated_at TIMESTAMPTZ,
    rotation_frequency INTEGER, -- days
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_key_management_user_id ON api_key_management(user_id);
CREATE INDEX idx_api_key_management_org_id ON api_key_management(org_id);
CREATE INDEX idx_api_key_management_source ON api_key_management(data_source_id);
CREATE INDEX idx_api_key_management_status ON api_key_management(key_status);

-- ==========================================
-- COST OPTIMIZATION RECOMMENDATIONS
-- ==========================================

-- AI-generated cost optimization recommendations
CREATE TABLE cost_optimization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    
    -- Recommendation details
    recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
        'data_source_optimization',
        'scan_frequency_adjustment',
        'scan_depth_modification',
        'budget_reallocation',
        'rate_limit_optimization',
        'error_reduction'
    )),
    
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    
    -- Impact analysis
    potential_savings DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    implementation_effort TEXT CHECK (implementation_effort IN ('easy', 'moderate', 'complex')),
    estimated_roi DECIMAL(5,2), -- Return on investment percentage
    
    -- Implementation guidance
    action_items JSONB DEFAULT '[]',
    implementation_steps TEXT,
    estimated_implementation_time INTEGER, -- hours
    
    -- Tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
    implemented_at TIMESTAMPTZ,
    actual_savings DECIMAL(10,2),
    
    -- Analysis metadata
    analysis_period_start TIMESTAMPTZ NOT NULL,
    analysis_period_end TIMESTAMPTZ NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.8,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cost_optimization_user_id ON cost_optimization_recommendations(user_id);
CREATE INDEX idx_cost_optimization_priority ON cost_optimization_recommendations(priority);
CREATE INDEX idx_cost_optimization_status ON cost_optimization_recommendations(status);
CREATE INDEX idx_cost_optimization_savings ON cost_optimization_recommendations(potential_savings);

-- ==========================================
-- FUNCTIONS AND TRIGGERS
-- ==========================================

-- Function to automatically update budget after transaction
CREATE OR REPLACE FUNCTION update_budget_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update budget for successful transactions
    IF NEW.success = true THEN
        -- Update user budgets
        UPDATE cost_budgets 
        SET 
            remaining_budget = GREATEST(0, remaining_budget - NEW.cost_amount),
            updated_at = NOW()
        WHERE 
            user_id = NEW.user_id 
            AND is_active = true
            AND period_start <= NEW.created_at 
            AND period_end >= NEW.created_at
            AND (
                (budget_type = 'user') OR
                (budget_type = 'scan' AND scan_id = NEW.scan_id) OR
                (budget_type = 'organization' AND org_id = NEW.org_id)
            );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update budgets after cost transactions
CREATE TRIGGER trigger_update_budget_after_transaction
    AFTER INSERT ON cost_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_after_transaction();

-- Function to update data source usage statistics
CREATE OR REPLACE FUNCTION update_data_source_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Upsert daily usage statistics
    INSERT INTO data_source_usage (
        user_id, 
        org_id, 
        data_source_id, 
        data_source_name,
        usage_date,
        total_requests,
        successful_requests,
        failed_requests,
        total_cost,
        average_response_time,
        data_volume_processed
    ) VALUES (
        NEW.user_id,
        NEW.org_id,
        NEW.data_source,
        NEW.data_source, -- Use same as ID for now
        CURRENT_DATE,
        NEW.request_count,
        CASE WHEN NEW.success THEN NEW.request_count ELSE 0 END,
        CASE WHEN NEW.success THEN 0 ELSE NEW.request_count END,
        NEW.cost_amount,
        NEW.processing_time,
        NEW.data_volume
    )
    ON CONFLICT (user_id, data_source_id, usage_date) 
    DO UPDATE SET
        total_requests = data_source_usage.total_requests + NEW.request_count,
        successful_requests = data_source_usage.successful_requests + 
            CASE WHEN NEW.success THEN NEW.request_count ELSE 0 END,
        failed_requests = data_source_usage.failed_requests + 
            CASE WHEN NEW.success THEN 0 ELSE NEW.request_count END,
        total_cost = data_source_usage.total_cost + NEW.cost_amount,
        average_response_time = (
            COALESCE(data_source_usage.average_response_time, 0) + 
            COALESCE(NEW.processing_time, 0)
        ) / 2,
        data_volume_processed = COALESCE(data_source_usage.data_volume_processed, 0) + 
            COALESCE(NEW.data_volume, 0),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update usage statistics
CREATE TRIGGER trigger_update_data_source_usage_stats
    AFTER INSERT ON cost_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_data_source_usage_stats();

-- Function to check budget alerts
CREATE OR REPLACE FUNCTION check_budget_alerts()
RETURNS TRIGGER AS $$
DECLARE
    budget_record RECORD;
    utilization DECIMAL;
BEGIN
    -- Check all active budgets for this user
    FOR budget_record IN 
        SELECT * FROM cost_budgets 
        WHERE user_id = NEW.user_id 
        AND is_active = true
        AND period_start <= NOW() 
        AND period_end >= NOW()
    LOOP
        -- Calculate utilization percentage
        utilization := ((budget_record.total_budget - budget_record.remaining_budget) / budget_record.total_budget) * 100;
        
        -- Check for alert thresholds
        IF utilization >= (budget_record.budget_alerts->>'critical_threshold')::numeric THEN
            -- Insert critical alert (would trigger notification in real app)
            INSERT INTO scan_audit_log (
                user_id,
                action_type,
                action_description,
                after_state,
                legal_basis,
                retention_period
            ) VALUES (
                NEW.user_id,
                'budget_critical_alert',
                format('CRITICAL: Budget utilization at %.1f%% (Budget ID: %s)', utilization, budget_record.id),
                jsonb_build_object(
                    'budget_id', budget_record.id,
                    'utilization', utilization,
                    'remaining_budget', budget_record.remaining_budget
                ),
                'legitimate_interest',
                90
            );
        ELSIF utilization >= (budget_record.budget_alerts->>'warning_threshold')::numeric THEN
            -- Insert warning alert
            INSERT INTO scan_audit_log (
                user_id,
                action_type,
                action_description,
                after_state,
                legal_basis,
                retention_period
            ) VALUES (
                NEW.user_id,
                'budget_warning_alert',
                format('WARNING: Budget utilization at %.1f%% (Budget ID: %s)', utilization, budget_record.id),
                jsonb_build_object(
                    'budget_id', budget_record.id,
                    'utilization', utilization,
                    'remaining_budget', budget_record.remaining_budget
                ),
                'legitimate_interest',
                90
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check budget alerts after budget updates
CREATE TRIGGER trigger_check_budget_alerts
    AFTER UPDATE OF remaining_budget ON cost_budgets
    FOR EACH ROW
    EXECUTE FUNCTION check_budget_alerts();

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE cost_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_source_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_optimization_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies for cost_budgets
CREATE POLICY "Users can manage their own budgets" ON cost_budgets
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Organization members can view org budgets" ON cost_budgets
    FOR SELECT USING (
        org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policies for cost_transactions
CREATE POLICY "Users can view their own transactions" ON cost_transactions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert transactions" ON cost_transactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policies for data_source_usage
CREATE POLICY "Users can view their own usage" ON data_source_usage
    FOR SELECT USING (user_id = auth.uid());

-- Policies for api_key_management
CREATE POLICY "Users can manage their own API keys" ON api_key_management
    FOR ALL USING (user_id = auth.uid());

-- Policies for cost_optimization_recommendations
CREATE POLICY "Users can view their own recommendations" ON cost_optimization_recommendations
    FOR ALL USING (user_id = auth.uid());

-- ==========================================
-- INITIAL DATA AND CONFIGURATION
-- ==========================================

-- Insert default budget alerts configuration
INSERT INTO cost_budgets (
    user_id, 
    budget_type, 
    total_budget, 
    remaining_budget, 
    currency, 
    period, 
    period_start, 
    period_end,
    budget_alerts
) 
SELECT 
    id,
    'user',
    100.00, -- £100 default budget
    100.00,
    'GBP',
    'monthly',
    date_trunc('month', NOW()),
    date_trunc('month', NOW()) + interval '1 month' - interval '1 day',
    jsonb_build_object(
        'warning_threshold', 75,
        'critical_threshold', 90,
        'email_notifications', true
    )
FROM profiles 
WHERE subscription_tier = 'premium'
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE cost_budgets IS 'Budget management and limits for API cost control';
COMMENT ON TABLE cost_transactions IS 'Individual cost transactions for all API calls and data processing';
COMMENT ON TABLE data_source_usage IS 'Daily aggregated usage statistics for each data source';
COMMENT ON TABLE api_key_management IS 'Secure storage and management of external API keys';
COMMENT ON TABLE cost_optimization_recommendations IS 'AI-generated recommendations for cost optimization';