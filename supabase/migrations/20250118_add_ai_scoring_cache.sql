-- Migration: Add AI Scoring Cache
-- Description: Create table for caching AI-powered scoring analysis
-- Author: Claude Code AI Assistant
-- Date: 2025-01-18

-- Create AI scoring cache table
CREATE TABLE IF NOT EXISTS ai_scoring_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  analysis_result JSONB NOT NULL,
  model_used TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Ensure one cache entry per company
  CONSTRAINT unique_company_cache UNIQUE(company_id),

  -- Indexes for performance
  INDEX idx_ai_cache_company (company_id),
  INDEX idx_ai_cache_expires (expires_at)
);

-- Create RLS policies
ALTER TABLE ai_scoring_cache ENABLE ROW LEVEL SECURITY;

-- Users can view AI analysis cache
CREATE POLICY "Users can view AI analysis" ON ai_scoring_cache
  FOR SELECT USING (true);

-- Users can insert/update AI analysis
CREATE POLICY "Users can manage AI analysis" ON ai_scoring_cache
  FOR ALL USING (true);

-- Add AI scoring fields to lead_scores table
ALTER TABLE lead_scores
ADD COLUMN IF NOT EXISTS ai_analysis JSONB,
ADD COLUMN IF NOT EXISTS ai_model_used TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence TEXT CHECK (ai_confidence IN ('high', 'medium', 'low')),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS use_ai_scoring BOOLEAN DEFAULT false;

-- Create index for AI-scored records
CREATE INDEX IF NOT EXISTS idx_lead_scores_ai ON lead_scores(use_ai_scoring) WHERE use_ai_scoring = true;

-- Add comment
COMMENT ON TABLE ai_scoring_cache IS 'Caches AI-powered scoring analysis to reduce LLM calls';
COMMENT ON COLUMN lead_scores.ai_analysis IS 'Full AI analysis result in JSON format';
COMMENT ON COLUMN lead_scores.use_ai_scoring IS 'Whether this score was calculated using AI';

-- Create function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_ai_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_scoring_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic cleanup (optional - can be called via cron job)
COMMENT ON FUNCTION clean_expired_ai_cache() IS 'Call this function periodically to clean expired AI cache entries';