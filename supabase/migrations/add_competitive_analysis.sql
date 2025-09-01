-- Competitive Analysis Schema

-- Competitor tracking table
CREATE TABLE competitor_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    primary_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    competitor_ids UUID[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business comparisons table for side-by-side analysis
CREATE TABLE business_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    business_ids UUID[] NOT NULL CHECK (array_length(business_ids, 1) >= 2),
    comparison_type TEXT CHECK (comparison_type IN ('quick', 'detailed', 'market')),
    metrics JSONB DEFAULT '{}', -- Stores comparison metrics
    insights JSONB DEFAULT '{}', -- AI-generated insights
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market analysis table
CREATE TABLE market_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    location JSONB, -- Geographic area for analysis
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Market metrics
    total_businesses INT DEFAULT 0,
    average_rating DECIMAL(3,2),
    average_reviews INT,
    market_growth_rate DECIMAL(5,2), -- Percentage
    
    -- Top performers
    top_businesses JSONB DEFAULT '[]', -- Array of business IDs with metrics
    emerging_businesses JSONB DEFAULT '[]',
    declining_businesses JSONB DEFAULT '[]',
    
    -- Trends and insights
    trends JSONB DEFAULT '{}',
    opportunities JSONB DEFAULT '[]',
    threats JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, location, period_start, period_end)
);

-- Competitive metrics tracking over time
CREATE TABLE competitive_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    
    -- Core metrics
    rating DECIMAL(3,2),
    review_count INT,
    sentiment_score DECIMAL(3,2), -- -1 to 1
    
    -- Growth metrics
    review_growth_rate DECIMAL(5,2),
    rating_trend TEXT CHECK (rating_trend IN ('improving', 'stable', 'declining')),
    
    -- Competitive position
    market_share DECIMAL(5,2), -- Percentage within category/location
    category_rank INT,
    local_rank INT,
    
    -- Social metrics
    social_mentions INT,
    engagement_rate DECIMAL(5,2),
    
    -- Financial indicators (if available)
    estimated_revenue DECIMAL(12,2),
    price_level INT CHECK (price_level BETWEEN 1 AND 4),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, metric_date)
);

-- SWOT analysis table
CREATE TABLE swot_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    strengths TEXT[],
    weaknesses TEXT[],
    opportunities TEXT[],
    threats TEXT[],
    
    ai_generated BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitive alerts/monitoring
CREATE TABLE competitive_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    competitor_set_id UUID REFERENCES competitor_sets(id) ON DELETE CASCADE,
    
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'new_competitor',
        'rating_change',
        'review_spike',
        'new_location',
        'price_change',
        'major_update',
        'market_shift'
    )),
    
    alert_config JSONB DEFAULT '{}', -- Threshold configurations
    is_active BOOLEAN DEFAULT true,
    last_triggered TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history
CREATE TABLE competitive_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES competitive_alerts(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id),
    
    alert_data JSONB NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_read BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_competitor_sets_user_id ON competitor_sets(user_id);
CREATE INDEX idx_competitor_sets_primary_business ON competitor_sets(primary_business_id);
CREATE INDEX idx_business_comparisons_user_id ON business_comparisons(user_id);
CREATE INDEX idx_business_comparisons_business_ids ON business_comparisons USING GIN(business_ids);
CREATE INDEX idx_market_analysis_category ON market_analysis(category);
CREATE INDEX idx_market_analysis_period ON market_analysis(period_start, period_end);
CREATE INDEX idx_competitive_metrics_business_id ON competitive_metrics(business_id);
CREATE INDEX idx_competitive_metrics_date ON competitive_metrics(metric_date DESC);
CREATE INDEX idx_swot_business_id ON swot_analysis(business_id);
CREATE INDEX idx_competitive_alerts_user_id ON competitive_alerts(user_id);
CREATE INDEX idx_alert_history_created ON competitive_alert_history(created_at DESC);

-- Enable RLS
ALTER TABLE competitor_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE swot_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Competitor sets
CREATE POLICY "Users can view their own competitor sets" ON competitor_sets
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create competitor sets" ON competitor_sets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their competitor sets" ON competitor_sets
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their competitor sets" ON competitor_sets
    FOR DELETE USING (user_id = auth.uid());

-- Business comparisons
CREATE POLICY "Users can view their comparisons" ON business_comparisons
    FOR SELECT USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create comparisons" ON business_comparisons
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Market analysis (public read)
CREATE POLICY "Anyone can view market analysis" ON market_analysis
    FOR SELECT USING (true);

-- Competitive metrics (public read)
CREATE POLICY "Anyone can view competitive metrics" ON competitive_metrics
    FOR SELECT USING (true);

-- SWOT analysis
CREATE POLICY "Users can view public or own SWOT" ON swot_analysis
    FOR SELECT USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can create SWOT analysis" ON swot_analysis
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their SWOT" ON swot_analysis
    FOR UPDATE USING (user_id = auth.uid());

-- Alerts
CREATE POLICY "Users can manage their alerts" ON competitive_alerts
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their alert history" ON competitive_alert_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM competitive_alerts
            WHERE competitive_alerts.id = alert_id
            AND competitive_alerts.user_id = auth.uid()
        )
    );

-- Functions

