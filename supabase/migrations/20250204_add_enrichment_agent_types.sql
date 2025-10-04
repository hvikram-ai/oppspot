-- Add Enrichment Agent Types
-- Adds linkedin_scraper_agent and website_analyzer_agent to allowed types

-- ============================================================================
-- Update ai_agents table to allow new enrichment agent types
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE ai_agents DROP CONSTRAINT IF EXISTS ai_agents_agent_type_check;

-- Add new constraint with enrichment agent types
ALTER TABLE ai_agents ADD CONSTRAINT ai_agents_agent_type_check
  CHECK (agent_type IN (
    'opportunity_bot',
    'research_gpt',
    'scout_agent',
    'scoring_agent',
    'writer_agent',
    'relationship_agent',
    'linkedin_scraper_agent',
    'website_analyzer_agent'
  ));

-- ============================================================================
-- Update buying_signals table to allow new signal types
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE buying_signals DROP CONSTRAINT IF EXISTS buying_signals_signal_type_check;

-- Add new constraint with enrichment signal types
ALTER TABLE buying_signals ADD CONSTRAINT buying_signals_signal_type_check
  CHECK (signal_type IN (
    'funding_round',
    'executive_change',
    'job_posting',
    'technology_adoption',
    'expansion',
    'website_activity',
    'competitor_mention',
    'companies_house_filing',
    'news_mention',
    'social_media_activity',
    'rapid_employee_growth',
    'high_social_engagement',
    'career_page_detected',
    'active_blog_content',
    'modern_tech_stack',
    'using_sales_tools'
  ));

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON CONSTRAINT ai_agents_agent_type_check ON ai_agents IS
  'Allowed agent types including enrichment agents (LinkedIn scraper, website analyzer)';

COMMENT ON CONSTRAINT buying_signals_signal_type_check ON buying_signals IS
  'Allowed signal types including enrichment-detected signals (employee growth, tech stack, career pages, etc.)';
