-- Predictive Analytics System
-- =============================

-- Market metrics table for historical data
CREATE TABLE market_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    location_id UUID REFERENCES locations(id),
    metric_date DATE NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN (
        'business_count',
        'avg_rating',
        'review_volume',
        'growth_rate',
        'market_saturation',
        'demand_index',
        'competition_level',
        'opportunity_score'
    )),
    value DECIMAL(10,4) NOT NULL,
    period TEXT CHECK (period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(category, location_id, metric_date, metric_type, period)
);

-- Trend analysis results
CREATE TABLE trend_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('market', 'category', 'location', 'business')),
    entity_id TEXT NOT NULL,
    analysis_date DATE NOT NULL,
    trend_direction TEXT CHECK (trend_direction IN ('rising', 'falling', 'stable', 'volatile')),
    trend_strength DECIMAL(3,2) CHECK (trend_strength >= 0 AND trend_strength <= 1),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    period_days INTEGER NOT NULL,
    metrics JSONB NOT NULL, -- Detailed metrics and calculations
    predictions JSONB DEFAULT '{}', -- Future predictions
    insights TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(entity_type, entity_id, analysis_date, period_days)
);

-- Demand forecasts
CREATE TABLE demand_forecasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL,
    location_id UUID REFERENCES locations(id),
    forecast_date DATE NOT NULL,
    forecast_horizon_days INTEGER NOT NULL,
    predicted_demand DECIMAL(10,2) NOT NULL,
    lower_bound DECIMAL(10,2),
    upper_bound DECIMAL(10,2),
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    model_type TEXT CHECK (model_type IN ('arima', 'prophet', 'lstm', 'ensemble')),
    model_accuracy DECIMAL(3,2),
    factors JSONB DEFAULT '{}', -- Contributing factors
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(category, location_id, forecast_date, forecast_horizon_days)
);

-- Opportunity identification
CREATE TABLE opportunities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN (
        'underserved_market',
        'gap_in_service',
        'emerging_trend',
        'competitor_weakness',
        'seasonal_opportunity',
        'demographic_shift',
        'regulatory_change'
    )),
    category TEXT NOT NULL,
    location_id UUID REFERENCES locations(id),
    opportunity_score DECIMAL(3,2) CHECK (opportunity_score >= 0 AND opportunity_score <= 1),
    potential_value DECIMAL(12,2),
    time_window_start DATE,
    time_window_end DATE,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    description TEXT NOT NULL,
    evidence JSONB NOT NULL, -- Supporting data points
    recommended_actions TEXT[],
    risk_factors TEXT[],
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'captured', 'expired', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    captured_by UUID REFERENCES auth.users(id),
    captured_at TIMESTAMPTZ
);

-- Predictive models metadata
CREATE TABLE predictive_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_name TEXT NOT NULL UNIQUE,
    model_type TEXT NOT NULL,
    version TEXT NOT NULL,
    target_metric TEXT NOT NULL,
    features TEXT[] NOT NULL,
    hyperparameters JSONB DEFAULT '{}',
    training_metrics JSONB DEFAULT '{}',
    validation_metrics JSONB DEFAULT '{}',
    last_trained_at TIMESTAMPTZ,
    training_data_start DATE,
    training_data_end DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Anomaly detection
CREATE TABLE anomalies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    anomaly_type TEXT CHECK (anomaly_type IN (
        'spike',
        'drop',
        'pattern_break',
        'outlier',
        'trend_reversal'
    )),
    metric_name TEXT NOT NULL,
    expected_value DECIMAL(10,4),
    actual_value DECIMAL(10,4),
    deviation_score DECIMAL(5,2),
    detected_at TIMESTAMPTZ DEFAULT now(),
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_confirmed BOOLEAN DEFAULT false,
    is_false_positive BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Market signals for real-time monitoring
CREATE TABLE market_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    signal_type TEXT NOT NULL CHECK (signal_type IN (
        'new_competitor',
        'business_closure',
        'rating_shift',
        'review_surge',
        'price_change',
        'service_expansion',
        'regulatory_update'
    )),
    category TEXT,
    location_id UUID REFERENCES locations(id),
    signal_strength DECIMAL(3,2) CHECK (signal_strength >= 0 AND signal_strength <= 1),
    impact_score DECIMAL(3,2) CHECK (impact_score >= 0 AND impact_score <= 1),
    data JSONB NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT now(),
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ
);

-- Analytics snapshots for performance
CREATE TABLE analytics_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    category TEXT,
    location_id UUID REFERENCES locations(id),
    metrics JSONB NOT NULL, -- All calculated metrics
    rankings JSONB DEFAULT '{}', -- Top performers, movers, etc.
    insights JSONB DEFAULT '{}', -- Key insights and findings
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(snapshot_date, category, location_id)
);

