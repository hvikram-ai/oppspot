-- Similar Company Feature: M&A-focused similarity analysis system
-- Extends Opp Scan with intelligent company matching capabilities
-- For £50,000 Premium Feature

-- ==========================================
-- SIMILARITY ANALYSIS CORE
-- ==========================================

-- Main similarity analysis instances
CREATE TABLE similarity_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Target company information
    target_company_name TEXT NOT NULL,
    target_company_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    target_company_data JSONB, -- Enriched company data
    
    -- Analysis configuration
    analysis_configuration JSONB NOT NULL DEFAULT '{
        "analysisDepth": "detailed",
        "parameterWeights": {
            "financial": 0.30,
            "strategic": 0.25,
            "operational": 0.20,
            "market": 0.15,
            "risk": 0.10
        },
        "maxResults": 20,
        "includeExplanations": true,
        "webSearchEnabled": true,
        "financialDataRequired": true,
        "competitorAnalysis": true
    }',
    
    -- Filter criteria applied
    filter_criteria JSONB DEFAULT '{}',
    
    -- Analysis status and progress
    status TEXT NOT NULL CHECK (status IN (
        'pending',
        'searching',
        'analyzing', 
        'completed',
        'failed',
        'expired'
    )) DEFAULT 'pending',
    
    -- Results summary
    total_companies_analyzed INTEGER DEFAULT 0,
    average_similarity_score DECIMAL(5,2) DEFAULT 0.0,
    top_similarity_score DECIMAL(5,2) DEFAULT 0.0,
    distribution_by_industry JSONB DEFAULT '{}',
    distribution_by_region JSONB DEFAULT '{}',
    analysis_completeness DECIMAL(3,2) DEFAULT 0.0,
    data_quality_score DECIMAL(3,2) DEFAULT 0.0,
    
    -- M&A insights summary
    executive_summary TEXT,
    key_opportunities JSONB DEFAULT '[]',
    risk_highlights JSONB DEFAULT '[]',
    strategic_recommendations JSONB DEFAULT '[]',
    
    -- Caching and expiration
    cached BOOLEAN DEFAULT FALSE,
    cache_key TEXT,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Processing metadata
    search_queries_used JSONB DEFAULT '[]',
    data_sources_used TEXT[] DEFAULT ARRAY[]::TEXT[],
    processing_time_seconds INTEGER DEFAULT 0,
    api_calls_made INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,4) DEFAULT 0.0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_similarity_analyses_user_id ON similarity_analyses(user_id);
CREATE INDEX idx_similarity_analyses_target_company ON similarity_analyses(target_company_name);
CREATE INDEX idx_similarity_analyses_status ON similarity_analyses(status);
CREATE INDEX idx_similarity_analyses_created_at ON similarity_analyses(created_at);
CREATE INDEX idx_similarity_analyses_cache_key ON similarity_analyses(cache_key);

-- ==========================================
-- SIMILAR COMPANY MATCHES
-- ==========================================

-- Individual company matches with detailed scoring
CREATE TABLE similar_company_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    similarity_analysis_id UUID REFERENCES similarity_analyses(id) ON DELETE CASCADE,
    
    -- Matched company information
    company_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    company_data JSONB, -- Enriched company data
    
    -- Similarity scoring
    overall_score DECIMAL(5,2) NOT NULL DEFAULT 0.0, -- 0-100 overall similarity
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.0, -- 0-1 confidence level
    rank INTEGER NOT NULL DEFAULT 0, -- Ranking position
    
    -- M&A benchmark scores (detailed breakdown)
    financial_score DECIMAL(5,2) DEFAULT 0.0,
    strategic_score DECIMAL(5,2) DEFAULT 0.0,
    operational_score DECIMAL(5,2) DEFAULT 0.0,
    market_score DECIMAL(5,2) DEFAULT 0.0,
    risk_score DECIMAL(5,2) DEFAULT 0.0,
    
    -- Score confidence levels
    financial_confidence DECIMAL(3,2) DEFAULT 0.0,
    strategic_confidence DECIMAL(3,2) DEFAULT 0.0,
    operational_confidence DECIMAL(3,2) DEFAULT 0.0,
    market_confidence DECIMAL(3,2) DEFAULT 0.0,
    risk_confidence DECIMAL(3,2) DEFAULT 0.0,
    
    -- Contributing factors for each score
    financial_factors JSONB DEFAULT '[]',
    strategic_factors JSONB DEFAULT '[]',
    operational_factors JSONB DEFAULT '[]',
    market_factors JSONB DEFAULT '[]',
    risk_factors JSONB DEFAULT '[]',
    
    -- Market positioning
    market_position TEXT CHECK (market_position IN ('leader', 'challenger', 'follower', 'niche')),
    competitive_advantage JSONB DEFAULT '[]',
    brand_strength DECIMAL(3,2) DEFAULT 0.0,
    
    -- Risk and opportunity indicators
    risk_factors_identified JSONB DEFAULT '[]',
    opportunity_areas JSONB DEFAULT '[]',
    red_flags JSONB DEFAULT '[]',
    
    -- Data quality indicators
    data_points_used INTEGER DEFAULT 0,
    source_reliability DECIMAL(3,2) DEFAULT 0.0,
    last_data_update TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_similar_company_matches_analysis_id ON similar_company_matches(similarity_analysis_id);
