-- Fixed Collections Migration
-- Handles trigger function issues

-- ============================================================================
-- STEP 1: Clean up existing objects
-- ============================================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_general_collection_for_user() CASCADE;
DROP TRIGGER IF EXISTS update_collections_timestamp ON collections;
DROP FUNCTION IF EXISTS update_collections_updated_at() CASCADE;

DROP TABLE IF EXISTS collection_access CASCADE;
DROP TABLE IF EXISTS collection_items CASCADE;
DROP TABLE IF EXISTS collections CASCADE;

DROP TYPE IF EXISTS work_product_type CASCADE;
DROP TYPE IF EXISTS permission_level_enum CASCADE;

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
-- STEP 4: Add Active Collection to Profiles
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles'
    AND column_name = 'active_collection_id'
  ) THEN
    ALTER TABLE profiles
    ADD COLUMN active_collection_id UUID REFERENCES collections(id) ON DELETE SET NULL;
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

DROP INDEX IF EXISTS idx_profiles_active_stream;
CREATE INDEX idx_profiles_active_stream
ON profiles(active_collection_id)
WHERE active_collection_id IS NOT NULL;

CREATE UNIQUE INDEX idx_collections_one_general_per_user
ON collections(user_id, is_system)
WHERE is_system = TRUE;

-- ============================================================================
-- STEP 6: Create Updated At Trigger (simpler, test first)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

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
-- STEP 8: Create General Collection for Existing Users
-- ============================================================================

-- Create General collection for all existing users who don't have one
DO $$
DECLARE
  user_record RECORD;
  new_collection_id UUID;
BEGIN
  FOR user_record IN
    SELECT id FROM auth.users
    WHERE id NOT IN (
      SELECT user_id FROM collections WHERE is_system = TRUE
    )
  LOOP
    -- Create General collection
    INSERT INTO collections (user_id, name, is_system)
    VALUES (user_record.id, 'General', TRUE)
    RETURNING id INTO new_collection_id;

    -- Update profile if it exists
    UPDATE profiles
    SET active_collection_id = new_collection_id
    WHERE id = user_record.id AND active_collection_id IS NULL;

    RAISE NOTICE 'Created General collection for user %', user_record.id;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 9: Create Trigger for Future Users (with better error handling)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_general_collection_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_collection_id UUID;
  profile_exists BOOLEAN;
BEGIN
  -- Create the General collection
  INSERT INTO collections (user_id, name, is_system)
  VALUES (NEW.id, 'General', TRUE)
  RETURNING id INTO new_collection_id;

  -- Check if profile exists (it might be created by a different trigger)
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = NEW.id) INTO profile_exists;

  IF profile_exists THEN
    -- Update profile if it exists
    UPDATE profiles
    SET active_collection_id = new_collection_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create collection for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_general_collection_for_user();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE collections IS 'User-created organizational containers for work products';
COMMENT ON TABLE collection_items IS 'Work products saved to collections with polymorphic references';
COMMENT ON TABLE collection_access IS 'Permission grants for shared collections';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  collection_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO collection_count FROM collections;
  RAISE NOTICE '✅ Collections tables created successfully!';
  RAISE NOTICE '   Found % existing collections', collection_count;
END $$;
