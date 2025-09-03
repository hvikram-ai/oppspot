-- Migration: Add Target Intelligence Feature
-- Description: Create tables for storing enhanced target company intelligence profiles
-- Author: Claude Code AI Assistant
-- Date: 2025-09-03

-- Create target_intelligence_profiles table
CREATE TABLE IF NOT EXISTS target_intelligence_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  profile_data JSONB NOT NULL DEFAULT '{}',
  enrichment_data JSONB DEFAULT '{}',
  analysis_options JSONB DEFAULT '{}',
  confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  completeness_score INTEGER DEFAULT 50 CHECK (completeness_score >= 0 AND completeness_score <= 100),
  data_sources TEXT[] DEFAULT '{}',
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one profile per user per company
  UNIQUE(user_id, company_name)
);

-- Create target_intelligence_cache table for caching web search and enrichment results
CREATE TABLE IF NOT EXISTS target_intelligence_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('web_search', 'website_scrape', 'financial_data', 'news_data', 'social_data')),
  company_name TEXT NOT NULL,
  query_params JSONB DEFAULT '{}',
  cached_data JSONB NOT NULL,
  confidence_score INTEGER DEFAULT 50,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for efficient cache lookups
  INDEX (cache_key),
  INDEX (company_name, cache_type),
  INDEX (expires_at)
);

-- Create target_intelligence_analysis_logs for tracking analysis performance
CREATE TABLE IF NOT EXISTS target_intelligence_analysis_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('full_profile', 'enrichment_only', 'competitive_analysis', 'financial_analysis', 'esg_assessment')),
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed', 'failed', 'cancelled')),
  processing_stages JSONB DEFAULT '[]',
  error_details TEXT,
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Index for performance monitoring
  INDEX (user_id, created_at),
  INDEX (company_name, status),
  INDEX (analysis_type, status)
);

-- Create target_intelligence_data_sources for tracking data source reliability
CREATE TABLE IF NOT EXISTS target_intelligence_data_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('website', 'api', 'database', 'search_engine', 'social_media', 'news', 'financial_db')),
  reliability_score INTEGER DEFAULT 50 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  cost_per_request DECIMAL(10,6) DEFAULT 0,
  rate_limit_per_minute INTEGER DEFAULT 60,
  enabled BOOLEAN DEFAULT true,
  configuration JSONB DEFAULT '{}',
  last_successful_request TIMESTAMPTZ,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default data sources
INSERT INTO target_intelligence_data_sources (source_name, source_type, reliability_score, cost_per_request, rate_limit_per_minute) VALUES
('website_scraper', 'website', 85, 0, 120),
('google_search', 'search_engine', 90, 0.005, 100),
('bing_search', 'search_engine', 85, 0.003, 1000),
('linkedin_api', 'social_media', 80, 0.01, 100),
('crunchbase_api', 'database', 95, 0.02, 1000),
('sec_edgar', 'financial_db', 98, 0, 60),
('yahoo_finance', 'financial_db', 85, 0, 2000),
('news_api', 'news', 75, 0.02, 1000),
('alpha_vantage', 'financial_db', 90, 0.01, 500)
ON CONFLICT (source_name) DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_target_intelligence_profiles_updated_at 
  BEFORE UPDATE ON target_intelligence_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_target_intelligence_data_sources_updated_at 
  BEFORE UPDATE ON target_intelligence_data_sources 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE target_intelligence_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_intelligence_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_intelligence_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_intelligence_data_sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for target_intelligence_profiles
CREATE POLICY "Users can view own target intelligence profiles" 
  ON target_intelligence_profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own target intelligence profiles" 
  ON target_intelligence_profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own target intelligence profiles" 
  ON target_intelligence_profiles FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own target intelligence profiles" 
  ON target_intelligence_profiles FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for target_intelligence_analysis_logs
CREATE POLICY "Users can view own analysis logs" 
  ON target_intelligence_analysis_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis logs" 
  ON target_intelligence_analysis_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy for target_intelligence_cache (shared cache, read-only for users)
CREATE POLICY "Users can read cache data" 
  ON target_intelligence_cache FOR SELECT 
  USING (true);

-- Create RLS policy for target_intelligence_data_sources (read-only for users)
CREATE POLICY "Users can read data sources config" 
  ON target_intelligence_data_sources FOR SELECT 
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_target_intelligence_profiles_user_company 
  ON target_intelligence_profiles(user_id, company_name);

CREATE INDEX IF NOT EXISTS idx_target_intelligence_profiles_confidence 
  ON target_intelligence_profiles(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_target_intelligence_profiles_updated 
  ON target_intelligence_profiles(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_target_intelligence_cache_expiry 
  ON target_intelligence_cache(expires_at) 
  WHERE expires_at > NOW();

CREATE INDEX IF NOT EXISTS idx_target_intelligence_logs_performance 
  ON target_intelligence_analysis_logs(user_id, created_at DESC, status);

-- Create view for profile analytics
CREATE OR REPLACE VIEW target_intelligence_profile_analytics AS
SELECT 
  tip.user_id,
  COUNT(*) as total_profiles,
  AVG(tip.confidence_score) as avg_confidence,
  AVG(tip.completeness_score) as avg_completeness,
  MAX(tip.updated_at) as last_analysis,
  COUNT(DISTINCT UNNEST(tip.data_sources)) as unique_sources_used,
  AVG(tip.processing_time_ms) as avg_processing_time
FROM target_intelligence_profiles tip
GROUP BY tip.user_id;

-- Create view for cache statistics
CREATE OR REPLACE VIEW target_intelligence_cache_stats AS
SELECT 
  cache_type,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active_entries,
  AVG(confidence_score) as avg_confidence,
  MAX(created_at) as last_cached,
  COUNT(DISTINCT company_name) as unique_companies
FROM target_intelligence_cache
GROUP BY cache_type;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON target_intelligence_profiles TO authenticated;
GRANT SELECT, INSERT ON target_intelligence_analysis_logs TO authenticated;
GRANT SELECT ON target_intelligence_cache TO authenticated;
GRANT SELECT ON target_intelligence_data_sources TO authenticated;
GRANT SELECT ON target_intelligence_profile_analytics TO authenticated;
GRANT SELECT ON target_intelligence_cache_stats TO authenticated;

-- Add helpful comments
COMMENT ON TABLE target_intelligence_profiles IS 'Stores enhanced company intelligence profiles generated by AI analysis';
COMMENT ON TABLE target_intelligence_cache IS 'Caches web search and enrichment results to improve performance and reduce API costs';
COMMENT ON TABLE target_intelligence_analysis_logs IS 'Tracks analysis performance and debugging information';
COMMENT ON TABLE target_intelligence_data_sources IS 'Configuration and monitoring for external data sources';

COMMENT ON COLUMN target_intelligence_profiles.profile_data IS 'Complete enhanced company profile with AI-generated insights';
COMMENT ON COLUMN target_intelligence_profiles.enrichment_data IS 'Raw enrichment data from multiple sources';
COMMENT ON COLUMN target_intelligence_profiles.confidence_score IS 'Overall confidence in the analysis (0-100)';
COMMENT ON COLUMN target_intelligence_profiles.completeness_score IS 'Data completeness score (0-100)';

-- Create cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_target_intelligence_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM target_intelligence_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_target_intelligence_cache() IS 'Removes expired cache entries and returns count of deleted rows';

-- Log the completion of this migration
INSERT INTO public.migration_log (migration_name, executed_at) 
VALUES ('20250903000001_add_target_intelligence_feature.sql', NOW()) 
ON CONFLICT (migration_name) DO UPDATE SET executed_at = NOW();