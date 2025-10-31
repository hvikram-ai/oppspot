-- Enable Row Level Security on Collections Tables
-- This script enables RLS which is required for the Collections feature to work

-- Enable RLS on collections table
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Enable RLS on collection_items table
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Enable RLS on collection_access table
ALTER TABLE collection_access ENABLE ROW LEVEL SECURITY;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Row Level Security enabled on all Collections tables';
  RAISE NOTICE '   - collections';
  RAISE NOTICE '   - collection_items';
  RAISE NOTICE '   - collection_access';
END $$;
