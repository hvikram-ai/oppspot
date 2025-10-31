-- Optional: Add trigger for auto-creating General collection for NEW users
-- Run this AFTER the main migration succeeds
-- This is OPTIONAL - you can also manually create collections via the API

-- Drop if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_general_collection_for_user();

-- Create simple function
CREATE FUNCTION create_general_collection_for_user()
RETURNS TRIGGER AS $$
DECLARE
  new_collection_id UUID;
BEGIN
  -- Insert General collection
  INSERT INTO public.collections (user_id, name, is_system)
  VALUES (NEW.id, 'General', TRUE)
  RETURNING id INTO new_collection_id;

  -- Try to update profile (may not exist yet)
  UPDATE public.profiles
  SET active_collection_id = new_collection_id
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION create_general_collection_for_user();

-- Test message
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger installed for auto-creating General collections';
END $$;