-- Indexes for performance
CREATE INDEX idx_market_metrics_lookup ON market_metrics(category, location_id, metric_date DESC);
CREATE INDEX idx_market_metrics_type ON market_metrics(metric_type, metric_date DESC);
CREATE INDEX idx_trend_analysis_entity ON trend_analysis(entity_type, entity_id, analysis_date DESC);
CREATE INDEX idx_demand_forecasts_lookup ON demand_forecasts(category, location_id, forecast_date DESC);
CREATE INDEX idx_opportunities_active ON opportunities(status, opportunity_score DESC) WHERE status = 'active';
CREATE INDEX idx_opportunities_location ON opportunities(location_id, category);
CREATE INDEX idx_anomalies_unconfirmed ON anomalies(detected_at DESC) WHERE is_confirmed = false;
CREATE INDEX idx_market_signals_unprocessed ON market_signals(detected_at DESC) WHERE processed = false;

-- Functions for analytics

-- Calculate growth rate
CREATE OR REPLACE FUNCTION calculate_growth_rate(
    current_value DECIMAL,
    previous_value DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    IF previous_value = 0 OR previous_value IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN ((current_value - previous_value) / previous_value) * 100;
END;
$$ LANGUAGE plpgsql;

-- Calculate market saturation
CREATE OR REPLACE FUNCTION calculate_market_saturation(
    category TEXT,
    location_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    business_count INTEGER;
    population INTEGER;
    avg_businesses_per_capita DECIMAL;
    saturation_score DECIMAL;
BEGIN
    -- Get current business count
    SELECT COUNT(*) INTO business_count
    FROM businesses b
    WHERE b.category = calculate_market_saturation.category
    AND b.location_id = calculate_market_saturation.location_id;
    
    -- Get population (would need demographic data)
    -- For now, use a placeholder calculation
    population := 100000; -- Placeholder
    
    -- Calculate businesses per capita
    avg_businesses_per_capita := business_count::DECIMAL / (population::DECIMAL / 1000);
    
    -- Calculate saturation score (0-1 scale)
    -- Higher score means more saturated
    saturation_score := LEAST(avg_businesses_per_capita / 5, 1); -- 5 businesses per 1000 people = fully saturated
    
    RETURN saturation_score;
END;
$$ LANGUAGE plpgsql;

-- Calculate opportunity score
CREATE OR REPLACE FUNCTION calculate_opportunity_score(
    p_category TEXT,
    p_location_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    saturation_score DECIMAL;
    growth_rate DECIMAL;
    demand_index DECIMAL;
    opportunity_score DECIMAL;
BEGIN
    -- Get market saturation (inverse relationship with opportunity)
    saturation_score := calculate_market_saturation(p_category, p_location_id);
    
    -- Get recent growth rate
    SELECT value INTO growth_rate
    FROM market_metrics
    WHERE category = p_category
    AND location_id = p_location_id
    AND metric_type = 'growth_rate'
    ORDER BY metric_date DESC
    LIMIT 1;
    
    -- Get demand index
    SELECT value INTO demand_index
    FROM market_metrics
    WHERE category = p_category
    AND location_id = p_location_id
    AND metric_type = 'demand_index'
    ORDER BY metric_date DESC
    LIMIT 1;
    
    -- Calculate opportunity score
    -- High demand + low saturation + positive growth = high opportunity
    opportunity_score := (
        COALESCE(demand_index, 0.5) * 0.4 +
        (1 - COALESCE(saturation_score, 0.5)) * 0.4 +
        GREATEST(COALESCE(growth_rate, 0) / 100, 0) * 0.2
    );
    
    RETURN LEAST(GREATEST(opportunity_score, 0), 1);
END;
$$ LANGUAGE plpgsql;

-- Detect anomalies in metrics
CREATE OR REPLACE FUNCTION detect_metric_anomaly(
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_metric_name TEXT,
    p_current_value DECIMAL
) RETURNS BOOLEAN AS $$
DECLARE
    avg_value DECIMAL;
    std_dev DECIMAL;
    z_score DECIMAL;
    is_anomaly BOOLEAN;
BEGIN
    -- Calculate historical average and standard deviation
    IF p_entity_type = 'business' THEN
        SELECT AVG(value), STDDEV(value)
        INTO avg_value, std_dev
        FROM market_metrics
        WHERE metric_type = p_metric_name
        AND metric_date >= CURRENT_DATE - INTERVAL '90 days';
    END IF;
    
    -- Calculate z-score
    IF std_dev > 0 THEN
        z_score := ABS((p_current_value - avg_value) / std_dev);
        -- Consider anomaly if z-score > 3 (99.7% confidence)
        is_anomaly := z_score > 3;
    ELSE
        is_anomaly := FALSE;
    END IF;
    
    -- Log anomaly if detected
    IF is_anomaly THEN
        INSERT INTO anomalies (
            entity_type,
            entity_id,
            anomaly_type,
            metric_name,
            expected_value,
            actual_value,
            deviation_score
        ) VALUES (
            p_entity_type,
            p_entity_id,
            CASE 
                WHEN p_current_value > avg_value THEN 'spike'
                ELSE 'drop'
            END,
            p_metric_name,
            avg_value,
            p_current_value,
            z_score
        );
    END IF;
    
    RETURN is_anomaly;
END;
$$ LANGUAGE plpgsql;

-- Generate market insights
CREATE OR REPLACE FUNCTION generate_market_insights(
    p_category TEXT,
    p_location_id UUID
) RETURNS JSONB AS $$
DECLARE
    insights JSONB;
    top_performers JSONB;
    emerging_trends JSONB;
    risk_factors JSONB;
BEGIN
    -- Get top performing businesses
    SELECT json_agg(
        json_build_object(
            'business_id', b.id,
            'name', b.name,
            'rating', b.rating,
            'growth', mm.value
        ) ORDER BY b.rating DESC
    ) INTO top_performers
    FROM businesses b
    LEFT JOIN market_metrics mm ON mm.category = b.category 
        AND mm.metric_type = 'growth_rate'
        AND mm.metric_date = CURRENT_DATE
    WHERE b.category = p_category
    AND b.location_id = p_location_id
    LIMIT 5;
    
    -- Identify emerging trends
    SELECT json_agg(
        json_build_object(
            'trend', ta.metrics->>'trend_name',
            'strength', ta.trend_strength,
            'direction', ta.trend_direction
        ) ORDER BY ta.trend_strength DESC
    ) INTO emerging_trends
    FROM trend_analysis ta
    WHERE ta.entity_type = 'category'
    AND ta.entity_id = p_category
    AND ta.analysis_date >= CURRENT_DATE - INTERVAL '30 days'
    LIMIT 3;
    
    -- Compile insights
    insights := json_build_object(
        'generated_at', now(),
        'category', p_category,
        'location_id', p_location_id,
        'top_performers', COALESCE(top_performers, '[]'::jsonb),
        'emerging_trends', COALESCE(emerging_trends, '[]'::jsonb),
        'market_saturation', calculate_market_saturation(p_category, p_location_id),
        'opportunity_score', calculate_opportunity_score(p_category, p_location_id)
    );
    
    RETURN insights;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE market_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read access for analytics data
CREATE POLICY "Public read access for market metrics" ON market_metrics
    FOR SELECT USING (true);

CREATE POLICY "Public read access for trends" ON trend_analysis
    FOR SELECT USING (true);

CREATE POLICY "Public read access for forecasts" ON demand_forecasts
    FOR SELECT USING (true);

CREATE POLICY "Public read access for opportunities" ON opportunities
    FOR SELECT USING (status = 'active');

-- Admin write access
CREATE POLICY "Admin write access for metrics" ON market_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'analyst')
        )
    );

