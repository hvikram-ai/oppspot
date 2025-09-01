-- Create saved_businesses table for bookmarking businesses
CREATE TABLE IF NOT EXISTS saved_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  list_id UUID REFERENCES business_lists(id) ON DELETE SET NULL,
  notes TEXT,
  tags TEXT[],
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

-- Create business_lists table for organizing saved businesses
CREATE TABLE IF NOT EXISTS business_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'folder',
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create business_comparisons table
CREATE TABLE IF NOT EXISTS business_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_ids UUID[] NOT NULL,
  name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_saved_businesses_user_id ON saved_businesses(user_id);
CREATE INDEX idx_saved_businesses_business_id ON saved_businesses(business_id);
CREATE INDEX idx_saved_businesses_list_id ON saved_businesses(list_id);
CREATE INDEX idx_saved_businesses_saved_at ON saved_businesses(saved_at DESC);

CREATE INDEX idx_business_lists_user_id ON business_lists(user_id);
CREATE INDEX idx_business_lists_is_public ON business_lists(is_public);
CREATE INDEX idx_business_lists_share_token ON business_lists(share_token);

CREATE INDEX idx_business_comparisons_user_id ON business_comparisons(user_id);

-- Enable RLS
ALTER TABLE saved_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_comparisons ENABLE ROW LEVEL SECURITY;

-- Policies for saved_businesses
CREATE POLICY "Users can view own saved businesses"
  ON saved_businesses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save businesses"
  ON saved_businesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved businesses"
  ON saved_businesses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved businesses"
  ON saved_businesses FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for business_lists
CREATE POLICY "Users can view own lists"
  ON business_lists FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create lists"
  ON business_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lists"
  ON business_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own lists"
  ON business_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for business_comparisons
CREATE POLICY "Users can view own comparisons"
  ON business_comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create comparisons"
  ON business_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comparisons"
  ON business_comparisons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comparisons"
  ON business_comparisons FOR DELETE
  USING (auth.uid() = user_id);

-- Function to get saved business count for a user
CREATE OR REPLACE FUNCTION get_saved_business_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM saved_businesses
    WHERE user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if a business is saved by a user
CREATE OR REPLACE FUNCTION is_business_saved(p_user_id UUID, p_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM saved_businesses
    WHERE user_id = p_user_id AND business_id = p_business_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT ALL ON saved_businesses TO authenticated;
GRANT ALL ON business_lists TO authenticated;
GRANT ALL ON business_comparisons TO authenticated;
GRANT EXECUTE ON FUNCTION get_saved_business_count TO authenticated;
GRANT EXECUTE ON FUNCTION is_business_saved TO authenticated;