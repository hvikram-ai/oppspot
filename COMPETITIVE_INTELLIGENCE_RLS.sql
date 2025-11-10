-- ================================================================
-- Competitive Intelligence - RLS Policies (Step 2)
-- ================================================================
-- Run this AFTER the main schema is created
-- ================================================================

ALTER TABLE competitor_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users view competitors" ON competitor_companies;
CREATE POLICY "Authenticated users view competitors"
DROP POLICY IF EXISTS "Authenticated users create competitors" ON competitor_companies;
CREATE POLICY "Authenticated users create competitors"
ALTER TABLE competitive_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own or shared analyses" ON competitive_analyses;
CREATE POLICY "Users view own or shared analyses"
DROP POLICY IF EXISTS "Users create analyses" ON competitive_analyses;
CREATE POLICY "Users create analyses"
DROP POLICY IF EXISTS "Owners update analyses" ON competitive_analyses;
CREATE POLICY "Owners update analyses"
DROP POLICY IF EXISTS "Owners delete analyses" ON competitive_analyses;
CREATE POLICY "Owners delete analyses"
ALTER TABLE competitive_analysis_competitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view analysis competitors" ON competitive_analysis_competitors;
CREATE POLICY "Users view analysis competitors"
DROP POLICY IF EXISTS "Owners manage competitors" ON competitive_analysis_competitors;
CREATE POLICY "Owners manage competitors"
ALTER TABLE analysis_access_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view their own grants" ON analysis_access_grants;
CREATE POLICY "Users view their own grants"
DROP POLICY IF EXISTS "Owners manage grants" ON analysis_access_grants;
CREATE POLICY "Owners manage grants"
ALTER TABLE data_source_citations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view citations" ON data_source_citations;
CREATE POLICY "Users view citations"
ALTER TABLE feature_matrix_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view analysis features" ON feature_matrix_entries;
CREATE POLICY "Users view analysis features"
ALTER TABLE feature_parity_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view parity scores" ON feature_parity_scores;
CREATE POLICY "Users view parity scores"
ALTER TABLE pricing_comparisons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view pricing comparisons" ON pricing_comparisons;
CREATE POLICY "Users view pricing comparisons"
ALTER TABLE market_positioning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view market positioning" ON market_positioning;
CREATE POLICY "Users view market positioning"
ALTER TABLE competitive_moat_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view moat scores" ON competitive_moat_scores;
CREATE POLICY "Users view moat scores"
ALTER TABLE industry_recognitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users view recognitions" ON industry_recognitions;
CREATE POLICY "Authenticated users view recognitions"
ALTER TABLE analysis_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view snapshots" ON analysis_snapshots;
CREATE POLICY "Users view snapshots"