CREATE INDEX idx_similar_company_matches_overall_score ON similar_company_matches(overall_score DESC);
CREATE INDEX idx_similar_company_matches_rank ON similar_company_matches(rank);
CREATE INDEX idx_similar_company_matches_company_name ON similar_company_matches(company_name);

-- ==========================================
-- M&A BENCHMARK PROFILES
-- ==========================================

-- Detailed M&A-specific benchmark data for companies
CREATE TABLE mna_benchmark_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Financial profile
    revenue_range_lower DECIMAL(15,2),
    revenue_range_upper DECIMAL(15,2),
    estimated_revenue DECIMAL(15,2),
    revenue_growth_rate DECIMAL(5,4), -- 3-year CAGR
    revenue_stability DECIMAL(3,2) DEFAULT 0.0, -- Volatility measure
    
    -- Profitability metrics
    ebitda_margin DECIMAL(5,4),
    net_profit_margin DECIMAL(5,4),
    gross_margin DECIMAL(5,4),
    operating_margin DECIMAL(5,4),
    return_on_assets DECIMAL(5,4),
    return_on_equity DECIMAL(5,4),
    
    -- Debt and financial health
    debt_to_equity_ratio DECIMAL(5,4),
    debt_to_ebitda_ratio DECIMAL(5,4),
    interest_coverage DECIMAL(5,4),
    credit_rating TEXT,
    leverage_risk TEXT CHECK (leverage_risk IN ('low', 'medium', 'high')),
    
    -- Valuation metrics
    enterprise_value DECIMAL(15,2),
    ev_to_revenue DECIMAL(5,2),
    ev_to_ebitda DECIMAL(5,2),
    price_to_earnings DECIMAL(5,2),
    market_cap DECIMAL(15,2),
    
    -- Strategic profile
    market_share DECIMAL(5,4),
    geographic_presence JSONB, -- Regions and market penetration
    customer_concentration_risk DECIMAL(3,2), -- Top 5 customers as % of revenue
    supplier_dependency_risk DECIMAL(3,2), -- Supply chain concentration
    
    -- Operational characteristics
    business_model_type TEXT CHECK (business_model_type IN ('b2b', 'b2c', 'marketplace', 'subscription', 'transaction', 'hybrid')),
    revenue_streams JSONB, -- Breakdown of revenue sources
    scalability_level TEXT CHECK (scalability_level IN ('low', 'medium', 'high')),
    capital_intensity TEXT CHECK (capital_intensity IN ('low', 'medium', 'high')),
    operational_efficiency DECIMAL(3,2) DEFAULT 0.0,
    
    -- Technology and innovation
    technology_maturity DECIMAL(3,2) DEFAULT 0.0,
    innovation_capacity DECIMAL(3,2) DEFAULT 0.0,
    intellectual_property JSONB, -- Patents, trademarks, etc.
    technology_risk_level TEXT CHECK (technology_risk_level IN ('low', 'medium', 'high')),
    
    -- Market dynamics
    industry_growth_rate DECIMAL(5,4),
    market_maturity TEXT CHECK (market_maturity IN ('emerging', 'growth', 'mature', 'declining')),
    competitive_intensity TEXT CHECK (competitive_intensity IN ('low', 'medium', 'high')),
    barrier_to_entry TEXT CHECK (barrier_to_entry IN ('low', 'medium', 'high')),
    cyclicality_level TEXT CHECK (cyclicality_level IN ('none', 'low', 'moderate', 'high')),
    
    -- Risk assessment
    regulatory_risk_level TEXT CHECK (regulatory_risk_level IN ('low', 'medium', 'high', 'critical')),
    environmental_risk DECIMAL(3,2) DEFAULT 0.0,
    social_risk DECIMAL(3,2) DEFAULT 0.0,
    governance_risk DECIMAL(3,2) DEFAULT 0.0,
    integration_complexity TEXT CHECK (integration_complexity IN ('low', 'medium', 'high', 'extreme')),
    key_person_dependency BOOLEAN DEFAULT FALSE,
    
    -- Data quality and freshness
    data_quality_score DECIMAL(3,2) DEFAULT 0.0,
    data_completeness DECIMAL(3,2) DEFAULT 0.0,
    source_reliability DECIMAL(3,2) DEFAULT 0.0,
    last_financial_update DATE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    benchmark_date DATE DEFAULT CURRENT_DATE
);

