-- Ultra-Safe Collections Migration
-- Checks everything before creating, handles all edge cases

-- ============================================================================
-- STEP 1: Clean up existing objects (safer approach)
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_collections_timestamp ON collections;

-- Drop functions
DROP FUNCTION IF EXISTS create_general_collection_for_user() CASCADE;
DROP FUNCTION IF EXISTS update_collections_updated_at() CASCADE;

-- Drop tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS collection_access CASCADE;
DROP TABLE IF EXISTS collection_items CASCADE;
DROP TABLE IF EXISTS collections CASCADE;

-- Drop types
DROP TYPE IF EXISTS work_product_type CASCADE;
DROP TYPE IF EXISTS permission_level_enum CASCADE;

-- Drop indexes that might exist on profiles
DROP INDEX IF EXISTS idx_profiles_active_stream;

-- ============================================================================
-- STEP 2: Create ENUM Types
-- ============================================================================

CREATE TYPE work_product_type AS ENUM (
  'business',
  'report',
  'contact',
  'list',
  'insight',
  'query'
);

CREATE TYPE permission_level_enum AS ENUM (
  'view',
  'edit',
  'manage'
);

-- ============================================================================
-- STEP 3: Create Tables
-- ============================================================================

CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  item_type work_product_type NOT NULL,
  item_id UUID NOT NULL,
  added_by UUID NOT NULL REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE collection_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level permission_level_enum NOT NULL,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_collection_user UNIQUE(collection_id, user_id)
);

-- ============================================================================
-- STEP 4: Add Active Collection Column to Profiles (Check First)
-- ============================================================================

DO $$
BEGIN
  -- Check if column exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'active_collection_id'
  ) THEN
    -- Add column
    ALTER TABLE profiles
    ADD COLUMN active_collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;

    RAISE NOTICE '✓ Added active_collection_id column to profiles';
  ELSE
    RAISE NOTICE '✓ Column profiles.active_collection_id already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create Indexes
-- ============================================================================

CREATE INDEX idx_collection_items_chronological
ON collection_items(collection_id, added_at DESC);

CREATE INDEX idx_collection_items_polymorphic
ON collection_items(item_type, item_id);

CREATE INDEX idx_collection_access_lookup
ON collection_access(user_id, collection_id);

CREATE INDEX idx_collection_access_stream
ON collection_access(collection_id);

CREATE INDEX idx_collections_user_active
ON collections(user_id, archived_at)
WHERE archived_at IS NULL;

CREATE INDEX idx_collections_system
ON collections(user_id, is_system)
WHERE is_system = TRUE;

-- Create index on profiles (now safe because we cleaned up first)
CREATE INDEX idx_profiles_active_stream
ON profiles(active_collection_id)
WHERE active_collection_id IS NOT NULL;

CREATE UNIQUE INDEX idx_collections_one_general_per_user
ON collections(user_id, is_system)
WHERE is_system = TRUE;

-- ============================================================================
-- STEP 6: Updated At Trigger
-- ============================================================================

CREATE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_collections_timestamp
BEFORE UPDATE ON collections
FOR EACH ROW
EXECUTE FUNCTION update_collections_updated_at();

-- ============================================================================
-- STEP 7: Enable Row Level Security
-- ============================================================================

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_access ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: Create General Collections for Existing Users
-- ============================================================================

DO $$
DECLARE
  user_record RECORD;
  new_collection_id UUID;
  created_count INTEGER := 0;
  total_users INTEGER := 0;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO total_users FROM auth.users;

  RAISE NOTICE 'Found % total users in database', total_users;

  -- Create General collection for each user
  FOR user_record IN SELECT id FROM auth.users
  LOOP
    -- Check if user already has a system collection
    IF NOT EXISTS (
      SELECT 1 FROM collections
      WHERE user_id = user_record.id AND is_system = TRUE
    ) THEN
      -- Create General collection
      INSERT INTO collections (user_id, name, is_system)
      VALUES (user_record.id, 'General', TRUE)
      RETURNING id INTO new_collection_id;

      -- Update profile to set active collection
      UPDATE profiles
      SET active_collection_id = new_collection_id
      WHERE id = user_record.id;

      created_count := created_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Created % General collections', created_count;
END $$;

-- ============================================================================
-- STEP 9: Add Comments
-- ============================================================================

COMMENT ON TABLE collections IS 'User-created organizational containers for work products';
COMMENT ON TABLE collection_items IS 'Work products saved to collections';
COMMENT ON TABLE collection_access IS 'Permission grants for shared collections';
COMMENT ON COLUMN collections.is_system IS 'TRUE for General collection (cannot be renamed/archived)';
COMMENT ON COLUMN collections.archived_at IS 'Soft-delete timestamp (NULL = active)';
COMMENT ON TYPE work_product_type IS 'Types of work products: business, report, contact, list, insight, query';
COMMENT ON TYPE permission_level_enum IS 'Permission levels: view, edit, manage';

-- ============================================================================
-- STEP 10: Final Verification & Report
-- ============================================================================

DO $$
DECLARE
  collection_count INTEGER;
  user_count INTEGER;
  items_count INTEGER;
  access_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO collection_count FROM collections;
  SELECT COUNT(*) INTO user_count FROM auth.users;
  SELECT COUNT(*) INTO items_count FROM collection_items;
  SELECT COUNT(*) INTO access_count FROM collection_access;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '✅ COLLECTIONS MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '   • Total users: %', user_count;
  RAISE NOTICE '   • Total collections: %', collection_count;
  RAISE NOTICE '   • Total items: %', items_count;
  RAISE NOTICE '   • Total access grants: %', access_count;
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next steps:';
  RAISE NOTICE '   1. Run the RLS policies migration';
  RAISE NOTICE '   2. Verify with: npx tsx scripts/check-collections-tables.ts';
  RAISE NOTICE '   3. (Optional) Add new user trigger for future users';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════';
END $$;
