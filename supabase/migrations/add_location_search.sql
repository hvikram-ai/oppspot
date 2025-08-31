-- Create RPC function to search businesses within a radius
CREATE OR REPLACE FUNCTION get_businesses_within_radius(
  user_lat DECIMAL,
  user_lng DECIMAL,
  radius_miles DECIMAL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  address JSONB,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_miles DECIMAL,
  phone_numbers JSONB,
  emails JSONB,
  website TEXT,
  categories TEXT[],
  rating DECIMAL,
  verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.description,
    b.address,
    b.latitude,
    b.longitude,
    calculate_distance(user_lat, user_lng, b.latitude, b.longitude) as distance_miles,
    b.phone_numbers,
    b.emails,
    b.website,
    b.categories,
    b.rating,
    b.verified
  FROM businesses b
  WHERE 
    b.latitude IS NOT NULL 
    AND b.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lng, b.latitude, b.longitude) <= radius_miles
  ORDER BY distance_miles ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for advanced search with all filters
CREATE OR REPLACE FUNCTION search_businesses(
  search_query TEXT DEFAULT NULL,
  filter_categories TEXT[] DEFAULT NULL,
  filter_location TEXT DEFAULT NULL,
  filter_min_rating DECIMAL DEFAULT NULL,
  filter_verified BOOLEAN DEFAULT NULL,
  user_lat DECIMAL DEFAULT NULL,
  user_lng DECIMAL DEFAULT NULL,
  radius_miles DECIMAL DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  page_limit INT DEFAULT 20,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  address JSONB,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_miles DECIMAL,
  phone_numbers JSONB,
  emails JSONB,
  website TEXT,
  categories TEXT[],
  rating DECIMAL,
  verified BOOLEAN,
  relevance_score REAL,
  total_count BIGINT
) AS $$
DECLARE
  total_rows BIGINT;
BEGIN
  -- Create temporary table with filtered results
  CREATE TEMP TABLE temp_results AS
  SELECT 
    b.id,
    b.name,
    b.description,
    b.address,
    b.latitude,
    b.longitude,
    CASE 
      WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL 
      THEN calculate_distance(user_lat, user_lng, b.latitude, b.longitude)
      ELSE NULL
    END as distance_miles,
    b.phone_numbers,
    b.emails,
    b.website,
    b.categories,
    b.rating,
    b.verified,
    CASE 
      WHEN search_query IS NOT NULL AND search_query != ''
      THEN ts_rank(b.search_vector, plainto_tsquery('english', search_query))
      ELSE 1.0
    END as relevance_score
  FROM businesses b
  WHERE 
    -- Text search filter
    (search_query IS NULL OR search_query = '' OR 
     b.search_vector @@ plainto_tsquery('english', search_query))
    -- Category filter
    AND (filter_categories IS NULL OR 
         b.categories && filter_categories)
    -- Location filter
    AND (filter_location IS NULL OR 
         b.address->>'city' ILIKE '%' || filter_location || '%' OR
         b.address->>'state' ILIKE '%' || filter_location || '%' OR
         b.address->>'postal_code' ILIKE '%' || filter_location || '%')
    -- Rating filter
    AND (filter_min_rating IS NULL OR 
         b.rating >= filter_min_rating)
    -- Verified filter
    AND (filter_verified IS NULL OR 
         b.verified = filter_verified)
    -- Distance filter
    AND (radius_miles IS NULL OR user_lat IS NULL OR user_lng IS NULL OR
         calculate_distance(user_lat, user_lng, b.latitude, b.longitude) <= radius_miles);

  -- Get total count
  SELECT COUNT(*) INTO total_rows FROM temp_results;

  -- Return sorted and paginated results
  RETURN QUERY
  SELECT 
    t.*,
    total_rows as total_count
  FROM temp_results t
  ORDER BY 
    CASE 
      WHEN sort_by = 'relevance' THEN t.relevance_score 
      WHEN sort_by = 'rating' THEN t.rating
      ELSE NULL
    END DESC NULLS LAST,
    CASE 
      WHEN sort_by = 'distance' THEN t.distance_miles
      ELSE NULL
    END ASC NULLS LAST,
    CASE 
      WHEN sort_by = 'name' THEN t.name
      ELSE NULL
    END ASC
  LIMIT page_limit
  OFFSET page_offset;

  -- Clean up temp table
  DROP TABLE temp_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_businesses_within_radius TO authenticated;
GRANT EXECUTE ON FUNCTION search_businesses TO authenticated;

-- Create indexes to improve search performance
CREATE INDEX IF NOT EXISTS idx_businesses_latitude ON businesses(latitude);
CREATE INDEX IF NOT EXISTS idx_businesses_longitude ON businesses(longitude);
CREATE INDEX IF NOT EXISTS idx_businesses_rating ON businesses(rating);
CREATE INDEX IF NOT EXISTS idx_businesses_verified ON businesses(verified);