-- Function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_analytics_snapshot(
    p_category TEXT DEFAULT NULL,
    p_location_id UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
    -- Generate and store analytics snapshot
    INSERT INTO analytics_snapshots (
        snapshot_date,
        category,
        location_id,
        metrics,
        insights
    )
    SELECT
        CURRENT_DATE,
        COALESCE(p_category, 'all'),
        p_location_id,
        json_build_object(
            'total_businesses', COUNT(DISTINCT b.id),
            'avg_rating', AVG(b.rating),
            'total_reviews', SUM(b.review_count),
            'market_saturation', calculate_market_saturation(p_category, p_location_id),
            'opportunity_score', calculate_opportunity_score(p_category, p_location_id)
        ),
        generate_market_insights(p_category, p_location_id)
    FROM businesses b
    WHERE (p_category IS NULL OR b.category = p_category)
    AND (p_location_id IS NULL OR b.location_id = p_location_id)
    ON CONFLICT (snapshot_date, category, location_id) 
    DO UPDATE SET
        metrics = EXCLUDED.metrics,
        insights = EXCLUDED.insights,
        created_at = now();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE TRIGGER update_trend_analysis_updated_at
    BEFORE UPDATE ON trend_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictive_models_updated_at
    BEFORE UPDATE ON predictive_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();