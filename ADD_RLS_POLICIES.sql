-- ================================================================
-- Competitive Intelligence - RLS Security Policies
-- ================================================================
-- Run this AFTER tables are created
-- ================================================================

ALTER TABLE competitor_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users view competitors" ON competitor_companies;

CREATE POLICY "Authenticated users view competitors"
  ON competitor_companies FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users create competitors" ON competitor_companies;

CREATE POLICY "Authenticated users create competitors"
  ON competitor_companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

ALTER TABLE competitive_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own or shared analyses" ON competitive_analyses;

CREATE POLICY "Users view own or shared analyses"
  ON competitive_analyses FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM analysis_access_grants
      WHERE analysis_id = competitive_analyses.id
        AND user_id = auth.uid()
        AND revoked_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Users create analyses" ON competitive_analyses;

CREATE POLICY "Users create analyses"
  ON competitive_analyses FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Owners update analyses" ON competitive_analyses;

CREATE POLICY "Owners update analyses"
  ON competitive_analyses FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Owners delete analyses" ON competitive_analyses;

CREATE POLICY "Owners delete analyses"
  ON competitive_analyses FOR DELETE
  USING (created_by = auth.uid());

ALTER TABLE competitive_analysis_competitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view analysis competitors" ON competitive_analysis_competitors;

CREATE POLICY "Users view analysis competitors"
  ON competitive_analysis_competitors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_analysis_competitors.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );

DROP POLICY IF EXISTS "Owners manage competitors" ON competitive_analysis_competitors;

CREATE POLICY "Owners manage competitors"
  ON competitive_analysis_competitors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_analysis_competitors.analysis_id
        AND created_by = auth.uid()
    )
  );

ALTER TABLE analysis_access_grants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view their own grants" ON analysis_access_grants;

CREATE POLICY "Users view their own grants"
  ON analysis_access_grants FOR SELECT
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM competitive_analyses
                 WHERE id = analysis_access_grants.analysis_id
                   AND created_by = auth.uid()));

DROP POLICY IF EXISTS "Owners manage grants" ON analysis_access_grants;

CREATE POLICY "Owners manage grants"
  ON analysis_access_grants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = analysis_access_grants.analysis_id
        AND created_by = auth.uid()
    )
  );

ALTER TABLE data_source_citations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view citations" ON data_source_citations;

CREATE POLICY "Users view citations"
  ON data_source_citations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = data_source_citations.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );

ALTER TABLE feature_matrix_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view analysis features" ON feature_matrix_entries;

CREATE POLICY "Users view analysis features"
  ON feature_matrix_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = feature_matrix_entries.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );

ALTER TABLE feature_parity_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view parity scores" ON feature_parity_scores;

CREATE POLICY "Users view parity scores"
  ON feature_parity_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = feature_parity_scores.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );

ALTER TABLE pricing_comparisons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view pricing comparisons" ON pricing_comparisons;

CREATE POLICY "Users view pricing comparisons"
  ON pricing_comparisons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = pricing_comparisons.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );

ALTER TABLE market_positioning ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view market positioning" ON market_positioning;

CREATE POLICY "Users view market positioning"
  ON market_positioning FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = market_positioning.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );

ALTER TABLE competitive_moat_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view moat scores" ON competitive_moat_scores;

CREATE POLICY "Users view moat scores"
  ON competitive_moat_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = competitive_moat_scores.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );

ALTER TABLE industry_recognitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users view recognitions" ON industry_recognitions;

CREATE POLICY "Authenticated users view recognitions"
  ON industry_recognitions FOR SELECT
  TO authenticated
  USING (true);

ALTER TABLE analysis_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view snapshots" ON analysis_snapshots;

CREATE POLICY "Users view snapshots"
  ON analysis_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitive_analyses
      WHERE id = analysis_snapshots.analysis_id
        AND (created_by = auth.uid() OR
             EXISTS (SELECT 1 FROM analysis_access_grants
                     WHERE analysis_id = competitive_analyses.id
                       AND user_id = auth.uid()
                       AND revoked_at IS NULL))
    )
  );

