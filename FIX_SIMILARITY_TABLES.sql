-- Fix for Similar Companies Feature
-- Run this SQL in your Supabase SQL Editor (Dashboard -> SQL Editor)
-- This creates the missing tables for the similarity search functionality

-- Create similarity_analyses table
CREATE TABLE IF NOT EXISTS similarity_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Target company information
    target_company_name TEXT NOT NULL,
    target_company_data JSONB,
    
    -- Analysis configuration
    analysis_depth TEXT DEFAULT 'standard',
    max_results INTEGER DEFAULT 20,
    include_explanations BOOLEAN DEFAULT true,
    parameter_weights JSONB,
    filter_criteria JSONB,
    
    -- Analysis status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'searching', 'analyzing', 'completed', 'failed', 'cancelled', 'expired')),
    progress_percentage INTEGER DEFAULT 0,
    current_step TEXT,
    error_message TEXT,
    
    -- Analysis results summary
    total_companies_analyzed INTEGER,
    average_similarity_score DECIMAL(5, 2),
    top_similarity_score DECIMAL(5, 2),
    
    -- Executive insights
    executive_summary TEXT,
    key_opportunities TEXT[],
    risk_highlights TEXT[],
    strategic_recommendations TEXT[],
    
    -- Analysis metadata
    analysis_configuration JSONB,
    analysis_version TEXT DEFAULT '1.0',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Performance tracking
    processing_time_seconds INTEGER,
    api_credits_used INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_similarity_analyses_user_id ON similarity_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_similarity_analyses_org_id ON similarity_analyses(org_id);
CREATE INDEX IF NOT EXISTS idx_similarity_analyses_status ON similarity_analyses(status);
CREATE INDEX IF NOT EXISTS idx_similarity_analyses_created_at ON similarity_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_similarity_analyses_target_company ON similarity_analyses(target_company_name);