-- Indexes for M&A benchmark queries
CREATE INDEX idx_mna_benchmark_profiles_company_id ON mna_benchmark_profiles(company_id);
CREATE INDEX idx_mna_benchmark_profiles_revenue_range ON mna_benchmark_profiles(estimated_revenue);
CREATE INDEX idx_mna_benchmark_profiles_market_maturity ON mna_benchmark_profiles(market_maturity);
CREATE INDEX idx_mna_benchmark_profiles_business_model ON mna_benchmark_profiles(business_model_type);

-- ==========================================
-- SIMILARITY EXPLANATIONS
-- ==========================================

-- LLM-generated explanations for similarity matches
CREATE TABLE similarity_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    similar_company_match_id UUID REFERENCES similar_company_matches(id) ON DELETE CASCADE,
    
    -- Main explanation content
    summary TEXT NOT NULL, -- Executive summary of why companies are similar
    key_reasons JSONB DEFAULT '[]', -- Bullet points of main reasons
    
    -- Detailed rationales by category
    financial_rationale TEXT,
    strategic_rationale TEXT,
    operational_rationale TEXT,
    market_rationale TEXT,
    risk_considerations TEXT,
    
    -- Confidence and quality indicators
    confidence_level TEXT CHECK (confidence_level IN ('low', 'medium', 'high', 'very_high')),
    explanation_quality_score DECIMAL(3,2) DEFAULT 0.0,
    data_quality_note TEXT,
    
    -- Generation metadata
    llm_model_used TEXT DEFAULT 'openrouter',
    generation_prompt_version TEXT DEFAULT 'v1.0',
    generation_time_seconds INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    generation_cost DECIMAL(10,6) DEFAULT 0.0,
    
    -- Review and feedback
    human_reviewed BOOLEAN DEFAULT FALSE,
    human_feedback_score INTEGER, -- 1-5 rating
    human_feedback_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for explanations
CREATE INDEX idx_similarity_explanations_match_id ON similarity_explanations(similar_company_match_id);
CREATE INDEX idx_similarity_explanations_confidence ON similarity_explanations(confidence_level);

-- ==========================================
-- ENHANCED COMPANY PROFILES
-- ==========================================

-- Extended company profiles with enriched data for similarity analysis
CREATE TABLE enhanced_company_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    
    -- Web search and discovery metadata
    web_search_data JSONB, -- Results from web search enrichment
    social_media_presence JSONB, -- Social platform data and engagement
    news_analysis JSONB, -- Recent news sentiment and topics
    technology_profile JSONB, -- Technology stack and digital footprint
    
    -- Financial data enrichment
    financial_data_source TEXT, -- Source of financial information
    financial_data_confidence DECIMAL(3,2) DEFAULT 0.0,
    financial_metrics_detailed JSONB, -- Extended financial analysis
    valuation_estimates JSONB, -- Multiple valuation approaches
    
    -- Competitive intelligence
    main_competitors JSONB, -- Identified competitors
    competitive_position TEXT,
    market_share_estimates JSONB, -- Market share by segment/region
    competitive_advantages JSONB, -- Key differentiators
    
    -- Industry and market context
    industry_classifications JSONB, -- Multiple classification systems
    market_segments JSONB, -- Served market segments
    geographic_markets JSONB, -- Geographic presence and performance
    customer_segments JSONB, -- Customer base analysis
    
    -- Operational intelligence
    business_model_analysis JSONB, -- Detailed business model breakdown
    value_chain_analysis JSONB, -- Value chain positioning
    operational_metrics JSONB, -- Efficiency and performance metrics
    supply_chain_data JSONB, -- Key suppliers and dependencies
    
    -- Innovation and IP
    innovation_indicators JSONB, -- R&D spending, patents, etc.
    intellectual_property_portfolio JSONB, -- IP assets and strength
    technology_adoption JSONB, -- Technology maturity and adoption
    
    -- ESG and sustainability
    esg_scores JSONB, -- Environmental, Social, Governance scores
    sustainability_initiatives JSONB, -- Green/sustainable practices
    social_impact_metrics JSONB, -- Community and social impact
    
    -- Risk and compliance
    regulatory_environment JSONB, -- Regulatory context and compliance
    legal_issues JSONB, -- Litigation, disputes, legal risks
    compliance_certifications JSONB, -- Industry certifications
    insurance_coverage JSONB, -- Insurance and risk coverage
    
    -- Data provenance and quality
    data_sources_used JSONB, -- All sources that contributed data
    enrichment_completeness DECIMAL(3,2) DEFAULT 0.0, -- How complete is the profile
    enrichment_confidence DECIMAL(3,2) DEFAULT 0.0, -- Overall data confidence
    last_enrichment_date TIMESTAMPTZ DEFAULT NOW(),
    next_refresh_due TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Processing metadata
    enrichment_cost DECIMAL(10,4) DEFAULT 0.0,
    api_calls_made INTEGER DEFAULT 0,
    processing_time_seconds INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for enhanced profiles
