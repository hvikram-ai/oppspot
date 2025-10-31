/**
 * LLM Management System Database Schema
 *
 * Creates tables for enterprise LLM provider management:
 * - llm_configurations: User provider configs with encrypted API keys
 * - llm_usage: Usage tracking per request (tokens, cost, latency)
 * - llm_model_cache: Cache available models per provider
 * - llm_fallback_rules: Custom fallback chains
 * - llm_usage_alerts: Usage threshold alerts
 * - llm_key_rotations: Key rotation audit trail
 */

-- =====================================================
-- 1. LLM Configurations Table
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,

    -- Provider info
    provider_type TEXT NOT NULL CHECK (provider_type IN ('local', 'openrouter', 'openai', 'anthropic', 'managed', 'custom')),
    name TEXT NOT NULL,

    -- Encrypted configuration (contains API keys, endpoints, etc.)
    encrypted_config TEXT NOT NULL,

    -- Status and priority
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 2 CHECK (priority >= 1 AND priority <= 10),

    -- Limits and constraints
    monthly_token_limit BIGINT,
    monthly_cost_limit DECIMAL(10, 2),
    rate_limit_rpm INTEGER DEFAULT 60,

    -- Timestamps and tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    last_tested_at TIMESTAMPTZ,
    last_error TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_llm_configurations_user_id ON llm_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_configurations_provider_type ON llm_configurations(provider_type);
CREATE INDEX IF NOT EXISTS idx_llm_configurations_is_active ON llm_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_llm_configurations_priority ON llm_configurations(priority);

-- Partial unique index: ensure only one primary configuration per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_configurations_primary_per_user
    ON llm_configurations(user_id)
    WHERE is_primary = true;

-- RLS Policies
ALTER TABLE llm_configurations ENABLE ROW LEVEL SECURITY;

-- Users can view their own configurations
CREATE POLICY "Users can view own llm_configurations"
    ON llm_configurations FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own configurations
CREATE POLICY "Users can insert own llm_configurations"
    ON llm_configurations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own configurations
CREATE POLICY "Users can update own llm_configurations"
    ON llm_configurations FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own configurations
CREATE POLICY "Users can delete own llm_configurations"
    ON llm_configurations FOR DELETE
    USING (auth.uid() = user_id);

-- =====================================================
-- 2. LLM Usage Tracking Table
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    config_id UUID REFERENCES llm_configurations(id) ON DELETE SET NULL,

    -- Request info
    feature TEXT NOT NULL, -- e.g., 'research-gpt', 'data-room', 'chat'
    model TEXT NOT NULL,

    -- Token usage
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,

    -- Cost tracking (in USD)
    input_cost DECIMAL(10, 6) DEFAULT 0,
    output_cost DECIMAL(10, 6) DEFAULT 0,
    total_cost DECIMAL(10, 6) DEFAULT 0,

    -- Performance
    latency_ms INTEGER,

    -- Status
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'rate_limited')),
    error_message TEXT,

    -- Samples for debugging (first 500 chars)
    request_sample TEXT,
    response_sample TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_id ON llm_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_config_id ON llm_usage(config_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_feature ON llm_usage(feature);
CREATE INDEX IF NOT EXISTS idx_llm_usage_model ON llm_usage(model);
CREATE INDEX IF NOT EXISTS idx_llm_usage_status ON llm_usage(status);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created_at ON llm_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_created ON llm_usage(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own llm_usage"
    ON llm_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own usage (system does this)
CREATE POLICY "Users can insert own llm_usage"
    ON llm_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 3. LLM Model Cache Table
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_model_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES llm_configurations(id) ON DELETE CASCADE,

    -- Model info
    model_id TEXT NOT NULL,
    model_name TEXT NOT NULL,

    -- Capabilities
    capabilities JSONB DEFAULT '{}'::jsonb,

    -- Pricing (per 1k tokens)
    pricing_input DECIMAL(10, 6),
    pricing_output DECIMAL(10, 6),

    -- Context
    context_length INTEGER,

    -- Status
    is_available BOOLEAN DEFAULT true,

    -- Cache management
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one model per config
    UNIQUE(config_id, model_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_llm_model_cache_config_id ON llm_model_cache(config_id);
CREATE INDEX IF NOT EXISTS idx_llm_model_cache_model_id ON llm_model_cache(model_id);
CREATE INDEX IF NOT EXISTS idx_llm_model_cache_is_available ON llm_model_cache(is_available);
CREATE INDEX IF NOT EXISTS idx_llm_model_cache_last_synced ON llm_model_cache(last_synced);

-- RLS Policies
ALTER TABLE llm_model_cache ENABLE ROW LEVEL SECURITY;

-- Users can view models for their configs
CREATE POLICY "Users can view llm_model_cache for own configs"
    ON llm_model_cache FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM llm_configurations
            WHERE llm_configurations.id = llm_model_cache.config_id
            AND llm_configurations.user_id = auth.uid()
        )
    );

-- System can insert/update model cache
CREATE POLICY "Users can manage llm_model_cache for own configs"
    ON llm_model_cache FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM llm_configurations
            WHERE llm_configurations.id = llm_model_cache.config_id
            AND llm_configurations.user_id = auth.uid()
        )
    );