-- Create similar_company_matches table
CREATE TABLE IF NOT EXISTS similar_company_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES similarity_analyses(id) ON DELETE CASCADE,
    
    -- Company information
    company_name TEXT NOT NULL,
    company_data JSONB,
    data_source TEXT,
    
    -- Similarity scores
    overall_score DECIMAL(5, 2) NOT NULL,
    confidence DECIMAL(5, 2) NOT NULL,
    rank INTEGER NOT NULL,
    
    -- Detailed scores
    financial_score DECIMAL(5, 2),
    strategic_score DECIMAL(5, 2),
    operational_score DECIMAL(5, 2),
    market_score DECIMAL(5, 2),
    risk_score DECIMAL(5, 2),
    
    -- Score confidence levels
    financial_confidence DECIMAL(5, 2),
    strategic_confidence DECIMAL(5, 2),
    operational_confidence DECIMAL(5, 2),
    market_confidence DECIMAL(5, 2),
    risk_confidence DECIMAL(5, 2),
    
    -- AI-generated explanation
    detailed_explanation JSONB,
    
    -- Match metadata
    match_reasons TEXT[],
    mismatch_factors TEXT[],
    data_quality_score DECIMAL(3, 2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for matches
CREATE INDEX IF NOT EXISTS idx_similar_matches_analysis_id ON similar_company_matches(analysis_id);
CREATE INDEX IF NOT EXISTS idx_similar_matches_overall_score ON similar_company_matches(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_similar_matches_rank ON similar_company_matches(rank);

-- Create similarity_explanations table
CREATE TABLE IF NOT EXISTS similarity_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES similar_company_matches(id) ON DELETE CASCADE,
    
    -- Explanation details
    factor_category TEXT NOT NULL,
    factor_name TEXT NOT NULL,
    factor_weight DECIMAL(3, 2),
    score_contribution DECIMAL(5, 2),
    
    -- Detailed reasoning
    reasoning TEXT,
    supporting_data JSONB,
    confidence_level DECIMAL(3, 2),
    
    -- Visual indicators
    impact_direction TEXT CHECK (impact_direction IN ('positive', 'negative', 'neutral')),
    importance_level INTEGER CHECK (importance_level BETWEEN 1 AND 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for explanations
CREATE INDEX IF NOT EXISTS idx_similarity_explanations_match_id ON similarity_explanations(match_id);

-- Create similarity_analysis_exports table
CREATE TABLE IF NOT EXISTS similarity_analysis_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES similarity_analyses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Export configuration
    export_type TEXT NOT NULL CHECK (export_type IN ('executive_summary', 'detailed_report', 'comparison_matrix', 'raw_data')),
    export_format TEXT NOT NULL CHECK (export_format IN ('pdf', 'excel', 'csv', 'json')),
    
    -- Export status
    generation_status TEXT DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
    file_path TEXT,
    file_size_bytes INTEGER,
    download_url TEXT,
    
    -- Export metadata
    included_sections TEXT[],
    max_companies INTEGER,
    export_options JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Usage tracking
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for exports
CREATE INDEX IF NOT EXISTS idx_similarity_exports_analysis_id ON similarity_analysis_exports(analysis_id);
CREATE INDEX IF NOT EXISTS idx_similarity_exports_user_id ON similarity_analysis_exports(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE similarity_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE similar_company_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE similarity_analysis_exports ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- similarity_analyses policies
CREATE POLICY "Users can view their own analyses" ON similarity_analyses
    FOR SELECT USING (
        auth.uid() = user_id 
        OR org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR user_id IS NULL -- Allow demo analyses
    );

CREATE POLICY "Users can create their own analyses" ON similarity_analyses
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        OR user_id IS NULL -- Allow demo analyses
    );

CREATE POLICY "Users can update their own analyses" ON similarity_analyses
    FOR UPDATE USING (
        auth.uid() = user_id 
        OR user_id IS NULL -- Allow demo analyses
    );

CREATE POLICY "Users can delete their own analyses" ON similarity_analyses
    FOR DELETE USING (auth.uid() = user_id);

-- similar_company_matches policies
CREATE POLICY "Users can view matches for their analyses" ON similar_company_matches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM similarity_analyses
            WHERE id = similar_company_matches.analysis_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert matches for their analyses" ON similar_company_matches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM similarity_analyses
            WHERE id = similar_company_matches.analysis_id
            AND (user_id = auth.uid() OR user_id IS NULL)
        )
    );

-- similarity_explanations policies
CREATE POLICY "Users can view explanations for their matches" ON similarity_explanations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM similar_company_matches m
            JOIN similarity_analyses a ON m.analysis_id = a.id
            WHERE m.id = similarity_explanations.match_id
            AND (a.user_id = auth.uid() OR a.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert explanations for their matches" ON similarity_explanations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM similar_company_matches m
            JOIN similarity_analyses a ON m.analysis_id = a.id
            WHERE m.id = similarity_explanations.match_id
            AND (a.user_id = auth.uid() OR a.user_id IS NULL)
        )
    );

-- similarity_analysis_exports policies
CREATE POLICY "Users can view their own exports" ON similarity_analysis_exports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own exports" ON similarity_analysis_exports
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exports" ON similarity_analysis_exports
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT ALL ON similarity_analyses TO authenticated;
GRANT ALL ON similar_company_matches TO authenticated;
GRANT ALL ON similarity_explanations TO authenticated;
GRANT ALL ON similarity_analysis_exports TO authenticated;

-- Grant permissions to service role
GRANT ALL ON similarity_analyses TO service_role;
GRANT ALL ON similar_company_matches TO service_role;
GRANT ALL ON similarity_explanations TO service_role;
GRANT ALL ON similarity_analysis_exports TO service_role;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify the tables were created
SELECT 'Tables created successfully!' as message,
       (SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('similarity_analyses', 'similar_company_matches', 
                          'similarity_explanations', 'similarity_analysis_exports')) as tables_created;