-- Function to calculate competitive position
CREATE OR REPLACE FUNCTION calculate_competitive_position(
    target_business_id UUID,
    comparison_category TEXT,
    location_radius_km INT DEFAULT 10
)
RETURNS TABLE (
    market_position INT,
    total_competitors INT,
    rating_percentile DECIMAL,
    review_percentile DECIMAL,
    strengths JSONB,
    weaknesses JSONB
) AS $$
DECLARE
    target_business RECORD;
    competitors_count INT;
BEGIN
    -- Get target business details
    SELECT * INTO target_business 
    FROM businesses 
    WHERE id = target_business_id;
    
    -- Count competitors in same category and area
    SELECT COUNT(*) INTO competitors_count
    FROM businesses b
    WHERE b.id != target_business_id
    AND comparison_category = ANY(b.categories)
    AND ST_DWithin(
        b.location::geography,
        target_business.location::geography,
        location_radius_km * 1000
    );
    
    -- Calculate position and percentiles
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) + 1 
         FROM businesses b 
         WHERE b.id != target_business_id
         AND comparison_category = ANY(b.categories)
         AND b.rating > target_business.rating
         AND ST_DWithin(
            b.location::geography,
            target_business.location::geography,
            location_radius_km * 1000
         ))::INT as market_position,
        competitors_count as total_competitors,
        (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rating) 
         FROM businesses 
         WHERE comparison_category = ANY(categories))::DECIMAL as rating_percentile,
        (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY review_count) 
         FROM businesses 
         WHERE comparison_category = ANY(categories))::DECIMAL as review_percentile,
        jsonb_build_object(
            'high_rating', target_business.rating > 4.0,
            'many_reviews', target_business.review_count > 100,
            'verified', target_business.verified
        ) as strengths,
        jsonb_build_object(
            'low_rating', target_business.rating < 3.5,
            'few_reviews', target_business.review_count < 20
        ) as weaknesses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate market insights
CREATE OR REPLACE FUNCTION generate_market_insights(
    analysis_category TEXT,
    analysis_location JSONB,
    days_back INT DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    insights JSONB;
    top_performers JSONB;
    emerging JSONB;
BEGIN
    -- Get top performers
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'name', name,
            'rating', rating,
            'review_count', review_count
        ) ORDER BY rating DESC, review_count DESC
    ) INTO top_performers
    FROM (
        SELECT id, name, rating, review_count
        FROM businesses
        WHERE analysis_category = ANY(categories)
        ORDER BY rating DESC, review_count DESC
        LIMIT 5
    ) t;
    
    -- Get emerging businesses (new with good ratings)
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'name', name,
            'rating', rating,
            'days_since_created', EXTRACT(DAY FROM NOW() - created_at)
        ) ORDER BY rating DESC
    ) INTO emerging
    FROM (
        SELECT id, name, rating, created_at
        FROM businesses
        WHERE analysis_category = ANY(categories)
        AND created_at > NOW() - INTERVAL '90 days'
        AND rating >= 4.0
        ORDER BY rating DESC
        LIMIT 5
    ) e;
    
    -- Build insights object
    insights := jsonb_build_object(
        'market_summary', jsonb_build_object(
            'total_businesses', (
                SELECT COUNT(*) 
                FROM businesses 
                WHERE analysis_category = ANY(categories)
            ),
            'average_rating', (
                SELECT AVG(rating)::DECIMAL(3,2) 
                FROM businesses 
                WHERE analysis_category = ANY(categories)
            ),
            'high_performers_count', (
                SELECT COUNT(*) 
                FROM businesses 
                WHERE analysis_category = ANY(categories) 
                AND rating >= 4.5
            )
        ),
        'top_performers', COALESCE(top_performers, '[]'::jsonb),
        'emerging_businesses', COALESCE(emerging, '[]'::jsonb),
        'opportunities', jsonb_build_array(
            'Market has room for quality competitors',
            'Customer demand exceeds current supply',
            'Opportunity for specialized offerings'
        ),
        'generated_at', NOW()
    );
    
    RETURN insights;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track competitive metrics
CREATE OR REPLACE FUNCTION track_competitive_metrics()
RETURNS void AS $$
BEGIN
    -- Insert today's metrics for all active businesses
    INSERT INTO competitive_metrics (
        business_id,
        metric_date,
        rating,
        review_count,
        rating_trend,
        category_rank,
        local_rank
    )
    SELECT 
        b.id,
        CURRENT_DATE,
        b.rating,
        b.review_count,
        CASE 
            WHEN b.rating > COALESCE(cm.rating, 0) THEN 'improving'
            WHEN b.rating < COALESCE(cm.rating, 5) THEN 'declining'
            ELSE 'stable'
        END as rating_trend,
        ROW_NUMBER() OVER (
            PARTITION BY b.categories[1] 
            ORDER BY b.rating DESC, b.review_count DESC
        ) as category_rank,
        ROW_NUMBER() OVER (
            PARTITION BY b.address->>'city' 
            ORDER BY b.rating DESC, b.review_count DESC
        ) as local_rank
    FROM businesses b
    LEFT JOIN competitive_metrics cm ON 
        cm.business_id = b.id 
        AND cm.metric_date = CURRENT_DATE - 1
    WHERE b.status = 'active'
    ON CONFLICT (business_id, metric_date) DO UPDATE
    SET 
        rating = EXCLUDED.rating,
        review_count = EXCLUDED.review_count,
        rating_trend = EXCLUDED.rating_trend,
        category_rank = EXCLUDED.category_rank,
        local_rank = EXCLUDED.local_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;