-- =====================================================
-- 4. LLM Fallback Rules Table
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_fallback_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Rule info
    name TEXT NOT NULL,

    -- Fallback chain (array of config IDs in order)
    fallback_chain JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Conditions
    enable_on_error BOOLEAN DEFAULT true,
    enable_on_timeout BOOLEAN DEFAULT true,
    enable_on_rate_limit BOOLEAN DEFAULT true,
    enable_on_quota BOOLEAN DEFAULT true,

    -- Retry settings
    max_retries INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 1000,
    timeout_ms INTEGER DEFAULT 120000,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_llm_fallback_rules_user_id ON llm_fallback_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_fallback_rules_is_active ON llm_fallback_rules(is_active);

-- RLS Policies
ALTER TABLE llm_fallback_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own llm_fallback_rules"
    ON llm_fallback_rules FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- 5. LLM Usage Alerts Table
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_usage_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Alert type and threshold
    alert_type TEXT NOT NULL CHECK (alert_type IN ('daily_tokens', 'daily_cost', 'hourly_requests', 'monthly_cost')),
    threshold_value DECIMAL(10, 2) NOT NULL,
    threshold_unit TEXT NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Notification channels
    notification_channels JSONB DEFAULT '{}'::jsonb,

    -- Tracking
    last_triggered TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_llm_usage_alerts_user_id ON llm_usage_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_alerts_alert_type ON llm_usage_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_llm_usage_alerts_is_active ON llm_usage_alerts(is_active);

-- RLS Policies
ALTER TABLE llm_usage_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own llm_usage_alerts"
    ON llm_usage_alerts FOR ALL
    USING (auth.uid() = user_id);