CREATE INDEX idx_enhanced_company_profiles_company_id ON enhanced_company_profiles(company_id);
CREATE INDEX idx_enhanced_company_profiles_last_enrichment ON enhanced_company_profiles(last_enrichment_date);
CREATE INDEX idx_enhanced_company_profiles_next_refresh ON enhanced_company_profiles(next_refresh_due);

-- ==========================================
-- SEARCH QUERY CACHE
-- ==========================================

-- Cache for expensive web searches and API calls
CREATE TABLE search_query_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Cache key components
    cache_key TEXT NOT NULL UNIQUE, -- Hashed query parameters
    query_type TEXT NOT NULL CHECK (query_type IN (
        'company_search',
        'competitor_search', 
        'industry_search',
        'financial_data',
        'news_analysis',
        'social_media'
    )),
    
    -- Query parameters (for debugging and analysis)
    query_parameters JSONB NOT NULL,
    
    -- Cached results
    results JSONB NOT NULL,
    result_count INTEGER DEFAULT 0,
    
    -- Cache metadata
    data_quality_score DECIMAL(3,2) DEFAULT 0.0,
    source_reliability DECIMAL(3,2) DEFAULT 0.0,
    api_cost DECIMAL(10,6) DEFAULT 0.0,
    response_time_ms INTEGER DEFAULT 0,
    
    -- Cache management
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cache management
CREATE INDEX idx_search_query_cache_key ON search_query_cache(cache_key);
CREATE INDEX idx_search_query_cache_type ON search_query_cache(query_type);
CREATE INDEX idx_search_query_cache_expires ON search_query_cache(expires_at);
CREATE INDEX idx_search_query_cache_last_accessed ON search_query_cache(last_accessed);

-- ==========================================
-- ANALYSIS EXPORTS
-- ==========================================

-- Generated reports and exports for similarity analyses
CREATE TABLE similarity_analysis_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    similarity_analysis_id UUID REFERENCES similarity_analyses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Export configuration
    export_type TEXT NOT NULL CHECK (export_type IN (
        'executive_summary',
        'detailed_comparison',
        'presentation_slides',
        'excel_workbook',
        'due_diligence_pack',
        'csv_data'
    )),
    
    export_format TEXT NOT NULL CHECK (export_format IN ('pdf', 'pptx', 'xlsx', 'csv', 'json')),
    template_version TEXT DEFAULT 'v1.0',
    
    -- Export content
    export_title TEXT NOT NULL,
    export_description TEXT,
    export_content JSONB, -- Structured export data
    custom_branding JSONB, -- Company logos, colors, etc.
    
    -- File information
    file_path TEXT, -- S3/storage path
    file_size_bytes BIGINT,
    download_count INTEGER DEFAULT 0,
    
    -- Access control
    is_confidential BOOLEAN DEFAULT TRUE,
    password_protected BOOLEAN DEFAULT FALSE,
    shared_with JSONB DEFAULT '[]', -- Array of user IDs
    public_link TEXT, -- Shareable link
    link_expires_at TIMESTAMPTZ,
    
    -- Generation status
    generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN (
        'pending',
        'generating',
        'completed', 
        'failed'
    )),
    generation_error TEXT,
    generation_time_seconds INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes for exports
