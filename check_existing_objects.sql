-- Check existing enums
SELECT typname FROM pg_type 
WHERE typname IN ('report_status', 'section_type', 'confidence_level', 'source_type');

-- Check existing tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('research_reports', 'research_sections', 'research_sources', 'user_research_quotas');

-- Check existing functions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('calculate_section_expiration', 'check_research_quota', 'increment_research_quota');
