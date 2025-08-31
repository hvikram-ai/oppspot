-- Add full-text search capabilities to businesses table

-- Create a function to generate search vector
CREATE OR REPLACE FUNCTION generate_search_vector(
  name TEXT,
  description TEXT,
  categories TEXT[],
  address JSONB
) RETURNS tsvector AS $$
BEGIN
  RETURN (
    setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(categories, ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(
      address->>'city' || ' ' || 
      address->>'state' || ' ' || 
      address->>'country', ''
    )), 'D')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add search vector column
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create index for full-text search
CREATE INDEX IF NOT EXISTS idx_businesses_search_vector 
ON businesses USING gin(search_vector);

-- Add verified column if it doesn't exist
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Add rating column if it doesn't exist
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT NULL;

-- Add phone numbers as JSONB array if not text
ALTER TABLE businesses 
ALTER COLUMN phone_numbers TYPE JSONB USING phone_numbers::JSONB;

-- Add emails as JSONB array if not text
ALTER TABLE businesses 
ALTER COLUMN emails TYPE JSONB USING emails::JSONB;

-- Update existing records with search vectors
UPDATE businesses 
SET search_vector = generate_search_vector(name, description, categories, address)
WHERE search_vector IS NULL;

-- Create trigger to automatically update search vector
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := generate_search_vector(
    NEW.name,
    NEW.description,
    NEW.categories,
    NEW.address
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_businesses_search_vector ON businesses;
CREATE TRIGGER update_businesses_search_vector
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_search_vector();

-- Create a function for distance calculation (simple version using lat/lng)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL,
  lng1 DECIMAL,
  lat2 DECIMAL,
  lng2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  R CONSTANT DECIMAL := 3959; -- Earth radius in miles
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlng/2) * sin(dlng/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a materialized view for search performance (optional)
CREATE MATERIALIZED VIEW IF NOT EXISTS business_search_view AS
SELECT 
  b.id,
  b.name,
  b.description,
  b.address,
  b.phone_numbers,
  b.emails,
  b.website,
  b.categories,
  b.rating,
  b.verified,
  b.latitude,
  b.longitude,
  b.search_vector,
  b.created_at,
  b.updated_at
FROM businesses b
WHERE b.name IS NOT NULL;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_business_search_view_vector 
ON business_search_view USING gin(search_vector);

-- Grant permissions
GRANT SELECT ON business_search_view TO authenticated;
GRANT SELECT ON businesses TO authenticated;