CREATE INDEX idx_similarity_analysis_exports_analysis_id ON similarity_analysis_exports(similarity_analysis_id);
CREATE INDEX idx_similarity_analysis_exports_user_id ON similarity_analysis_exports(user_id);
CREATE INDEX idx_similarity_analysis_exports_status ON similarity_analysis_exports(generation_status);

-- ==========================================
-- FEATURE USAGE TRACKING
-- ==========================================

-- Track usage patterns for optimization and billing
CREATE TABLE similarity_feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Usage event details
    event_type TEXT NOT NULL CHECK (event_type IN (
        'analysis_initiated',
        'analysis_completed', 
        'export_generated',
        'cache_hit',
        'api_call_made',
        'llm_explanation_generated'
    )),
    
    -- Associated resources
    similarity_analysis_id UUID REFERENCES similarity_analyses(id) ON DELETE SET NULL,
    target_company_name TEXT,
    
    -- Usage metrics
    companies_analyzed INTEGER DEFAULT 0,
    api_calls_made INTEGER DEFAULT 0,
    llm_tokens_used INTEGER DEFAULT 0,
    processing_time_seconds INTEGER DEFAULT 0,
    
    -- Cost tracking
    estimated_cost DECIMAL(10,6) DEFAULT 0.0,
    currency TEXT DEFAULT 'GBP',
    
    -- Performance metrics
    response_time_ms INTEGER DEFAULT 0,
    cache_hit_rate DECIMAL(3,2), -- For cache events
    data_quality_score DECIMAL(3,2),
    
    -- Context information
    user_agent TEXT,
    ip_address INET,
    session_id TEXT,
    feature_version TEXT DEFAULT 'v1.0',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for usage analytics
CREATE INDEX idx_similarity_feature_usage_user_id ON similarity_feature_usage(user_id);
CREATE INDEX idx_similarity_feature_usage_event_type ON similarity_feature_usage(event_type);
CREATE INDEX idx_similarity_feature_usage_created_at ON similarity_feature_usage(created_at);

-- ==========================================
-- TRIGGERS AND FUNCTIONS
-- ==========================================

-- Apply update triggers to new tables
CREATE TRIGGER update_similarity_analyses_updated_at BEFORE UPDATE ON similarity_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_similar_company_matches_updated_at BEFORE UPDATE ON similar_company_matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mna_benchmark_profiles_updated_at BEFORE UPDATE ON mna_benchmark_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_similarity_explanations_updated_at BEFORE UPDATE ON similarity_explanations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enhanced_company_profiles_updated_at BEFORE UPDATE ON enhanced_company_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_search_query_cache_updated_at BEFORE UPDATE ON search_query_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_similarity_analysis_exports_updated_at BEFORE UPDATE ON similarity_analysis_exports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate weighted similarity score
CREATE OR REPLACE FUNCTION calculate_weighted_similarity_score(
    match_id UUID,
    weights JSONB DEFAULT '{"financial": 0.30, "strategic": 0.25, "operational": 0.20, "market": 0.15, "risk": 0.10}'
) RETURNS DECIMAL AS $$
DECLARE
    financial_weight DECIMAL := COALESCE((weights->>'financial')::DECIMAL, 0.30);
    strategic_weight DECIMAL := COALESCE((weights->>'strategic')::DECIMAL, 0.25);
    operational_weight DECIMAL := COALESCE((weights->>'operational')::DECIMAL, 0.20);
    market_weight DECIMAL := COALESCE((weights->>'market')::DECIMAL, 0.15);
    risk_weight DECIMAL := COALESCE((weights->>'risk')::DECIMAL, 0.10);
    
    financial_score DECIMAL := 0.0;
    strategic_score DECIMAL := 0.0;
    operational_score DECIMAL := 0.0;
    market_score DECIMAL := 0.0;
    risk_score DECIMAL := 0.0;
    
    weighted_score DECIMAL := 0.0;
