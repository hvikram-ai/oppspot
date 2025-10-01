-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('research_reports', 'research_sections', 'research_sources', 'user_research_quotas');