-- =====================================================
-- 6. LLM Key Rotations Table (Audit Trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS llm_key_rotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    config_id UUID REFERENCES llm_configurations(id) ON DELETE SET NULL,

    -- Key hashes (not actual keys!)
    old_key_hash TEXT,
    new_key_hash TEXT NOT NULL,

    -- Rotation info
    rotation_reason TEXT NOT NULL,
    rotated_by TEXT NOT NULL,

    -- Timestamp
    rotated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_llm_key_rotations_user_id ON llm_key_rotations(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_key_rotations_config_id ON llm_key_rotations(config_id);
CREATE INDEX IF NOT EXISTS idx_llm_key_rotations_rotated_at ON llm_key_rotations(rotated_at DESC);

-- RLS Policies
ALTER TABLE llm_key_rotations ENABLE ROW LEVEL SECURITY;

-- Users can view their own rotation history
CREATE POLICY "Users can view own llm_key_rotations"
    ON llm_key_rotations FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert rotation records
CREATE POLICY "Users can insert own llm_key_rotations"
    ON llm_key_rotations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 7. Helper Functions
-- =====================================================

-- Function to increment LLM usage for a user (for managed provider)
CREATE OR REPLACE FUNCTION increment_llm_usage(
    p_user_id UUID,
    p_tokens BIGINT,
    p_cost DECIMAL
)
RETURNS VOID AS $$
BEGIN
    -- Update user_settings if it exists, otherwise do nothing
    -- This function will be called by ManagedProvider
    UPDATE user_settings
    SET
        llm_monthly_tokens_used = COALESCE(llm_monthly_tokens_used, 0) + p_tokens,
        llm_monthly_cost_used = COALESCE(llm_monthly_cost_used, 0) + p_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- If user_settings doesn't exist, we could create it here
    -- For now, we'll just let it fail silently
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's monthly usage
CREATE OR REPLACE FUNCTION get_user_monthly_usage(p_user_id UUID)
RETURNS TABLE (
    total_requests BIGINT,
    total_tokens BIGINT,
    total_cost DECIMAL,
    success_rate DECIMAL,
    average_latency INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_requests,
        SUM(total_tokens)::BIGINT as total_tokens,
        SUM(total_cost)::DECIMAL as total_cost,
        (COUNT(*) FILTER (WHERE status = 'success')::DECIMAL / NULLIF(COUNT(*), 0) * 100) as success_rate,
        AVG(latency_ms)::INTEGER as average_latency
    FROM llm_usage
    WHERE
        user_id = p_user_id
        AND created_at >= DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get provider statistics
CREATE OR REPLACE FUNCTION get_provider_statistics(
    p_user_id UUID,
    p_config_id UUID
)
RETURNS TABLE (
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    total_tokens BIGINT,
    total_cost DECIMAL,
    average_latency INTEGER,
    error_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_requests,
        COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_requests,
        COUNT(*) FILTER (WHERE status != 'success')::BIGINT as failed_requests,
        SUM(total_tokens)::BIGINT as total_tokens,
        SUM(total_cost)::DECIMAL as total_cost,
        AVG(latency_ms)::INTEGER as average_latency,
        (COUNT(*) FILTER (WHERE status != 'success')::DECIMAL / NULLIF(COUNT(*), 0) * 100) as error_rate
    FROM llm_usage
    WHERE
        user_id = p_user_id
        AND config_id = p_config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. Update user_settings table (if exists)
-- =====================================================

-- Add LLM-related columns to user_settings if they don't exist
DO $$
BEGIN
    -- Check if user_settings table exists
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_settings') THEN
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns
                      WHERE table_name = 'user_settings'
                      AND column_name = 'llm_monthly_tokens_used') THEN
            ALTER TABLE user_settings ADD COLUMN llm_monthly_tokens_used BIGINT DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns
                      WHERE table_name = 'user_settings'
                      AND column_name = 'llm_monthly_cost_used') THEN
            ALTER TABLE user_settings ADD COLUMN llm_monthly_cost_used DECIMAL(10, 2) DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns
                      WHERE table_name = 'user_settings'
                      AND column_name = 'llm_preferences') THEN
            ALTER TABLE user_settings ADD COLUMN llm_preferences JSONB DEFAULT '{}'::jsonb;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 9. Create triggers for updated_at
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_llm_configurations_updated_at
    BEFORE UPDATE ON llm_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_llm_fallback_rules_updated_at
    BEFORE UPDATE ON llm_fallback_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_llm_usage_alerts_updated_at
    BEFORE UPDATE ON llm_usage_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. Comments for documentation
-- =====================================================

COMMENT ON TABLE llm_configurations IS 'User LLM provider configurations with encrypted API keys';
COMMENT ON TABLE llm_usage IS 'Tracks all LLM requests with token usage, cost, and performance metrics';
COMMENT ON TABLE llm_model_cache IS 'Caches available models per provider to reduce API calls';
COMMENT ON TABLE llm_fallback_rules IS 'Custom fallback chains when primary provider fails';
COMMENT ON TABLE llm_usage_alerts IS 'Usage threshold alerts for cost and token limits';
COMMENT ON TABLE llm_key_rotations IS 'Audit trail for API key rotations';

COMMENT ON COLUMN llm_configurations.encrypted_config IS 'AES-256-GCM encrypted JSON containing API keys and provider settings';
COMMENT ON COLUMN llm_configurations.priority IS 'Lower number = higher priority (1 is highest)';
COMMENT ON COLUMN llm_usage.total_cost IS 'Total cost in USD for this request';
COMMENT ON COLUMN llm_model_cache.capabilities IS 'JSON object: {streaming, functions, vision, json_mode}';