BEGIN
    -- Get individual scores
    SELECT 
        COALESCE(financial_score, 0.0),
        COALESCE(strategic_score, 0.0),
        COALESCE(operational_score, 0.0),
        COALESCE(market_score, 0.0),
        COALESCE(risk_score, 0.0)
    INTO financial_score, strategic_score, operational_score, market_score, risk_score
    FROM similar_company_matches
    WHERE id = match_id;
    
    -- Calculate weighted average
    weighted_score := (
        (financial_score * financial_weight) +
        (strategic_score * strategic_weight) +
        (operational_score * operational_weight) +
        (market_score * market_weight) +
        (risk_score * risk_weight)
    );
    
    RETURN GREATEST(0, LEAST(100, weighted_score));
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete expired search cache entries
    DELETE FROM search_query_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired similarity analyses
    UPDATE similarity_analyses 
    SET status = 'expired' 
    WHERE status != 'expired' AND expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get similarity analysis summary
CREATE OR REPLACE FUNCTION get_similarity_analysis_summary(analysis_id UUID)
RETURNS TABLE (
    total_matches INTEGER,
    avg_score DECIMAL,
    top_score DECIMAL,
    score_distribution JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_matches,
        ROUND(AVG(overall_score), 2) as avg_score,
        ROUND(MAX(overall_score), 2) as top_score,
        jsonb_build_object(
            'high', COUNT(CASE WHEN overall_score >= 80 THEN 1 END),
            'medium', COUNT(CASE WHEN overall_score >= 60 AND overall_score < 80 THEN 1 END),
            'low', COUNT(CASE WHEN overall_score < 60 THEN 1 END)
        ) as score_distribution
    FROM similar_company_matches 
    WHERE similarity_analysis_id = analysis_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on sensitive tables
ALTER TABLE similarity_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE similar_company_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_analysis_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_feature_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for similarity_analyses
CREATE POLICY "Users can access their own analyses" ON similarity_analyses
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Organization members can access org analyses" ON similarity_analyses
    FOR SELECT USING (
        org_id IS NOT NULL AND 
        org_id IN (
            SELECT org_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS policies for similar_company_matches  
CREATE POLICY "Users can access matches from their analyses" ON similar_company_matches
    FOR ALL USING (
        similarity_analysis_id IN (
            SELECT id FROM similarity_analyses WHERE user_id = auth.uid()
        )
    );

-- RLS policies for similarity_explanations
CREATE POLICY "Users can access explanations from their matches" ON similarity_explanations
    FOR ALL USING (
        similar_company_match_id IN (
            SELECT scm.id FROM similar_company_matches scm
            JOIN similarity_analyses sa ON scm.similarity_analysis_id = sa.id
            WHERE sa.user_id = auth.uid()
        )
    );

-- RLS policies for exports
CREATE POLICY "Users can access their own exports" ON similarity_analysis_exports
    FOR ALL USING (user_id = auth.uid());

-- RLS policies for usage tracking
CREATE POLICY "Users can view their own usage" ON similarity_feature_usage
    FOR SELECT USING (user_id = auth.uid());

-- ==========================================
-- COMMENTS AND DOCUMENTATION
-- ==========================================

COMMENT ON TABLE similarity_analyses IS 'Core similarity analysis instances for the Similar Company feature';
COMMENT ON TABLE similar_company_matches IS 'Individual company matches with M&A-focused similarity scoring';
COMMENT ON TABLE mna_benchmark_profiles IS 'M&A-specific benchmark data for companies used in similarity analysis';
COMMENT ON TABLE similarity_explanations IS 'LLM-generated explanations for why companies are considered similar';
COMMENT ON TABLE enhanced_company_profiles IS 'Extended company profiles with enriched data from multiple sources';
COMMENT ON TABLE search_query_cache IS 'Cache for expensive API calls and web searches to improve performance';
COMMENT ON TABLE similarity_analysis_exports IS 'Generated reports and exports for M&A directors';
COMMENT ON TABLE similarity_feature_usage IS 'Usage tracking for feature optimization and billing';

-- ==========================================
-- INITIAL CONFIGURATION DATA
-- ==========================================

-- Insert default similarity analysis templates
INSERT INTO similarity_analyses (
    id,
    user_id, 
    target_company_name,
    status,
    analysis_configuration
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000000', -- System user
    'Demo Target Company',
    'completed',
    '{
        "analysisDepth": "detailed",
        "parameterWeights": {
            "financial": 0.30,
            "strategic": 0.25,
            "operational": 0.20,
            "market": 0.15,
            "risk": 0.10
        },
        "maxResults": 20,
        "includeExplanations": true,
        "webSearchEnabled": true,
        "financialDataRequired": true,
        "competitorAnalysis": true
    }'
) ON CONFLICT (id) DO NOTHING;