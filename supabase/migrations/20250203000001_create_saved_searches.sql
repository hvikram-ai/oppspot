-- ============================================
-- Saved Searches System
-- ============================================
-- Allows users to save and reuse complex filter configurations

-- Create saved_searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  result_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT saved_searches_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Create indexes for performance
CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_is_favorite ON saved_searches(is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_saved_searches_created_at ON saved_searches(created_at DESC);
CREATE INDEX idx_saved_searches_last_executed ON saved_searches(last_executed_at DESC);
CREATE INDEX idx_saved_searches_filters ON saved_searches USING GIN (filters);

-- Enable RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Policies for saved_searches
CREATE POLICY "Users can view own saved searches"
  ON saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create saved searches"
  ON saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved searches"
  ON saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved searches"
  ON saved_searches FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_searches_updated_at();

-- Function to get saved search count for a user
CREATE OR REPLACE FUNCTION get_saved_search_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM saved_searches
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to increment execution count
CREATE OR REPLACE FUNCTION increment_search_execution(p_search_id UUID, p_result_count INTEGER DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE saved_searches
  SET
    execution_count = execution_count + 1,
    last_executed_at = NOW(),
    result_count = COALESCE(p_result_count, result_count)
  WHERE id = p_search_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON saved_searches TO authenticated;
GRANT EXECUTE ON FUNCTION get_saved_search_count TO authenticated;
GRANT EXECUTE ON FUNCTION increment_search_execution TO authenticated;

-- Comments
COMMENT ON TABLE saved_searches IS 'Stores saved filter configurations for advanced search';
COMMENT ON COLUMN saved_searches.filters IS 'JSONB containing the complete AdvancedFilters object';
COMMENT ON COLUMN saved_searches.execution_count IS 'Number of times this search has been executed';
COMMENT ON COLUMN saved_searches.last_executed_at IS 'Last time this search was run';
COMMENT ON COLUMN saved_searches.result_count IS 'Number of results from last execution';
COMMENT ON COLUMN saved_searches.is_favorite IS 'User-marked favorite for quick access';
